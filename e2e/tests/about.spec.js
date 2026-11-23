const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

// "Who we are" (#38). The page is built from the site's own data: every home
// in its town, the shared terms, and the one contact path. No person is named
// until they agree to it (decision on #70), and /about.html redirects here.
const ABOUT = "/about/";
const HOMES = [
  ["Frederick Cottage", "/marietta/frederick/"],
  ["Broad Cottage", "/parkersburg/broad-cottage/"],
  ["Buck Cottage", "/parkersburg/buck-cottage/"],
  ["Oak Cottage", "/parkersburg/oak-cottage/"],
  ["Virginia Cottage", "/ravenswood/virginia-cottage/"],
  ["Henrietta Cottage", "/ravenswood/henrietta-cottage/"],
];

test("the about page lists every home by town and the real contact path", async ({ page }) => {
  await page.goto(ABOUT);
  await expect(page).toHaveTitle("About Mt Cottages: furnished homes, month to month");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who we are");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://mtcottages.com${ABOUT}`);
  await expect(page.locator("[data-about-summary]")).toContainText("six furnished homes in Marietta, Ohio, Parkersburg, WV and Ravenswood, WV");
  const towns = page.locator("[data-about-towns]");
  for (const [name, href] of HOMES) {
    await expect(towns.getByRole("link", { name })).toHaveAttribute("href", href);
  }
  await expect(page.locator("#how-we-host")).toContainText("stays start at 30 nights");
  await expect(page.locator("#people")).toContainText("only when they have agreed to it");
  await expect(page.locator('#contact a[href="mailto:stay@mtcottages.com"]')).toBeVisible();
});

test("/about.html redirects to /about/, which the header and sitemap link", async ({ page, request }) => {
  const stub = await request.get("/about.html");
  const markup = await stub.text();
  expect(markup).toContain('<meta name="robots" content="noindex">');
  expect(markup).toContain(`<link rel="canonical" href="https://mtcottages.com${ABOUT}">`);
  await page.goto("/");
  await expect(page.locator(`header a[href="${ABOUT}"]`).first()).toBeAttached();
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`https://mtcottages.com${ABOUT}`);
  expect(sitemap).not.toContain("https://mtcottages.com/about.html");
});

test("the about page has no WCAG A/AA violations", async ({ page }) => {
  await page.goto(ABOUT);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
