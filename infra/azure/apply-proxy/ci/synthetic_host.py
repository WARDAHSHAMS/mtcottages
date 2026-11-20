"""The stay application host on 127.0.0.1, for CI's synthetic real-form submission (#85).

Runs the packaged Function code, unchanged, behind a small HTTP server: every
request is matched to the same HTTP functions the Azure Functions host would
call (``app.get_functions()``), so the browser gets the real form from
``application_form`` and its POST reaches the real ``apply`` with its real bot
screen, Turnstile verification against Cloudflare's live siteverify, field
validation and Logic App delivery.

Only two things differ from the live host, both set by the CI job:

* Turnstile uses Cloudflare's published always-pass test keys, with
  ``TURNSTILE_ACCEPT_TEST_KEYS=true`` (a setting deep health refuses, so the
  live host can never run with it).
* ``LOGICAPP_URL_APPLICATION`` points at this server's stub trigger,
  ``/__intake/trigger``, which answers 202 and keeps the delivered field
  names. Nothing ever reaches the real Logic App or Dynamics 365.

The server adds ``X-Forwarded-Host: stay.mtcottages.com`` the way Front Door
does, so the canonical-host checks run as they do in production.

``GET /__synthetic/deliveries`` returns ``{"count": n, "fields": [[...], ...]}``
(sorted field names per delivery, never values) for the test to assert on.

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
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CANONICAL_HOST = "stay.mtcottages.com"
TRIGGER_PATH = "/__intake/trigger"
DELIVERIES_PATH = "/__synthetic/deliveries"
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


def load_http_functions(app_dir):
    """[(regex, methods, user function, name)] for every HTTP function, catch-all last."""
    sys.path.insert(0, str(app_dir))
    import function_app  # noqa: PLC0415 - the app is loaded from the directory given at run time

    routes = []
    for function in function_app.app.get_functions():
        trigger = function.get_trigger()
        if trigger.type != "httpTrigger":
            continue
        methods = {str(getattr(method, "value", method)).upper() for method in trigger.methods or []}
        routes.append((_route_pattern(trigger.route), methods, function.get_user_function(), function.get_function_name()))
    # The host matches literal routes before the catch-all; keep that order.
    routes.sort(key=lambda entry: entry[0].pattern == "(?P<route>.*)")
    if not routes:
        raise RuntimeError(f"no HTTP functions found in {app_dir}/function_app.py")
    return routes


class SyntheticHost(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, routes):
        super().__init__(address, Handler)
        self.routes = routes
        self.deliveries = []
        self.lock = threading.Lock()


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

        route_path = parsed.path.lstrip("/")
        for pattern, methods, handler, name in self.server.routes:
            match = pattern.fullmatch(route_path)
            if not match or self.command not in methods:
                continue
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
            for parameter in inspect.signature(handler).parameters.values():
                if parameter.name == "req":
                    arguments["req"] = request
                else:
                    arguments[parameter.name] = OutputBinding()
            try:
                response = handler(**arguments)
            except Exception:  # The host answers an unhandled exception with 500; so does this stand-in.
                logger.exception("function %s raised", name)
                return self._json(500, {"error": f"function {name} raised"})
            response_headers = list(response.headers.items())
            if response.mimetype and not any(key.lower() == "content-type" for key, _ in response_headers):
                charset = f"; charset={response.charset}" if response.charset else ""
                response_headers.append(("Content-Type", f"{response.mimetype}{charset}"))
            logger.info("%s %s -> %s (%s)", self.command, parsed.path, response.status_code, name)
            return self._send(response.status_code, response.get_body(), response_headers)
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
    routes = load_http_functions(arguments.app_dir.resolve())
    server = SyntheticHost((arguments.host, arguments.port), routes)
    logger.info("serving %s on http://%s:%d", ", ".join(name for *_, name in routes), arguments.host, arguments.port)
    server.serve_forever()


if __name__ == "__main__":
    main()
