// Camden Clark landing page (#32): /travel-nurses/camden-clark/, the hospital-specific child of the
// travel-nurse hub (#29). Checks the search targeting, that every minute printed is the measured one
// from _data/distances.json, the accessible area chart and its table fallback, honest parking and night
// notes, the no-affiliation disclaimer, the prefilled inquiry (never submitted), related-page links in
// both directions, structured data and accessibility.
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { stubStayHost } = require("./support/stay-host");

const PAGE = "/travel-nurses/camden-clark/";
const HUB = "/travel-nurses/";
const STAY = "https://stay.mtcottages.com/";
const ORIGIN = "https://mtcottages.com";

const distances = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "_data", "distances.json"), "utf8"));
const measured = (origin, destination) => {
  const row = distances.rows.find((entry) => entry.origin === origin && entry.destination === destination);
  if (!row) throw new Error(`_data/distances.json has no ${origin} to ${destination} row`);
  return row;
};
// Nearest of the two Parkersburg homes with a published address, by the measured drive to the hospital.
const parkersburg = ["broad", "oak"];
const nearest = [...parkersburg].sort((a, b) => measured(a, "camden-clark").minutes - measured(b, "camden-clark").minutes)[0];
const NEAREST_HREF = `${STAY}?property=${nearest}&audience=healthcare&src=travel-nurses-camden-clark`;
const names = { broad: "Broad Cottage", oak: "Oak Cottage" };
// Places on the page that have a measured row, with the label the data gives them.
const places = ["camden-clark", "kroger-7th-parkersburg", "parkersburg-city-park", "downtown-parkersburg", "i77-parkersburg"];

const jsonLd = async (page) => {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((block) => {
    const parsed = JSON.parse(block);
    return Array.isArray(parsed) ? parsed : [parsed];
  });
};

