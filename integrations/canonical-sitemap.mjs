// Writes dist/sitemap.xml from the built pages themselves.
//
// A page is listed when it is indexable (no robots noindex) and its one
// canonical link points at itself. The sitemap therefore always agrees with the
// canonical tags: redirects (noindex, canonical elsewhere), parked homes
// (noindex) and the 404 page drop out without a hand-kept list, and a new page
// is listed the day it ships. The build fails when a page has no canonical, more
// than one, or a canonical that points to a page that was not built.
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PageLastmod } from "./page-lastmod.mjs";

const CANONICAL_TAG = /<link\b[^>]*\brel=["']?canonical\b[^>]*>/gi;
const HREF = /\bhref=["']?([^"'\s>]+)/i;
const NOINDEX = /<meta\b[^>]*\bname=["']?robots["']?[^>]*\bcontent=["'][^"']*\bnoindex\b/i;

const escapeXml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

/** The built file a site path is served from: directory URLs serve their index.html. */
const fileForPath = (dist, pathname) => path.join(dist, decodeURIComponent(pathname.endsWith("/") ? `${pathname}index.html` : pathname));

export default function canonicalSitemap() {
  let site;
  let root;
  return {
    name: "mtcottages:canonical-sitemap",
    hooks: {
      "astro:config:done": ({ config }) => {
        if (!config.site) throw new Error("canonical-sitemap needs `site` in astro.config.mjs");
        site = new URL(config.site);
        root = fileURLToPath(config.root);
      },
      "astro:build:done": async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const errors = [];
        const locs = [];
        for (const file of (await htmlFiles(dist)).sort()) {
          const page = `/${path.relative(dist, file).split(path.sep).join("/")}`;
          let markup;
          try {
            markup = await readFile(file, "utf8");
          } catch (error) {
            errors.push(`${page}: cannot read (${error instanceof Error ? error.message : String(error)})`);
            continue;
          }
          const tags = markup.match(CANONICAL_TAG) ?? [];
          if (tags.length !== 1) {
            errors.push(`${page}: expected exactly one canonical link, found ${tags.length}`);
            continue;
          }
          const href = tags[0].match(HREF)?.[1];
          const noindex = NOINDEX.test(markup);
          let canonical;
          try {
            // Redirect stubs may carry a root-relative canonical; indexable pages must be absolute.
            canonical = noindex ? new URL(href ?? "", site) : new URL(href ?? "");
          } catch {
            errors.push(`${page}: canonical href ${JSON.stringify(href)} is not an absolute URL`);
            continue;
          }
          if (canonical.origin !== site.origin) {
            errors.push(`${page}: canonical ${canonical.href} is not on ${site.origin}`);
            continue;
          }
          const target = fileForPath(dist, canonical.pathname);
          if (!existsSync(target)) {
            errors.push(`${page}: canonical ${canonical.href} points to a page that was not built`);
            continue;
          }
          if (noindex) continue;
          // An indexable page that canonicalises elsewhere is a duplicate: list only the original.
          if (target === file) locs.push(canonical.href);
        }
        if (errors.length > 0) throw new Error(`Canonical links are broken:\n${errors.join("\n")}`);
        if (locs.length === 0) throw new Error("No indexable page has a self-referencing canonical; the sitemap would be empty");

        // Each page's lastmod is when its own content last changed (#82); CI refuses a shallow clone.
        const dates = new PageLastmod({ root, logger, failOnShallow: Boolean(process.env.CI) });
        const entries = locs.map((loc) => ({ loc, lastmod: dates.lastmod(new URL(loc).pathname) }));
        const body = entries.map(({ loc, lastmod }) => `<url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
        try {
          await writeFile(path.join(dist, "sitemap.xml"), xml, "utf8");
        } catch (error) {
          throw new Error(`cannot write sitemap.xml: ${error instanceof Error ? error.message : String(error)}`);
        }
        const distinct = new Set(entries.map(({ lastmod }) => lastmod)).size;
        logger.info(`sitemap.xml lists ${locs.length} indexable pages with ${distinct} distinct content dates (${dates.fallbacks.length} without a traceable source)`);
      },
    },
  };
}
