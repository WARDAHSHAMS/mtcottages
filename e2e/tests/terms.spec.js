const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { readFileSync } = require("node:fs");
const path = require("node:path");

// Rates & terms (WorldEnterpriseGroup/mtcottages#72). Every figure on the
// microsite block, the cottage cards and the Offer structured data is checked
// against src/data/terms.json, so changing one field there must change all
// three. An unconfirmed value never reaches a page.
const root = path.join(__dirname, "../..");
const terms = JSON.parse(readFileSync(path.join(root, "src/data/terms.json"), "utf8"));
const siteTs = readFileSync(path.join(root, "src/data/site.ts"), "utf8");
const guideRates = Object.fromEntries([...siteTs.matchAll(/^\s+"(\d Bedrooms?)": "(\$[\d,]+\/month)",$/gm)].map((m) => [m[1], m[2]]));
const bedroomsById = Object.fromEntries([...siteTs.matchAll(/^ {4}id: "([a-z-]+)",\n[\s\S]*?^ {4}bedrooms: "(\d Bedrooms?)",$/gm)].map((m) => [m[1], m[2]]));

const homes = [
  { id: "frederick", base: "/marietta/frederick/" },
  { id: "broad", base: "/parkersburg/broad-cottage/" },
  { id: "buck", base: "/parkersburg/buck-cottage/" },
  { id: "oak", base: "/parkersburg/oak-cottage/" },
  { id: "virginia", base: "/ravenswood/virginia-cottage/" },
  { id: "henrietta", base: "/ravenswood/henrietta-cottage/" },
];
const fields = ["monthlyRate", "deposit", "minimumStay", "utilities", "pets", "availableFrom"];
const labels = { monthlyRate: "Monthly rate", deposit: "Security deposit", minimumStay: "Minimum stay", utilities: "Utilities", pets: "Pets", availableFrom: "Available from" };
const badge = { confirmed: "Confirmed", listed: "Listed", guide: "Listed", confirm: "Confirm on inquiry" };
// Unconfirmed figures from _data/houses.json and notes/owner-decisions.md rows 1 and 2.
const unconfirmedFigures = ["$1,045", "$1,375", "$895", "$1,395", "$75 "];

const today = new Date().toISOString().slice(0, 10);
const money = (n) => `$${n.toLocaleString("en-US")}`;
const longDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const guideFor = (id) => {
  const rate = guideRates[bedroomsById[id]];
  if (!rate) throw new Error(`no published guide found for ${id}`);
  return rate;
};

/** What the block shows for one field, or null for "Ask us". */
function expectedValue(id, field) {
  const entry = terms.homes[id][field];
  if (entry.status === "confirm") return null;
  if (entry.status === "guide") return `${guideFor(id)} guide`;
  if (field === "monthlyRate") return `${money(entry.value)}/month`;
  if (field === "deposit") return money(entry.value);
  if (field === "availableFrom") return entry.value <= today ? "Available now" : longDate(entry.value);
  return entry.value;
}

function expectedCard(id) {
  const t = terms.homes[id];
  const rate = t.monthlyRate.status === "guide" ? `${guideFor(id)} guide` : t.monthlyRate.status === "confirm" ? "Rate on inquiry" : `${money(t.monthlyRate.value)}/month`;
  const available = t.availableFrom.status === "confirm" ? "Dates on inquiry" : t.availableFrom.value <= today ? "Available now" : `Available ${longDate(t.availableFrom.value)}`;
  const minimumStay = t.minimumStay.status === "confirm" ? null : `${t.minimumStay.value} minimum`;
  return { rate, available, minimumStay };
}

const reveal = async (page) => {
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible")));
  await page.waitForTimeout(100);
};

test("the data file and this test cover the same microsites, and the guide rates were found", () => {
  for (const home of homes) expect(terms.homes[home.id], home.id).toBeTruthy();
  expect(Object.keys(guideRates).sort()).toEqual(["1 Bedroom", "2 Bedrooms", "3 Bedrooms"]);
  for (const id of Object.keys(terms.homes)) expect(bedroomsById[id], id).toBeTruthy();
});

