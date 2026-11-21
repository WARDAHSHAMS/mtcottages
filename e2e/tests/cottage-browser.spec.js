const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { readFileSync } = require("node:fs");
const path = require("node:path");

// Filter and compare on the cottages index (WorldEnterpriseGroup/mtcottages#79).
// The filters and the compare table read the same data as the cards: the homes
// in src/data/site.ts and the terms in src/data/terms.json. These tests read
// those files too, so a data change cannot leave the page behind.
const PAGE = "/cottages.html";
const root = path.join(__dirname, "../..");
const terms = JSON.parse(readFileSync(path.join(root, "src/data/terms.json"), "utf8"));
const siteTs = readFileSync(path.join(root, "src/data/site.ts"), "utf8");
// \r?\n: a CRLF checkout must still match (see terms.spec.js).
const homes = [...siteTs.matchAll(/^ {4}id: "([a-z-]+)",\r?\n {4}name: "([^"]+)",\r?\n {4}town: "([^"]+)",[\s\S]*?^ {4}bedrooms: "(\d) Bedrooms?",$/gm)]
  .map((m) => ({ id: m[1], name: m[2], town: m[3].split(",")[0], bedrooms: Number(m[4]) }));
const today = new Date().toISOString().slice(0, 10);
const availableNow = (id) => {
  const entry = terms.homes[id].availableFrom;
  return entry.status === "confirmed" && String(entry.value) <= today;
};

test.describe("cottages index: filter and compare (#79)", () => {
  test("the data the tests read matches the listed homes", () => {
    expect(homes.length).toBe(Object.keys(terms.homes).length);
    for (const home of homes) expect(terms.homes[home.id], home.id).toBeTruthy();
  });

  test("the compare table lists every home with the same terms as its card", async ({ page }) => {
    await page.goto(PAGE);
    const rows = page.locator(".cottage-compare tbody tr");
    await expect(rows).toHaveCount(homes.length);
    for (const home of homes) {
      const row = page.locator(`.cottage-compare tbody tr[data-cb-home="${home.id}"]`);
      const card = page.locator(`[data-card-terms="${home.id}"]`);
      await expect(row.locator("th a")).toHaveText(home.name);
      await expect(row.locator('[data-term="rate"]')).toHaveText((await card.locator('[data-term="rate"]').textContent()) ?? "");
      await expect(row.locator('[data-term="available"]')).toHaveText((await card.locator('[data-term="available"]').textContent()) ?? "");
      const pets = terms.homes[home.id].pets;
      await expect(row.locator('[data-term="pets"]')).toHaveText(pets.status === "confirm" ? "Confirm on inquiry" : String(pets.value));
    }
  });

  test("town and bedroom filters narrow the cards and the table together", async ({ page }) => {
    await page.goto(PAGE);
    const form = page.locator("[data-cb-form]");
    await expect(form).toBeVisible();
    await expect(page.locator("[data-cb-count]")).toHaveText(`Showing all ${homes.length} homes.`);

    const town = homes[0].town;
    const inTown = homes.filter((home) => home.town === town);
    await form.getByLabel(town, { exact: true }).check();
    await expect(page.locator("[data-cb-cards] .property-card:visible")).toHaveCount(inTown.length);
    await expect(page.locator(".cottage-compare tbody tr:visible")).toHaveCount(inTown.length);
    await expect(page.locator("[data-cb-count]")).toHaveText(`Showing ${inTown.length} of ${homes.length} homes.`);

    await form.getByLabel("Any town").check();
    const bedrooms = Math.max(...homes.map((home) => home.bedrooms));
    const roomy = homes.filter((home) => home.bedrooms === bedrooms);
    await form.getByLabel(`${bedrooms} bedrooms`, { exact: true }).check();
    await expect(page.locator("[data-cb-cards] .property-card:visible")).toHaveCount(roomy.length);
    for (const home of roomy) await expect(page.locator(`.cottage-compare tbody tr[data-cb-home="${home.id}"]`)).toBeVisible();

    await form.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator("[data-cb-cards] .property-card:visible")).toHaveCount(homes.length);
    await expect(page.locator("[data-cb-count]")).toHaveText(`Showing all ${homes.length} homes.`);
  });

  test("the move-in filter keeps only homes confirmed available now; pets follow the data", async ({ page }) => {
    await page.goto(PAGE);
    const form = page.locator("[data-cb-form]");
    const now = homes.filter((home) => availableNow(home.id));
    const nowBox = form.getByLabel("Available now (confirmed)");
    if (now.length === 0) {
      await expect(nowBox).toHaveCount(0);
    } else {
      await nowBox.check();
      await expect(page.locator("[data-cb-cards] .property-card:visible")).toHaveCount(now.length);
    }
    const policies = new Set(Object.values(terms.homes).map((entry) => (entry.pets.status === "confirm" ? "Confirm on inquiry" : String(entry.pets.value))));
    if (policies.size === 1) {
      await expect(page.locator("[data-cb-pets-note]")).toContainText([...policies][0]);
      await expect(form.locator('input[name="pets"]')).toHaveCount(0);
    } else {
      await expect(form.locator('input[name="pets"]')).toHaveCount(policies.size + 1);
    }
  });

  test("filters work from the keyboard alone", async ({ page }) => {
    await page.goto(PAGE);
    const anyTown = page.locator('[data-cb-form] input[name="town"][value=""]');
    await anyTown.focus();
    await page.keyboard.press("ArrowRight");
    const picked = await page.locator('[data-cb-form] input[name="town"]:checked').getAttribute("value");
    expect(picked).not.toBe("");
    const expected = homes.filter((home) => home.town.toLowerCase().replace(/[^a-z0-9]+/g, "-") === picked).length;
    await expect(page.locator("[data-cb-cards] .property-card:visible")).toHaveCount(expected);
  });

  test("has no axe violations, with filters on", async ({ page }) => {
    await page.goto(PAGE);
    await page.locator("[data-cb-form]").getByLabel(homes[0].town, { exact: true }).check();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  test("fits a 390px phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PAGE);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator("[data-cb-form]")).toBeVisible();
    await expect(page.locator(".cb-table-scroll")).toBeVisible();
  });

  test("without JavaScript every home shows and the inert form stays hidden", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.goto(PAGE);
      await expect(page.locator("[data-cb-form]")).toBeHidden();
      await expect(page.locator("[data-cb-cards] .property-card")).toHaveCount(homes.length);
      await expect(page.locator(".cottage-compare tbody tr")).toHaveCount(homes.length);
    } finally {
      await context.close();
    }
  });
});
