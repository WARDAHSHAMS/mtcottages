// Unit tests for the banned-claim patterns (WorldEnterpriseGroup/mtcottages#25, #26).
// Run: node --test scripts/tests/*.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { findBannedClaims, pageText } from "../lib/claims.mjs";

const banned = (text) => findBannedClaims(text).length > 0;

test("every wrong claim from the fact-check is caught", () => {
  for (const text of [
    "10 min to Jackson General Hospital",
    "Just 10 minutes from WVU Medicine Jackson General",
    "Jackson General Hospital is only 10 minutes away",
    "Jackson General Hospital, right here in Ravenswood",
    "5 min to Marietta Memorial Hospital",
    "3 min to downtown Parkersburg",
    "About 3 min (0.5 mi) to downtown Parkersburg",
    "Walkable to downtown Marietta",
    "A short walk to downtown",
    "Steps from restaurants and shopping",
    "Multiple bathrooms",
    "On Parkersburg's north side",
    // Regressions found by the 2026-11-19 sweep of the town landing pages.
    "about ten minutes from Marietta Memorial Hospital",
    "About 10 minutes (3.5 miles) by car to Marietta Memorial Hospital",
    "Buck Cottage is on the north side of Parkersburg.",
    "Buck Cottage Best for one person or a couple who wants a compact, easy home on the north side.",
  ]) {
    assert.ok(banned(text), text);
  }
});

test("the corrected, measured claims pass", () => {
  for (const text of [
    "About 16 min (11.2 mi) to Jackson General Hospital in Ripley",
    "About 11 min (3.5 mi) to Marietta Memorial Hospital",
    "About 7 min (2.7 mi) to downtown Parkersburg",
    "From the Ravenswood town centre: about 16 min (11.6 mi) to Jackson General Hospital in Ripley",
    "about 11 minutes from Marietta Memorial Hospital",
    "Broad and Oak Cottages sit a few blocks apart on Broad Street in North Parkersburg.",
    "25 minutes from Marietta Memorial Hospital",
  ]) {
    assert.deepEqual(findBannedClaims(text), [], text);
  }
});

test("adjacent distance-table cells are not read as a claim", () => {
  const html = `<tr><th>Parkersburg City Park</th><td>about 4 min</td><td>1 mi</td></tr>
    <tr><th>Downtown Parkersburg</th><td>about 7 min</td><td>2.7 mi</td></tr>
    <text>I-77, Exit 146</text><text>6 min</text><th>Hospitals</th><th>WVU Medicine Jackson General Hospital</th>`;
  assert.deepEqual(findBannedClaims(pageText(html)), []);
});

test("the corrected inventory has no banned claim", () => {
  const houses = readFileSync(new URL("../../_data/houses.json", import.meta.url), "utf8");
  assert.deepEqual(findBannedClaims(houses), []);
});
