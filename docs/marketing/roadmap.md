# Growth roadmap page

The CEO-readable roadmap is one static HTML page: every open issue in this project, ranked by RICE and grouped by growth epic, with its workflow state, milestone and owner. It is phone-first and works in light and dark mode.

**Link (always the newest render on `main`):**
https://git.developerdojo.org/WorldEnterpriseGroup/mtcottages/-/jobs/artifacts/main/file/roadmap/index.html?job=roadmap

Anyone with access to this GitLab project can open it. It is not on the public site and carries `noindex`.

## How it is built

- `scripts/roadmap/render_roadmap.py` (Python standard library only) reads the open issues of this project and the open epics labelled `mtc-growth` in the WorldEnterpriseGroup group, and writes `roadmap/index.html`.
- The CI job `roadmap` runs it on every push to `main` and on a daily pipeline schedule ("growth roadmap daily refresh"). Run the schedule by hand from **Build → Pipeline schedules** to refresh it at once.
- `roadmap:test` runs the unit tests and an offline render from `scripts/roadmap/fixtures/` on merge requests that touch the renderer.
- The live job reads the API with `ROADMAP_API_TOKEN`, a masked CI variable holding a `read_api` project access token named `roadmap-reader` (Reporter). It only reads. The token expires after one year. To rotate it, create a new token with the same name and scope, and replace the variable with `glab variable update`.

## How an issue gets its score

Each growth issue carries one hidden line in its description, which the renderer reads:

```
<!-- rice: reach=400 impact=2 confidence=0.8 effort=2 -->
```

- **Reach:** people per quarter who see or use the change: visitors from search, audience size, or inquiries touched.
- **Impact:** 3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal effect on inquiries from that reach.
- **Confidence:** 1.0 = data-backed, 0.8 = strong evidence, 0.5 = educated guess.
- **Effort:** agent-days, from 1 to 3 for a well-sized issue.

score = reach × impact × confidence ÷ effort. Issues filed without the hidden line but with "(RICE 120)" in the title are ranked by that number. Issues with neither show "?" and are listed in the job log for grooming. The `RICE::high` label means a score of at least 100, `RICE::mid` at least 30, and `RICE::low` anything below. The page recomputes the score from the line, so if you change the inputs, update the label to match. The growth strategist checks this when grooming the backlog.
