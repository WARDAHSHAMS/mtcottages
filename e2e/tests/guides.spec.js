const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { readFileSync } = require("node:fs");
const path = require("node:path");

// Area guides, the content engine (#47). The figures on the commute guide must
// be the measured rows in _data/distances.json, the byline is the team (never
// an invented author), and every guide publishes one Article node.

const distances = JSON.parse(readFileSync(path.join(__dirname, "../../_data/distances.json"), "utf8"));
const GUIDE = "/guides/commute-times-to-mid-ohio-valley-employers/";
const row = (origin, destination) => {
  const found = distances.rows.find((candidate) => candidate.origin === origin && candidate.destination === destination);
  if (!found) throw new Error(`no distances row ${origin} -> ${destination}`);
  return found;
};

const jsonLd = async (page) => {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [data];
  });
};

test("the guides index lists the commute guide and its filters narrow the list", async ({ page }) => {
  await page.goto("/guides/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guides to the Mid-Ohio Valley.");
  const filter = page.locator("[data-guide-filter]");
  await expect(filter).toBeVisible();
  const card = page.locator(`[data-guide-list] a[href="${GUIDE}"]`);
  await expect(card).toBeVisible();
  await filter.getByLabel("Town").selectOption("ravenswood");
  await expect(card).toBeVisible();
  await expect(page.locator("[data-guide-count]")).toHaveText(/^\d+ guides?$/);
  await card.click();
  await expect(page).toHaveURL(new RegExp(`${GUIDE}$`));
});

test("the commute guide shows measured figures, a team byline and an Article node", async ({ page }) => {
  await page.goto(GUIDE);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Commute times");
  await expect(page.locator("[data-byline]")).toContainText("By the Mt Cottages team");
  await expect(page.locator("[data-byline] time").first()).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);

  // Table of contents: every entry jumps to a section on the page.
  const tocLinks = page.locator(".garticle-toc a");
  expect(await tocLinks.count()).toBeGreaterThanOrEqual(4);
  for (const href of await tocLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
    await expect(page.locator(href)).toHaveCount(1);
  }

  // The chart is labelled for assistive tech, and its figures are the measured rows.
  const chart = page.locator('[data-guide-chart="employer-drives"]');
  await expect(chart.locator('svg[role="img"]')).toHaveAttribute("aria-labelledby", /employer-drives-title/);
  const broadChemours = row("broad", "chemours-washington-works");
  const chemoursGroup = chart.locator("svg g[data-chart-group]").filter({ hasText: "Chemours" });
  await expect(chemoursGroup.locator('[data-chart-bar="Broad Cottage"] .gc-value')).toHaveText(`${broadChemours.minutes} min`);
  const buck = chemoursGroup.locator('[data-chart-bar^="Buck Cottage"]');
  await expect(buck).toHaveAttribute("data-chart-bar", /from the Parkersburg centre/);
  await expect(buck.locator(".gc-value")).toHaveText(`${row("parkersburg-centre", "chemours-washington-works").minutes} min`);

  // The same figures are in the table view.
  await chart.getByText("Show the figures as a table").click();
  await expect(chart.locator(".gc-table")).toContainText(`${broadChemours.minutes} min`);
  await expect(chart.locator(".gc-table")).toContainText(`${broadChemours.miles} mi`);

  // The short answer quotes the nearest home with a published address.
  await expect(page.locator("#short-answer")).toContainText(`Henrietta Cottage, about ${row("henrietta", "constellium-ravenswood").minutes} min`);

  const nodes = await jsonLd(page);
  const articles = nodes.filter((node) => node["@type"] === "Article");
  expect(articles).toHaveLength(1);
  expect(articles[0].author).toEqual({ "@id": "https://mtcottages.com/#business" });
  expect(articles[0].dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(articles[0].mainEntityOfPage).toBe(`https://mtcottages.com${GUIDE}`);
  expect(JSON.stringify(nodes)).not.toMatch(/"(?:aggregateRating|review)"/);

  // The call to action carries the audience and source page, and names the homes in full.
  const cta = page.locator("[data-guide-cta]");
  await expect(cta.getByRole("link", { name: /Check dates/ })).toHaveAttribute("href", /audience=crew/);
  await expect(cta.getByRole("link", { name: "Broad Cottage, Parkersburg, WV" })).toHaveAttribute("href", "/parkersburg/broad-cottage/");
});

test("homes and audience guides link into the area guides, and the nav lists them", async ({ page }) => {
  await page.goto("/parkersburg/broad-cottage/");
  await expect(page.locator(`[data-related] a[href="${GUIDE}"]`)).toBeVisible();
  await page.goto("/corporate-housing/");
  await expect(page.locator(`[data-related] a[href="${GUIDE}"]`)).toBeVisible();
  await expect(page.locator('.site-footer a[href="/guides/"], header a[href="/guides/"]').first()).toBeAttached();
});

// The seasonal Sternwheel Festival guide (#52): its dates name the year they
// apply to and say how to check the latest, the drive from Frederick is the
// measured row, the call to action is a month (stays are 30 nights or more),
// and the guide is reachable from the index and from Frederick's microsite.
const STERNWHEEL = "/guides/marietta-ohio-sternwheel-festival/";

