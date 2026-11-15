"""Deep health for the stay application host (#16): `GET /api/health?deep=1`.

It follows the platform's upstream-health contract (FocusApiary/infrastructure
`docs/runbooks/intake-synthetic-checks.md`, reference implementation
FocusApiary/form-intake-proxy `function/src/upstream-check.js`):

- **upstream**: a GET on the Logic App trigger. An authorised GET on a Request
  trigger is refused with 400 `TriggerRequestMethodNotValid`, so that (or 405
  or 2xx) is ``ok``. A bad signature or caller IP is 401/403 before that and
  reads ``status_401_AuthorizationFailed``. No payload is sent, no workflow runs.
- **queues**: the approximate depth of the retry queue and of the two poison
  queues (#15, #14). Any message in a poison queue is a lead or a notification
  that exhausted its retries and needs staff, so the check fails.

The answer is 200 when every check passes and 503 otherwise, and is cached for
a short time so a burst of public calls cannot multiply outbound requests.
The body holds labels and counts only, never a URL, key or lead field.
"""

import base64
import email.utils
import hashlib
import hmac
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import managed_identity

UPSTREAM_SETTING = "LOGICAPP_URL_APPLICATION"
STORAGE_SETTING = "AzureWebJobsStorage"
RETRY_QUEUE = "intake-retry"
POISON_QUEUES = ("intake-retry-poison", "intake-notify-poison")
CHECK_TIMEOUT_SECONDS = 10
CACHE_SECONDS = 30
MAX_ERROR_BYTES = 2_000
STORAGE_API_VERSION = "2021-12-02"
ERROR_CODE_PATTERN = re.compile(r"[A-Za-z0-9_]{1,60}")

_cache_lock = threading.Lock()
_cache = {"result": None, "expires_at": 0.0}


def _error_code(body):
    try:
        parsed = json.loads(body[:MAX_ERROR_BYTES].decode("utf-8", errors="replace"))
    except json.JSONDecodeError:
        return ""
    error = parsed.get("error") if isinstance(parsed, dict) else None
    code = error.get("code") if isinstance(error, dict) else None
    return code if isinstance(code, str) and ERROR_CODE_PATTERN.fullmatch(code) else ""


def _is_authorised(status, code):
    return status == 405 or 200 <= status <= 299 or (status == 400 and code == "TriggerRequestMethodNotValid")


def check_upstream(callback_url, prepare=None):
    """``ok``, ``not_configured``, ``auth_<reason>``, ``status_<http>[_<code>]`` or ``unreachable_<error>``.

    ``prepare(url) -> (url, headers)`` applies the caller authentication the
    real delivery uses (#17), so the check proves exactly that path.
    """
    try:
        parsed = urllib.parse.urlsplit(callback_url or "")
    except ValueError:
        return "not_configured"
    if parsed.scheme != "https" or not parsed.hostname:
        return "not_configured"
    try:
        url, headers = prepare(callback_url) if prepare else (callback_url, {})
    except managed_identity.ManagedIdentityError as error:
        return f"auth_{error.reason}"
    request = urllib.request.Request(url, headers={"Accept": "application/json", **headers}, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=CHECK_TIMEOUT_SECONDS) as response:
            status, body = response.status, response.read(MAX_ERROR_BYTES)
    except urllib.error.HTTPError as error:
        status = error.code
        try:
            body = error.read(MAX_ERROR_BYTES)
        except OSError:
            body = b""
        finally:
            error.close()
    except TimeoutError:
        return "unreachable_TimeoutError"
    except urllib.error.URLError as error:
        reason = error.reason
        return f"unreachable_{type(reason).__name__ if isinstance(reason, BaseException) else 'URLError'}"
    except (OSError, ValueError) as error:
        return f"unreachable_{type(error).__name__}"
    code = _error_code(body)
    if _is_authorised(status, code):
        return "ok"
    return f"status_{status}_{code}" if code else f"status_{status}"


