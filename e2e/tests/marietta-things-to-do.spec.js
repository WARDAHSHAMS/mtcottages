const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { readFileSync } = require("node:fs");
const path = require("node:path");

// "Things to do in Marietta, Ohio" (#51). Every place links to its operator's
// page, the page says Marietta, Ohio, and the drive and walk times from
// Frederick Cottage are the ones measured in _data/distances.json.
const GUIDE = "/guides/things-to-do-in-marietta-ohio/";
const distances = JSON.parse(readFileSync(path.join(__dirname, "../../_data/distances.json"), "utf8"));
const route = (list, destination) => {
  const found = distances[list].find((candidate) => candidate.origin === "frederick" && candidate.destination === destination);
  if (!found) throw new Error(`no ${list} row frederick -> ${destination}`);
  return found;
};

test("the Marietta guide says Marietta, Ohio, and links every place to its operator", async ({ page }) => {
  await page.goto(GUIDE);
  await expect(page).toHaveTitle("Things to Do in Marietta, Ohio: Local Guide | Mt Cottages");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Things to do in Marietta, Ohio");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://mtcottages.com${GUIDE}`);
  await expect(page.locator(".garticle")).toContainText("not Marietta, Georgia");

  for (const url of [
    "https://mariettamuseums.org/plan-your-visit/",
    "https://mariettamuseums.org/ohio-river-museum",
    "https://www.mariettaoh.net/services/parks_and_recreation/trails.php",
    "https://www.mariettaoh.net/services/public_works/cemetery.php",
    "https://valleygemsternwheeler.com/",
    "https://www.mariettamainstreet.org/",
    "https://mariettaohio.org/categories/dine/",
    "https://sternwheel.org/",
  ]) {
    await expect(page.locator(`.garticle a[href="${url}"]`).first()).toBeAttached();
  }

  const chart = page.locator('[data-guide-chart="marietta-from-frederick"]');
  const byCar = chart.locator("svg g[data-chart-group]").filter({ hasText: "By car" });
  const onFoot = chart.locator("svg g[data-chart-group]").filter({ hasText: "On foot" });
  await expect(byCar.locator("[data-chart-bar]")).toHaveCount(3);
  await expect(onFoot.locator('[data-chart-bar="Downtown Marietta"] .gc-value')).toHaveText(`${route("walks", "downtown-marietta").minutes} min`);
  await expect(onFoot.locator('[data-chart-bar="Marietta College"] .gc-value')).toHaveText(`${route("walks", "marietta-college").minutes} min`);
  // No walk to Campus Martius was measured, so none is shown.
  await expect(onFoot.locator("[data-chart-bar]")).toHaveCount(2);
  await expect(page.locator("#history")).toContainText(`about ${route("rows", "campus-martius").minutes} minutes away by car`);

  const cta = page.locator("[data-guide-cta]");
  await expect(cta.getByRole("link", { name: /Check dates/ })).toHaveAttribute("href", /audience=visitor/);
  await expect(cta.getByRole("link", { name: "Frederick Cottage, Marietta, OH" })).toHaveAttribute("href", "/marietta/frederick/");
});

test("the Marietta guide is linked from the guides index, Frederick Cottage and the sitemap", async ({ page, request }) => {
  await page.goto("/guides/");
  await expect(page.locator(`[data-guide-list] a[href="${GUIDE}"]`)).toBeVisible();
  await page.goto("/marietta/frederick/");
  await expect(page.locator(`[data-related] a[href="${GUIDE}"]`)).toBeVisible();
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain(`https://mtcottages.com${GUIDE}`);
});

test("the Marietta guide has no WCAG A/AA violations", async ({ page }) => {
  await page.goto(GUIDE);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
