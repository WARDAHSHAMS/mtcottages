# Mt Cottages: brand and positioning

_Owner: growth strategist (WorldEnterpriseGroup/mtcottages#11). Written 2026-11-15. Status: working positioning. Any public branding change (logo, name, tagline on the live site) stays a proposal until the CEO picks one._

This document is the brief every growth issue points back to. It answers four questions: who we serve, what each of them is trying to get done, why they should pick a Mt Cottages home over a hotel, an Airbnb or a Furnished Finder listing, and how we sound and look while we say it.

## 1. Where we stand today

| Fact | Evidence | What it means for marketing |
|---|---|---|
| Five live homes: Frederick (Marietta OH), Broad, Oak and Buck (Parkersburg WV), Henrietta and Virginia (Ravenswood WV) | `_data/houses.json`, live microsites | Small, real, owner-run portfolio. We sell **homes**, not units. |
| Yellow is not ready; Walnut gets no microsite | CEO decisions 2026-11-14 | Never market either until the CEO says so. |
| Monthly guide prices: 1 BR $1,895, 2 BR $2,295, 3 BR $2,575, utilities and internet included | `_data/houses.json` (only Frederick's price is owner-confirmed, see `notes/owner-decisions.md`) | We sit **above** the local furnished market (Furnished Finder and Apartment Finder list furnished 1 BRs from about $900, studios from $575). We must win on the whole home, everything included, and a local, accountable operator, never on price. |
| Unfurnished market rent: 1 BR about $771, 2 BR about $938 in Parkersburg | apartmentfinder.com via search, 2026-11 | Long-term tenants compare us with these numbers. Speak to people who value turnkey and flexible terms. |
| The inquiry path is stay.mtcottages.com (Logic App) | `infra/azure/apply-proxy` | Every CTA goes there, with the audience and home pre-filled when we can. No payment or identity fields. |
| Approved street addresses: Frederick, Henrietta, Oak and Broad only | Brief on #11, CLAUDE.md | Distance tables for Buck and Virginia are measured from the town centre or neighbourhood, never a pin. |

**Competitive set** (searched 2026-11-15): Furnished Finder (28 Parkersburg listings), TravelNurseHousing.com (26), BlueCollarHousing (crew housing, weekly/monthly), Airbnb monthly stays (28+ nights), Apartments.com/Rent.com furnished filters, extended-stay hotels along I-77 (search shows "hotels near parkersburg wv", "pet friendly hotels near parkersburg wv"). None of them tells the story of the town, the hospital commute or the house. That gap is our opening.

## 2. Audiences and personas

Each persona lists the job they are hiring a home for, the objections that stop them, what convinces them, and the page that should catch them. Priority reflects revenue fit with whole-home monthly stays and the search demand we can see.

### P1. Travel nurses and medical staff (priority 1)
- **Who:** 13-week travel RNs, allied health travellers (radiology, respiratory, PT), locum physicians, and **medical residents and rotating students**. Search autocomplete shows "memorial health system marietta oh family medicine residency" and "...emergency medicine residency", so Memorial Health System runs residency programmes.
- **Anchor employers:** Memorial Health System / Marietta Memorial Hospital (Marietta OH), WVU Medicine Camden Clark Medical Center (Parkersburg WV), Jackson General Hospital (Ripley WV, the nearest hospital to Ravenswood).
- **Job to be done:** "Give me a quiet, safe, clean place close to my unit where I can sleep after a night shift, for exactly the length of my contract, inside my housing stipend."
- **Objections:** lease longer than the contract; scams on listing sites; noise and blackout for day sleep; hidden utility bills; landlord unreachable; parking at odd hours; pets.
- **What convinces them:** exact drive minutes to the hospital entrance, the 13-week term stated plainly, utilities and Wi-Fi included, real photos of the bedroom, a named local host, a fast reply. A stipend explainer (GSA lodging per diem for the county vs our monthly price) is a powerful, honest frame; the per-diem figure must be cited from gsa.gov at publish time.
- **Catch page:** `/travel-nurses/` hub plus one landing page per hospital ("Furnished homes near Camden Clark").

### P2. Corporate and project crews (priority 1)
- **Who:** contractors, shutdown and turnaround crews, engineers on secondment, utility and pipeline crews along the Ohio River (Chemours Washington Works, Constellium Ravenswood, Kuraray and other plants, energy and pipeline work in the Marcellus/Utica area).
- **Job to be done:** "House two to five people near the plant for weeks to months, with parking for trucks, laundry, and one invoice my company accepts."
- **Objections:** per-person bed count, truck and trailer parking, invoicing and receipts, company approval, early or late check-in, cancellation when the job slips.
- **What convinces them:** a crew-capacity table (beds, parking, laundry), drive minutes to each plant gate area, a "company-paid stays" process page, quick quotes.
- **Catch page:** `/corporate-housing/` hub plus per-employer distance pages. The 3-bedroom homes (Frederick, Oak) are the flagship crew product.

### P3. Insurance displacement (priority 2)
- **Who:** families displaced by fire, flood or storm, and the adjusters and ALE (additional living expense) housing coordinators who place them.
- **Job to be done:** "Get this family into a real home near their kids' school, fast, for an unknown number of months, on terms the insurer pays."
- **Objections:** speed, open-ended duration, direct billing to the insurer, pets, school continuity, furnishing for children.
- **What convinces them:** "move-in within days" only if true, month-to-month terms, a documented process for insurer-paid stays, the school-district and distance tables per home.
- **Catch page:** `/insurance-housing/` hub with a short adjuster-facing one-pager. B2B outreach to adjusters is an owner decision, since it is relationship work, not just content.

### P4. Relocating families and new hires (priority 2)
- **Who:** people who accepted a job at a hospital, plant, college or the Bureau of the Fiscal Service in Parkersburg and need a landing pad while they find a house.
- **Job to be done:** "Let us live in the town for one to six months, learn the neighbourhoods and schools, and buy or rent without rushing."
- **Objections:** they don't know the area, schools, safety or commute; storage for their belongings; pets.
- **What convinces them:** honest town and neighbourhood guides, school and commute tables, a "moving to Parkersburg / Marietta" guide that ends with a home to stay in while they look.
- **Catch page:** the town guides ("Moving to Parkersburg, WV") with home CTAs.

### P5. Visiting families and college visitors (priority 3)
- **Who:** families visiting relatives, patients' families during a hospital stay, parents visiting Marietta College, WVU Parkersburg or Washington State Community College, and sports weekends (autocomplete: "marietta college football schedule", "ravenswood wv football schedule").
- **Job to be done:** "A whole home for a long weekend or a week, cheaper per person than two hotel rooms, close to where we need to be."
- **Objections:** minimum stay, cleaning fees, check-in logistics.
- **What convinces them:** clear minimum-stay rules, family-size capacity, distance to the campus or hospital. Only pursue if the owner offers stays under 30 nights; otherwise point these searchers to monthly offers or leave them alone.

### P6. Tourists and event visitors (priority 3)
- **Who:** history and river travellers: historic Marietta (first settlement of the Northwest Territory, Campus Martius Museum, Ohio River Museum), Blennerhassett Island Historical State Park (autocomplete: "blennerhassett island ferry schedule", "...tickets price"), the Marietta Ohio Sternwheel Festival in September, Parkersburg City Park, the Ohio River trails and festivals.
- **Job to be done:** "A charming home base for a weekend with real character."
- **Why low priority:** short stays cost more to service and may not match the operating model. Their search volume is still the cheapest way to build topical authority and links for each town, so tourist content runs as SEO, with a CTA into longer stays and gift-of-a-stay offers.

### P7. Long-term tenants (priority 2)
- **Who:** people who want a furnished home for 6 to 12 months or more: divorce or life transitions, remote workers, downsizers, people between houses.
- **Job to be done:** "A move-in-ready home without buying furniture, with one predictable monthly payment."
- **Objections:** price against unfurnished rent, lease terms, pets, whether they can bring their own furniture.
- **What convinces them:** a "true monthly cost" comparison (rent + utilities + internet + furniture + deposits) against a typical unfurnished rental, presented as a chart with sources.

## 3. Brand platform

### Promise
**A real home in the river towns, ready the day you arrive.** Furnished whole houses in Marietta, Parkersburg and Ravenswood for stays of a month or longer, run by a local team who answers.

### Positioning statement
For people who come to the Mid-Ohio Valley to work, heal, relocate or rebuild, Mt Cottages is the furnished-home company that gives you a whole house with everything included, close to the hospital, plant or school that brought you here. Unlike listing sites and extended-stay hotels, every Mt Cottages home is cared for by the same local team, described honestly, and measured in real minutes to the places you need to be.

### Name story (proposal, needs owner confirmation)
We have no recorded origin for "Mt". Until the owner tells the real story, public copy should not explain the name. Proposal for the owner to confirm or replace: "Mt" reads as **Mount**, after the hills that hold these Ohio River towns, a steady place above the water. If the real story is different (a family name, a street, an initialism), that story wins, because a true story is the stronger asset.

### Narrative pillars
1. **Whole home, nothing to add.** Kitchens with cookware, laundry, linens, Wi-Fi and utilities in one monthly price. Proof: room-by-room photo galleries and the amenity list.
2. **Minutes, not miles.** Every home is described by real drive times to hospitals, plants, schools, campuses and groceries. Proof: distance tables, charts and maps on every microsite.
3. **River-town character.** Historic Marietta, Blennerhassett, sternwheelers, brick downtowns. We are proud of these towns and write like locals. Proof: town and neighbourhood guides.
4. **Honest by default.** Real photos only, facts marked "confirm on inquiry" until we know them, no invented reviews. Proof: the site already labels illustrative layouts and AI concept images. Trust is our moat against listing-site scams.
5. **A local team who answers.** Named hosts, response-time promise (only once ops can keep it), clear policies. Proof: host story page, policies page, real reviews when we have them.

### Voice
- **Warm, plain, specific.** "Seven minutes to Camden Clark's main entrance" beats "conveniently located".
- **Grown-up and calm.** Our guests are tired professionals and displaced families. No hype, no exclamation marks, no "luxury".
- **Local.** Name streets only where approved, but name parks, diners, river trails and festivals freely.
- **Honest about gaps.** "Confirm on inquiry" is part of the voice, not an apology.
- Banned words: luxury, world-class, paradise, best-in-class, "hidden gem", fake urgency ("only 1 left!").

### Visual direction
- **Palette:** river and brick. Deep river blue (primary), warm brick red (accent and CTAs), limestone cream (background), slate ink (text). Contrast ratio of at least 4.5:1 for all text. Exact tokens are set in the brand-identity epic as a proposal with 2 to 3 options for the CEO.
- **Type:** a humanist serif for headings (heritage river towns) and a clean sans for body and data. Free, self-hosted fonts only (no paid font licences without an owner decision).
- **Photography:** real portfolio photos, daylight, uncluttered, honest. Area imagery only when we own it or hold a recorded licence; otherwise charts, diagrams and maps. AI concept images always labelled.
- **Data as decoration:** distance bars, commute charts and simple town maps are a signature element. They are useful, cheap, ours, and they rank.
- **Logo:** any new mark is a proposal. 2 to 3 options rendered as screenshots and posted to the Tao Precision chat via Atlas for the CEO to pick.

### Calls to action
| Stage | Primary CTA | Secondary |
|---|---|---|
| Home microsite | "Check dates for <Home>" → stay.mtcottages.com with the home pre-selected | "See distances" anchor |
| Audience hub | "Find a home near <hospital/plant>" | "How company-paid / insurer-paid stays work" |
| Article | "See homes in <town>" | Related guide |

## 4. Owner decisions this platform needs

| # | Decision | Why it is the owner's |
|---|---|---|
| D1 | The real story behind the name "Mt" | Public branding |
| D2 | Pick a palette, type and logo from 2 to 3 options | Public branding |
| D3 | Whether stays under 30 nights are offered (P5, P6) | Operating model, taxes (lodging tax registration), insurance |
| D4 | Pet policy per home | Operating cost and insurance |
| D5 | Direct billing for companies and insurers | Finance and legal |
| D6 | Response-time promise | Operations has to keep it |
| D7 | Google Business Profile ownership and which address it shows | Public listing, address policy |
| D8 | Any paid tool (keyword data, analytics, review platform) | Money |
