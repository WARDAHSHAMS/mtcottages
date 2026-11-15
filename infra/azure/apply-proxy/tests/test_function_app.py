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

        class FunctionApp:
            def __init__(self, **_kwargs):
                pass

            def route(self, **_kwargs):
                return lambda handler: handler

            def queue_output(self, **_kwargs):
                return lambda handler: handler

            def queue_trigger(self, **_kwargs):
                return lambda handler: handler

        value_type = TypeVar("value_type")

        class Out(Generic[value_type]):
            pass

        functions.AuthLevel = SimpleNamespace(ANONYMOUS="anonymous")
        functions.FunctionApp = FunctionApp
        functions.Out = Out
        functions.QueueMessage = object
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


def _apply(request, queue=None):
    return function_app.apply(request, queue if queue is not None else QueueOut())


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
    assert result == (400, "Please complete the human verification")


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
    assert result == (503, "Human verification is not configured")


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
