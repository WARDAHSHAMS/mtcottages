import importlib.util
import io
import json
import re
import sys
import urllib.error
import urllib.parse
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Generic, TypeVar

import pytest

FUNCTION_PATH = Path(__file__).resolve().parents[1] / "function_app.py"
# The Functions host puts the app root on sys.path; do the same for sibling modules.
if str(FUNCTION_PATH.parent) not in sys.path:
    sys.path.insert(0, str(FUNCTION_PATH.parent))


def _load_function_app():
    if "azure.functions" not in sys.modules:
        azure = ModuleType("azure")
        azure.__path__ = []
        functions = ModuleType("azure.functions")

        class HttpResponse:
            def __init__(self, body="", status_code=200, headers=None, mimetype=None):
                self.body = body
                self.status_code = status_code
                self.headers = headers or {}
                self.mimetype = mimetype

            def get_body(self):
                # Like azure.functions.HttpResponse: the body as bytes.
                return self.body.encode("utf-8") if isinstance(self.body, str) else self.body

        class FunctionApp:
            """Records each function in registration order, like the real app's get_functions()."""

            def __init__(self, **_kwargs):
                self.registered = []  # [(handler, http route or None)]

            def _register(self, route=None):
                def wrap(handler):
                    self.registered.append((handler, route))
                    return handler
                return wrap

            def function_name(self, name, **_kwargs):
                def wrap(handler):
                    handler.function_name = name
                    return handler
                return wrap

            def route(self, route=None, **_kwargs):
                return self._register(route)

            def queue_output(self, **_kwargs):
                return lambda handler: handler

            def queue_trigger(self, **_kwargs):
                return self._register()

            def timer_trigger(self, **_kwargs):
                return self._register()

        value_type = TypeVar("value_type")

        class Out(Generic[value_type]):
            pass

        functions.AuthLevel = SimpleNamespace(ANONYMOUS="anonymous", FUNCTION="function")
        functions.FunctionApp = FunctionApp
        functions.Out = Out
        functions.QueueMessage = object
        functions.TimerRequest = object
        functions.HttpRequest = object
        functions.HttpResponse = HttpResponse
        azure.functions = functions
        sys.modules["azure"] = azure
        sys.modules["azure.functions"] = functions

    spec = importlib.util.spec_from_file_location("apply_proxy_function_app", FUNCTION_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


function_app = _load_function_app()


def test_the_catch_all_get_route_is_registered_last_and_sorts_last():
    """#23: `{*route}` shadowed GET /api/stats (and /api/health, 082387f) on the live host.

    The catch-all must come after every literal route both in registration order and
    by function name, so a new GET endpoint cannot be swallowed by the form page again.
    """
    registered = function_app.app.registered
    names = [getattr(handler, "function_name", handler.__name__) for handler, _route in registered]
    catch_all = [name for name, (_handler, route) in zip(names, registered) if route and route.startswith("{*")]
    assert catch_all == [function_app.CATCH_ALL_FUNCTION_NAME]
    assert registered[-1][1] == "{*route}", "the catch-all must be the last function registered"
    assert max(names) == function_app.CATCH_ALL_FUNCTION_NAME, "the catch-all's name must sort after every other function"
    literal_routes = {route for _handler, route in registered if route and not route.startswith("{*")}
    assert {"api/health", "api/apply", "api/collect", "api/stats"} <= literal_routes


class Request:
    def __init__(self, body=b"", *, method="POST", url="https://stay.mtcottages.com/api/apply", headers=None):
        self._body = body
        self.method = method
        self.url = url
        self.headers = headers or {}

    def get_body(self):
        return self._body

    def get_json(self):
        return json.loads(self._body.decode("utf-8"))


def _valid_payload():
    return {
        "firstName": "Ada",
        "lastName": "Lovelace",
        "email": "ada@example.com",
        "phone": "555-555-1212",
        "moveInDate": "2026-09-01",
        "duration": "One to three months",
        "occupants": "2",
        "preferredLocation": "Marietta, OH",
        "homeSize": "Studio or one-bedroom",
        "stayType": "Work or relocation",
        "pets": "No pets",
        "message": "A short inquiry.",
        "screeningConsent": "",
        "termsAccepted": "yes",
        "sourceUrl": "https://stay.mtcottages.com/?property=frederick#form",
        "cf-turnstile-response": "turnstile-token",
    }


class QueueOut:
    """Stands in for func.Out[str]: records what the handler queued."""

    def __init__(self):
        self.messages = []

    def set(self, value):
        self.messages.append(value)


def _apply(request, queue=None, notify=None):
    return function_app.apply(
        request,
        queue if queue is not None else QueueOut(),
        notify if notify is not None else QueueOut(),
    )


def _form_request(payload, **kwargs):
    body = urllib.parse.urlencode(payload).encode("utf-8")
    headers = {"Content-Type": "application/x-www-form-urlencoded", "Origin": "https://stay.mtcottages.com"}
    headers.update(kwargs.pop("headers", {}))
    return Request(body, headers=headers, **kwargs)


def test_source_url_is_origin_and_path_only():
    assert function_app._privacy_safe_source_url(
        "https://stay.mtcottages.com/apply?property=frederick#form"
    ) == "https://stay.mtcottages.com/apply"
    assert function_app._privacy_safe_source_url("https://stay.mtcottages.com/") == "https://stay.mtcottages.com/"


def test_source_url_rejects_untrusted_origins(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://stay.mtcottages.com")
    assert function_app._privacy_safe_source_url("https://evil.example/inquiry") == ""


def test_noncanonical_hosts_cannot_render_or_submit(monkeypatch):
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site-key")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret-key")
    get_response = function_app.application_form(
        Request(method="GET", url="https://apply.mtcottages.com/", headers={"Host": "apply.mtcottages.com"})
    )
    assert get_response.status_code == 404
    assert "data-application-form" not in get_response.body

    post_response = _apply(
        _form_request({}, headers={"Host": "unexpected.example", "Origin": ""})
    )
    assert post_response.status_code == 404
    assert json.loads(post_response.body) == {"success": False, "message": "Not found"}


def test_configured_origins_and_hostnames_reject_unsafe_values(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://stay.mtcottages.com,*,https://evil.example/path")
    monkeypatch.setenv("TURNSTILE_ALLOWED_HOSTNAMES", "stay.mtcottages.com,*.evil.example,https://bad.example")
    assert function_app._allowed_origins() == {"https://stay.mtcottages.com"}
    assert function_app._turnstile_hostnames() == {"stay.mtcottages.com"}


def test_client_ip_uses_valid_bounded_front_door_compatible_values():
    request = Request(headers={"X-Forwarded-For": "198.51.100.20, 203.0.113.9"})
    assert function_app._client_ip(request) == "203.0.113.9"
    request.headers["X-Azure-ClientIP"] = "192.0.2.7"
    assert function_app._client_ip(request) == "192.0.2.7"
    request.headers["X-Azure-ClientIP"] = "not-an-ip"
    assert function_app._client_ip(request) == "203.0.113.9"


def test_submission_validation_enforces_choices_dates_and_occupants():
    payload = _valid_payload()
    payload["duration"] = "custom"
    assert function_app._validate_submission(payload) == "Please choose a valid option"
    payload = _valid_payload()
    payload["moveInDate"] = "2101-01-01"
    assert function_app._validate_submission(payload) == "Please provide a valid move-in date"
    payload = _valid_payload()
    payload["occupants"] = "21"
    assert function_app._validate_submission(payload) == "Please provide a valid occupant count"
    payload = _valid_payload()
    payload["firstName"] = "A" * (function_app.FIELD_LIMITS["firstName"] + 1)
    assert function_app._validate_submission(payload) == "One or more fields are too long"


FORM_HTML = (FUNCTION_PATH.parent / "index.html").read_text(encoding="utf-8")


def test_form_offers_only_towns_with_a_listed_home_and_still_accepts_older_towns():
    select = re.search(r'<select name="preferredLocation"[^>]*>(.*?)</select>', FORM_HTML, re.S)
    assert select, "the form lost its preferredLocation select"
    options = re.findall(r"<option[^>]*>([^<]*)</option>", select.group(1))
    assert options == ["Preferred community", "Marietta, OH", "Parkersburg, WV", "Ravenswood, WV", "Open to options"]
    # A form a guest opened before #71 can still send its older town values.
    for town in ("Grantsville, WV", "Racine, OH", "Athens, OH", "Open to options"):
        payload = _valid_payload()
        payload["preferredLocation"] = town
        assert function_app._validate_submission(payload) is None, town


def test_form_property_links_are_live_canonical_home_urls():
    block = re.search(r"const properties = \{(.*?)\n    \};", FORM_HTML, re.S)
    assert block, "the form lost its property map"
    rows = re.findall(r'(\w+): \{ name: "[^"]+", path: "([^"]+)", town: "([a-z]+)" \}', block.group(1))
    entries = {home: path for home, path, _town in rows}
    towns = {home: town for home, _path, town in rows}
    # Parked homes (CEO decision 2026-11-14) are not offered, and every link is a microsite root.
    assert set(entries) == {"frederick", "broad", "buck", "oak", "virginia", "henrietta"}
    for home, path in entries.items():
        assert re.fullmatch(r"[a-z]+/[a-z-]+/", path), f"{home} links to {path}, not a microsite root"
        # The home's town pre-selects the preferred community, so it must be the town in its path.
        assert path.split("/")[0] == towns[home], f"{home} is in {towns[home]} but links to {path}"
    assert entries["frederick"] == "marietta/frederick/"


def test_oversized_turnstile_token_is_rejected_before_network(monkeypatch):
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site-key")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret-key")
    monkeypatch.setenv("TURNSTILE_ALLOWED_HOSTNAMES", "stay.mtcottages.com")
    monkeypatch.setattr(function_app.urllib.request, "urlopen", lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("network call")))
    request = Request()
    result = function_app._verify_turnstile(
        request,
        {"cf-turnstile-response": "x" * (function_app.MAX_TURNSTILE_TOKEN_LENGTH + 1)},
    )
    assert result == (400, "Please complete the human verification", "token-too-long")


