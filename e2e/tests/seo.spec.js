const { test, expect } = require("@playwright/test");

// Crawl foundations (#19): robots.txt points at sitemap.xml, the sitemap lists
// every indexable page with lastmod and nothing parked or redirected, and every
// listed page answers 200 with exactly one canonical that is its own URL.
// Runs against the local build in CI and against https://mtcottages.com in the
// post-publish live smoke, so sitemap URLs are mapped onto BASE_URL.
const origin = "https://mtcottages.com";
const micrositeRoots = [
  "/marietta/frederick/", "/parkersburg/broad-cottage/", "/parkersburg/buck-cottage/",
  "/parkersburg/oak-cottage/", "/ravenswood/henrietta-cottage/", "/ravenswood/virginia-cottage/",
];
// Parked homes (CEO decision 2026-11-14) stay reachable but out of search.
const parkedPages = ["/parkersburg/yellow-cottage.html", "/ravenswood/walnut-cottage.html"];

const canonicalHrefs = (html) => [...html.matchAll(/<link[^>]+rel="canonical"[^>]*>/gi)].map((tag) => tag[0].match(/href="([^"]+)"/i)?.[1]);
const isNoindex = (html) => /<meta[^>]+name="robots"[^>]+noindex/i.test(html);

async function sitemapLocs(request) {
  const response = await request.get("/sitemap.xml");
  expect(response.status(), "sitemap.xml status").toBe(200);
  const xml = await response.text();
  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => ({
    loc: match[1].match(/<loc>([^<]+)<\/loc>/)?.[1],
    lastmod: match[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
  }));
  return entries;
}

test("robots.txt allows crawling and points to the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const robots = await response.text();
  expect(robots).toMatch(/^User-agent: \*$/m);
  expect(robots).toMatch(/^Allow: \/$/m);
  expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
  expect(robots).toMatch(/^Sitemap: https:\/\/mtcottages\.com\/sitemap\.xml$/m);
});

test("the sitemap lists every live page, with lastmod, and nothing parked", async ({ request }) => {
  const entries = await sitemapLocs(request);
  expect(entries.length).toBeGreaterThanOrEqual(50);
  const paths = new Set();
  for (const { loc, lastmod } of entries) {
    expect(loc, "every <url> has a <loc>").toBeTruthy();
    expect(loc.startsWith(`${origin}/`), `${loc} is on ${origin}`).toBe(true);
    expect(lastmod, `${loc} lastmod`).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    const { pathname } = new URL(loc);
    expect(paths.has(pathname), `${pathname} listed once`).toBe(false);
    paths.add(pathname);
  }
  for (const path of ["/", "/cottages.html", "/marietta/index.html", "/parkersburg/index.html", "/ravenswood/index.html", "/parkersburg/broad-cottage/amenities.html"]) {
    expect(paths.has(path), `${path} is in the sitemap`).toBe(true);
  }
  for (const root of micrositeRoots) {
    expect(paths.has(root), `${root} is in the sitemap`).toBe(true);
    expect(paths.has(`${root}tour.html`), `${root}tour.html is in the sitemap`).toBe(true);
  }
  for (const path of [...parkedPages, "/404.html", "/resident-portal.html", "/parkersburg/broad-cottage.html", "/marietta/frederick/rooms.html"]) {
    expect(paths.has(path), `${path} stays out of the sitemap`).toBe(false);
  }
});

test("every sitemap page answers 200 with exactly one self-referencing canonical", async ({ request }) => {
  test.setTimeout(180_000);
  const entries = await sitemapLocs(request);
  for (const { loc } of entries) {
    const { pathname } = new URL(loc);
    const response = await request.get(pathname);
    expect(response.status(), `${pathname} status`).toBe(200);
    const html = await response.text();
    expect(isNoindex(html), `${pathname} is indexable`).toBe(false);
    expect(canonicalHrefs(html), `${pathname} canonical`).toEqual([loc]);
  }
});

test("parked homes stay reachable but are kept out of search", async ({ request }) => {
  for (const path of parkedPages) {
    const response = await request.get(path);
    expect(response.status(), `${path} status`).toBe(200);
    const html = await response.text();
    expect(isNoindex(html), `${path} noindex`).toBe(true);
    expect(canonicalHrefs(html)).toEqual([`${origin}${path}`]);
  }
});

test("the Search Console verification tag appears at most once and only with a token", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const tags = [...html.matchAll(/<meta[^>]+name="google-site-verification"[^>]*>/gi)].map((match) => match[0]);
  expect(tags.length).toBeLessThanOrEqual(1);
  for (const tag of tags) expect(tag).toMatch(/content="[A-Za-z0-9_-]{20,100}"/);
});
