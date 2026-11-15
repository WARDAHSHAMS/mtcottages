"""Cookieless visit and conversion counts for Mt Cottages (WorldEnterpriseGroup/mtcottages#23).

The marketing site and the stay form send small beacons to ``POST /api/collect``.
Each accepted beacon becomes one row in Azure Table Storage, in the Function
App's own host storage account (``AzureWebJobsStorage``), so no new resource and
no licence is involved. ``GET /api/stats`` (function key) aggregates the rows
into the staff dashboard. See docs/marketing/analytics-adr.md.

Privacy rules this module enforces, whatever a caller sends:

- No identifiers. A row holds the event name, the page path (no query string or
  fragment), the home and audience slugs, the CTA source slug, the referring
  site's hostname and nothing else. The IP address and user agent are used in
  memory for rate limiting and bot filtering and are never stored or logged.
- Nothing is stored in the visitor's browser. The beacon sets no cookie and the
  response sets none.
- Automated browsers (our own CI, crawlers, Lighthouse) are kept out of the real
  numbers: a beacon marked ``t`` (sent by a webdriver-controlled browser) lands
  in a separate ``test-`` partition, and a crawler user agent is dropped.

Rows live in one table per month (``mtcevents202611``), partitioned by UTC day.
The monthly retention timer deletes whole tables older than RETENTION_MONTHS.
"""

import base64
import email.utils
import hashlib
import hmac
import html
import json
import logging
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections import Counter
from datetime import date, datetime, timedelta, timezone

import deep_health

logger = logging.getLogger(__name__)

STORAGE_SETTING = "AzureWebJobsStorage"
TABLE_PREFIX = "mtcevents"
TABLE_API_VERSION = "2019-02-02"
REQUEST_TIMEOUT_SECONDS = 10
RETENTION_MONTHS = 13
DEFAULT_STATS_DAYS = 30
MAX_STATS_DAYS = 400
MAX_STATS_ROWS = 200_000
MAX_BEACON_BYTES = 2_048
MAX_PATH_LENGTH = 200
TOP_ROWS = 25

EVENTS = ("pageview", "cta_click", "form_view", "form_start", "form_submit")
SITE_ORIGINS = frozenset({"https://mtcottages.com", "https://www.mtcottages.com"})
STAY_ORIGIN = "https://stay.mtcottages.com"
COLLECT_ORIGINS = SITE_ORIGINS | {STAY_ORIGIN}
OWN_HOSTS = frozenset({"mtcottages.com", "www.mtcottages.com", "stay.mtcottages.com"})
SLUG_PATTERN = re.compile(r"[a-z0-9][a-z0-9-]{0,39}")
PATH_PATTERN = re.compile(r"/[A-Za-z0-9/._~%-]*")
HOSTNAME_PATTERN = re.compile(r"[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?")
# Crawlers, link previews, monitors and audit tools. A real visitor never sends these.
BOT_PATTERN = re.compile(
    r"bot|crawl|spider|slurp|lighthouse|pagespeed|headless|preview|facebookexternalhit|"
    r"python|curl|wget|httpclient|okhttp|go-http|java/|monitor|uptime|axios|node-fetch",
    re.IGNORECASE,
)
RATE_LIMIT_EVENTS = 60
RATE_LIMIT_WINDOW_SECONDS = 60.0
MAX_RATE_LIMIT_KEYS = 4_096

_rate_lock = threading.Lock()
_rate = {}
_tables_lock = threading.Lock()
_tables_ready = set()


class StorageError(Exception):
    """A Table Storage call failed. ``reason`` is a short label without secrets."""

    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


# ---------------------------------------------------------------------------
# Beacon validation
# ---------------------------------------------------------------------------

def slug(value):
    """A lowercase slug of at most 40 characters, or ``""``."""
    if not isinstance(value, str):
        return ""
    candidate = value.strip().lower()
    return candidate if SLUG_PATTERN.fullmatch(candidate) else ""


def safe_path(value):
    """The path of a same-site URL, without query or fragment, or ``""``."""
    if not isinstance(value, str) or not value or len(value) > 2 * MAX_PATH_LENGTH:
        return ""
    # Only a path: a full URL or a protocol-relative one is never accepted.
    if not value.startswith("/") or value.startswith("//"):
        return ""
    try:
        path = urllib.parse.urlsplit(value).path
    except ValueError:
        return ""
    path = path[:MAX_PATH_LENGTH]
    return path if PATH_PATTERN.fullmatch(path) else ""