# ---------------------------------------------------------------------------
# Which stage refused an inquiry (#85)
# ---------------------------------------------------------------------------

class SiteverifyAnswer:
    def __init__(self, result):
        self._body = json.dumps(result).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, *_args):
        return self._body


@pytest.fixture
def siteverify(monkeypatch):
    """A configured Turnstile whose siteverify answer each test chooses; Logic App calls are recorded."""
    function_app._last_submission.clear()
    function_app._accepted_submissions.clear()
    for name in NOTIFY_SETTINGS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "0x4AAAAAAAsite-key")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "0x4AAAAAAAsecret-key")
    monkeypatch.setenv("TURNSTILE_ALLOWED_HOSTNAMES", "stay.mtcottages.com")
    monkeypatch.setenv("TURNSTILE_EXPECTED_ACTION", "stay-inquiry")
    monkeypatch.setenv("LOGICAPP_URL_APPLICATION", "https://logic.example.test/callback")
    state = SimpleNamespace(
        result={"success": True, "hostname": "stay.mtcottages.com", "action": "stay-inquiry"},
        verify_calls=[],
        intake_calls=[],
    )

    def urlopen(request, timeout):
        del timeout
        if request.full_url == function_app.TURNSTILE_VERIFY_URL:
            state.verify_calls.append(urllib.parse.parse_qs(request.data.decode("utf-8")))
            return SiteverifyAnswer(state.result)
        state.intake_calls.append(request)
        return CallbackResponse()

    monkeypatch.setattr(function_app.urllib.request, "urlopen", urlopen)
    return state


def _rejection(response):
    body = json.loads(response.body)
    assert body["success"] is False
    return response.status_code, body


def test_a_verified_token_with_an_incomplete_inquiry_stops_at_validation(siteverify):
    """The live smoke's proof (#85): Turnstile passed, nothing reached the Logic App."""
    response = _apply(_form_request({"cf-turnstile-response": "real-browser-token"}))
    status, body = _rejection(response)
    assert status == 400
    assert body == {"success": False, "message": "Please complete the required fields", "stage": "validation"}
    assert len(siteverify.verify_calls) == 1
    assert siteverify.intake_calls == []


@pytest.mark.parametrize(
    ("result", "reason"),
    [
        ({"success": False, "error-codes": ["invalid-input-response"]}, "rejected:invalid-input-response"),
        ({"success": False, "error-codes": ["timeout-or-duplicate"]}, "rejected:timeout-or-duplicate"),
        ({"success": False, "error-codes": ["<script>", 7]}, "rejected:none"),
        ({"success": False}, "rejected:none"),
        ({"success": True, "hostname": "evil.example", "action": "stay-inquiry"}, "hostname-mismatch"),
        ({"success": True, "hostname": "stay.mtcottages.com", "action": "other"}, "action-mismatch"),
    ],
)
def test_a_turnstile_refusal_names_its_reason_and_never_delivers(siteverify, result, reason, caplog):
    siteverify.result = result
    with caplog.at_level("WARNING"):
        response = _apply(_form_request(_valid_payload()))
    status, body = _rejection(response)
    assert status == 400
    assert body == {
        "success": False,
        "message": "Please complete the human verification",
        "stage": "verification",
        "reason": reason,
    }
    assert siteverify.intake_calls == []
    assert "Ada" not in caplog.text and "ada@example.com" not in caplog.text
    assert "<script>" not in caplog.text


def test_a_missing_token_is_refused_before_the_fields_without_calling_cloudflare(siteverify):
    payload = _valid_payload()
    payload.pop("cf-turnstile-response")
    status, body = _rejection(_apply(_form_request(payload)))
    assert status == 400
    assert (body["stage"], body["reason"]) == ("verification", "missing-token")
    assert siteverify.verify_calls == []


def test_the_honeypot_is_screened_before_any_siteverify_call(siteverify):
    status, body = _rejection(_apply(_form_request({"website": "ci-probe", "cf-turnstile-response": "t"})))
    assert status == 400
    assert body == {"success": False, "message": "Invalid submission", "stage": "screening"}
    assert siteverify.verify_calls == []


def test_a_validation_refusal_is_logged_with_its_fixed_message_only(siteverify, caplog):
    payload = _valid_payload()
    payload["phone"] = "call me maybe"
    with caplog.at_level("WARNING"):
        status, body = _rejection(_apply(_form_request(payload)))
    assert status == 400
    assert body["stage"] == "validation"
    assert "Inquiry rejected at validation: Please provide a valid phone number" in caplog.text
    assert "call me maybe" not in caplog.text


def test_a_verified_complete_inquiry_is_delivered(siteverify):
    response = _apply(_form_request(_valid_payload(), headers=_request_from("192.0.2.40")))
    assert response.status_code == 200
    assert len(siteverify.intake_calls) == 1
    sent = siteverify.verify_calls[0]
    assert sent["response"] == ["turnstile-token"]
    assert sent["remoteip"] == ["192.0.2.40"]


# Cloudflare's siteverify answer for its always-pass test secret (CI synthetic submission, #85).
TESTING_KEY_RESULT = {"success": True, "hostname": "example.com", "metadata": {"result_with_testing_key": True}}


def test_a_testing_key_token_is_refused_unless_test_keys_are_accepted(siteverify, monkeypatch):
    """The live host never sets the switch, so a test-key token can never pass there."""
    monkeypatch.delenv("TURNSTILE_ACCEPT_TEST_KEYS", raising=False)
    monkeypatch.setenv("TURNSTILE_ALLOWED_HOSTNAMES", "stay.mtcottages.com,example.com")
    siteverify.result = TESTING_KEY_RESULT
    status, body = _rejection(_apply(_form_request(_valid_payload())))
    assert status == 400
    assert (body["stage"], body["reason"]) == ("verification", "testing-key")
    assert siteverify.intake_calls == []


def test_the_synthetic_host_delivers_a_testing_key_token_through_the_same_checks(siteverify, monkeypatch):
    monkeypatch.setenv("TURNSTILE_ACCEPT_TEST_KEYS", "true")
    monkeypatch.setenv("TURNSTILE_ALLOWED_HOSTNAMES", "example.com")
    siteverify.result = TESTING_KEY_RESULT
    response = _apply(_form_request(_valid_payload()))
    assert response.status_code == 200
    assert len(siteverify.intake_calls) == 1


@pytest.mark.parametrize(
    ("result", "reason"),
    [
        ({**TESTING_KEY_RESULT, "hostname": "evil.example"}, "hostname-mismatch"),
        ({**TESTING_KEY_RESULT, "action": "other"}, "action-mismatch"),
        ({"success": True, "hostname": "example.com"}, "action-mismatch"),
    ],
)
def test_accepting_test_keys_keeps_the_hostname_and_action_checks(siteverify, monkeypatch, result, reason):
    monkeypatch.setenv("TURNSTILE_ACCEPT_TEST_KEYS", "true")
    monkeypatch.setenv("TURNSTILE_ALLOWED_HOSTNAMES", "example.com")
    siteverify.result = result
    status, body = _rejection(_apply(_form_request(_valid_payload())))
    assert (status, body["reason"]) == (400, reason)
    assert siteverify.intake_calls == []


