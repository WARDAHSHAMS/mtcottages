const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { readFileSync } = require("node:fs");
const path = require("node:path");

// Stay policies and FAQ (#36): every stated term matches src/data/terms.json,
// nothing unconfirmed shows a number, the FAQ is published word for word as
// FAQPage, and the page is linked from the footer, guide CTAs and each home's
// terms block.
const POLICIES = "/policies/";
const terms = JSON.parse(readFileSync(path.join(__dirname, "../../src/data/terms.json"), "utf8")).homes;

test("the policies page states the shared terms, the house rules and a word-for-word FAQPage", async ({ page }) => {
  await page.goto(POLICIES);
  await expect(page).toHaveTitle(/Stay policies and FAQ/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://mtcottages.com${POLICIES}`);

  for (const home of Object.values(terms)) {
    expect(home.utilities.value).toBe("Included");
    expect(home.pets.value).toBe("No pets");
  }
  const summary = page.locator("[data-policy-summary]");
  await expect(summary).toContainText("one month (30 nights)");
  await expect(summary).toContainText("included in the monthly rate");
  await expect(page.locator("[data-house-rules] li")).toContainText(["No pets.", "No smoking, inside or outside the home."]);

  // A deposit still to confirm shows no figure.
  for (const [id, home] of Object.entries(terms)) {
    const row = page.locator(`[data-policy-home="${id}"]`);
    await expect(row).toHaveCount(1);
    if (home.deposit.status === "confirm") await expect(row.locator("td").nth(2)).toHaveText("Confirm on inquiry");
  }
  await expect(page.locator("[data-policy-homes] a")).toHaveCount(Object.keys(terms).length);

  const questions = await page.locator("[data-policy-faq] summary").allTextContents();
  const answers = await page.locator("[data-policy-faq] details p").allTextContents();
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = blocks.flatMap((text) => [JSON.parse(text)].flat()).find((node) => node["@type"] === "FAQPage");
  expect(faq.mainEntity.map((entry) => entry.name)).toEqual(questions);
  expect(faq.mainEntity.map((entry) => entry.acceptedAnswer.text)).toEqual(answers);
  expect(JSON.stringify(blocks)).not.toMatch(/"(?:aggregateRating|review)"/);
});

test("the policies page is linked from the footer, a guide CTA, a home's terms block and the sitemap", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator(`.site-footer a[href="${POLICIES}"]`)).toBeAttached();
  await page.goto("/guides/marietta-ohio-sternwheel-festival/");
  await expect(page.locator(`[data-guide-cta] a[href="${POLICIES}"]`)).toBeVisible();
  await page.goto("/parkersburg/broad-cottage/");
  await expect(page.locator(`[data-terms-block] a[href="${POLICIES}"]`)).toBeVisible();
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain(`https://mtcottages.com${POLICIES}`);
});

test("the policies page has no WCAG A/AA violations", async ({ page }) => {
  await page.goto(POLICIES);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
