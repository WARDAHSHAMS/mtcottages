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
  await page.goto("/work-relocation.html");
  await expect(page.locator(`[data-related] a[href="${GUIDE}"]`)).toBeVisible();
  await expect(page.locator('.site-footer a[href="/guides/"], header a[href="/guides/"]').first()).toBeAttached();
});

for (const url of ["/guides/", GUIDE]) {
  test(`${url} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
  });
}
