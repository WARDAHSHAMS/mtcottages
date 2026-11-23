# Mt Cottages: photo reshoot brief for Wardah

_Issue: WorldEnterpriseGroup/mtcottages#60 (growth roadmap #11). Written 2026-11-19 from the data files on `gh-pages`. Status: ready to send to Wardah through Atlas._

This brief lists, home by home, the photos the site is missing and how to take them. Every gap below comes from what the repository already says: `notes/owner-decisions.md`, the room lists in `src/data/homes/<id>.ts`, and the facts and notes still marked "confirm". Nothing here is a guess about what the homes look like.

## 1. Where the photo gaps are

Five of the six live homes use a room or outdoor frame as the hero because there is no clear front-of-house photo. Only Frederick has one.

| Home | Town | Hero today | Front-of-house photo? | Biggest gap |
|---|---|---|---|---|
| Frederick Cottage | Marietta, Ohio | Front of the house (driveway, lawn, shutters) | Yes | Tub or shower, laundry, sitting room, outbuilding |
| Broad Cottage | Parkersburg, WV | Living room | No exterior of any kind (no front, porch, entry or parking frame) | Front of house, entry and steps, parking |
| Buck Cottage | Parkersburg, WV | Living room | No. The two street-facing frames are excluded because a house number shows | Front of house with the number out of frame, cooking appliance |
| Oak Cottage | Parkersburg, WV | Dining room | No (a porch and a steps frame exist, no front) | Front of house, a consistent third bedroom |
| Virginia Cottage | Ravenswood, WV | Fireplace room | No clean exterior exists | Kitchen, both bedrooms, upstairs bath, front |
| Henrietta Cottage | Ravenswood, WV | Dining room | No ("No photo of the front of the house is available yet") | Front of house, the second bedroom |

Sources: the `hero` and `rooms` fields in each home file; `notes/owner-decisions.md` rows 6 and V1 to V8; the Buck and Virginia comments at the top of their home files.

**Why it matters.** The hero is the first picture on a home's microsite and the natural lead photo for listing channels. A real front-of-house frame also tells a stranger which house they are renting. Each "confirm on inquiry" note is a question a guest has to ask before booking; a photo that settles one lets the page state the fact.

**Out of scope.** Yellow Cottage and Walnut Cottage are parked by CEO decision (2026-11-14): no photos until the CEO says otherwise. "Cute Guest House by Mt Cottages" is a Furnished Finder listing that is not one of the site's homes, so it is not shot for the site either.

## 2. How to shoot (applies to every home)

### Light and timing
- **Daylight.** Shoot between mid-morning and mid-afternoon. Open every blind and curtain, then switch the room lights on as well so the corners are not dark. Overcast is better than harsh sun for exteriors.
- **Exteriors.** Stand across the street or at the far end of the yard, at about eye height, and take the house at a three-quarter angle with the whole roofline and the door in frame. Take one straight-on frame as well.
- **No flash.** Turn ceiling fans off so the blades are not blurred.

### Uncluttered and honest
- Clear counters, tables and floors. Fold towels, make beds, close toilet lids, empty bins, put shoes and bags away.
- **Leave in only what stays with the home.** A kettle, a coffee maker or a lamp that guests really get can stay. Do not bring in props, flowers or bedding that are not part of the home: the site promises real photos of the real home.
- Do not retouch beyond exposure, colour and a straightened horizon. No removing objects, no sky replacement, no AI edits.

### Keep out of frame
- **No tools, paint, ladders, drop cloths, cleaning supplies, shop vacuums, open electrical boxes, exposed wiring, patched walls or any other maintenance or construction sign.** These are the reasons the Virginia kitchen and sunroom frames (photo-54, photo-77) are unusable today.
- **No house numbers.** The only homes where a house number may be visible are the four owner-approved ones: Frederick, Henrietta, Oak and Broad. For Buck and Virginia, and for every other home, no number may be legible at full resolution.
- **No neighbours' house numbers**, mailboxes with numbers, street signs next to a number, or parcel labels, on any home. Oak's steps frame looks across the road at other houses, so check it.
- **No vehicles with a phone number, business name or licence plate**, and preferably no vehicles at all. Move cars out of the driveway and off the street in front of the house.
- No people, pets, children's items, personal papers, mail, photos of family, screens showing anything. Turn televisions off.
- No internal evidence: hand-drawn room sketches, breaker-panel labels and key boxes are never photographed for publication.

