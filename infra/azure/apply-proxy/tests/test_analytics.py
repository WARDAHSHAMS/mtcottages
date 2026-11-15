"""Cookieless analytics (#23): beacon validation, storage, dashboard and routes."""

import base64
import hashlib
import hmac
import json
import urllib.parse
from datetime import date, datetime, timezone

import pytest

from test_function_app import Request, function_app

analytics = function_app.analytics

ACCOUNT_KEY = base64.b64encode(b"0123456789abcdef0123456789abcdef").decode()
CONNECTION = f"DefaultEndpointsProtocol=https;AccountName=mtcstore;AccountKey={ACCOUNT_KEY};EndpointSuffix=core.windows.net"
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"


@pytest.fixture(autouse=True)
def _clean_state(monkeypatch):
    analytics.reset_state()
    monkeypatch.setenv("AzureWebJobsStorage", CONNECTION)
    yield
    analytics.reset_state()


class FakeTables:
    """Stands in for analytics._request: an in-memory Table service."""

    def __init__(self):
        self.tables = {}
        self.calls = []

    def __call__(self, account, method, resource, query=None, body=None, extra_headers=None):
        self.calls.append((method, resource, query, body))
        if method == "POST" and resource == "Tables":
            name = body["TableName"]
            if name in self.tables:
                return 409, {}, b""
            self.tables[name] = []
            return 201, {}, b""
        if method == "POST":
            if resource not in self.tables:
                return 404, {}, b""
            self.tables[resource].append(body)
            return 204, {}, b""
        if method == "GET" and resource == "Tables":
            return 200, {}, json.dumps({"value": [{"TableName": name} for name in sorted(self.tables)]}).encode()
        if method == "GET":
            name = resource.removesuffix("()")
            if name not in self.tables:
                return 404, {}, b""
            low, high = [part.split("'")[1] for part in query["$filter"].split(" and ")]
            rows = [row for row in self.tables[name] if low <= row["PartitionKey"] <= high]
            return 200, {}, json.dumps({"value": rows}).encode()
        if method == "DELETE":
            name = resource.split("'")[1]
            self.tables.pop(name, None)
            return 204, {}, b""
        raise AssertionError(f"unexpected call {method} {resource}")


def _beacon(payload, origin="https://mtcottages.com", user_agent=BROWSER_UA, ip="203.0.113.7"):
    return Request(
        json.dumps(payload).encode(),
        url="https://stay.mtcottages.com/api/collect",
        headers={"Origin": origin, "User-Agent": user_agent, "Content-Type": "text/plain;charset=UTF-8",
                 "X-Forwarded-Host": "stay.mtcottages.com", "X-Azure-ClientIP": ip},
    )


def test_a_valid_beacon_keeps_only_the_allowed_fields():
    fields = analytics.parse_beacon(json.dumps({
        "e": "cta_click", "p": "/marietta/frederick/index.html?email=a@b.c#x", "h": "Frederick",
        "a": "travel-nurse", "s": "hero", "r": "https://www.google.com/search?q=furnished", "t": "",
        "email": "guest@example.com", "ip": "198.51.100.1",
    }).encode(), "https://mtcottages.com")
    assert fields == {
        "event": "cta_click", "site": "site", "path": "/marietta/frederick/index.html", "home": "frederick",
        "audience": "travel-nurse", "src": "hero", "ref": "google.com", "test": "",
    }


@pytest.mark.parametrize("body, origin", [
    (b'{"e":"pageview","p":"/"}', "https://evil.example"),
    (b'{"e":"pageview","p":"/"}', ""),
    (b'{"e":"purchase","p":"/"}', "https://mtcottages.com"),
    (b'{"e":"pageview","p":"https://evil.example/x"}', "https://mtcottages.com"),
    (b'{"e":"pageview","p":"//evil.example/x"}', "https://mtcottages.com"),
    (b'{"e":"pageview"}', "https://mtcottages.com"),
    (b"not json", "https://mtcottages.com"),
    (b"[]", "https://mtcottages.com"),
    (b'{"e":"pageview","p":"/' + b"a" * 3000 + b'"}', "https://mtcottages.com"),
])
def test_invalid_or_foreign_beacons_are_refused(body, origin):
    assert analytics.parse_beacon(body, origin) is None


def test_slugs_and_referrers_reject_free_text_and_our_own_hosts():
    assert analytics.slug("Travel Nurse") == ""
    assert analytics.slug("guest@example.com") == ""
    assert analytics.slug("a" * 41) == ""
    assert analytics.referrer_host("https://stay.mtcottages.com/") == ""
    assert analytics.referrer_host("https://mtcottages.com/x") == ""
    assert analytics.referrer_host("https://www.bing.com/search?q=1") == "bing.com"
    assert analytics.referrer_host("javascript:alert(1)") == ""


def test_crawlers_and_audit_tools_are_recognised():
    assert analytics.is_bot("Mozilla/5.0 (compatible; Googlebot/2.1)")
    assert analytics.is_bot("Mozilla/5.0 ... Chrome-Lighthouse")
    assert analytics.is_bot("")
    assert not analytics.is_bot(BROWSER_UA)


