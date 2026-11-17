import base64
import hashlib
import hmac
import html
import http.client
import ipaddress
import json
import logging
import math
import os
import re
import secrets
import threading
import time
import typing
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import date, datetime, timezone
from pathlib import Path

import azure.functions as func

import analytics
import deep_health
import intake_notify
import managed_identity

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)
logger = logging.getLogger(__name__)
_last_submission = {}
_rate_limit_lock = threading.Lock()
# submissionId -> monotonic time it was delivered or durably queued. Best-effort
# per instance: it answers a browser retry without calling the Logic App twice.
_accepted_submissions = {}
_accepted_lock = threading.Lock()
# Durable fallback (WorldEnterpriseGroup/mtcottages#15): a lead the Logic App did
# not accept is written to this queue in the Function App's own host storage
# account (AzureWebJobsStorage). redeliver_intake retries it; after host.json
# maxDequeueCount attempts the runtime moves it to "intake-retry-poison", where
# it stays for staff recovery and alerting (#16).
INTAKE_RETRY_QUEUE = "intake-retry"
INTAKE_QUEUE_CONNECTION = "AzureWebJobsStorage"
INTAKE_ENVELOPE_VERSION = 1
DEFAULT_LOGICAPP_TIMEOUT_SECONDS = 25.0
LOGICAPP_AUTH_MANAGED_IDENTITY = "managed-identity"
# The audience a Consumption Request trigger's Entra policy validates
# (same as FocusApiary/form-intake-proxy).
LOGICAPP_TOKEN_AUDIENCE = "https://management.core.windows.net/"
MAX_LOGICAPP_RESPONSE_BYTES = 64 * 1_024
# End-to-end canary (#16). A request whose X-Intake-Canary header matches the
# CANARY_TOKEN setting (a Key Vault reference) skips Turnstile and becomes a
# fixed synthetic lead: the identity fields below and CANARY_GUEST_EMAIL replace
# whatever was sent, so a canary can never carry a real person's data. The
# Logic App sees CANARY_LOGICAPP_HEADER and deletes the lead it created in the
# same run. Both settings must be present, or canary mode is off.
CANARY_REQUEST_HEADER = "X-Intake-Canary"
CANARY_LOGICAPP_HEADER = "X-Intake-Canary-Run"
MIN_CANARY_TOKEN_LENGTH = 32
CANARY_LEAD_FIELDS = {
    "firstName": "Intake",
    "lastName": "Canary",
    "phone": "+1 304 555 0100",
    "message": "Automated intake check. This lead is deleted when the check finishes.",
}
ACCEPTED_SUBMISSION_TTL_SECONDS = 24 * 60 * 60
MAX_ACCEPTED_SUBMISSIONS = 4_096
SUBMISSION_ID_PATTERN = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")
ACCEPTED_MESSAGE = "Thanks — your inquiry is on its way. Mt Cottages will follow up about availability and next steps."
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
DEFAULT_ALLOWED_ORIGINS = "https://stay.mtcottages.com"
CANONICAL_HOSTNAME = "stay.mtcottages.com"
DEFAULT_TURNSTILE_HOSTNAMES = "stay.mtcottages.com"
DEFAULT_TURNSTILE_ACTION = "stay-inquiry"
MAX_BODY_BYTES = 200_000
MAX_CONFIG_LIST_BYTES = 4_096
MAX_TURNSTILE_TOKEN_LENGTH = 2_048
MAX_TURNSTILE_RESPONSE_BYTES = 64 * 1_024
MAX_TURNSTILE_ERROR_CODES = 4
TURNSTILE_ERROR_CODE_PATTERN = re.compile(r"[a-z0-9-]{1,48}")
TURNSTILE_ACTION_LABEL_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")
MAX_CLIENT_IP_LENGTH = 64
MAX_RATE_LIMIT_ENTRIES = 4_096
MIN_MOVE_IN_DATE = date(1900, 1, 1)
MAX_MOVE_IN_DATE = date(2100, 12, 31)
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}
ALLOWED_FIELDS = {
    "firstName", "lastName", "email", "phone", "moveInDate", "duration", "occupants",
    "preferredLocation", "homeSize", "stayType", "pets", "employment", "monthlyBudget",
    "furnishedNeeds", "message", "screeningConsent", "termsAccepted", "website", "sourceUrl",
    "propertyId", "submissionId",
}
FIELD_LIMITS = {
    "firstName": 100,
    "lastName": 100,
    "email": 254,
    "phone": 30,
    "moveInDate": 10,
    "duration": 64,
    "occupants": 2,
    "preferredLocation": 64,
    "homeSize": 64,
    "stayType": 80,
    "pets": 64,
    "employment": 200,
    "monthlyBudget": 100,
    "message": 4000,
    "screeningConsent": 10,
    "termsAccepted": 10,
    "website": 128,
    "sourceUrl": 500,
    "propertyId": 64,
    "furnishedNeeds": 1000,
    "submissionId": 36,
}
CHOICE_FIELDS = {
    "duration": frozenset({
        "One to three months", "Three to twelve months", "A year or more", "Flexible / not sure",
    }),
    # The form offers only the towns with a listed home (#71). The older town
    # values stay accepted so a form a guest opened before the change still sends.
    "preferredLocation": frozenset({
        "Marietta, OH", "Parkersburg, WV", "Ravenswood, WV", "Open to options",
    }) | frozenset({"Grantsville, WV", "Racine, OH", "Athens, OH"}),
    "homeSize": frozenset({
        "Studio or one-bedroom", "Two-bedroom", "Three-bedroom", "Four-bedroom", "Open to options",
    }),
    "stayType": frozenset({
        "Travel or healthcare assignment", "Work or relocation", "Insurance housing",
        "Family or furnished stay", "Research or fellowship", "Personal transition", "Something else",
    }),
    "pets": frozenset({"No pets", "Yes — I’ll share details below", "Prefer to discuss"}),
}
REQUIRED_FIELDS = (
    "firstName", "lastName", "email", "phone", "stayType", "preferredLocation", "moveInDate",
    "duration", "occupants", "message", "termsAccepted",
)
VALID_BOOLEAN_VALUES = frozenset({"yes", "true", "on"})