def test_form_csp_has_nonce_and_turnstile_sources(monkeypatch):
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site-key")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret-key")
    response = function_app.application_form(Request(method="GET", url="https://stay.mtcottages.com/"))
    csp = response.headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in csp
    assert "script-src 'self' https://challenges.cloudflare.com 'nonce-" in csp
    assert "connect-src 'self' https://challenges.cloudflare.com" in csp
    assert "frame-src 'self' https://challenges.cloudflare.com" in csp
    assert "'unsafe-inline'" not in csp
    nonce = re.search(r'<script nonce="([^"]+)"', response.body).group(1)
    assert f"'nonce-{nonce}'" in csp
    assert "https://challenges.cloudflare.com/turnstile/v0/api.js" in response.body


def test_missing_site_key_fails_closed_without_fallback_ui(monkeypatch):
    monkeypatch.delenv("TURNSTILE_SITE_KEY", raising=False)
    response = function_app.application_form(Request(method="GET", url="https://stay.mtcottages.com/"))
    assert response.status_code == 503
    assert "Human verification is being prepared" not in response.body
    assert "stay@mtcottages.com" not in response.body


def test_missing_site_key_rejects_turnstile_verification_before_network(monkeypatch):
    monkeypatch.delenv("TURNSTILE_SITE_KEY", raising=False)
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret-key")
    monkeypatch.setattr(function_app.urllib.request, "urlopen", lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("network call")))
    result = function_app._verify_turnstile(Request(), {"cf-turnstile-response": "turnstile-token"})
    assert result == (503, "Human verification is not configured", "not-configured")


def test_missing_secret_key_fails_closed_without_rendering_form(monkeypatch):
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site-key")
    monkeypatch.delenv("TURNSTILE_SECRET_KEY", raising=False)
    response = function_app.application_form(Request(method="GET", url="https://stay.mtcottages.com/"))
    assert response.status_code == 503
    assert 'class="cf-turnstile"' not in response.body
    assert "stay@mtcottages.com" not in response.body


def test_health_endpoint_retains_contract_and_security_headers():
    response = function_app.health(
        Request(method="GET", url="https://stay.mtcottages.com/api/health", headers={"Origin": "https://stay.mtcottages.com"})
    )
    assert response.status_code == 200
    assert json.loads(response.body) == {
        "status": "ok",
        "service": "mtcottages-apply-proxy",
        "commit": function_app.BUILD_COMMIT,
    }
    assert response.headers["Access-Control-Allow-Origin"] == "https://stay.mtcottages.com"
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]


def test_health_reports_the_packaged_commit(monkeypatch):
    commit = "0123456789abcdef0123456789abcdef01234567"
    monkeypatch.setattr(function_app, "BUILD_COMMIT", commit)
    response = function_app.health(Request(method="GET", url="https://stay.mtcottages.com/api/health"))
    assert json.loads(response.body)["commit"] == commit


def test_build_commit_reads_only_a_full_sha_from_the_package(monkeypatch, tmp_path):
    monkeypatch.setattr(function_app, "__file__", str(tmp_path / "function_app.py"))
    assert function_app._build_commit() == "unknown"

    marker = tmp_path / "BUILD_COMMIT"
    commit = "0123456789abcdef0123456789abcdef01234567"
    marker.write_text(f"{commit}\n", encoding="utf-8")
    assert function_app._build_commit() == commit

    for invalid in ("", "0123456", "not-a-commit", f"{commit}\nextra", "<script>alert(1)</script>"):
        marker.write_text(invalid, encoding="utf-8")
        assert function_app._build_commit() == "unknown"

    marker.write_bytes(b"\xff\xfe\x00")
    assert function_app._build_commit() == "unknown"


def test_front_door_probe_gets_health_on_the_origin_host_but_nothing_else(monkeypatch):
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site-key")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret-key")
    origin_host = "mtcottages-apply-proxy.azurewebsites.net"
    probe = function_app.application_form(
        Request(method="GET", url=f"https://{origin_host}/api/health", headers={"Host": origin_host})
    )
    assert probe.status_code == 200
    assert json.loads(probe.body) == {
        "status": "ok",
        "service": "mtcottages-apply-proxy",
        "commit": function_app.BUILD_COMMIT,
    }

    for path in ("/", "/apply", "/other/health"):
        other = function_app.application_form(
            Request(method="GET", url=f"https://{origin_host}{path}", headers={"Host": origin_host})
        )
        assert other.status_code == 404
        assert "data-application-form" not in other.body


def test_malformed_probe_is_not_rate_limited_and_valid_repeat_gets_retry_after(monkeypatch):
    function_app._last_submission.clear()
    bot_response = _apply(_form_request({"website": "ci-probe"}))
    assert bot_response.status_code == 400
    assert not function_app._last_submission

    monkeypatch.setenv("LOGICAPP_URL_APPLICATION", "https://logic.example.test/callback")
    monkeypatch.setattr(function_app, "_verify_turnstile", lambda _req, _payload: None)

    class CallbackResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self, *_args):
            return b'{"success": true, "message": "Application received"}'

    callback_payload = {}

    def callback(_request, timeout):
        del timeout
        callback_payload.update(json.loads(_request.data.decode("utf-8")))
        return CallbackResponse()

    monkeypatch.setattr(function_app.urllib.request, "urlopen", callback)
    request_headers = {"X-Azure-ClientIP": "192.0.2.15"}
    first = _apply(_form_request(_valid_payload(), headers=request_headers))
    second = _apply(_form_request(_valid_payload(), headers=request_headers))
    assert first.status_code == 200
    assert second.status_code == 429
    assert int(second.headers["Retry-After"]) >= 1
    assert callback_payload["sourceUrl"] == "https://stay.mtcottages.com/"


# ---------------------------------------------------------------------------
# Durable, idempotent intake (WorldEnterpriseGroup/mtcottages#15)
# ---------------------------------------------------------------------------

SUBMISSION_ID = "3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f"


class CallbackResponse:
    def __init__(self, status=200, body=b'{"success": true, "message": "Mt Cottages application accepted"}'):
        self.status = status
        self._body = body

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, *_args):
        return self._body


@pytest.fixture
def intake(monkeypatch):
    """A configured proxy whose Logic App answer each test chooses."""
    function_app._last_submission.clear()
    function_app._accepted_submissions.clear()
    monkeypatch.setenv("LOGICAPP_URL_APPLICATION", "https://logic.example.test/callback")
    monkeypatch.setenv("RATE_LIMIT_WINDOW_SECONDS", "1")
    monkeypatch.setattr(function_app, "_verify_turnstile", lambda _req, _payload: None)
    for name in NOTIFY_SETTINGS:
        monkeypatch.delenv(name, raising=False)
    state = SimpleNamespace(calls=[], answer=lambda: CallbackResponse())

    def urlopen(request, timeout):
        state.calls.append({
            "payload": json.loads(request.data.decode("utf-8")),
            "headers": dict(request.header_items()),
            "timeout": timeout,
        })
        result = state.answer()
        if isinstance(result, BaseException):
            raise result
        return result

    monkeypatch.setattr(function_app.urllib.request, "urlopen", urlopen)
    return state


def _payload_with_id(submission_id=SUBMISSION_ID):
    payload = _valid_payload()
    payload["submissionId"] = submission_id
    return payload


def _request_from(ip):
    return {"X-Azure-ClientIP": ip}


def test_delivered_inquiry_forwards_the_idempotency_key(intake):
    queue = QueueOut()
    response = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.30")), queue)
    assert response.status_code == 200
    assert json.loads(response.body)["success"] is True
    assert queue.messages == []
    call = intake.calls[0]
    assert call["payload"]["submissionId"] == SUBMISSION_ID
    assert call["headers"]["Idempotency-key"] == SUBMISSION_ID
    assert call["headers"]["X-ms-client-tracking-id"] == SUBMISSION_ID
    assert call["timeout"] == function_app.DEFAULT_LOGICAPP_TIMEOUT_SECONDS


def test_duplicate_submission_is_answered_without_a_second_lead(intake):
    first = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.31")))
    # Same inquiry retried from another address: no rate limit, no second call.
    second = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.32")))
    assert first.status_code == 200
    assert second.status_code == 200
    assert json.loads(second.body)["success"] is True
    assert len(intake.calls) == 1


def test_distinct_submissions_each_reach_intake(intake):
    _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.33")))
    _apply(_form_request(
        _payload_with_id("9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d"), headers=_request_from("192.0.2.34")
    ))
    assert len(intake.calls) == 2


