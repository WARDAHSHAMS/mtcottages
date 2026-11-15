#!/usr/bin/env python3
"""Render the Mt Cottages growth roadmap: open issues ranked by RICE, by epic.

The page is a single static HTML file the CEO can read on a phone. CI runs it
(job `roadmap` in .gitlab-ci.yml) and keeps the output as a job artifact, so the
"latest artifact" URL always shows the newest render.

Live mode reads the GitLab API with a read_api token from ROADMAP_API_TOKEN:

    python3 -I scripts/roadmap/render_roadmap.py --out roadmap/index.html

Offline mode renders saved API responses, which is how the merge-request
pipeline tests the renderer without a token:

    python3 -I scripts/roadmap/render_roadmap.py \
        --issues scripts/roadmap/fixtures/issues.json \
        --epics scripts/roadmap/fixtures/epics.json --out roadmap/index.html

RICE comes from a machine line that each growth issue carries in its
description (hidden in the rendered Markdown):

    <!-- rice: reach=400 impact=2 confidence=0.8 effort=2 -->

score = reach * impact * confidence / effort. The renderer recomputes the score
rather than trusting a typed number, so the page and the labels cannot drift.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

RICE_RE = re.compile(
    r"<!--\s*rice:\s*reach=(?P<reach>[\d.]+)\s+impact=(?P<impact>[\d.]+)\s+"
    r"confidence=(?P<confidence>[\d.]+)\s+effort=(?P<effort>[\d.]+)\s*-->",
    re.IGNORECASE,
)
KPI_RE = re.compile(r"^\s*\*\*KPI:?\*\*:?\s*(?P<kpi>.+)$", re.MULTILINE)
EPIC_LABEL = "mtc-growth"
WORKFLOW_ORDER = ["doing", "review", "ready", "backlog", "todo", "done"]
NO_EPIC = "No epic yet"


class RoadmapError(Exception):
    """A failure the job should report in one clear line."""


@dataclass(frozen=True)
class Rice:
    reach: float
    impact: float
    confidence: float
    effort: float

    @property
    def score(self) -> float:
        if self.effort <= 0:
            raise RoadmapError("RICE effort must be greater than zero")
        return self.reach * self.impact * self.confidence / self.effort

    @property
    def band(self) -> str:
        if self.score >= 100:
            return "high"
        if self.score >= 30:
            return "mid"
        return "low"


@dataclass
class Item:
    iid: int
    title: str
    url: str
    rice: Rice | None
    workflow: str
    milestone: str
    milestone_due: str
    assignees: list[str]
    labels: list[str]


@dataclass
class Epic:
    title: str
    url: str
    kpi: str
    items: list[Item] = field(default_factory=list)

    @property
    def total_score(self) -> float:
        return sum(i.rice.score for i in self.items if i.rice)


def parse_rice(description: str | None) -> Rice | None:
    if not description:
        return None
    match = RICE_RE.search(description)
    if not match:
        return None
    try:
        return Rice(
            reach=float(match["reach"]),
            impact=float(match["impact"]),
            confidence=float(match["confidence"]),
            effort=float(match["effort"]),
        )
    except ValueError as exc:
        raise RoadmapError(f"unreadable RICE line: {match.group(0)}") from exc


def workflow_of(labels: list[str]) -> str:
    for label in labels:
        if label.startswith("workflow::"):
            return label.split("::", 1)[1]
    return "backlog"


def to_item(raw: dict[str, Any]) -> Item:
    labels = [str(label) for label in raw.get("labels") or []]
    milestone = raw.get("milestone") or {}
    return Item(
        iid=int(raw["iid"]),
        title=str(raw.get("title", "")),
        url=str(raw.get("web_url", "")),
        rice=parse_rice(raw.get("description")),
        workflow=workflow_of(labels),
        milestone=str(milestone.get("title") or "No milestone"),
        milestone_due=str(milestone.get("due_date") or ""),
        assignees=[str(a.get("username", "")) for a in raw.get("assignees") or []],
        labels=labels,
    )


def group_by_epic(issues: list[dict[str, Any]], epics: list[dict[str, Any]]) -> list[Epic]:
    by_title: dict[str, Epic] = {}
    for raw in epics:
        description = str(raw.get("description") or "")
        kpi_match = KPI_RE.search(description)
        by_title[str(raw["title"])] = Epic(
            title=str(raw["title"]),
            url=str(raw.get("web_url", "")),
            kpi=kpi_match["kpi"].strip() if kpi_match else "",
        )
    for raw in issues:
        item = to_item(raw)
        epic_raw = raw.get("epic") or {}
        title = str(epic_raw.get("title") or NO_EPIC)
        if title not in by_title:
            url = str(epic_raw.get("web_url") or epic_raw.get("url") or "")
            if url.startswith("/"):
                url = os.environ.get("CI_SERVER_URL", "https://git.developerdojo.org").rstrip("/") + url
            by_title[title] = Epic(title=title, url=url, kpi="")
        by_title[title].items.append(item)
    for epic in by_title.values():
        epic.items.sort(key=lambda i: (-score_of(i), i.iid))
    ordered = sorted(by_title.values(), key=lambda e: (e.title == NO_EPIC, -e.total_score, e.title))
    return [e for e in ordered if e.items or e.title != NO_EPIC]


# --------------------------------------------------------------------------- API


def api_get_all(base: str, path: str, token: str, params: dict[str, str]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    page = 1
    while True:
        query = urllib.parse.urlencode({**params, "per_page": "100", "page": str(page)})
        request = urllib.request.Request(f"{base}/{path}?{query}", headers={"PRIVATE-TOKEN": token})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read()
                next_page = response.headers.get("X-Next-Page", "")
        except urllib.error.HTTPError as exc:
            raise RoadmapError(f"GET {path} failed with HTTP {exc.code}: {exc.reason}") from exc
        except urllib.error.URLError as exc:
            raise RoadmapError(f"GET {path} failed: {exc.reason}") from exc
        try:
            chunk = json.loads(body)
        except json.JSONDecodeError as exc:
            raise RoadmapError(f"GET {path} returned invalid JSON: {exc}") from exc
        if not isinstance(chunk, list):
            raise RoadmapError(f"GET {path} returned {type(chunk).__name__}, expected a list")
        results.extend(chunk)
        if not next_page:
            return results
        page = int(next_page)


def load_live() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    token = os.environ.get("ROADMAP_API_TOKEN", "")
    if not token:
        raise RoadmapError(
            "ROADMAP_API_TOKEN is not set: the live render needs a read_api token "
            "(see docs/marketing/roadmap.md)"
        )
    base = os.environ.get("CI_API_V4_URL", "https://git.developerdojo.org/api/v4").rstrip("/")
    project = urllib.parse.quote(os.environ.get("CI_PROJECT_PATH", "WorldEnterpriseGroup/mtcottages"), safe="")
    group = urllib.parse.quote(os.environ.get("CI_PROJECT_ROOT_NAMESPACE", "WorldEnterpriseGroup"), safe="")
    issues = api_get_all(base, f"projects/{project}/issues", token, {"state": "opened"})
    epics = api_get_all(base, f"groups/{group}/epics", token, {"state": "opened", "labels": EPIC_LABEL})
    return issues, epics


def load_file(path: str) -> list[dict[str, Any]]:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except OSError as exc:
        raise RoadmapError(f"cannot read {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise RoadmapError(f"{path} is not valid JSON: {exc}") from exc
    if not isinstance(data, list):
        raise RoadmapError(f"{path} must hold a JSON list")
    return data


# ------------------------------------------------------------------------ render

CSS = """
:root{--bg:#f7f3ec;--card:#fffdf9;--ink:#1f2933;--muted:#5b6672;--line:#e3dccf;
--river:#1d4e6e;--brick:#a8442f;--high:#1f7a4d;--mid:#9a6a00;--low:#6b7280;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#12171c;--card:#1a2128;--ink:#e8edf1;
--muted:#a3adb7;--line:#2c353e;--river:#7fb6da;--brick:#e58a74;--high:#5cc28d;--mid:#e0b54a;
--low:#9aa3ad;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding:20px 16px 48px}
h1{font:600 1.6rem/1.2 Georgia,"Times New Roman",serif;color:var(--river);margin:0 0 4px}
h2{font:600 1.2rem/1.3 Georgia,"Times New Roman",serif;margin:0}
.meta{color:var(--muted);font-size:.9rem;margin:0 0 20px}
section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:0 0 16px}
.kpi{color:var(--muted);font-size:.9rem;margin:4px 0 12px}
ol{list-style:none;margin:0;padding:0}li{border-top:1px solid var(--line);padding:10px 0}
li:first-child{border-top:0}a{color:var(--river)}
.row{display:flex;gap:10px;align-items:baseline}
.score{flex:0 0 auto;min-width:3.6em;text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
.high{color:var(--high)}.mid{color:var(--mid)}.low{color:var(--low)}
.t{flex:1 1 auto}.chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 0 4.2em}
.chip{font-size:.75rem;border:1px solid var(--line);border-radius:999px;padding:1px 8px;color:var(--muted)}
.chip.ready{border-color:var(--high);color:var(--high)}.chip.doing,.chip.review{border-color:var(--brick);color:var(--brick)}
.top li .t{font-weight:600}
"""


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def score_of(item: Item) -> float:
    return item.rice.score if item.rice else -1.0


def fmt_score(item: Item) -> str:
    if not item.rice:
        return '<span class="score low" title="No RICE line in the description">?</span>'
    return f'<span class="score {item.rice.band}">{item.rice.score:.0f}</span>'


def render_item(item: Item, show_epic: str = "") -> str:
    chips = [f'<span class="chip {esc(item.workflow)}">{esc(item.workflow)}</span>']
    chips.append(f'<span class="chip">{esc(item.milestone)}{" · due " + esc(item.milestone_due) if item.milestone_due else ""}</span>')
    if show_epic:
        chips.append(f'<span class="chip">{esc(show_epic)}</span>')
    if item.assignees:
        chips.append(f'<span class="chip">@{esc(", @".join(item.assignees))}</span>')
    if item.rice:
        r = item.rice
        chips.append(
            f'<span class="chip">R {r.reach:g} · I {r.impact:g} · C {r.confidence:.0%} · E {r.effort:g}</span>'
        )
    return (
        f'<li><div class="row">{fmt_score(item)}<span class="t"><a href="{esc(item.url)}">#{item.iid}</a> '
        f'{esc(item.title)}</span></div><div class="chips">{"".join(chips)}</div></li>'
    )


def render(epics: list[Epic], generated: dt.datetime) -> str:
    all_items = [(e.title, i) for e in epics for i in e.items]
    scored = sorted((p for p in all_items if p[1].rice), key=lambda p: -score_of(p[1]))
    counts: dict[str, int] = {}
    for _, item in all_items:
        counts[item.workflow] = counts.get(item.workflow, 0) + 1
    count_text = " · ".join(f"{counts[w]} {w}" for w in WORKFLOW_ORDER if w in counts)
    parts = [
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">",
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
        "<meta name=\"robots\" content=\"noindex\">",
        "<title>Mt Cottages growth roadmap</title>",
        f"<style>{CSS}</style></head><body><main>",
        "<h1>Mt Cottages growth roadmap</h1>",
        f'<p class="meta">{len(all_items)} open issues · {esc(count_text)} · rendered '
        f'{generated.strftime("%Y-%m-%d %H:%M UTC")} · score = reach × impact × confidence ÷ effort</p>',
        '<section class="top"><h2>Top 10 by RICE</h2><ol>',
    ]
    parts.extend(render_item(item, show_epic=title) for title, item in scored[:10])
    parts.append("</ol></section>")
    for epic in epics:
        heading = f'<a href="{esc(epic.url)}">{esc(epic.title)}</a>' if epic.url else esc(epic.title)
        parts.append(f"<section><h2>{heading}</h2>")
        parts.append(
            f'<p class="kpi">{len(epic.items)} open · total RICE {epic.total_score:.0f}'
            f'{" · KPI: " + esc(epic.kpi) if epic.kpi else ""}</p>'
        )
        if epic.items:
            parts.append("<ol>" + "".join(render_item(i) for i in epic.items) + "</ol>")
        parts.append("</section>")
    parts.append("</main></body></html>\n")
    return "".join(parts)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--issues", help="saved issues JSON (offline mode)")
    parser.add_argument("--epics", help="saved epics JSON (offline mode)")
    parser.add_argument("--out", default="roadmap/index.html")
    parser.add_argument("--min-issues", type=int, default=0, help="fail when fewer open issues are found")
    args = parser.parse_args(argv)
    try:
        if args.issues or args.epics:
            if not (args.issues and args.epics):
                raise RoadmapError("offline mode needs both --issues and --epics")
            issues, epics_raw = load_file(args.issues), load_file(args.epics)
        else:
            issues, epics_raw = load_live()
        epics = group_by_epic(issues, epics_raw)
        total = sum(len(e.items) for e in epics)
        if total < args.min_issues:
            raise RoadmapError(f"found {total} open issues, expected at least {args.min_issues}")
        page = render(epics, dt.datetime.now(dt.timezone.utc))
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page, encoding="utf-8")
    except RoadmapError as exc:
        print(f"roadmap: {exc}", file=sys.stderr)
        return 1
    missing = [f"#{i.iid}" for e in epics for i in e.items if not i.rice]
    print(f"roadmap: wrote {args.out} with {total} issues in {len(epics)} epics")
    if missing:
        print(f"roadmap: {len(missing)} issues have no RICE line: {' '.join(missing)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
