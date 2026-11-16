#!/usr/bin/env node
// Photo-licence gate for area guides (WorldEnterpriseGroup/mtcottages#47).
// Shared by GitHub Actions (.github/workflows/ci-cd.yml) and the GitLab
// merge-request pipeline (.gitlab-ci.yml). Every image a guide imports from
// outside the portfolio (assets/images/cottages/) needs a complete row in
// docs/marketing/photo-licences.csv, and every row must name a file that exists.
// Usage: node scripts/check-photo-licences.mjs [repoRoot]
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { LEDGER_PATH, checkGuideImages } from "./lib/photo-licences.mjs";

const root = process.argv[2] ?? ".";
const GUIDE_DIRS = ["src/data/guides", "src/components/guides", "src/pages/guides"];
const SOURCE_EXT = /\.(?:astro|ts|mts|js|mjs)$/;

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile() && SOURCE_EXT.test(entry.name)) files.push(path);
  }
  return files;
}

const toRepoPath = (path) => relative(root, path).split(sep).join("/");

let ledgerText;
try {
  ledgerText = readFileSync(join(root, LEDGER_PATH), "utf8");
} catch (error) {
  console.error(`check-photo-licences: cannot read ${LEDGER_PATH}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const sources = [];
for (const dir of GUIDE_DIRS) {
  const absolute = join(root, dir);
  if (!existsSync(absolute)) continue;
  for (const file of walk(absolute)) {
    try {
      sources.push({ path: toRepoPath(file), source: readFileSync(file, "utf8") });
    } catch (error) {
      console.error(`check-photo-licences: cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
}

const { problems, checked } = checkGuideImages(sources, ledgerText, (path) => existsSync(join(root, path)));
if (problems.length > 0) {
  console.error(`check-photo-licences: ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`check-photo-licences: ${sources.length} guide source files, ${checked.length} non-portfolio image(s), all licensed in ${LEDGER_PATH}.`);
