const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

// "Where to eat" (#57): one section per town and one for late-night food, every
// place links to its own page (or the page its town's directory links for it),
// no ratings or business photos, and the checked date is on the page.
const GUIDE = "/guides/where-to-eat-parkersburg-marietta-ravenswood/";

test("the where-to-eat guide has a section per town, late-night food and a link for every place", async ({ page }) => {
  await page.goto(GUIDE);
  await expect(page).toHaveTitle("Restaurants: Parkersburg, Marietta, Ravenswood | Mt Cottages");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Where to eat in Parkersburg, Marietta, Ohio, and Ravenswood");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://mtcottages.com${GUIDE}`);

  for (const [id, heading] of [["parkersburg", "Parkersburg, WV"], ["marietta", "Marietta, Ohio"], ["ravenswood", "Ravenswood, WV"], ["late-night", "Late-night food for shift workers"]]) {
    const section = page.locator(`section#${id}`);
    await expect(section.getByRole("heading", { level: 2 })).toHaveText(heading);
    const places = section.locator("[data-place]");
    expect(await places.count()).toBeGreaterThan(0);
    for (const place of await places.all()) {
      await expect(place.getByRole("link")).toHaveAttribute("href", /^https:\/\//);
    }
  }

  // The checked date shows, and the official directories are the sources.
  await expect(page.locator("#how-we-list")).toContainText("We last checked every link on November 22, 2026.");
  await expect(page.locator("[data-byline] time").first()).toHaveAttribute("datetime", "2026-11-22");
  for (const url of [
    "https://www.greaterparkersburg.com/directory/category/restaurant/",
    "https://mariettaohio.org/categories/dine/",
    "https://www.cityofravenswood.com/1197/Restaurants",
  ]) {
    await expect(page.locator(`.garticle-sources a[href="${url}"]`)).toBeAttached();
  }

  // Text and links only: no business photos, no ratings.
  await expect(page.locator(".garticle-section img")).toHaveCount(0);
  await expect(page.locator(".garticle")).not.toContainText(/★|\d(\.\d)? stars?|rated \d/i);
});

test("the where-to-eat guide is linked from the guides index, the homes and the sitemap", async ({ page, request }) => {
  await page.goto("/guides/");
  await expect(page.locator(`[data-guide-list] a[href="${GUIDE}"]`)).toBeVisible();
  for (const microsite of ["/marietta/frederick/", "/ravenswood/henrietta-cottage/"]) {
    await page.goto(microsite);
    await expect(page.locator(`[data-related] a[href="${GUIDE}"]`)).toBeVisible();
  }
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain(`https://mtcottages.com${GUIDE}`);
});

test("the where-to-eat guide has no WCAG A/AA violations", async ({ page }) => {
  await page.goto(GUIDE);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
