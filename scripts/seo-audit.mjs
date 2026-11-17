#!/usr/bin/env node
// On-page SEO audit for every indexable page (#69).
//
// Reads the page list from the sitemap, then checks each page's title,
// meta description, H1 count, canonical and image alt text and dimensions,
// and the byte weight of the images it references. It works on a built
// site folder or a live origin:
//
//   node scripts/seo-audit.mjs dist                 # gate: exits 1 on any error
//   node scripts/seo-audit.mjs https://mtcottages.com --report out.json
//
// Errors fail the run; warnings are reported but do not. Rules:
//   error  title missing, longer than TITLE_MAX characters, or shared by two pages
//   error  meta description missing, outside DESCRIPTION_MIN..DESCRIPTION_MAX, or shared
//   error  not exactly one <h1>
//   error  an <img> without an alt attribute, or a non-decorative one with a too-short alt
//   warn   title shorter than TITLE_MIN
//   warn   an image heavier than IMAGE_WARN_KB, or an <img> without width and height
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const TITLE_MIN = 25;
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 160;
export const IMAGE_WARN_KB = 300;

const decode = (text) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();

// Returns the attribute's value, "" for a bare attribute (Astro renders alt="" as `alt`), or null when absent.
const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}(?:\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+)))?(?=[\\s/>])`, "i"));
  return match ? decode(match[2] ?? match[3] ?? match[4] ?? "") : null;
};

/** Pulls the on-page SEO facts out of one HTML document. */
export function inspect(html) {
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? "";
  const titles = [...head.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decode(m[1]));
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const descriptions = metas.filter((tag) => (attr(tag, "name") ?? "").toLowerCase() === "description").map((tag) => attr(tag, "content") ?? "");
  const robots = metas.filter((tag) => (attr(tag, "name") ?? "").toLowerCase() === "robots").map((tag) => attr(tag, "content") ?? "");
  const canonical = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => (attr(tag, "rel") ?? "").toLowerCase() === "canonical").map((tag) => attr(tag, "href"));
  const body = html.slice(html.search(/<body[\s>]/i));
  const h1 = [...body.matchAll(/<h1\b[\s\S]*?<\/h1>/gi)].map((m) => decode(m[0].replace(/<[^>]+>/g, " ")));
  const images = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => {
    const tag = m[0];
    return {
      src: attr(tag, "src"),
      alt: attr(tag, "alt"),
      hidden: /\saria-hidden\s*=\s*"true"/i.test(tag) || (attr(tag, "role") ?? "") === "presentation",
      sized: attr(tag, "width") !== null && attr(tag, "height") !== null,
    };
  });
  const sources = [...body.matchAll(/<source\b[^>]*>/gi)].flatMap((m) => (attr(m[0], "srcset") ?? "").split(",").map((part) => part.trim().split(/\s+/)[0]).filter(Boolean));
  return { titles, descriptions, robots, canonical, h1, images, sources };
}

/** Applies the rules to one page. Returns { errors, warnings } as arrays of strings. */
export function judge(facts) {
  const errors = [];
  const warnings = [];
  const [title] = facts.titles;
  if (facts.titles.length !== 1) errors.push(`expected one <title>, found ${facts.titles.length}`);
  if (!title) errors.push("title is empty");
  else if (title.length > TITLE_MAX) errors.push(`title is ${title.length} characters (max ${TITLE_MAX})`);
  else if (title.length < TITLE_MIN) warnings.push(`title is ${title.length} characters (min ${TITLE_MIN})`);
  const [description] = facts.descriptions;
  if (facts.descriptions.length !== 1) errors.push(`expected one meta description, found ${facts.descriptions.length}`);
  if (!description) errors.push("meta description is empty");
  else if (description.length > DESCRIPTION_MAX) errors.push(`description is ${description.length} characters (max ${DESCRIPTION_MAX})`);
  else if (description.length < DESCRIPTION_MIN) errors.push(`description is ${description.length} characters (min ${DESCRIPTION_MIN})`);
  if (facts.h1.length !== 1) errors.push(`expected one <h1>, found ${facts.h1.length}`);
  for (const image of facts.images) {
    if (image.alt === null) errors.push(`<img src="${image.src}"> has no alt attribute`);
    else if (!image.hidden && image.alt !== "" && image.alt.length < 5) errors.push(`<img src="${image.src}"> alt "${image.alt}" is too short to describe it`);
    // A src-less <img> is a script-filled placeholder (the lightbox); it reserves no layout space.
    if (!image.sized && image.src) warnings.push(`<img src="${image.src}"> has no width and height`);
  }
  return { errors, warnings };
}

/** Flags titles and descriptions shared by more than one page. Mutates each page's errors. */
export function crossCheck(pages) {
  for (const key of ["title", "description"]) {
    const seen = new Map();
    for (const page of pages) {
      const value = page[key];
      if (!value) continue;
      seen.set(value, [...(seen.get(value) ?? []), page.path]);
    }
    for (const page of pages) {
      const others = (seen.get(page[key]) ?? []).filter((other) => other !== page.path);
      if (others.length) page.errors.push(`${key} is shared with ${others.join(", ")}`);
    }
  }
  return pages;
}

const isUrl = (value) => /^https?:\/\//i.test(value);

function source(target) {
  if (isUrl(target)) {
    const origin = target.replace(/\/+$/, "");
    return {
      async text(pathname) {
        const response = await fetch(origin + pathname, { redirect: "follow" });
        if (!response.ok) throw new Error(`GET ${pathname} answered ${response.status}`);
        return response.text();
      },
      async bytes(pathname) {
        const response = await fetch(origin + pathname, { method: "HEAD" });
        if (!response.ok) return null;
        const length = Number(response.headers.get("content-length"));
        return Number.isFinite(length) && length > 0 ? length : null;
      },
    };
  }
  const root = path.resolve(target);
  const file = (pathname) => {
    const clean = decodeURIComponent(pathname.split(/[?#]/)[0]);
    return path.join(root, clean.endsWith("/") ? `${clean}index.html` : clean);
  };
  return {
    async text(pathname) {
      try {
        return await readFile(file(pathname), "utf8");
      } catch (error) {
        throw new Error(`cannot read ${pathname} from ${root}: ${error.message}`);
      }
    },
    async bytes(pathname) {
      try {
        return (await stat(file(pathname))).size;
      } catch {
        return null;
      }
    },
  };
}

async function sitemapPaths(site) {
  const index = await site.text("/sitemap.xml");
  const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
  const children = /<sitemapindex/i.test(index) ? await Promise.all(locs(index).map((loc) => site.text(new URL(loc).pathname))) : [index];
  return [...new Set(children.flatMap(locs).map((loc) => new URL(loc).pathname))].sort();
}

export async function audit(target) {
  const site = source(target);
  const paths = await sitemapPaths(site);
  const imageBytes = new Map();
  const pages = [];
  for (const pathname of paths) {
    const facts = inspect(await site.text(pathname));
    const { errors, warnings } = judge(facts);
    const local = [...facts.images.map((image) => image.src), ...facts.sources].filter((src) => src && src.startsWith("/"));
    for (const src of new Set(local)) {
      if (!imageBytes.has(src)) imageBytes.set(src, await site.bytes(src));
      const size = imageBytes.get(src);
      if (size && size > IMAGE_WARN_KB * 1024) warnings.push(`${src} is ${Math.round(size / 1024)} KB (warn above ${IMAGE_WARN_KB} KB)`);
    }
    pages.push({ path: pathname, title: facts.titles[0] ?? "", description: facts.descriptions[0] ?? "", h1: facts.h1.length, images: facts.images.length, errors, warnings });
  }
  return crossCheck(pages);
}

export function summarise(pages) {
  const count = (test) => pages.filter(test).length;
  const titles = new Map();
  const descriptions = new Map();
  for (const page of pages) {
    if (page.title) titles.set(page.title, (titles.get(page.title) ?? 0) + 1);
    if (page.description) descriptions.set(page.description, (descriptions.get(page.description) ?? 0) + 1);
  }
  return {
    pages: pages.length,
    "title over 60": count((page) => page.title.length > TITLE_MAX),
    "title under 25": count((page) => page.title && page.title.length < TITLE_MIN),
    "duplicate titles": [...titles.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0),
    "description missing": count((page) => !page.description),
    "description out of 70-160": count((page) => page.description && (page.description.length < DESCRIPTION_MIN || page.description.length > DESCRIPTION_MAX)),
    "duplicate descriptions": [...descriptions.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0),
    "H1 count not 1": count((page) => page.h1 !== 1),
    "images missing or weak alt": pages.reduce((a, page) => a + page.errors.filter((e) => e.startsWith("<img")).length, 0),
    "pages with errors": count((page) => page.errors.length > 0),
    "pages with warnings": count((page) => page.warnings.length > 0),
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seo-audit.mjs");
if (isMain) {
  const args = process.argv.slice(2);
  const target = args.find((arg) => !arg.startsWith("--")) ?? "dist";
  const reportIndex = args.indexOf("--report");
  const report = reportIndex >= 0 ? args[reportIndex + 1] : null;
  try {
    const pages = await audit(target);
    const summary = summarise(pages);
    for (const page of pages) {
      for (const error of page.errors) console.error(`ERROR ${page.path}: ${error}`);
      if (process.env.SEO_AUDIT_VERBOSE) for (const warning of page.warnings) console.log(`warn  ${page.path}: ${warning}`);
    }
    console.log(JSON.stringify(summary, null, 2));
    if (report) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(report, JSON.stringify({ target, summary, pages }, null, 2));
    }
    process.exit(summary["pages with errors"] > 0 ? 1 : 0);
  } catch (error) {
    console.error(`seo-audit failed: ${error.message}`);
    process.exit(2);
  }
}