### Technical
- Landscape, 3:2, level and upright (vertical lines straight). Chest height for rooms, a little higher for kitchens so counters read as clean.
- Full camera resolution, at least 2400 pixels on the long edge. The listing audit already flags the small files; keep the originals unedited as JPEG or HEIC (`scripts/convert-heic-to-jpg.sh` handles HEIC).
- For each room take one wide frame from a corner or doorway, then two detail frames of what a guest cares about (the bed, the appliances, the sink).
- **File names use the opaque house id, never a street name:** `marietta-01` (Frederick), `parkersburg-01` (Broad), `parkersburg-02` (Buck), `parkersburg-04` (Oak), `ravenswood-02` (Virginia), `ravenswood-03` (Henrietta). Example: `parkersburg-04-bedroom-3-wide.jpg`.
- Deliver originals to the private SharePoint staging folder, which is never committed. Wardah curates; only the chosen frames enter `assets/images/cottages/<house-id>`.
- **Shot log.** For each home keep a short note of what the photos settle (bed sizes, tub or shower, whether there is a dishwasher, how many steps, how many cars fit). The note, not the photo, lets the site change a "confirm" to a stated fact, and Suzanne confirms anything the photo cannot settle (see section 4).

## 3. Shot lists

Priority: **P0** = fixes a hero gap or a missing room; **P1** = settles a "confirm on inquiry" that stops enquiries; **P2** = completeness. "Source" says which data file or note shows the gap.

### Frederick Cottage (`marietta-01`, house number may show)
Hero is already a front-of-house frame, and kitchen, dining, three bedrooms, bathroom and outdoors are photographed. The gaps are the rooms the page still marks "confirm".

| ID | Pri | Shot | Why (source) | Frame notes |
|---|---|---|---|---|
| FRE-01 | P1 | Bathroom, whole room | Page cannot say tub or shower: the only photo shows a shower curtain, the listing names a bathtub (owner-decisions F3; `frederick.ts` bathroom note) | Draw the curtain fully open so the tub or shower fixture and the faucets are visible |
| FRE-02 | P1 | Laundry: washer and dryer | Washer and dryer are listed but no room shows them (`frederick.ts` amenities) | Show both machines and the shelf or floor around them |
| FRE-03 | P1 | Sitting room, if the home has one | "Whether there is a separate sitting room with sofas" is open (`frederick.ts` living notes) | Whole room from a corner. If there is no separate sitting room, take no photo and tell Suzanne |
| FRE-04 | P2 | Outbuilding with French doors, and the grill and yard furniture | "Use of the outbuilding, grill and yard furniture" is open (`frederick.ts` outdoors notes) | Outside and, if guests may use it, inside. No tools or stored gear in frame |
| FRE-05 | P2 | Driveway, empty | Parking is "driveway in the photos; spaces and street rules to confirm" | Wide frame showing how many cars fit; no vehicles, plates or neighbours |
| FRE-06 | P2 | Clean front porch and door | `frederick-ext-2.jpeg` stays out because a number painted on the porch column does not read as Frederick's approved number (F1) | Frame so the column number is not legible. Do not change anything on the house to take the photo |

### Broad Cottage (`parkersburg-01`, house number may show)
The hero is the living room and no exterior frame exists at all.

| ID | Pri | Shot | Why (source) | Frame notes |
|---|---|---|---|---|
| BRO-01 | P0 | Front of the house, three-quarter and straight-on | No front-of-house frame; the hero is the living room (`broad.ts` hero) | Daylight, whole roofline and door, no vehicles, no neighbours' numbers |
| BRO-02 | P0 | Front door, steps and threshold | "Step-free entry" is "confirm" (`broad.ts` access notes) | Show every step from the walk to the door, or the ramp or level threshold |
| BRO-03 | P1 | Where a guest parks | "Parking" is "confirm on inquiry" | Empty space, no plates, no neighbours' numbers |
| BRO-04 | P1 | Porch or outdoor space, if any | "Porch or outdoor space" is "confirm" | If there is none, take no photo and tell Suzanne |
| BRO-05 | P1 | Kitchen: all appliances, then open the cabinets | The page says no oven or dishwasher shows in the photos, and dishes, glasses and silverware are unconfirmed (`broad.ts` kitchen notes) | Wide frame with every appliance visible, then one frame of the dish and glass cabinet with the doors open |
| BRO-06 | P2 | Dining table or seating | "Dining table or seating" is "confirm" | Wherever a guest eats, with the chairs in place |
| BRO-07 | P2 | Bedroom storage | "Closet or dresser storage" is "confirm" | Closet open, dresser in frame |
| BRO-08 | P2 | Bathroom access | "Is the bathroom accessible?" has no answer (`broad.ts` bathroom FAQ) | Door width, tub edge and any grab bars, shot from the doorway |
| BRO-09 | P2 | Laundry supplies | "Detergent, iron or drying rack supplied" is "confirm" | Shelf or cupboard beside the machines |

