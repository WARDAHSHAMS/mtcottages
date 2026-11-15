# ADR: cookieless, first-party analytics for mtcottages.com

_Status: accepted 2026-11-15 (WorldEnterpriseGroup/mtcottages#23). Licence cost: $0. Running cost: Azure Table Storage in an account we already pay for, well under $1 a month at our volume._

## Decision

We count visits and conversions with our own small collector on the stay host, not a third-party analytics product.

- **Beacon.** Every page of mtcottages.com sends a `pageview`, and every click on an inquiry link (any link to stay.mtcottages.com) sends a `cta_click`, to `POST https://stay.mtcottages.com/api/collect` (`src/components/Analytics.astro`). The stay form sends `form_view`, `form_start` (first input) and `form_submit` (only after the inquiry was accepted) to the same endpoint (`infra/azure/apply-proxy/index.html`).
- **Collector.** `infra/azure/apply-proxy/analytics.py`, served by the existing Function App `mtcottages-apply-proxy`. Each accepted beacon is one row in Azure Table Storage in the Function App's own host storage account (`AzureWebJobsStorage`): one table per month (`mtcevents202611`), one partition per UTC day.
- **Dashboard.** `GET https://stay.mtcottages.com/api/stats` (HTML; `?format=json`; `?days=7|30|90`) shows totals, a daily table, top pages, inquiry clicks by source, home and audience, the form funnel by home and audience, and referring sites. It needs the Function App's function key: staff open it as `/api/stats?code=<key>`, and the key is read in the Azure portal (Function App → App keys → `default`). Never paste the key into chat, git or a ticket.
- **Proof in CI.** After every deploy of the stay host, `smoke:apply-proxy` opens the live form as labelled test traffic and types into it (never submits), and `verify:analytics` (`infra/azure/analytics-verify.sh`) reads the dashboard with the function key and fails unless that run's `form_view` and `form_start` are counted. The GitHub Pages live smoke checks that the published microsite's page view and inquiry click reach the collector.

## What is recorded, and what never is

| Recorded per event | Never recorded |
|---|---|
| event name; page path (no query string or fragment); home id (`frederick`); audience slug (`healthcare`, `travel-nurse`); CTA source slug (`hero`, `header`, `inquiry-panel`); hostname of an external referrer; site (`site` or `stay`); a test label for CI traffic | IP address, user agent, any cookie or browser storage, any identifier or fingerprint, form field values, full referrer URLs, query strings |

The IP address is used in memory only, to throttle floods (60 events per minute per address). Crawlers and audit tools (`bot`, `Lighthouse`, `HeadlessChrome` without a test label, …) are dropped. A webdriver-controlled browser labels its beacons, so CI traffic lands in a separate `test-` partition and the dashboard shows it apart from real traffic. Browsers that send Global Privacy Control or Do Not Track send nothing. Tables older than 13 months are deleted by the monthly `purge_analytics` timer.

Because nothing is stored on the visitor's device, no cookie banner is needed. The privacy notice (`/privacy.html`, "Visit counts without cookies") says so in plain words.

## Options considered

| Option | Licence | Why not chosen |
|---|---|---|
| **First-party collector on the stay Function (chosen)** | $0 | We build and own a small module, but it runs on infrastructure this repo already deploys, needs no new resource, approval or secret, and gives us exactly the events and dimensions the growth plan needs (home, audience, CTA source). |
| Self-hosted Plausible CE or Umami on the cluster (GitOps) | $0 | Our cluster has no public ingress by policy (Ziti ZTNA, no public DNS for internal services), and a public beacon endpoint needs one. It would also need a database and storage decision from the storage steward, and changes in other repos. It costs more to run and secure than the problem is worth at our traffic. Revisit if we outgrow the Table design (millions of events a month). |
| Cloudflare Web Analytics | $0 | It counts page views only, with no custom events, so it cannot count inquiry clicks or form steps. mtcottages.com is also served by GitHub Pages, not through Cloudflare's proxy. |
| Azure Application Insights (browser SDK) | $0 up to 5 GB | Its browser SDK sets cookies by default and sends rich device and session data, and our own rules would have to strip most of it. Tying conversions to home and audience would still need custom code. |
| Google Analytics 4, hosted Plausible, Fathom, hosted GoatCounter (commercial) | free with data trade-offs, or paid | GA4 needs a cookie banner and shares data with Google. The privacy-first hosted tools charge a subscription, and any paid tool is an owner decision (D8 in brand-and-positioning.md). |

## Consequences

- Counts are page views and actions, not unique people. That is the price of storing no identifier, and we accept it.
- The dashboard is deliberately plain. When we need more (cohorts, goals over time), we export the JSON or point a notebook at it before reaching for a product.
- The function key is the dashboard credential. Moving the dashboard behind Entra ID (App Service Authentication) is the upgrade path once more than a few staff need it.
- Event names and dimensions are a contract between the site, the form and the dashboard. #20 (sitewide "Check dates" CTA) adds `audience` and `src` to every inquiry link, and these flow straight into the funnel tables.
