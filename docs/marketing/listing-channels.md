# Listing channels pack: Furnished Finder and monthly-stay channels

_Prepared 2026-11-16 for WorldEnterpriseGroup/mtcottages#73 (growth roadmap #11). Written for the CEO and ops to decide and act on. Every vendor figure was checked on 2026-11-16; the sources and how each was verified are in section 7._

**No account has been created and nothing has been paid.** This document only prepares the options, the copy, the photo sets and the tracking links. Nothing goes live until the CEO decides in section 6 and the decision is recorded on #11.

## 1. Summary and recommendation

**Recommendation in three lines**

1. List on **Furnished Finder first, as a two-home pilot (Frederick Cottage and Oak Cottage): $199 per home per year, $398 plus tax, no commission.** One subscription also shows the listing on its sister site Travel Nurse Housing. Add Buck and Henrietta (another $398) after the pilot shows inquiries, and Broad and Virginia (another $398) after their photo gaps are closed. The ceiling for all six homes is $1,194 a year.
2. Add **Zillow Rentals** (free) for long-term and relocating renters once the pilot homes have owner-confirmed rates, and optionally try **BlueCollarHousing** ($99 a year, or free for one property under its founding-landlord offer) for crews. **Defer Airbnb monthly stays and Vrbo** until the owner decides on stays under 30 nights, lodging tax and a single master calendar; skip Apartments.com for now.
3. **Gate every listing on four owner answers:** a confirmed monthly rate per home (every rate is still only a guide), who holds the calendar, how rent and deposit are collected off-platform (Furnished Finder takes no payments and the site must not take any), and who the verified account holder is.

**Why Furnished Finder first.** Travel nurses are persona P1 and Furnished Finder is where they search. On 2026-11-16 Furnished Finder showed 28 furnished rentals in Parkersburg (13 available now) and 31 in Marietta, Ohio (19 available now), and Travel Nurse Housing showed 26 in Parkersburg (12 available now). The fee is flat, there is no commission, and the listing is a lead, not a booking: Furnished Finder is not a booking platform, so the lease and rent are between us and the tenant. That suits whole-home monthly stays and costs us a fraction of one month's rent per home.

**Expected reach and cost.** No vendor publishes traffic for our towns, and none could be verified, so this pack does not invent a figure. The internal estimate on #73 is 600 people per quarter at 50 percent confidence (RICE 600). The cost side is certain: $398 for the pilot. Illustratively, one three-month stay at the $2,575 monthly guide is $7,725, so the $199 fee for that home is 2.6 percent of one stay, against 3 percent plus guest fees on Airbnb and 12 percent on Vrbo (section 2 shows the arithmetic).

**The honest risk is price, not fees.** Our guide ($1,895 for one bedroom, $2,295 for two, $2,575 for three) sits well above what Furnished Finder renters usually see: a third-party guide puts typical Furnished Finder rents at $800 to $1,500 a month (national, not our towns), and the brand brief already notes furnished one-bedrooms listed from about $900 locally. We win on a whole home with a local team and honest photos, not on price. That is why the recommendation is a two-home pilot with tracking, not six homes at once.

**Photo and terms gaps found while preparing this pack** (details in sections 3 and 4):

- Virginia Cottage has no photo of a bed, a kitchen or a full bathroom, and was photographed mid-renovation. It should not be listed anywhere until the reshoot.
- Broad Cottage has no kitchen or exterior photo; Oak has no clean front-of-house photo; Frederick's best-resolution frames are limited (several are 720 pixels wide).
- Furnished Finder accepts PNG and JPEG only, and many portfolio originals are AVIF. They need a one-time JPEG export (the repository keeps its AVIF files untouched).
- Four files in Frederick's folder are named "photo" but are AI-generated concept images. They must never be uploaded.
- The site's analytics does not read `utm_*` parameters (section 5). The links still work, but attribution today comes from the referrer and from a `src` parameter on the stay form.

## 2. Channel cost and benefit

How to read the figures: each line names its source, and the sources table in section 7 says whether the vendor's own page was read directly or only seen through a search-result summary (several vendor sites return HTTP 403 to automated fetches). Anything not verified is marked **unverified**.

### 2.1 Furnished Finder (and Travel Nurse Housing): primary

| Item | Finding |
|---|---|
| Fee | $199 per property per year; $149 per add-on unit at the same address (not relevant to us: each home has its own address). Taxes added at checkout. Annual, auto-renewing, no free tier. Optional paid Listing Setup Service (about $99). Optional KeyCheck tenant screening (about $44.99 per applicant, applicant pays by default; secondary source). |
| Commission | None. Landlord keeps all rent; tenants pay no platform fee. |
| Who holds the payment | Us. Furnished Finder does not process bookings or collect rent. The lease and every payment are between landlord and tenant. We must supply a lease and a way to collect rent and deposit (decision O5). |
| Who holds the calendar | Us. Each listing has an availability calendar the landlord updates. Calendar sync is **unverified**: one older third-party source says it can import Airbnb and Vrbo iCal feeds but has no iCal or API export; a newer one says Hostfully now connects directly. Ask Furnished Finder support before relying on either. |
| Stay rules | Minimum stay of 30 days is a listing requirement. No platform cancellation rules: whatever we write in the lease governs. |
| Go-live requirements | Active paid subscription, ID verification through Jumio (a government ID and a selfie from the account holder), property type, city and state, monthly rent, at least 2 photos (up to 30, JPG or PNG, under 20 MB, 1024 x 683 pixels or larger recommended). |
| Text limits | Title and description limits not found. Photos only: no video upload, but a video link can go in the description under Amenities. A Website field exists on the property contact form (where the UTM link goes). Phone can be hidden. |
| Audience fit | P1 travel nurses and medical staff (strong; it was built for them). P2 crews (good: it has a corporate housing view). P4 relocating families (good). P7 long-term (fair). P3 insurance and P5/P6 short stays (poor: 30-day minimum, no booking engine). |
| Effort | About half a day per home for the first listing (JPEG export, 8 to 15 photos, copy paste, ID verification once). Then answering messages: the real ongoing work, and no response-time promise may be made until ops can keep one (D6). |
| Risks | Our price is above the usual range (see section 1). No review requirement was found, though tenant reviews exist on the platform; we never write or solicit invented ones. Off-platform payment means scam and no-show handling is ours. Double booking is possible if we also use another channel without one master calendar. |
| Fees passed to guests | None from Furnished Finder. Any deposit or screening fee is ours to set. |

Verdict: **do first.** Lowest fee per lead, best persona fit, no commission, reversible after 12 months.

### 2.2 Airbnb monthly stays (28 nights or more)

| Item | Finding |
|---|---|
| Fee | Host service fee: most hosts pay 3 percent (split-fee model); guests pay 14.1 to 16.5 percent of the booking subtotal on top. In the single-fee model the host pays everything, most hosts 15.5 percent (typically 14 to 16 percent). Airbnb says it can change fees at any time. Which model applies to a given host account is **unverified**. No listing fee. |
| Who holds the payment | Airbnb. For a stay of 28 nights or more the guest pays a first-month payment up front and the rest in monthly installments, charged 10 days ahead; Airbnb holds the first payment until 24 hours after check-in. |
| Who holds the calendar | Us, inside Airbnb (iCal sync with other tools is possible; not verified here). Hosts set minimum and maximum nights, advance notice and availability under Calendar. A minimum of 30 nights would match Frederick's listed 30-day minimum. |
| Cancellation for 30+ nights | Airbnb's long-term policy overrides the policy set for short stays. Firm: guests cancel up to 30 days before check-in for a full refund; after that the host is paid for nights spent plus 30 additional nights. Strict: full refund within 48 hours of booking and at least 28 days before check-in; after that, nights spent plus 30 additional nights. The first payment may be non-refundable depending on lead time. If a stay is shortened to 27 nights or fewer, the guest owes the following 30 days. |
| Discounts | Hosts can set a weekly (7+ nights) and monthly (28+ nights) discount, 0 to 99 percent; 10 percent or more shows in search results. Airbnb may add "monthly stay savings" that it pays itself. |
| Text and contact rules | Title: fewer than 50 characters, no emojis or symbols, do not repeat the town. Airbnb screens phone numbers and emails out of descriptions and bans moving contact or payment off the platform. So no inquiry link and no UTM link can go in an Airbnb listing. |
| Audience fit | P1 nurses (fair: many hospital-minded listings already exist). P5 and P6 visitors and P7 long-term (fair). P2 crews (fair). It is the largest audience but the least price-matched to our guide. |
| Effort | High at the start (listing, house rules, photo set, calendar), then message handling. |
| Risks | A new listing has no reviews, while the existing Parkersburg monthly listings show 4.85 to 4.97 stars with 145 to 202 reviews and Ravenswood monthly listings 121 to 131 reviews (search-result summaries, 2026-11-16). We must not fake reviews; a zero-review listing at $2,575 plus guest fees will convert poorly. Airbnb's own help text notes guests may establish tenant rights after a month; local law is a legal question for the owner. Double booking against Furnished Finder. Lodging-tax treatment of 28 to 30 night stays is unverified and tied to decision D3. |
| Fees passed to guests | Yes: 14.1 to 16.5 percent on top of the rate (split-fee), or built into the rate (single-fee). |