### Buck Cottage (`parkersburg-02`, address not approved: no number anywhere)
Hero is the living room (photo-49). The street panorama (photo-09) and the front of the house (photo-23) are excluded because the house number shows. A covered-porch frame (photo-45, seen from the open door) is the only exterior.

| ID | Pri | Shot | Why (source) | Frame notes |
|---|---|---|---|---|
| BUC-01 | P0 | Front of the house with no number legible | No usable front-of-house frame (`buck.ts` comment; owner-decisions B1) | Three-quarter angle. Before delivery, zoom to 100 percent on the door, the porch posts, the mailbox and the neighbours: no number may be readable. If one cannot be avoided, take a closer crop of the porch and door instead |
| BUC-02 | P1 | Kitchen cooking appliance and cookware | "A cooktop or range is not shown in the photo"; cookware and dishes unconfirmed (`buck.ts` kitchen notes) | Wide frame including the cooking appliance, then the cabinets open |
| BUC-03 | P1 | Living-room wall with or without a TV | "Whether there is a TV in the living room" is open (`buck.ts` living notes) | Straight-on frame of the wall opposite the sofa |
| BUC-04 | P1 | Laundry | "Whether the washer and dryer are in the home" is "confirm" | Show where the machines are, or tell Suzanne there are none |
| BUC-05 | P1 | The blue desk room from its doorway | Whether it is a second bedroom or a study, and whether it is part of the stay (`buck.ts` desk-room note) | Include the doorway and a slice of the hall so the layout reads |
| BUC-06 | P2 | Bed and bed size | "Bed size" is "confirm" | Wide frame of the bed; record the size in the shot log |
| BUC-07 | P2 | Porch seating | "Whether there is porch seating" is open | Porch from the yard side, no number on the posts |
| BUC-08 | P2 | Parking | "Parking options" are listed, the arrangement is "to be confirmed" | No plates, no number |
| BUC-09 | P2 | Any second bathroom | "Whether there is more than one bathroom" is open | Whole room from the door |

### Oak Cottage (`parkersburg-04`, house number may show)
Hero is the dining room. The porch and a steps frame exist, but there is no front of the house.

| ID | Pri | Shot | Why (source) | Frame notes |
|---|---|---|---|---|
| OAK-01 | P0 | Front of the house, three-quarter and straight-on | No front-of-house frame (`oak.ts` rooms) | Daylight, no vehicles. Neighbouring houses sit across the road, so keep their numbers out |
| OAK-02 | P0 | Every bedroom, as one consistent set, plus the hall with the doors | The two bedroom-three photos dress the bed differently, and which bedroom has the air conditioner is unclear (`oak.ts` bedroom-three note). The Furnished Finder listing says 4 bedrooms while the site says 3 (owner-decisions, "Bedroom drift") | Same styling and bedding in the second and third bedroom frames. Photograph the hall so each bedroom door is visible, which settles the count |
| OAK-03 | P1 | Living room or sitting area, if there is one | "Living room or sitting area" is "confirm" | Whole room from a corner; otherwise tell Suzanne |
| OAK-04 | P1 | Kitchen appliance wall and open cabinets | Dishwasher unclear in the photos; cookware and dishes unconfirmed | Wide frame showing the dishwasher or its absence, then the dish cabinet open |
| OAK-05 | P1 | Washer and dryer | "Washer and dryer" is "confirm" and no laundry frame exists | Both machines and the space around them |
| OAK-06 | P1 | Entrance: steps, rail and door | "Step count and any step-free entrance" is "confirm" | Every step from the street side to the door. Shoot so neighbours' numbers are not visible. The existing steps frame can be replaced |
| OAK-07 | P2 | Second bathroom, if any, and the existing one in full | "Whether there is more than one bathroom" is open | Whole room from the door |
| OAK-08 | P2 | Stairs or hall, if the home has an upper floor | "Number of floors to be confirmed; no staircase is shown inside" | Skip if single-storey and tell Suzanne |
| OAK-09 | P2 | Off-street parking | "Off-street parking" is "confirm" | No vehicles, no plates |
| OAK-10 | P2 | Bed sizes | "Bed size" is "confirm" in all three bedrooms | Record in the shot log |

