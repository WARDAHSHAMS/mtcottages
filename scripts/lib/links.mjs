// Pure helpers for scripts/check-links.mjs (WorldEnterpriseGroup/mtcottages#35):
// read a built page's links, breadcrumbs and robots state, then find broken
// internal links, orphan pages, generic anchors and breadcrumb mismatches.
// Kept free of file I/O so scripts/tests/links.test.mjs can exercise them.

export const SITE_ORIGIN = "https://mtcottages.com";

/** Anchor text that tells a reader (or a search engine) nothing about the target. */
export const GENERIC_ANCHORS = new Set([
  "click here",
  "click",
  "here",
  "read more",
  "more",
  "learn more",
  "more info",
  "this page",
  "this link",
  "link",
  "go",
]);

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === "#") {
      const value = code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return match ? decodeEntities(match[1] ?? match[2] ?? "") : undefined;
};

/** Visible text of an HTML fragment: tags dropped, aria-hidden parts dropped, whitespace collapsed. */
export function visibleText(fragment) {
  let text = fragment
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  // Drop aria-hidden elements (decorative arrows and separators). Not nested-safe,
  // which is fine: they hold a glyph, never another element with text.
  text = text.replace(/<(\w+)\b[^>]*\saria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi, " ");
  return decodeEntities(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** The name a screen reader announces for a link: aria-label, else visible text, else image alt text. */
export function accessibleName(openTag, inner) {
  const label = attr(openTag, "aria-label");
  if (label && label.trim()) return label.trim();
  const text = visibleText(inner);
  if (text) return text;
  const alts = [...inner.matchAll(/<img\b[^>]*>/gi)].map((img) => attr(img[0], "alt") ?? "").filter((alt) => alt.trim());
  return alts.join(" ").trim();
}

/** Every <a href> on a page, with its accessible name. Links inside <template> are skipped. */
export function extractAnchors(markup) {
  const body = markup.replace(/<template\b[\s\S]*?<\/template>/gi, "");
  const anchors = [];
  for (const match of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const openTag = `<a${match[1]}>`;
    const href = attr(openTag, "href");
    if (href === undefined) continue;
    anchors.push({ href, name: accessibleName(openTag, match[2]) });
  }
  return anchors;
}

/**
 * The site path an href points to (query and fragment dropped), or undefined
 * when it leaves the site (another host, mailto:, tel:, javascript:) or only
 * moves within the page.
 */
export function internalPath(href, pagePath) {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) return undefined;
  let url;
  try {
    url = new URL(trimmed, new URL(pagePath, SITE_ORIGIN));
  } catch {
    // An href the URL parser rejects cannot be followed; report it as its own path.
    return trimmed;
  }
  if (url.origin !== SITE_ORIGIN) return undefined;
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    return url.pathname;
  }
}

/** The public URL path of a built file, relative to dist ("index.html" → "/", "a/index.html" → "/a/"). */
export function pagePathOf(relativeFile) {
  const file = relativeFile.split("\\").join("/");
  if (file === "index.html") return "/";
  if (file.endsWith("/index.html")) return `/${file.slice(0, -"index.html".length)}`;
  return `/${file}`;
}

/**
 * The built file a site path is served from, or undefined when nothing is
 * built there. `files` is a Set of dist-relative paths with forward slashes.
 * Mirrors GitHub Pages: "/a/" → a/index.html, "/a" → a, a.html or a/index.html.
 */
export function resolveTarget(path, files) {
  const bare = path.replace(/^\/+/, "");
  const candidates = path.endsWith("/") ? [`${bare}index.html`] : [bare, `${bare}.html`, `${bare}/index.html`];
  return candidates.find((candidate) => files.has(candidate));
}

export const isNoindex = (markup) => /<meta[^>]+name="robots"[^>]+noindex/i.test(markup);

/** A redirect stub: Astro's redirect pages and hand-written meta refreshes. */
export const isRedirect = (markup) => /<meta[^>]+http-equiv="refresh"/i.test(markup);

/** The visible breadcrumb trail: the text of each crumb, in order, or undefined when the page has none. */
export function visibleCrumbs(markup) {
  const nav = markup.match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!nav) return undefined;
  const crumbs = [];
  for (const item of nav[1].matchAll(/<(a|span)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    if (/\saria-hidden="true"/i.test(item[2])) continue;
    const text = visibleText(item[3]);
    if (text) crumbs.push({ name: text, href: item[1].toLowerCase() === "a" ? attr(`<a${item[2]}>`, "href") : undefined });
  }
  return crumbs;
}