test("the Sternwheel Festival guide dates its facts and offers a month, not a weekend", async ({ page }) => {
  await page.goto(STERNWHEEL);
  await expect(page).toHaveTitle("Marietta, Ohio Sternwheel Festival Guide | Mt Cottages");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Ohio River Sternwheel Festival in Marietta, Ohio");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://mtcottages.com${STERNWHEEL}`);

  const dates = page.locator("#dates");
  await expect(dates).toContainText("2026: Friday to Sunday, September 11 to 13, 2026");
  await expect(dates).toContainText("2027: not yet announced");
  await expect(dates).toContainText("Friday to Sunday, September 10 to 12, 2027");
  await expect(dates).toContainText("Confirm on sternwheel.org");
  await expect(page.locator(".garticle a[href='https://sternwheel.org/']").first()).toBeAttached();

  const frederick = row("frederick", "downtown-marietta");
  await expect(page.locator("#staying")).toContainText(`about ${frederick.minutes} minutes by car (${frederick.miles} miles`);
  await expect(page.locator("#staying")).toContainText("30 nights or more");

  const cta = page.locator("[data-guide-cta]");
  await expect(cta.getByRole("link", { name: /Check dates/ })).toHaveAttribute("href", /audience=long-term/);
  await expect(cta.getByRole("link", { name: /Frederick Cottage, Marietta/ })).toHaveAttribute("href", "/marietta/frederick/");

  const articles = (await jsonLd(page)).filter((node) => node["@type"] === "Article");
  expect(articles).toHaveLength(1);
  expect(articles[0].mainEntityOfPage).toBe(`https://mtcottages.com${STERNWHEEL}`);
});

test("the Sternwheel guide is linked from the guides index, Frederick's microsite and the sitemap", async ({ page, request }) => {
  await page.goto("/guides/");
  await expect(page.locator(`[data-guide-list] a[href="${STERNWHEEL}"]`)).toBeVisible();
  await page.goto("/marietta/frederick/");
  await expect(page.locator(`[data-related] a[href="${STERNWHEEL}"]`)).toBeVisible();
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(`https://mtcottages.com${STERNWHEEL}`);
});

// The Blennerhassett Island visitor guide (#50): the season, boat and prices
// name the year they describe and point at the park's own schedule, the
// package saving is the sum of the listed prices, the drive figures are the
// measured rows, and the call to action is a month in Parkersburg.
const ISLAND = "/guides/blennerhassett-island-ferry-tickets-season/";

test("the Blennerhassett Island guide dates its facts, cites the park and offers a month", async ({ page }) => {
  await page.goto(ISLAND);
  await expect(page).toHaveTitle("Blennerhassett Island: Ferry, Tickets, Season | Mt Cottages");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Visiting Blennerhassett Island: the sternwheeler, tickets and season");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://mtcottages.com${ISLAND}`);

  const season = page.locator("#season");
  await expect(season).toContainText("early May until the end of October");
  await expect(season).toContainText("2026: opening day was Friday, May 1");
  await expect(season).toContainText("2027: the park had not published its 2027 schedule");

  await expect(page.locator("#sternwheeler")).toContainText("on the hour");
  await expect(page.locator("#sternwheeler")).toContainText("The last boat to the island leaves at 3:00 PM.");
  await expect(page.locator('[data-guide-diagram="island-visit"] li')).toHaveCount(4);

  // $4 + $12 + $5 + $13 = $34 for an adult, so the $33 package saves $1.
  const tickets = page.locator("#tickets");
  await expect(tickets).toContainText("$33 adults, $23 children");
  await expect(tickets).toContainText("$1 less than the four tickets bought one by one ($34)");
  await expect(page.locator(".garticle a[href^='https://wvstateparks.com/']").first()).toBeAttached();

  const broad = row("broad", "downtown-parkersburg");
  const chart = page.locator('[data-guide-chart="downtown-drives"]');
  await expect(chart.locator('[data-chart-bar="Broad Cottage"] .gc-value')).toHaveText(`${broad.minutes} min`);
  await expect(chart.locator('[data-chart-bar="Oak Cottage"] .gc-value')).toHaveText(`${row("oak", "downtown-parkersburg").minutes} min`);
  await expect(page.locator("#staying")).toContainText("30 nights or more");

  const cta = page.locator("[data-guide-cta]");
  await expect(cta.getByRole("link", { name: /Check dates/ })).toHaveAttribute("href", /audience=long-term/);
  await expect(cta.getByRole("link", { name: "Oak Cottage, Parkersburg, WV" })).toHaveAttribute("href", "/parkersburg/oak-cottage/");

  const articles = (await jsonLd(page)).filter((node) => node["@type"] === "Article");
  expect(articles).toHaveLength(1);
  expect(articles[0].mainEntityOfPage).toBe(`https://mtcottages.com${ISLAND}`);
});

test("the Blennerhassett guide is linked from the guides index, the Parkersburg microsites and the sitemap", async ({ page, request }) => {
  await page.goto("/guides/");
  await page.locator("[data-guide-filter]").getByLabel("Town").selectOption("parkersburg");
  await expect(page.locator(`[data-guide-list] a[href="${ISLAND}"]`)).toBeVisible();
  for (const microsite of ["/parkersburg/broad-cottage/", "/parkersburg/oak-cottage/"]) {
    await page.goto(microsite);
    await expect(page.locator(`[data-related] a[href="${ISLAND}"]`)).toBeVisible();
  }
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain(`https://mtcottages.com${ISLAND}`);
});

for (const url of ["/guides/", GUIDE, STERNWHEEL, ISLAND]) {
  test(`${url} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
  });
}
