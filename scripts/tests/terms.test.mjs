// Unit tests for the rates-and-terms schema (WorldEnterpriseGroup/mtcottages#72).
// Run: node --test scripts/tests/terms.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TERM_FIELDS, decisionIds, isIsoDate, validateTerms } from "../lib/terms.mjs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const terms = JSON.parse(read("src/data/terms.json"));
const decisionsMd = read("notes/owner-decisions.md");
const decisions = decisionIds(decisionsMd);
const siteTs = read("src/data/site.ts");
const cottageIds = [...siteTs.matchAll(/^ {4}id: "([a-z-]+)",$/gm)].map((match) => match[1]);
const clone = () => structuredClone(terms);

test("site.ts lists the cottages the terms file must cover", () => {
  assert.ok(cottageIds.length >= 6, `found ${cottageIds.length} cottage ids`);
});

test("the real terms file is valid, covers every cottage and cites real decision rows", () => {
  assert.deepEqual(validateTerms(terms, { homeIds: cottageIds, decisions }), []);
});

test("decision ids are read from the first cell of each table row", () => {
  const ids = decisionIds("| # | Home |\n|---|---|\n| 2 | x |\n| V2 | y |\n| B3-B6 | z |\n| T1 | w |\n");
  for (const id of ["2", "V2", "B3", "B6", "T1"]) assert.ok(ids.has(id), id);
  assert.ok(!ids.has("#"));
  for (const id of ["1", "2", "4", "T1", "T2", "T3"]) assert.ok(decisions.has(id), `owner-decisions.md row ${id}`);
});

test("only listing-backed rates and move-in dates are confirmed; no deposit is", () => {
  // Rows 1, 2 and 4 of notes/owner-decisions.md: Broad and Oak take their rate and
  // move-in date from their live Furnished Finder listings (#70, read 2026-11-16).
  // Every other home stays on the guide or on inquiry until a source exists, and
  // this test changes in the same merge request as the data.
  const listed = new Set(["broad", "oak"]);
  for (const [id, home] of Object.entries(terms.homes)) {
    assert.equal(home.deposit.status, "confirm", `${id} deposit`);
    if (listed.has(id)) {
      assert.equal(home.monthlyRate.status, "confirmed", `${id} monthly rate`);
      assert.match(home.monthlyRate.source, /^Furnished Finder listing \d+, .+, read \d{4}-\d{2}-\d{2}$/, `${id} rate source`);
      assert.equal(home.availableFrom.status, "confirmed", `${id} move-in date`);
      assert.equal(home.availableFrom.source, home.monthlyRate.source, `${id} move-in source`);
    } else {
      assert.notEqual(home.monthlyRate.status, "confirmed", `${id} monthly rate`);
      assert.equal(home.availableFrom.status, "confirm", `${id} move-in date`);
    }
  }
  assert.match(decisionsMd, /\| 1 \| Henrietta, Oak, Broad \| Monthly price/);
  assert.match(decisionsMd, /\| 2 \| [^|]+\| Security deposit/);
  assert.match(decisionsMd, /\| 4 \| [^|]+\| Availability and move-in dates/);
  assert.match(decisionsMd, /## Listings match \(#70, read 2026-11-16\)/);
});

test("every field is present for every home, in the shared order", () => {
  for (const [id, home] of Object.entries(terms.homes)) {
    assert.deepEqual(Object.keys(home), [...TERM_FIELDS], id);
  }
});

test("ISO dates are checked for real calendar days", () => {
  assert.ok(isIsoDate("2026-12-01"));
  assert.ok(!isIsoDate("2026-02-30"));
  assert.ok(!isIsoDate("12/01/2026"));
  assert.ok(!isIsoDate(20261201));
});

test("a confirmed value is accepted with a source", () => {
  const data = clone();
  data.homes.frederick.monthlyRate = { status: "confirmed", value: 2575, source: "Owner, 2026-11-20" };
  data.homes.frederick.deposit = { status: "confirmed", value: 1000, source: "Owner, 2026-11-20" };
  data.homes.frederick.availableFrom = { status: "confirmed", value: "2026-12-01", source: "Ops calendar" };
  data.homes.frederick.pets = { status: "confirmed", value: "One small dog by arrangement", source: "Owner" };
  assert.deepEqual(validateTerms(data, { homeIds: cottageIds, decisions }), []);
});

const broken = [
  ["an unconfirmed figure in a note", (d) => { d.homes.broad.deposit.note = "About $900"; }, /no numbers/],
  ["a value on a confirm entry", (d) => { d.homes.broad.deposit.value = 895; }, /must not carry a value/],
  ["a confirmed value with no source", (d) => { d.homes.broad.deposit = { status: "confirmed", value: 895 }; }, /needs a source/],
  ["a non-integer price", (d) => { d.homes.broad.monthlyRate = { status: "confirmed", value: "1,895", source: "x" }; }, /whole number of dollars/],
  ["a guide deposit", (d) => { d.homes.broad.deposit = { status: "guide" }; }, /status must be one of/],
  ["a listed move-in date", (d) => { d.homes.broad.availableFrom = { status: "listed", value: "2026-12-01", source: "x" }; }, /status must be one of/],
  ["an impossible date", (d) => { d.homes.broad.availableFrom = { status: "confirmed", value: "2026-13-01", source: "x" }; }, /ISO date/],
  ["an open question with no row", (d) => { d.homes.broad.deposit.ask = "T99"; }, /no row T99/],
  ["an open question with no ask", (d) => { delete d.homes.broad.deposit.ask; }, /must name a row/],
  ["a missing field", (d) => { delete d.homes.broad.utilities; }, /utilities: missing/],
  ["an unknown field", (d) => { d.homes.broad.parking = { status: "confirm", ask: "2" }; }, /unknown field "parking"/],
  ["an unknown key", (d) => { d.homes.broad.pets.price = 50; }, /unknown key "price"/],
  ["a missing home", (d) => { delete d.homes.oak; }, /homes.oak: missing/],
  ["a malformed file", () => null, /expected an object/],
];

for (const [name, mutate, message] of broken) {
  test(`rejects ${name}`, () => {
    const data = clone();
    const result = mutate(data);
    const problems = validateTerms(result === null ? null : data, { homeIds: cottageIds, decisions });
    assert.ok(problems.some((problem) => message.test(problem)), `expected ${message} in:\n${problems.join("\n")}`);
  });
}
