"""The stay application host on 127.0.0.1, for CI's synthetic real-form submission (#85).

Runs the packaged Function code, unchanged, behind a small HTTP server: every
request is matched to the same HTTP functions the Azure Functions host would
call (``app.get_functions()``), so the browser gets the real form from
``application_form`` and its POST reaches the real ``apply`` with its real bot
screen, Turnstile verification against Cloudflare's live siteverify, field
validation and Logic App delivery.

Only these things differ from the live host, all set by the CI job:

* Turnstile uses Cloudflare's published always-pass test keys, with
  ``TURNSTILE_ACCEPT_TEST_KEYS=true`` (a setting deep health refuses, so the
  live host can never run with it).
* ``LOGICAPP_URL_APPLICATION`` points at this server's stub trigger,
  ``/__intake/trigger``, which answers 202 and keeps the delivered field
  names. Nothing ever reaches the real Logic App or Dynamics 365.
* The staff alert (#93) goes through the real ``intake_notify`` Graph transport
  to stubs on this server: ``IDENTITY_ENDPOINT`` is ``/__identity/token`` (the
  managed identity), ``GRAPH_MAIL_LOGIN_ENDPOINT`` is ``/__login`` (the Entra
  token endpoint, which insists on the identity's token as the federated
  client assertion) and ``GRAPH_MAIL_API_ENDPOINT`` is ``/__graph`` (Graph
  ``sendMail``, which answers 202 and keeps the message). No mail is sent.

What a function puts on a queue output binding is handed to that queue's
trigger function once the HTTP answer has gone out, the way the host runs
``send_intake_notification`` for each ``intake-notify`` message.

The server adds ``X-Forwarded-Host: stay.mtcottages.com`` the way Front Door
does, so the canonical-host checks run as they do in production.

``GET /__synthetic/deliveries`` returns ``{"count": n, "fields": [[...], ...]}``
(sorted field names per delivery, never values) for the test to assert on.
``GET /__synthetic/mail`` returns ``{"count": n, "messages": [...]}``: sender,
recipients, Reply-To, subject and submission id of each staff alert Graph
accepted, plus ``queue``: per queue, how many messages ran and how many failed.

Usage: python3 -I synthetic_host.py --port 7071 --app-dir infra/azure/apply-proxy [--deps-dir DIR]

``--deps-dir`` is a ``pip install --target`` directory holding the Function's
requirements (CI job ``synthetic:deps``), for an interpreter without pip.
"""

import argparse
import inspect
import json
import logging
import re
import sys
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CANONICAL_HOST = "stay.mtcottages.com"
TRIGGER_PATH = "/__intake/trigger"
DELIVERIES_PATH = "/__synthetic/deliveries"
MAIL_PATH = "/__synthetic/mail"
IDENTITY_PATH = "/__identity/token"
LOGIN_PATH = re.compile(r"/__login/(?P<tenant>[0-9a-f-]{36})/oauth2/v2\.0/token")
SENDMAIL_PATH = re.compile(r"/__graph/v1\.0/users/(?P<sender>[^/]+)/sendMail")
# The stub tokens: the identity's token must come back as the client assertion,
# and Graph accepts only the token the stub login issued.
IDENTITY_TOKEN = "synthetic-managed-identity-token"
GRAPH_TOKEN = "synthetic-graph-token"
FEDERATED_AUDIENCE = "api://AzureADTokenExchange"
CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
TOKEN_LIFETIME_SECONDS = 3600
MAX_BODY_BYTES = 256 * 1_024
# Hop-by-hop and length headers are the server's to set, not the function's.
SKIPPED_RESPONSE_HEADERS = {"content-length", "transfer-encoding", "connection"}

logger = logging.getLogger("synthetic-host")


class OutputBinding:
    """Stands in for a func.Out queue binding: keeps what the function set."""

    def __init__(self):
        self.value = None

    def set(self, value):
        self.value = value

    def get(self):
        return self.value


def _route_pattern(route):
    """Compile a Functions route template ('api/apply', '{*route}') to a regex."""
    if route.startswith("{*") and route.endswith("}"):
        return re.compile(r"(?P<route>.*)")
    return re.compile(re.escape(route.strip("/")))


class Route:
    """One HTTP function: its route regex, methods, user function, name and queue outputs."""

    def __init__(self, pattern, methods, handler, name, queue_outputs):
        self.pattern = pattern
        self.methods = methods
        self.handler = handler
        self.name = name
        self.queue_outputs = queue_outputs  # {parameter name: queue name}


