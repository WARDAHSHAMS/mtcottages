# Proximity and amenity fact-check

_Issue: WorldEnterpriseGroup/mtcottages#26. Checked 2026-11-15. Re-check every 12 months: `scripts/check-claims.mjs` fails CI once a measurement in `_data/distances.json` is older than that._

Honesty is the brand. A travel nurse who finds the hospital is twice as far as we said will not trust anything else on the page. This file records every proximity, amenity and "included" claim we found, what we measured, and what changed.

## Method

- **Drive time and distance:** OSRM public demo server (`router.project-osrm.org`, driving profile) on OpenStreetMap roads. OSRM reports free-flow time with no traffic lights or stops, so every figure is rounded **up** to the next whole minute and published as "about". Raw seconds and meters are kept in `_data/distances.json` with the exact request URL.
- **Places:** OpenStreetMap Nominatim, cross-checked against the operator's own listing (WVU Medicine, Memorial Health System, Jackson County Schools, City of Parkersburg, City of Ravenswood) or at least two directory listings.
- **Origins:** the owner-approved street address for Frederick, Henrietta, Oak and Broad. Buck, Virginia, Walnut and Yellow have no approved address, so they are measured from the town centre and every such line says "From the <town> town centre". Drive times from those houses say "confirm on inquiry".

## Where claims live

