# Guest reviews: asking, consent and publishing

Issue #61. Decided on #70 (recorded on #61): a free, consent-only review pipeline. We ask for a Google review after a stay. We publish a guest's words on mtcottages.com only with their written consent. Reviews are never paid for, gated or rewarded, and no rating markup is published.

## Who does what

- **Ops** sends the request after a guest moves out, keeps the guest's reply in the stay mailbox, and opens the change that publishes a consented review.
- **Agents** never message guests and never write, paraphrase or invent a review. They review the change and keep the checks green.

## When and how to ask

Ask once, in the week after move-out, by the channel the guest already used with us. Do not ask while a deposit or a dispute is open. Do not offer anything in return, and do not ask only the guests you expect to be happy: every guest who completes a stay gets the same request.

### Email

> Subject: How was your stay at {Home name}?
>
> Hi {first name},
>
> Thank you for staying with us at {Home name}. If you have a minute, an honest review on Google helps the next guest decide: {Google review link}
>
> We would also like to share what you write on mtcottages.com, with only your first name and your hometown (for example "Ann, Columbus, OH"). If that is all right, reply **YES** to this email. You can ask us to take it down at any time by replying here or writing to stay@mtcottages.com.
>
> Either way, thank you for being our guest.
>
> The Mt Cottages team

### Text

> Hi {first name}, thanks for staying at {Home name}. An honest Google review helps the next guest: {Google review link}. May we also share your words on mtcottages.com with only your first name and hometown? Reply YES to agree; reply STOP-REVIEW any time to have it taken down.

The {Google review link} is the "Ask for reviews" link from the Google Business Profile once it is verified (#37, `docs/marketing/google-business-profile.md`). Until then, send the request without the Google sentence. Consent to publish on our site is still asked for in the same way.

## Consent

- Only a written YES (an email or text reply) counts. A phone call, a smile at checkout or a public Google review is not consent to republish it.
- The reply stays in the stay mailbox. Git keeps only the date, the channel and an opaque reference that ops can find it by (for example `ops-2026-11-02-a`), never the guest's email address or phone number.
- A takedown request is honoured in the next change: delete the entry from `src/data/reviews.json` and note the date in the ops record.

## What gets published

- Every consented review, positive or negative, word for word. We do not fix spelling or shorten it. If a review cannot be published as written (it names a person other than the guest, contains contact details, an address, hateful or abusive language, or is about something other than the stay), it is left out whole, and the same rule applies whatever the rating would have been.
- First name and hometown ("Town, ST") only, the month the stay ended, and whether it was also posted on Google.
- No stars, no average and no aggregateRating. Each review is published as a schema.org Review with no rating, on that home's page only.
- A home with no consented review shows no reviews section at all: no placeholder, no sample text, no "be the first".

## Publishing a review

Add one entry to `src/data/reviews.json` in a Draft MR:

| Field | What goes in it |
|---|---|
| `id` | lower-case words joined by hyphens, unique, for example `frederick-ann-2026-11` |
| `home` | the home id (`frederick`, `broad`, `buck`, `oak`, `virginia`, `henrietta`) |
| `firstName` | the first name only, as the guest signs |
| `hometown` | "Town, ST", where the guest is from |
| `stayEnded` | the month the stay ended, `YYYY-MM` |
| `text` | the guest's words, exactly, 20 to 700 characters |
| `source` | `direct` (sent to us) or `google` (posted on Google; consent is still required) |
| `consent` | `{ "date": "YYYY-MM-DD", "channel": "email" or "text", "record": "<ops reference>" }` |
| `published` | the date it goes on the site, `YYYY-MM-DD` |

The build refuses an entry that has no consent, a surname, a street address, a link, an email address or a phone number, a date out of order, or an unknown home (`scripts/lib/reviews.mjs`, tested in `scripts/tests/reviews.test.mjs`). `e2e/tests/reviews.spec.js` checks that each home page shows exactly the reviews its markup publishes.

## Why these rules

- The FTC's rule on consumer reviews and testimonials (16 CFR Part 465, in force since October 2024) bans fake reviews, buying reviews, and suppressing negative reviews on a business's own site.
- Google's review policies forbid incentives and review gating (asking only happy guests), and Google does not show star ratings for reviews a business publishes about itself.
- Consent and first-name-only publishing keep the guest in control of their words, and keep personal data out of git.
