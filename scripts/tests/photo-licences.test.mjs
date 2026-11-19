// Unit tests for the guide photo-licence gate (WorldEnterpriseGroup/mtcottages#47).
// Run: node --test scripts/tests/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkGuideImages, imageImports, parseLedger, resolveImport, splitCsvLine } from "../lib/photo-licences.mjs";

const HEADER = "file,source,licence,attribution,date";
const row = "assets/images/guides/bridge.jpg,https://commons.wikimedia.org/wiki/File:Bridge.jpg,CC-BY-4.0,\"Jane Doe, Wikimedia Commons\",2026-11-15";

test("splitCsvLine honours quotes and escaped quotes", () => {
  assert.deepEqual(splitCsvLine('a,"b, c","say ""hi"""'), ["a", "b, c", 'say "hi"']);
  assert.throws(() => splitCsvLine('a,"open'), /unterminated/);
});

test("parseLedger accepts a complete row", () => {
  const { rows, problems } = parseLedger(`${HEADER}\n${row}\n`);
  assert.deepEqual(problems, []);
  assert.equal(rows[0].attribution, "Jane Doe, Wikimedia Commons");
});

test("parseLedger rejects a wrong header, blanks, unknown licences, bad dates, portfolio rows and duplicates", () => {
  assert.match(parseLedger("file,licence\n").problems[0], /header/);
  const { problems } = parseLedger([
    HEADER,
    "assets/images/guides/a.jpg,,CC-BY-4.0,Someone,2026-11-15",
    "assets/images/guides/b.jpg,https://x.test,All rights reserved,Someone,2026-11-15",
    "assets/images/guides/c.jpg,https://x.test,CC0-1.0,Someone,15/11/2026",
    "assets/images/cottages/marietta-01/x.avif,https://x.test,owner,Mt Cottages,2026-11-15",
    row,
    row,
    "too,few",
  ].join("\n"));
  const text = problems.join("\n");
  assert.match(text, /source is blank/);
  assert.match(text, /licence "All rights reserved"/);
  assert.match(text, /not YYYY-MM-DD/);
  assert.match(text, /portfolio photo/);
  assert.match(text, /listed twice/);
  assert.match(text, /expected 5 fields/);
});

test("imageImports finds static, side-effect and dynamic image imports only", () => {
  const source = [
    'import hero from "../../../assets/images/guides/bridge.jpg";',
    'import "./thing.png";',
    'const x = await import("./lazy.webp?url");',
    'import { homes } from "../homes";',
  ].join("\n");
  assert.deepEqual(imageImports(source), ["../../../assets/images/guides/bridge.jpg", "./thing.png", "./lazy.webp"]);
});

test("resolveImport maps relative specifiers to repo paths and ignores packages", () => {
  assert.equal(resolveImport("src/data/guides/a.ts", "../../../assets/images/guides/b.jpg"), "assets/images/guides/b.jpg");
  assert.equal(resolveImport("src/data/guides/a.ts", "some-package/pic.png"), null);
});

test("checkGuideImages passes portfolio photos and licensed images, and flags the rest", () => {
  const ledger = `${HEADER}\n${row}\n`;
  const exists = () => true;
  const ok = checkGuideImages([
    { path: "src/data/guides/a.ts", source: 'import p from "../../../assets/images/cottages/marietta-01/front.avif";\nimport b from "../../../assets/images/guides/bridge.jpg";' },
  ], ledger, exists);
  assert.deepEqual(ok.problems, []);
  assert.deepEqual(ok.checked, ["assets/images/guides/bridge.jpg"]);

  const bad = checkGuideImages([
    { path: "src/data/guides/a.ts", source: 'import s from "../../../assets/images/guides/stock.jpg";\nimport q from "pkg/pic.png";' },
  ], ledger, (path) => path !== "assets/images/guides/bridge.jpg");
  const text = bad.problems.join("\n");
  assert.match(text, /stock\.jpg is not a portfolio photo and has no row/);
  assert.match(text, /must be a relative path/);
  assert.match(text, /bridge\.jpg does not exist/);
});

test("an empty ledger with only the header is valid when no guide imports images", () => {
  assert.deepEqual(checkGuideImages([{ path: "src/data/guides/a.ts", source: "export const x = 1;" }], `${HEADER}\n`, () => true).problems, []);
});
