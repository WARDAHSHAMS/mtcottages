#!/usr/bin/env python3
"""Fail an MR pipeline when an azure-deploy job would break before its script.

WorldEnterpriseGroup/mtcottages#23: gh-pages pipeline 145947 went red because
verify:analytics took a git checkout on the scoped `azure-deploy` runner. That
runner's pod has HOME=/, so get_sources stopped on "could not lock config file
//.gitconfig: Permission denied" before the script ran.

The runner is `ref_protected` (it mounts the deploy certificate), so a job
tagged for it can never run in an MR pipeline. This check is the MR-time gate
instead: it reads the resolved .gitlab-ci.yml and, for every job tagged
`azure-deploy`, requires

1. a start that does not need a writable HOME: either `GIT_STRATEGY: none`
   (the launch-sequence `.deploy:azure-function` pattern) or a `HOME` variable
   that points somewhere other than `/`; and
2. with `GIT_STRATEGY: none`, every repository file its script runs
   (`bash path/to/file.sh`) arrives as an artifact of a job in its `needs`.

Input is the CI file as JSON with anchors expanded, from the preflight image's
yq (mikefarah v4):

    yq -o=json 'explode(.)' .gitlab-ci.yml | python3 -I scripts/check-ci-runner-contract.py

`extends` is resolved for templates defined in this file. Jobs that take their
tags from an included template (deploy:apply-proxy extends
`.deploy:azure-function`) are covered by that template, which sets
`GIT_STRATEGY: none` itself.
"""

import json
import re
import sys

RUNNER_TAG = "azure-deploy"
KEYWORDS = {
    "default", "include", "stages", "variables", "workflow", "spec",
    "image", "services", "cache", "before_script", "after_script",
}
SCRIPT_FILE = re.compile(r"\b(?:bash|sh|python3?)\s+(?:-\S+\s+)*([\w./-]+\.(?:sh|py))\b")


def as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def deep_merge(base, override):
    """GitLab `extends` semantics: hashes merge deeply, everything else replaces."""
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def resolve(name, config, seen=()):
    if name in seen:
        raise ValueError("extends cycle: " + " -> ".join(seen + (name,)))
    job = config.get(name)
    if not isinstance(job, dict):
        return {}  # Defined in an included file; not resolvable here.
    resolved = {}
    for parent in as_list(job.get("extends")):
        resolved = deep_merge(resolved, resolve(parent, config, seen + (name,)))
    own = {key: value for key, value in job.items() if key != "extends"}
    return deep_merge(resolved, own)


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        print("ERROR: no CI configuration on stdin (did yq run?)", file=sys.stderr)
        return 2
    try:
        config = json.loads(raw)
    except json.JSONDecodeError as error:
        print("ERROR: CI configuration is not valid JSON: %s" % error, file=sys.stderr)
        return 2
    if not isinstance(config, dict):
        print("ERROR: CI configuration is not a mapping", file=sys.stderr)
        return 2

    global_vars = config.get("variables") or {}
    jobs = {
        name: resolve(name, config)
        for name in config
        if name not in KEYWORDS and not name.startswith(".") and isinstance(config[name], dict)
    }

    problems = []
    checked = []
    for name, job in sorted(jobs.items()):
        if RUNNER_TAG not in as_list(job.get("tags")):
            continue
        checked.append(name)
        variables = dict(global_vars)
        variables.update(job.get("variables") or {})
        strategy = str(variables.get("GIT_STRATEGY", "")).strip()
        home = str(variables.get("HOME", "")).strip()

        if strategy != "none" and home in ("", "/"):
            problems.append(
                "%s: runs on the %s runner (HOME=/) with a git checkout; set GIT_STRATEGY: none "
                "or a writable HOME" % (name, RUNNER_TAG)
            )

        if strategy == "none":
            shipped = set()
            for need in as_list(job.get("needs")):
                need_name = need.get("job") if isinstance(need, dict) else need
                wants_artifacts = need.get("artifacts", True) if isinstance(need, dict) else True
                if not wants_artifacts or need_name not in jobs:
                    continue
                artifacts = jobs[need_name].get("artifacts") or {}
                shipped.update(as_list(artifacts.get("paths")))
            for line in as_list(job.get("script")):
                for path in SCRIPT_FILE.findall(str(line)):
                    if path not in shipped:
                        problems.append(
                            "%s: GIT_STRATEGY none, but %s is not an artifact of any job in its needs"
                            % (name, path)
                        )

    if not checked:
        problems.append("no job is tagged %s; the check is pointed at the wrong file" % RUNNER_TAG)

    for problem in problems:
        print("ERROR: " + problem, file=sys.stderr)
    if problems:
        return 1
    print("azure-deploy runner contract ok: " + ", ".join(checked))
    return 0


if __name__ == "__main__":
    sys.exit(main())
