#!/usr/bin/env node
// Fails when a proximity claim has no measured, dated source, or when a claim
// the fact-check found wrong comes back (WorldEnterpriseGroup/mtcottages#26).
// Shared by GitHub Actions (.github/workflows/ci-cd.yml) and the GitLab
// merge-request pipeline (.gitlab-ci.yml).
//
//   _data/distances.json  measured drive times (origin, destination, minutes,
//                         miles, method, source, date)
//   _data/houses.json     every `proximity` entry either cites a row in
//                         distances.json (`ref`) or says "confirm on inquiry"
//
// Usage: node scripts/check-claims.mjs [distDir]
// With a distDir, the built pages are also scanned for the banned claims.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { findBannedClaims, pageText } from "./lib/claims.mjs";
import { validateDistances } from "./lib/distances.mjs";

const errors = [];

function readJson(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    return { text, data: JSON.parse(text) };
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const scanBanned = (label, text) => {
  for (const { match, why } of findBannedClaims(text)) errors.push(`${label}: "${match}" (${why})`);
};

const distances = readJson("_data/distances.json").data;
const housesFile = readJson("_data/houses.json");
const houses = housesFile.data;

// --- distances.json (shared schema, scripts/lib/distances.mjs) -------------
for (const message of validateDistances(distances)) errors.push(`distances.json ${message}`);
const origins = distances.origins ?? {};
const rows = new Map((Array.isArray(distances.rows) ? distances.rows : []).map((row) => [row.id, row]));

// --- houses.json ----------------------------------------------------------
const homeOrigins = distances.homes ?? {};
for (const [homeId, home] of Object.entries(houses)) {
  const originId = homeOrigins[homeId];
  if (!originId || !origins[originId]) {
    errors.push(`houses.json ${homeId}: no origin in distances.json homes`);
    continue;
  }
  const townCentre = origins[originId].kind === "town-centre";
  for (const [index, claim] of (home.proximity ?? []).entries()) {
    const where = `houses.json ${homeId} proximity[${index}]`;
    if (typeof claim !== "object" || claim === null || typeof claim.text !== "string") {
      errors.push(`${where}: must be an object with text and either ref or status "confirm"`);
      continue;
    }
    if (claim.status === "confirm") {
      if (!/confirm on inquiry/i.test(claim.text)) errors.push(`${where}: a confirm claim must say "confirm on inquiry"`);
      continue;
    }
    const row = rows.get(claim.ref);
    if (!row) {
      errors.push(`${where}: ref ${claim.ref} has no row in distances.json`);
      continue;
    }
    if (row.origin !== originId) errors.push(`${where}: ref ${claim.ref} is measured from ${row.origin}, but ${homeId} is measured from ${originId}`);
    if (!new RegExp(`\\b${row.minutes} min\\b`).test(claim.text)) errors.push(`${where}: text must state ${row.minutes} min, from ${claim.ref}`);
    if (!claim.text.includes(`(${row.miles} mi)`)) errors.push(`${where}: text must state (${row.miles} mi), from ${claim.ref}`);
    if (townCentre && !/^From the \w+ town centre/.test(claim.text)) {
      errors.push(`${where}: ${homeId} has no approved address, so its text must start "From the <town> town centre"`);
    }
  }
}
scanBanned("_data/houses.json", housesFile.text);

// --- built pages ----------------------------------------------------------
const dist = process.argv[2];
let pageCount = 0;
if (dist) {
  if (!existsSync(dist) || !statSync(dist).isDirectory()) {
    errors.push(`${dist} does not exist; run npm run build first`);
  } else {
    for (const page of walk(dist).filter((file) => file.endsWith(".html"))) {
      pageCount += 1;
      let markup;
      try {
        markup = readFileSync(page, "utf8");
      } catch (error) {
        errors.push(`cannot read ${page}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      scanBanned(page, pageText(markup));
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Proximity claims OK: ${rows.size} measured rows, ${Object.keys(houses).length} homes${dist ? `, ${pageCount} built pages scanned` : ""}`);
