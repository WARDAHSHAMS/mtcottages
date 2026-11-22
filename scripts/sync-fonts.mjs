#!/usr/bin/env node
// Self-hosted brand fonts (#59): copies the Latin woff2 files the site uses out of the
// Fontsource packages into public/fonts, where they are served at stable URLs. Both the
// marketing site (src/styles/site.css) and the stay form host (infra/azure/apply-proxy)
// load them from there, so the font bytes live in git exactly once.
//
//   node scripts/sync-fonts.mjs          copy the files
//   node scripts/sync-fonts.mjs --check  fail when public/fonts differs from the packages
//
// The faces and weights are the brand option A set in
// docs/marketing/brand-options/options.json: Source Serif 4 600 (display) and
// Source Sans 3 400 and 700 (body). Add a weight there and here together.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "fonts");

const faces = [
  { pkg: "source-serif-4", weight: 600 },
  { pkg: "source-sans-3", weight: 400 },
  { pkg: "source-sans-3", weight: 700 },
];
// The SIL Open Font License asks for its text to travel with the font files.
const licences = [...new Set(faces.map(({ pkg }) => pkg))];

const check = process.argv.includes("--check");
const problems = [];

if (!check) mkdirSync(outDir, { recursive: true });

for (const { pkg, weight } of faces) {
  const file = `${pkg}-latin-${weight}-normal.woff2`;
  const source = path.join(root, "node_modules", "@fontsource", pkg, "files", file);
  const target = path.join(outDir, file);
  if (!existsSync(source)) {
    problems.push(`${source} is missing: run npm ci (@fontsource/${pkg} is a devDependency)`);
    continue;
  }
  if (check) {
    if (!existsSync(target)) problems.push(`public/fonts/${file} is missing: run node scripts/sync-fonts.mjs`);
    else if (!readFileSync(source).equals(readFileSync(target))) problems.push(`public/fonts/${file} differs from @fontsource/${pkg}: run node scripts/sync-fonts.mjs`);
  } else {
    copyFileSync(source, target);
    console.log(`public/fonts/${file}`);
  }
}

for (const pkg of licences) {
  const source = path.join(root, "node_modules", "@fontsource", pkg, "LICENSE");
  const target = path.join(outDir, `${pkg}-OFL.txt`);
  if (!existsSync(source)) {
    problems.push(`${source} is missing: run npm ci`);
  } else if (check) {
    if (!existsSync(target) || !readFileSync(source).equals(readFileSync(target))) problems.push(`public/fonts/${pkg}-OFL.txt is missing or stale: run node scripts/sync-fonts.mjs`);
  } else {
    copyFileSync(source, target);
    console.log(`public/fonts/${pkg}-OFL.txt`);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
if (check) console.log(`public/fonts matches the Fontsource packages (${faces.length} fonts, ${licences.length} licences)`);
