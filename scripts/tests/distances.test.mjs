// Unit tests for the _data/distances.json schema (WorldEnterpriseGroup/mtcottages#25).
// Run: node --test scripts/tests/*.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  APPROVED_ADDRESSES, CATEGORIES, MAX_AGE_DAYS, MEASUREMENT_TIME_ZONE,
  ageInDays, calendarDate, isStale, milesFor, minutesFor, validateDistances,
} from "../lib/distances.mjs";

const file = new URL("../../_data/distances.json", import.meta.url);
const real = JSON.parse(readFileSync(file, "utf8"));
// The newest stamp in the file, so adding a row on a later day does not break this fixture
// (pipeline 148591 pinned 2026-11-15 and failed once rows stamped 2026-11-17 landed).
const newestStamp = real.rows.map((row) => row.measured).sort().at(-1);
// Noon in Ohio on that day: 17:00Z in winter (EST), 16:00Z in summer (EDT); 17:00Z is noon or 1 pm, same day either way.
const measuredOn = new Date(`${newestStamp}T17:00:00Z`);
const clone = () => structuredClone(real);
const firstRow = (data) => data.rows[0];
const expectError = (data, pattern, today = measuredOn) => {
  const errors = validateDistances(data, { today });
  assert.ok(errors.some((message) => pattern.test(message)), `expected ${pattern}, got:\n${errors.join("\n") || "(no errors)"}`);
};

test("the committed distances file is valid on the day its newest row was measured", () => {
  assert.equal(calendarDate(measuredOn), newestStamp);
  assert.deepEqual(validateDistances(real, { today: measuredOn }), []);
});

test("measurement dates are read in the homes' time zone", () => {
  assert.equal(MEASUREMENT_TIME_ZONE, "America/New_York");
  assert.equal(calendarDate(new Date("2026-11-17T06:39:00Z")), "2026-11-17"); // 01:39 EST
  assert.equal(calendarDate(new Date("2026-11-18T04:30:00Z")), "2026-11-17"); // 23:30 EST
  assert.equal(calendarDate(new Date("2026-07-04T03:59:00Z")), "2026-07-03"); // 23:59 EDT
  assert.equal(calendarDate(new Date("2026-07-04T04:00:00Z")), "2026-07-04"); // 00:00 EDT
});

test("a late-night measurement is today, not tomorrow or the future", () => {
  // Measured and checked at 23:30 in Ohio, which is already the next day in UTC.
  const lateNight = new Date("2026-11-18T04:30:00Z");
  assert.equal(ageInDays("2026-11-17", lateNight), 0);
  // The pipeline 148591 moment: 01:39 EST on the 17th checks a row stamped the 17th.
  assert.equal(ageInDays("2026-11-17", new Date("2026-11-17T06:39:00Z")), 0);
  const data = clone();
  for (const row of data.rows) row.measured = "2026-11-17";
  assert.deepEqual(validateDistances(data, { today: lateNight }), []);
});

test("a row stamped with tomorrow's UTC date at night in Ohio is in the future", () => {
  // 22:00 EST on the 17th is 03:00Z on the 18th; "2026-11-18" is a UTC stamp, not an Ohio one.
  const data = clone();
  firstRow(data).measured = "2026-11-18";
  expectError(data, /measured 2026-11-18 is in the future/, new Date("2026-11-18T03:00:00Z"));
});

test("the 12-month limit counts Ohio calendar days", () => {
  // 23:30 EST on 2026-11-17: exactly 365 days after 2025-11-17, so still fresh.
  assert.equal(isStale("2025-11-17", new Date("2026-11-18T04:30:00Z")), false);
  assert.equal(isStale("2025-11-17", new Date("2026-11-18T05:30:00Z")), true); // 00:30 EST on the 18th
});

test("the committed distances file is valid today", () => {
  assert.deepEqual(validateDistances(real), []);
});

test("rounding: minutes round up, miles to one decimal", () => {
  assert.equal(minutesFor(924), 16);
  assert.equal(minutesFor(60), 1);
  assert.equal(minutesFor(60.1), 2);
  assert.equal(milesFor(18041.6), 11.2);
  assert.equal(milesFor(1575), 1);
});

