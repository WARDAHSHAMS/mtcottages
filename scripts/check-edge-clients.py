#!/usr/bin/env python3
"""Fail when a pipeline script would call the stay host as a client the edge blocks.

WorldEnterpriseGroup/mtcottages#23: verify:analytics in gh-pages pipeline 146031
got HTTP 403 on every attempt. The shared Front Door WAF rule BlockBadBots
(FocusApiary/infrastructure#506) blocks /api/ requests whose User-Agent contains
any of the words below, and curl's default agent is "curl/<version>".

For every curl call in the given shell scripts (backslash-continued lines are
joined), this requires a --user-agent / -A value that contains none of the
blocked words. Run in validate on every MR:

    python3 -I scripts/check-edge-clients.py infra/azure/*.sh
"""

import re
import shlex
import sys

# Mirror of the WAF rule's match_values (FocusApiary/infrastructure,
# terraform/environments/focushive/main.tf, BlockBadBots). Lowercase.
BLOCKED_WORDS = ("curl", "wget", "python-requests", "scrapy", "bot", "crawler", "spider")


def commands(text):
    """Logical lines with comments dropped and continuations joined."""
    joined = []
    current = ""
    for raw in text.splitlines():
        line = raw.rstrip()
        if line.lstrip().startswith("#"):
            continue
        if line.endswith("\\"):
            current += line[:-1] + " "
            continue
        joined.append(current + line)
        current = ""
    if current:
        joined.append(current)
    return joined


def user_agent(segment):
    """The --user-agent / -A value in one curl invocation, or None."""
    try:
        tokens = shlex.split(segment, posix=True)
    except ValueError:
        tokens = segment.split()
    for index, token in enumerate(tokens):
        if token in ("--user-agent", "-A") and index + 1 < len(tokens):
            return tokens[index + 1]
        if token.startswith("--user-agent="):
            return token.split("=", 1)[1]
    return None


def main(paths):
    if not paths:
        print("usage: check-edge-clients.py SCRIPT...", file=sys.stderr)
        return 2
    problems = []
    calls = 0
    for path in paths:
        try:
            with open(path, encoding="utf-8") as handle:
                text = handle.read()
        except OSError as error:
            problems.append("%s: cannot read (%s)" % (path, error.strerror))
            continue
        for line in commands(text):
            # A curl invocation, not "command -v curl" or the word in a message.
            for match in re.finditer(r'(?:^|[\s(;|&$"])curl\s+(-.*)', line):
                if re.search(r"command\s+-v\s+curl", line):
                    continue
                calls += 1
                # Inside "$(curl ...)" the call ends at the closing ')"'.
                segment = match.group(1).split(')"', 1)[0]
                agent = user_agent(segment)
                if agent is None:
                    problems.append("%s: curl call without --user-agent (the default agent is blocked on /api/): %s" % (path, line.strip()[:120]))
                elif any(word in agent.lower() for word in BLOCKED_WORDS):
                    problems.append("%s: user agent %r contains a word the WAF blocks on /api/" % (path, agent))
    for problem in problems:
        print("ERROR: " + problem, file=sys.stderr)
    if problems:
        return 1
    print("edge client check ok: %d curl call(s) send an allowed user agent" % calls)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