def test_missing_submission_id_gets_a_server_generated_key(intake):
    _apply(_form_request(_valid_payload(), headers=_request_from("192.0.2.35")))
    generated = intake.calls[0]["payload"]["submissionId"]
    assert function_app.SUBMISSION_ID_PATTERN.fullmatch(generated)


def test_malformed_submission_id_is_rejected_before_intake(intake):
    response = _apply(_form_request(_payload_with_id("not-a-uuid"), headers=_request_from("192.0.2.36")))
    assert response.status_code == 400
    assert intake.calls == []


@pytest.mark.parametrize(
    ("failure", "reason"),
    [
        (TimeoutError("timed out"), "timeout"),
        (urllib.error.URLError(TimeoutError("timed out")), "timeout"),
        (urllib.error.URLError(ConnectionRefusedError("refused")), "connection-error"),
        (ConnectionResetError("reset"), "ConnectionResetError"),
    ],
)
def test_timeout_or_connection_failure_queues_the_lead(intake, failure, reason):
    intake.answer = lambda: failure
    queue = QueueOut()
    response = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.40")), queue)
    assert response.status_code == 202
    assert json.loads(response.body)["success"] is True
    assert len(queue.messages) == 1
    envelope = json.loads(queue.messages[0])
    assert envelope["version"] == function_app.INTAKE_ENVELOPE_VERSION
    assert envelope["submissionId"] == SUBMISSION_ID
    assert envelope["reason"] == reason
    assert envelope["payload"]["email"] == "ada@example.com"
    assert envelope["payload"]["submissionId"] == SUBMISSION_ID
    assert "cf-turnstile-response" not in envelope["payload"]


@pytest.mark.parametrize("status", [400, 401, 404, 429, 500, 502, 503])
def test_any_non_success_answer_queues_the_lead(intake, status):
    def answer():
        return urllib.error.HTTPError(
            "https://logic.example.test/callback", status, "error", {}, io.BytesIO(b'{"success": false}')
        )

    intake.answer = answer
    queue = QueueOut()
    response = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.41")), queue)
    assert response.status_code == 202
    assert json.loads(queue.messages[0])["reason"] == f"http-{status}"


def test_queued_lead_is_not_remembered_so_a_failed_queue_write_can_be_retried(intake):
    intake.answer = lambda: TimeoutError("timed out")
    _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.42")))
    intake.answer = lambda: CallbackResponse()
    retry = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.43")))
    assert retry.status_code == 200
    assert len(intake.calls) == 2


def test_logicapp_timeout_is_configurable_and_bounded(monkeypatch):
    monkeypatch.setenv("LOGICAPP_TIMEOUT_SECONDS", "40")
    assert function_app._logicapp_timeout() == 40
    for invalid in ("1", "500", "nan", "soon"):
        monkeypatch.setenv("LOGICAPP_TIMEOUT_SECONDS", invalid)
        assert function_app._logicapp_timeout() == function_app.DEFAULT_LOGICAPP_TIMEOUT_SECONDS


class QueueMessage:
    def __init__(self, body, dequeue_count=1):
        self._body = body if isinstance(body, bytes) else body.encode("utf-8")
        self.dequeue_count = dequeue_count

    def get_body(self):
        return self._body


def _queued_envelope():
    return function_app._retry_envelope(
        SUBMISSION_ID, {**_valid_payload(), "submissionId": SUBMISSION_ID}, "timeout"
    )


def test_redelivery_succeeds_and_keeps_the_key(intake):
    function_app.redeliver_intake(QueueMessage(_queued_envelope(), dequeue_count=2))
    assert intake.calls[0]["payload"]["submissionId"] == SUBMISSION_ID
    assert intake.calls[0]["headers"]["Idempotency-key"] == SUBMISSION_ID


def test_redelivery_failure_raises_so_the_runtime_retries_then_poisons(intake):
    intake.answer = lambda: TimeoutError("timed out")
    with pytest.raises(RuntimeError, match="timeout"):
        function_app.redeliver_intake(QueueMessage(_queued_envelope()))


def test_redelivery_without_configuration_keeps_the_message(intake, monkeypatch):
    monkeypatch.delenv("LOGICAPP_URL_APPLICATION")
    with pytest.raises(RuntimeError, match="not configured"):
        function_app.redeliver_intake(QueueMessage(_queued_envelope()))
    assert intake.calls == []


@pytest.mark.parametrize("body", [b"\xff", b"not json", b'{"version": 99, "payload": {}}', b'{"version": 1}'])
def test_redelivery_rejects_malformed_messages(intake, body):
    with pytest.raises(ValueError):
        function_app.redeliver_intake(QueueMessage(body))
    assert intake.calls == []


def test_retry_policy_is_bounded_in_host_json():
    host = json.loads((FUNCTION_PATH.parent / "host.json").read_text(encoding="utf-8"))
    queues = host["extensions"]["queues"]
    assert 3 <= queues["maxDequeueCount"] <= 10
    assert queues["batchSize"] == 1


def test_queue_polling_keeps_the_one_minute_staff_alert():
    # The SOP promises contact within 1 minute (#14): the idle queue poll has
    # to leave room for the send itself.
    host = json.loads((FUNCTION_PATH.parent / "host.json").read_text(encoding="utf-8"))
    hours, minutes, seconds = (int(part) for part in host["extensions"]["queues"]["maxPollingInterval"].split(":"))
    assert hours * 3600 + minutes * 60 + seconds <= 15


def test_every_app_module_is_packaged():
    ci = (FUNCTION_PATH.parents[3] / ".gitlab-ci.yml").read_text(encoding="utf-8")
    package_line = next(line for line in ci.splitlines() if "zipfile -c" in line)
    for module in sorted(FUNCTION_PATH.parent.glob("*.py")):
        assert module.name in package_line.split(), f"{module.name} is missing from package:apply-proxy"


# ---------------------------------------------------------------------------
# Staff alert, Teams card and guest acknowledgment (#14)
# ---------------------------------------------------------------------------

NOTIFY_SETTINGS = (
    "ACS_EMAIL_ENDPOINT", "NOTIFY_SENDER_ADDRESS", "NOTIFY_REPLY_TO", "STAFF_ALERT_RECIPIENTS",
    "TEAMS_INTAKE_WEBHOOK_URL", "GUEST_AUTOREPLY_ENABLED", "GUEST_RESPONSE_PROMISE",
)


@pytest.fixture
def notifications(monkeypatch):
    monkeypatch.setenv("ACS_EMAIL_ENDPOINT", "https://mtc-mail.communication.azure.com")
    monkeypatch.setenv("NOTIFY_SENDER_ADDRESS", "stay@mtcottages.com")
    monkeypatch.setenv("STAFF_ALERT_RECIPIENTS", "stay@mtcottages.com")
    monkeypatch.setenv("TEAMS_INTAKE_WEBHOOK_URL", "https://teams.example.test/workflows/hook?sig=secret")
    monkeypatch.setenv("GUEST_AUTOREPLY_ENABLED", "true")


def test_delivered_inquiry_queues_one_notification_per_channel(intake, notifications):
    notify = QueueOut()
    response = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.50")), notify=notify)
    assert response.status_code == 200
    assert len(notify.messages) == 1
    envelopes = [json.loads(message) for message in notify.messages[0]]
    assert [envelope["channel"] for envelope in envelopes] == ["staff-email", "teams", "guest-email"]
    assert {envelope["submissionId"] for envelope in envelopes} == {SUBMISSION_ID}
    assert {envelope["delivery"] for envelope in envelopes} == {"delivered"}
    assert all("cf-turnstile-response" not in envelope["lead"] for envelope in envelopes)


def test_queued_inquiry_still_alerts_staff_at_once(intake, notifications):
    intake.answer = lambda: TimeoutError("timed out")
    notify = QueueOut()
    response = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.51")), notify=notify)
    assert response.status_code == 202
    assert {json.loads(message)["delivery"] for message in notify.messages[0]} == {"queued"}


def test_duplicate_and_rejected_submissions_notify_nobody(intake, notifications):
    first, second, bot = QueueOut(), QueueOut(), QueueOut()
    _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.52")), notify=first)
    _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.53")), notify=second)
    _apply(_form_request({"website": "ci-probe"}), notify=bot)
    assert len(first.messages) == 1
    assert second.messages == []
    assert bot.messages == []


def test_unconfigured_channels_are_not_queued(intake):
    notify = QueueOut()
    response = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.54")), notify=notify)
    assert response.status_code == 200
    assert notify.messages == []


