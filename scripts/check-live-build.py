#!/usr/bin/env python3
"""Fail when the live site's build lags the commit that should be published.

WorldEnterpriseGroup/mtcottages#19: from 21:06Z on 2026-11-15 every gh-pages
push cancelled the GitHub Pages run still in progress (`cancel-in-progress`),
and each run takes about 25 minutes, so merges arriving every 10 to 20 minutes
starved the deploy. !26 (sitemap.xml) and !32 (Check dates) were merged and
mirrored but never published, and no pipeline went red.

The site now publishes /build.json with the commit it was built from
(integrations/build-stamp.mjs). This script polls it until the live commit is
the expected one, and fails when it is still behind at the deadline.

Usage:

    check-live-build.py --expect SHA [--url URL] [--timeout SECONDS]
                        [--interval SECONDS] [--deploy-ref REF]

With --deploy-ref (the GitLab gate), git answers two more questions:

* Is the expected commit on the deploy branch at all? If not (a commit on
  main that gh-pages does not contain), it can never be published: fail now.
* Is the live commit a descendant of the expected one? Then a newer deploy
  already superseded it, which passes.

Without --deploy-ref (the GitHub live smoke, right after its own publish) only
an exact match passes.

Exit codes: 0 live matches or supersedes, 1 live lags at the deadline or the
commit is not on the deploy branch, 2 usage or git error.
"""

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

SHA = re.compile(r"^[0-9a-f]{40}$")
DEFAULT_URL = "https://mtcottages.com/build.json"
USER_AGENT = "mtcottages-live-build-gate/1"


class GitError(RuntimeError):
    """A git command failed in a way that is not a yes/no answer."""


class LiveFetchError(RuntimeError):
    """The live build stamp could not be read."""


def fetch_live_commit(url, attempt, opener=urllib.request.urlopen, timeout=20):
    """Return the commit in the live build.json. The query string busts the CDN cache."""
    separator = "&" if "?" in url else "?"
    request = urllib.request.Request(
        f"{url}{separator}gate={int(time.time())}-{attempt}",
        headers={"Cache-Control": "no-cache", "User-Agent": USER_AGENT},
    )
    try:
        with opener(request, timeout=timeout) as response:
            body = response.read()
    except urllib.error.HTTPError as error:
        raise LiveFetchError(f"{url} returned HTTP {error.code}") from error
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise LiveFetchError(f"{url} is unreachable: {error}") from error
    try:
        stamp = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise LiveFetchError(f"{url} is not JSON: {error}") from error
    commit = stamp.get("commit") if isinstance(stamp, dict) else None
    if not isinstance(commit, str) or not SHA.match(commit):
        raise LiveFetchError(f"{url} has no 40-character commit (got {commit!r})")
    return commit


def run_git(args, runner=subprocess.run):
    try:
        return runner(["git", *args], capture_output=True, text=True, check=False)
    except OSError as error:
        raise GitError(f"cannot run git: {error}") from error


