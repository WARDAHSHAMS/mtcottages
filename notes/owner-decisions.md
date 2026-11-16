# Decisions for Suzanne: facts the microsites do not state yet

Checked 2026-11-01 against the live pages for Frederick, Henrietta, Oak and Broad. The four microsites publish none of these, because none is confirmed. Each stays off the site until the owner answers.

| # | Home | Fact | What the data file says | Why it is not on the site | Who answers |
|---|---|---|---|---|---|
| 1 | Henrietta, Oak, Broad | Monthly price | `_data/houses.json`: Henrietta $2,295, Oak $2,575, Broad $1,895 (Frederick's $2,575 guide is published and tested) | Only Frederick's guide is owner-confirmed | Suzanne |
| 2 | Henrietta, Oak, Broad, Frederick | Security deposit and application fee | houses.json: deposits $1,045 / $1,375 / $895 / $1,395; fee $75. The stale $1,395 is banned in Frederick copy by a test | Not confirmed | Suzanne |
| 3 | All four | Square footage | No value in the data | Never recorded | Suzanne, or Wardah from the floor plans |
| 4 | All four | Availability and move-in dates | "Available now" appears only in the site menu, not per home | Availability changes; a per-home claim needs an owner | Suzanne |
| 5 | Henrietta | Bathrooms | houses.json now says 2 as photographed, count to confirm (#26, 2026-11-15); the microsite says "Two bathrooms appear in the photos" | The official count is unconfirmed | Suzanne or Wardah |
| 6 | All four | Real front-of-house hero photos | Some heroes use the strongest honest room or outdoor image | Site rule: no generated photography; Wardah picks substitutes | Wardah |

## Listings match (#70, read 2026-11-16)

The CEO ruled on 2026-11-16 that the agents match the site to our own live listings and decide the open owner items, with no questionnaire. The listings were read the ordinary way, read-only, in a normal browser on 2026-11-16. No message was sent to a guest or host.

**What was found.** Furnished Finder carries two of the six site homes under the Mt Cottages name. A third Mt Cottages listing, "Cute Guest House by Mt Cottages" (Marietta, OH, 1 bedroom, $1,750/month, utilities included), is not one of the site's homes and is not published here. No public Airbnb listing under the Mt Cottages name was found, so Furnished Finder (the monthly-stay platform) is the source for every fact below. Under the CEO's rule, Furnished Finder would win for monthly stays anyway, and the site sells only monthly stays. Cloudflare blocked the Marietta and Ravenswood Furnished Finder searches and the property pages after the first search ("Sorry, you have been blocked"); the block was not worked around. The Broad and Oak facts come from the Parkersburg and Belpre search results, which show each listing's card.

| Home | Listing (source) | Monthly rate | Utilities | Available | Minimum stay | Listing bedrooms | Response |
|---|---|---|---|---|---|---|---|
| Broad | Furnished Finder 317243, "Broad St Bungalow by Mt Cottages", https://www.furnishedfinder.com/property/317243_1 | $1,875 | Included | Nov 17, 2026 | 30 days (platform minimum) | 2 bed / 1 bath | "Fast responder" badge |
| Oak | Furnished Finder 920512, "Oak House by Mt Cottages", https://www.furnishedfinder.com/property/920512_1 | $2,585 | Included | Jun 10, 2027 | 30 days (platform minimum) | 4 bed / 1 bath | "Fast responder" badge |
| Frederick, Buck, Henrietta, Virginia | No public listing found | Unchanged (Frederick confirmed; the others keep the bedroom-count guide) | Included (policy, below) | On inquiry | One month (Frederick's listing says 30 days) | Site counts | — |

**Bedroom drift.** The listings say 2 bedrooms for Broad and 4 for Oak, but the site says 1 and 3. The site counts are backed by the photographs and the floor plans, so the site keeps them. The drift is recorded in `_data/houses.json` (`listing_source.listed_bedrooms`) for the listing owner to correct on Furnished Finder.

**Applied in `src/data/terms.json` and `_data/houses.json`, each fact with its source and date read:**

- **Broad:** rate confirmed at $1,875 (it was the $1,895 guide), utilities included, 30-day minimum, available from Nov 17, 2026. All from listing 317243.
- **Oak:** rate confirmed at $2,585 (it was the $2,575 guide), utilities included, available from Jun 10, 2027. All from listing 920512. Broad and Oak now publish a schema.org Offer, because their rates are confirmed.
- **Utilities included, every home** (closes T1): every Mt Cottages Furnished Finder listing includes utilities, and Frederick's rental arrangement already said so.
- **No pets, every home** (closes T2): from the house rules in the ops SOP "Respond to Inquiry" (no pets, no smoking, no overnight guests, quiet hours, designated parking, trash on Sundays).
- **One-month minimum, every home** (closes T3): Broad from its listing; Henrietta from policy, the same as every other home. Furnished Finder's own minimum is 30 days, and ops rents month to month or 3 months paid.
- **Still to confirm, and shown as "confirm on inquiry":** the security deposit (row 2; the deposit is set at booking through KeyCheck) and availability for the four homes without a listing (row 4). Cancellation is not a platform term on Furnished Finder; the lease governs it, so the site states none.

**Decisions on the 11 owner-decision items** (made by the agent under the CEO's 2026-11-16 ruling; the reason for each is also recorded on the issue):

| Issue | Decision | Reason |
|---|---|---|
| #70 Owner pass | Settled by this listings match | The CEO replaced the questionnaire with listing evidence |
| #36 Policies | Publish the matched house rules and terms | They come from the ops SOP and the live listings, not from guesses |
| #37 Google Business Profile | Service-area profile, no public address | The homes are rentals with no staffed office; the four approved addresses stay on their own pages |
| #38 People and the "Mt" story | No named people; the "Mt" story is not explained | No owner-approved bios exist, and inventing a story breaks the honesty rule |
| #34 / #42 Direct billing and ALE | Proceed on the existing KeyCheck / Furnished Finder payment flow; no new direct invoicing | A new billing path is a billing change, which is the CEO's alone |
| #60 Reshoot | Wardah reshoots, at no cost | Photo curation is already hers, and the hero gaps are known |
| #80 Video | Wardah films walkthroughs, at no cost | Same owner and the same review flow as the photos |
| #61 Reviews | Ask for free Google reviews, with consent only; no paid or gated reviews | Platform rules, and no incentive is involved |
| #68 Stays under 30 nights | Not offered; no short-stay offer or page is added | Furnished Finder's 30-day minimum and ops' month-to-month terms |
| #27 Brand | Option A ("River & Brick") is chosen on the evidence, but it is **not applied** | Applying it is a public rebrand of a going business, which is the CEO's alone, so #27 keeps `owner-decision` |

**Phone and response time.** The site publishes no phone line, because the business has no public line (Twilio handles bot calls only), so the form and stay@mtcottages.com stay the contact path. Ops replies to an inquiry within minutes (the SOP), and both listings carry Furnished Finder's "Fast responder" badge. That is a practice, not a promise, so the site makes no timed reply promise, and the hub tests keep it that way.

## Price drift for the owner pass (#71, for #70)

Checked 2026-11-15. Row 1 above says only Frederick's monthly guide is owner-confirmed, but the site shows the bedroom-count guide (`publishedLuxuryFurnishedRates` in `src/data/site.ts`) for every listed home: on the home cards (home page, cottages.html, the Ravenswood and guide pages) and as the "Monthly guide" fact on each microsite (`priceGuide`). Nothing was changed: no price moves without the owner's answer. The town landing pages (/parkersburg/, /marietta/) already show only Frederick's price. `e2e/tests/site.spec.js` pins the card prices below, so a change fails until this table is updated with the owner's answer.

| Home | Shown on the site | `_data/houses.json` (12 months / short) | Owner-confirmed? | Drift |
|---|---|---|---|---|
| Frederick | $2,575/month | $2,575 / $2,575 | Yes | None |
| Broad | $1,875/month | $1,875 / $1,875 | Yes, from its Furnished Finder listing (#70, 2026-11-16) | None |
| Buck | $1,895/month | $1,895 / $1,895 | No | Shown but unconfirmed |
| Oak | $2,585/month | $2,585 / $2,585 | Yes, from its Furnished Finder listing (#70, 2026-11-16) | None |
| Virginia | $2,295/month | $2,295 / $2,295 | No | Shown but unconfirmed |
| Henrietta | $2,295/month | $2,295 / $2,295 | No | Shown but unconfirmed |

The figures agree everywhere; the drift is that five homes publish a price the notes call unconfirmed. Deposits and the $75 application fee (row 2) are not published anywhere. Owner question for #70: confirm each guide, or say which homes should show "confirm on inquiry" instead.

## Virginia Cottage (Ravenswood, #7)

Added 2026-11-13 with the Virginia microsite (/ravenswood/virginia-cottage/). The page marks each of these "Confirm on inquiry" until answered. Rows 1 to 4 above apply to Virginia too.

| # | Fact | What the site shows now | Why it is not stated | Who answers |
|---|---|---|---|---|
| V1 | Street address | Town only (Ravenswood, WV), town-centre map with no pin | Not on the owner-approved address list in CLAUDE.md | Suzanne |
| V2 | Bathrooms | A powder room is photographed; no full bathroom photo | Count never confirmed | Suzanne or Wardah |
| V3 | Kitchen photo | Kitchen is listed, with no photo on the microsite | The only kitchen frame (ravenswood-02 photo-54) shows cleaning supplies, an extinguisher and an open switch box | Wardah: reshoot or pick a substitute |
| V4 | Sunroom photo | Not shown | The only frame (photo-77) is an empty room with a patched outlet and a vacuum | Wardah |
| V5 | Bedroom photos | The sunny room with a chest of drawers is shown, but not called a bedroom | No photo shows a bed; which rooms are bedrooms is unknown | Wardah |
| V6 | Fireplace | Photographed, use "to be confirmed" | Whether it is usable (it holds a pipe) is unknown | Suzanne |
| V7 | Front-of-house hero | Hero is the fireplace room | No clean exterior photo exists | Wardah |

Portfolio review, 2026-11-14 (#10, candidate list in issue note 364397): every `ravenswood-02` frame labelled kitchen, bath, bedroom, sunroom or exterior, plus the ten highest-rated frames, was viewed. The house was photographed mid-renovation, and no frame is clean enough to publish (tools, supplies, boxes, exposed lath, stripped wallpaper, bare ceiling wires). The hand-drawn room sketches and the breaker-panel labels are internal evidence only and are never published. They suggest these answers, still to be confirmed:

- V2: two bathrooms. Sketches photo-183 and photo-206 show a 2nd-floor bathroom with a tub, and the panel lists "Bath 1" and "Bath 2".
- V5: both bedrooms upstairs. Sketch photo-188 is a "Middle bedroom", sketch photo-211 a carpeted "2nd floor back room", and the panel lists "2F bedroom" and "2F back bed".

## Wardah's photo review, Nov 2026 (#10)

Requested by Atlas in the Tao Precision chat on 2026-11-14 at 08:29Z. The question IDs (B, V, F, M, Y, W) match the candidate list in #10 issue note 364397 and the review page sent to Suzanne Conejos.

CEO directive, #10 note 370119 (2026-11-15): decide every open question without waiting, ship Buck, Virginia and Frederick, and treat Suzanne's answers as optional feedback for a v2. The picks below are live. Rule used: editorial and photo choices are decided outright; a fact is stated only when there is evidence for it, otherwise it stays "confirm on inquiry".

### Buck and Virginia, and the layout pages (decided 2026-11-15)

| # | Pick | Reason |
|---|---|---|
| B1 | Keep photo-49 as the hero | The strongest clean frame; the front-of-house photos show the house number, and the address is not approved |
| B2 | Add photo-45, the covered front porch | A real, clean exterior view with nothing address-revealing |
| B3-B6 | Desk room, bathroom count, cooking, bed, TV, laundry and parking stay "confirm on inquiry" | No photo or record settles them; what the photos show (toaster oven and microwave, bedroom TV, one full bath) is already listed |
| V2 | Two bathrooms: a powder room down, a full bath with a tub up (still marked confirm) | Room sketches photo-183/206 and the breaker panel (Bath 1, Bath 2) agree |
| V3 | Keep the kitchen photo gap; reshoot requested | The only frame (photo-54) is a maintenance frame |
| V4 | Leave the sunroom unmentioned | The only frame (photo-77) is a maintenance frame, and nothing else shows the room |
| V5 | Both bedrooms upstairs, a middle and a back room (still marked confirm) | Sketches photo-188/211 and the panel (2F bedroom, 2F back bed) agree |
| V6 | Keep the fireplace "use to be confirmed" | A pipe sits in the firebox; whether it works is unknown |
| V7 | Keep photo-117, the fireplace room, as the hero | No clean exterior frame exists |
| V8 | Reshoot list: front of house, kitchen, both bedrooms, upstairs bath | These are the gaps the page shows |
| M1-M6 | Illustrative layouts kept as they are, with Virginia's upper floor adding the bathroom | Each is labelled illustrative and matches the photos and sketches |

### Frederick Cottage (open items from #8)

| # | Question | Site today | Answer |
|---|---|---|---|
| F1 | `frederick-ext-2.jpeg` | Left out. The number painted on the porch column does not read as Frederick's approved number | Decided: stays out. A visible number that does not match the approved address must not publish |
| F2 | Rights to the 14 nearby business photos | Left out; nearby places are text plus map links | Decided: stays out. We hold no rights to them (a legal matter, so only an owner can reverse it) |
| F3 | Bath: tub or shower | "Confirm on inquiry" | Decided: stays "confirm on inquiry". The photo shows only a shower curtain |

### Yellow Cottage (`parkersburg-03`): record only

Not published, by CEO decision 2026-11-14 (not ready). Nothing here goes live. The parked microsite is on branch `park/yellow-walnut`.

| # | Question | What the parked branch says | Answer |
|---|---|---|---|
| Y1 | Finished interior photos | The curated photo-448 (kitchen backsplash) and photo-468 (bathroom light) are maintenance close-ups | Awaiting Suzanne (optional); nothing goes live |
| Y2 | Bathroom count, and tub or shower | Unknown | Awaiting Suzanne (optional); nothing goes live |
| Y3 | Entrance step count | Unknown | Awaiting Suzanne (optional); nothing goes live |
| Y4 | Bed sizes and which floor each bedroom is on | Unknown | Awaiting Suzanne (optional); nothing goes live |

### Walnut Cottage (`ravenswood-01`): record only

No microsite, by CEO decision 2026-11-14. Nothing here goes live.

| # | Question | What the parked branch says | Answer |
|---|---|---|---|
| W1 | Sleeping arrangement | A second made bed shows, though the home is listed as one bedroom | Awaiting Suzanne (optional); nothing goes live |
| W2 | Fireplace | A mantel is shown; whether it can be used is unknown | Awaiting Suzanne (optional); nothing goes live |
| W3 | Bathroom count, and tub or shower | Unknown | Awaiting Suzanne (optional); nothing goes live |
| W4 | Guest use of the yard and shed | Unknown | Awaiting Suzanne (optional); nothing goes live |

Labelled AI 3D and concept views are allowed on the sites (each carries a visible "AI-generated concept" label). Photos are never generated.

## Rates and terms (#72)

Added 2026-11-15. `src/data/terms.json` holds every home's monthly rate, deposit, minimum stay, utilities, pets and move-in date, and each "Confirm on inquiry" entry there names its row here (`"ask"`). Rows 1, 2 and 4 above cover the rate, the deposit and availability. When the owner answers, set that home's entry to `"status": "confirmed"` with the value and a source, in one merge request: the microsite block, the cottage card and the Offer structured data all update from it. A confirmed monthly rate is what publishes an Offer.

| # | Home | Fact | What the site shows now | Why it is not stated | Who answers |
|---|---|---|---|---|---|
| T1 | All listed homes | Which utilities the monthly rate includes | "Confirm on inquiry" (Frederick: "included per the rental arrangement") | No per-home list of what is covered | Suzanne |
| T2 | All listed homes | Pet policy (allowed, fee, limits) | "Confirm on inquiry" | Never recorded | Suzanne |
| T3 | Broad, Henrietta | Minimum stay | "Confirm on inquiry". Frederick lists 30 days; Buck, Oak and Virginia say "a month or longer" | Neither page states a minimum | Suzanne |
