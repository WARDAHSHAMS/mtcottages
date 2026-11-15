"""Entra tokens from the Function App's managed identity, cached per resource.

Used for ACS Email (#14) and, with ``LOGICAPP_AUTH=managed-identity``, for the
Logic App trigger (#17). The App Service identity endpoint is local to the
host; ``AZURE_CLIENT_ID`` selects a user-assigned identity when one is used.
A token is never logged or returned in an error.
"""

import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

IDENTITY_API_VERSION = "2019-08-01"
TIMEOUT_SECONDS = 5
REFRESH_MARGIN_SECONDS = 300
MAX_RESPONSE_BYTES = 64 * 1_024
CLIENT_ID_PATTERN = re.compile(r"[0-9a-fA-F-]{36}")

_lock = threading.Lock()
_cache = {}


class ManagedIdentityError(RuntimeError):
    """No token. ``reason`` is a short, secret-free label such as ``identity_status_403``."""

    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


def reset_cache():
    with _lock:
        _cache.clear()


def get_token(resource):
    now = time.time()
    with _lock:
        cached = _cache.get(resource)
        if cached and now < cached[1] - REFRESH_MARGIN_SECONDS:
            return cached[0]
    endpoint = os.environ.get("IDENTITY_ENDPOINT", "")
    identity_header = os.environ.get("IDENTITY_HEADER", "")
    if not endpoint or not identity_header:
        raise ManagedIdentityError("identity_endpoint_missing")
    query = {"resource": resource, "api-version": IDENTITY_API_VERSION}
    client_id = os.environ.get("AZURE_CLIENT_ID", "").strip()
    if CLIENT_ID_PATTERN.fullmatch(client_id):
        query["client_id"] = client_id
    request = urllib.request.Request(
        f"{endpoint}?{urllib.parse.urlencode(query)}",
        headers={"X-IDENTITY-HEADER": identity_header},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = json.loads(response.read(MAX_RESPONSE_BYTES).decode("utf-8"))
    except urllib.error.HTTPError as error:
        error.close()
        raise ManagedIdentityError(f"identity_status_{error.code}") from None
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise ManagedIdentityError(f"identity_unreachable_{type(error).__name__}") from None
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ManagedIdentityError("identity_body_invalid") from None
    token = body.get("access_token") if isinstance(body, dict) else None
    try:
        expires_at = float(body.get("expires_on", "")) if isinstance(body, dict) else 0.0
    except (TypeError, ValueError):
        expires_at = 0.0
    if not isinstance(token, str) or not token or not expires_at:
        raise ManagedIdentityError("identity_body_invalid")
    with _lock:
        _cache[resource] = (token, expires_at)
    return token
