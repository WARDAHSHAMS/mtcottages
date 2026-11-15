// Unit tests for the _data/distances.json schema (WorldEnterpriseGroup/mtcottages#25).
// Run: node --test scripts/tests/*.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  APPROVED_ADDRESSES, CATEGORIES, MAX_AGE_DAYS, ageInDays, isStale, milesFor, minutesFor, validateDistances,
} from "../lib/distances.mjs";

const file = new URL("../../_data/distances.json", import.meta.url);
const real = JSON.parse(readFileSync(file, "utf8"));
const measuredOn = new Date("2026-11-15T12:00:00Z");
const clone = () => structuredClone(real);
const firstRow = (data) => data.rows[0];
const expectError = (data, pattern, today = measuredOn) => {
  const errors = validateDistances(data, { today });
  assert.ok(errors.some((message) => pattern.test(message)), `expected ${pattern}, got:\n${errors.join("\n") || "(no errors)"}`);
};

test("the committed distances file is valid on the day it was measured", () => {
  assert.deepEqual(validateDistances(real, { today: measuredOn }), []);
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
  assert.equal(ageInDays("2026-11-15", measuredOn), 0);
  assert.equal(isStale("2025-11-15", measuredOn), false);
  assert.equal(isStale("2025-11-14", measuredOn), true);
  assert.equal(ageInDays("2026-02-30", measuredOn), null);
  assert.equal(ageInDays("15/11/2026", measuredOn), null);
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
