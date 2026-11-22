# Mt Cottages: Google Business Profile readiness pack

_Issue: WorldEnterpriseGroup/mtcottages#37 (growth roadmap #11; owner decision D7 in `docs/marketing/brand-and-positioning.md`). Written 2026-11-19. Status: ready for the owner. **The profile is created only after the owner approves, from the owner's own Google account.** Nothing in this pack has been entered into Google._

## 1. Recommendation in one paragraph

Create **one service-area business profile for Mt Cottages, with the address hidden.** The business has six homes in three towns across two states, no staffed office and no public phone line, and the owner has approved only four home addresses for publication, each on its own microsite. A service-area profile lets Google show where we serve (Marietta, Ohio; Parkersburg and Ravenswood, West Virginia) without publishing any house. This matches the decision recorded on #37 on 2026-11-16 under the CEO's ruling. The three items the issue reserves for the owner (who owns the profile, service area versus storefront, verification) are listed as open in section 9, because they need the owner's own account and consent.

## 2. Why a service-area profile, and the options weighed

| Option | What it means | Verdict |
|---|---|---|
| **A. Service-area business, address hidden** | One profile, no pin, service areas listed | **Recommended.** No address is published; one profile fits six homes; contact stays the website form |
| B. Storefront at one approved home | The pin and address of Frederick, Henrietta, Oak or Broad become the business address | Rejected. It presents one home as the office of the whole business, hides the other five, and invites visitors to an occupied rental |
| C. One storefront profile per approved home | Four profiles, four addresses | Rejected. It leaves out Buck and Virginia, multiplies listings to maintain, and Google's guidelines do not treat an unstaffed rental as a business location (confirm against the current guidelines at setup) |
| D. No profile | Skip Google Business Profile | The fallback if Google declines the service-area profile. It is never a reason to publish a storefront address |

**Reasons**

1. **No staffed location.** The homes are lived-in rentals with no front desk. Google's guidelines are written for businesses that serve customers at a staffed location or that travel to customers; a service-area profile is the closest honest fit. Confirm the current wording of the eligibility rules in the Google Business Profile help centre when applying, because Google changes them.
2. **Privacy rule.** `CLAUDE.md` approves exactly four home addresses, each for its own microsite. A storefront profile would add a fifth public use of one of them (a map pin and a "Directions" button for a house that guests rent), and the other two homes must stay town-level only.
3. **One profile, six homes.** The homes are in Marietta, Parkersburg and Ravenswood. A single pin cannot describe that; a service-area list can.
4. **Contact path.** The business has no public phone line. The contact is the form on `stay.mtcottages.com` and `stay@mtcottages.com`, the same as the site (`notes/owner-decisions.md`, "Phone and response time").
5. **Residents.** A pin on a rented home invites visits to a home someone is living in.

**Trade-offs the owner should know.** A profile without a pin is shown by service area, reviews and relevance rather than by distance from a searcher, so it may not appear in "near me" map results as often as a storefront profile would. Nothing here promises Map Pack placement. Google may also ask for a private address and a verification video, and may reject or later suspend a profile it judges ineligible. If it does, the answer is to appeal or fall back to option D, not to change the address policy.

## 3. Profile fields