def _notify_message(channel, dequeue_count=1):
    envelope = json.loads(function_app.intake_notify.notification_envelopes(
        SUBMISSION_ID, {**_valid_payload(), "submissionId": SUBMISSION_ID}, "delivered"
    )[["staff-email", "teams", "guest-email"].index(channel)])
    return QueueMessage(json.dumps(envelope), dequeue_count=dequeue_count)


@pytest.fixture
def managed_identity(monkeypatch):
    monkeypatch.setenv("IDENTITY_ENDPOINT", "http://127.0.0.1:41000/msi/token")
    monkeypatch.setenv("IDENTITY_HEADER", "identity-header")
    function_app.managed_identity.reset_cache()


@pytest.fixture
def outbound(monkeypatch):
    """Records notification HTTP calls; the managed identity answers with a token."""
    state = SimpleNamespace(calls=[], identity_resources=[], answer=lambda: CallbackResponse(status=202, body=b"{}"))
    function_app.intake_notify.reset_token_cache()

    def urlopen(request, timeout):
        if "/msi/token" in request.full_url:
            query = urllib.parse.parse_qs(urllib.parse.urlsplit(request.full_url).query)
            state.identity_resources.extend(query.get("resource", []))
            return CallbackResponse(body=json.dumps({"access_token": "token-value", "expires_on": "4102444800"}).encode())
        content_type = dict(request.header_items()).get("Content-type", "")
        text = request.data.decode("utf-8")
        state.calls.append({
            "url": request.full_url,
            "headers": dict(request.header_items()),
            "body": dict(urllib.parse.parse_qsl(text)) if "form-urlencoded" in content_type else json.loads(text),
            "timeout": timeout,
        })
        result = state.answer()
        if isinstance(result, BaseException):
            raise result
        return result

    monkeypatch.setattr(function_app.intake_notify.urllib.request, "urlopen", urlopen)
    return state


def test_staff_email_goes_through_acs_with_the_guest_as_reply_to(notifications, managed_identity, outbound):
    function_app.send_intake_notification(_notify_message("staff-email"))
    call = outbound.calls[0]
    assert call["url"] == "https://mtc-mail.communication.azure.com/emails:send?api-version=2023-03-31"
    assert call["headers"]["Authorization"] == "Bearer token-value"
    assert call["headers"]["Repeatability-request-id"]
    assert call["headers"]["Repeatability-first-sent"].endswith("GMT")
    body = call["body"]
    assert body["senderAddress"] == "stay@mtcottages.com"
    assert body["recipients"]["to"] == [{"address": "stay@mtcottages.com"}]
    assert body["replyTo"] == [{"address": "ada@example.com"}]
    assert body["content"]["subject"].startswith("New stay inquiry: Ada Lovelace")
    assert "555-555-1212" in body["content"]["plainText"]
    assert body["userEngagementTrackingDisabled"] is True


GRAPH_TENANT = "00000000-0000-4000-8000-0000000000aa"
GRAPH_CLIENT = "00000000-0000-4000-8000-0000000000bb"


@pytest.fixture
def graph_mail(monkeypatch):
    """Graph sendMail from the owner's mailbox (#93); the token endpoint answers first, then Graph."""
    monkeypatch.setenv("GRAPH_MAIL_TENANT_ID", GRAPH_TENANT)
    monkeypatch.setenv("GRAPH_MAIL_CLIENT_ID", GRAPH_CLIENT)
    monkeypatch.setenv("GRAPH_MAIL_SENDER", "owner@mailbox.example.com")
    monkeypatch.setenv("STAFF_ALERT_RECIPIENTS", "stay@mtcottages.com")


def _graph_answers(outbound, *answers):
    pending = iter(answers)
    outbound.answer = lambda: next(pending)


def _token_answer(token="graph-token", expires_in=3599):
    return CallbackResponse(status=200, body=json.dumps({"access_token": token, "expires_in": expires_in}).encode())


def test_staff_email_goes_through_graph_from_the_owner_mailbox(notifications, graph_mail, managed_identity, outbound):
    _graph_answers(outbound, _token_answer(), CallbackResponse(status=202, body=b""))
    function_app.send_intake_notification(_notify_message("staff-email"))
    token_call, send_call = outbound.calls
    # The managed identity's token is the app's federated credential: no secret anywhere.
    assert outbound.identity_resources == ["api://AzureADTokenExchange"]
    assert token_call["url"] == f"https://login.microsoftonline.com/{GRAPH_TENANT}/oauth2/v2.0/token"
    assert token_call["body"] == {
        "client_id": GRAPH_CLIENT,
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials",
        "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        "client_assertion": "token-value",
    }
    assert send_call["url"] == "https://graph.microsoft.com/v1.0/users/owner@mailbox.example.com/sendMail"
    assert send_call["headers"]["Authorization"] == "Bearer graph-token"
    message = send_call["body"]["message"]
    assert message["toRecipients"] == [{"emailAddress": {"address": "stay@mtcottages.com"}}]
    assert message["replyTo"] == [{"emailAddress": {"address": "ada@example.com"}}]
    assert message["subject"].startswith("New stay inquiry: Ada Lovelace")
    assert message["body"]["contentType"] == "HTML" and "555-555-1212" in message["body"]["content"]
    assert message["internetMessageHeaders"] == [{"name": "X-MtC-Submission-Id", "value": SUBMISSION_ID}]
    assert send_call["body"]["saveToSentItems"] is False


def test_graph_alone_is_enough_to_queue_the_staff_alert(graph_mail):
    assert function_app.intake_notify.configured_channels() == ["staff-email"]
    assert function_app.intake_notify.channel_summary() == {"staff-email": "graph", "teams": "off", "guest-email": "off"}


def test_the_graph_token_is_reused_until_it_nears_expiry(graph_mail, managed_identity, outbound):
    _graph_answers(
        outbound, _token_answer(), CallbackResponse(status=202, body=b""), CallbackResponse(status=202, body=b"")
    )
    function_app.send_intake_notification(_notify_message("staff-email"))
    function_app.send_intake_notification(_notify_message("staff-email"))
    assert [call["url"].rsplit("/", 1)[-1] for call in outbound.calls] == ["token", "sendMail", "sendMail"]


def test_a_refused_graph_token_is_retried_and_logs_only_the_error_label(graph_mail, managed_identity, outbound):
    refusal = urllib.error.HTTPError(
        "u", 401, "Unauthorized", {},
        io.BytesIO(b'{"error": "invalid_client", "error_description": "AADSTS700213: subject sig=private"}'),
    )
    _graph_answers(outbound, refusal)
    with pytest.raises(RuntimeError) as raised:
        function_app.send_intake_notification(_notify_message("staff-email"))
    assert "Graph token answered HTTP 401 invalid_client" in str(raised.value)
    assert "AADSTS" not in str(raised.value) and "private" not in str(raised.value)
    assert len(outbound.calls) == 1


def test_a_graph_send_failure_is_retried(graph_mail, managed_identity, outbound):
    _graph_answers(outbound, _token_answer(), urllib.error.HTTPError("u", 503, "Unavailable", {}, io.BytesIO(b"")))
    with pytest.raises(RuntimeError, match="Graph sendMail answered HTTP 503"):
        function_app.send_intake_notification(_notify_message("staff-email"))


def test_graph_without_a_managed_identity_is_a_config_error(graph_mail, outbound, monkeypatch):
    monkeypatch.delenv("IDENTITY_ENDPOINT", raising=False)
    function_app.managed_identity.reset_cache()
    with pytest.raises(RuntimeError, match="managed identity is not available"):
        function_app.send_intake_notification(_notify_message("staff-email"))
    assert outbound.calls == []


@pytest.mark.parametrize(
    ("setting", "value", "transport"),
    [
        ("GRAPH_MAIL_API_ENDPOINT", "http://127.0.0.1:7071/__graph", "graph"),
        ("GRAPH_MAIL_LOGIN_ENDPOINT", "http://localhost:7071/__login", "graph"),
        ("GRAPH_MAIL_API_ENDPOINT", "https://graph.example.com", ""),
        ("GRAPH_MAIL_LOGIN_ENDPOINT", "http://login.example.com", ""),
        ("GRAPH_MAIL_LOGIN_ENDPOINT", "http://user:pass@127.0.0.1:7071", ""),
        ("GRAPH_MAIL_TENANT_ID", "taomgt.onmicrosoft.com", ""),
        ("GRAPH_MAIL_SENDER", "not an address", ""),
    ],
)
def test_graph_endpoints_are_the_real_ones_or_loopback_only(graph_mail, monkeypatch, setting, value, transport):
    monkeypatch.setenv(setting, value)
    assert function_app.intake_notify.staff_transport() == transport