/** Every JSON-LD node on the page, with arrays and @graph flattened. Unparseable blocks are reported. */
export function jsonLdNodes(markup) {
  const nodes = [];
  const errors = [];
  for (const block of markup.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try {
      data = JSON.parse(block[1]);
    } catch (error) {
      errors.push(`invalid JSON-LD: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const queue = Array.isArray(data) ? [...data] : [data];
    while (queue.length) {
      const node = queue.shift();
      if (!node || typeof node !== "object") continue;
      nodes.push(node);
      if (Array.isArray(node["@graph"])) queue.push(...node["@graph"]);
    }
  }
  return { nodes, errors };
}

/** The names and URLs of each BreadcrumbList on the page, or undefined when there is none. */
export function schemaCrumbs(nodes) {
  const lists = nodes.filter((node) => node["@type"] === "BreadcrumbList");
  if (lists.length === 0) return undefined;
  return lists.map((list) =>
    (Array.isArray(list.itemListElement) ? list.itemListElement : [])
      .slice()
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((item) => ({ name: String(item.name ?? ""), item: typeof item.item === "string" ? item.item : item.item?.["@id"] })),
  );
}

/**
 * Checks one indexable page's breadcrumbs: a visible trail that starts at Home
 * and ends at this page, exactly one BreadcrumbList, and the two say the same thing.
 */
export function breadcrumbProblems(pagePath, markup) {
  const problems = [];
  const visible = visibleCrumbs(markup);
  const { nodes, errors } = jsonLdNodes(markup);
  problems.push(...errors);
  const lists = schemaCrumbs(nodes);
  if (!visible || visible.length === 0) problems.push('has no visible breadcrumb trail (nav aria-label="Breadcrumb")');
  if (!lists) problems.push("has no BreadcrumbList schema");
  else if (lists.length > 1) problems.push(`has ${lists.length} BreadcrumbList blocks; it needs exactly one`);
  if (!visible || visible.length === 0 || !lists || lists.length !== 1) return problems;
  const schema = lists[0];
  if (visible.length < 2) problems.push("breadcrumb trail needs at least Home and this page");
  if (visible[0].name !== "Home" || visible[0].href !== "/") problems.push(`breadcrumb trail must start with a "Home" link to /, not ${JSON.stringify(visible[0])}`);
  const visibleNames = visible.map((crumb) => crumb.name);
  const schemaNames = schema.map((crumb) => crumb.name);
  if (visibleNames.join(" / ") !== schemaNames.join(" / ")) {
    problems.push(`visible breadcrumbs "${visibleNames.join(" / ")}" do not match BreadcrumbList "${schemaNames.join(" / ")}"`);
  }
  for (const [index, crumb] of visible.slice(0, -1).entries()) {
    if (!crumb.href) problems.push(`breadcrumb "${crumb.name}" (position ${index + 1}) is not a link`);
  }
  for (const crumb of schema) {
    if (!crumb.item) problems.push(`BreadcrumbList item "${crumb.name}" has no URL`);
  }
  const last = schema[schema.length - 1];
  const pageUrl = canonicalOf(markup) ?? new URL(pagePath, SITE_ORIGIN).toString();
  if (last?.item && sameDocument(last.item) !== sameDocument(pageUrl)) problems.push(`the last BreadcrumbList item is ${last.item}, not this page (${pageUrl})`);
  return problems;
}

/** The page's canonical URL, when it declares one. */
export function canonicalOf(markup) {
  const tag = markup.match(/<link\b[^>]*rel="canonical"[^>]*>/i);
  return tag ? attr(tag[0], "href") : undefined;
}

/** One spelling per document: "/a/index.html" and "/a/" are the same page on GitHub Pages. */
const sameDocument = (url) => url.replace(/[?#].*$/, "").replace(/\/index\.html$/, "/");

/** Why an anchor's accessible name fails, or undefined when it describes its target. */
export function anchorNameProblem(name) {
  if (!name) return "has no accessible name";
  const normalised = name.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
  if (GENERIC_ANCHORS.has(normalised)) return `uses the non-descriptive anchor "${name}"`;
  return undefined;
}

/**
 * The whole-site analysis. `pages` is a list of { file, markup } for every
 * built HTML file (dist-relative, forward slashes); `files` is a Set of every
 * built file. Returns the list of problems and some counts for the summary.
 */
export function analyseSite(pages, files) {
  const errors = [];
  const indexable = new Map();
  const redirects = new Map();
  const markupByFile = new Map(pages.map((page) => [page.file, page.markup]));
  for (const page of pages) {
    const path = pagePathOf(page.file);
    if (isRedirect(page.markup)) redirects.set(page.file, path);
    else if (!isNoindex(page.markup) && page.file !== "404.html") indexable.set(page.file, path);
  }
  const inbound = new Map([...indexable.keys()].map((file) => [file, new Set()]));
  let linkCount = 0;
  for (const page of pages) {
    if (redirects.has(page.file)) continue;
    const from = pagePathOf(page.file);
    const countsAsInbound = indexable.has(page.file);
    for (const anchor of extractAnchors(page.markup)) {
      const path = internalPath(anchor.href, from);
      if (path === undefined) continue;
      linkCount += 1;
      const nameProblem = anchorNameProblem(anchor.name);
      if (nameProblem) errors.push(`${from}: the link to ${anchor.href} ${nameProblem}`);
      const target = resolveTarget(path, files);
      if (!target) {
        errors.push(`${from}: broken internal link to ${anchor.href} (nothing is built at ${path})`);
        continue;
      }
      if (redirects.has(target)) {
        errors.push(`${from}: links to ${anchor.href}, which only redirects; link to its destination instead`);
        continue;
      }
      if (countsAsInbound && target !== page.file && inbound.has(target)) inbound.get(target).add(page.file);
    }
  }
  for (const [file, path] of indexable) {
    if (path !== "/" && inbound.get(file).size === 0) errors.push(`${path}: orphan page; no other indexable page links to it`);
    if (path === "/") continue;
    for (const problem of breadcrumbProblems(path, markupByFile.get(file))) errors.push(`${path}: ${problem}`);
  }
  return { errors, indexable: indexable.size, redirects: redirects.size, links: linkCount };
}
