const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { readFileSync } = require("node:fs");
const path = require("node:path");

// The drive-time chart and table on every microsite's location page
// (WorldEnterpriseGroup/mtcottages#25). Every figure must match the measured
// data file; homes without an approved street address are measured from the
// town centre and must say so.
const distances = JSON.parse(readFileSync(path.join(__dirname, "../../_data/distances.json"), "utf8"));
const homes = [
  { id: "frederick", base: "/marietta/frederick/", street: true },
  { id: "broad", base: "/parkersburg/broad-cottage/", street: true },
  { id: "buck", base: "/parkersburg/buck-cottage/", street: false },
  { id: "oak", base: "/parkersburg/oak-cottage/", street: true },
  { id: "virginia", base: "/ravenswood/virginia-cottage/", street: false },
  { id: "henrietta", base: "/ravenswood/henrietta-cottage/", street: true },
];
const settle = async (page) => {
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible")));
  await page.waitForTimeout(100);
};

test("every microsite in the data file is covered here", () => {
  expect(Object.keys(distances.microsites).sort()).toEqual(homes.map((home) => home.id).sort());
});

for (const home of homes) {
  const originId = distances.microsites[home.id];
  const origin = distances.origins[originId];
  const rows = distances.rows.filter((row) => row.origin === originId);

  test.describe(`${home.id} drive times`, () => {
    test("the table matches the measured data, with a source and date on every row", async ({ page }) => {
      await page.goto(`${home.base}location.html`);
      const section = page.locator("[data-distance-table]");
      await expect(section).toHaveAttribute("data-origin-kind", home.street ? "address" : "town-centre");
      await expect(section.locator("h2")).toHaveText("Minutes, not miles.");
      const tableRows = section.locator("tr[data-row]");
      await expect(tableRows).toHaveCount(rows.length);
      for (const row of rows) {
        const line = section.locator(`tr[data-row="${row.id}"]`);
        await expect(line.locator("th")).toContainText(distances.destinations[row.destination].name);
        await expect(line.locator("td").nth(0)).toHaveText(`about ${row.minutes} min`);
        await expect(line.locator("td").nth(1)).toHaveText(`${row.miles} mi`);
        await expect(line.locator("time")).toHaveAttribute("datetime", row.measured);
        await expect(line.locator("a")).toHaveAttribute("href", distances.sources[row.source]);
        await expect(line).toHaveAttribute("data-stale", "false");
      }
      await expect(section.locator(".dt-method a[href='https://www.openstreetmap.org/copyright']")).toHaveCount(1);
    });

    test("the chart draws one bar per row, scaled to the longest drive, with a text alternative", async ({ page }) => {
      await page.goto(`${home.base}location.html`);
      const svg = page.locator("[data-distance-table] svg[data-chart]");
      await expect(svg).toHaveAttribute("role", "img");
      await expect(svg.locator("title")).toContainText("drive times from");
      await expect(svg.locator("desc")).toContainText("Every figure, with its source and date, is in the table");
      const bars = svg.locator("g[data-chart-row]");
      await expect(bars).toHaveCount(rows.length);
      const max = Math.max(...rows.map((row) => row.minutes));
      for (const row of rows) {
        const bar = svg.locator(`g[data-chart-row="${row.destination}"]`);
        await expect(bar.locator(".dt-value")).toHaveText(`${row.minutes} min`);
        await expect(bar.locator(".dt-label")).toHaveText(distances.destinations[row.destination].label);
        const width = Number.parseFloat(await bar.locator("rect.dt-bar").getAttribute("width"));
        expect(width).toBeCloseTo(Math.max(2, (row.minutes / max) * 100), 0);
      }
    });

    test("the origin is said plainly: the front door, or the town centre", async ({ page }) => {
      await page.goto(`${home.base}location.html`);
      const section = page.locator("[data-distance-table]");
      if (home.street) {
        expect(origin.kind).toBe("address");
        await expect(section).toContainText("from the front door");
        await expect(section).not.toContainText("town centre");
      } else {
        expect(origin.kind).toBe("town-centre");
        await expect(section).toContainText("town centre, not from the home");
        await expect(section).toContainText("confirm on inquiry");
      }
      // No map, pin or coordinates in the component itself.
      await expect(section.locator("iframe, img, [data-map-root]")).toHaveCount(0);
    });

    for (const scheme of ["light", "dark"]) {
      test(`readable at 390px in ${scheme} mode, labels clear of values, and axe-clean`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${home.base}location.html`);
        await settle(page);
        const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
        expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
        const svg = page.locator("[data-distance-table] svg[data-chart]");
        const svgBox = await svg.boundingBox();
        for (const row of await svg.locator("g[data-chart-row]").all()) {
          const label = await row.locator(".dt-label").boundingBox();
          const value = await row.locator(".dt-value").boundingBox();
          expect(label.x).toBeGreaterThanOrEqual(svgBox.x - 1);
          expect(label.x + label.width, "label runs into its value").toBeLessThan(value.x - 4);
          expect(value.x + value.width).toBeLessThanOrEqual(svgBox.x + svgBox.width + 1);
        }
        const surface = await page.locator("[data-distance-table] .dt").evaluate((element) => getComputedStyle(element).backgroundColor);
        if (scheme === "dark") expect(surface).toBe("rgb(27, 32, 26)");
        else expect(surface).toBe("rgb(255, 255, 255)");
        const results = await new AxeBuilder({ page }).include("[data-distance-table]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
        expect(results.violations, results.violations.map((item) => `${item.id}: ${item.nodes.map((node) => node.target).join(" ")}`).join("\n")).toEqual([]);
      });
    }
  });
}

test("Henrietta shows Jackson General in Ripley at its measured time", async ({ page }) => {
  await page.goto("/ravenswood/henrietta-cottage/location.html");
  const line = page.locator('tr[data-row="henrietta:jackson-general"]');
  await expect(line.locator("td").first()).toHaveText("about 16 min");
  await expect(page.locator('g[data-chart-row="jackson-general"] .dt-label')).toHaveText("Jackson General, Ripley");
});
