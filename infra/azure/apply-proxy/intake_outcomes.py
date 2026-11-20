"""What real guests got from POST /api/apply, for the refused-inquiry alert (WorldEnterpriseGroup/mtcottages#85).

Every real guest inquiry got HTTP 400 for weeks and nothing alerted: the
Function answered, so every liveness check stayed green. This module keeps one
row per guest answer in the Function's own Table Storage (``AzureWebJobsStorage``,
the account analytics already uses) and summarises the recent window for
``/api/health?deep=1``. Deep health answers 503 (``inquiries: guest_refused``)
when guests were refused and none was accepted in the window, and the in-cluster
hourly blackbox probe of deep health (FocusApiary/monitoring-k8s,
``intake-synthetic``) turns that into the platform alert.

A row holds the HTTP status, the stage and reason labels the proxy already
returns (fixed vocabulary), and nothing else: no field value, IP address, user
agent or submission id.

Who counts as a guest: a browser user agent (``Mozilla`` and not a bot or a
headless browser), posting from the stay form's own origin, that is neither a
canary nor a webdriver-controlled browser (the form sends
``X-Automated-Browser: 1`` when ``navigator.webdriver`` is set, which covers
our Playwright smoke and probes). Probes that post without a browser user agent
or an Origin (the blackbox ``intake-synthetic`` checks) never count.
"""

import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

import analytics

logger = logging.getLogger(__name__)

TABLE_PREFIX = "mtcintake"
RETENTION_MONTHS = 3
WINDOW_HOURS = 3
STAY_ORIGIN = "https://stay.mtcottages.com"
AUTOMATED_BROWSER_HEADER = "X-Automated-Browser"
LABEL_PATTERN = re.compile(r"[a-z0-9:,_-]{1,80}")
MAX_ROWS = 5_000
MAX_REFUSAL_KINDS = 8


def table_name(moment):
    return f"{TABLE_PREFIX}{moment.year:04d}{moment.month:02d}"


def is_guest(headers, canary=False):
    """True when the request looks like a real guest's browser on the stay form."""
    if canary:
        return False
    user_agent = headers.get("User-Agent", "")
    if "Mozilla" not in user_agent or analytics.is_bot(user_agent):
        return False
    if headers.get(AUTOMATED_BROWSER_HEADER, "").strip():
        return False
    return headers.get("Origin", "").strip().rstrip("/").lower() == STAY_ORIGIN


def _label(value):
    return value if isinstance(value, str) and LABEL_PATTERN.fullmatch(value) else ("" if not value else "other")


def record(connection_string, status, stage="", reason="", now=None):
    """Store one guest answer. Raises analytics.StorageError when it cannot be stored."""
    now = now or datetime.now(timezone.utc)
    account = analytics._account(connection_string)
    name = table_name(now)
    entity = {
        "PartitionKey": now.date().isoformat(),
        # Sortable by time inside the day; the uuid keeps concurrent rows apart.
        "RowKey": f"{now.strftime('%H%M%S%f')}-{uuid.uuid4().hex}",
        "status": int(status),
        "stage": _label(stage),
        "reason": _label(reason),
    }
    analytics._ensure_table(account, name)
    result, _headers, _body = analytics._request(account, "POST", name, body=entity, extra_headers={"Prefer": "return-no-content"})
    if result == 404:
        with analytics._tables_lock:
            analytics._tables_ready.discard(name)
        analytics._ensure_table(account, name)
        result, _headers, _body = analytics._request(account, "POST", name, body=entity, extra_headers={"Prefer": "return-no-content"})
    if result not in (201, 204):
        raise analytics.StorageError(f"insert_{result}")


