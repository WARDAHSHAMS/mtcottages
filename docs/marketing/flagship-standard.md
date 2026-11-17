# The flagship standard for home microsites

Issue #65. Checked 2026-11-17 against `gh-pages` plus merge request !61 (Wardah's Broad kitchen photos and the distance rows for #30 and #39). The CEO wants every home at the Frederick standard or better. This page makes "Frederick standard" measurable, scores the six live microsites against it, and links one follow-up issue per gap.

Every microsite renders from one shared template (`src/pages/[town]/[home]/`) and one data file per home (`src/data/homes/<id>.ts`). Most gaps are therefore gaps in data and photography, not in code. The template parts (call to action, structured data, distance table, Lighthouse and accessibility gates) are the same for every home.

## The checklist

Each item scores 2 (at the standard), 1 (partly there) or 0 (missing). The maximum is 22.

| # | Item | At the standard (2) means | Where it lives |
|---|---|---|---|
| 1 | Story | A tagline, a summary that says only what the photos, the listing or the owner support, and three highlights, each with a real photo | `tagline`, `summary`, `highlights` |
| 2 | Hero | A clear front-of-house photo. An honest room photo scores 1; a gap is never filled with another home's photo or a generated image | `hero` |
| 3 | Room galleries | Every room on the tour has a photo, and the main rooms (kitchen, bedrooms, bathroom, living) have two or more | `rooms[].photos` |
| 4 | Distances | At least 10 measured drives in at least 4 categories, each with its source and date, measured from the approved address or a labelled town centre | `_data/distances.json`, `DistanceTable.astro` (#25, #30, #39) |
| 5 | Neighbourhood | At least 15 nearby places in at least 5 kinds, with map links (and walking routes where the address is approved) | `nearby`, `directionsFrom` |
| 6 | Call to action | "Check dates" pre-filled with the home, and "See distances" from every page | `HomeLayout.astro`, `CheckDates.astro` |
| 7 | Structured data | Home and breadcrumb JSON-LD on every page; an Offer only where the rate is owner-confirmed | `src/data/homes/schema.ts` |
| 8 | Guest FAQs | Per-room questions answered on the photo tour, each with the status of its evidence | `rooms[].faqs` |
| 9 | Resident guide | A guide page (utilities, house rules, arrival) | `guide` |
| 10 | Plan and concepts | An illustrative floor plan and 3D model, plus labelled AI concept images | `plan`, `concepts` |
| 11 | Lighthouse and accessibility | Lighthouse mobile 95 or more in every category on the overview, tour and location pages; no axe violations | `scripts/lighthouse-gate.mjs`, the Playwright axe run |

Not scored here, because only the owner can move them: the "confirm on inquiry" facts and the rate status (#74), and new photography (#60).

## Scores

| Item | Frederick | Broad | Oak | Henrietta | Buck | Virginia |
|---|---|---|---|---|---|---|
| 1 Story | 2 | 2 | 2 | 2 | 2 | 2 |
| 2 Hero | 2 (front of house) | 1 (living room) | 1 (dining room) | 1 (dining room) | 1 (living room) | 1 (fireplace room) |
| 3 Room galleries | 2 (5 rooms, 2 to 7 photos each) | 2 (5 rooms; kitchen added by Wardah, !61) | 2 (7 rooms, 2 to 4 each) | 1 (second bedroom not photographed) | 1 (one photo in most rooms; no cooktop shown) | 0 (no kitchen photo, no bed, no full bath) |
| 4 Distances | 2 (14 drives, 7 categories) | 2 (11, 7) | 2 (11, 7) | 2 (11, 7) | 2 (10, 7; from the Parkersburg town centre) | 2 (10, 7; from the Ravenswood town centre) |
| 5 Neighbourhood | 2 (40 places, walking routes) | 1 (9) | 1 (7) | 1 (9) | 1 (7, town list) | 1 (8, town list) |
| 6 Call to action | 2 | 2 | 2 | 2 | 2 | 2 |
| 7 Structured data | 2 | 2 (with Offer) | 2 (with Offer) | 2 | 2 | 2 |
| 8 Guest FAQs | 2 (22) | 2 (11, #87) | 2 (12, #87) | 2 (12, #87) | 2 (10, #87) | 2 (10, #87) |
| 9 Resident guide | 2 | 0 | 0 | 0 | 0 | 0 |
| 10 Plan and concepts | 2 | 2 | 2 | 2 | 1 (plan, no concepts) | 1 (plan, no concepts) |
| 11 Lighthouse and accessibility | 2 | 2 | 2 | 2 | 2 | 2 |
| **Total (of 22)** | **22** | **18** | **18** | **17** | **16** | **15** |

Counts come from the data files on 2026-11-17. Item 11 is enforced on every merge request, and the last `gh-pages` pipeline (#148084) passed it. Scores that moved with !61: Broad's galleries went from 1 to 2 (Wardah's four kitchen photos), Virginia's distances from 1 to 2 (its tenth measured drive), and every home's guest FAQs from 0 to 2 (cluster A, #87). Before !61 the totals were Broad 13, Oak 14, Henrietta 13, Buck 12 and Virginia 10.

Every FAQ answer carries the status of its evidence. Answers come only from the photos, the listing or `terms.json`; anything else says to ask us, and the shared maintenance answer points to the sitewide maintenance path. Playwright requires at least eight answered questions with a badge on every home's tour.

Open "confirm on inquiry" lines, for reference (from the `status: "confirm"` entries in each data file): Frederick 17, Broad 16, Oak 19, Henrietta 22, Buck 14, Virginia 15. Rates: only Broad and Oak are owner-confirmed, so only they publish an Offer. Frederick's monthly guide is not yet marked confirmed in `src/data/terms.json` (#74).

## Gap clusters and follow-ups

| Cluster | Homes | Points open | Needs the owner? | Issue |
|---|---|---|---|---|
| A. Per-room guest FAQs | Broad, Oak, Henrietta, Buck, Virginia | 0 (closed in !61) | No: answers come from the photos, the listing and `terms.json`, and the rest say "confirm on inquiry" | #87 |
| B. Nearby-places depth | Broad, Oak, Henrietta, Buck, Virginia | 5 | No | #88 |
| C. Resident guide page | Broad, Oak, Henrietta, Buck, Virginia | 10 | Partly: utilities and house rules are on record (#70); arrival details go in as "confirm" | #89 |
| D. AI concept images | Buck, Virginia | 2 | Wardah draws them | #90 |
| E. Front-of-house heroes and room photo gaps | Broad, Oak, Henrietta, Buck, Virginia (heroes); Henrietta, Buck, Virginia (rooms) | 9 | Yes: Wardah reshoots | #60 (existing reshoot brief) |
| F. "Confirm on inquiry" facts and rates | All six | not scored | Yes | #74 (existing; waits on the owner) |

Order of work: A is done; B next (no owner answer needed), then C, then D and E when Wardah's images arrive. Clearing B and C would bring Broad and Oak to 21, Henrietta to 20, and Buck and Virginia to 19 and 18. Re-score this page whenever a cluster closes.