| Source | Published? | Finding |
|---|---|---|
| `_data/houses.json` | No. No page imports it, but the brand brief and the distance component (#25) build on it | Held every numeric "N min to X" claim. Most were wrong; all are now measured or marked confirm |
| `src/data/homes/*.ts` and `towns.ts`, the "Nearby" lists | Yes, on each microsite's location page | Name, street and one-line note per place. No minute claims. All checked; all correct |
| `src/data/site.ts`, cottage cards and town pages | Yes | One unverifiable neighbourhood claim (Buck, "north side"), now removed |

## Corrected proximity claims (`_data/houses.json`)

| Home | Was | Measured (2026-11-15) | Now | Verdict |
|---|---|---|---|---|
| Henrietta | 10 min to Jackson General Hospital | 924 s, 18.0 km | About 16 min (11.2 mi) to Jackson General Hospital in Ripley | **Wrong.** The hospital is in Ripley, not Ravenswood |
| Virginia | 10 min to Jackson General Hospital | 907 s, 18.7 km from the town centre | From the Ravenswood town centre: about 16 min (11.6 mi) | **Wrong** |
| Walnut (not listed) | 10 min to Jackson General Hospital | as Virginia | as Virginia | **Wrong** |
| Henrietta | 5 min to downtown Ravenswood | 33 s, 0.3 km | About 1 min (0.2 mi) | Understated |
| Henrietta | 5 min to I-77 | 324 s, 4.7 km | About 6 min (2.9 mi) to I-77 at Exit 146 | Close; now exact |
| Henrietta | 5 min to grocery and dining | 90 s, 0.9 km to Ravenswood Foodfair | About 2 min (0.6 mi) to Ravenswood Foodfair | Understated |
| Henrietta | "Multiple bathrooms" | Two baths photographed | Two as photographed, count confirm on inquiry | Matched to `notes/owner-decisions.md` row 5 |
| Frederick | 5 min to Marietta Memorial Hospital | 626 s, 5.7 km | About 11 min (3.5 mi) | **Wrong** |
| Frederick | 5 min to downtown Marietta | 458 s, 3.8 km | About 8 min (2.3 mi) | **Wrong** |
| Frederick | "Walkable to downtown Marietta", "short walk from downtown" | 2.3 mi by road | About 8 minutes' drive | **Wrong.** A 45-minute walk is not walkable |
| Frederick | 10 min to I-77 | 192 s, 1.2 km to the Exit 1 ramp | About 4 min (0.8 mi) | Overstated |
| Frederick | 10 min to Marietta College | 348 s, 2.7 km | About 6 min (1.7 mi) | Overstated |
| Broad | 5 min to WVU Medicine Camden Clark | 407 s, 4.1 km | About 7 min (2.5 mi) | Understated |
| Broad | 5 min to downtown Parkersburg | 411 s, 4.4 km | About 7 min (2.7 mi) | Understated |
| Broad | 10 min to I-77 | 541 s, 6.6 km | About 10 min (4.1 mi) to the I-77 on-ramp | **Correct** |
| Broad | 5 min to grocery and dining | 341 s, 2.8 km to Kroger on 7th Street | About 6 min (1.7 mi) | Close; now exact |
| Broad | "Central Parkersburg ... close to restaurants" | OpenStreetMap: North Parkersburg | North Parkersburg on Broad Street | Corrected |
| Oak | 3 min to downtown Parkersburg | 440 s, 4.2 km | About 8 min (2.6 mi) | **Wrong** |
| Oak | "Steps from restaurants and shopping. A short walk to downtown" | 2.6 mi by road | About 8 minutes' drive | **Wrong** |
| Oak | 5 min to WVU Medicine Camden Clark | 433 s, 4.3 km | About 8 min (2.7 mi) | Understated |
| Oak | 10 min to I-77 | 505 s, 6.3 km | About 9 min (3.9 mi) | Correct |
| Oak | 5 min to grocery and dining | 306 s, 2.5 km | About 6 min (1.5 mi) | Close; now exact |
| Buck | 10 min each to Camden Clark, downtown and I-77; "north end, near Grand Central Avenue" | Address not approved, so not measurable from the house | Confirm on inquiry, plus town-centre figures | **Unverifiable**; Grand Central Avenue is in Vienna |
| Yellow (not listed) | 10 / 5 / 10 min | Not listed | Confirm on inquiry | Unverifiable |

## Amenity and "included" claims (`_data/houses.json`)

The inventory stated laundry, off-street parking, internet and utilities as fact for every home. The microsites, which are what guests see, already mark most of these "confirm". The inventory now matches each microsite's status:

| Claim | Microsite status | Inventory now |
|---|---|---|
| Utilities included (all homes) | confirm everywhere | "Utilities included (confirm on inquiry)" |
| Off-street parking | confirm (Henrietta, Oak, Broad, Virginia, Buck); Frederick: driveway in photos, spaces to confirm | Suffixed "(confirm on inquiry)" |
| Washer and dryer in unit | Broad photographed; Frederick listed; Oak confirm; Henrietta washer photographed, dryer confirm; Buck and Virginia "laundry access", in-home confirm | Per home, as on the microsite |
| Internet | Frederick 1 Gbps listed; Broad, Oak, Buck, Virginia fiber listed; Henrietta confirm | Per home, as on the microsite |
| Virginia bathrooms (inventory said 1) | Two, confirm (owner decision V2) | 2, confirm |

## Live "Nearby" notes: verified, no change

| Claim on the site | Evidence |
|---|---|
| Jackson General Hospital, a WVU Medicine facility on Pinnell Street in Ripley | wvumedicine.org lists 122 Pinnell Street, Ripley, WV 25271; 24-hour emergency department |
| Ravenswood Foodfair on Washington Street | Yelp, Yellow Pages and store directories: 423 Washington St |
| Walmart Supercenter on Academy Drive in Ripley | Walmart store 1450: 200 Academy Dr, Ripley |
| Gino's Pizza & Spaghetti House on Washington Street | City of Ravenswood restaurant list: 404 Washington Street |
| Ravenswood Middle School (6 to 8, South Ritchie Avenue), High School (9 to 12, Plaza Drive) | NCES school search; Jackson County Schools |
| Ravenswood Branch Library on Virginia Street | Jackson County Public Library contact page |
| Washington Riverfront Park, river access and a marina | City of Ravenswood; WOWK and Gazette-Mail coverage of the marina build on Sand Creek |
| Selby General Hospital, a second hospital with an emergency department in Marietta | Memorial Health System emergency care page lists Selby General ED, 1106 Colegate Drive |
| Marietta High School 7 to 12, Marietta Elementary 3 to 6, Phillips and Washington K to 2 | Marietta City School District; Ballotpedia 2022–23 |
| Kroger on Acme Street next to the Kroger Wetlands | City of Marietta and Washington County: the wetlands are at 80 Acme St, behind Kroger |
| Lafayette Plaza on Pike Street across from Kroger | Leasing listing: "across from Kroger"; Yelp: 464 Pike St |
| CABL on-demand rides inside Marietta | WTAP 2024-10-24: fixed routes ended 19 Oct 2024, on-demand from 21 Oct |
| Parkersburg High School, a 1917 Tudor-style building on Dudley Avenue | Wikipedia and the historical marker: built 1917, Tudor / Jacobethan Revival |
| Parkersburg City Park: shelters, playgrounds, tennis, pickleball, walking paths | City of Parkersburg (11 shelters, tennis, walking tracks, playground); pickleball per Pickleheads |
| I-77 Exit 1 (Marietta) and Exit 146 (Ravenswood) | OSRM route guidance: "I 77 South: Parkersburg" from Pike Street; "US 33 West, WV 2 South: Silverton, Ravenswood" |

## Still for the owner (posted on #11)

1. Buck Cottage's neighbourhood and drive times (address not approved, so we cannot measure).
2. Henrietta's official bathroom count (two are photographed).
3. Which utilities are included, per home.
4. "Mt Cottages has hosted traveling healthcare professionals for more than 10 years" (`/health-professionals.html`) has no record behind it. It stays live as a business claim; please confirm or correct it.

## Drive-time chart and table on every location page (#25)

`src/components/home/DistanceTable.astro` renders `_data/distances.json` on each microsite's `location.html`: a bar chart grouped by category (hospitals, major employers, colleges, schools, groceries, downtown and parks, interstate) and the same figures as a table, each row with its OSRM request link and measurement date. Nothing is typed into the page by hand. `microsites` in the data file maps each microsite to its origin; the build fails if a street-address home is not measured from its approved address, or a town-level home is measured from anything but its town centre.

Added 2026-11-15 (OSRM table `table-work-school`; places geocoded with Nominatim):

| Place | Category | Measured to |
|---|---|---|
| Selby General Hospital, Marietta | hospital | the hospital on Colegate Drive |
| Chemours Washington Works | employer | the plant site as mapped by OpenStreetMap |
| Bureau of the Fiscal Service, Parkersburg | employer | the 2nd Street building (the Bureau has several downtown offices) |
| Constellium Ravenswood | employer | Century Road beside the plant |
| Washington State Community College; WVU Parkersburg | campus | the main campus |
| Marietta, Parkersburg and Ravenswood high schools | school | the school building |
| Campus Martius Museum; Parkersburg City Park; Riverfront Park, Ravenswood | attraction | the museum or park |

Two pairs (Frederick to Selby General and to Washington State) were re-run through the OSRM route service and matched the table to the tenth of a second.

## Keeping it honest

`scripts/check-claims.mjs` runs in both pipelines after the build, with the schema in `scripts/lib/distances.mjs` and the banned-claim patterns in `scripts/lib/claims.mjs`; both have unit tests (`node --test scripts/tests/*.test.mjs`). It fails when:

- a `houses.json` proximity line has no measured row or "confirm on inquiry";
- a line's minutes or miles differ from its measurement, or a measurement is older than 12 months;
- a measured origin is a street address other than the four approved ones, or a town-centre figure is not labelled as one;
- any wrong claim from this audit (for example "10 min to Jackson General", "walkable to downtown") appears in the inventory or on a built page.
