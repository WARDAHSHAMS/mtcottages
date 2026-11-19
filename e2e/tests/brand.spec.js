// Brand option A, "River & Brick" (#59, chosen on #27): the tokens, the self-hosted fonts and the
// heading face are what visitors actually get. The source of truth for the values is
// docs/marketing/brand-options/options.json.
const { test, expect } = require("@playwright/test");
const options = require("../../docs/marketing/brand-options/options.json");

const option = options.options.find((candidate) => candidate.id === "a");
const PAGES = ["/", "/marietta/index.html"];

for (const path of PAGES) {
  test.describe(`${path}`, () => {
    test("the root tokens are option A's", async ({ page }) => {
      await page.goto(path);
      const tokens = await page.evaluate((names) => {
        const style = getComputedStyle(document.documentElement);
        return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(`--${name}`).trim()]));
      }, Object.keys(option.tokens));
      expect(tokens).toEqual(option.tokens);
      // The three the brand decision calls out by name.
      expect(tokens.canvas).toBe("#f4efe6");
      expect(tokens.forest).toBe("#1d4b68");
      expect(tokens["accent-ink"]).toBe("#9e3b26");
    });

    test("headings use Source Serif 4 and body copy Source Sans 3, loaded from this site", async ({ page }) => {
      const fontRequests = [];
      page.on("response", (response) => {
        if (response.request().resourceType() === "font") fontRequests.push(response.url());
      });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const faces = await page.evaluate(() => ({
        h1: getComputedStyle(document.querySelector("h1")).fontFamily,
        h1Weight: getComputedStyle(document.querySelector("h1")).fontWeight,
        body: getComputedStyle(document.body).fontFamily,
        display600: document.fonts.check('600 16px "Source Serif 4"'),
        body400: document.fonts.check('400 16px "Source Sans 3"'),
      }));
      expect(faces.h1.startsWith('"Source Serif 4"')).toBe(true);
      expect(faces.h1Weight).toBe("600");
      expect(faces.body.startsWith('"Source Sans 3"')).toBe(true);
      expect(faces.display600).toBe(true);
      expect(faces.body400).toBe(true);
      // Self-hosted: every font file comes from the page's own origin, latin woff2 only.
      expect(fontRequests.length).toBeGreaterThan(0);
      const origin = new URL(page.url()).origin;
      for (const url of fontRequests) {
        expect(url.startsWith(`${origin}/fonts/`), `${url} is served by the site`).toBe(true);
        expect(url).toMatch(/-latin-\d+-normal\.woff2$/);
      }
    });

    test("fonts are preloaded at most twice and buttons carry the crisp radius", async ({ page }) => {
      await page.goto(path);
      const preloads = await page.locator('link[rel="preload"][as="font"]').count();
      expect(preloads).toBeGreaterThan(0);
      expect(preloads).toBeLessThanOrEqual(2);
      const radius = await page.locator(".header-cta").first().evaluate((element) => getComputedStyle(element).borderTopLeftRadius);
      const expected = await page.evaluate((value) => {
        const probe = document.createElement("div");
        probe.style.width = value;
        document.body.append(probe);
        const px = getComputedStyle(probe).width;
        probe.remove();
        return px;
      }, option.shape.buttonRadius);
      expect(radius).toBe(expected);
    });
  });
}