for (const home of homes) {
  test.describe(`${home.id} rates and terms`, () => {
    test("the block shows each term from the data file, and only confirmed or published figures", async ({ page }) => {
      await page.goto(home.base);
      await reveal(page);
      const block = page.locator(`[data-terms-block="${home.id}"]`);
      await expect(block.locator("h3")).toHaveText("Rates & terms");
      await expect(block.locator(".hm-term")).toHaveCount(fields.length);
      for (const [index, field] of fields.entries()) {
        const entry = terms.homes[home.id][field];
        const row = block.locator(".hm-term").nth(index);
        await expect(row).toHaveAttribute("data-term", field);
        await expect(row.locator("dt")).toHaveText(labels[field]);
        await expect(row.locator(".hm-badge")).toHaveText(badge[entry.status]);
        const value = expectedValue(home.id, field);
        if (value === null) {
          await expect(row.locator(".hm-term-open")).toHaveText("Ask us");
          await expect(row.locator(".hm-term-value")).toHaveCount(0);
          expect(await row.innerText(), `${field} shows no figure`).not.toMatch(/\d/);
        } else {
          await expect(row.locator(".hm-term-value")).toHaveText(value);
        }
      }
      const open = fields.filter((field) => terms.homes[home.id][field].status === "confirm").length;
      if (open > 0) await expect(block.locator(".hm-terms-head p")).toContainText(open === 1 ? "One term is still to confirm" : `${open} terms are still to confirm`);
      await expect(block.locator(".hm-terms-cta a")).toHaveAttribute("href", new RegExp(`property=${home.id}`));
    });

    test("terms appear once: not repeated in the key facts", async ({ page }) => {
      await page.goto(home.base);
      const factLabels = await page.locator(".hm-facts dt").allInnerTexts();
      for (const label of factLabels) expect(label).not.toMatch(/^(monthly (guide|rate)|security deposit|deposit|minimum stay|utilities|pets|availability|available from)$/i);
    });

    test("no unconfirmed deposit, fee or per-home price figure is on the page", async ({ page }) => {
      await page.goto(home.base);
      const text = await page.locator("body").innerText();
      for (const figure of unconfirmedFigures) expect(text, figure).not.toContain(figure);
    });

    test("an Offer is published only for an owner-confirmed rate, and matches it", async ({ page }) => {
      await page.goto(home.base);
      const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((text) => {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [parsed];
      });
      const offers = schemas.filter((item) => item["@type"] === "Offer");
      const rate = terms.homes[home.id].monthlyRate;
      if (rate.status !== "confirmed") {
        expect(offers).toEqual([]);
      } else {
        expect(offers).toHaveLength(1);
        expect(offers[0].price).toBe(rate.value);
        expect(offers[0].priceCurrency).toBe("USD");
        expect(offers[0].priceSpecification.unitCode).toBe("MON");
      }
    });

    test("the block passes axe (WCAG 2.2 AA) and fits a 390px phone", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(home.base);
      await reveal(page);
      const block = page.locator(`[data-terms-block="${home.id}"]`);
      await block.scrollIntoViewIfNeeded();
      const overflow = await block.evaluate((element) => element.scrollWidth - element.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const results = await new AxeBuilder({ page }).include(`[data-terms-block="${home.id}"]`).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  });
}

// The home page (#21) routes by town with house tiles rather than cottage cards, and
// quotes the per-bedroom guide. Every monthly figure it prints must still come from
// the same data: a published guide or a home's confirmed rate, never an unconfirmed one.
test("every monthly figure on the home page is a published guide or a confirmed rate", async ({ page }) => {
  await page.goto("/index.html");
  const text = await page.locator("body").innerText();
  const allowed = new Set(Object.values(guideRates));
  for (const entry of Object.values(terms.homes)) {
    if (["confirmed", "listed"].includes(entry.monthlyRate.status)) allowed.add(`${money(entry.monthlyRate.value)}/month`);
  }
  const quoted = [...text.matchAll(/\$[\d,]+\/month/g)].map((match) => match[0]);
  expect(quoted.length).toBeGreaterThan(0);
  for (const figure of quoted) expect(allowed, figure).toContain(figure);
  for (const figure of unconfirmedFigures) expect(text, figure).not.toContain(figure);
});

for (const listing of ["/cottages.html", "/cozy-places.html", "/room-to-settle.html"]) {
  test(`cottage cards on ${listing} show the same rate, move-in and minimum stay as the data file`, async ({ page }) => {
    await page.goto(listing);
    const cards = page.locator("[data-card-terms]");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const id = await card.getAttribute("data-card-terms");
      const expected = expectedCard(id);
      await expect(card.locator('[data-term="rate"]')).toHaveText(expected.rate);
      await expect(card.locator('[data-term="available"]')).toHaveText(expected.available);
      if (expected.minimumStay) await expect(card.locator('[data-term="minimum-stay"]')).toHaveText(expected.minimumStay);
      else await expect(card.locator('[data-term="minimum-stay"]')).toHaveCount(0);
    }
    const text = await page.locator("body").innerText();
    for (const figure of unconfirmedFigures) expect(text, figure).not.toContain(figure);
  });
}
