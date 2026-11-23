// "How to book safely" (#62). Covers the page's search targeting, that it names the only booking
// channels, what Mt Cottages never asks for, how to check a listing and how to report a scam, its links
// to every home and the hubs, axe, and the links into it from the footer, the inquiry panels and the stay
// form. The stay form is read from the checked-in infra/azure/apply-proxy/index.html; nothing is sent.
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const PAGE = "/book-safely/";
const ORIGIN = "https://mtcottages.com";
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const homes = [
  ["Frederick Cottage", "/marietta/frederick/", "Marietta, Ohio"],
  ["Broad Cottage", "/parkersburg/broad-cottage/", "Parkersburg, WV"],
  ["Buck Cottage", "/parkersburg/buck-cottage/", "Parkersburg, WV"],
  ["Oak Cottage", "/parkersburg/oak-cottage/", "Parkersburg, WV"],
  ["Virginia Cottage", "/ravenswood/virginia-cottage/", "Ravenswood, WV"],
  ["Henrietta Cottage", "/ravenswood/henrietta-cottage/", "Ravenswood, WV"],
];

const formHtml = fs.readFileSync(path.join(__dirname, "..", "..", "infra", "azure", "apply-proxy", "index.html"), "utf8");

test.describe("how to book safely", () => {
  test("targets search and is listed under its canonical", async ({ page, request }) => {
    const response = await page.goto(PAGE);
    expect(response?.status()).toBe(200);
    const title = await page.title();
    expect(title).toBe("How to book safely | Mt Cottages");
    expect(title.length).toBeLessThanOrEqual(60);
    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(160);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect([`${ORIGIN}${PAGE}`, `${ORIGIN}${PAGE}index.html`]).toContain(canonical);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap, "the page is in the sitemap under its canonical").toContain(`<loc>${canonical}</loc>`);
  });

  test("names the channels, what we never ask for, how to verify and how to report", async ({ page }) => {
    await page.goto(PAGE);
    const headings = await page.locator("main .prose h2").allTextContents();
    expect(headings).toEqual([
      "The only ways to book with us",
      "What we never ask for",
      "How to check a listing is really ours",
      "If you think you have found a scam",
      "Ready to ask about a home?",
    ]);
    const channels = page.locator("#channels");
    await expect(channels).toContainText("stay.mtcottages.com");
    await expect(channels).toContainText("Furnished Finder and KeyCheck");
    await expect(channels).toContainText("we hold no booking before payment");
    const never = page.locator("#never li");
    for (const item of [/gift card/, /wire transfer/, /personal bank account/, /Social Security number/]) await expect(never.filter({ hasText: item })).toHaveCount(1);
    await expect(page.locator("#verify")).toContainText("Broad St Bungalow by Mt Cottages");
    await expect(page.locator('#report a[href="https://reportfraud.ftc.gov/"]')).toHaveCount(1);
    await expect(page.locator('#report a[href="https://www.ic3.gov/"]')).toHaveCount(1);
    expect(await page.locator('main a[href="mailto:stay@mtcottages.com"]').count()).toBeGreaterThanOrEqual(3);
    // No phone number is published for Mt Cottages, so the page must not invent one.
    const text = (await page.locator("main").textContent()) ?? "";
    expect(text.match(/\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/g) ?? [], "phone numbers").toEqual([]);
    await expect(page.locator('main a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('#ready a[href^="https://stay.mtcottages.com/"]')).toHaveCount(1);
  });

  test("links to every home, the four published addresses and both work-stay hubs", async ({ page }) => {
    await page.goto(PAGE);
    for (const [name, href, place] of homes) {
      const item = page.locator("#verify [data-homes] li").filter({ has: page.locator(`a[href="${href}"]`) });
      await expect(item, name).toHaveText(`${name}, ${place}`);
    }
    const addressLinks = await page.locator("#verify li").filter({ hasText: "Look up the address" }).locator("a").allTextContents();
    expect(addressLinks.sort()).toEqual(["Broad Cottage", "Frederick Cottage", "Henrietta Cottage", "Oak Cottage"]);
    await expect(page.locator('[data-related] a[href="/travel-nurses/"]')).toHaveCount(1);
    await expect(page.locator('[data-related] a[href="/corporate-housing/"]')).toHaveCount(1);
    const text = (await page.locator("main").textContent()) ?? "";
    expect(text.match(/Marietta(?!,? (Ohio|OH))/g) ?? [], "bare Marietta").toEqual([]);
  });

  test("is linked from the footer of every page type", async ({ page }) => {
    for (const pathname of ["/", "/faq.html", "/marietta/frederick/", "/corporate-housing/", "/parkersburg/index.html"]) {
      await page.goto(pathname);
      await expect(page.locator(`footer a[href="${PAGE}"]`), pathname).toHaveText("Book safely");
    }
  });

  test("is linked from the inquiry step of the hubs and town pages", async ({ page }) => {
    for (const pathname of ["/travel-nurses/", "/corporate-housing/", "/parkersburg/index.html", "/marietta/index.html"]) {
      await page.goto(pathname);
      await expect(page.locator(`[data-book-safely] a[href="${PAGE}"]`), pathname).toHaveCount(1);
    }
  });

  test("is linked from the stay form", () => {
    expect(formHtml).toContain(`<a href="${ORIGIN}${PAGE}">how to book safely</a>`);
  });

  test("has no axe violations", async ({ page }) => {
    await page.goto(PAGE);
    const results = await new AxeBuilder({ page }).withTags([...WCAG, "best-practice"]).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});