Verdict: **defer** until the owner decides D3 (stays under 30 nights, tax, insurance) and chooses one master calendar. It is the right second channel once those are settled.

### 2.3 Vrbo

| Item | Finding |
|---|---|
| Fee | Vrbo's host page (read directly) says "a flat 12% commission fee per booking" and that creating a listing is free. Secondary sources say this single 12 percent replaced, from 2026-10-29, the older roughly 8 percent pay-per-booking fee (5 percent commission plus 3 percent processing) and the $699-a-year subscription, which closed to new hosts. The 12 percent applies to the rental amount plus fees charged to the traveler such as cleaning and pet fees, not to Vrbo's traveler fee, taxes or refundable deposits. For hosts paid through Vrbo it includes payment processing; with your own processor you also pay that processor. Vrbo can change the rate with at least 30 days notice. |
| Who holds the payment | Vrbo (merchant of record) or our own processor. |
| Who holds the calendar | Us, in the Vrbo owner dashboard. Minimum and maximum stay can be set, with date-specific overrides. |
| Cancellation | Set per listing by the host. Vrbo has no special 28-night policy that we could find (**unverified**). |
| Text limits | Headline 20 to 40 characters (main help page; a regional page says 80). Description 400 to 10,000 characters. Text fields cannot contain URLs, HTML, phone numbers, email addresses or property addresses. So no inquiry link and no UTM link. |
| Audience fit | Vacation and family travel. Weak for nurses and crews. Vrbo advertises long-stay themed pages and a 19 percent average saving on select 28+ night homes, which shows it sells monthly stays by discount, the opposite of our positioning. |
| Effort | High; and a poor fit for a 30-day minimum. |
| Risks | The highest commission of any channel here. A traveler service fee is added on top for guests; its current percentage could not be verified (a secondary source says 11 to 14 percent). Double booking. |
| Fees passed to guests | Yes: the traveler service fee, which hosts cannot waive. |

Verdict: **not now.** Worst fee and weakest persona fit. Revisit only if the owner opens stays under 30 nights (D3) and builds a calendar tool.

### 2.4 Zillow Rentals (Rental Manager)

| Item | Finding |
|---|---|
| Fee | Free to publish since May 2022. Optional Premium upgrade: $39.99 one time per listing, up to 90 days, not a subscription, non-refundable. (An older help page says $29.99 and an older marketing page says $9.99 a week; both are outdated per the current help article.) |
| Who holds the payment | Us. Rent collection through Zillow is optional: free for the landlord and free for tenants paying by ACH; tenants pay 2.95 percent on credit cards and $9.95 on debit. Zillow's terms bar landlords from charging renters an application or payment-processing fee for applications or payments made through the platform. |
| Who holds the calendar | Us. It is a rental advertisement with an application flow, not a booking calendar. |
| Screening | Renters pay a $40 application fee that covers their screening reports; reports are free to landlords. |
| Audience fit | P7 long-term tenants and P4 relocating families (good: lease-style rentals; Zillow has "furnished apartments" pages by area). P1 nurses (weak: they search Furnished Finder). Whether Rental Manager has a furnished tag and how it treats a 30-day lease is **unverified**. |
| Effort | Low, about an hour per home using the short description. |
| Risks | The application and screening flow assumes a conventional lease and may not match our inquiry-first process. Our notes mention an unconfirmed $75 application fee; Zillow's terms would not allow charging it through the platform. Listing text is syndicated to Trulia and HotPads. |
| Fees passed to guests | The renter's $40 application fee. |

Verdict: **add after the pilot,** free, for P7 and P4, once rates are confirmed.

### 2.5 Apartments.com

| Item | Finding |
|---|---|
| Fee | Basic listing free for 1 to 4 units: runs 21 days and shows on 6 network sites, so it must be renewed. Premium upgrade has no published price (it is shown at checkout; third-party estimates of $29 to $39 and $50 to $500 a month are not from Apartments.com). Card and wallet rent payments cost 2.75 percent; ACH is free (who pays the 2.75 percent is **unverified**). |
| Who holds payment and calendar | Us. It is an advertisement, not a booking calendar. |
| Audience fit | P7 and P4 renters. Apartments.com has a furnished page for Parkersburg (3 furnished apartments seen, from $900 for a studio), which shows its furnished search is thin and apartment-oriented. |
| Effort and risks | The 21-day expiry means regular manual renewals; premium cost unknown; whole-home monthly stays are not its core. |

Verdict: **skip for now.** Zillow covers the same renters at no cost and without renewals.

### 2.6 BlueCollarHousing (named in the brand brief; the #11 benchmark lists crew-housing competitors)

| Item | Finding |
|---|---|
| Fee | $99 a year for a single listing; $10 a year per additional unit at the same address; $249 a year commercial. No booking fees. Annual, auto-renews, non-refundable except a full refund if the listing is rejected. A founding-landlord offer may list one property free, subject to area limits and review. |
| Who holds payment and calendar | Us. The site says it does not handle payments between landlords and renters, and it has no calendar by design. Renters call or text the landlord directly. |
| Audience fit | P2 corporate and project crews (the point of the site: weekly and monthly housing near plants and job sites). It has a Parkersburg, WV page. |
| Risks | Its coverage of the Ohio Valley is unproven: the FAQ names no Ohio or West Virginia areas and its popular areas shown are in Texas, and how many Parkersburg listings or renters it has could not be verified. The 3-bedroom homes (Frederick, Oak) are the crew product. |
| Effort | Low. |

Verdict: **optional second test.** Apply for the free founding-landlord slot for one 3-bedroom home; do not pay $99 until it produces a lead.

### 2.7 Considered and set aside

