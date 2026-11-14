#!/usr/bin/env node
// Validates the built Astro site in dist/ before it is published.
// Shared by GitHub Actions (.github/workflows/ci-cd.yml) and the GitLab
// merge-request pipeline (.gitlab-ci.yml), so both gate on the same rules.
// Usage: node scripts/check-dist.mjs [distDir]
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// 5 data-driven home microsites x 5 pages, plus their redirect pages.
const EXPECTED_PAGES = 102;
const MAX_DIST_MB = 70;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const LEGACY_MARKERS = ["jquery", "bootstrap", "modernizr", "swiper", "owl.carousel", "venobox", "gsap", "hotelhub"];

const dist = process.argv[2] ?? "dist";

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!existsSync(dist) || !statSync(dist).isDirectory()) {
  console.error(`${dist} does not exist; run npm run build first`);
  process.exit(1);
}

const errors = [];
const files = walk(dist);
const pages = files.filter((file) => file.endsWith(".html")).sort();

const cnamePath = join(dist, "CNAME");
if (!existsSync(cnamePath) || read(cnamePath).trim() !== "mtcottages.com") {
  errors.push("CNAME must remain mtcottages.com");
}
if (!existsSync(join(dist, ".nojekyll"))) errors.push(".nojekyll is missing");
if (existsSync(join(dist, "apply.html"))) errors.push(`${dist}/apply.html is a removed legacy application route`);
for (const sitemap of files.filter((file) => /\/sitemap-[^/]*\.xml$/.test(file))) {
  if (read(sitemap).includes("apply.html")) errors.push(`${sitemap} advertises the removed apply route`);
}
if (pages.length !== EXPECTED_PAGES) {
  errors.push(`expected ${EXPECTED_PAGES} generated HTML pages, found ${pages.length}`);
}

for (const page of pages) {
  const markup = read(page).toLowerCase();
  if (markup.includes("/apply.html") || markup.includes("apply.mtcottages.com")) {
    errors.push(`${page} contains a removed application alias`);
  }
  if (markup.includes("255 court st")) errors.push(`${page} contains private/non-public inventory`);
  // AI-generated room concepts are allowed only when visibly labelled.
  if ((markup.includes("dollhouse") || markup.includes("data-photo3d")) && !markup.includes("ai-generated concept")) {
    errors.push(`${page} shows an AI concept image without an AI-generated concept label`);
  }
  if (LEGACY_MARKERS.some((marker) => markup.includes(marker))) errors.push(`${page} contains a legacy runtime marker`);
  if (!markup.includes('<link rel="canonical"')) errors.push(`${page} is missing a canonical URL`);
  const sources = [...markup.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  if (sources.some((source) => !source.includes("/_astro/logo-mtcottages")) && !markup.includes("srcset=")) {
    errors.push(`${page} contains an unresponsive content image`);
  }
  if (markup.includes("assets/images/cottages/")) {
    errors.push(`${page} leaks a source asset path instead of an optimized Astro asset`);
  }
}

let totalBytes = 0;
for (const file of files) {
  const { size } = statSync(file);
  totalBytes += size;
  if (size > MAX_FILE_BYTES) errors.push(`${file} is larger than 2 MB`);
}
const totalMb = Math.ceil(totalBytes / (1024 * 1024));
if (totalMb > MAX_DIST_MB) errors.push(`${dist} is ${totalMb} MB; the limit is ${MAX_DIST_MB} MB`);

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated ${pages.length} Astro HTML pages (${totalMb} MB)`);
