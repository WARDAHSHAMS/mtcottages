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