def referrer_host(value):
    """The hostname of an external referrer. Our own hosts and anything malformed give ``""``."""
    if not isinstance(value, str) or not value or len(value) > 253:
        return ""
    candidate = value.strip().lower().rstrip(".")
    if "/" in candidate or ":" in candidate:
        try:
            candidate = (urllib.parse.urlsplit(candidate if "//" in candidate else f"//{candidate}").hostname or "")
        except ValueError:
            return ""
    if candidate.startswith("www."):
        candidate = candidate[4:]
    if not HOSTNAME_PATTERN.fullmatch(candidate) or "." not in candidate:
        return ""
    if candidate in OWN_HOSTS or candidate.endswith(".mtcottages.com"):
        return ""
    return candidate


def is_bot(user_agent):
    return not isinstance(user_agent, str) or not user_agent.strip() or bool(BOT_PATTERN.search(user_agent))


def parse_beacon(body, origin):
    """Validate a beacon body. Returns the stored fields, or None when it is not acceptable.

    ``origin`` is the request's Origin header; it decides whether the beacon
    came from the marketing site or the stay form, and anything else is refused.
    """
    if origin not in COLLECT_ORIGINS or not body or len(body) > MAX_BEACON_BYTES:
        return None
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    event = payload.get("e")
    if event not in EVENTS:
        return None
    path = safe_path(payload.get("p"))
    if not path:
        return None
    return {
        "event": event,
        "site": "stay" if origin == STAY_ORIGIN else "site",
        "path": path,
        "home": slug(payload.get("h")),
        "audience": slug(payload.get("a")),
        "src": slug(payload.get("s")),
        "ref": referrer_host(payload.get("r")),
        # A webdriver-controlled browser marks its beacons; the label groups a CI run.
        "test": slug(payload.get("t")),
    }


def allow(client_key, now=None):
    """Advisory per-client throttle. The key is held in memory only, never stored."""
    now = time.monotonic() if now is None else now
    with _rate_lock:
        window_start, count = _rate.get(client_key, (now, 0))
        if now - window_start >= RATE_LIMIT_WINDOW_SECONDS:
            window_start, count = now, 0
        if count >= RATE_LIMIT_EVENTS:
            return False
        _rate[client_key] = (window_start, count + 1)
        if len(_rate) > MAX_RATE_LIMIT_KEYS:
            cutoff = now - RATE_LIMIT_WINDOW_SECONDS
            for key in [key for key, (started, _count) in _rate.items() if started < cutoff]:
                _rate.pop(key, None)
            while len(_rate) > MAX_RATE_LIMIT_KEYS:
                _rate.pop(next(iter(_rate)), None)
    return True


def reset_state():
    with _rate_lock:
        _rate.clear()
    with _tables_lock:
        _tables_ready.clear()


# ---------------------------------------------------------------------------
# Table Storage (SharedKey REST, no SDK)
# ---------------------------------------------------------------------------

def table_name(day):
    return f"{TABLE_PREFIX}{day.year:04d}{day.month:02d}"


def partition_key(day, test=False):
    return f"test-{day.isoformat()}" if test else day.isoformat()


def _account(connection_string):
    account = deep_health._storage_account(connection_string, "table")
    if account is None:
        raise StorageError("storage_not_key_based")
    return account


def _request(account, method, resource, query=None, body=None, extra_headers=None):
    """One signed Table Storage call. Returns (status, headers, body bytes).

    HTTP errors come back as their status; network failures raise StorageError.
    """
    name, key, endpoint = account
    parsed_endpoint = urllib.parse.urlsplit(endpoint)
    path = f"{parsed_endpoint.path.rstrip('/')}/{resource}"
    date_value = email.utils.format_datetime(datetime.now(timezone.utc), usegmt=True)
    content_type = "application/json" if body is not None else ""
    string_to_sign = f"{method}\n\n{content_type}\n{date_value}\n/{name}{path}"
    signature = base64.b64encode(hmac.new(key, string_to_sign.encode("utf-8"), hashlib.sha256).digest()).decode()
    headers = {
        "x-ms-date": date_value,
        "x-ms-version": TABLE_API_VERSION,
        "DataServiceVersion": "3.0;NetFx",
        "MaxDataServiceVersion": "3.0;NetFx",
        "Accept": "application/json;odata=nometadata",
        "Authorization": f"SharedKey {name}:{signature}",
        **(extra_headers or {}),
    }
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = content_type
    url = f"{parsed_endpoint.scheme}://{parsed_endpoint.netloc}{path}"
    if query:
        # OData option names keep their "$"; values are fully percent-encoded.
        url += "?" + "&".join(f"{name_}={urllib.parse.quote(str(value), safe='')}" for name_, value in query.items())
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        try:
            payload = error.read(4_096)
        except OSError:
            payload = b""
        finally:
            error.close()
        return error.code, error.headers, payload
    except TimeoutError as error:
        raise StorageError("timeout") from error
    except (urllib.error.URLError, OSError, ValueError) as error:
        raise StorageError(f"unreachable_{type(error).__name__}") from error