def test_retried_email_reuses_its_repeatability_id(notifications, managed_identity, outbound):
    message = _notify_message("guest-email")
    function_app.send_intake_notification(message)
    function_app.send_intake_notification(message)
    first, second = outbound.calls
    assert first["headers"]["Repeatability-request-id"] == second["headers"]["Repeatability-request-id"]
    assert first["headers"]["Repeatability-first-sent"] == second["headers"]["Repeatability-first-sent"]


def test_guest_acknowledgment_is_branded_and_keeps_the_promise(notifications, managed_identity, outbound, monkeypatch):
    monkeypatch.setenv("GUEST_RESPONSE_PROMISE", "within 2 business hours")
    function_app.send_intake_notification(_notify_message("guest-email"))
    body = outbound.calls[0]["body"]
    assert body["recipients"]["to"] == [{"address": "ada@example.com"}]
    assert body["replyTo"] == [{"address": "stay@mtcottages.com"}]
    content = body["content"]
    assert content["subject"] == "We have your inquiry, Ada"
    text = content["plainText"]
    assert "within 2 business hours" in text
    assert "What happens next" in text
    # Brand voice (#11): calm, no hype, no exclamation marks.
    assert "!" not in text and "!" not in content["subject"]
    assert "luxury" not in text.lower()
    # Only what the guest needs; never their phone, message or other fields.
    assert "555-555-1212" not in text and "A short inquiry." not in text


def test_teams_card_is_posted_to_the_webhook(notifications, outbound):
    function_app.send_intake_notification(_notify_message("teams"))
    call = outbound.calls[0]
    assert call["url"] == "https://teams.example.test/workflows/hook?sig=secret"
    attachment = call["body"]["attachments"][0]
    assert attachment["contentType"] == "application/vnd.microsoft.card.adaptive"
    facts = {fact["title"]: fact["value"] for fact in attachment["content"]["body"][2]["facts"]}
    assert facts["Name"] == "Ada Lovelace"
    assert facts["Where"] == "Marietta, OH"


def test_failed_channel_raises_without_leaking_the_webhook(notifications, outbound):
    outbound.answer = lambda: urllib.error.HTTPError(
        "https://teams.example.test/workflows/hook?sig=secret", 502, "bad gateway", {}, io.BytesIO(b"")
    )
    with pytest.raises(RuntimeError) as raised:
        function_app.send_intake_notification(_notify_message("teams", dequeue_count=3))
    assert "teams" in str(raised.value) and "502" in str(raised.value) and "attempt 3" in str(raised.value)
    assert "sig=secret" not in str(raised.value)


def test_channel_whose_settings_disappeared_stays_queued(notifications, monkeypatch, outbound):
    message = _notify_message("teams")
    monkeypatch.delenv("TEAMS_INTAKE_WEBHOOK_URL")
    with pytest.raises(RuntimeError, match="TEAMS_INTAKE_WEBHOOK_URL"):
        function_app.send_intake_notification(message)
    assert outbound.calls == []


@pytest.mark.parametrize("body", [b"\xff", b"{}", b'{"version": 1, "channel": "fax", "submissionId": "x", "lead": {}}'])
def test_malformed_notification_is_rejected(body, outbound):
    with pytest.raises(ValueError):
        function_app.send_intake_notification(QueueMessage(body))
    assert outbound.calls == []


# ---------------------------------------------------------------------------
# Deep health (#16): GET /api/health?deep=1
# ---------------------------------------------------------------------------

STORAGE_KEY = "a2V5LWZvci10ZXN0cy1vbmx5"  # base64 of a dummy key, not a credential


@pytest.fixture
def deep(monkeypatch):
    """A configured host whose Logic App GET and queue metadata answers each test chooses."""
    function_app.deep_health.reset_cache()
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "0x4AAAAAAAsite-key")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "0x4AAAAAAAsecret-key")
    monkeypatch.setenv("LOGICAPP_URL_APPLICATION", "https://logic.example.test/callback?sig=secret")
    monkeypatch.setenv("STAFF_ALERT_RECIPIENTS", "stay@mtcottages.com")
    monkeypatch.setenv("GRAPH_MAIL_TENANT_ID", "00000000-0000-4000-8000-0000000000aa")
    monkeypatch.setenv("GRAPH_MAIL_CLIENT_ID", "00000000-0000-4000-8000-0000000000bb")
    monkeypatch.setenv("GRAPH_MAIL_SENDER", "owner@mailbox.example.com")
    monkeypatch.setenv(
        "AzureWebJobsStorage",
        f"DefaultEndpointsProtocol=https;AccountName=mtcproxy;AccountKey={STORAGE_KEY};EndpointSuffix=core.windows.net",
    )
    state = SimpleNamespace(
        calls=[],
        upstream=lambda: urllib.error.HTTPError(
            "https://logic.example.test/callback", 400, "Bad Request", {},
            io.BytesIO(b'{"error": {"code": "TriggerRequestMethodNotValid", "message": "x"}}'),
        ),
        depths={},
    )

    def urlopen(request, timeout):
        state.calls.append(request)
        if "logic.example.test" in request.full_url:
            result = state.upstream()
            if isinstance(result, BaseException):
                raise result
            return result
        queue = urllib.parse.urlsplit(request.full_url).path.strip("/")
        depth = state.depths.get(queue, 0)
        if isinstance(depth, BaseException):
            raise depth
        response = CallbackResponse(body=b"")
        response.headers = {"x-ms-approximate-messages-count": str(depth)}
        return response

    monkeypatch.setattr(function_app.deep_health.urllib.request, "urlopen", urlopen)
    return state


def _health(url="https://stay.mtcottages.com/api/health?deep=1"):
    response = function_app.health(Request(method="GET", url=url, headers={"Host": "stay.mtcottages.com"}))
    return response, json.loads(response.body)


def test_plain_health_makes_no_outbound_call(deep):
    response, body = _health("https://stay.mtcottages.com/api/health")
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert "upstream" not in body
    assert deep.calls == []


def test_deep_health_is_ok_when_the_trigger_refuses_a_get_and_no_queue_is_poisoned(deep):
    deep.depths = {"intake-retry": 2}
    response, body = _health()
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["upstream"] == {"LOGICAPP_URL_APPLICATION": "ok"}
    assert body["queues"] == {"intake-retry": 2, "intake-retry-poison": 0, "intake-notify-poison": 0}
    assert "sig=secret" not in response.body and STORAGE_KEY not in response.body
    upstream_call = deep.calls[0]
    assert upstream_call.get_method() == "GET" and upstream_call.data is None


@pytest.mark.parametrize(
    ("answer", "label"),
    [
        (lambda: urllib.error.HTTPError(
            "u", 401, "Unauthorized", {}, io.BytesIO(b'{"error": {"code": "AuthorizationFailed"}}')
        ), "status_401_AuthorizationFailed"),
        (lambda: urllib.error.HTTPError("u", 404, "Not Found", {}, io.BytesIO(b"not json")), "status_404"),
        (lambda: urllib.error.URLError(ConnectionRefusedError("refused")), "unreachable_ConnectionRefusedError"),
        (lambda: TimeoutError("timed out"), "unreachable_TimeoutError"),
    ],
)
def test_deep_health_fails_when_the_logic_app_rejects_the_proxy(deep, answer, label):
    deep.upstream = answer
    response, body = _health()
    assert response.status_code == 503
    assert body["status"] == "degraded"
    assert body["upstream"]["LOGICAPP_URL_APPLICATION"] == label


def test_deep_health_reports_how_staff_hear_of_an_inquiry(deep):
    response, body = _health()
    assert response.status_code == 200
    assert body["notify"] == {"staff-email": "graph", "teams": "off", "guest-email": "off"}


def test_deep_health_fails_when_no_person_is_told_about_an_inquiry(deep, monkeypatch):
    monkeypatch.delenv("STAFF_ALERT_RECIPIENTS")
    response, body = _health()
    assert response.status_code == 503
    assert body["notify"] == {"staff-email": "off", "teams": "off", "guest-email": "off"}


def test_deep_health_without_a_trigger_url_is_not_configured(deep, monkeypatch):
    monkeypatch.delenv("LOGICAPP_URL_APPLICATION")
    response, body = _health()
    assert response.status_code == 503
    assert body["upstream"]["LOGICAPP_URL_APPLICATION"] == "not_configured"