class Git:
    """The few git questions the gate asks, fetching only what it needs."""

    def __init__(self, remote="origin", runner=subprocess.run):
        self.remote = remote
        self.runner = runner
        self.history_complete = False

    def _git(self, *args):
        return run_git(list(args), self.runner)

    def _complete_history(self):
        """Shallow CI clones cannot answer ancestry; fetch commits and trees, not photos."""
        if self.history_complete:
            return
        shallow = self._git("rev-parse", "--is-shallow-repository")
        if shallow.returncode != 0:
            raise GitError(f"git rev-parse failed: {shallow.stderr.strip()}")
        if shallow.stdout.strip() == "true":
            result = self._git("fetch", "--quiet", "--filter=blob:none", "--unshallow", self.remote)
            if result.returncode != 0:
                raise GitError(f"git fetch --unshallow failed: {result.stderr.strip()}")
        self.history_complete = True

    def resolve_remote_branch(self, branch):
        result = self._git("fetch", "--quiet", "--filter=blob:none", self.remote, branch)
        if result.returncode != 0:
            raise GitError(f"git fetch {self.remote} {branch} failed: {result.stderr.strip()}")
        head = self._git("rev-parse", "FETCH_HEAD")
        if head.returncode != 0 or not SHA.match(head.stdout.strip()):
            raise GitError(f"cannot resolve {self.remote}/{branch}: {head.stderr.strip()}")
        return head.stdout.strip()

    def _has_commit(self, sha):
        return self._git("cat-file", "-e", f"{sha}^{{commit}}").returncode == 0

    def is_ancestor(self, ancestor, descendant):
        self._complete_history()
        for sha in (ancestor, descendant):
            if not self._has_commit(sha):
                result = self._git("fetch", "--quiet", "--filter=blob:none", self.remote, sha)
                if result.returncode != 0:
                    # A live commit GitLab does not know is not a descendant of anything here.
                    return False
        result = self._git("merge-base", "--is-ancestor", ancestor, descendant)
        if result.returncode in (0, 1):
            return result.returncode == 0
        raise GitError(f"git merge-base failed: {result.stderr.strip()}")


def classify(expect, live, git=None):
    """'match', 'superseded' (live descends from expect) or 'lagging'."""
    if live == expect:
        return "match"
    if git is not None and git.is_ancestor(expect, live):
        return "superseded"
    return "lagging"


def wait_for_live(expect, url, timeout, interval, git=None, fetch=fetch_live_commit,
                  clock=time.monotonic, sleep=time.sleep, log=print):
    """Poll until the live build is expect (or newer). Returns (passed, last_live)."""
    deadline = clock() + timeout
    attempt = 0
    last_live = None
    while True:
        attempt += 1
        try:
            last_live = fetch(url, attempt)
            verdict = classify(expect, last_live, git)
        except LiveFetchError as error:
            verdict = "unreadable"
            log(f"attempt {attempt}: {error}")
        else:
            log(f"attempt {attempt}: live build {last_live[:12]} is {verdict} (expected {expect[:12]})")
        if verdict in ("match", "superseded"):
            return True, last_live
        remaining = deadline - clock()
        if remaining <= 0:
            return False, last_live
        sleep(min(interval, remaining))


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--expect", required=True, help="the commit that should be live")
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--timeout", type=int, default=20 * 60, help="seconds to wait (default 1200)")
    parser.add_argument("--interval", type=int, default=30, help="seconds between polls (default 30)")
    parser.add_argument("--deploy-ref", help="the published branch on the remote, e.g. gh-pages")
    parser.add_argument("--remote", default="origin")
    args = parser.parse_args(argv)
    args.expect = args.expect.strip().lower()
    if not SHA.match(args.expect):
        parser.error(f"--expect must be a 40-character commit SHA, got {args.expect!r}")
    if args.timeout < 0 or args.interval < 1:
        parser.error("--timeout must be >= 0 and --interval >= 1")
    return args


def main(argv=None, git_factory=Git, **wait_kwargs):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    git = None
    try:
        if args.deploy_ref:
            git = git_factory(remote=args.remote)
            deploy_head = git.resolve_remote_branch(args.deploy_ref)
            if not git.is_ancestor(args.expect, deploy_head):
                print(f"FAIL: {args.expect} is not on {args.deploy_ref} ({deploy_head[:12]}), "
                      f"so it can never be published. Merge it into {args.deploy_ref}.")
                return 1
        passed, live = wait_for_live(args.expect, args.url, args.timeout, args.interval, git=git, **wait_kwargs)
    except GitError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    if passed:
        print(f"PASS: {args.url} serves {live}, which includes {args.expect}")
        return 0
    print(f"FAIL: after {args.timeout}s {args.url} still serves {live or 'no readable build'}, "
          f"which does not include {args.expect}. The deploy is stuck, cancelled or red.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