def load_functions(app_dir):
    """([Route] for every HTTP function, catch-all last; {queue name: (user function, name)})."""
    sys.path.insert(0, str(app_dir))
    import function_app  # noqa: PLC0415 - the app is loaded from the directory given at run time

    routes, queue_triggers = [], {}
    for function in function_app.app.get_functions():
        trigger = function.get_trigger()
        name = function.get_function_name()
        if trigger.type == "queueTrigger":
            queue_triggers[trigger.queue_name] = (function.get_user_function(), name)
            continue
        if trigger.type != "httpTrigger":
            continue
        methods = {str(getattr(method, "value", method)).upper() for method in trigger.methods or []}
        queue_outputs = {
            binding.name: binding.queue_name
            for binding in function.get_bindings()
            if binding.type == "queue" and getattr(binding, "queue_name", None)
        }
        routes.append(Route(_route_pattern(trigger.route), methods, function.get_user_function(), name, queue_outputs))
    # The host matches literal routes before the catch-all; keep that order.
    routes.sort(key=lambda route: route.pattern.pattern == "(?P<route>.*)")
    if not routes:
        raise RuntimeError(f"no HTTP functions found in {app_dir}/function_app.py")
    return routes, queue_triggers


def _queue_messages(value):
    """The messages a function set on a queue output: one string, or a list of them."""
    if value is None:
        return []
    return [str(message) for message in (value if isinstance(value, (list, tuple)) else [value])]


class SyntheticHost(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, routes, queue_triggers=None):
        super().__init__(address, Handler)
        self.routes = routes
        self.queue_triggers = queue_triggers or {}
        self.deliveries = []
        self.mail = []
        self.queue_runs = {}
        self.lock = threading.Lock()

    def run_queue(self, queue, messages):
        """Hand each message to the queue's trigger function, as the host would; count the outcomes."""
        import azure.functions as func  # noqa: PLC0415 - imported after the app dir is on sys.path

        trigger = self.queue_triggers.get(queue)
        if trigger is None or not messages:
            return
        handler, name = trigger
        for body in messages:
            try:
                handler(func.QueueMessage(body=body.encode("utf-8")))
                outcome = "ran"
            except Exception:  # The host leaves a failing message queued; here it is counted and logged.
                logger.exception("queue function %s raised", name)
                outcome = "failed"
            with self.lock:
                counts = self.queue_runs.setdefault(queue, {"ran": 0, "failed": 0})
                counts[outcome] += 1