def _content_security_policy(script_nonce=None, style_source=None):
    script_sources = "'self' https://challenges.cloudflare.com"
    if script_nonce:
        script_sources += f" 'nonce-{script_nonce}'"
    style_sources = "'self'"
    if style_source:
        style_sources += f" {style_source}"
    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        f"script-src {script_sources}; "
        f"style-src {style_sources}; "
        "connect-src 'self' https://challenges.cloudflare.com; "
        "frame-src 'self' https://challenges.cloudflare.com; "
        "img-src 'self'; "
        "font-src 'self'"
    )


SECURITY_HEADERS["Content-Security-Policy"] = _content_security_policy()


def _normalize_hostname(value):
    if not isinstance(value, str):
        return None
    candidate = value.strip().lower().rstrip(".")
    if not candidate or len(candidate) > 253 or any(character.isspace() for character in candidate):
        return None
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        pass
    labels = candidate.split(".")
    if any(
        not label
        or len(label) > 63
        or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", label)
        for label in labels
    ):
        return None
    return candidate


def _normalize_origin(value):
    if not isinstance(value, str):
        return None
    candidate = value.strip()
    if not candidate or len(candidate) > MAX_CONFIG_LIST_BYTES:
        return None
    try:
        parsed = urllib.parse.urlsplit(candidate)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError:
        return None
    if (
        parsed.scheme.lower() not in {"http", "https"}
        or not hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
    ):
        return None
    normalized_hostname = _normalize_hostname(hostname)
    if not normalized_hostname:
        return None
    host = f"[{normalized_hostname}]" if ":" in normalized_hostname else normalized_hostname
    scheme = parsed.scheme.lower()
    if port is not None and port not in {80 if scheme == "http" else 443}:
        host += f":{port}"
    return f"{scheme}://{host}"


def _configured_values(environment_name, default, normalizer):
    configured = os.environ.get(environment_name, default)
    if not isinstance(configured, str) or len(configured) > MAX_CONFIG_LIST_BYTES:
        return set()
    return {
        normalized
        for value in configured.split(",")
        if (normalized := normalizer(value)) is not None
    }


def _allowed_origins():
    return _configured_values("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS, _normalize_origin)


def _origin_allowed(origin):
    normalized = _normalize_origin(origin)
    return normalized is not None and normalized in _allowed_origins()


def _cors_headers(origin):
    headers = {
        **SECURITY_HEADERS,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
        "Vary": "Origin",
        "Content-Type": "application/json",
    }
    normalized_origin = _normalize_origin(origin)
    if normalized_origin and normalized_origin in _allowed_origins():
        headers["Access-Control-Allow-Origin"] = normalized_origin
    return headers


def _response(payload, status_code, origin, extra_headers=None):
    headers = {**_cors_headers(origin), **(extra_headers or {})}
    return func.HttpResponse(json.dumps(payload), status_code=status_code, headers=headers)


def _build_commit():
    """Return the commit the deployed package was built from.

    The `package:apply-proxy` CI job writes the full commit SHA to BUILD_COMMIT
    next to this file. A package built any other way has no such file, and a
    file that is not a 40-character SHA is ignored, so both report "unknown".
    """
    try:
        value = Path(__file__).with_name("BUILD_COMMIT").read_text(encoding="utf-8").strip()
    except (OSError, UnicodeDecodeError):
        return "unknown"
    return value if re.fullmatch(r"[0-9a-f]{40}", value) else "unknown"


BUILD_COMMIT = _build_commit()


def _deep_health_requested(req):
    try:
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(req.url).query)
    except ValueError:
        return False
    return query.get("deep", [""])[0] == "1"


def _health_response(req):
    """Liveness, or with ?deep=1 the upstream and queue checks (#16).

    The plain answer stays constant: Front Door's origin probe and the deploy
    gate use it. Only the deep form makes outbound calls, and those are cached.
    """
    payload = {"status": "ok", "service": "mtcottages-apply-proxy", "commit": BUILD_COMMIT}
    if not _deep_health_requested(req):
        return _response(payload, 200, req.headers.get("Origin", ""))
    healthy, details = deep_health.cached_evaluate(os.environ, _intake_target)
    payload.update(details)
    if not healthy:
        payload["status"] = "degraded"
    return _response(payload, 200 if healthy else 503, req.headers.get("Origin", ""), {"Cache-Control": "no-store"})


