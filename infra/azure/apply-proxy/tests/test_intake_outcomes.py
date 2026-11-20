"""The refused-guest-inquiry alert (#85): who counts, what is kept, and deep health's verdict."""

import json
from datetime import date, datetime, timedelta, timezone

import pytest

from test_function_app import Request, _apply, _form_request, _health, _valid_payload, function_app  # noqa: F401
from test_function_app import deep, siteverify  # noqa: F401 - pytest fixtures

analytics = function_app.analytics
intake_outcomes = function_app.intake_outcomes

STORAGE_KEY = "a2V5LWZvci10ZXN0cy1vbmx5"  # base64 of a dummy key, not a credential
CONNECTION = f"DefaultEndpointsProtocol=https;AccountName=mtcproxy;AccountKey={STORAGE_KEY};EndpointSuffix=core.windows.net"
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
NOW = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)


class FakeTables:
    """Stands in for analytics._request: an in-memory Table service."""

    def __init__(self):
        self.tables = {}
        self.fail = None

    def __call__(self, account, method, resource, query=None, body=None, extra_headers=None):
        if self.fail:
            return self.fail, {}, b""
        if method == "POST" and resource == "Tables":
            created = body["TableName"] not in self.tables
            self.tables.setdefault(body["TableName"], [])
            return (201 if created else 409), {}, b""
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
            low = query["$filter"].split("'")[1]
            return 200, {}, json.dumps({"value": [row for row in self.tables[name] if row["PartitionKey"] >= low]}).encode()
        if method == "DELETE":
            self.tables.pop(resource.split("'")[1], None)
            return 204, {}, b""
        raise AssertionError(f"unexpected call {method} {resource}")


@pytest.fixture
def tables(monkeypatch):
    analytics.reset_state()
    fake = FakeTables()
    monkeypatch.setattr(analytics, "_request", fake)
    monkeypatch.setenv("AzureWebJobsStorage", CONNECTION)
    yield fake
    analytics.reset_state()


def _guest_headers(**extra):
    return {"User-Agent": BROWSER_UA, "X-Forwarded-Host": "stay.mtcottages.com", **extra}


@pytest.mark.parametrize(("headers", "guest"), [
    ({"User-Agent": BROWSER_UA, "Origin": "https://stay.mtcottages.com"}, True),
    ({"User-Agent": BROWSER_UA, "Origin": "https://stay.mtcottages.com/"}, True),
    ({"User-Agent": BROWSER_UA, "Origin": "https://stay.mtcottages.com", "X-Automated-Browser": "1"}, False),
    ({"User-Agent": "Mozilla/5.0 HeadlessChrome/141.0", "Origin": "https://stay.mtcottages.com"}, False),
    ({"User-Agent": "Blackbox Exporter/0.25", "Origin": "https://stay.mtcottages.com"}, False),
    ({"User-Agent": "python-urllib/3.13", "Origin": "https://stay.mtcottages.com"}, False),
    ({"User-Agent": BROWSER_UA}, False),
    ({"User-Agent": BROWSER_UA, "Origin": "https://evil.example"}, False),
])
def test_only_a_real_browser_on_the_stay_form_counts_as_a_guest(headers, guest):
    assert intake_outcomes.is_guest(headers) is guest


def test_a_canary_never_counts_as_a_guest():
    assert not intake_outcomes.is_guest({"User-Agent": BROWSER_UA, "Origin": "https://stay.mtcottages.com"}, canary=True)


def test_a_row_keeps_labels_only(tables):
    intake_outcomes.record(CONNECTION, 400, "validation", "email; DROP TABLE", now=NOW)
    (name, rows), = tables.tables.items()
    assert name == "mtcintake202611"
    row, = rows
    assert set(row) == {"PartitionKey", "RowKey", "status", "stage", "reason"}
    assert (row["PartitionKey"], row["status"], row["stage"], row["reason"]) == ("2026-11-20", 400, "validation", "other")


def test_a_failed_insert_raises_a_storage_error(tables):
    tables.fail = 503
    with pytest.raises(analytics.StorageError):
        intake_outcomes.record(CONNECTION, 200, now=NOW)


def test_refused_guests_with_none_accepted_are_unhealthy(tables):
    intake_outcomes.record(CONNECTION, 400, "verification", "rejected:invalid-input-response", now=NOW - timedelta(minutes=30))
    intake_outcomes.record(CONNECTION, 400, "verification", "rejected:invalid-input-response", now=NOW - timedelta(minutes=10))
    intake_outcomes.record(CONNECTION, 400, "screening", "", now=NOW - timedelta(minutes=5))
    healthy, details = intake_outcomes.summarise(CONNECTION, now=NOW)
    assert not healthy
    assert details == {
        "state": "guest_refused", "window_hours": 3, "guest_delivered": 0, "guest_queued": 0, "guest_refused": 3,
        "refused": {"400:verification:rejected:invalid-input-response": 2, "400:screening": 1},
    }