def _storage_account(connection_string, service="queue"):
    """(account, key, <service> endpoint) from a key-based connection string, or None.

    ``service`` is ``queue`` (deep health) or ``table`` (analytics, #23).
    """
    fields = {}
    for part in (connection_string or "").split(";"):
        name, separator, value = part.partition("=")
        if separator:
            fields[name.strip()] = value.strip()
    account, key = fields.get("AccountName", ""), fields.get("AccountKey", "")
    if not re.fullmatch(r"[a-z0-9]{3,24}", account) or not key:
        return None
    try:
        decoded_key = base64.b64decode(key, validate=True)
    except ValueError:
        return None
    endpoint = fields.get(f"{service.capitalize()}Endpoint", "").rstrip("/")
    if not endpoint:
        suffix = fields.get("EndpointSuffix", "core.windows.net")
        if not re.fullmatch(r"[a-z0-9.-]{3,100}", suffix):
            return None
        endpoint = f"https://{account}.{service}.{suffix}"
    if not endpoint.startswith("https://"):
        return None
    return account, decoded_key, endpoint


def _queue_depth(account, key, endpoint, queue):
    """Approximate message count; 0 for a queue that does not exist yet. Raises on any other failure."""
    date = email.utils.format_datetime(datetime.now(timezone.utc), usegmt=True)
    canonical_headers = f"x-ms-date:{date}\nx-ms-version:{STORAGE_API_VERSION}\n"
    endpoint_path = urllib.parse.urlsplit(endpoint).path
    canonical_resource = f"/{account}{endpoint_path}/{queue}\ncomp:metadata"
    string_to_sign = "GET\n" + "\n" * 11 + canonical_headers + canonical_resource
    signature = base64.b64encode(hmac.new(key, string_to_sign.encode("utf-8"), hashlib.sha256).digest()).decode()
    request = urllib.request.Request(
        f"{endpoint}/{queue}?comp=metadata",
        headers={
            "x-ms-date": date,
            "x-ms-version": STORAGE_API_VERSION,
            "Authorization": f"SharedKey {account}:{signature}",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=CHECK_TIMEOUT_SECONDS) as response:
            count = response.headers.get("x-ms-approximate-messages-count", "")
    except urllib.error.HTTPError as error:
        error.close()
        if error.code == 404:
            return 0
        raise
    if not str(count).isdigit():
        raise ValueError("queue metadata has no message count")
    return int(count)


def check_queues(connection_string):
    """Depth per queue, or ``unknown`` when the host storage cannot be read with a key."""
    queues = (RETRY_QUEUE, *POISON_QUEUES)
    account = _storage_account(connection_string)
    if account is None:
        return {queue: "unknown" for queue in queues}
    depths = {}
    for queue in queues:
        try:
            depths[queue] = _queue_depth(*account, queue)
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
            depths[queue] = f"unknown_{type(error).__name__}"
    return depths


def evaluate(environ, prepare=None):
    """(healthy, details) for the current settings. Not cached."""
    upstream = {UPSTREAM_SETTING: check_upstream(environ.get(UPSTREAM_SETTING, ""), prepare)}
    queues = check_queues(environ.get(STORAGE_SETTING, ""))
    poisoned = any(isinstance(queues.get(queue), int) and queues[queue] > 0 for queue in POISON_QUEUES)
    healthy = all(value == "ok" for value in upstream.values()) and not poisoned
    return healthy, {"upstream": upstream, "queues": queues}


def cached_evaluate(environ, prepare=None, now=None):
    now = time.monotonic() if now is None else now
    with _cache_lock:
        if _cache["result"] is not None and now < _cache["expires_at"]:
            return _cache["result"]
    result = evaluate(environ, prepare)
    with _cache_lock:
        _cache["result"] = result
        _cache["expires_at"] = now + CACHE_SECONDS
    return result


def reset_cache():
    with _cache_lock:
        _cache["result"] = None
        _cache["expires_at"] = 0.0