def _ensure_table(account, name):
    with _tables_lock:
        if name in _tables_ready:
            return
    status, _headers, _body = _request(account, "POST", "Tables", body={"TableName": name},
                                       extra_headers={"Prefer": "return-no-content"})
    if status not in (201, 204, 409):
        raise StorageError(f"create_table_{status}")
    with _tables_lock:
        _tables_ready.add(name)


def store(connection_string, fields, now=None):
    """Insert one event row. Raises StorageError when it cannot be stored."""
    now = now or datetime.now(timezone.utc)
    account = _account(connection_string)
    day = now.date()
    name = table_name(day)
    entity = {
        "PartitionKey": partition_key(day, bool(fields.get("test"))),
        "RowKey": f"{now.strftime('%H%M%S')}-{uuid.uuid4().hex}",
        **{key: fields.get(key, "") for key in ("event", "site", "path", "home", "audience", "src", "ref", "test")},
    }
    _ensure_table(account, name)
    status, _headers, _body = _request(account, "POST", name, body=entity, extra_headers={"Prefer": "return-no-content"})
    if status == 404:
        # The table was deleted under us (retention) or never existed: create it and retry once.
        with _tables_lock:
            _tables_ready.discard(name)
        _ensure_table(account, name)
        status, _headers, _body = _request(account, "POST", name, body=entity, extra_headers={"Prefer": "return-no-content"})
    if status not in (201, 204):
        raise StorageError(f"insert_{status}")


def _months(start, end):
    current = date(start.year, start.month, 1)
    while current <= end:
        yield current
        current = date(current.year + (current.month == 12), current.month % 12 + 1, 1)


def query_rows(connection_string, start, end, test=False):
    """Every stored row between two UTC days (inclusive). Raises StorageError."""
    account = _account(connection_string)
    low, high = partition_key(start, test), partition_key(end, test)
    odata_filter = f"PartitionKey ge '{low}' and PartitionKey le '{high}'"
    columns = "PartitionKey,event,site,path,home,audience,src,ref,test"
    rows = []
    for month in _months(start, end):
        query = {"$filter": odata_filter, "$select": columns}
        while True:
            status, headers, body = _request(account, "GET", f"{table_name(month)}()", query=query)
            if status == 404:
                break
            if status != 200:
                raise StorageError(f"query_{status}")
            try:
                values = json.loads(body.decode("utf-8")).get("value", [])
            except (UnicodeDecodeError, json.JSONDecodeError, AttributeError) as error:
                raise StorageError("query_unreadable") from error
            rows.extend(value for value in values if isinstance(value, dict))
            if len(rows) >= MAX_STATS_ROWS:
                return rows[:MAX_STATS_ROWS], True
            next_partition = headers.get("x-ms-continuation-NextPartitionKey") if headers else None
            next_row = headers.get("x-ms-continuation-NextRowKey") if headers else None
            if not next_partition:
                break
            query = {"$filter": odata_filter, "$select": columns, "NextPartitionKey": next_partition}
            if next_row:
                query["NextRowKey"] = next_row
    return rows, False


def purge(connection_string, today=None):
    """Delete monthly tables older than RETENTION_MONTHS. Returns the deleted names."""
    today = today or datetime.now(timezone.utc).date()
    account = _account(connection_string)
    month_index = today.year * 12 + today.month - 1 - RETENTION_MONTHS
    oldest_kept = f"{TABLE_PREFIX}{month_index // 12:04d}{month_index % 12 + 1:02d}"
    status, _headers, body = _request(account, "GET", "Tables", query={
        "$filter": f"TableName ge '{TABLE_PREFIX}' and TableName lt '{oldest_kept}'",
    })
    if status != 200:
        raise StorageError(f"list_tables_{status}")
    try:
        names = [item.get("TableName", "") for item in json.loads(body.decode("utf-8")).get("value", [])]
    except (UnicodeDecodeError, json.JSONDecodeError, AttributeError) as error:
        raise StorageError("list_tables_unreadable") from error
    deleted = []
    for name in names:
        if not re.fullmatch(rf"{TABLE_PREFIX}\d{{6}}", name or "") or name >= oldest_kept:
            continue
        status, _headers, _body = _request(account, "DELETE", f"Tables('{name}')")
        if status not in (204, 404):
            raise StorageError(f"delete_table_{status}")
        deleted.append(name)
        with _tables_lock:
            _tables_ready.discard(name)
    return deleted


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def _top(counter, limit=TOP_ROWS):
    return [{"key": key, "count": count} for key, count in counter.most_common(limit)]