@pytest.mark.parametrize("queue", ["intake-retry-poison", "intake-notify-poison"])
def test_a_poisoned_queue_fails_deep_health(deep, queue):
    deep.depths = {queue: 1}
    response, body = _health()
    assert response.status_code == 503
    assert body["queues"][queue] == 1


def test_queue_depth_signs_with_shared_key(deep):
    _health()
    queue_call = next(call for call in deep.calls if "queue.core.windows.net" in call.full_url)
    assert queue_call.full_url == "https://mtcproxy.queue.core.windows.net/intake-retry?comp=metadata"
    assert queue_call.headers["Authorization"].startswith("SharedKey mtcproxy:")


def test_unreadable_storage_is_reported_but_does_not_page(deep, monkeypatch):
    monkeypatch.setenv("AzureWebJobsStorage", "")
    response, body = _health()
    assert response.status_code == 200
    assert set(body["queues"].values()) == {"unknown"}


@pytest.mark.parametrize(
    ("setting", "value", "label"),
    [
        ("TURNSTILE_SITE_KEY", "1x00000000000000000000AA", "test_key"),
        ("TURNSTILE_SITE_KEY", "3x00000000000000000000FF", "test_key"),
        ("TURNSTILE_SECRET_KEY", "2x0000000000000000000000000000000AA", "test_key"),
        ("TURNSTILE_SECRET_KEY", "", "not_configured"),
    ],
)
def test_a_turnstile_test_key_or_missing_value_fails_deep_health(deep, monkeypatch, setting, value, label):
    """#85: a Cloudflare test key on the live host means no real token can ever verify."""
    monkeypatch.setenv(setting, value)
    response, body = _health()
    assert response.status_code == 503
    assert body["turnstile"] == label
    assert value not in response.body or not value


def test_the_test_key_switch_fails_deep_health(deep, monkeypatch):
    monkeypatch.setenv("TURNSTILE_ACCEPT_TEST_KEYS", "true")
    response, body = _health()
    assert response.status_code == 503
    assert body["turnstile"] == "test_key"


def test_production_turnstile_keys_pass_deep_health(deep):
    response, body = _health()
    assert response.status_code == 200
    assert body["turnstile"] == "ok"
    assert "0x4AAAAAAAsecret-key" not in response.body


def test_deep_health_is_cached_against_bursts(deep):
    _health()
    calls = len(deep.calls)
    _health()
    assert len(deep.calls) == calls


# ---------------------------------------------------------------------------
# Locked trigger and secured run data (#17)
# ---------------------------------------------------------------------------

def _identity_answer(request):
    if "/msi/token" not in request.full_url:
        return None
    assert "resource=https%3A%2F%2Fmanagement.core.windows.net%2F" in request.full_url
    return CallbackResponse(body=json.dumps({"access_token": "mi-token", "expires_on": "4102444800"}).encode())


def test_managed_identity_mode_sends_a_token_and_drops_the_sig(intake, managed_identity, monkeypatch):
    monkeypatch.setenv("LOGICAPP_AUTH", "managed-identity")
    monkeypatch.setenv(
        "LOGICAPP_URL_APPLICATION",
        "https://logic.example.test/workflows/x/triggers/manual/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=secret",
    )
    seen = []
    original = function_app.urllib.request.urlopen

    def urlopen(request, timeout):
        identity = _identity_answer(request)
        if identity is not None:
            return identity
        seen.append(request.full_url)
        return original(request, timeout)

    monkeypatch.setattr(function_app.urllib.request, "urlopen", urlopen)
    response = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.60")))
    assert response.status_code == 200
    assert intake.calls[0]["headers"]["Authorization"] == "Bearer mi-token"
    assert "sig=" not in seen[0]
    assert "sp=%2Ftriggers%2Fmanual%2Frun" in seen[0] and "api-version=2016-10-01" in seen[0]


def test_sas_mode_is_the_default_and_keeps_the_url(intake):
    _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.61")))
    assert "Authorization" not in intake.calls[0]["headers"]


def test_missing_identity_queues_the_lead_instead_of_dropping_it(intake, monkeypatch):
    monkeypatch.setenv("LOGICAPP_AUTH", "managed-identity")
    monkeypatch.delenv("IDENTITY_ENDPOINT", raising=False)
    function_app.managed_identity.reset_cache()
    queue = QueueOut()
    response = _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.62")), queue)
    assert response.status_code == 202
    assert json.loads(queue.messages[0])["reason"] == "auth-identity_endpoint_missing"
    assert intake.calls == []


def test_deep_health_reports_an_identity_failure(deep, monkeypatch):
    monkeypatch.setenv("LOGICAPP_AUTH", "managed-identity")
    monkeypatch.delenv("IDENTITY_ENDPOINT", raising=False)
    function_app.managed_identity.reset_cache()
    response, body = _health()
    assert response.status_code == 503
    assert body["upstream"]["LOGICAPP_URL_APPLICATION"] == "auth_identity_endpoint_missing"


def test_run_history_does_not_keep_lead_data():
    definition = json.loads((FUNCTION_PATH.parents[1] / "mtcottages-intake.definition.json").read_text(encoding="utf-8"))
    trigger = definition["triggers"]["manual"]
    assert trigger["runtimeConfiguration"]["secureData"]["properties"] == ["outputs"]
    lead = (
        definition["actions"]["Require_MtCottages_Business_Unit"]["actions"]["Require_MtCottages_Owner_Team"]
        ["actions"]["Create_D365_Applicant_Lead"]
    )
    assert sorted(lead["runtimeConfiguration"]["secureData"]["properties"]) == ["inputs", "outputs"]


def test_d365_dataset_is_the_connector_unique_name_not_the_hostname():
    """#85: the Dynamics connector names an org by its unique name (``org8a977f45.crm``).

    ``dream.crm`` is the org's URL name. The connector answered 404 NotFound to it
    on every lead create, so no inquiry ever reached Dynamics. The live connector
    check runs in ``intake-logicapp.sh``; this one keeps git from regressing.
    """
    azure_dir = FUNCTION_PATH.parents[1]
    definition = json.loads((azure_dir / "mtcottages-intake.definition.json").read_text(encoding="utf-8"))
    parameters = json.loads((azure_dir / "mtcottages-intake.parameters.json").read_text(encoding="utf-8"))
    for name in ("d365Organization", "d365BusinessUnitName"):
        assert parameters[name]["value"] == definition["parameters"][name]["defaultValue"], name
    assert re.fullmatch(r"org[0-9a-f]{8}\.crm[0-9]*", parameters["d365Organization"]["value"])
    assert parameters["d365BusinessUnitName"]["value"] == "World Enterprise"


# ---------------------------------------------------------------------------
# End-to-end canary (#16)
# ---------------------------------------------------------------------------

CANARY_TOKEN_VALUE = "c" * 40  # test-only value, not a credential
CANARY_MAILBOX = "intake-canary@mtcottages.com"


def _turnstile_must_not_run(_req, _payload):
    raise AssertionError("Turnstile was called for a canary")


@pytest.fixture
def canary(intake, monkeypatch):
    monkeypatch.setenv("CANARY_TOKEN", CANARY_TOKEN_VALUE)
    monkeypatch.setenv("CANARY_GUEST_EMAIL", CANARY_MAILBOX)
    return intake


def _canary_request(ip, token=CANARY_TOKEN_VALUE):
    payload = _payload_with_id()
    payload.pop("cf-turnstile-response")
    return _form_request(payload, headers={**_request_from(ip), "X-Intake-Canary": token})


def test_canary_skips_turnstile_and_becomes_a_fixed_synthetic_lead(canary, monkeypatch):
    monkeypatch.setattr(function_app, "_verify_turnstile", _turnstile_must_not_run)
    response = _apply(_canary_request("192.0.2.70"))
    assert response.status_code == 200
    call = canary.calls[0]
    lead = call["payload"]
    # Whatever the caller sent, the identity is the fixed synthetic one.
    assert lead["firstName"] == "Intake" and lead["lastName"] == "Canary"
    assert lead["email"] == CANARY_MAILBOX
    assert lead["phone"] == "+1 304 555 0100"
    assert "Ada" not in json.dumps(lead) and "555-555-1212" not in json.dumps(lead)
    assert call["headers"]["X-intake-canary-run"] == "1"
    # The proxy's own token never travels to the Logic App.
    assert CANARY_TOKEN_VALUE not in json.dumps(call)


