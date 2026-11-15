"""Unit tests for scripts/check-live-build.py (#19)."""

import importlib.util
import io
import json
import pathlib
import unittest
import urllib.error
from contextlib import redirect_stdout

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "check-live-build.py"
spec = importlib.util.spec_from_file_location("check_live_build", SCRIPT)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

OLD = "a" * 40
NEW = "b" * 40
NEWER = "c" * 40
MAIN_ONLY = "d" * 40


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeClock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


class FakeGit:
    """History OLD -> NEW -> NEWER on the deploy branch; MAIN_ONLY is off it."""

    order = [OLD, NEW, NEWER]

    def __init__(self, remote="origin", head=NEWER):
        self.head = head

    def resolve_remote_branch(self, branch):
        return self.head

    def is_ancestor(self, ancestor, descendant):
        if ancestor not in self.order or descendant not in self.order:
            return False
        return self.order.index(ancestor) <= self.order.index(descendant)


def stamps(*commits):
    """A fetch that serves each commit in turn, then the last one forever."""
    served = list(commits)

    def fetch(url, attempt):
        value = served.pop(0) if len(served) > 1 else served[0]
        if isinstance(value, Exception):
            raise value
        return value

    return fetch


class FetchLiveCommitTest(unittest.TestCase):
    def test_reads_commit_and_busts_cache(self):
        seen = {}

        def opener(request, timeout):
            seen["url"] = request.full_url
            seen["cache"] = request.get_header("Cache-control")
            return FakeResponse(json.dumps({"commit": NEW, "builtAt": "x"}).encode())

        self.assertEqual(gate.fetch_live_commit("https://example.test/build.json", 3, opener), NEW)
        self.assertRegex(seen["url"], r"^https://example\.test/build\.json\?gate=\d+-3$")
        self.assertEqual(seen["cache"], "no-cache")

    def test_404_before_the_first_stamped_deploy_is_unreadable(self):
        def opener(request, timeout):
            raise urllib.error.HTTPError(request.full_url, 404, "Not Found", {}, None)

        with self.assertRaisesRegex(gate.LiveFetchError, "HTTP 404"):
            gate.fetch_live_commit("https://example.test/build.json", 1, opener)

    def test_rejects_a_stamp_without_a_sha(self):
        for body in (b"<html>", b'{"commit": "main"}', b"[]"):
            with self.subTest(body=body):
                with self.assertRaises(gate.LiveFetchError):
                    gate.fetch_live_commit("https://example.test/build.json", 1, lambda r, timeout: FakeResponse(body))


class WaitForLiveTest(unittest.TestCase):
    def wait(self, fetch, expect=NEW, timeout=600, git=None):
        clock = FakeClock()
        lines = []
        result = gate.wait_for_live(expect, "u", timeout, 30, git=git, fetch=fetch,
                                    clock=clock, sleep=clock.sleep, log=lines.append)
        return result, lines, clock.now

    def test_passes_once_the_deploy_lands(self):
        (passed, live), lines, _ = self.wait(stamps(OLD, OLD, NEW))
        self.assertTrue(passed)
        self.assertEqual(live, NEW)
        self.assertEqual(len(lines), 3)

    def test_fails_at_the_deadline_while_live_lags(self):
        (passed, live), lines, elapsed = self.wait(stamps(OLD), timeout=300)
        self.assertFalse(passed)
        self.assertEqual(live, OLD)
        self.assertEqual(elapsed, 300)
        self.assertIn("lagging", lines[-1])

    def test_a_newer_deploy_supersedes_with_git(self):
        (passed, live), _, _ = self.wait(stamps(NEWER), git=FakeGit())
        self.assertTrue(passed)
        self.assertEqual(live, NEWER)

    def test_without_git_only_an_exact_match_passes(self):
        (passed, _), _, _ = self.wait(stamps(NEWER), timeout=60)
        self.assertFalse(passed)

    def test_an_older_live_build_is_not_superseding(self):
        (passed, _), _, _ = self.wait(stamps(OLD), expect=NEWER, timeout=60, git=FakeGit())
        self.assertFalse(passed)

    def test_unreadable_stamp_keeps_waiting(self):
        (passed, _), lines, _ = self.wait(stamps(gate.LiveFetchError("HTTP 404"), NEW))
        self.assertTrue(passed)
        self.assertIn("HTTP 404", lines[0])

    def test_zero_timeout_checks_once(self):
        (passed, _), lines, _ = self.wait(stamps(OLD), timeout=0)
        self.assertFalse(passed)
        self.assertEqual(len(lines), 1)


class MainTest(unittest.TestCase):
    def run_main(self, argv, fetch, head=NEWER):
        clock = FakeClock()
        out = io.StringIO()
        with redirect_stdout(out):
            code = gate.main(argv, git_factory=lambda remote: FakeGit(remote, head),
                             fetch=fetch, clock=clock, sleep=clock.sleep, log=lambda line: None)
        return code, out.getvalue()

    def test_commit_missing_from_the_deploy_branch_fails_fast(self):
        code, out = self.run_main(["--expect", MAIN_ONLY, "--deploy-ref", "gh-pages"], stamps(NEWER))
        self.assertEqual(code, 1)
        self.assertIn("can never be published", out)

    def test_deploy_ref_pass(self):
        code, out = self.run_main(["--expect", NEW, "--deploy-ref", "gh-pages"], stamps(NEWER))
        self.assertEqual(code, 0)
        self.assertIn("PASS", out)

    def test_lag_fails(self):
        code, out = self.run_main(["--expect", NEW, "--timeout", "90"], stamps(OLD))
        self.assertEqual(code, 1)
        self.assertIn("does not include", out)

    def test_rejects_a_non_sha(self):
        with redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
            gate.parse_args(["--expect", "main"])


class GitTest(unittest.TestCase):
    def test_is_ancestor_unshallows_and_maps_exit_codes(self):
        calls = []

        class Result:
            def __init__(self, code, out=""):
                self.returncode, self.stdout, self.stderr = code, out, ""

        def runner(cmd, **kwargs):
            calls.append(cmd[1:])
            if cmd[1:3] == ["rev-parse", "--is-shallow-repository"]:
                return Result(0, "true\n")
            if cmd[1] == "merge-base":
                return Result(1)
            return Result(0)

        git = gate.Git(runner=runner)
        self.assertFalse(git.is_ancestor(NEW, OLD))
        self.assertIn(["fetch", "--quiet", "--filter=blob:none", "--unshallow", "origin"], calls)

    def test_unexpected_merge_base_error_raises(self):
        class Result:
            def __init__(self, code):
                self.returncode, self.stdout, self.stderr = code, "false\n", "boom"

        def runner(cmd, **kwargs):
            return Result(128 if cmd[1] == "merge-base" else 0)

        with self.assertRaises(gate.GitError):
            gate.Git(runner=runner).is_ancestor(NEW, OLD)


if __name__ == "__main__":
    unittest.main()
