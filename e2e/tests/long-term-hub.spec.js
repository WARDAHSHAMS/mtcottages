const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { readFileSync } = require("node:fs");
const path = require("node:path");

// The long-term furnished living hub (#46). Every lease figure is HUD's Fair
// Market Rent from _data/area-stats.json, the page says a lease costs less,
// and the call to action pre-fills the long-term audience.
const HUB = "/stays/long-term/";
const stats = JSON.parse(readFileSync(path.join(__dirname, "../../_data/area-stats.json"), "utf8"));
const rents = (id) => stats.fairMarketRent.areas.find((area) => area.id === id).rents;
const dollars = (value) => `$${value.toLocaleString("en-US")}`;

test("the long-term hub compares a furnished month with HUD's Fair Market Rents", async ({ page }) => {
  await page.goto(HUB);
  await expect(page).toHaveTitle("Long-Term Furnished Rentals: The True Cost | Mt Cottages");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Long-term furnished stays, and what they really cost");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://mtcottages.com${HUB}`);

  const chart = page.locator('[data-guide-chart="true-monthly-cost"]');
  const one = chart.locator("svg g[data-chart-group]").filter({ hasText: "One bedroom" });
  await expect(one.locator('[data-chart-bar="Unfurnished lease, Parkersburg-Vienna"] .gc-value')).toHaveText(dollars(rents("parkersburg-vienna")[1]));
  await expect(one.locator('[data-chart-bar="Unfurnished lease, Washington County, Ohio"] .gc-value')).toHaveText(dollars(rents("washington-county-oh")[1]));
  await expect(one.locator('[data-chart-bar="Mt Cottages furnished month"] .gc-value')).toHaveText("$1,895");
  await chart.getByText("Show the figures as a table").click();
  await expect(chart.locator(".gc-table")).toContainText(dollars(rents("parkersburg-vienna")[3]));

  // Honest framing: the page says when a lease is the cheaper choice, and every figure has its source.
  await expect(page.locator("#when-a-lease-is-cheaper")).toContainText("an unfurnished lease is cheaper");
  await expect(page.locator(`.garticle a[href="${stats.fairMarketRent.source.url}"]`).first()).toBeAttached();
  await expect(page.locator('.garticle a[href="https://www.bls.gov/news.release/cesan.nr0.htm"]')).toBeAttached();

  const cta = page.locator("[data-guide-cta]");
  await expect(cta.getByRole("link", { name: /Check dates/ })).toHaveAttribute("href", /audience=long-term/);
  await expect(cta.getByRole("link", { name: "Frederick Cottage, Marietta, OH" })).toBeVisible();
  await expect(cta.getByRole("link", { name: "Broad Cottage, Parkersburg, WV" })).toBeVisible();
});

test("the long-term hub is in the navigation, links the long-stay guides and is in the sitemap", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator(`header a[href="${HUB}"]`).first()).toBeAttached();
  await page.goto(HUB);
  await expect(page.locator('[data-related] a[href="/guides/moving-to-parkersburg-wv/"]')).toBeVisible();
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain(`https://mtcottages.com${HUB}`);
});

test("the long-term hub has no WCAG A/AA violations", async ({ page }) => {
  await page.goto(HUB);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