def test_leads_that_only_queue_are_unhealthy(tables):
    """#85's root cause: the Logic App failed every lead, guests saw 202 'received'."""
    intake_outcomes.record(CONNECTION, 202, now=NOW - timedelta(minutes=40))
    intake_outcomes.record(CONNECTION, 202, now=NOW - timedelta(minutes=5))
    healthy, details = intake_outcomes.summarise(CONNECTION, now=NOW)
    assert not healthy
    assert (details["state"], details["guest_queued"], details["guest_delivered"]) == ("guest_queued", 2, 0)


def test_one_delivered_guest_in_the_window_is_healthy(tables):
    intake_outcomes.record(CONNECTION, 400, "validation", "email", now=NOW - timedelta(minutes=20))
    intake_outcomes.record(CONNECTION, 200, now=NOW - timedelta(minutes=19))
    healthy, details = intake_outcomes.summarise(CONNECTION, now=NOW)
    assert healthy and details["state"] == "ok"
    assert (details["guest_delivered"], details["guest_refused"]) == (1, 1)


def test_refusals_older_than_the_window_are_forgotten(tables):
    intake_outcomes.record(CONNECTION, 400, "turnstile", "x", now=NOW - timedelta(hours=4))
    healthy, details = intake_outcomes.summarise(CONNECTION, now=NOW)
    assert healthy and details["guest_refused"] == 0


def test_no_guests_at_all_is_healthy(tables):
    assert intake_outcomes.summarise(CONNECTION, now=NOW) == (True, {
        "state": "ok", "window_hours": 3, "guest_delivered": 0, "guest_queued": 0, "guest_refused": 0, "refused": {},
    })


def test_a_storage_problem_is_reported_but_never_pages(tables):
    tables.tables["mtcintake202611"] = []
    tables.fail = 403
    healthy, details = intake_outcomes.summarise(CONNECTION, now=NOW)
    assert healthy and details["state"] == "unknown_query_403"


def test_purge_keeps_three_months(tables):
    for name in ("mtcintake202607", "mtcintake202608", "mtcintake202609", "mtcintake202611", "mtcevents202601"):
        tables.tables[name] = []
    assert intake_outcomes.purge(CONNECTION, today=date(2026, 11, 20)) == ["mtcintake202607"]
    assert "mtcevents202601" in tables.tables and "mtcintake202608" in tables.tables


def test_apply_records_what_a_guest_was_refused_with(tables, siteverify):
    siteverify.result = {"success": False, "error-codes": ["invalid-input-response"]}
    response = _apply(_form_request(_valid_payload(), headers=_guest_headers()))
    assert response.status_code == 400
    row, = tables.tables["mtcintake" + datetime.now(timezone.utc).strftime("%Y%m")]
    assert (row["status"], row["stage"], row["reason"]) == (400, "verification", "rejected:invalid-input-response")


def test_apply_records_an_accepted_guest(tables, siteverify):
    response = _apply(_form_request(_valid_payload(), headers=_guest_headers()))
    assert 200 <= response.status_code < 300
    row, = tables.tables["mtcintake" + datetime.now(timezone.utc).strftime("%Y%m")]
    assert row["status"] == response.status_code


@pytest.mark.parametrize("headers", [
    {"X-Forwarded-Host": "stay.mtcottages.com"},
    _guest_headers(**{"X-Automated-Browser": "1"}),
])
def test_apply_does_not_record_probes_or_automated_browsers(tables, siteverify, headers):
    _apply(_form_request(_valid_payload(), headers=headers))
    assert not any(name.startswith("mtcintake") for name in tables.tables)


def test_a_storage_outage_never_changes_the_guests_answer(tables, siteverify):
    tables.fail = 500
    response = _apply(_form_request(_valid_payload(), headers=_guest_headers()))
    assert 200 <= response.status_code < 300


def test_deep_health_pages_when_every_guest_was_refused(deep, monkeypatch):
    monkeypatch.setattr(function_app, "_guest_inquiries", lambda: (False, {"state": "guest_refused", "guest_refused": 4}))
    response, body = _health()
    assert response.status_code == 503
    assert body["status"] == "degraded" and body["inquiries"]["state"] == "guest_refused"


def test_deep_health_stays_ok_when_guests_are_accepted(deep, monkeypatch):
    monkeypatch.setattr(function_app, "_guest_inquiries", lambda: (True, {"state": "ok"}))
    response, body = _health()
    assert response.status_code == 200 and body["inquiries"] == {"state": "ok"}