def _rate_of(numerator, denominator):
    return round(numerator / denominator, 4) if denominator else None


def summarise(rows, start, end, test_rows=None, truncated=False):
    """Aggregate rows into the dashboard model (plain JSON types)."""
    totals = Counter()
    pages = Counter()
    ctas = Counter()
    cta_homes = Counter()
    cta_audiences = Counter()
    referrers = Counter()
    funnel_home = {}
    funnel_audience = {}
    daily = {}
    for row in rows:
        event = row.get("event", "")
        if event not in EVENTS:
            continue
        totals[event] += 1
        day = str(row.get("PartitionKey", ""))
        daily.setdefault(day, Counter())[event] += 1
        home = row.get("home") or "(none)"
        audience = row.get("audience") or "(none)"
        if event == "pageview":
            pages[row.get("path", "")] += 1
            if row.get("ref"):
                referrers[row["ref"]] += 1
        elif event == "cta_click":
            ctas[f"{row.get('src') or '(none)'} · {home} · {audience}"] += 1
            cta_homes[home] += 1
            cta_audiences[audience] += 1
        else:
            funnel_home.setdefault(home, Counter())[event] += 1
            funnel_audience.setdefault(audience, Counter())[event] += 1

    def funnel_rows(groups):
        result = []
        for key, counts in sorted(groups.items(), key=lambda item: -item[1]["form_view"]):
            result.append({
                "key": key,
                "form_view": counts["form_view"],
                "form_start": counts["form_start"],
                "form_submit": counts["form_submit"],
                "submit_rate": _rate_of(counts["form_submit"], counts["form_view"]),
            })
        return result

    tests = {}
    for row in test_rows or []:
        label = row.get("test") or "(none)"
        tests.setdefault(label, Counter())[row.get("event", "")] += 1

    return {
        "range": {"start": start.isoformat(), "end": end.isoformat()},
        "truncated": truncated,
        "totals": {event: totals[event] for event in EVENTS},
        "rates": {
            "cta_per_pageview": _rate_of(totals["cta_click"], totals["pageview"]),
            "start_per_view": _rate_of(totals["form_start"], totals["form_view"]),
            "submit_per_view": _rate_of(totals["form_submit"], totals["form_view"]),
        },
        "daily": [
            {"day": day, **{event: counts[event] for event in EVENTS}}
            for day, counts in sorted(daily.items())
        ],
        "pages": _top(pages),
        "ctas": _top(ctas),
        "cta_homes": _top(cta_homes),
        "cta_audiences": _top(cta_audiences),
        "referrers": _top(referrers, 15),
        "funnel_by_home": funnel_rows(funnel_home),
        "funnel_by_audience": funnel_rows(funnel_audience),
        "test_traffic": {label: dict(counts) for label, counts in sorted(tests.items())},
    }


def stats_window(days_value, today=None):
    """(start, end) for ?days=, clamped to 1..MAX_STATS_DAYS."""
    today = today or datetime.now(timezone.utc).date()
    try:
        days = int(days_value)
    except (TypeError, ValueError):
        days = DEFAULT_STATS_DAYS
    days = max(1, min(MAX_STATS_DAYS, days))
    return today - timedelta(days=days - 1), today


def _table(caption, headers, rows):
    head = "".join(f"<th scope=\"col\">{html.escape(header)}</th>" for header in headers)
    if not rows:
        body = f"<tr><td colspan=\"{len(headers)}\">No data yet.</td></tr>"
    else:
        body = "".join(
            "<tr>" + "".join(f"<td>{html.escape(str(cell))}</td>" for cell in row) + "</tr>" for row in rows
        )
    return f"<table><caption>{html.escape(caption)}</caption><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def _percent(value):
    return "–" if value is None else f"{value * 100:.1f}%"