def test_canary_notifications_are_marked(canary, notifications):
    notify = QueueOut()
    _apply(_canary_request("192.0.2.71"), notify=notify)
    envelopes = [json.loads(message) for message in notify.messages[0]]
    assert {envelope["canary"] for envelope in envelopes} == {True}
    guest = next(envelope for envelope in envelopes if envelope["channel"] == "guest-email")
    assert guest["lead"]["email"] == CANARY_MAILBOX
    for channel in ("staff-email", "guest-email"):
        envelope = function_app.intake_notify.parse_envelope(
            next(m for m in notify.messages[0] if json.loads(m)["channel"] == channel).encode()
        )
        subject = (function_app.intake_notify.staff_email if channel == "staff-email"
                   else function_app.intake_notify.guest_email)(envelope)[0]
        assert subject.startswith("[canary] ")
    card = function_app.intake_notify.teams_card(function_app.intake_notify.parse_envelope(
        next(m for m in notify.messages[0] if json.loads(m)["channel"] == "teams").encode()
    ))
    assert card["attachments"][0]["content"]["body"][0]["text"].startswith("[canary] ")


def test_real_inquiries_are_never_marked_canary(intake, notifications):
    notify = QueueOut()
    _apply(_form_request(_payload_with_id(), headers=_request_from("192.0.2.72")), notify=notify)
    assert {json.loads(message)["canary"] for message in notify.messages[0]} == {False}
    assert "X-intake-canary-run" not in intake.calls[0]["headers"]
    envelope = function_app.intake_notify.parse_envelope(notify.messages[0][0].encode())
    assert not function_app.intake_notify.staff_email(envelope)[0].startswith("[canary]")


@pytest.mark.parametrize("token", ["", "wrong-" + "c" * 34, "c" * 39])
def test_a_wrong_canary_token_still_needs_turnstile(canary, monkeypatch, token):
    seen = []
    monkeypatch.setattr(function_app, "_verify_turnstile", lambda req, payload: seen.append(1) or (400, "verify"))
    response = _apply(_canary_request("192.0.2.73", token=token))
    assert response.status_code == 400
    assert seen == [1]
    assert canary.calls == []


@pytest.mark.parametrize("missing", ["CANARY_TOKEN", "CANARY_GUEST_EMAIL"])
def test_canary_mode_is_off_unless_fully_configured(canary, monkeypatch, missing):
    monkeypatch.delenv(missing)
    monkeypatch.setattr(function_app, "_verify_turnstile", lambda _req, _payload: (400, "verify"))
    assert _apply(_canary_request("192.0.2.74")).status_code == 400
    assert canary.calls == []


def test_short_canary_token_setting_is_refused(canary, monkeypatch):
    monkeypatch.setenv("CANARY_TOKEN", "short")
    monkeypatch.setattr(function_app, "_verify_turnstile", lambda _req, _payload: (400, "verify"))
    assert _apply(_canary_request("192.0.2.75", token="short")).status_code == 400


def test_queued_canary_keeps_its_marker_through_redelivery(canary):
    canary.answer = lambda: TimeoutError("timed out")
    queue = QueueOut()
    assert _apply(_canary_request("192.0.2.76"), queue).status_code == 202
    envelope = queue.messages[0]
    assert json.loads(envelope)["canary"] is True
    canary.answer = lambda: CallbackResponse()
    function_app.redeliver_intake(QueueMessage(envelope))
    assert canary.calls[-1]["headers"]["X-intake-canary-run"] == "1"


def test_scheduled_pipelines_never_rebuild_or_redeploy_the_proxy():
    # The drift gate (#13) and the canary (#16) run from schedules; `changes`
    # is always true there, so only an explicit rule keeps them read-only.
    ci = (FUNCTION_PATH.parents[3] / ".gitlab-ci.yml").read_text(encoding="utf-8")
    for anchor in (".apply-proxy:verify-rules:", ".apply-proxy:deploy-rules:"):
        block = ci.split(anchor, 1)[1].split("\n\n", 1)[0]
        first_rule = block.split("    - if:", 2)[1]
        assert "$CI_PIPELINE_SOURCE == \"schedule\"" in first_rule and "when: never" in first_rule, anchor


HAND_RUN_CHECK_RULE = (
    "- if: '$CI_PIPELINE_SOURCE =~ /^(web|api)$/ && ($INTAKE_LOSS_COUNT == \"true\" || "
    "$INTAKE_LOGICAPP_DRIFT == \"true\" || $INTAKE_CANARY_ENABLED == \"true\")'\n      when: never"
)


def test_hand_run_intake_checks_never_rebuild_or_redeploy_anything():
    # #12: the read-only count (and the drift and canary checks) started with
    # "Run pipeline" or `glab ci run` must not republish the proxy or the Logic
    # App. A push never matches: the rule needs a web or api source.
    ci = (FUNCTION_PATH.parents[3] / ".gitlab-ci.yml").read_text(encoding="utf-8")
    for anchor in (".apply-proxy:verify-rules:", ".apply-proxy:deploy-rules:", "deploy:intake-logicapp:"):
        block = ci.split("\n" + anchor, 1)[1].split("\n\n", 1)[0]
        assert HAND_RUN_CHECK_RULE in block, anchor
        # It must come before any rule that could let the job run.
        assert block.index(HAND_RUN_CHECK_RULE) < block.index('"gh-pages"'), anchor


def _owner_team_actions():
    definition = json.loads((FUNCTION_PATH.parents[1] / "mtcottages-intake.definition.json").read_text(encoding="utf-8"))
    return (
        definition["actions"]["Require_MtCottages_Business_Unit"]["actions"]["Require_MtCottages_Owner_Team"]["actions"]
    )


def test_logic_app_routes_canaries_away_from_the_sales_queue():
    # #84: a canary is a declared synthetic. It still proves the trigger, the
    # business-unit and owner-team lookups and a D365 create and delete, but
    # it is never assigned to the sales team and never reaches the real path.
    actions = _owner_team_actions()
    route = actions["Route_Canary"]
    assert route["runAfter"] == {}
    assert route["expression"] == {
        "equals": [f"@triggerOutputs()?['headers']?['{function_app.CANARY_LOGICAPP_HEADER}']", "1"]
    }
    assert route["else"]["actions"] == {}
    canary = route["actions"]

    lead = canary["Create_D365_Canary_Lead"]
    body = lead["inputs"]["body"]
    assert not any(key.startswith("ownerid") for key in body), "a canary must never be owned by the sales team"
    assert body["subject"].startswith("@{concat('[canary] ")
    assert body["_leadqualitycode_label"] == "Cold"
    assert body["donotemail"] is True and body["donotphone"] is True
    assert sorted(lead["runtimeConfiguration"]["secureData"]["properties"]) == ["inputs", "outputs"]

    delete = canary["Delete_Canary_D365_Lead"]
    assert delete["runAfter"] == {"Create_D365_Canary_Lead": ["Succeeded"]}
    assert delete["inputs"]["method"] == "delete"
    assert "body('Create_D365_Canary_Lead')?['leadid']" in delete["inputs"]["path"]

    # The canary answers success only after its lead is gone; otherwise the
    # run fails, so the canary job and the RunsFailed alert both fire.
    assert canary["Respond_Canary_Success"]["runAfter"] == {"Delete_Canary_D365_Lead": ["Succeeded"]}
    assert canary["Respond_Canary_Success"]["inputs"]["statusCode"] == 201
    assert canary["Stop_Canary"]["inputs"] == {"runStatus": "Succeeded"}
    assert sorted(canary["Respond_Canary_Failure"]["runAfter"]["Delete_Canary_D365_Lead"]) == [
        "Failed", "Skipped", "TimedOut",
    ]
    assert canary["Fail_Canary_Run"]["runAfter"] == {"Respond_Canary_Failure": ["Succeeded"]}
    assert canary["Fail_Canary_Run"]["inputs"]["runStatus"] == "Failed"


def test_real_inquiries_take_the_sales_path_only_after_the_canary_route():
    actions = _owner_team_actions()
    real = actions["Create_D365_Applicant_Lead"]
    assert real["runAfter"] == {"Route_Canary": ["Succeeded"]}
    # The connector binds the owner through its own columns; a Web API
    # `ownerid@odata.bind` key is outside its schema and fails every create
    # with "A value must be provided for item." (#85).
    body = real["inputs"]["body"]
    assert body["_ownerid_type"] == "teams"
    assert body["_ownerid_value"] == "@{first(body('Find_MtCottages_Owner_Team')?['value'])?['teamid']}"
    assert not any("@odata" in key for key in body)
    assert "canary" not in json.dumps(real["inputs"]).lower()
    assert "Delete_Canary_Lead" not in actions
    # Nothing outside the canary branch deletes a lead.
    outside = {name: action for name, action in actions.items() if name != "Route_Canary"}
    assert '"method": "delete"' not in json.dumps(outside)