- **Google Vacation Rentals.** Free to appear, but individual hosts cannot list directly: it needs an approved connectivity partner (a channel manager or PMS) and a direct-booking site. It belongs to the PMS decision (benchmark item "PMS and channel manager"), not this pack.
- **Blueground, Landing and other operators.** These are operators with their own inventory, not channels we can list on. They are benchmarks, not options.
- **ALE and insurer platforms.** Registration is a separate owner decision (#11 item 15) and persona P3 work, not a listing channel.

### 2.8 Side-by-side

Illustrative arithmetic for one three-month stay of a three-bedroom home at the $2,575 guide, which is $7,725 of rent. It ignores cleaning fees, taxes and deposits, and uses the fee base each vendor names.

| Channel | Annual or listing cost | What we pay on that stay | What the guest pays on top |
|---|---|---|---|
| Furnished Finder | $199 per home per year | $199 for the year (2.6 percent of this one stay) | $0 |
| BlueCollarHousing | $99 per home per year (or free founding slot) | $99 | $0 |
| Zillow Rentals | $0 ($39.99 optional Premium) | $0 | $40 application fee (renter) |
| Apartments.com | $0 basic, premium price unpublished | $0 | none found |
| Airbnb, split-fee | $0 | 3 percent: $231.75 | 14.1 to 16.5 percent: $1,089 to $1,275 |
| Airbnb, single-fee | $0 | 15.5 percent: $1,197 | built into the rate |
| Vrbo | $0 | 12 percent: $927 | traveler service fee (percentage unverified) |


## 3. Ready-to-paste listing copy

Rules applied to every block below:

- Prices and terms appear only as `src/data/terms.json` states them. All six homes are `guide` for the monthly rate, so the rate is written as a guide and never as a quote. Deposit, utilities, pets and move-in date are all `confirm`, so the copy says to ask. Minimum stay is stated only where `terms.json` lists it (Frederick: 30 days; Oak, Buck and Virginia: one month); Broad and Henrietta say confirm, and decision O4 closes that.
- The street address appears in no title or description. It is entered only in a channel's structured address field, and only for the four approved homes (125 Frederick St, Marietta, OH 45750; 200 Henrietta St, Ravenswood, WV 26164; 2712 Broad St, Parkersburg, WV 26101; 3113 Broad St, Parkersburg, WV 26104). Buck and Virginia have no approved address: the channel setup form may demand one, and the owner or ops types it into that form, never into this repository or any listing text.
- Every Marietta mention says Marietta, Ohio. No review, rating, testimonial, response-time promise, pet promise, utilities promise or minimum-stay promise beyond `terms.json`.
- No exclamation marks, no banned brand words, no distances or drive times (the proximity claims are still under fact-check in #26).
- Character limits: Airbnb title 50 (Airbnb's title guidance says fewer than 50 and not to repeat the town, so no town appears in Airbnb titles); Vrbo headline 20 to 40 (Vrbo's main help page; a regional page says 80, so 40 is the safe figure); Furnished Finder title limit not found, so titles are 60 or fewer. Short descriptions are 500 characters or fewer for Airbnb's description box (the 500 figure comes from an Airbnb host forum answer, not a help page: check the box on screen). Long descriptions run 1,000 to 1,350 characters, above Vrbo's 400-character minimum.

### Frederick Cottage, Marietta, Ohio

Readiness: Ready after owner confirms the rate. 21 portfolio photos; several are 720 px wide (see section 4).

| Channel | Title | Characters |
|---|---|---|
| Airbnb | Furnished 3-bedroom with a fenced backyard | 42 of 50 |
| Vrbo | 3-bedroom home, fenced backyard | 31 of 40 |
| Furnished Finder, Zillow, Apartments.com, BlueCollarHousing | Furnished 3-bedroom home, fenced yard, Marietta, Ohio | 53 (60 or fewer; FF limit not found) |

Short description (434 characters; Airbnb, Zillow, Apartments.com):

> A furnished three-bedroom home in Marietta, Ohio, for stays of 30 days or more. A king, a double and a queen bedroom, each with a TV, so six people can share the house without sharing a room. Full kitchen with a gas range, dishwasher and full-size refrigerator, a long dining table, washer and dryer, 1 Gbps ethernet and wifi, and a fenced backyard with patio chairs. Ask us about the rate for your dates, utilities, pets and parking.

Long description (1208 characters; Furnished Finder, Vrbo, BlueCollarHousing):

> Frederick Cottage is a furnished three-bedroom home in Marietta, Ohio, set up for stays of 30 days or more.
>
> Sleeping: a king bed in Bedroom 1, a double in Bedroom 2 and a queen in Bedroom 3, each room with a TV, so six people can share the house without sharing a room. Bedroom 3 has a desk and chair, and the home lists a dedicated workspace and 1 Gbps ethernet alongside wifi.
>
> Kitchen: a full kitchen, not a kitchenette. Oak cabinets, a gas range and oven, a dishwasher and a full-size refrigerator, with cooking basics, dishes, silverware and a coffee maker. The long dining table is a few steps away. A washer and dryer are in the home.
>
> Outside: a fenced backyard with a lawn, wicker patio chairs and a picket fence. The listing includes self check-in with a keypad.
>
> What we confirm with you: the rate for your dates, what the rate covers for utilities, pets, the security deposit, parking details and your move-in date. One full bathroom serves the house; ask us whether it has a tub or only a shower.
>
> Mt Cottages is a small local team that looks after furnished homes in Marietta, Ohio, Parkersburg and Ravenswood. Anything marked confirm is not settled yet, and we would rather say so than guess.

Highlights (amenity or feature fields):

- Three bedrooms, three bed sizes: king, double and queen, each with a TV
- A full kitchen: gas range, dishwasher, full-size refrigerator, a long dining table next door
- Washer and dryer in the home; 1 Gbps ethernet and wifi
- Fenced backyard with patio chairs
- Self check-in with a keypad

Terms block to paste at the end of the FF, Zillow and Apartments.com descriptions (not Airbnb or Vrbo, where the price field does that job):

> Rate: $2,575/month guide for three-bedroom homes; this is the published guide, not a quote, so confirm the rate for your dates. Minimum stay: 30 days. Utilities, deposit, pets and move-in date: confirm on inquiry.

Address (structured field only): 125 Frederick St, Marietta, OH 45750. FF: city, state and ZIP are enough to go live (support page lists city and state as the location requirement). Airbnb, Vrbo and Zillow ask for the street address in a structured setup field: enter it there and nowhere else. Never in the title or description.

### Oak Cottage, Parkersburg, West Virginia

Readiness: Ready after owner confirms the rate. 8 full-size photos; no clean front-of-house frame exists (gap for Wardah).

| Channel | Title | Characters |
|---|---|---|
| Airbnb | Furnished 3-bedroom with a covered porch | 40 of 50 |
| Vrbo | 3-bedroom home, covered porch | 29 of 40 |
| Furnished Finder, Zillow, Apartments.com, BlueCollarHousing | Furnished 3-bedroom home with covered porch, Parkersburg, WV | 60 (60 or fewer; FF limit not found) |

Short description (378 characters; Airbnb, Zillow, Apartments.com):

> A furnished three-bedroom home in Parkersburg, West Virginia, set up for stays of a month or longer. Honey-oak kitchen that opens onto a bright dining room with an oval table, three furnished bedrooms with made beds, lamps and wall-mounted TVs, fiber-optic internet and a covered porch with two chairs. Ask us about the rate for your dates, utilities, laundry, parking and pets.

Long description (1333 characters; Furnished Finder, Vrbo, BlueCollarHousing):

> Oak Cottage is a furnished three-bedroom home in Parkersburg, West Virginia, set up for stays of a month or longer.
>
> Kitchen and dining: honey-oak cabinets, an electric range, a full-size refrigerator, a microwave, a toaster oven and a coffee maker, with the kitchen opening straight onto a bright dining room and an oval table with seating for shared meals.
>
> Sleeping: three furnished bedrooms. Each bedroom in the photos has a made bed, a nightstand and lamp, and a window, and the photographed bedrooms have wall-mounted TVs. A wall air-conditioning unit appears in one. Bed sizes are not confirmed yet; ask us.
>
> Bath and outside: a full bathroom with a tub and shower is photographed. A covered porch has two chairs and a side table for coffee or an evening call. Fiber-optic internet is listed, and the setting is quiet.
>
> Getting in: wooden steps lead down the slope from the house to the street, so ask us if stairs matter for you.
>
> What we confirm with you: the rate for your dates, what the rate covers for utilities, pets, the security deposit, washer and dryer, parking, how many people the home sleeps and your move-in date.
>
> Mt Cottages is a small local team that looks after furnished homes in Marietta, Ohio, Parkersburg and Ravenswood. Anything marked confirm is not settled yet, and we would rather say so than guess.

Highlights (amenity or feature fields):

- Kitchen that opens onto the dining room
- Three furnished bedrooms, each with a made bed, nightstand and lamp
- Covered porch with chairs
- Fiber-optic internet in a quiet setting
- Wooden steps up from the street (ask us if stairs matter)

Terms block to paste at the end of the FF, Zillow and Apartments.com descriptions (not Airbnb or Vrbo, where the price field does that job):

> Rate: $2,575/month guide for three-bedroom homes; this is the published guide, not a quote, so confirm the rate for your dates. Minimum stay: one month. Utilities, deposit, pets and move-in date: confirm on inquiry.

Address (structured field only): 2712 Broad St, Parkersburg, WV 26101. Same rule as Frederick: structured address field only, never in text.

### Henrietta Cottage, Ravenswood, West Virginia

Readiness: Ready after owner confirms rate and minimum stay (T3). Only one of two bedrooms is photographed.

| Channel | Title | Characters |
|---|---|---|
| Airbnb | Furnished 2-bedroom with a blue dining room | 43 of 50 |
| Vrbo | 2-bedroom home, blue dining room | 32 of 40 |
| Furnished Finder, Zillow, Apartments.com, BlueCollarHousing | Furnished 2-bedroom home, blue dining room, Ravenswood, WV | 58 (60 or fewer; FF limit not found) |

Short description (358 characters; Airbnb, Zillow, Apartments.com):

> A furnished two-bedroom home in Ravenswood, West Virginia. A blue dining room with an oval table, a second room with striped wallpaper and a round table, an oak-cabinet kitchen with a gas range, dishwasher and eat-in table, hardwood floors, and a fenced lawn with mature trees. Ask us about the rate for your dates, minimum stay, utilities, parking and pets.

Long description (1114 characters; Furnished Finder, Vrbo, BlueCollarHousing):

> Henrietta Cottage is a furnished two-bedroom home in Ravenswood, West Virginia.
>
> Kitchen and dining: oak cabinets, a gas range, a full-size refrigerator with an ice dispenser, a dishwasher and an eat-in table. The blue dining room has an oval table, a bookcase and a mantel, and a second room with striped wallpaper has a round table. Hardwood floors run through the photographed rooms.
>
> Sleeping and bath: the photos show one of the two bedrooms, furnished with a bed, nightstand and shelving. Two bathrooms appear in the photos; we have not confirmed the official count, and bed sizes are not confirmed yet. A washing machine is photographed; ask us about a dryer.
>
> Outside: a lawn with a fence and mature trees, seen from the porch.
>
> What we confirm with you: the rate for your dates, the minimum stay, what the rate covers for utilities, pets, the security deposit, internet speed, parking and your move-in date.
>
> Mt Cottages is a small local team that looks after furnished homes in Marietta, Ohio, Parkersburg and Ravenswood. Anything marked confirm is not settled yet, and we would rather say so than guess.

Highlights (amenity or feature fields):

- A blue dining room made for shared meals, plus a striped-wallpaper second table room
- Oak-cabinet kitchen: gas range, full-size refrigerator, dishwasher, eat-in table
- Hardwood floors in the photographed rooms
- Fenced lawn with mature trees
- Two bathrooms appear in the photos (count to confirm)

Terms block to paste at the end of the FF, Zillow and Apartments.com descriptions (not Airbnb or Vrbo, where the price field does that job):

> Rate: $2,295/month guide for two-bedroom homes; this is the published guide, not a quote, so confirm the rate for your dates. Minimum stay: confirm on inquiry. Utilities, deposit, pets and move-in date: confirm on inquiry.

Address (structured field only): 200 Henrietta St, Ravenswood, WV 26164. Same rule: structured address field only, never in text.

### Buck Cottage, Parkersburg, West Virginia

Readiness: Ready after owner confirms the rate. Kitchen and one bedroom photo are small (720 px).

| Channel | Title | Characters |
|---|---|---|
| Airbnb | Furnished 1-bedroom with a lamplit living room | 46 of 50 |
| Vrbo | 1-bedroom home, lamplit living room | 35 of 40 |
| Furnished Finder, Zillow, Apartments.com, BlueCollarHousing | Furnished 1-bedroom home, covered porch, Parkersburg, WV | 56 (60 or fewer; FF limit not found) |

Short description (417 characters; Airbnb, Zillow, Apartments.com):

> A furnished one-bedroom home in Parkersburg, West Virginia, sized for one person or a couple and set up for stays of a month or longer. A living room with a reclining sofa and warm lamps, a bedroom with a wall-mounted TV and a door into the bathroom, a compact kitchen with a full-size refrigerator, a covered front porch and fiber-optic internet. Ask us about the rate for your dates, utilities, laundry and parking.

Long description (1127 characters; Furnished Finder, Vrbo, BlueCollarHousing):

> Buck Cottage is a furnished one-bedroom home in Parkersburg, West Virginia, sized for one person or a couple and set up for stays of a month or longer.
>
> Living: a reclining sofa, a coffee table and warm lamps make an easy place to end the day. A blue room with a desk, a desk chair and a second bed is photographed; ask us how that room is set up.
>
> Sleeping and bath: the bedroom has a made bed, a wall-mounted TV and a door that opens straight into the bathroom, which has a tub and shower.
>
> Kitchen: a compact kitchen with a double sink, a toaster oven, a microwave and a full-size refrigerator. We have not confirmed a stovetop or cookware, so ask before you plan big meals.
>
> Also listed: fiber-optic internet and a quiet setting. A covered front porch is in the photos.
>
> What we confirm with you: the rate for your dates, what the rate covers for utilities, pets, the security deposit, laundry, parking and your move-in date.
>
> Mt Cottages is a small local team that looks after furnished homes in Marietta, Ohio, Parkersburg and Ravenswood. Anything marked confirm is not settled yet, and we would rather say so than guess.

Highlights (amenity or feature fields):

- A living room to unwind in: reclining sofa, coffee table, warm lamps
- Bedroom with a wall-mounted TV and its own door into the bathroom
- Compact kitchen with a full-size refrigerator, microwave and toaster oven
- Covered front porch
- Fiber-optic internet in a quiet setting

Terms block to paste at the end of the FF, Zillow and Apartments.com descriptions (not Airbnb or Vrbo, where the price field does that job):

> Rate: $1,895/month guide for one-bedroom homes; this is the published guide, not a quote, so confirm the rate for your dates. Minimum stay: one month. Utilities, deposit, pets and move-in date: confirm on inquiry.

Address: none approved. Describe the location as the town only. If a channel's setup form demands a street address, the owner or ops enters it there; it never goes in a title, description, photo caption or this repository.

### Broad Cottage, Parkersburg, West Virginia

Readiness: Hold for wave 3: the kitchen and the outside are not photographed. Rate and minimum stay (T3) to confirm.

| Channel | Title | Characters |
|---|---|---|
| Airbnb | Furnished 1-bedroom, wood-paneled living room | 45 of 50 |
| Vrbo | 1-bedroom, wood-paneled living room | 35 of 40 |
| Furnished Finder, Zillow, Apartments.com, BlueCollarHousing | Furnished 1-bedroom home, wood-paneled, Parkersburg, WV | 55 (60 or fewer; FF limit not found) |

Short description (393 characters; Airbnb, Zillow, Apartments.com):

> A furnished one-bedroom, one-bath home in Parkersburg, West Virginia. A living room with knotty wood paneling, a sectional sofa and a wall-mounted TV, a bedroom with a queen bed and a desk by the window, a washer and dryer beside the bathroom vanity, and fiber-optic internet. We have not photographed the kitchen yet. Ask us about the rate for your dates, minimum stay, utilities and parking.

Long description (1142 characters; Furnished Finder, Vrbo, BlueCollarHousing):

> Broad Cottage is a furnished one-bedroom, one-bath home in Parkersburg, West Virginia.
>
> Living: warm wood paneling, a big sectional and a wall-mounted TV make the main room feel settled in from day one. A wall-mounted air-conditioning unit is in the living room.
>
> Sleeping and work: a queen bed with a carved wood frame, a mirror, a wall-mounted TV and a desk with a chair share the bedroom, so you can sleep and work without moving furniture.
>
> Bath and laundry: a full-size tub, and a washer and dryer beside the vanity, so there is no trip to a laundromat.
>
> Also listed: a full kitchen and fiber-optic internet (speed to confirm), on a single level. We have not photographed the kitchen or the outside yet, so we mark those for confirmation rather than describe them.
>
> What we confirm with you: the rate for your dates, the minimum stay, what the rate covers for utilities, pets, the security deposit, cookware, parking and your move-in date.
>
> Mt Cottages is a small local team that looks after furnished homes in Marietta, Ohio, Parkersburg and Ravenswood. Anything marked confirm is not settled yet, and we would rather say so than guess.

Highlights (amenity or feature fields):

- A wood-paneled living room with a sectional and a wall-mounted TV
- Queen bed, mirror and a desk with a chair in the bedroom
- Washer and dryer in the home
- Full kitchen listed (not yet photographed)
- Fiber-optic internet (speed to confirm)

Terms block to paste at the end of the FF, Zillow and Apartments.com descriptions (not Airbnb or Vrbo, where the price field does that job):

> Rate: $1,895/month guide for one-bedroom homes; this is the published guide, not a quote, so confirm the rate for your dates. Minimum stay: confirm on inquiry. Utilities, deposit, pets and move-in date: confirm on inquiry.

Address (structured field only): 3113 Broad St, Parkersburg, WV 26104. Same rule: structured address field only, never in text.

### Virginia Cottage, Ravenswood, West Virginia

Readiness: HOLD: no photo of a bed, kitchen or full bathroom exists, and the house was photographed mid-renovation (notes/owner-decisions.md, V3 to V8). List only after the reshoot.

| Channel | Title | Characters |
|---|---|---|
| Airbnb | Furnished 2-bedroom with a brick fireplace | 42 of 50 |
| Vrbo | 2-bedroom home, brick fireplace | 31 of 40 |
| Furnished Finder, Zillow, Apartments.com, BlueCollarHousing | 2-bedroom home with brick fireplace, Ravenswood, WV | 51 (60 or fewer; FF limit not found) |

Short description (379 characters; Airbnb, Zillow, Apartments.com):

> A two-bedroom home in Ravenswood, West Virginia, with older-house character: a white brick fireplace with built-in shelves, a curved staircase and a sunny dining room with a farmhouse table. Offered for stays of a month or longer. The current photos show the rooms only partly furnished, so ask us how the home is set up for your dates, and about the rate, utilities and parking.

Long description (1026 characters; Furnished Finder, Vrbo, BlueCollarHousing):

> Virginia Cottage is a two-bedroom home in Ravenswood, West Virginia, offered for stays of a month or longer.
>
> Character: a wide white brick fireplace beside built-in bookshelves against deep red walls, a curved staircase with a dark wood handrail, and a sunny dining room with toile wallpaper and a farmhouse table with four chairs. Whether the fireplace can be used is not confirmed.
>
> Honest note: the current photos show the rooms only partly furnished, and there is no photo of a bed, the kitchen or a full bathroom yet. Please ask us how the home is set up for your dates before you rely on any detail.
>
> Also listed: a full kitchen and fiber-optic internet.
>
> What we confirm with you: the rate for your dates, bed sizes, what the rate covers for utilities, pets, the security deposit, laundry, parking and your move-in date.
>
> Mt Cottages is a small local team that looks after furnished homes in Marietta, Ohio, Parkersburg and Ravenswood. Anything marked confirm is not settled yet, and we would rather say so than guess.

Highlights (amenity or feature fields):

- A white brick fireplace with built-in shelves (use to confirm)
- A curved staircase with a dark wood handrail
- A sunny dining room with a farmhouse table
- Fiber-optic internet

Terms block to paste at the end of the FF, Zillow and Apartments.com descriptions (not Airbnb or Vrbo, where the price field does that job):

> Rate: $2,295/month guide for two-bedroom homes; this is the published guide, not a quote, so confirm the rate for your dates. Minimum stay: one month. Utilities, deposit, pets and move-in date: confirm on inquiry.

Address: none approved. Describe the location as the town only. If a channel's setup form demands a street address, the owner or ops enters it there; it never goes in a title, description, photo caption or this repository.

## 4. Real-photo sets

Every photo below is a real portfolio photograph from `assets/images/cottages/<house-id>/`. AI-generated concept images (the `3d/` folders and four Frederick files named like photos) are never uploaded to any channel: channels treat what you upload as a photograph of the home.

How to use a set: upload in the order listed (the first photo is the cover and is what searchers see), keep the caption as the photo's caption where a channel offers one, and do not edit, retouch or crop to hide anything. File names are relative to the home's folder.

Before any upload:

- **Format.** Furnished Finder takes PNG and JPEG only (JPG or PNG, 20 MB or less each). Files marked "convert" exist only as AVIF and need a one-time export to JPEG on the uploader's machine; the repository's AVIF files stay as they are. Airbnb and Zillow accept JPEG, so export those the same way.
- **Size.** Furnished Finder recommends 1024 x 683 pixels or larger. Files marked "small" are under that on the long edge: use them only after the large ones, and ask Wardah for a reshoot where a home depends on them.
- **Privacy check.** Look at each frame at full size for a house number, a street sign or a mailbox before upload. Four homes may show their approved address; Buck and Virginia may not show any number.

### Frederick Cottage

Folder: `assets/images/cottages/marietta-01/`

| # | File | Caption | Size and format |
|---|---|---|---|
| 1 | `frederick-ext-1.jpeg` | Front of the house, with the driveway and lawn | 1440x1080 |
| 2 | `gallery-01.jpg` | Kitchen: oak cabinets, gas range, dishwasher, windows over the counter | 1920x1080 |
| 3 | `photo-27.jpg` | Dining and entry: long wooden table, bench, staircase | 1920x1080 |
| 4 | `photo-36.jpg` | Bedroom 1: king bed, wicker chair, windows | 1920x1080 |
| 5 | `photo-25.jpg` | Bedroom 2: double bed and an antique vanity | 1920x1080 |
| 6 | `frederick-bed3-1.jpeg` | Bedroom 3: queen bed and bedside lamps | 720x540 small |
| 7 | `frederick-bath-1.jpg` | The bathroom, with a window and storage over the toilet | 720x960 small |
| 8 | `frederick-backyard-cover.jpg` | Backyard: lawn, patio chairs and picket fence in fall | 1200x900 |
| 9 | `frederick-kitchen-1.avif` | Full kitchen, from range to sink | 1200x675 convert |
| 10 | `frederick-bed3-3.avif` | Bedroom 3: TV and glass-paneled door | 1920x1440 convert |
| 11 | `frederick-living-1.jpeg` | The long dining table by the stairs and front door | 720x405 small |
| 12 | `frederick-kitchen-3.avif` | Range, counter space and the full-size refrigerator | 720x405 small convert |
| 13 | `frederick-bed3-2.jpeg` | Bedroom 3: storage wall with hanging rods, and the desk corner | 720x540 small |
| 14 | `frederick-bath-2.jpg` | Bathroom vanity, mirrored cabinet and light bar | 720x960 small |
| 15 | `frederick-ext-3.jpeg` | The same front in winter (optional) | 720x960 small |

Do not upload:

- frederick-ext-2.jpeg (a painted number on a porch column may be legible; owner decision F1)
- frederick-bed1-dollhouse.png, frederick-bed2-photo1.jpeg, frederick-bed2-photo2.jpeg, frederick-bed3-photo1.jpeg (AI-generated concept images despite the file names; the site labels them as concepts)
- frederick-nearby-*, frederick-buckeye-park-* (no recorded source or usage rights, decision F2)

### Oak Cottage

Folder: `assets/images/cottages/parkersburg-04/`

| # | File | Caption | Size and format |
|---|---|---|---|
| 1 | `photo-23.jpg` | Dining room: oval navy table and a bright window (leads, because no clean front-of-house photo exists) | 1920x1280 |
| 2 | `photo-08.jpg` | Kitchen: honey-oak cabinets, range and full-size refrigerator | 2400x1600 |
| 3 | `photo-07.jpg` | Bedroom with a gray upholstered headboard and layered bedding | 2400x1600 |
| 4 | `photo-17.jpg` | Bedroom with striped bedding and a cream dresser | 1920x1280 |
| 5 | `photo-01.jpg` | Bedroom with white bedding and a wall-mounted TV | 2400x1600 |
| 6 | `photo-40.jpg` | Bathroom: tub and shower, wood vanity | 1920x1280 |
| 7 | `photo-05.jpg` | Covered porch with two chairs | 2400x1600 |
| 8 | `photo-11.jpg` | Bedroom with folded towels and a warm bedside lamp | 1920x1280 |

Do not upload:

- 3d/oak-dining-kitchen-45.jpg, 3d/oak-bedroom-top-down.jpg (AI concept images)
- unique/*-648x470.avif (under 1024 px; use only if a channel needs more than 8 photos, and reshoot first). unique/parkersburg-index-img-23-83f99682b9-648x470.avif shows the street below the house, and has not been checked for house numbers, so Wardah should review it before any use
- homepage-hero-oak-dining.avif, homepage-hero-oak.avif (cropped website banners)

### Henrietta Cottage

Folder: `assets/images/cottages/ravenswood-03/`

| # | File | Caption | Size and format |
|---|---|---|---|
| 1 | `photo-17.jpg` | Blue dining room with an oval table, bookcase and mantel | 1920x1080 |
| 2 | `photo-31.jpg` | Kitchen: oak cabinets, gas range and an eat-in table | 1920x1080 |
| 3 | `unique/apply-background-303-8f0c3cac6a-1920x869.avif` | Kitchen: refrigerator, dishwasher and a hutch | 1920x869 convert |
| 4 | `photo-06.jpg` | Striped-wallpaper room with a round table | 2400x1350 |
| 5 | `photo-42.jpg` | The photographed bedroom: bed, nightstand and shelving | 1920x1080 |
| 6 | `photo-40.jpg` | The same bedroom from the opposite corner | 1920x1080 |
| 7 | `photo-04.jpg` | Bathroom with a tub-shower and built-in linen storage | 2400x1350 |
| 8 | `photo-36.jpg` | Lawn and fence as seen from the porch | 1920x1080 |

Do not upload:

- 3d/henrietta-dining-45.jpg, 3d/henrietta-kitchen-top-down.jpg (AI concept images)
- photo-13.jpg (upright piano: whether it stays with the furnishings is unconfirmed)
- unique/*-648x470.avif (blue bathroom, washing machine, mantel angle, doorway: under 1024 px)
- homepage-hero-henrietta*.avif (cropped website banners)

### Buck Cottage

Folder: `assets/images/cottages/parkersburg-02/`

| # | File | Caption | Size and format |
|---|---|---|---|
| 1 | `photo-49.jpg` | Living room: reclining sofa and warm lamplight | 1200x900 |
| 2 | `photo-50.jpg` | The living room straight on, with two lamps and framed art | 1200x900 |
| 3 | `buck-bedroom.jpg` | Bedroom: made bed, wall TV and a door into the bathroom | 1200x800 |
| 4 | `buck-bathroom.jpg` | Bathroom: tub and shower, vanity, glass-block window | 1200x800 |
| 5 | `buck-kitchen.jpg` | Compact kitchen: double sink, full-size refrigerator | 720x480 small |
| 6 | `buck-bedroom-alt.jpg` | The bed from the corner, with a nightstand and lamp | 720x480 small |
| 7 | `photo-45.jpg` | Covered front porch, seen from the front door | 900x1200 |
| 8 | `photo-38.jpg` | A blue room with a desk by the window and a second bed (say what it is when asked: use is to confirm) | 1200x900 |

Do not upload:

- photo-09, photo-11, photo-23, photo-41 and the front-of-house frames (not curated for the site; the front frames show the house number and Buck's address is not approved, decision B1)
- homepage-hero-buck.avif (cropped website banner)

### Broad Cottage

Folder: `assets/images/cottages/parkersburg-01/`

| # | File | Caption | Size and format |
|---|---|---|---|
| 1 | `photo-44.jpg` | Living room: knotty wood paneling, wall TV and sitting area | 1920x1280 |
| 2 | `photo-06.jpg` | Another angle of the living room, with window light | 2400x1600 |
| 3 | `photo-45.jpg` | Bedroom: queen bed with a carved wood frame, desk chair by the window | 1920x1280 |
| 4 | `photo-20.jpg` | Bathroom: full-size tub and wood vanity | 1920x1280 |
| 5 | `photo-42.jpg` | Vanity, washer and dryer, and a curtained shower area | 1920x1280 |
| 6 | `photo-12.jpg` | Washer and dryer beside the vanity | 1920x1280 |

Do not upload:

- 3d/broad-concept-top-down.png, 3d/broad-concept-45-degree.png (AI concept images)
- unique/*-648x470.avif (sectional, living corner, mirror wall, desk, bedroom door: under 1024 px)
- photo-01.jpg, photo-49.jpg (not curated for the site)
- Gap: no kitchen photo and no exterior photo exist. Do not list until Wardah supplies the kitchen

### Virginia Cottage

Folder: `assets/images/cottages/ravenswood-02/`

| # | File | Caption | Size and format |
|---|---|---|---|
| 1 | `photo-117.jpg` | White brick fireplace and built-in shelves against deep red walls | 1920x1440 |
| 2 | `photo-55.jpg` | Sunny dining room with toile wallpaper and a farmhouse table | 1920x1440 |
| 3 | `photo-27.jpg` | Curved staircase with a dark wood handrail | 1920x1440 |
| 4 | `photo-116.jpg` | A sunny corner with a tall double window and a carved chest of drawers | 1920x2560 |
| 5 | `photo-53.jpg` | Powder room with a vanity sink and an octagonal mirror | 1920x2560 |

Do not upload:

- photo-54.jpg (maintenance frame: cleaning supplies, an extinguisher and an open switch box), photo-77.jpg (an empty room with a patched outlet and a vacuum)
- Gap: no bed, kitchen, full bathroom or front-of-house photo exists. Hold until the reshoot (V8)

Gaps to close before the listings are strong (for Wardah): a clean front-of-house photo for Oak and Broad, a Broad kitchen, all of Virginia's beds, kitchen, full bathroom and exterior, Henrietta's second bedroom, and larger replacements for every "small" file above.

## 5. UTM-tagged links

**Convention.** `utm_source` is the channel slug, `utm_medium` is always `listing`, and `utm_campaign` is the home id. The stay-form deep links use the site's own convention from the analytics ADR: `property` (home id), `audience` (one of the slugs in `src/data/stay-link.ts`) and `src` (the CTA source slug, here the channel slug).

**What the analytics actually reads (grep of `src`, `infra`, `scripts`, `docs` on 2026-11-16).** Nothing reads `utm_*` parameters. The collector stores the page path without its query string (`docs/marketing/analytics-adr.md`), and `src/components/Analytics.astro` does not parse the query. So a UTM link still lands on the right page, but the tags are not recorded. What is recorded today:

- The hostname of the external referrer, so visits that arrive from `www.furnishedfinder.com`, `www.zillow.com` or `www.apartments.com` appear in the dashboard's referring-sites table without any tag.
- The stay form's `src`, `audience` and `property` parameters on the stay page (`stay.mtcottages.com`), which flow into the dashboard's inquiry and funnel tables.

**How to use the links.** Where a channel has a Website field (Furnished Finder's property contact form is the one confirmed), paste the stay-form link, because that is the one that is counted today. Use the UTM link for the marketing site's home page if the channel wants a website, because it costs nothing and works the day the analytics learns to read it. Airbnb and Vrbo strip links and contact details from listings, so no link goes in them: for those two channels, ask guests where they heard of us in the first reply.

**Suggested follow-up (not done here, a separate issue):** have `Analytics.astro` copy a whitelisted `utm_source` into the `src` dimension on the first page view, so UTM links start counting without changing the collector's privacy rules (a slug from a fixed list, never the raw query string).

Stay-form links (counted today) and UTM links (tagged, not yet read), per home and channel:

**Frederick Cottage**

| Channel | Stay-form link (counted today) | UTM link to the home page |
|---|---|---|
| Furnished Finder | `https://stay.mtcottages.com/?property=frederick&audience=healthcare&src=furnishedfinder` | `https://mtcottages.com/marietta/frederick/?utm_source=furnishedfinder&utm_medium=listing&utm_campaign=frederick` |
| Zillow Rentals | `https://stay.mtcottages.com/?property=frederick&audience=long-term&src=zillow` | `https://mtcottages.com/marietta/frederick/?utm_source=zillow&utm_medium=listing&utm_campaign=frederick` |
| Apartments.com | `https://stay.mtcottages.com/?property=frederick&audience=long-term&src=apartments-com` | `https://mtcottages.com/marietta/frederick/?utm_source=apartments-com&utm_medium=listing&utm_campaign=frederick` |
| BlueCollarHousing | `https://stay.mtcottages.com/?property=frederick&audience=crew&src=bluecollarhousing` | `https://mtcottages.com/marietta/frederick/?utm_source=bluecollarhousing&utm_medium=listing&utm_campaign=frederick` |
| Airbnb, Vrbo | none: these channels remove links | none |

**Oak Cottage**

| Channel | Stay-form link (counted today) | UTM link to the home page |
|---|---|---|
| Furnished Finder | `https://stay.mtcottages.com/?property=oak&audience=healthcare&src=furnishedfinder` | `https://mtcottages.com/parkersburg/oak-cottage/?utm_source=furnishedfinder&utm_medium=listing&utm_campaign=oak` |
| Zillow Rentals | `https://stay.mtcottages.com/?property=oak&audience=long-term&src=zillow` | `https://mtcottages.com/parkersburg/oak-cottage/?utm_source=zillow&utm_medium=listing&utm_campaign=oak` |
| Apartments.com | `https://stay.mtcottages.com/?property=oak&audience=long-term&src=apartments-com` | `https://mtcottages.com/parkersburg/oak-cottage/?utm_source=apartments-com&utm_medium=listing&utm_campaign=oak` |
| BlueCollarHousing | `https://stay.mtcottages.com/?property=oak&audience=crew&src=bluecollarhousing` | `https://mtcottages.com/parkersburg/oak-cottage/?utm_source=bluecollarhousing&utm_medium=listing&utm_campaign=oak` |
| Airbnb, Vrbo | none: these channels remove links | none |

**Henrietta Cottage**

| Channel | Stay-form link (counted today) | UTM link to the home page |
|---|---|---|
| Furnished Finder | `https://stay.mtcottages.com/?property=henrietta&audience=healthcare&src=furnishedfinder` | `https://mtcottages.com/ravenswood/henrietta-cottage/?utm_source=furnishedfinder&utm_medium=listing&utm_campaign=henrietta` |
| Zillow Rentals | `https://stay.mtcottages.com/?property=henrietta&audience=long-term&src=zillow` | `https://mtcottages.com/ravenswood/henrietta-cottage/?utm_source=zillow&utm_medium=listing&utm_campaign=henrietta` |
| Apartments.com | `https://stay.mtcottages.com/?property=henrietta&audience=long-term&src=apartments-com` | `https://mtcottages.com/ravenswood/henrietta-cottage/?utm_source=apartments-com&utm_medium=listing&utm_campaign=henrietta` |
| BlueCollarHousing | `https://stay.mtcottages.com/?property=henrietta&audience=crew&src=bluecollarhousing` | `https://mtcottages.com/ravenswood/henrietta-cottage/?utm_source=bluecollarhousing&utm_medium=listing&utm_campaign=henrietta` |
| Airbnb, Vrbo | none: these channels remove links | none |

**Buck Cottage**

| Channel | Stay-form link (counted today) | UTM link to the home page |
|---|---|---|
| Furnished Finder | `https://stay.mtcottages.com/?property=buck&audience=healthcare&src=furnishedfinder` | `https://mtcottages.com/parkersburg/buck-cottage/?utm_source=furnishedfinder&utm_medium=listing&utm_campaign=buck` |
| Zillow Rentals | `https://stay.mtcottages.com/?property=buck&audience=long-term&src=zillow` | `https://mtcottages.com/parkersburg/buck-cottage/?utm_source=zillow&utm_medium=listing&utm_campaign=buck` |
| Apartments.com | `https://stay.mtcottages.com/?property=buck&audience=long-term&src=apartments-com` | `https://mtcottages.com/parkersburg/buck-cottage/?utm_source=apartments-com&utm_medium=listing&utm_campaign=buck` |
| BlueCollarHousing | `https://stay.mtcottages.com/?property=buck&audience=crew&src=bluecollarhousing` | `https://mtcottages.com/parkersburg/buck-cottage/?utm_source=bluecollarhousing&utm_medium=listing&utm_campaign=buck` |
| Airbnb, Vrbo | none: these channels remove links | none |

**Broad Cottage**

| Channel | Stay-form link (counted today) | UTM link to the home page |
|---|---|---|
| Furnished Finder | `https://stay.mtcottages.com/?property=broad&audience=healthcare&src=furnishedfinder` | `https://mtcottages.com/parkersburg/broad-cottage/?utm_source=furnishedfinder&utm_medium=listing&utm_campaign=broad` |
| Zillow Rentals | `https://stay.mtcottages.com/?property=broad&audience=long-term&src=zillow` | `https://mtcottages.com/parkersburg/broad-cottage/?utm_source=zillow&utm_medium=listing&utm_campaign=broad` |
| Apartments.com | `https://stay.mtcottages.com/?property=broad&audience=long-term&src=apartments-com` | `https://mtcottages.com/parkersburg/broad-cottage/?utm_source=apartments-com&utm_medium=listing&utm_campaign=broad` |
| BlueCollarHousing | `https://stay.mtcottages.com/?property=broad&audience=crew&src=bluecollarhousing` | `https://mtcottages.com/parkersburg/broad-cottage/?utm_source=bluecollarhousing&utm_medium=listing&utm_campaign=broad` |
| Airbnb, Vrbo | none: these channels remove links | none |

**Virginia Cottage**

| Channel | Stay-form link (counted today) | UTM link to the home page |
|---|---|---|
| Furnished Finder | `https://stay.mtcottages.com/?property=virginia&audience=healthcare&src=furnishedfinder` | `https://mtcottages.com/ravenswood/virginia-cottage/?utm_source=furnishedfinder&utm_medium=listing&utm_campaign=virginia` |
| Zillow Rentals | `https://stay.mtcottages.com/?property=virginia&audience=long-term&src=zillow` | `https://mtcottages.com/ravenswood/virginia-cottage/?utm_source=zillow&utm_medium=listing&utm_campaign=virginia` |
| Apartments.com | `https://stay.mtcottages.com/?property=virginia&audience=long-term&src=apartments-com` | `https://mtcottages.com/ravenswood/virginia-cottage/?utm_source=apartments-com&utm_medium=listing&utm_campaign=virginia` |
| BlueCollarHousing | `https://stay.mtcottages.com/?property=virginia&audience=crew&src=bluecollarhousing` | `https://mtcottages.com/ravenswood/virginia-cottage/?utm_source=bluecollarhousing&utm_medium=listing&utm_campaign=virginia` |
| Airbnb, Vrbo | none: these channels remove links | none |

The audience values are the nearest personas: `healthcare` for Furnished Finder (travel nurses), `long-term` for Zillow and Apartments.com, `crew` for BlueCollarHousing. Change `audience` to `relocation` for a relocation-targeted variant.

## 6. Owner-decision checklist

**No account has been created and nothing has been paid.** Each line below needs the CEO's answer (or an ops confirmation where noted) before the matching listing is created. D-numbers refer to `docs/marketing/brand-and-positioning.md`; T, F, B and V numbers refer to `notes/owner-decisions.md`.

| # | Decision | Recommended answer | Blocks |
|---|---|---|---|
| O1 | Which channel first | Furnished Finder, two-home pilot (Frederick, Oak): $398 a year plus tax | Everything |
| O2 | Who is the verified account holder (a government ID and selfie through Jumio) and which email and phone appear on listings | The owner or the person named on the lease; use a shared mailbox, not a personal one | Furnished Finder, Zillow |
| O3 | Confirm the monthly rate for each home (all six are `guide` today) and whether the pilot homes will price near the guide or lower | Confirm the guide per home before any listing goes live; consider a first-lease discount instead of lowering the guide | All channels (T-rows in owner-decisions) |
| O4 | Minimum stay for Broad and Henrietta (T3) and whether 30 days is the rule everywhere | 30 days, matching Frederick and Furnished Finder's rule | Furnished Finder |
| O5 | How rent and deposit are collected off-platform (lease template, payment method, deposit amount, refund rule) | One lease template and one payment method for all homes; the marketing site must not take payments | Furnished Finder, BlueCollarHousing, Zillow |
| O6 | Master calendar: one place where availability lives, updated before any new channel is opened | A single shared calendar kept by ops; no second channel until it exists | Double-booking risk on every second channel |
| O7 | Stays under 30 nights, lodging tax and insurance (D3) | Not now; keep the 30-day minimum | Airbnb, Vrbo |
| O8 | Response-time promise (D6) | Make none until ops can keep one | Copy on every channel |
| O9 | Pet, utility and deposit answers (T1, T2) | Answer them once for all homes so the "confirm" lines can become facts | Every listing |
| O10 | Virginia and Broad listing timing | Hold both until Wardah reshoots (V3 to V8; Broad needs a kitchen) | Wave 2 and 3 |
| O11 | Add Zillow Rentals (free) and a BlueCollarHousing test (free founding slot, or $99) after the pilot | Yes for Zillow, once O3 and O5 are settled; try the free BlueCollarHousing slot for one three-bedroom | Wave 2 |
| O12 | Approve the analytics follow-up (read a whitelisted `utm_source` into `src`) | Yes, as a small separate issue | Attribution |

Spend if every recommendation is accepted: $398 a year for the pilot, then up to $1,194 for six Furnished Finder listings, plus optionally $99 for BlueCollarHousing. Free: Zillow Rentals and the BlueCollarHousing founding slot. Nothing is paid until the CEO confirms and a named person creates the account.

### Unverified items

These could not be confirmed on 2026-11-16 and are marked in the text above. Check each on screen before relying on it.

1. Furnished Finder: title and description character limits, whether a link is allowed in the description, calendar import and export (iCal), and the current Listing Setup Service price. Its pages returned HTTP 403 to automated fetches, so figures come from search-result summaries of its support pages and a secondary source.
2. Vrbo: the traveler service fee percentage, payout timing, and any long-stay cancellation rule. Vrbo's help pages were blocked or returned errors.
3. Zillow: furnished tagging and whether a 30-day lease fits Rental Manager.
4. Apartments.com: the Premium price, furnished tagging, and who pays the 2.75 percent payment fee.
5. Airbnb: the 500-character description limit (forum answer only) and which fee model applies to our account.
6. BlueCollarHousing: coverage and renter volume in the Ohio Valley, and founding-landlord eligibility.
7. Lodging-tax treatment of 28 to 30 night stays (D3), and GSA per-diem rates for our counties (https://www.gsa.gov/travel/plan-book/per-diem-rates).
8. Expected traffic and reach for our towns: no vendor publishes it. The only figure is the internal RICE estimate on #73 (600 per quarter, 50 percent confidence).
9. Market rents on Furnished Finder in our towns: the $800 to $1,500 range is a national third-party figure.

## 7. Sources

All checked 2026-11-16. "Read" means the page was fetched directly. "Summary" means the vendor page blocked automated fetches (HTTP 403, 429 or an error page) and the figure comes from a search-result summary of that page. "Secondary" means a third-party site, to be confirmed on the vendor's own screen.

| Figure | Source | Verification |
|---|---|---|
| Furnished Finder $199 a year per property (from 2026-01-02), $149 add-on unit, hotels and complexes $750 then $1,000 from 2026-10-27, no commission, Listing Setup Service $99 | https://support.furnishedfinder.com/hc/en-us/articles/43700974504475-Furnished-Finder-2026-Pricing-and-FAQs | Summary |
| Furnished Finder KeyCheck $44.99 per applicant, fee summary | https://www.hostfully.com/blog/furnished-finder-fees/ | Secondary |
| Furnished Finder listing requirements (30-day minimum, Jumio ID check, location and rent fields) | https://support.furnishedfinder.com/hc/en-us/articles/35579415685531-What-are-the-Requirements-to-List-a-Property | Summary |
| Furnished Finder photos (2 to 30, PNG or JPG, 1024 x 683 recommended) | https://support.furnishedfinder.com/hc/en-us/articles/38824278047771-Adding-Your-Photos | Summary |
| Furnished Finder: off-platform lease and payment, calendar sync | https://hospitable.com/how-does-furnished-finder-work | Secondary |
| Furnished Finder market count, Parkersburg: 28 listings, 13 available | https://www.furnishedfinder.com/housing/us--wv--parkersburg | Summary |
| Furnished Finder market count, Marietta, Ohio: 31 listings, 19 available | https://www.furnishedfinder.com/housing/us--oh--marietta | Summary |
| Travel Nurse Housing, Parkersburg: 26 listings, 12 available | https://www.travelnursehousing.com/FindHousing/Parkersburg/West-Virginia | Summary |
| Airbnb fees: host 3 percent, guest 14.1 to 16.5 percent, single-fee 15.5 percent | https://www.airbnb.com/help/article/1857 | Read |
| Airbnb monthly stay payments (28+ nights) | https://www.airbnb.com/help/article/245 | Read |
| Airbnb monthly stay cancellations | https://www.airbnb.com/help/article/1361 | Read |
| Airbnb Firm and Strict cancellation policies | https://www.airbnb.com/resources/hosting-homes/a/choosing-cancellation-policies-19 | Read |
| Airbnb monthly stay setup and tenant-rights note | https://www.airbnb.com/help/article/2729 | Read |
| Airbnb weekly and monthly discounts | https://www.airbnb.com/help/article/1233 | Read |
| Airbnb listing contact and off-platform rules | https://www.airbnb.com/help/article/50 | Read |
| Airbnb title guidance (fewer than 50 characters) | https://www.airbnb.com/resources/hosting-homes/a/guidelines-for-writing-your-listing-title-533 | Read |
| Airbnb Parkersburg monthly listings, review counts | https://www.airbnb.com/parkersburg-wv/stays/monthly | Summary |
| Vrbo 12 percent flat commission, free listing | https://host.vrbo.com/en-us | Read |
| Vrbo booking fee calculation | https://help.vrbo.com/articles/How-is-the-booking-fee-calculated | Summary |
| Vrbo listing guidelines (headline, description, no URLs) | https://help.vrbo.com/articles/What-are-the-listing-guidelines | Summary |
| Vrbo how to list | https://help.vrbo.com/articles/How-do-I-list-my-property | Summary |
| Vrbo 2026-10-29 fee change, $699 subscription closed | https://www.lodgify.com/blog/vrbo-host-fees/ | Secondary |
| Zillow Rental Manager listings free, Premium $39.99 per 90 days | https://zillow.zendesk.com/hc/en-us/articles/30237393777555-Paying-for-your-Zillow-Rental-Manager-listings | Summary |
| Zillow rent collection: ACH free, card 2.95 percent, debit $9.95; $40 renter application fee | https://www.zillow.com/rental-manager/collect-rent-online/ | Summary |
| Apartments.com free basic listing (1 to 4 units, 21 days, 6 sites), card 2.75 percent, ACH free | https://www.apartments.com/rental-manager/list-property-for-rent | Summary |
| BlueCollarHousing $99 a year, $10 per extra unit, $249 commercial, no payments, no calendar | https://bluecollarhousing.com/list-your-property | Read |
| BlueCollarHousing FAQ: refund terms, founding landlord offer | https://bluecollarhousing.com/landlord-faq | Read |
| BlueCollarHousing Parkersburg page | https://bluecollarhousing.com/housing/parkersburg-wv | Read |
| Google Vacation Rentals needs a connectivity partner | https://www.hostaway.com/blog/how-to-list-on-google-vacation-rentals/ | Secondary |
| GSA per-diem rates (not looked up for our counties) | https://www.gsa.gov/travel/plan-book/per-diem-rates | Unverified |

_This pack was prepared without creating an account or paying anything. Last checked 2026-11-16._
