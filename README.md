# Mt Cottages

_Last verified: 2026-11-13._

The guest-facing Mt Cottages site is a static Astro v7 publication for furnished stays across the Mid-Ohio Valley. It uses TypeScript 7, native HTML/CSS, and Astro’s responsive image pipeline. The public domain is `https://mtcottages.com`.

## What is in the current build

- Native Astro pages with the existing public `.html` URLs preserved.
- Responsive desktop mega-menu and mobile disclosure navigation with keyboard/Escape support.
- Shared property cards, Quick Details, amenity cards, room-by-room galleries, and location guides.
- Curated portfolio photography imported by opaque house ID and emitted as AVIF/WebP with JPG fallbacks, `srcset`, dimensions, and loading metadata.
- No jQuery, Bootstrap, Modernizr, legacy sliders, Venobox, or copied theme runtime in the marketing artifact.
- Stay inquiries are served only at `https://stay.mtcottages.com/` by the Azure application host in `infra/azure/apply-proxy` (the form is `infra/azure/apply-proxy/index.html`; the marketing site has no `/apply.html`). The form intentionally excludes SSN, full DOB, payment-card, and bank fields.

## Photo workflow

Use only exact house folders under `assets/images/cottages/`, review images visually, and prefer recent/final portfolio frames. Exclude construction, maintenance, plumbing, tool, duplicate, uncertain, and address-revealing images. Wardah is the primary photo decision-maker; release reviews should ask her to confirm each hero and supply better final/recent substitutes where the current portfolio is weak.

Private SharePoint staging, house maps, inventory exports, and manifests remain ignored. Exact street addresses must not appear in public content or filenames.

## Local development

```bash
npm ci
npm run check
npm run build
npm run preview
```

For browser validation, serve the built output and run Playwright:

```bash
python3 -m http.server 4174 --directory dist --bind 127.0.0.1
BASE_URL=http://127.0.0.1:4174 npm --prefix e2e test
```

The release checks also include:

```bash
python3 scripts/check-form-parity.py
git diff --check
```

## Deployment

`gh-pages` is the published source branch. On a push to it, `.github/workflows/ci-cd.yml` on the GitHub copy runs type-checking, the Astro build, privacy/runtime and street-address guards, the apply-proxy unit tests, form parity, local Chromium checks (`e2e/`), then `publish-pages` (GitHub Pages) and the safe application-edge `live-smoke` suite. Pull requests run the same checks without publishing. gh-pages runs queue rather than cancel each other: a deploy takes about 25 minutes, and cancelling in-progress runs let a stream of merges starve every deploy (#19). `CNAME` and `public/.nojekyll` keep the custom domain configured.

`gh-pages` reaches the GitHub copy through the `weg-ghpages-mirror` CronJob (short-lived GitHub App token), not through GitLab CI: the `mirror` job in `.gitlab-ci.yml` runs on `gh-pages` with `GITHUB_MIRROR_EXTERNAL=true` and pushes nothing. GitLab CI also runs a read-only `validate` preflight (form parity, `jq empty` on the Azure JSON, `.nojekyll` and `CNAME`) on `main` and merge requests.

The live site names its own build: `https://mtcottages.com/build.json` holds the commit it was built from (`integrations/build-stamp.mjs`). `scripts/check-live-build.py` is the post-deploy gate on it. The GitHub `live-smoke` job waits for its own commit before testing. The GitLab `verify:site-live` job, on gh-pages and main pushes and schedules, fails when the live build does not reach that commit (or a newer gh-pages commit containing it) within 85 minutes, and fails at once on main when main holds a commit gh-pages lacks.

GitLab CI is the only path that publishes the stay application host: a change under `infra/azure/apply-proxy` on `gh-pages` is tested, packaged, deployed to the Azure Function App and smoke-tested by the `*:apply-proxy` jobs. See `infra/azure/README.md`.

`main` is GitLab's default branch but never deploys. On 2026-11-13 `main` was merged into `gh-pages` (WorldEnterpriseGroup/mtcottages#3), bringing the apply-proxy health and SCM lock-down fixes (FocusApiary/infrastructure#509/#510), the launch-sequence CI include and the `validate` job onto the live branch, and `main` was then fast-forwarded to that `gh-pages` tip. Branch from `gh-pages` for site work; land fixes there and fast-forward `main` after, so the two do not diverge again.