### Virginia Cottage (`ravenswood-02`, address not approved: no number anywhere)
Virginia is the largest gap. The only photos are the fireplace room, a dining room, the stairs, a sunny corner and a powder room, and the page says the rooms look only partly furnished. The kitchen has no photo. No frame shows a bed, a full bathroom or the outside.

**Prerequisite: do not shoot Virginia until it is guest-ready.** The 2026-11-14 portfolio review viewed every frame of this house and found none clean enough to publish, because the home was photographed mid-renovation (tools, supplies, boxes, exposed lath, stripped wallpaper, bare ceiling wires). A second set that shows the same state would not help. Shoot when Suzanne or Wardah confirms the rooms are finished and furnished the way a guest will find them. Owner-decisions V8 already lists the front, kitchen, both bedrooms and the upstairs bath.

| ID | Pri | Shot | Why (source) | Frame notes |
|---|---|---|---|---|
| VIR-01 | P0 | Front of the house, no number legible | No clean exterior exists (owner-decisions V7) | Three-quarter angle; no number on the door, porch, mailbox or the neighbours' houses |
| VIR-02 | P0 | Kitchen: wide, then appliances and open cabinets | The kitchen is listed but shows its photo gap; the only frame (photo-54) shows cleaning supplies, an extinguisher and an open switch box (V3) | Nothing on the counters except what stays. No supplies, no panels |
| VIR-03 | P0 | Bedroom one, with a made bed | "No bedroom with a bed is photographed yet" (`virginia.ts` bedroom notes; V5) | Bed, windows, storage; record the bed size |
| VIR-04 | P0 | Bedroom two, with a made bed | Same as VIR-03 | Same styling as VIR-03 |
| VIR-05 | P0 | Upstairs bathroom with the tub | The full bathroom is "not photographed yet" (V2; `virginia.ts` bathroom note) | Whole room from the door; the tub and the toilet |
| VIR-06 | P1 | Living-room seating | "Sofa and living-room seating" is "confirm", and the fireplace-room hero shows the room only partly furnished | The fireplace room as a guest will find it, with seating in frame |
| VIR-07 | P1 | Sunroom, only if guest-ready | The one frame (photo-77) is a maintenance frame, so the page does not mention the room (V4) | Skip if it is still a work space |
| VIR-08 | P1 | Laundry | "Whether laundry is in the home" is "confirm" | Show where the machines are |
| VIR-09 | P2 | Parking | "Parking arrangement" is "confirm" | No plates, no number |
| VIR-10 | P2 | Fireplace firebox clear | "Whether it can be used is to be confirmed"; today a pipe sits in the firebox (V6) | Take this only after Suzanne confirms use. A photo cannot answer it |

### Henrietta Cottage (`ravenswood-03`, house number may show)
Hero is the dining room, and "No photo of the front of the house is available yet" is written on the page. The second bedroom has never been photographed.

| ID | Pri | Shot | Why (source) | Frame notes |
|---|---|---|---|---|
| HEN-01 | P0 | Front of the house, three-quarter and straight-on | `henrietta.ts` outdoors note | Daylight, no vehicles |
| HEN-02 | P0 | The second bedroom | "The second bedroom has not been photographed yet" (`henrietta.ts` bedroom notes) | Wide frame, made bed; record the bed size |
| HEN-03 | P1 | Second bathroom, whole room | "Whether the second bathroom is a full bath or a half bath" is open (owner-decisions row 5) | From the door, so the fixtures show |
| HEN-04 | P1 | Laundry with both machines | A washer is photographed; "Dryer" is "confirm" | The washer, the dryer and the window beside them |
| HEN-05 | P1 | Living room, if there is one | "Living room" is "confirm" | Whole room; otherwise tell Suzanne |
| HEN-06 | P2 | The whole yard and fence line | "Whether the whole yard is private and fenced" is open | Wide from the porch and from the far corner; no neighbours' numbers |
| HEN-07 | P2 | Off-street parking | "Off-street parking" is "confirm" | No vehicles or plates |
| HEN-08 | P2 | Bed sizes in both bedrooms | "Bed size" is "confirm" | Record in the shot log |
| HEN-09 | P2 | Thermostat or air-conditioning unit | "Heating and air conditioning" is "confirm" | One detail frame of whatever heats and cools the home |

