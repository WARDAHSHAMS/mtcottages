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
| Yellow Cottage | `parkersburg-03` | Parkersburg, WV | Town only (not approved) | 2 | Listed | [/parkersburg/yellow-cottage/](https://mtcottages.com/parkersburg/yellow-cottage/) |
| Oak Cottage | `parkersburg-04` | Parkersburg, WV | 2712 Broad St, Parkersburg WV 26101 | 3 | Listed | [/parkersburg/oak-cottage/](https://mtcottages.com/parkersburg/oak-cottage/) |
| Walnut Cottage | `ravenswood-01` | Ravenswood, WV | Town only (not approved) | 1 | Listed | [/ravenswood/walnut-cottage/](https://mtcottages.com/ravenswood/walnut-cottage/) |
| Virginia Cottage | `ravenswood-02` | Ravenswood, WV | Town only (not approved) | 2 | Listed | [/ravenswood/virginia-cottage/](https://mtcottages.com/ravenswood/virginia-cottage/) |
| Henrietta Cottage | `ravenswood-03` | Ravenswood, WV | 200 Henrietta St, Ravenswood WV 26164 | 2 | Listed | [/ravenswood/henrietta-cottage/](https://mtcottages.com/ravenswood/henrietta-cottage/) |
| Gallatin Cottage | none merged | Ravenswood, WV | Not published | Unknown | Coming soon (off-market since 2026-07-21) | None. Owner decision needed |
| Sand | none merged | Ravenswood, WV | Not published | Unknown | Coming soon (never listed) | None. Owner decision needed |
| Grantsville home (`grantsville-01`) | none merged | Grantsville, WV | Not published, banned in CI | Unknown | Coming soon (private inventory) | None. Owner decision needed |

## Photo gaps on the new microsites

Every photo is a real portfolio frame chosen after looking at it. Maintenance, construction, duplicate and address-revealing frames were left out, and each gap is shown on the page rather than filled.

- **Buck:** no front-of-house photo. The only exterior frames show a street panorama and the house number, so the hero is the living room. One photographed room has a desk and a second bed although the home is listed as one bedroom, so the page asks the guest to confirm it. No cooktop is shown in the kitchen photo.
- **Yellow:** only the two exterior photos are published. The curated interior frames are maintenance close-ups (a cracked backsplash and a light fixture with no shade), so the kitchen, bedrooms and bathroom show "not published yet".
- **Walnut:** no kitchen photo and no front-of-house photo (the porch frame shows needed repairs). A second made bed is visible through a doorway although the home is listed as one bedroom, so the page asks the guest to confirm it.
- **Virginia:** no bedroom with a bed and no front-of-house photo. The rooms are only partly furnished in the photos, and the page says so.

## Waiting on the owner (Suzanne) or Wardah

1. **Gallatin and Sand:** relist them or keep them off the market. Wardah's unmerged branches `feat/gallatin-gallery-amenity-2026-09-24` and `216-sand-images` hold nine Gallatin photos and one Sand exterior. A microsite can be built from these once the owner relists a home, and only after each frame has been checked against the photo rules. The two branches give the two homes opposite folder IDs (`ravenswood-04` and `ravenswood-05`), so settle which ID is which first.
2. **Street addresses:** approve them for Buck, Yellow, Walnut and Virginia, or keep those homes at town level.
3. **Interior and front-of-house photos:** the gaps listed above.
4. **Facts marked "Confirm on inquiry"** on each microsite, and the open items in `notes/owner-decisions.md`.