def test_collect_stores_one_row_without_ip_or_user_agent(monkeypatch):
    fake = FakeTables()
    monkeypatch.setattr(analytics, "_request", fake)
    response = function_app.collect(_beacon({"e": "pageview", "p": "/index.html", "r": "https://duckduckgo.com/"}))
    assert response.status_code == 202
    assert response.headers["Access-Control-Allow-Origin"] == "https://mtcottages.com"
    assert "Set-Cookie" not in response.headers
    (table, rows), = fake.tables.items()
    assert table == analytics.table_name(datetime.now(timezone.utc).date())
    (row,) = rows
    assert row["PartitionKey"] == datetime.now(timezone.utc).date().isoformat()
    assert set(row) == {"PartitionKey", "RowKey", "event", "site", "path", "home", "audience", "src", "ref", "test"}
    stored = json.dumps(row)
    assert "203.0.113.7" not in stored and "Mozilla" not in stored
    assert row["ref"] == "duckduckgo.com"


def test_collect_puts_test_traffic_in_its_own_partition_and_drops_crawlers(monkeypatch):
    fake = FakeTables()
    monkeypatch.setattr(analytics, "_request", fake)
    headless = "Mozilla/5.0 HeadlessChrome/141.0"
    assert function_app.collect(_beacon({"e": "form_view", "p": "/", "t": "ci-abc12345"},
                                        origin="https://stay.mtcottages.com", user_agent=headless)).status_code == 202
    assert function_app.collect(_beacon({"e": "pageview", "p": "/"}, user_agent=headless)).status_code == 204
    (rows,) = fake.tables.values()
    assert len(rows) == 1
    assert rows[0]["PartitionKey"].startswith("test-")
    assert rows[0]["site"] == "stay" and rows[0]["test"] == "ci-abc12345"


def test_collect_refuses_other_hosts_origins_and_floods(monkeypatch):
    fake = FakeTables()
    monkeypatch.setattr(analytics, "_request", fake)
    other_host = _beacon({"e": "pageview", "p": "/"})
    other_host.headers["X-Forwarded-Host"] = "mtcottages-apply-proxy.azurewebsites.net"
    assert function_app.collect(other_host).status_code == 404
    assert function_app.collect(_beacon({"e": "pageview", "p": "/"}, origin="https://evil.example")).status_code == 400
    statuses = [function_app.collect(_beacon({"e": "pageview", "p": "/"})).status_code for _ in range(analytics.RATE_LIMIT_EVENTS + 1)]
    assert statuses[-1] == 429 and statuses.count(202) == analytics.RATE_LIMIT_EVENTS


def test_collect_answers_503_when_storage_is_not_key_based(monkeypatch):
    monkeypatch.setenv("AzureWebJobsStorage", "")
    assert function_app.collect(_beacon({"e": "pageview", "p": "/"})).status_code == 503


def test_store_recreates_a_table_removed_under_it(monkeypatch):
    fake = FakeTables()
    monkeypatch.setattr(analytics, "_request", fake)
    now = datetime(2026, 11, 15, 12, tzinfo=timezone.utc)
    analytics.store(CONNECTION, {"event": "pageview", "path": "/"}, now=now)
    fake.tables.clear()
    analytics.store(CONNECTION, {"event": "pageview", "path": "/"}, now=now)
    assert len(fake.tables["mtcevents202611"]) == 1


def test_requests_are_signed_with_the_table_shared_key(monkeypatch):
    captured = {}

    class Response:
        status = 204
        headers = {}

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self, *_args):
            return b""

    def fake_urlopen(request, timeout):
        captured["request"] = request
        return Response()

    monkeypatch.setattr(analytics.urllib.request, "urlopen", fake_urlopen)
    account = analytics._account(CONNECTION)
    analytics._request(account, "GET", "mtcevents202611()", query={"$filter": "PartitionKey ge '2026-11-01'"})
    request = captured["request"]
    assert request.full_url.startswith("https://mtcstore.table.core.windows.net/mtcevents202611()?$filter=PartitionKey%20ge%20%272026-11-01%27")
    headers = {key.lower(): value for key, value in request.header_items()}
    string_to_sign = f"GET\n\n\n{headers['x-ms-date']}\n/mtcstore/mtcevents202611()"
    expected = base64.b64encode(hmac.new(base64.b64decode(ACCOUNT_KEY), string_to_sign.encode(), hashlib.sha256).digest()).decode()
    assert headers["authorization"] == f"SharedKey mtcstore:{expected}"