### Shot count by priority

| Home | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| Frederick | 0 | 3 | 3 | 6 |
| Broad | 2 | 3 | 4 | 9 |
| Buck | 1 | 4 | 4 | 9 |
| Oak | 2 | 4 | 4 | 10 |
| Virginia | 5 | 3 | 2 | 10 |
| Henrietta | 2 | 3 | 4 | 9 |
| **All homes** | **12** | **20** | **21** | **53** |

Each shot is one scene with a wide frame and a detail or two, so allow for several frames per ID.

### What a photo cannot settle
These stay "confirm on inquiry" until Suzanne answers, however good the photos are: square footage, security deposit, availability, which floor each Frederick bedroom is on, whether the Virginia fireplace and the Henrietta mantel can be used, Henrietta's official bathroom count and Oak's total bathroom count. They are rows in `notes/owner-decisions.md`.

## 4. Budget options (owner decision)

**Status.** Decided on #60 on 2026-11-16 under the CEO's ruling: **Wardah reshoots, at no cost** (option A below). The options are kept here so the choice can be revisited if a result does not meet this brief. The owner decision to record on #11 is which option applies and who pays.

No price is stated in this brief. Any figure for options B to D is **quote needed** from the photographer.

| Option | What it is | Cost | Strengths | Risks |
|---|---|---|---|---|
| **A. DIY by Wardah** (decided) | Wardah shoots with her own phone or camera, follows sections 2 and 3, and curates the frames | No spend (the #60 decision). Her time is internal | Photo curation is already hers; fastest to start; she knows each home; the same review flow as the site's current photos | Quality and consistency depend on light, lens and practice; one person cannot be in two towns on the same good-light day; Virginia may need more than one visit |
| **B. Local photographer, half day** | A hired photographer covers only the P0 list, starting with the fronts of Broad, Oak and Henrietta (house numbers may show) and then Buck | Quote needed | Professional exteriors and light, the highest-value frames, bounded scope | The P0 list spans three towns in two states, so travel may be priced in; Virginia's bedrooms are not ready |
| **C. Local photographer, full day** | The P0 and P1 lists for every home that is guest-ready | Quote needed | One consistent visual set across all homes; settles most "confirm" notes in one pass | The largest spend; the photographer must keep Buck and Virginia free of house numbers; Virginia cannot be done before it is finished |
| **D. Hybrid** | Wardah shoots the interiors, a photographer shoots the fronts only | Quote needed (fronts only) | Spends only where DIY is weakest (exteriors in good light) | Two sets must be matched in tone, and two people must keep to the same keep-out list |

**What to ask any photographer for a quote.** Day rate or per-home price; travel between Marietta, Parkersburg and Ravenswood; delivery of full-resolution originals; a licence that lets Mt Cottages use the photos on the site and on listing channels (not a licence that limits use to one platform); no AI or object-removal edits; agreement to the keep-out list (house numbers, neighbours' numbers, vehicles, plates, tools); the originals go to the private SharePoint staging folder, never a public gallery.

**Recommendation.** Stay with A, as decided, for every home except Virginia. Hold Virginia until the house is guest-ready. After the first pass, if a front-of-house frame is still missing for a home, or Wardah asks for help, take B for the P0 fronts only, with a quote. That keeps spending tied to evidence of a remaining gap.

## 5. After the shoot

1. Wardah curates the frames and places the chosen ones in the right `assets/images/cottages/<house-id>` folder through a merge request (plain `.jpg` or `.avif`; the site's image pipeline emits the responsive sizes).
2. A front-of-house frame becomes the hero where it is clear and address-safe. Where it is not, the strongest honest room or outdoor image stays and the gap stays visible.
3. Each new room photo gets alt text that describes what it shows, a caption, and an updated note: a fact the photo settles moves from "confirm" to "photographed". `npm run check` and `scripts/check-addresses.sh` must stay green.
4. Photos used outside the site (Google Business Profile, listing channels) follow `docs/marketing/google-business-profile.md` and `docs/marketing/listing-channels.md`.
5. Re-run the privacy scan on every published frame: no number on Buck or Virginia, no neighbours' numbers, no vehicles with phone numbers or plates.

## 6. Sending this brief

This brief is committed first. Posting it on #11 and sending it to Wardah through Atlas are the next steps; neither is done by the commit that adds this file.
