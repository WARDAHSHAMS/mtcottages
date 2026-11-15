# Mt Cottages: keyword universe

_Owner: growth strategist (WorldEnterpriseGroup/mtcottages#11). Researched 2026-11-15. The data lives in [`keyword-universe.csv`](keyword-universe.csv); this page explains how to read it and what it means for the roadmap._

## How this was built, and how far to trust it

We have no paid keyword tool. Adding one (Ahrefs, Semrush and similar) is an owner decision (D8 in `brand-and-positioning.md`). This first pass uses free evidence only:

| Source | What it gives | Used for |
|---|---|---|
| Google autocomplete (`suggestqueries.google.com`, 2026-11-15) | Phrases real people type often enough to be suggested | Proof that a phrase has demand. An empty suggestion list means the phrase is long tail. |
| Competitor pages (Furnished Finder, TravelNurseHousing.com, BlueCollarHousing, Apartment Finder, Airbnb monthly) | Which phrases competitors build pages for, and their listing counts | Difficulty, and proof of commercial intent |
| Local knowledge of employers, hospitals, campuses and attractions | Entity seeds | Building the town × audience grid |

**Volume** (`est_monthly_volume`) is an order-of-magnitude band of US monthly searches, inferred from autocomplete presence, the position of the suggestion, and the size of each town (Parkersburg metro about 89,000, Marietta about 13,000 with Washington County about 59,000, Ravenswood about 3,600). Treat bands as relative, not absolute.

**Confidence**: `medium` means the exact phrase appeared in autocomplete or on a competitor page. `low` means the row is a seed we expect to exist from the grid, with no direct evidence yet.

**Difficulty** reflects who ranks today: `high` means national portals and big brands (Zillow, Apartments.com, Airbnb, the hospital's own site); `low` means thin or no dedicated pages.

**Next step:** once Google Search Console is verified for mtcottages.com (Measurement epic), replace these bands with real impression data every month, and record confidence `high`.

## The grid

**Towns:** Parkersburg WV, Marietta OH, Ravenswood WV (live homes), and Vienna WV, Belpre OH, Williamstown WV, Ripley WV (nearby towns, served by our Parkersburg, Marietta and Ravenswood homes).

**Stay lengths:** nightly, weekly, monthly / 30+ days, 13-week (a travel contract), month-to-month, long-term (6 to 12 months or more).

**Audiences:** travel nurses and medical residents, corporate and project crews, insurance displacement, relocating families, visiting families and college visitors, tourists, long-term tenants (personas P1 to P7 in `brand-and-positioning.md`).

**Intents:** transactional ("furnished rentals X"), commercial comparison ("hotels near X"), navigational ("camden clark medical center"), informational ("things to do in X", "moving to X", "X schools").

## What the data says

1. **"Marietta" is owned by Georgia.** Plain "marietta" autocompletes to Marietta GA ("short term rentals marietta ga", "things to do in marietta ga"). Every Marietta page title, H1 and schema `addressRegion` must say **Marietta, Ohio** (or OH), and we target "marietta ohio" phrases only.
2. **Head transactional terms exist for both main towns:** "furnished apartments parkersburg wv", "short term rentals parkersburg wv", "furnished apartments marietta ohio", "short term rentals marietta ohio". These are our money pages: one town landing page each, built to answer "furnished rental in <town>" better than the listing portals.
3. **Hospital demand is navigational, and that's the angle.** People search the hospital names ("camden clark hospital parkersburg wv", "memorial health system marietta oh") far more than "travel nurse housing <town>", which returns no autocomplete. Our hospital landing pages should rank for "<hospital> + housing / near", and carry the most useful commute data on the web for staff of that hospital.
4. **Medical residents are an under-served audience.** Autocomplete shows "memorial health system marietta oh family medicine residency" and "...emergency medicine residency". Residents stay for 1 to 3 years and need furnished homes near the hospital, so they are a near-perfect long-stay fit.
5. **Plants are searched by name** ("chemours washington works", "constellium ravenswood", with "...jobs" and "...pay rate"). Per-employer corporate housing pages with drive-time tables are cheap to build and uncontested.
6. **Tourism is the volume play.** "blennerhassett island" (ferry schedule, tickets price), "things to do in marietta ohio", "marietta ohio sternwheel festival 2026", and restaurants in every town. These build topical authority and links. Each article ends with a CTA into a home.
7. **Long-term rent terms are high volume, high difficulty** ("houses for rent parkersburg wv" and "...by owner"). We are a furnished, premium product, so we should only aim at the slice with a furnished or flexible modifier, and use these terms in our "true monthly cost" comparison content.
8. **Insurance displacement has no local search footprint.** Searches are national ("ALE housing", "temporary housing insurance claim"), and the real channel is adjusters and housing coordinators. One landing page for credibility, and the rest is owner-led outreach.
9. **Ravenswood and the satellite towns are long tail.** Little volume and almost no competition. A single strong guide per town ranks quickly, and Ravenswood school and football searches show families live there.

## Page plan the backlog builds

| Cluster | Pages | Primary keywords | Epic |
|---|---|---|---|
| Town money pages | `/parkersburg/furnished-rentals/`, `/marietta/furnished-rentals/`, `/ravenswood/furnished-rentals/` | furnished apartments / short term / monthly rentals + town | Local SEO foundations |
| Hospital landing pages | Camden Clark, Memorial Health Marietta, Jackson General, residents | <hospital> housing, near <hospital> | Audience hubs |
| Employer landing pages | Washington Works area, Constellium Ravenswood, crews | housing near <employer>, crew housing | Audience hubs |
| Stay-length hubs | `/stays/monthly/`, `/stays/13-week/`, insurance | 30-day, month-to-month, 3-month | Conversion funnels |
| Town guides | moving to, neighbourhoods, schools, cost of living | moving to <town>, <town> schools | Content engine |
| Attraction guides | Blennerhassett, Sternwheel Festival, things to do, restaurants | named attractions and events | Content engine |
| Satellite town guides | Vienna, Belpre, Williamstown, Ripley | <town> furnished rental, apartments for rent <town> | Content engine |

Every page in this plan has an issue in the backlog (see the RICE roadmap linked on #11).

## CSV columns

`keyword, town, stay_length, audience, intent, est_monthly_volume, difficulty, confidence, evidence, target_page, priority`. Priority 1 means a money page or an audience we are built for; 2 means supporting authority content; 3 means only worth it as a section of a bigger page.