def _rows_since(account, since):
    """Rows newer than ``since`` from this month's table and, across a month boundary, the last one."""
    rows = []
    names = sorted({table_name(since), table_name(datetime.now(timezone.utc))})
    low_partition = since.date().isoformat()
    low_row = since.strftime("%H%M%S%f")
    for name in names:
        query = {"$filter": f"PartitionKey ge '{low_partition}'", "$select": "PartitionKey,RowKey,status,stage,reason"}
        while True:
            status, headers, body = analytics._request(account, "GET", f"{name}()", query=query)
            if status == 404:
                break
            if status != 200:
                raise analytics.StorageError(f"query_{status}")
            try:
                values = json.loads(body.decode("utf-8")).get("value", [])
            except (UnicodeDecodeError, json.JSONDecodeError, AttributeError) as error:
                raise analytics.StorageError("query_unreadable") from error
            for value in values:
                if not isinstance(value, dict):
                    continue
                if value.get("PartitionKey") == low_partition and str(value.get("RowKey", "")) < low_row:
                    continue
                rows.append(value)
            if len(rows) >= MAX_ROWS:
                return rows[:MAX_ROWS]
            next_partition = headers.get("x-ms-continuation-NextPartitionKey") if headers else None
            next_row = headers.get("x-ms-continuation-NextRowKey") if headers else None
            if not next_partition:
                break
            query = {**query, "NextPartitionKey": next_partition}
            if next_row:
                query["NextRowKey"] = next_row
    return rows


def summarise(connection_string, now=None, window_hours=WINDOW_HOURS):
    """(healthy, details) for deep health.

    healthy is False only when at least one guest was refused and none was
    accepted in the window: one guest fixing a typo and sending again is fine,
    a proxy that refuses every guest is not. A storage problem reports
    ``unknown_<reason>`` and stays healthy, like the queue checks: deep health
    must not page on its own plumbing.
    """
    now = now or datetime.now(timezone.utc)
    since = now - timedelta(hours=window_hours)
    try:
        account = analytics._account(connection_string)
        rows = _rows_since(account, since)
    except analytics.StorageError as error:
        return True, {"state": f"unknown_{error.reason}", "window_hours": window_hours}
    accepted = sum(1 for row in rows if 200 <= int(row.get("status", 0) or 0) < 300)
    refused_rows = [row for row in rows if not 200 <= int(row.get("status", 0) or 0) < 300]
    kinds = {}
    for row in refused_rows:
        key = ":".join(part for part in (str(row.get("status", "")), row.get("stage", ""), row.get("reason", "")) if part)
        kinds[key] = kinds.get(key, 0) + 1
    top = dict(sorted(kinds.items(), key=lambda item: -item[1])[:MAX_REFUSAL_KINDS])
    healthy = not (refused_rows and accepted == 0)
    return healthy, {
        "state": "ok" if healthy else "guest_refused",
        "window_hours": window_hours,
        "guest_accepted": accepted,
        "guest_refused": len(refused_rows),
        "refused": top,
    }


def purge(connection_string, today=None):
    """Delete monthly tables older than RETENTION_MONTHS. Returns the deleted names."""
    today = today or datetime.now(timezone.utc).date()
    account = analytics._account(connection_string)
    month_index = today.year * 12 + today.month - 1 - RETENTION_MONTHS
    oldest_kept = f"{TABLE_PREFIX}{month_index // 12:04d}{month_index % 12 + 1:02d}"
    status, _headers, body = analytics._request(account, "GET", "Tables", query={
        "$filter": f"TableName ge '{TABLE_PREFIX}' and TableName lt '{oldest_kept}'",
    })
    if status != 200:
        raise analytics.StorageError(f"list_tables_{status}")
    try:
        names = [item.get("TableName", "") for item in json.loads(body.decode("utf-8")).get("value", [])]
    except (UnicodeDecodeError, json.JSONDecodeError, AttributeError) as error:
        raise analytics.StorageError("list_tables_unreadable") from error
    deleted = []
    for name in names:
        if not re.fullmatch(rf"{TABLE_PREFIX}\d{{6}}", name or "") or name >= oldest_kept:
            continue
        status, _headers, _body = analytics._request(account, "DELETE", f"Tables('{name}')")
        if status not in (204, 404):
            raise analytics.StorageError(f"delete_table_{status}")
        deleted.append(name)
    return deleted