test.describe("Camden Clark landing /travel-nurses/camden-clark/", () => {
  test("targets Camden Clark searches in the title, description, H1 and first paragraph, and is in the sitemap", async ({ page, request }) => {
    const response = await page.goto(PAGE);
    expect(response.ok()).toBeTruthy();
    const title = await page.title();
    expect(title.length, `title "${title}" is longer than 60 characters`).toBeLessThanOrEqual(60);
    expect(title).toMatch(/Camden Clark/);
    expect(title).toMatch(/Parkersburg/);
    expect(title).toMatch(/housing/i);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description.length).toBeGreaterThan(70);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toMatch(/Camden Clark/);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText(/Camden Clark/);
    await expect(page.locator("h1")).toContainText(/Parkersburg, WV/);
    const lede = (await page.locator('[data-testid="cc-lede"]').textContent()) ?? "";
    expect(lede).toMatch(/Camden Clark/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect([`${ORIGIN}${PAGE}`, `${ORIGIN}${PAGE}index.html`]).toContain(canonical);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap, "the page is in the sitemap under its canonical").toContain(`<loc>${canonical}</loc>`);
    const main = (await page.locator("main").textContent()) ?? "";
    expect(main).not.toMatch(/\b(luxury|world-class|paradise|best-in-class|hidden gem|only \d+ left)\b|!/i);
    expect(main).not.toMatch(/Georgia|Yellow|Walnut|lorem|coming soon|\bTBD\b/i);
  });

  test("prints the measured drive from Broad and Oak to the hospital, never a typed number", async ({ page }) => {
    await page.goto(PAGE);
    for (const id of parkersburg) {
      const row = measured(id, "camden-clark");
      const card = page.locator(`#drive [data-home="${id}"]`);
      await expect(card).toContainText(names[id]);
      await expect(card.locator('[data-testid="drive-minutes"]')).toHaveText(`${row.minutes} min`);
      await expect(card).toContainText(`${row.miles.toFixed(1)} mi`);
    }
    await expect(page.locator('[data-testid="drive-source"]')).toContainText(/OpenStreetMap/);
    await expect(page.locator('[data-testid="drive-source"]')).toContainText(/measured \d{1,2} \w{3} 20\d\d/);
    // The description and lede quote the same measured range.
    const minutes = parkersburg.map((id) => measured(id, "camden-clark").minutes);
    const range = Math.min(...minutes) === Math.max(...minutes) ? `${minutes[0]}` : `${Math.min(...minutes)} to ${Math.max(...minutes)}`;
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toContain(`${range} minutes`);
    expect(await page.locator('[data-testid="cc-lede"]').textContent()).toContain(`${range} minutes`);
    // Buck Cottage has no approved address, so no drive is printed for it.
    await expect(page.locator('#drive [data-home="buck"]')).toHaveCount(0);
  });

  test("the area chart has an accessible name and a drive-minute table with Broad and Oak that matches the data", async ({ page }) => {
    await page.goto(PAGE);
    const chart = page.locator('[data-testid="area-chart"] [role="img"]');
    await expect(chart).toHaveCount(1);
    const label = (await chart.getAttribute("aria-label")) ?? "";
    expect(label).toMatch(/^Bar chart/);
    const table = page.locator('[data-testid="drive-table"]');
    await expect(table.locator("caption")).toHaveCount(1);
    for (const id of parkersburg) await expect(table.locator(`thead th[data-home="${id}"]`)).toHaveText(names[id]);
    await expect(table.locator("tbody tr")).toHaveCount(places.length);
    for (const place of places) {
      const row = table.locator(`tbody tr[data-place="${place}"]`);
      for (const id of parkersburg) {
        const measuredRow = measured(id, place);
        await expect(row.locator(`td[data-home="${id}"]`)).toContainText(`${measuredRow.minutes} min`);
        await expect(row.locator(`td[data-home="${id}"]`)).toContainText(`${measuredRow.miles.toFixed(1)} mi`);
        expect(label, `chart label has ${id} to ${place}`).toContain(`${names[id]} ${measuredRow.minutes} minutes`);
      }
    }
    // Only places that have a measured row are listed: no invented gym, pharmacy or late-night food.
    const area = (await page.locator("#area").textContent()) ?? "";
    expect(area).not.toMatch(/Planet Fitness|Walmart|Walgreens|CVS|McDonald|Taco Bell|Waffle House|24-hour|24 hour/i);
    await expect(page.locator('[data-testid="area-gap"]')).toContainText(/have not measured/i);
    // No stock photography in the area section; only a chart and a table.
    await expect(page.locator("#area img")).toHaveCount(0);
  });

  test("states parking and night details only as far as the homes confirm, otherwise confirm on inquiry", async ({ page }) => {
    await page.goto(PAGE);
    const table = page.locator('[data-testid="shift-table"]');
    await expect(table.locator("tbody tr")).toHaveCount(2);
    for (const id of parkersburg) await expect(table.locator(`tbody tr[data-home="${id}"]`)).toContainText(names[id]);
    // Neither home has a confirmed parking fact, so each cell says so.
    const parkingColumn = (await table.locator("thead th").allTextContents()).indexOf("Parking");
    expect(parkingColumn).toBeGreaterThan(0);
    for (const id of parkersburg) {
      await expect(table.locator(`tbody tr[data-home="${id}"] td`).nth(parkingColumn - 1)).toContainText(/Confirm on inquiry/);
    }
    await expect(page.locator('[data-testid="night-confirm"]')).toContainText(/Parking space/);
    await expect(page.locator('[data-testid="night-confirm"]')).toContainText(/Blackout/i);
    const faq = (await page.locator("#faq").textContent()) ?? "";
    expect(faq).not.toMatch(/guaranteed parking|reserved parking|blackout shades (are|come)|soundproof|silent home/i);
  });

  test("the inquiry links pre-fill the healthcare audience and the nearest home, and never submit", async ({ page, context }) => {
    const methods = await stubStayHost(context, STAY);
    await page.goto(PAGE);
    const hero = page.locator('main [data-cta="hero"] a.button').first();
    await expect(hero).toHaveAttribute("href", NEAREST_HREF);
    await expect(page.locator('main [data-cta="next-step"]')).toHaveAttribute("href", NEAREST_HREF);
    const href = (await hero.getAttribute("href")) ?? "";
    const params = new URL(href).searchParams;
    expect(params.get("audience")).toBe("healthcare");
    expect(params.get("property")).toBe(nearest);
    // The other home's link pre-selects that home, with the same audience.
    const other = parkersburg.find((id) => id !== nearest);
    await expect(page.locator(`main [data-cta="home-${other}"]`)).toHaveAttribute("href", `${STAY}?property=${other}&audience=healthcare&src=travel-nurses-camden-clark`);
    // Header and footer links carry the audience and this page as their source.
    for (const link of await page.locator(`header a[href^="${STAY}"], footer a[href^="${STAY}"]`).evaluateAll((links) => links.map((entry) => entry.getAttribute("href")))) {
      expect(new URL(link).searchParams.get("audience")).toBe("healthcare");
      expect(new URL(link).searchParams.get("src")).toBe("travel-nurses-camden-clark");
    }
    await expect(page.locator("main form")).toHaveCount(0);
    await hero.click();
    await expect(page).toHaveURL(NEAREST_HREF);
    expect(methods.every((method) => method === "GET"), `stay requests were ${methods.join(", ")}`).toBe(true);
  });

  test("links to the hub, Broad, Oak and Parkersburg, and those pages exist", async ({ page, request }) => {
    await page.goto(PAGE);
    for (const href of [HUB, "/parkersburg/broad-cottage/", "/parkersburg/oak-cottage/", "/parkersburg/index.html"]) {
      expect(await page.locator(`main a[href="${href}"]`).count(), `${href} is linked`).toBeGreaterThanOrEqual(1);
      expect((await request.get(href)).status(), `${href} status`).toBe(200);
    }
    await expect(page.locator("#homes .tn-card")).toHaveCount(2);
    for (const id of parkersburg) await expect(page.locator(`#homes .tn-card[data-home="${id}"] img`)).toHaveAttribute("alt", /^(?=.*\w{3}).{10,}$/);
    const crumbs = page.locator("main nav.crumbs a");
    await expect(crumbs.nth(1)).toHaveAttribute("href", HUB);
  });

  test("is linked from the travel-nurse hub and the Parkersburg town page", async ({ request }) => {
    for (const source of [HUB, "/parkersburg/index.html"]) {
      const html = await (await request.get(source)).text();
      expect(html, `${source} should link to ${PAGE}`).toContain(`href="${PAGE}"`);
    }
  });

  test("answers questions in native disclosures that match the FAQPage schema, with matching breadcrumbs", async ({ page }) => {
    await page.goto(PAGE);
    const questions = page.locator("#faq details");
    const count = await questions.count();
    expect(count).toBeGreaterThanOrEqual(4);
    const visible = [];
    for (let index = 0; index < count; index += 1) {
      const item = questions.nth(index);
      visible.push({ q: ((await item.locator("summary").textContent()) ?? "").trim(), a: ((await item.locator("p").textContent()) ?? "").trim() });
    }
    const nodes = await jsonLd(page);
    expect(nodes.map((node) => node["@type"]).sort()).toEqual(["BreadcrumbList", "FAQPage", "LodgingBusiness"]);
    const faqPage = nodes.find((node) => node["@type"] === "FAQPage");
    expect(faqPage.mainEntity.map((entry) => ({ q: entry.name, a: entry.acceptedAnswer.text }))).toEqual(visible);
    expect(faqPage["@id"]).toBe(`${ORIGIN}${PAGE}#faq`);
    const crumbs = nodes.find((node) => node["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement.map((item) => item.name)).toEqual(["Home", "Travel nurses", "Camden Clark"]);
    expect(crumbs.itemListElement.at(-1).item).toBe(`${ORIGIN}${PAGE}`);
    expect(JSON.stringify(nodes)).not.toMatch(/aggregateRating|"review"|"offers"|priceRange/);
    const first = questions.first().locator("summary");
    await first.focus();
    await page.keyboard.press("Enter");
    await expect(questions.first()).toHaveAttribute("open", "");
  });

  test("says it is not affiliated with WVU Medicine or Camden Clark Medical Center", async ({ page }) => {
    await page.goto(PAGE);
    const disclaimer = page.locator('[data-testid="disclaimer"]');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText(/not affiliated with, endorsed by or sponsored by/i);
    await expect(disclaimer).toContainText("WVU Medicine");
    await expect(disclaimer).toContainText("Camden Clark Medical Center");
  });

  test("publishes only approved street addresses", async ({ page }) => {
    await page.goto(PAGE);
    const main = (await page.locator("main").textContent()) ?? "";
    expect(main).not.toMatch(/\b\d{2,5} [A-Z][a-z]+ (St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd)\b/);
  });

  test("has no axe violations (WCAG 2.2 AA) with every answer open", async ({ page }) => {
    await page.goto(PAGE);
    await page.locator("#faq details").evaluateAll((items) => items.forEach((item) => item.setAttribute("open", "")));
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  test("fits a 390px phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PAGE);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator('[data-testid="area-chart"] .tn-bar').first()).toBeVisible();
  });
});
