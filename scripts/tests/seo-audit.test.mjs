import { test } from "node:test";
import assert from "node:assert/strict";
import { crossCheck, inspect, judge, summarise } from "../seo-audit.mjs";

const page = ({ title = "Furnished homes in Marietta, Ohio | Mt Cottages", description = "Whole furnished houses in Marietta, Ohio for stays of a month or more, with a kitchen and laundry.", body = "<h1>Homes</h1>" } = {}) =>
  `<!doctype html><html><head><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="https://mtcottages.com/"></head><body>${body}</body></html>`;

test("inspect reads the title, description, canonical, h1 and images", () => {
  const facts = inspect(page({ body: '<h1>Oak <em>Cottage</em></h1><img src="/a.jpg" alt width="10" height="10"><img src="/b.jpg" alt="Front porch"><picture><source srcset="/c.avif 1x, /d.avif 2x"></picture>' }));
  assert.equal(facts.titles[0], "Furnished homes in Marietta, Ohio | Mt Cottages");
  assert.equal(facts.canonical[0], "https://mtcottages.com/");
  assert.deepEqual(facts.h1, ["Oak Cottage"]);
  assert.deepEqual(facts.images.map((i) => [i.alt, i.sized]), [["", true], ["Front porch", false]]);
  assert.deepEqual(facts.sources, ["/c.avif", "/d.avif"]);
});

test("a bare alt attribute counts as decorative, a missing one is an error", () => {
  const ok = judge(inspect(page({ body: '<h1>x</h1><img src="/a.jpg" alt width="1" height="1">' })));
  assert.deepEqual(ok.errors, []);
  const bad = judge(inspect(page({ body: '<h1>x</h1><img src="/a.jpg" width="1" height="1"><img src="/b.jpg" alt="pic" width="1" height="1">' })));
  assert.equal(bad.errors.length, 2);
});

test("judge enforces title and description limits and one h1", () => {
  const long = judge(inspect(page({ title: "x".repeat(61), description: "short", body: "<h1>a</h1><h1>b</h1>" })));
  assert.match(long.errors.join("\n"), /title is 61 characters/);
  assert.match(long.errors.join("\n"), /description is 5 characters/);
  assert.match(long.errors.join("\n"), /expected one <h1>, found 2/);
  const short = judge(inspect(page({ title: "Cottages | Mt Cottages" })));
  assert.deepEqual(short.errors, []);
  assert.match(short.warnings[0], /min 25/);
});

test("a src-less placeholder image is not warned about missing dimensions", () => {
  assert.deepEqual(judge(inspect(page({ body: '<h1>x</h1><img alt decoding="async">' }))).warnings, []);
});

test("crossCheck flags shared titles and descriptions on every page that shares them", () => {
  const pages = crossCheck([
    { path: "/a", title: "Same", description: "One", errors: [], warnings: [], h1: 1 },
    { path: "/b", title: "Same", description: "Two", errors: [], warnings: [], h1: 1 },
    { path: "/c", title: "Other", description: "Two", errors: [], warnings: [], h1: 1 },
  ]);
  assert.deepEqual(pages[0].errors, ["title is shared with /b"]);
  assert.deepEqual(pages[1].errors, ["title is shared with /a", "description is shared with /c"]);
  assert.equal(summarise(pages)["duplicate titles"], 2);
});
