// Unit tests for the guest-review schema (WorldEnterpriseGroup/mtcottages#61).
// Run: node --test scripts/tests/reviews.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { validateReviews } from "../lib/reviews.mjs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const siteTs = read("src/data/site.ts");
const homeIds = [...siteTs.matchAll(/^ {4}id: "([a-z-]+)",$/gm)].map((match) => match[1]);
const today = new Date("2026-11-22T12:00:00Z");

// A made-up review used only to exercise the validator; it is never published.
const sample = () => ({
  id: "test-guest-1",
  home: homeIds[0],
  firstName: "Ann",
  hometown: "Columbus, OH",
  stayEnded: "2026-10",
  text: "Quiet street, a well-stocked kitchen and a quick answer every time we asked.",
  source: "direct",
  consent: { date: "2026-11-02", channel: "email", record: "ops-2026-11-02-a" },
  published: "2026-11-10",
});
const problems = (mutate) => {
  const review = sample();
  mutate(review);
  return validateReviews({ reviews: [review] }, { homeIds, today });
};

test("the real reviews file is valid", () => {
  assert.ok(homeIds.length >= 6, `found ${homeIds.length} home ids`);
  assert.deepEqual(validateReviews(JSON.parse(read("src/data/reviews.json")), { homeIds, today: new Date() }), []);
});

test("a complete, consented review passes", () => {
  assert.deepEqual(problems(() => {}), []);
});

test("a review without consent is rejected", () => {
  assert.match(problems((review) => { delete review.consent; }).join("\n"), /consent is required/);
  assert.match(problems((review) => { review.consent.record = "ann@example.com"; }).join("\n"), /opaque ops reference/);
  assert.match(problems((review) => { review.consent.channel = "phone"; }).join("\n"), /channel/);
});

test("only a first name and a hometown identify the guest", () => {
  assert.match(problems((review) => { review.firstName = "Ann Smith"; }).join("\n"), /firstName/);
  assert.match(problems((review) => { review.firstName = "A."; }).join("\n"), /firstName/);
  assert.match(problems((review) => { review.hometown = "12 Main St, Columbus, OH"; }).join("\n"), /hometown/);
  assert.deepEqual(problems((review) => { review.firstName = "Mary-Jo"; review.hometown = "St. Marys, WV"; }), []);
});

test("review text carries no contact detail, link or street address", () => {
  for (const [text, what] of [
    ["Lovely stay, write to me at ann@example.com any time you like.", /email/],
    ["Lovely stay, see my photos at https://example.com/album please.", /link/],
    ["Lovely stay, call me on 304-555-0100 if you want a reference.", /phone/],
    ["We loved it, a short walk from 12 Third Street and the river.", /street address/],
  ]) assert.match(problems((review) => { review.text = text; }).join("\n"), what);
  assert.match(problems((review) => { review.text = "Great."; }).join("\n"), /20 to 700/);
});

test("dates run in order: stay, consent, publication, today", () => {
  assert.match(problems((review) => { review.published = "2026-12-01"; }).join("\n"), /future/);
  assert.match(problems((review) => { review.consent.date = "2026-11-12"; }).join("\n"), /before consent/);
  assert.match(problems((review) => { review.consent.date = "2026-09-30"; }).join("\n"), /before the stay ended/);
  assert.match(problems((review) => { review.stayEnded = "2026-13"; }).join("\n"), /YYYY-MM/);
});

test("the home must be listed, ids are unique and unknown keys are refused", () => {
  assert.match(problems((review) => { review.home = "walnut"; }).join("\n"), /not a listed home/);
  assert.match(problems((review) => { review.rating = 5; }).join("\n"), /unknown key "rating"/);
  const twice = validateReviews({ reviews: [sample(), sample()] }, { homeIds, today });
  assert.match(twice.join("\n"), /used twice/);
  assert.match(validateReviews({ reviews: {} }).join("\n"), /must be a list/);
});