def test_query_follows_continuation_and_spans_months(monkeypatch):
    pages = []

    def fake(account, method, resource, query=None, body=None, extra_headers=None):
        pages.append((resource, dict(query)))
        if resource == "mtcevents202610()" and "NextPartitionKey" not in query:
            return 200, {"x-ms-continuation-NextPartitionKey": "2026-10-31", "x-ms-continuation-NextRowKey": "r"}, \
                json.dumps({"value": [{"PartitionKey": "2026-10-30", "event": "pageview"}]}).encode()
        if resource == "mtcevents202610()":
            return 200, {}, json.dumps({"value": [{"PartitionKey": "2026-10-31", "event": "pageview"}]}).encode()
        return 404, {}, b""

    monkeypatch.setattr(analytics, "_request", fake)
    rows, truncated = analytics.query_rows(CONNECTION, date(2026, 10, 30), date(2026, 11, 2))
    assert len(rows) == 2 and not truncated
    assert [resource for resource, _query in pages] == ["mtcevents202610()", "mtcevents202610()", "mtcevents202611()"]
    assert pages[1][1]["NextRowKey"] == "r"


def test_summary_counts_funnels_and_keeps_test_traffic_apart():
    day = "2026-11-15"
    rows = [
        {"PartitionKey": day, "event": "pageview", "path": "/index.html", "ref": "google.com"},
        {"PartitionKey": day, "event": "pageview", "path": "/index.html"},
        {"PartitionKey": day, "event": "cta_click", "home": "frederick", "audience": "travel-nurse", "src": "hero"},
        {"PartitionKey": day, "event": "form_view", "home": "frederick"},
        {"PartitionKey": day, "event": "form_start", "home": "frederick"},
        {"PartitionKey": day, "event": "form_submit", "home": "frederick"},
    ]
    tests = [{"PartitionKey": f"test-{day}", "event": "form_view", "test": "ci-abc12345"}]
    model = analytics.summarise(rows, date(2026, 11, 15), date(2026, 11, 15), tests)
    assert model["totals"] == {"pageview": 2, "cta_click": 1, "form_view": 1, "form_start": 1, "form_submit": 1}
    assert model["rates"]["cta_per_pageview"] == 0.5
    assert model["pages"] == [{"key": "/index.html", "count": 2}]
    assert model["ctas"] == [{"key": "hero · frederick · travel-nurse", "count": 1}]
    assert model["funnel_by_home"][0] == {"key": "frederick", "form_view": 1, "form_start": 1, "form_submit": 1, "submit_rate": 1.0}
    assert model["referrers"] == [{"key": "google.com", "count": 1}]
    assert model["test_traffic"] == {"ci-abc12345": {"form_view": 1}}
    page = analytics.render_html(model)
    assert "Mt Cottages visit counts" in page and "<script" not in page


def test_dashboard_escapes_stored_values():
    model = analytics.summarise([{"PartitionKey": "2026-11-15", "event": "pageview", "path": "/<script>"}],
                                date(2026, 11, 15), date(2026, 11, 15))
    assert "<script>" not in analytics.render_html(model)


def _stats_request(query=""):
    return Request(b"", method="GET", url=f"https://stay.mtcottages.com/api/stats{query}",
                   headers={"X-Forwarded-Host": "stay.mtcottages.com"})


def test_stats_route_returns_json_and_a_locked_down_html_page(monkeypatch):
    fake = FakeTables()
    monkeypatch.setattr(analytics, "_request", fake)
    function_app.collect(_beacon({"e": "pageview", "p": "/index.html"}))
    data = function_app.stats(_stats_request("?format=json&days=1"))
    assert data.status_code == 200 and data.headers["Cache-Control"] == "no-store"
    assert json.loads(data.body)["totals"]["pageview"] == 1
    page = function_app.stats(_stats_request())
    assert page.mimetype == "text/html"
    assert page.headers["Content-Security-Policy"].startswith("default-src 'none'")
    assert analytics.dashboard_style_source() in page.headers["Content-Security-Policy"]
    assert page.headers["X-Robots-Tag"] == "noindex, nofollow"


def test_stats_reports_storage_failure_without_secrets(monkeypatch):
    monkeypatch.setenv("AzureWebJobsStorage", "UseDevelopmentStorage=true")
    response = function_app.stats(_stats_request("?format=json"))
    assert response.status_code == 503
    assert json.loads(response.body) == {"status": "unavailable", "reason": "storage_not_key_based"}


def test_stats_window_is_clamped():
    today = date(2026, 11, 15)
    assert analytics.stats_window("7", today) == (date(2026, 11, 9), today)
    assert analytics.stats_window("nope", today)[0] == date(2026, 10, 17)
    assert analytics.stats_window("100000", today)[0] == date(2025, 10, 12)


def test_retention_deletes_only_tables_older_than_thirteen_months(monkeypatch):
    fake = FakeTables()
    for name in ("mtcevents202509", "mtcevents202510", "mtcevents202611", "otherdata"):
        fake.tables[name] = []
    monkeypatch.setattr(analytics, "_request", fake)
    assert analytics.purge(CONNECTION, today=date(2026, 11, 2)) == ["mtcevents202509"]
    assert set(fake.tables) == {"mtcevents202510", "mtcevents202611", "otherdata"}
    list_call = next(call for call in fake.calls if call[0] == "GET")
    assert urllib.parse.unquote(list_call[2]["$filter"]).endswith("TableName lt 'mtcevents202510'")
