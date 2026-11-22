const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

// The monthly furnished stays hub (#64): stay lengths, the filterable home grid,
// all three town pages, a word-for-word FAQPage, and links in from the policies
// page and the cottages index.
const HUB = "/stays/monthly/";

test("the monthly hub explains stay lengths, lists every home and links all three towns", async ({ page }) => {
  await page.goto(HUB);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Monthly furnished stays in the Mid-Ohio Valley.");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://mtcottages.com${HUB}`);
  await expect(page.locator("[data-stay-lengths] h3")).toHaveText(["30 days or more", "13 weeks", "Month to month"]);

  await page.goto("/cottages.html");
  const homesOnIndex = await page.locator("[data-cottage-browser] .property-card, [data-cottage-browser] article").count();
  await page.goto(HUB);
  expect(await page.locator("[data-cottage-browser] .property-card, [data-cottage-browser] article").count()).toBe(homesOnIndex);
  expect(homesOnIndex).toBeGreaterThan(0);

  for (const href of ["/marietta/index.html", "/parkersburg/index.html", "/ravenswood/index.html"]) {
    await expect(page.locator(`[data-town-links] a[href="${href}"]`)).toHaveCount(1);
  }

  const questions = await page.locator("[data-monthly-faq] summary").allTextContents();
  const answers = await page.locator("[data-monthly-faq] details p").allTextContents();
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = blocks.flatMap((text) => [JSON.parse(text)].flat()).find((node) => node["@type"] === "FAQPage");
  expect(faq.mainEntity.map((entry) => entry.name)).toEqual(questions);
  expect(faq.mainEntity.map((entry) => entry.acceptedAnswer.text)).toEqual(answers);
});

test("the monthly hub is linked from the policies page, the cottages index and the sitemap", async ({ page, request }) => {
  await page.goto("/policies/");
  await expect(page.locator(`main a[href="${HUB}"]`).first()).toBeVisible();
  await page.goto("/cottages.html");
  await expect(page.locator(`main a[href="${HUB}"]`).first()).toBeVisible();
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain(`https://mtcottages.com${HUB}`);
});

test("the monthly hub has no WCAG A/AA violations", async ({ page }) => {
  await page.goto(HUB);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