DASHBOARD_STYLE = (
    "body{margin:0;background:#f6f4ee;color:#1f2a24;font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}"
    "main{max-width:72rem;margin:0 auto;padding:2rem 1rem 4rem}h1{font:600 1.8rem/1.2 Georgia,serif;margin:0 0 .25rem}"
    "p{margin:.25rem 0 1rem;color:#4a554e}.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.75rem;margin:1.5rem 0}"
    ".tile{background:#fff;border:1px solid #dcd8cc;border-radius:.5rem;padding:.9rem 1rem}"
    ".tile b{display:block;font:600 1.7rem/1.1 Georgia,serif}.tile span{color:#4a554e;font-size:.85rem}"
    ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(22rem,1fr));gap:1.5rem}"
    ".scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dcd8cc}"
    "caption{text-align:left;font-weight:700;padding:.5rem 0}th,td{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #ebe7dc}"
    "td:not(:first-child),th:not(:first-child){text-align:right;font-variant-numeric:tabular-nums}"
    "nav a{color:#7a2e1d;margin-right:1rem}"
)


def render_html(model):
    totals = model["totals"]
    rates = model["rates"]
    tiles = [
        ("Page views", totals["pageview"]),
        ("Inquiry clicks", totals["cta_click"]),
        ("Form views", totals["form_view"]),
        ("Forms started", totals["form_start"]),
        ("Inquiries sent", totals["form_submit"]),
        ("Click rate", _percent(rates["cta_per_pageview"])),
        ("Send rate (of form views)", _percent(rates["submit_per_view"])),
    ]
    tile_markup = "".join(
        f"<div class=\"tile\"><b>{html.escape(str(value))}</b><span>{html.escape(label)}</span></div>"
        for label, value in tiles
    )
    funnel_headers = ("Group", "Form views", "Started", "Sent", "Send rate")

    def funnel(rows):
        return [(row["key"], row["form_view"], row["form_start"], row["form_submit"], _percent(row["submit_rate"])) for row in rows]

    sections = [
        _table("Daily", ("Day", "Page views", "Inquiry clicks", "Form views", "Started", "Sent"),
               [(row["day"], row["pageview"], row["cta_click"], row["form_view"], row["form_start"], row["form_submit"]) for row in model["daily"]]),
        _table("Top pages", ("Path", "Views"), [(row["key"], row["count"]) for row in model["pages"]]),
        _table("Inquiry clicks by source · home · audience", ("CTA", "Clicks"), [(row["key"], row["count"]) for row in model["ctas"]]),
        _table("Inquiry clicks by home", ("Home", "Clicks"), [(row["key"], row["count"]) for row in model["cta_homes"]]),
        _table("Inquiry clicks by audience", ("Audience", "Clicks"), [(row["key"], row["count"]) for row in model["cta_audiences"]]),
        _table("Form funnel by home", funnel_headers, funnel(model["funnel_by_home"])),
        _table("Form funnel by audience", funnel_headers, funnel(model["funnel_by_audience"])),
        _table("Referring sites", ("Site", "Views"), [(row["key"], row["count"]) for row in model["referrers"]]),
        _table("Automated test traffic (excluded above)", ("Label", "Events"),
               [(label, ", ".join(f"{event} {count}" for event, count in sorted(counts.items()))) for label, counts in model["test_traffic"].items()]),
    ]
    note = "<p><strong>Truncated:</strong> the range holds more rows than one page can read; shorten it.</p>" if model["truncated"] else ""
    return (
        "<!doctype html><html lang=\"en-US\"><head><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        "<meta name=\"robots\" content=\"noindex,nofollow\"><title>Mt Cottages visit counts</title>"
        f"<style>{DASHBOARD_STYLE}</style></head><body><main>"
        "<h1>Mt Cottages visit counts</h1>"
        f"<p>{html.escape(model['range']['start'])} to {html.escape(model['range']['end'])} (UTC). Cookieless counts: no visitor is identified or followed between visits, so these are page views and actions, not people.</p>"
        "<nav aria-label=\"Range\"><a href=\"?days=7\">7 days</a><a href=\"?days=30\">30 days</a><a href=\"?days=90\">90 days</a></nav>"
        f"{note}<div class=\"tiles\">{tile_markup}</div>"
        + "<div class=\"grid\">" + "".join(f"<div class=\"scroll\">{section}</div>" for section in sections) + "</div>"
        "</main></body></html>"
    )


def dashboard_style_source():
    digest = base64.b64encode(hashlib.sha256(DASHBOARD_STYLE.encode("utf-8")).digest()).decode("ascii")
    return f"'sha256-{digest}'"