def _style_csp_source(markup):
    match = re.search(r"<style(?:\s[^>]*)?>(.*?)</style>", markup, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    digest = base64.b64encode(hashlib.sha256(match.group(1).encode("utf-8")).digest()).decode("ascii")
    return f"'sha256-{digest}'"


def _page_security_headers(markup, script_nonce):
    return {
        **SECURITY_HEADERS,
        "Content-Security-Policy": _content_security_policy(
            script_nonce=script_nonce,
            style_source=_style_csp_source(markup),
        ),
    }


def _request_payload(req):
    content_type = req.headers.get("Content-Type", "").lower()
    if "application/json" in content_type:
        value = req.get_json()
        return value if isinstance(value, dict) else {}
    parsed = urllib.parse.parse_qs(req.get_body().decode("utf-8", errors="replace"), keep_blank_values=True)
    return {key: values[-1] if values else "" for key, values in parsed.items()}


def _turnstile_hostnames():
    return _configured_values("TURNSTILE_ALLOWED_HOSTNAMES", DEFAULT_TURNSTILE_HOSTNAMES, _normalize_hostname)


def _request_hostname(req):
    """Return the normalized public hostname for the current request."""
    forwarded_host = req.headers.get("X-Forwarded-Host", "")
    candidates = [value.strip() for value in forwarded_host.split(",") if value.strip()]
    candidates.append(req.headers.get("Host", "").strip())
    candidates.append(urllib.parse.urlsplit(req.url).hostname or "")
    for candidate in candidates:
        try:
            hostname = urllib.parse.urlsplit(f"//{candidate}").hostname
        except ValueError:
            hostname = None
        normalized = _normalize_hostname(hostname or "")
        if normalized:
            return normalized
    return ""


def _canonical_host(req):
    return _request_hostname(req) == CANONICAL_HOSTNAME


def _turnstile_site_key():
    value = os.environ.get("TURNSTILE_SITE_KEY", "").strip()
    if not value or len(value) > 256 or any(character.isspace() for character in value):
        return ""
    return value


def _turnstile_expected_action():
    value = os.environ.get("TURNSTILE_EXPECTED_ACTION", DEFAULT_TURNSTILE_ACTION).strip()
    if not value or len(value) > 64 or not re.fullmatch(r"[A-Za-z0-9_-]+", value):
        return None
    return value


def _turnstile_is_configured():
    site_key = _turnstile_site_key()
    secret = os.environ.get("TURNSTILE_SECRET_KEY", "").strip()
    return bool(
        site_key
        and secret
        and len(secret) <= 256
        and not any(character.isspace() for character in secret)
        and _turnstile_hostnames()
        and _turnstile_expected_action()
    )


def _valid_ip(value):
    if not isinstance(value, str):
        return None
    candidate = value.strip()
    if not candidate or len(candidate) > MAX_CLIENT_IP_LENGTH or "," in candidate:
        return None
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None


def _client_ip(req):
    """Return a bounded, parsed IP for advisory rate limiting and Turnstile.

    Azure Front Door supplies X-Azure-ClientIP and appends the socket address
    to X-Forwarded-For.  Only a single valid address is accepted, and the last
    X-Forwarded-For hop is used so a caller cannot choose an arbitrary first
    value.  These headers remain advisory; they are never an authorization
    signal.
    """
    headers = req.headers
    for header_name in ("X-Azure-ClientIP", "CF-Connecting-IP", "X-Azure-SocketIP"):
        candidate = _valid_ip(headers.get(header_name, ""))
        if candidate:
            return candidate
    forwarded = headers.get("X-Forwarded-For", "")
    if isinstance(forwarded, str) and forwarded:
        return _valid_ip(forwarded.rsplit(",", 1)[-1]) or "unknown"
    return "unknown"


def _turnstile_error_codes(result):
    """Cloudflare's siteverify ``error-codes`` as one short label, e.g. ``invalid-input-response``.

    The codes are Cloudflare's fixed vocabulary (no token, secret or guest data),
    so they can be logged and returned: they are what tells a wrong secret
    (``invalid-input-response`` on every real token) from an expired or reused
    token (``timeout-or-duplicate``), #85.
    """
    codes = result.get("error-codes") if isinstance(result, dict) else None
    if not isinstance(codes, list):
        return "none"
    labels = [code for code in codes if isinstance(code, str) and TURNSTILE_ERROR_CODE_PATTERN.fullmatch(code)]
    return ",".join(labels[:MAX_TURNSTILE_ERROR_CODES]) or "none"


def _label(value, pattern):
    """A logged value reduced to a fixed character set, or ``other``."""
    return value if isinstance(value, str) and pattern.fullmatch(value) else "other"


def _verify_turnstile(req, payload):
    """Return (status, message, reason) when Turnstile refuses, or None when it accepts the token.

    ``reason`` is a short fixed label (plus Cloudflare's error codes) that is
    logged and returned with ``stage: verification``, so a rejection can be
    told apart from a validation error in App Insights and in the browser (#85).
    """
    if not _turnstile_is_configured():
        logger.error("Turnstile validation is not configured")
        return 503, "Human verification is not configured", "not-configured"

    token_value = payload.get("cf-turnstile-response", "")
    if not isinstance(token_value, str):
        logger.warning("Turnstile rejected an inquiry: missing-token")
        return 400, "Please complete the human verification", "missing-token"
    token = token_value.strip()
    if not token:
        logger.warning("Turnstile rejected an inquiry: missing-token")
        return 400, "Please complete the human verification", "missing-token"
    if len(token) > MAX_TURNSTILE_TOKEN_LENGTH:
        logger.warning("Turnstile rejected an inquiry: token-too-long (%d)", len(token))
        return 400, "Please complete the human verification", "token-too-long"

    secret = os.environ["TURNSTILE_SECRET_KEY"].strip()
    verification_data = {"secret": secret, "response": token}
    client_ip = _client_ip(req)
    if client_ip != "unknown":
        verification_data["remoteip"] = client_ip

    verification_request = urllib.request.Request(
        TURNSTILE_VERIFY_URL,
        data=urllib.parse.urlencode(verification_data).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(verification_request, timeout=10) as response:
            result = json.loads(response.read(MAX_TURNSTILE_RESPONSE_BYTES).decode("utf-8", errors="replace"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        logger.error("Turnstile validation request failed: %s", type(error).__name__)
        return 503, "Human verification is temporarily unavailable", "siteverify-unavailable"

    if not isinstance(result, dict) or result.get("success") is not True:
        codes = _turnstile_error_codes(result)
        logger.warning("Turnstile rejected an inquiry: %s", codes)
        return 400, "Please complete the human verification", f"rejected:{codes}"

    hostname = _normalize_hostname(result.get("hostname", ""))
    if hostname not in _turnstile_hostnames():
        logger.warning("Turnstile returned an unexpected hostname: %s", hostname or "none")
        return 400, "Please complete the human verification", "hostname-mismatch"

    expected_action = _turnstile_expected_action()
    if expected_action is None or result.get("action") != expected_action:
        logger.warning(
            "Turnstile returned an unexpected action: %s",
            _label(result.get("action"), TURNSTILE_ACTION_LABEL_PATTERN),
        )
        return 400, "Please complete the human verification", "action-mismatch"

    return None


def _screen_submission(payload):
    """The cheap bot screen that runs before Turnstile: wrong types and the honeypot.

    Kept ahead of verification so a bot probe never costs a siteverify call.
    """
    known_fields = ALLOWED_FIELDS | {"cf-turnstile-response"}
    if any(field in payload and not isinstance(payload[field], str) for field in known_fields):
        return "Invalid submission"
    if _text_value(payload, "website"):
        return "Invalid submission"
    return None


def _text_value(payload, field_name):
    value = payload.get(field_name, "")
    return value.strip() if isinstance(value, str) else ""


def _validate_submission(payload):
    known_fields = ALLOWED_FIELDS | {"cf-turnstile-response"}
    if any(field in payload and not isinstance(payload[field], str) for field in known_fields):
        return "Invalid submission"
    if _text_value(payload, "website"):
        return "Invalid submission"
    if any(not _text_value(payload, field) for field in REQUIRED_FIELDS):
        return "Please complete the required fields"

    terms_accepted = _text_value(payload, "termsAccepted").lower()
    if terms_accepted not in VALID_BOOLEAN_VALUES:
        return "Please confirm the application information"
    screening_consent = _text_value(payload, "screeningConsent").lower()
    if screening_consent and screening_consent not in VALID_BOOLEAN_VALUES:
        return "Invalid submission"

    for field_name, choices in CHOICE_FIELDS.items():
        value = payload.get(field_name, "")
        if value and value not in choices:
            return "Please choose a valid option"

    email = _text_value(payload, "email")
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return "Please provide a valid email"
    phone = _text_value(payload, "phone")
    if not re.fullmatch(r"[0-9+().\-\s]{7,30}", phone):
        return "Please provide a valid phone number"

    move_in_date = payload.get("moveInDate", "")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", move_in_date):
        return "Please provide a valid move-in date"
    try:
        parsed_move_in_date = date.fromisoformat(move_in_date)
    except ValueError:
        return "Please provide a valid move-in date"
    if not MIN_MOVE_IN_DATE <= parsed_move_in_date <= MAX_MOVE_IN_DATE:
        return "Please provide a valid move-in date"

    occupants = payload.get("occupants", "")
    if not re.fullmatch(r"\d{1,2}", occupants) or not 1 <= int(occupants) <= 20:
        return "Please provide a valid occupant count"
    submission_id = _text_value(payload, "submissionId")
    if submission_id and not SUBMISSION_ID_PATTERN.fullmatch(submission_id.lower()):
        return "Invalid submission"
    for field_name, limit in FIELD_LIMITS.items():
        if len(_text_value(payload, field_name)) > limit:
            return "One or more fields are too long"
    return None


def _privacy_safe_source_url(value):
    if not isinstance(value, str) or not value.strip():
        return ""
    try:
        parsed = urllib.parse.urlsplit(value.strip())
        if (
            parsed.scheme.lower() not in {"http", "https"}
            or not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
        ):
            return ""
        safe_origin = _normalize_origin(f"{parsed.scheme}://{parsed.netloc}")
    except ValueError:
        return ""
    if not safe_origin:
        return ""
    if safe_origin not in _allowed_origins():
        return ""
    path = parsed.path or "/"
    if not path.startswith("/"):
        return ""
    return f"{safe_origin}{path}"[:FIELD_LIMITS["sourceUrl"]]


def _outbound_payload(payload):
    outbound = {}
    for key, value in payload.items():
        field_name = str(key)
        if field_name not in ALLOWED_FIELDS or not isinstance(value, str):
            continue
        if field_name == "sourceUrl":
            value = _privacy_safe_source_url(value)
        outbound[field_name] = value[:FIELD_LIMITS.get(field_name, 500)]
    return outbound


def _max_body_size():
    configured = os.environ.get("MAX_BODY_BYTES", str(MAX_BODY_BYTES))
    try:
        value = int(configured)
    except (TypeError, ValueError):
        return MAX_BODY_BYTES
    return value if 1 <= value <= 1_000_000 else MAX_BODY_BYTES


def _rate_limit_window():
    configured = os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "5")
    try:
        value = float(configured)
    except (TypeError, ValueError):
        return 5.0
    if not math.isfinite(value) or value < 1 or value > 86_400:
        return 5.0
    return value


def _record_submission(client_key):
    now = time.monotonic()
    window = _rate_limit_window()
    with _rate_limit_lock:
        last_submission = _last_submission.get(client_key)
        if last_submission is not None:
            remaining = window - (now - last_submission)
            if remaining > 0:
                return max(1, math.ceil(remaining))
        _last_submission[client_key] = now
        if len(_last_submission) > MAX_RATE_LIMIT_ENTRIES:
            cutoff = now - window
            stale_keys = [key for key, timestamp in _last_submission.items() if timestamp < cutoff]
            for key in stale_keys:
                _last_submission.pop(key, None)
            while len(_last_submission) > MAX_RATE_LIMIT_ENTRIES:
                oldest_key = min(_last_submission, key=_last_submission.get)
                _last_submission.pop(oldest_key, None)
    return None


def _logicapp_timeout():
    configured = os.environ.get("LOGICAPP_TIMEOUT_SECONDS", str(DEFAULT_LOGICAPP_TIMEOUT_SECONDS))
    try:
        value = float(configured)
    except (TypeError, ValueError):
        return DEFAULT_LOGICAPP_TIMEOUT_SECONDS
    if not math.isfinite(value) or value < 5 or value > 120:
        return DEFAULT_LOGICAPP_TIMEOUT_SECONDS
    return value


def _submission_id(payload):
    """Return the client's idempotency key, or a new one for an older cached form."""
    value = _text_value(payload, "submissionId").lower()
    return value if SUBMISSION_ID_PATTERN.fullmatch(value) else str(uuid.uuid4())


def _submission_already_accepted(submission_id):
    now = time.monotonic()
    with _accepted_lock:
        accepted_at = _accepted_submissions.get(submission_id)
        return accepted_at is not None and now - accepted_at < ACCEPTED_SUBMISSION_TTL_SECONDS


def _remember_accepted_submission(submission_id):
    now = time.monotonic()
    with _accepted_lock:
        _accepted_submissions[submission_id] = now
        if len(_accepted_submissions) > MAX_ACCEPTED_SUBMISSIONS:
            cutoff = now - ACCEPTED_SUBMISSION_TTL_SECONDS
            for key in [key for key, accepted_at in _accepted_submissions.items() if accepted_at < cutoff]:
                _accepted_submissions.pop(key, None)
            while len(_accepted_submissions) > MAX_ACCEPTED_SUBMISSIONS:
                _accepted_submissions.pop(min(_accepted_submissions, key=_accepted_submissions.get), None)


def _intake_target(callback_url):
    """(url, headers) for a call to the Logic App trigger (#17).

    ``LOGICAPP_AUTH=managed-identity``: the trigger's Entra policy accepts only
    this app's managed identity, so the call carries its token and the URL's
    ``sig`` is removed (Logic Apps refuses a request carrying both). Otherwise
    the stored callback URL, with its ``sig``, is the credential.
    Raises ManagedIdentityError when no token can be had.
    """
    if os.environ.get("LOGICAPP_AUTH", "sas").strip().lower() != LOGICAPP_AUTH_MANAGED_IDENTITY:
        return callback_url, {}
    parts = urllib.parse.urlsplit(callback_url)
    query = [(key, value) for key, value in urllib.parse.parse_qsl(parts.query, keep_blank_values=True) if key != "sig"]
    url = urllib.parse.urlunsplit(parts._replace(query=urllib.parse.urlencode(query)))
    token = managed_identity.get_token(LOGICAPP_TOKEN_AUDIENCE)
    return url, {"Authorization": f"Bearer {token}"}


def _canary_guest_email():
    value = os.environ.get("CANARY_GUEST_EMAIL", "").strip()
    return value if len(value) <= 254 and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value) else ""


def _canary_request(req):
    """True when the request carries the configured canary token (#16)."""
    expected = os.environ.get("CANARY_TOKEN", "").strip()
    if len(expected) < MIN_CANARY_TOKEN_LENGTH or not _canary_guest_email():
        return False
    presented = req.headers.get(CANARY_REQUEST_HEADER, "").strip()
    if not presented:
        return False
    return hmac.compare_digest(presented.encode("utf-8"), expected.encode("utf-8"))


def _canary_lead(outbound):
    """The fixed synthetic lead a canary request becomes."""
    return {**outbound, **CANARY_LEAD_FIELDS, "email": _canary_guest_email()}


def _deliver_to_intake(callback_url, outbound, canary=False):
    """POST one lead to the Logic App.

    Returns (status, reason). status is the HTTP status, or None when no answer
    arrived (timeout, connection failure, malformed response, no identity
    token). reason is a short non-identifying label for logs; it never
    contains lead data. ``canary`` adds the header that makes the Logic App
    delete the lead once it is created.
    """
    try:
        url, auth_headers = _intake_target(callback_url)
    except managed_identity.ManagedIdentityError as error:
        return None, f"auth-{error.reason}"
    except ValueError:
        return None, "invalid-trigger-url"
    canary_headers = {CANARY_LOGICAPP_HEADER: "1"} if canary else {}
    request = urllib.request.Request(
        url,
        data=json.dumps(outbound).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Idempotency-Key": outbound.get("submissionId", ""),
            # The run's clientTrackingId: lets staff and the canary find the
            # Logic App run for one submission by its opaque id.
            "x-ms-client-tracking-id": outbound.get("submissionId", ""),
            **canary_headers,
            **auth_headers,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=_logicapp_timeout()) as response:
            response.read(MAX_LOGICAPP_RESPONSE_BYTES)
            return response.status, f"http-{response.status}"
    except urllib.error.HTTPError as error:
        error.close()
        return error.code, f"http-{error.code}"
    except TimeoutError:
        return None, "timeout"
    except urllib.error.URLError as error:
        reason = "timeout" if isinstance(error.reason, TimeoutError) else "connection-error"
        return None, reason
    except (http.client.HTTPException, OSError, ValueError) as error:
        return None, type(error).__name__


def _retry_envelope(submission_id, outbound, reason, canary=False):
    return json.dumps({
        "version": INTAKE_ENVELOPE_VERSION,
        "submissionId": submission_id,
        "reason": reason,
        "queuedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "canary": bool(canary),
        "payload": outbound,
    })


def _queue_notifications(notify, submission_id, outbound, delivery, canary=False):
    """Queue the staff alert, Teams card and guest acknowledgment (#14).

    Only configured channels are queued. The host writes them after the
    function returns, with the retry message, so notification never delays
    or fails the guest's answer.
    """
    envelopes = intake_notify.notification_envelopes(submission_id, outbound, delivery, canary)
    if envelopes:
        notify.set(envelopes)


@app.route(route="api/apply", methods=["POST", "OPTIONS"])
@app.queue_output(arg_name="retry", queue_name=INTAKE_RETRY_QUEUE, connection=INTAKE_QUEUE_CONNECTION)
@app.queue_output(arg_name="notify", queue_name=intake_notify.NOTIFY_QUEUE, connection=INTAKE_QUEUE_CONNECTION)
def apply(req: func.HttpRequest, retry: func.Out[str], notify: func.Out[typing.List[str]]) -> func.HttpResponse:
    origin = req.headers.get("Origin", "").strip()
    if not _canonical_host(req):
        return _response({"success": False, "message": "Not found"}, 404, origin)
    if req.method == "OPTIONS":
        # Keep a body so the worker does not collapse this response to 204;
        # native Function App CORS also handles preflight at the platform edge.
        return func.HttpResponse("OK", status_code=200, headers=_cors_headers(origin))
    if origin and not _origin_allowed(origin):
        return _response({"success": False, "message": "Origin not allowed"}, 403, origin)

    body = req.get_body()
    if len(body) > _max_body_size():
        return _response({"success": False, "message": "Submission is too large"}, 413, origin)

    try:
        payload = _request_payload(req)
    except (TypeError, ValueError, UnicodeError, json.JSONDecodeError):
        logger.warning("Inquiry rejected at screening: unparseable body")
        return _response({"success": False, "message": "Invalid submission", "stage": "screening"}, 400, origin)

    # Order (#85): bot screen, then Turnstile, then the fields. Verifying the
    # token before the fields means a 400 always says which stage refused it,
    # and the live smoke can prove a real-browser token passes verification by
    # sending it with a deliberately incomplete inquiry, which then stops at
    # validation and never reaches the Logic App.
    screening_error = _screen_submission(payload)
    if screening_error:
        logger.warning("Inquiry rejected at screening")
        return _response({"success": False, "message": screening_error, "stage": "screening"}, 400, origin)

    canary = _canary_request(req)
    turnstile_error = None if canary else _verify_turnstile(req, payload)
    if turnstile_error:
        status_code, message, *details = turnstile_error
        body = {"success": False, "message": message, "stage": "verification"}
        if details:
            body["reason"] = details[0]
        return _response(body, status_code, origin)

    validation_error = _validate_submission(payload)
    if validation_error:
        # The message is one of _validate_submission's fixed strings, never a field value.
        logger.warning("Inquiry rejected at validation: %s", validation_error)
        return _response({"success": False, "message": validation_error, "stage": "validation"}, 400, origin)

    callback_url = os.environ.get("LOGICAPP_URL_APPLICATION", "")
    if not callback_url:
        return _response({"success": False, "message": "Application intake is not configured"}, 503, origin)

    submission_id = _submission_id(payload)
    # A retry of an inquiry this instance already accepted (the guest's browser
    # lost the first answer) gets the same answer without a second lead.
    if _submission_already_accepted(submission_id):
        logger.info("Duplicate inquiry answered without redelivery: %s", submission_id)
        return _response({"success": True, "message": ACCEPTED_MESSAGE}, 200, origin)

    retry_after = _record_submission(_client_ip(req))
    if retry_after is not None:
        return _response(
            {"success": False, "message": "Please wait before trying again"},
            429,
            origin,
            {"Retry-After": str(retry_after)},
        )

    outbound = _outbound_payload(payload)
    outbound["submissionId"] = submission_id
    if canary:
        outbound = _canary_lead(outbound)
        logger.info("Canary inquiry: %s", submission_id)
    status, reason = _deliver_to_intake(callback_url, outbound, canary)
    if status is not None and 200 <= status < 300:
        _remember_accepted_submission(submission_id)
        logger.info("Inquiry delivered to intake: %s", submission_id)
        _queue_notifications(notify, submission_id, outbound, "delivered", canary)
        return _response({"success": True, "message": ACCEPTED_MESSAGE}, 200, origin)

    # Anything else (timeout, connection failure, any non-2xx answer, including
    # a misconfigured trigger URL) keeps the lead: it goes to the retry queue
    # and the guest is told it was received, because it durably was.
    # The host writes the queue message after this function returns. If that
    # write fails the host answers 500, so the submission is deliberately not
    # remembered here: the browser keeps the same submissionId and its retry is
    # processed again instead of being told it was already received.
    logger.warning("Inquiry not accepted by intake (%s); queueing %s for redelivery", reason, submission_id)
    retry.set(_retry_envelope(submission_id, outbound, reason, canary))
    # Staff hear about a queued lead at once: the alert is how they reach the
    # guest while CRM delivery is still retrying.
    _queue_notifications(notify, submission_id, outbound, "queued", canary)
    return _response({"success": True, "message": ACCEPTED_MESSAGE}, 202, origin)


@app.queue_trigger(arg_name="message", queue_name=INTAKE_RETRY_QUEUE, connection=INTAKE_QUEUE_CONNECTION)
def redeliver_intake(message: func.QueueMessage) -> None:
    """Retry one queued lead. Raising leaves it on the queue for the next attempt.

    host.json sets maxDequeueCount and the visibility timeout; after the last
    attempt the runtime moves the message to intake-retry-poison.
    """
    try:
        envelope = json.loads(message.get_body().decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("intake-retry message is not JSON") from error
    if not isinstance(envelope, dict) or envelope.get("version") != INTAKE_ENVELOPE_VERSION:
        raise ValueError("intake-retry message has an unknown envelope version")
    outbound = envelope.get("payload")
    submission_id = envelope.get("submissionId", "")
    if not isinstance(outbound, dict) or not isinstance(submission_id, str):
        raise ValueError("intake-retry message has no payload")

    callback_url = os.environ.get("LOGICAPP_URL_APPLICATION", "")
    if not callback_url:
        raise RuntimeError(f"intake is not configured; keeping {submission_id} queued")

    status, reason = _deliver_to_intake(callback_url, outbound, envelope.get("canary") is True)
    attempt = getattr(message, "dequeue_count", None)
    if status is not None and 200 <= status < 300:
        logger.info("Queued inquiry %s delivered on attempt %s", submission_id, attempt)
        return
    raise RuntimeError(f"redelivery of {submission_id} failed on attempt {attempt}: {reason}")


@app.queue_trigger(arg_name="message", queue_name=intake_notify.NOTIFY_QUEUE, connection=INTAKE_QUEUE_CONNECTION)
def send_intake_notification(message: func.QueueMessage) -> None:
    """Send one channel of one inquiry's notifications (#14).

    Raising leaves the message queued; after host.json's maxDequeueCount the
    runtime moves it to intake-notify-poison. Logs carry the submissionId and
    channel only, never lead fields or a webhook URL.
    """
    envelope = intake_notify.parse_envelope(message.get_body())
    attempt = getattr(message, "dequeue_count", None)
    try:
        intake_notify.send(envelope)
    except intake_notify.NotificationError as error:
        raise RuntimeError(
            f"{envelope['channel']} for {envelope['submissionId']} failed on attempt {attempt}: {error}"
        ) from None
    logger.info("Sent %s for %s on attempt %s", envelope["channel"], envelope["submissionId"], attempt)


@app.route(route="api/health", methods=["GET"])
def health(req: func.HttpRequest) -> func.HttpResponse:
    return _health_response(req)


# ---------------------------------------------------------------------------
# Cookieless analytics (#23): see analytics.py and docs/marketing/analytics-adr.md
# ---------------------------------------------------------------------------

def _collect_headers(origin):
    headers = {**SECURITY_HEADERS, "Cache-Control": "no-store", "Vary": "Origin", "Content-Type": "text/plain"}
    if origin in analytics.COLLECT_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        headers["Access-Control-Allow-Headers"] = "Content-Type"
    return headers


@app.route(route="api/collect", methods=["POST", "OPTIONS"])
def collect(req: func.HttpRequest) -> func.HttpResponse:
    """Store one beacon from the marketing site or the stay form.

    202 stored, 204 dropped on purpose (a crawler), 400 not a valid beacon or
    not from our sites, 429 throttled, 503 storage unavailable. The browser
    ignores the answer; the codes are for the smoke tests and the logs.
    """
    origin = _normalize_origin(req.headers.get("Origin", "")) or ""
    headers = _collect_headers(origin)
    if not _canonical_host(req):
        return func.HttpResponse("Not found", status_code=404, headers=headers)
    if req.method == "OPTIONS":
        return func.HttpResponse("OK", status_code=200, headers=headers)
    fields = analytics.parse_beacon(req.get_body(), origin)
    if fields is None:
        return func.HttpResponse("Invalid beacon", status_code=400, headers=headers)
    if not fields["test"] and analytics.is_bot(req.headers.get("User-Agent", "")):
        return func.HttpResponse("", status_code=204, headers=headers)
    # Test traffic is throttled per label, so a labelled smoke run is not starved
    # by the rest of the suite sharing its runner's address.
    if not analytics.allow(f"{_client_ip(req)}|{fields['test']}"):
        return func.HttpResponse("Slow down", status_code=429, headers={**headers, "Retry-After": "60"})
    try:
        analytics.store(os.environ.get(analytics.STORAGE_SETTING, ""), fields)
    except analytics.StorageError as error:
        logger.warning("Analytics event not stored: %s", error.reason)
        return func.HttpResponse("Unavailable", status_code=503, headers=headers)
    return func.HttpResponse("Accepted", status_code=202, headers=headers)


@app.route(route="api/stats", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def stats(req: func.HttpRequest) -> func.HttpResponse:
    """The staff dashboard: aggregated counts only. Requires a function key.

    ``?days=N`` (1-400, default 30) and ``?format=json`` for machines (the CI
    verify job). Real and automated-test traffic are counted apart.
    """
    if not _canonical_host(req):
        return func.HttpResponse("Not found", status_code=404, headers=SECURITY_HEADERS)
    try:
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(req.url).query)
    except ValueError:
        query = {}
    start, end = analytics.stats_window(query.get("days", [""])[0])
    connection_string = os.environ.get(analytics.STORAGE_SETTING, "")
    try:
        rows, truncated = analytics.query_rows(connection_string, start, end)
        test_rows, _test_truncated = analytics.query_rows(connection_string, start, end, test=True)
    except analytics.StorageError as error:
        logger.warning("Analytics dashboard could not read storage: %s", error.reason)
        return func.HttpResponse(
            json.dumps({"status": "unavailable", "reason": error.reason}),
            status_code=503,
            headers={**SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store"},
        )
    model = analytics.summarise(rows, start, end, test_rows, truncated)
    private = {"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow"}
    if query.get("format", [""])[0] == "json":
        return func.HttpResponse(
            json.dumps(model),
            status_code=200,
            headers={**SECURITY_HEADERS, **private, "Content-Type": "application/json"},
        )
    csp = (
        "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; "
        f"style-src {analytics.dashboard_style_source()}"
    )
    return func.HttpResponse(
        analytics.render_html(model),
        status_code=200,
        mimetype="text/html",
        headers={**SECURITY_HEADERS, **private, "Content-Security-Policy": csp},
    )


@app.timer_trigger(schedule="0 15 4 2 * *", arg_name="timer", run_on_startup=False)
def purge_analytics(timer: func.TimerRequest) -> None:
    """Monthly retention: drop event tables older than analytics.RETENTION_MONTHS."""
    try:
        deleted = analytics.purge(os.environ.get(analytics.STORAGE_SETTING, ""))
    except analytics.StorageError as error:
        raise RuntimeError(f"analytics retention failed: {error.reason}") from None
    logger.info("Analytics retention deleted %d monthly tables: %s", len(deleted), ", ".join(deleted) or "none")


# ---------------------------------------------------------------------------
# The catch-all GET route. Keep it LAST, both in this file and by name.
# ---------------------------------------------------------------------------
# On this Functions host, `{*route}` is matched ahead of literal GET routes:
# the Front Door probe's GET /api/health landed here (082387f), and so did
# GET /api/stats. That returned the form page with HTTP 200 even with a valid
# function key, and verify:analytics in gh-pages pipeline 146130 failed on it
# (#23). Registering it last under a name that sorts after every other function
# lets the literal routes win. tests/test_function_app.py enforces both, and
# the live smoke checks that /api/stats answers 401 without a key.
CATCH_ALL_FUNCTION_NAME = "zz_application_form"


@app.function_name(name=CATCH_ALL_FUNCTION_NAME)
@app.route(route="{*route}", methods=["GET"])
def application_form(req: func.HttpRequest) -> func.HttpResponse:
    requested_path = urllib.parse.urlparse(req.url).path.rstrip("/")
    # The Front Door origin probe (infrastructure#510) calls the origin by its
    # azurewebsites.net host with no X-Forwarded-Host, so liveness must answer
    # before the canonical-host check. The body is constant and the site is
    # reachable only through Front Door (x-azure-fdid access restriction); every
    # other path still requires the canonical hostname.
    if requested_path == "/api/health":
        return _health_response(req)
    if not _canonical_host(req):
        return func.HttpResponse("Not found", status_code=404, headers=SECURITY_HEADERS)
    if requested_path.endswith("/health"):
        return _health_response(req)
    form_path = Path(__file__).with_name("index.html")
    try:
        markup = form_path.read_text(encoding="utf-8")
    except OSError:
        return func.HttpResponse("Application form unavailable", status_code=503, headers=SECURITY_HEADERS)

    if not _turnstile_is_configured():
        logger.error("Turnstile validation is not configured")
        return func.HttpResponse("Application form unavailable", status_code=503, headers=SECURITY_HEADERS)
    turnstile_site_key = _turnstile_site_key()
    script_nonce = secrets.token_urlsafe(18)
    turnstile_script = (
        f'<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" '
        f'nonce="{script_nonce}" async defer></script>'
    )
    markup = markup.replace("<!-- TURNSTILE_SCRIPT -->", turnstile_script)
    markup = markup.replace("__TURNSTILE_SITE_KEY__", html.escape(turnstile_site_key, quote=True))
    markup = markup.replace('nonce="__INLINE_SCRIPT_NONCE__"', f'nonce="{script_nonce}"')
    return func.HttpResponse(
        markup,
        status_code=200,
        mimetype="text/html",
        headers={**_page_security_headers(markup, script_nonce), "Cache-Control": "no-store"},
    )