### Name, type and contact
| Field | Value | Notes |
|---|---|---|
| Business name | Mt Cottages | The name used on the site. No keywords, town names or "furnished rentals" added. Confirm the exact legal or trading name with the owner |
| Address | **Hidden** (service-area business). Do not tick "show address" | A private address for Google's verification only is open item O3. Never type any street address into the public fields |
| Service areas | See section 6 | |
| Phone | Leave empty. Confirm with the owner whether a number may be given to Google for verification only | The business has no public line; Twilio handles bot calls only |
| Website | The tagged home-page link in section 8 | |
| Appointment or booking link | The tagged stay-form link in section 8 | Google shows it as a booking button |
| Hours | Leave unset. Confirm with the owner | There is no staffed office. Do not state "open 24 hours" or any reply time: the site makes no timed reply promise (D6) |
| Messaging | Off | Turn it on only if ops can answer it, because a slow chat reply is worse than none |
| Logo | Do not upload yet | The brand is not applied (#27 keeps `owner-decision`). Upload a logo only after the CEO chooses |

### Categories
Google's category list changes and varies by country, so the owner confirms each name in the category picker at setup. The choices below are the best fit for a furnished monthly rental business, with reasons.

| Slot | Recommended category | Why |
|---|---|---|
| Primary | **Real estate rental agency** (if not offered, "Apartment rental agency") | Describes renting homes to tenants for a month or longer, which is what the site sells |
| Secondary | **Corporate housing** or **Furnished apartment building**, if either appears in the picker for a service-area profile; otherwise **Property management company** only if the owner confirms the business also manages homes for others | Corporate housing matches the travel-nurse and crew audience. "Property management company" would claim a service Mt Cottages does not advertise, so do not choose it unless it is true |
| Not chosen | Vacation home rental agency, Holiday apartment rental, Hotel, Extended-stay hotel, Bed and breakfast | Mt Cottages offers no stays under 30 nights (#68), and the lodging categories imply a staffed property with hotel features |

### Description (about 500 characters; Google allows 750; no links, phone numbers or emails)
> Mt Cottages rents furnished whole homes for stays of a month or longer in Marietta, Ohio, and in Parkersburg and Ravenswood, West Virginia. Each home is furnished with a full kitchen, and utilities are included, so there is nothing to add but your suitcase. We host travel nurses and medical residents, project crews, families between homes and anyone staying a while. Our homes come with real photos, and we say so when a detail is not confirmed. Ask about your dates through the form on our website.

Voice and fact checks, against `docs/marketing/brand-and-positioning.md`, `src/pages/index.astro` and `notes/owner-decisions.md`:
- Calm, plain and specific; no "luxury", "world-class", "paradise", "hidden gem" or urgency.
- "Whole homes", "a month or longer" and "a full kitchen" are on the site. "Utilities are included" is a recorded decision for every home (#70). It does not mention laundry, internet, pets or prices, because those are not confirmed for every home (several still read "confirm on inquiry").
- "Marietta, Ohio" is written in full, as the site does for every Marietta page, so it is not confused with Marietta, Georgia.
- No claim of insurer direct billing, short stays, reply times, reviews or ratings.

## 4. Services

Use the Services section (a name plus a short description; confirm the character limit at setup). No prices, because only Frederick, Broad and Oak (the last two from their Furnished Finder listings) are owner-confirmed, and a price on a profile reads as a firm offer.

| Service name | Description |
|---|---|
| Furnished whole-home rental | A furnished house to yourself for a month or longer, with a full kitchen and utilities included. Ask us about your dates. |
| Housing for travel nurses and medical residents | A quiet home near the hospital for a contract or a rotation. We give the drive time for the home you are considering. |
| Housing for project crews | A whole house for two or more people on a job for a month or longer. Ask us about beds, parking and laundry for the home you want. |
| Housing between homes | A furnished house for families while their own home is repaired or while they find a new one. Ask about terms for your situation. |
| Furnished living for longer stays | Six months, a year or the season between: a move-in-ready home on one monthly rate. |

Not listed, on purpose: stays under 30 nights (#68), direct billing to insurers or companies (a billing change, which is the CEO's alone), and pets (the house rules say none; the site states it per home).

## 5. Attributes, products, posts

- **Attributes:** choose only what Google offers and the owner confirms; do not tick wheelchair accessibility, Wi-Fi or similar until each is confirmed for every home it would imply (several homes say "step-free entry: confirm").
- **Products:** none at launch. A per-home product entry would put a house in front of strangers before its photos and facts are complete.
- **Posts:** optional, with real photos and the same honest voice. A short update when a home becomes available is the most useful kind, only after availability is confirmed for the home (row 4 in `notes/owner-decisions.md`). The owner decides cadence and who writes them (O8).

## 6. Service areas

The site claims three towns and no others: the home page, `src/data/schema.ts` (`servedTowns`) and the town landing pages all list **Marietta, Ohio; Parkersburg, West Virginia; Ravenswood, West Virginia**. Enter exactly these three.

| Area to enter | Source on the site |
|---|---|
| Marietta, Ohio | Frederick Cottage; `/marietta/` |
| Parkersburg, West Virginia | Broad, Buck and Oak Cottages; `/parkersburg/` |
| Ravenswood, West Virginia | Virginia and Henrietta Cottages; `/ravenswood/` |

**Not entered, and why**
- **Vienna and Williamstown, West Virginia.** The site names them only as nearby places (the mall in Vienna, the regional airport in Williamstown, and Marietta's position across the river from Williamstown). No home is there and the site does not claim them as served towns. If the owner wants them added, they are an owner decision and the site pages would need to say so first (O7).
- **Belpre, Ohio**, Racine and Grantsville, West Virginia. Belpre appears only on a hospital page, and Racine and Grantsville are planning guides, not towns with a Mt Cottages home (`src/data/schema.ts` says so).
- **"The Mid-Ohio Valley".** It is a region used in the site's copy, not a place Google lets you select.

## 7. Photos: ten real picks

All ten are curated public photos already published on the site (they appear in `src/data/homes/*.ts`, `src/pages/index.astro` or `src/data/townLanding.ts`), shown in `assets/images/cottages/`. I viewed them, and two exteriors at full size. None shows a legible house number, plate, phone number or person at the sizes viewed, but three show a vehicle or its reflection, listed under "Prepare before upload". Interiors and exteriors only, as the issue requires; no AI concept images, no area photos, no maps.

| # | Asset path | Shows | Use in profile |
|---|---|---|---|
| 1 | `assets/images/cottages/marietta-01/frederick-exterior-full-safe.avif` | Frederick Cottage from the lawn, with trees and the covered entry. The site's home-page hero and social image | Cover and exterior |
| 2 | `assets/images/cottages/marietta-01/gallery-01.jpg` | Frederick kitchen with oak cabinets, gas range and dishwasher | Interior |
| 3 | `assets/images/cottages/marietta-01/frederick-bed1-1.avif` | Frederick bedroom 1 with a king bed and three windows | Interior |
| 4 | `assets/images/cottages/marietta-01/frederick-backyard-cover.jpg` | Frederick backyard in fall: lawn, patio chairs, picket fence | Exterior |
| 5 | `assets/images/cottages/parkersburg-04/homepage-hero-oak-dining.avif` | Oak Cottage dining room, a navy oval table by a bright window | Interior |
| 6 | `assets/images/cottages/parkersburg-04/photo-07.avif` | Oak Cottage bedroom with a gray headboard and layered bedding | Interior |
| 7 | `assets/images/cottages/parkersburg-04/photo-05.avif` | Oak Cottage covered porch with two chairs, treetops beyond | Exterior |
| 8 | `assets/images/cottages/parkersburg-01/photo-44.avif` | Broad Cottage living room with wood paneling and a sitting area | Interior |
| 9 | `assets/images/cottages/ravenswood-03/photo-17.avif` | Henrietta Cottage blue dining room with an oval table and bookcase | Interior |
| 10 | `assets/images/cottages/ravenswood-03/photo-31.avif` | Henrietta Cottage kitchen with oak cabinets, gas range and an eat-in table | Interior |

**Why these ten.** They span the three towns (Marietta 4, Parkersburg 4, Ravenswood 2), mix kitchens, bedrooms and dining rooms, and include two exteriors. A mix of rooms and exteriors shows a searcher the actual home, and every frame is already vetted for the site.

**Left out on purpose**
- **Virginia Cottage and Buck Cottage.** Virginia's rooms are shown only partly furnished and it has no kitchen or bedroom photo, so it waits for the reshoot (`docs/marketing/reshoot-brief.md`). Buck's only exterior is a porch seen from inside, and its front-of-house frames show the house number.
- **Any frame with a house number or a neighbour's number.** For example `frederick-ext-2.jpeg`, where a number is painted on the porch column, is excluded by decision F1.
- **Oak's steps frame** (it looks across the road at neighbouring houses) and **Henrietta's yard frame** (a church and a street in the distance).
- **The 14 nearby-business photos** (no rights, decision F2) and every AI concept image.

**Prepare before upload**
1. Google accepts JPG and PNG, not AVIF (confirm the current format and size limits at upload). For the AVIF picks, export a JPG from the original in the private SharePoint staging, or from the repository asset, without changing the repository file. All ten are larger than Google's 720 by 720 minimum.
2. Strip location data (EXIF GPS) and all metadata from every upload. A hidden-address profile must not leak a home through a photo's metadata.
3. Look at each export at 100 percent: no number, plate, person or phone number. Three frames need a crop or a closer look. Photo 1 has a parked vehicle and a mailbox at the far left edge: crop them out. Photo 4 shows a truck reflected in the large front window: confirm no lettering or phone number is legible, or crop. Photo 7 shows a passing car through the railing at the lower left: crop it out.
4. Photo 5 is a wide crop (1920 by 820). Google crops thumbnails square, so check the table and chairs stay in frame.
5. Name the Google upload `mtcottages-<town>-<room>.jpg`, with no street or house name that could reveal an address.
6. Replace picks with the new frames as `reshoot-brief.md` is delivered, starting with a front-of-house frame for the Parkersburg and Ravenswood homes.

## 8. UTM-tagged links

The site's existing convention for stay-form links is `property`, `audience` and `src` (`src/data/stay-link.ts`, `docs/marketing/analytics-adr.md`), and listing channels use `utm_source`, `utm_medium` and `utm_campaign` (`docs/marketing/listing-channels.md`, section 5). For Google Business Profile, use Google's own tagging convention on the website link and the stay-form convention on the booking link.

| Where | Link |
|---|---|
| Website field (home page) | `https://mtcottages.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp` |
| Appointment or booking link (stay form, general) | `https://stay.mtcottages.com/?src=gbp` |
| Post link to Marietta guide | `https://mtcottages.com/marietta/?utm_source=google&utm_medium=organic&utm_campaign=gbp-post-marietta` |
| Post link to Parkersburg guide | `https://mtcottages.com/parkersburg/?utm_source=google&utm_medium=organic&utm_campaign=gbp-post-parkersburg` |
| Post link to Ravenswood guide | `https://mtcottages.com/ravenswood/?utm_source=google&utm_medium=organic&utm_campaign=gbp-post-ravenswood` |
| Post link, travel nurses | `https://mtcottages.com/travel-nurses/?utm_source=google&utm_medium=organic&utm_campaign=gbp-post-travel-nurses` |
| Post link, crews | `https://mtcottages.com/corporate-housing/?utm_source=google&utm_medium=organic&utm_campaign=gbp-post-corporate-housing` |

**What is counted today.** A search of `src`, `infra` and `scripts` on 2026-11-19 finds no code that reads `utm_*` parameters, and the collector stores the page path without its query string. So the website UTM tags land on the right page but are not recorded yet. What is recorded is the stay form's `src` value (so `src=gbp` shows up in the inquiry and funnel tables) and the referring hostname (`www.google.com`). That is why the booking link carries `src=gbp`: it is the link that is counted.

**Follow-up (separate issue, not done here):** have `src/components/Analytics.astro` copy a whitelisted `utm_source` or `utm_campaign` into the `src` dimension on the first page view, as suggested in `listing-channels.md`, so the website tags start counting without changing the collector's privacy rules.

## 9. Owner decisions (open)

The issue reserves these for the owner. Recommendations are mine; none is confirmed until the owner answers on #11.

| # | Decision | Recommendation | Why it is the owner's |
|---|---|---|---|
| O1 | **Who owns the profile** | An account the owner controls as primary owner, with ops added as a manager | A public listing under the business name, and the profile can only be created and verified from an account (the issue says "by the owner's account") |
| O2 | **Service-area business or storefront address** | Service-area, address hidden (section 2). Recorded on #37 on 2026-11-16 and left open here so the owner confirms it | It is the address policy, and any storefront would publish one of the four approved addresses a fifth time |
| O3 | **Verification method, and the private address Google is given** | Verify by whichever method Google offers; if it asks for a video, film only a neutral location and never a house number. Give Google a private address that is never displayed. Which address is the owner's call | Verification may need the owner's own phone, mailbox or video, and the private address is a personal data choice |
| O4 | **Phone number for verification only** | None displayed. Whether to give Google a number for verification is the owner's | The business has no public phone line |
| O5 | **Business name and categories** | "Mt Cottages" and the categories in section 3 | The legal or trading name and what the business says it is |
| O6 | **Hours** | Leave unset | Any hours or reply time is a promise ops must keep (D6) |
| O7 | **Whether to add Vienna or Williamstown** | Do not add; no home is there | It would change what the site claims it serves |
| O8 | **Posting cadence and who replies to reviews** | Replies by the owner or ops within the voice rules; posts only when there is real news | Staff time and brand voice |

**After approval.** The owner creates the profile (steps in the Google help centre), enters the fields from this pack, uploads the photos from section 7 after the preparation checks, and shares the profile with ops as manager. Record the profile's link and the verification date on #11. This pack is then updated to say what Google actually accepted.

## 10. Review requests: real reviews only

Policy, from the decision on #61 (2026-11-16): ask for free Google reviews, with consent only; no paid or gated reviews.

**Process**

1. **Who:** only guests who actually stayed. Ops asks near the end of the stay or soon after it, in the same thread as the stay. One request per stay.
2. **Consent first:** ask whether the guest is willing to leave a review. Send the review link only after a yes. Do not add the guest to a bulk list.
3. **The link:** use the review link Google gives the profile after verification (placeholder: `[profile review link, to be added when the profile is verified]`). Do not invent or shorten it by hand.
4. **No incentives:** no discount, free night, gift or other reward, no "review for a refund", and no hint of one.
5. **No gating:** ask every guest who agreed, not only the happy ones. Never screen guests with a private survey that only sends positive ones to Google.
6. **No writing for the guest:** do not draft the review, suggest a star rating, post on a guest's behalf, or ask staff, family, friends or owners of other homes to review.
7. **Replies:** the owner or ops replies to every review in the site's voice: calm, specific, thankful, and factual. For a complaint, say what happened and offer to talk offline, without pressing the guest to change or remove it. Never publish a guest's name, stay dates, unit or other private detail in a reply.
8. **Fake or policy-breaking reviews** (not just unfavourable ones) are reported to Google, never answered by posting counter-reviews.
9. **On the site:** no review or rating markup and no review quotes until real reviews exist and the guest has agreed to a quote. Do not republish Google reviews as the site's own structured ratings. `src/data/schema.ts` and `e2e/tests/schema.spec.js` already enforce "no rating or review markup until real reviews exist".
10. **Log:** keep a simple private count of requests sent and reviews received, without guest names in git, to see whether the process works.

**Request message (draft for ops to adapt; plain, no incentive)**

> Hello [first name], thank you for staying at [home name]. If you are willing, we would value an honest review of your stay on Google. It helps the next guest know what to expect. May I send you the link? There is no obligation, and your reply will not change anything about your stay.

After a yes:

> Thank you. Here is the link: [profile review link]. Write whatever you think is fair; we read every review.

## 11. Pre-launch checklist

- [ ] Owner has answered O1 to O8 on #11.
- [ ] Profile created from the owner's account; address hidden; no street address anywhere in the public fields.
- [ ] Three service areas entered, no more.
- [ ] Categories chosen from the live picker and confirmed.
- [ ] Description pasted as written; no links, phones or emails in it.
- [ ] Ten photos prepared (JPG, metadata stripped, checked at 100 percent) and uploaded.
- [ ] Website and booking links entered as in section 8.
- [ ] Hours unset; messaging off; no logo until #27 is decided.
- [ ] Verification done without showing a house number.
- [ ] Review process agreed with ops; the review link added to the template.
- [ ] Profile link and date recorded on #11, and this pack updated.
