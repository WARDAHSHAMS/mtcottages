#!/usr/bin/env node
// Validates the built Astro site in dist/ before it is published.
// Shared by GitHub Actions (.github/workflows/ci-cd.yml) and the GitLab
// merge-request pipeline (.gitlab-ci.yml), so both gate on the same rules.
// Usage: node scripts/check-dist.mjs [distDir]
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Every page counts: 6 home microsites x 5 template pages, Frederick's guide,
// the microsite redirects (old .html summaries, Frederick's 10 old pages,
// Broad's 23 old sections) and the rest of the site. Update it whenever a home,
// page or redirect is added or removed.
const EXPECTED_PAGES = 107;
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
// The sitemap feeds search engines and the Lighthouse gate, which finds each home microsite there.
// It must list every microsite index as a directory URL and nothing that is a redirect or noindex.
const isNoindex = (markup) => /<meta[^>]+name="robots"[^>]+noindex/i.test(markup);
const sitemapPaths = new Set();
for (const sitemap of files.filter((file) => /\/sitemap-\d+\.xml$/.test(file))) {
  for (const match of read(sitemap).matchAll(/<loc>([^<]+)<\/loc>/g)) {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(match[1]).pathname);
    } catch (error) {
      errors.push(`${sitemap} lists an invalid URL ${match[1]}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    sitemapPaths.add(pathname);
    const file = join(dist, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!existsSync(file)) errors.push(`${sitemap} lists ${pathname}, which was not built`);
    else if (isNoindex(read(file))) errors.push(`${sitemap} lists ${pathname}, a redirect or noindex page`);
  }
}
if (sitemapPaths.size === 0) errors.push("no sitemap-N.xml lists any page");
for (const page of pages) {
  const microsite = relative(dist, page).split(sep).join("/").match(/^([a-z0-9-]+\/[a-z0-9-]+)\/index\.html$/);
  if (microsite && !isNoindex(read(page)) && !sitemapPaths.has(`/${microsite[1]}/`)) {
    errors.push(`the sitemap does not list the /${microsite[1]}/ microsite; add it to micrositeRoots in astro.config.mjs`);
  }
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