class Handler(BaseHTTPRequestHandler):
    server: SyntheticHost

    def log_message(self, fmt, *args):
        logger.info("%s %s", self.address_string(), fmt % args)

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY_BYTES:
            raise ValueError(f"request body of {length} bytes is over {MAX_BODY_BYTES}")
        return self.rfile.read(length) if length else b""

    def _send(self, status, body, headers):
        payload = body if isinstance(body, bytes) else str(body).encode("utf-8")
        self.send_response(status)
        for name, value in headers:
            if name.lower() not in SKIPPED_RESPONSE_HEADERS:
                self.send_header(name, value)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

    def _json(self, status, value):
        self._send(status, json.dumps(value), [("Content-Type", "application/json")])

    def _stub_trigger(self, body):
        """The Logic App trigger stand-in: record the field names, answer 202 like the real trigger."""
        try:
            lead = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            logger.error("stub trigger got a body that is not JSON: %s", type(error).__name__)
            return self._json(400, {"error": "body is not JSON"})
        if not isinstance(lead, dict):
            return self._json(400, {"error": "body is not a JSON object"})
        with self.server.lock:
            self.server.deliveries.append(sorted(lead))
        return self._json(202, {"accepted": True})

    def _stub_identity(self, parsed):
        """The managed identity endpoint stand-in: a token for the federated-credential audience only."""
        query = dict(urllib.parse.parse_qsl(parsed.query))
        if not self.headers.get("X-IDENTITY-HEADER"):
            return self._json(401, {"error": "X-IDENTITY-HEADER is missing"})
        if query.get("resource") != FEDERATED_AUDIENCE:
            return self._json(400, {"error": "unexpected resource"})
        expires_on = str(int(time.time()) + TOKEN_LIFETIME_SECONDS)
        return self._json(200, {"access_token": IDENTITY_TOKEN, "expires_on": expires_on})

    def _stub_login(self, body):
        """The Entra token endpoint stand-in: client credentials with the identity's token as assertion."""
        form = dict(urllib.parse.parse_qsl(body.decode("utf-8", errors="replace")))
        expected = {
            "grant_type": "client_credentials",
            "scope": "https://graph.microsoft.com/.default",
            "client_assertion_type": CLIENT_ASSERTION_TYPE,
            "client_assertion": IDENTITY_TOKEN,
        }
        if any(form.get(key) != value for key, value in expected.items()) or not form.get("client_id"):
            return self._json(401, {"error": "invalid_client"})
        return self._json(200, {"access_token": GRAPH_TOKEN, "token_type": "Bearer", "expires_in": TOKEN_LIFETIME_SECONDS})

    def _stub_sendmail(self, sender, body):
        """Graph sendMail stand-in: keep the envelope of the message, answer 202 like Graph."""
        if self.headers.get("Authorization") != f"Bearer {GRAPH_TOKEN}":
            return self._json(401, {"error": {"code": "InvalidAuthenticationToken"}})
        try:
            message = json.loads(body.decode("utf-8"))["message"]
            record = {
                "sender": urllib.parse.unquote(sender),
                "to": [entry["emailAddress"]["address"] for entry in message["toRecipients"]],
                "replyTo": [entry["emailAddress"]["address"] for entry in message.get("replyTo", [])],
                "subject": message["subject"],
                "submissionId": next(
                    (header["value"] for header in message.get("internetMessageHeaders", [])
                     if header.get("name") == "X-MtC-Submission-Id"),
                    "",
                ),
                "hasBody": bool(message.get("body", {}).get("content")),
            }
        except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError) as error:
            logger.error("stub sendMail got a malformed message: %s", type(error).__name__)
            return self._json(400, {"error": {"code": "ErrorInvalidRequest"}})
        with self.server.lock:
            self.server.mail.append(record)
        return self._send(202, b"", [])

    def _dispatch(self):
        import azure.functions as func  # noqa: PLC0415 - imported after the app dir is on sys.path

        try:
            body = self._read_body()
        except ValueError as error:
            return self._json(413, {"error": str(error)})
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == TRIGGER_PATH and self.command == "POST":
            return self._stub_trigger(body)
        if parsed.path == DELIVERIES_PATH and self.command == "GET":
            with self.server.lock:
                deliveries = list(self.server.deliveries)
            return self._json(200, {"count": len(deliveries), "fields": deliveries})
        if parsed.path == MAIL_PATH and self.command == "GET":
            with self.server.lock:
                mail = list(self.server.mail)
                queue = {name: dict(counts) for name, counts in self.server.queue_runs.items()}
            return self._json(200, {"count": len(mail), "messages": mail, "queue": queue})
        if parsed.path == IDENTITY_PATH and self.command == "GET":
            return self._stub_identity(parsed)
        login = LOGIN_PATH.fullmatch(parsed.path)
        if login and self.command == "POST":
            return self._stub_login(body)
        sendmail = SENDMAIL_PATH.fullmatch(parsed.path)
        if sendmail and self.command == "POST":
            return self._stub_sendmail(sendmail.group("sender"), body)

        route_path = parsed.path.lstrip("/")
        for route in self.server.routes:
            match = route.pattern.fullmatch(route_path)
            if not match or self.command not in route.methods:
                continue
            name = route.name
            headers = {key: value for key, value in self.headers.items()}
            headers["X-Forwarded-Host"] = CANONICAL_HOST
            request = func.HttpRequest(
                method=self.command,
                url=urllib.parse.urlunsplit(("https", CANONICAL_HOST, parsed.path, parsed.query, "")),
                headers=headers,
                params=dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)),
                route_params=match.groupdict(),
                body=body,
            )
            arguments = {}
            for parameter in inspect.signature(route.handler).parameters.values():
                if parameter.name == "req":
                    arguments["req"] = request
                else:
                    arguments[parameter.name] = OutputBinding()
            try:
                response = route.handler(**arguments)
            except Exception:  # The host answers an unhandled exception with 500; so does this stand-in.
                logger.exception("function %s raised", name)
                return self._json(500, {"error": f"function {name} raised"})
            response_headers = list(response.headers.items())
            if response.mimetype and not any(key.lower() == "content-type" for key, _ in response_headers):
                charset = f"; charset={response.charset}" if response.charset else ""
                response_headers.append(("Content-Type", f"{response.mimetype}{charset}"))
            logger.info("%s %s -> %s (%s)", self.command, parsed.path, response.status_code, name)
            self._send(response.status_code, response.get_body(), response_headers)
            self.wfile.flush()
            for parameter, queue in route.queue_outputs.items():
                output = arguments.get(parameter)
                self.server.run_queue(queue, _queue_messages(output.get() if output else None))
            return None
        return self._json(404, {"error": f"no function for {self.command} {parsed.path}"})

    do_GET = do_POST = do_OPTIONS = do_HEAD = _dispatch


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7071)
    parser.add_argument("--app-dir", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--deps-dir", type=Path, help="a pip --target directory with the Function's requirements")
    arguments = parser.parse_args(argv)
    if arguments.deps_dir is not None:
        if not arguments.deps_dir.is_dir():
            parser.error(f"--deps-dir {arguments.deps_dir} is not a directory")
        sys.path.insert(0, str(arguments.deps_dir.resolve()))
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    routes, queue_triggers = load_functions(arguments.app_dir.resolve())
    server = SyntheticHost((arguments.host, arguments.port), routes, queue_triggers)
    logger.info(
        "serving %s (queues: %s) on http://%s:%d",
        ", ".join(route.name for route in routes), ", ".join(sorted(queue_triggers)) or "none",
        arguments.host, arguments.port,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