test("every published row is recomputable from its raw measurement", () => {
  for (const row of real.rows) {
    assert.equal(row.minutes, minutesFor(row.seconds), row.id);
    assert.equal(row.miles, milesFor(row.meters), row.id);
  }
});

test("every microsite has an origin with rows, and only approved addresses are origins", () => {
  for (const [microsite, originId] of Object.entries(real.microsites)) {
    const origin = real.origins[originId];
    assert.ok(origin, `${microsite} origin`);
    if (origin.kind === "address") assert.ok(APPROVED_ADDRESSES.some((street) => origin.label.includes(street)), originId);
    else assert.match(origin.label, /town centre/i);
    assert.ok(real.rows.some((row) => row.origin === originId), `${microsite} has rows`);
  }
});

test("every destination category is a known one", () => {
  for (const destination of Object.values(real.destinations)) assert.ok(CATEGORIES.includes(destination.category), destination.name);
});

test("staleness: 365 days is fresh, 366 is stale, a bad date is neither", () => {
  const day = new Date("2026-11-15T17:00:00Z");
  assert.equal(ageInDays("2026-11-15", day), 0);
  assert.equal(isStale("2025-11-15", day), false);
  assert.equal(isStale("2025-11-14", day), true);
  assert.equal(ageInDays("2026-02-30", day), null);
  assert.equal(ageInDays("15/11/2026", day), null);
});

test("a row older than 12 months fails", () => {
  const data = clone();
  firstRow(data).measured = "2024-01-01";
  expectError(data, /older than 12 months/);
});

test("a row measured in the future fails", () => {
  const data = clone();
  firstRow(data).measured = "2027-06-01";
  expectError(data, /in the future/);
});

test("a row whose minutes or miles drift from the measurement fails", () => {
  const data = clone();
  firstRow(data).minutes += 1;
  expectError(data, /minutes \d+ should be/);
  const other = clone();
  firstRow(other).miles = 99;
  expectError(other, /miles 99 should be/);
});

test("a row without a listed source fails", () => {
  const data = clone();
  firstRow(data).source = "a-friend-said";
  expectError(data, /is not listed under sources/);
});

test("a row with an unknown origin or destination fails", () => {
  const data = clone();
  firstRow(data).destination = "nowhere";
  expectError(data, /unknown destination nowhere/);
});

test("a duplicate row id fails", () => {
  const data = clone();
  data.rows.push(structuredClone(firstRow(data)));
  expectError(data, /duplicate id/);
});

test("an origin at an unapproved street address fails", () => {
  const data = clone();
  data.origins.stranger = { label: "Somewhere, 1 Main St, Parkersburg, WV", kind: "address", lat: 39.27, lng: -81.56 };
  expectError(data, /not owner-approved/);
});

test("a town-centre origin must say so", () => {
  const data = clone();
  data.origins["parkersburg-centre"].label = "Parkersburg";
  expectError(data, /labelled as a town centre/);
});

test("an unknown category or an over-long chart label fails", () => {
  const data = clone();
  data.destinations["camden-clark"].category = "spa";
  expectError(data, /category must be one of/);
  const other = clone();
  other.destinations["camden-clark"].label = "A".repeat(40);
  expectError(other, /label is longer than/);
});

test("a microsite pointing at a missing origin fails", () => {
  const data = clone();
  data.microsites.buck = "buck-house";
  expectError(data, /microsite buck: unknown origin buck-house/);
});

test("a source must be an https URL", () => {
  const data = clone();
  data.sources.table = "http://router.project-osrm.org/table";
  expectError(data, /must be an https URL/);
});

test("a malformed file is reported, not thrown", () => {
  assert.deepEqual(validateDistances(null), ["distances.json must be a JSON object"]);
  assert.ok(validateDistances({ origins: {} }).some((message) => /rows must be an array/.test(message)));
});

test("the age limit is twelve months", () => {
  assert.equal(MAX_AGE_DAYS, 365);
});
