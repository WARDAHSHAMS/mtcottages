# Mt Cottages house list

Last checked 2026-11-13. Sources: `homes.csv` and the SharePoint house map and photo manifest (all three are private and git-ignored), `_data/photo-index.json`, `src/data/site.ts`, and the notehive/MtCottages-Ops repository. Ops holds no prices, so the only price on any microsite is the published bedroom-count guide ($1,895 for 1 bedroom, $2,295 for 2, $2,575 for 3), and every page tells the guest to confirm the rate for their dates.

## Address rule

Only four street addresses are approved for publication (owner decision, Oct 2026). Each one appears on its own microsite, with a map pin and structured data:

- Frederick Cottage: 125 Frederick St, Marietta OH 45750
- Henrietta Cottage: 200 Henrietta St, Ravenswood WV 26164
- Oak Cottage: 2712 Broad St, Parkersburg WV 26101
- Broad Cottage: 3113 Broad St, Parkersburg WV 26104

Every other home is published at **town level only**. Its microsite shows the town, a map of the town with no pin, directions to the town centre, and the line "The street address is shared once you inquire." The structured data carries no street, no postcode and no coordinates. CI and the Playwright suite both fail if a house number from an unapproved home appears.

## Houses

| House | Photo folder (`assets/images/cottages/`) | Town | Address on site | Bedrooms | Status | Microsite |
|---|---|---|---|---|---|---|
| Frederick Cottage | `marietta-01` | Marietta, OH | 125 Frederick St, Marietta OH 45750 | 3 | Listed | [/marietta/frederick/](https://mtcottages.com/marietta/frederick/index.html) (hand-built) |
| Broad Cottage | `parkersburg-01` | Parkersburg, WV | 3113 Broad St, Parkersburg WV 26104 | 1 | Listed | [/parkersburg/broad-cottage/](https://mtcottages.com/parkersburg/broad-cottage/) |
| Buck Cottage | `parkersburg-02` | Parkersburg, WV | Town only (not approved) | 1 | Listed | [/parkersburg/buck-cottage/](https://mtcottages.com/parkersburg/buck-cottage/) (the old `buck-apartment-1.html` redirects here) |
| Yellow Cottage | `parkersburg-03` | Parkersburg, WV | Not published | 2 | Listed | None: deferred, not ready to publish (CEO decision 2026-11-14). Keeps its single page [/parkersburg/yellow-cottage.html](https://mtcottages.com/parkersburg/yellow-cottage.html) |
| Oak Cottage | `parkersburg-04` | Parkersburg, WV | 2712 Broad St, Parkersburg WV 26101 | 3 | Listed | [/parkersburg/oak-cottage/](https://mtcottages.com/parkersburg/oak-cottage/) |
| Walnut Cottage | `ravenswood-01` | Ravenswood, WV | Not published | 1 | Listed | None: no microsite by CEO decision (2026-11-14). Keeps its single page [/ravenswood/walnut-cottage.html](https://mtcottages.com/ravenswood/walnut-cottage.html) |
| Virginia Cottage | `ravenswood-02` | Ravenswood, WV | Town only (not approved) | 2 | Listed | [/ravenswood/virginia-cottage/](https://mtcottages.com/ravenswood/virginia-cottage/) |
| Henrietta Cottage | `ravenswood-03` | Ravenswood, WV | 200 Henrietta St, Ravenswood WV 26164 | 2 | Listed | [/ravenswood/henrietta-cottage/](https://mtcottages.com/ravenswood/henrietta-cottage/) |
| Gallatin Cottage | `ravenswood-04` (SharePoint map); no usable photos | Ravenswood, WV | Not published | 3 (Wardah's draft, unconfirmed) | Coming soon: under renovation | None, blocked on finished photos |
| Sand | `ravenswood-05`; no own photos | Ravenswood, WV | Not published | 2 (Wardah's draft, unconfirmed) | Coming soon: never listed | None, blocked on real photos |
| Grantsville home (`grantsville-01`) | none merged | Grantsville, WV | Not published, banned in CI | Unknown | Coming soon (private inventory) | None. Owner decision needed |

## Photo gaps on the new microsites

Every photo is a real portfolio frame chosen after looking at it. Maintenance, construction, duplicate and address-revealing frames were left out, and each gap is shown on the page rather than filled.

- **Buck:** no front-of-house photo. The only exterior frames show a street panorama and the house number, so the hero is the living room. One photographed room has a desk and a second bed although the home is listed as one bedroom, so the page asks the guest to confirm it. No cooktop is shown in the kitchen photo.
- **Virginia:** no usable kitchen photo, no bedroom with a bed and no front-of-house photo. The kitchen (photo-54) and sunroom (photo-77) frames are mid-cleanup maintenance frames and are left out; the sunroom is not claimed because nothing else shows it. The rooms are only partly furnished in the photos, and the page says so. Open facts are V1 to V7 in `notes/owner-decisions.md`.

Yellow and Walnut have no microsite (CEO decisions 2026-11-14: no Walnut microsite; Yellow is not ready to publish). Their main-site presence is unchanged: single property pages, Yellow's card on the home page, and both on the cottages and Ravenswood/Parkersburg pages. The microsite work for both is parked on branch `park/yellow-walnut`.

## Waiting on the owner (Suzanne) or Wardah

1. **Gallatin and Sand need real, finished photos before they can have a microsite.** Every frame was reviewed on 2026-11-13. Wardah's unmerged branches (`feat/gallatin-gallery-amenity-2026-09-24`, `216-sand-images`) cannot be used:
   - **Gallatin:** the nine frames show a house under renovation. Every room is empty, the kitchen ceiling is open to the joists, a gas heater sits on bare wiring, and the front photo shows the house number. A furnished-stay page built on them would mislead guests and break the address rule. They look like a pre-purchase listing set, not portfolio photography.
   - **Sand:** its one exterior carries a "Kanawha Valley Board of REALTORS" copyright watermark (an MLS photo, not ours), and it shows peeling paint. Wardah's draft filled the gaps with other homes' photos, which the photo rules forbid.

   Once each home is furnished and photographed, it can get a microsite the same day: add `src/data/homes/<id>.ts` (town-level, like Buck) and register it. The SharePoint map gives the folders: `ravenswood-04` is Gallatin and `ravenswood-05` is Sand. Wardah's branches have these two IDs swapped.
2. **Street addresses:** approve them for Buck and Virginia, or keep those homes at town level.
3. **Interior and front-of-house photos:** the gaps listed above.
4. **Facts marked "Confirm on inquiry"** on each microsite, and the open items in `notes/owner-decisions.md`.
