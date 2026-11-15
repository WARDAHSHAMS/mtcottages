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

const MAX_AGE_DAYS = 365;
const APPROVED_ADDRESSES = ["125 Frederick St", "200 Henrietta St", "2712 Broad St", "3113 Broad St"];
const METERS_PER_MILE = 1609.344;

// Claims the 2026-11-15 fact-check found wrong. Each must never return.
const BANNED = [
  { pattern: /\b(?:[0-9]|1[0-4])\s*min(?:ute)?s?\b[^.]{0,60}Jackson General/i, why: "Jackson General Hospital is in Ripley, about 16 minutes from Ravenswood" },
  { pattern: /Jackson General Hospital[^.]{0,40}\bin Ravenswood\b/i, why: "Jackson General Hospital is in Ripley, not Ravenswood" },
  { pattern: /walk(?:able|ing distance)[^.]{0,40}downtown (?:Marietta|Parkersburg)/i, why: "Frederick, Broad and Oak are 2.3 to 2.7 miles from downtown: a drive, not a walk" },
  { pattern: /(?:short|easy) walk to downtown/i, why: "no listed home is a short walk from downtown Marietta or Parkersburg" },
  { pattern: /steps from restaurants/i, why: "Oak Cottage is about 8 minutes from downtown Parkersburg by car" },
  { pattern: /\b[1-5]\s*min(?:ute)?s?\b[^.]{0,20}Marietta Memorial/i, why: "Marietta Memorial Hospital is about 11 minutes from Frederick Cottage" },
  { pattern: /\b[1-6]\s*min(?:ute)?s?\b[^.]{0,20}downtown Parkersburg/i, why: "Broad and Oak are about 7 to 8 minutes from downtown Parkersburg" },
  { pattern: /Multiple bathrooms/i, why: "bathroom counts are stated only as photographed, with confirm on inquiry" },
  { pattern: /Parkersburg(?:'|’)s north (?:side|end)/i, why: "Buck Cottage's neighbourhood is not verified (address not approved)" },
];

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
  for (const { pattern, why } of BANNED) {
    const match = text.match(pattern);
    if (match) errors.push(`${label}: "${match[0]}" (${why})`);
  }
};

const distances = readJson("_data/distances.json").data;
const housesFile = readJson("_data/houses.json");
const houses = housesFile.data;

// --- distances.json -------------------------------------------------------
const origins = distances.origins ?? {};
const destinations = distances.destinations ?? {};
const sources = distances.sources ?? {};
const rows = new Map();
const today = new Date();

for (const [id, origin] of Object.entries(origins)) {
  if (origin.kind === "address") {
    if (!APPROVED_ADDRESSES.some((street) => origin.label.includes(street))) {
      errors.push(`distances.json origin ${id} is a street address that is not owner-approved: only ${APPROVED_ADDRESSES.join(", ")}`);
    }
  } else if (origin.kind === "town-centre") {
    if (!/town centre/i.test(origin.label)) errors.push(`distances.json origin ${id} must be labelled as a town centre`);
  } else {
    errors.push(`distances.json origin ${id} has unknown kind ${origin.kind}`);
  }
}

for (const row of distances.rows ?? []) {
  const where = `distances.json row ${row.id ?? "(no id)"}`;
  if (row.id !== `${row.origin}:${row.destination}`) errors.push(`${where}: id must be "<origin>:<destination>"`);
  if (rows.has(row.id)) errors.push(`${where}: duplicate id`);
  rows.set(row.id, row);
  if (!origins[row.origin]) errors.push(`${where}: unknown origin ${row.origin}`);
  if (!destinations[row.destination]) errors.push(`${where}: unknown destination ${row.destination}`);
  if (!row.method) errors.push(`${where}: method is missing`);
  if (!sources[row.source]) errors.push(`${where}: source ${row.source} is not listed under sources`);
  if (!Number.isFinite(row.seconds) || !Number.isFinite(row.meters)) {
    errors.push(`${where}: seconds and meters must be numbers`);
  } else {
    const minutes = Math.ceil(row.seconds / 60);
    const miles = Math.round((row.meters / METERS_PER_MILE) * 10) / 10;
    if (row.minutes !== minutes) errors.push(`${where}: minutes ${row.minutes} should be ${minutes} (ceil of ${row.seconds} s)`);
    if (row.miles !== miles) errors.push(`${where}: miles ${row.miles} should be ${miles} (${row.meters} m)`);
  }
  const measured = new Date(`${row.measured}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.measured)) || Number.isNaN(measured.getTime())) {
    errors.push(`${where}: measured must be an ISO date (YYYY-MM-DD)`);
  } else {
    const ageDays = (today.getTime() - measured.getTime()) / 86_400_000;
    if (ageDays < -1) errors.push(`${where}: measured ${row.measured} is in the future`);
    if (ageDays > MAX_AGE_DAYS) errors.push(`${where}: measured ${row.measured} is older than 12 months; re-measure it`);
  }
}

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
      scanBanned(page, markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Proximity claims OK: ${rows.size} measured rows, ${Object.keys(houses).length} homes${dist ? `, ${pageCount} built pages scanned` : ""}`);
