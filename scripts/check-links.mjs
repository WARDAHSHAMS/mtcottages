#!/usr/bin/env node
// Internal-linking gate for the built site (WorldEnterpriseGroup/mtcottages#35).
// Shared by GitHub Actions (.github/workflows/ci-cd.yml) and the GitLab
// merge-request pipeline (.gitlab-ci.yml). It fails when:
//   - an internal link points at nothing that is built, or at a redirect stub;
//   - an indexable page has no inbound link from another indexable page (orphan);
//   - a link's accessible name is empty or generic ("click here", "read more");
//   - an indexable page (other than the home page) lacks a visible breadcrumb
//     trail, lacks exactly one BreadcrumbList, or the two disagree.
// Usage: node scripts/check-links.mjs [distDir]
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { analyseSite } from "./lib/links.mjs";

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

if (!existsSync(dist) || !statSync(dist).isDirectory()) {
  console.error(`${dist} does not exist; run npm run build first`);
  process.exit(1);
}

const all = walk(dist).map((file) => relative(dist, file).split(sep).join("/"));
const pages = [];
for (const file of all.filter((name) => name.endsWith(".html")).sort()) {
  try {
    pages.push({ file, markup: readFileSync(join(dist, file), "utf8") });
  } catch (error) {
    console.error(`cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

const { errors, indexable, redirects, links } = analyseSite(pages, new Set(all));
if (errors.length > 0) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} internal-linking problem(s)`);
  process.exit(1);
}
console.log(`Internal links OK: ${links} links across ${pages.length} pages; ${indexable} indexable pages, none orphaned, all with matching breadcrumbs; ${redirects} redirect stubs, none linked`);
