const { test, expect } = require("@playwright/test");

// Internal linking and breadcrumbs (#35). scripts/check-links.mjs gates the
// whole build (no orphans, no broken or redirect links, descriptive anchors,
// matching breadcrumbs); these tests check what a visitor and a crawler see
// on the rendered pages, and run against the live site in the post-publish smoke.

async function sitemapPaths(request) {
  const response = await request.get("/sitemap.xml");
  expect(response.status(), "sitemap.xml status").toBe(200);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

const breadcrumbLists = (html) =>
  [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((block) => {
      const data = JSON.parse(block[1]);
      return Array.isArray(data) ? data : [data];
    })
    .filter((node) => node && node["@type"] === "BreadcrumbList");

const sameDocument = (url) => url.replace(/[?#].*$/, "").replace(/\/index\.html$/, "/");

test("every listed page except the home page has a visible trail that matches its one BreadcrumbList", async ({ page, request }) => {
  test.setTimeout(240_000);
  const paths = (await sitemapPaths(request)).filter((path) => path !== "/");
  expect(paths.length).toBeGreaterThanOrEqual(50);
  for (const path of paths) {
    await page.goto(path);
    const html = await page.content();
    const lists = breadcrumbLists(html);
    expect(lists, `${path} publishes exactly one BreadcrumbList`).toHaveLength(1);
    const schemaNames = lists[0].itemListElement.map((item) => item.name);
    const trail = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(trail, `${path} shows a breadcrumb trail`).toBeVisible();
    const visibleNames = await trail.locator("a, span:not([aria-hidden='true'])").allInnerTexts();
    expect(visibleNames.map((name) => name.trim()), `${path}: visible trail matches the schema`).toEqual(schemaNames);
    await expect(trail.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/");
    await expect(trail.locator("[aria-current='page']"), `${path}: the last crumb is the current page`).toHaveText(schemaNames.at(-1));
    const canonical = await page.locator("link[rel='canonical']").getAttribute("href");
    expect(sameDocument(lists[0].itemListElement.at(-1).item), `${path}: the last item is the canonical page`).toBe(sameDocument(canonical));
  }
});

test("a microsite page nests under its town: Home / Locations / Marietta, Ohio / Frederick Cottage / Tour", async ({ page }) => {
  await page.goto("/marietta/frederick/tour.html");
  const trail = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(trail.getByRole("link")).toHaveText(["Home", "Locations", "Marietta, Ohio", "Frederick Cottage"]);
  await expect(trail.locator("[aria-current='page']")).toHaveText("Tour");
  await trail.getByRole("link", { name: "Marietta, Ohio" }).click();
  await expect(page).toHaveURL(/\/marietta\/(index\.html)?$/);
  await expect(page.locator("h1")).toContainText("Marietta");
});

test("each home links to its town and to the guides that feature it, with descriptive anchors", async ({ page }) => {
  await page.goto("/parkersburg/broad-cottage/");
  const related = page.locator("[data-related]");
  await expect(related).toBeVisible();
  await expect(related.getByRole("link", { name: /Furnished homes in Parkersburg, West Virginia/ })).toHaveAttribute("href", "/parkersburg/index.html");
  await expect(related.getByRole("link", { name: /Travel nurse housing/ })).toHaveAttribute("href", "/travel-nurses/");
  await expect(related.getByRole("link", { name: /season you are in/ })).toHaveAttribute("href", "/living.html");
  for (const name of await related.getByRole("link").allInnerTexts()) {
    expect(name.toLowerCase()).not.toMatch(/^(click here|here|read more|learn more|more)$/);
  }
});

test("guides pass visitors to the homes they feature, and the homes link back", async ({ page }) => {
  await page.goto("/travel-nurses/");
  const homeLinks = page.locator("main a[href^='/'][href*='-cottage/'], main a[href^='/marietta/frederick/']");
  expect(await homeLinks.count(), "the travel-nurse hub links to listed homes").toBeGreaterThanOrEqual(2);
  await page.goto("/ravenswood/henrietta-cottage/");
  await expect(page.locator("[data-related]").getByRole("link", { name: /Travel nurse housing/ })).toBeVisible();
});

test("town pages link to every home in town", async ({ page }) => {
  await page.goto("/parkersburg/index.html");
  for (const href of ["/parkersburg/broad-cottage/", "/parkersburg/buck-cottage/", "/parkersburg/oak-cottage/"]) {
    expect(await page.locator(`main a[href^='${href}']`).count(), `${href} is linked from the Parkersburg page`).toBeGreaterThan(0);
  }
});

test("the breadcrumb trail works from the keyboard", async ({ page }) => {
  await page.goto("/family-stays.html");
  const trail = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(trail.getByRole("link")).toHaveText(["Home", "Living"]);
  await expect(trail.locator("[aria-current='page']")).toHaveText("Family stays");
  const crumbLink = trail.getByRole("link", { name: "Living" });
  await crumbLink.focus();
  await expect(crumbLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/living\.html$/);
});
