#!/usr/bin/env bash
# Fails when a tracked file publishes a street address that is not approved.
# Shared by GitHub Actions (.github/workflows/ci-cd.yml) and the GitLab
# merge-request pipeline (.gitlab-ci.yml).
#
# The owner approved exactly four home addresses (Oct 2026): 125 Frederick St
# (Frederick is not in the street list below), 200 Henrietta, 2712 Broad and
# 3113 Broad. Every other house number stays banned. Docs and tests that
# describe or assert the rule, and this script itself, are excluded because
# they legitimately name the banned patterns.
set -euo pipefail

pattern='255 Court|216 Sand|287 Ridgeway|\b(?!(?:200 Henrietta|2712 Broad|3113 Broad)\b)[0-9]+ (Court|Sand|Broad|45th|32nd|Walnut|Virginia|Henrietta|Gallatin|Ridgeway)'
excluded='^(\.github/|\.claude/|e2e/|CLAUDE\.md$|agents\.md$|claude\.md$|scripts/check-addresses\.sh$)'

if git ls-files | grep -vE "$excluded" | xargs -r grep -InP "$pattern"; then
  echo "ERROR: banned street address pattern found in a tracked file (see matches above)" >&2
  exit 1
fi
echo "No banned street address patterns found in tracked content/data files."
