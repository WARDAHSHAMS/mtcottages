const { test, expect } = require("@playwright/test");
const terms = require("../../src/data/terms.json");
const AxeBuilder = require("@axe-core/playwright").default;

// The data-driven home microsites share one template; every check loops over them.
// Homes with an owner-approved street address publish it; the rest are
// town-level only (`street: null`): no house number, pin, postcode or geo point.
const homes = [
  { id: "frederick", name: "Frederick Cottage", base: "/marietta/frederick/", street: "125 Frederick St", address: "125 Frederick St, Marietta, OH 45750", concepts: true, guide: true },
  { id: "henrietta", name: "Henrietta Cottage", base: "/ravenswood/henrietta-cottage/", street: "200 Henrietta St", address: "200 Henrietta St, Ravenswood, WV 26164", concepts: true },
  { id: "oak", name: "Oak Cottage", base: "/parkersburg/oak-cottage/", street: "2712 Broad St", address: "2712 Broad St, Parkersburg, WV 26101", concepts: true },
  { id: "broad", name: "Broad Cottage", base: "/parkersburg/broad-cottage/", street: "3113 Broad St", address: "3113 Broad St, Parkersburg, WV 26104", concepts: true },
  { id: "buck", name: "Buck Cottage", base: "/parkersburg/buck-cottage/", street: null, address: "Parkersburg, WV", concepts: false },
  { id: "virginia", name: "Virginia Cottage", base: "/ravenswood/virginia-cottage/", street: null, address: "Ravenswood, WV", concepts: false },
];
const familySize = homes.length;
const approvedStreets = ["200 Henrietta St", "2712 Broad St", "3113 Broad St", "125 Frederick St"];
const pageNames = ["tour", "plan", "amenities", "location"];
// Homes with a resident guide also get guide.html.
const pagesOf = (home) => [home.base, ...[...pageNames, ...(home.guide ? ["guide"] : [])].map((name) => `${home.base}${name}.html`)];
const settle = async (page) => {
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible")));
  await page.waitForTimeout(100);
};

for (const home of homes) {
  test.describe(home.name, () => {
    test("every page returns 200 and shows the shared shell", async ({ page, request }) => {
      for (const path of pagesOf(home)) {
        const response = await request.get(path);
        expect(response.status(), `${path} status`).toBe(200);
        await page.goto(path);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator(`nav[aria-label="${home.name} sections"]`), `${path} sub-navigation`).toHaveCount(1);
        await expect(page.locator(".hm-family"), `${path} family switcher`).toHaveCount(1);
        await expect(page.locator(".hm-family-card")).toHaveCount(familySize);
        await expect(page.locator(`.hm-family-card[aria-current="page"]`)).toContainText(home.name);
        await expect(page.locator(".hm-inquiry"), `${path} inquiry panel`).toHaveCount(1);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://mtcottages.com${path}`);
      }
    });

    test("the location is visible and the directions link is correct", async ({ page }) => {
      await page.goto(home.base);
      await expect(page.locator(".hm-chip")).toContainText(home.address);
      if (!home.street) await expect(page.locator(".hm-chip")).toContainText("street address on inquiry");
      await page.goto(`${home.base}location.html`);
      const card = page.locator("[data-address-card]");
      await expect(card.locator("address")).toBeVisible();
      // A street address renders on two lines (<br>); read it as the guest sees it.
      expect((await card.locator("address").innerText()).trim().replace(/\s*\n\s*/g, ", ")).toBe(home.address);
      await expect(card.locator("[data-directions]")).toHaveAttribute("href", `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(home.address)}`);
      await expect(card.locator('a[href^="https://maps.apple.com/"]')).toHaveCount(1);
      if (home.street) {
        await expect(card).toContainText(home.street);
        await expect(card.locator("[data-copy-address]")).toBeVisible();
      } else {
        await expect(card.locator("[data-private-address]")).toContainText("street address is shared once you inquire");
        await expect(card.locator("[data-copy-address]")).toHaveCount(0);
      }
      const from = page.locator(".hm-links a");
      expect(await from.count()).toBeGreaterThanOrEqual(1);
      for (const link of await from.all()) {
        const href = await link.getAttribute("href");
        expect(href).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=.+&destination=/);
        expect(href).toContain(`destination=${encodeURIComponent(home.address)}`);
      }
      const nearby = page.locator(".hm-nearby-group a:not(.hm-walk)");
      expect(await nearby.count()).toBeGreaterThanOrEqual(1);
      for (const link of await nearby.all()) {
        await expect(link).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
      }
      // Walking directions start from the house, so only approved street homes have them.
      const walks = page.locator(".hm-nearby-group a.hm-walk");
      if (home.street) {
        await expect(walks).toHaveCount(await nearby.count());
        for (const link of await walks.all()) {
          const href = await link.getAttribute("href");
          expect(href).toContain(`origin=${encodeURIComponent(home.address)}`);
          expect(href).toContain("travelmode=walking");
        }
      } else {
        await expect(walks).toHaveCount(0);
      }
    });

    test("the map is not a third-party frame until it is asked for", async ({ page }) => {
      await page.goto(`${home.base}location.html`);
      await expect(page.locator("iframe")).toHaveCount(0);
      await page.locator("[data-map-load]").click();
      const frame = page.locator("iframe.hm-map-frame");
      await expect(frame).toHaveAttribute("src", /^https:\/\/www\.openstreetmap\.org\/export\/embed\.html/);
      await expect(frame).toHaveAttribute("title", /Map of/);
      // A town-level home's map never drops a pin.
      if (!home.street) await expect(frame).not.toHaveAttribute("src", /marker=/);
    });

    test("the copy-address button reports the result", async ({ page, context }) => {
      test.skip(!home.street, "town-level homes publish no street address to copy");
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto(`${home.base}location.html`);
      await page.locator("[data-copy-address]").click();
      await expect(page.locator("[data-copy-status]")).toHaveText(/Address copied|Copy this address/);
    });

    test("the inquiry link carries the property", async ({ page }) => {
      for (const path of pagesOf(home)) {
        await page.goto(path);
        const links = page.locator(`a[href^="https://stay.mtcottages.com/?property=${home.id}&"]`);
        expect(await links.count(), `${path} inquiry links`).toBeGreaterThanOrEqual(2);
        await expect(page.locator('a[href*="/apply.html"]')).toHaveCount(0);
      }
    });

    test("facts carry a status and unconfirmed ones say so", async ({ page }) => {
      await page.goto(home.base);
      const facts = page.locator(".hm-fact");
      expect(await facts.count()).toBeGreaterThanOrEqual(3);
      for (const fact of await facts.all()) {
        await expect(fact.locator(".hm-badge")).toHaveText(/^(Confirmed|Listed|In photos|Confirm on inquiry)$/);
      }
      for (const fact of await page.locator(".hm-fact--confirm").all()) {
        await expect(fact.locator(".hm-badge")).toHaveText("Confirm on inquiry");
      }
      await expect(page.locator(".hm-highlight")).not.toHaveCount(0);
      await expect(page.locator(".room-card")).not.toHaveCount(0);
    });

    test("the structured data matches the published address level and offers a price only once it is confirmed", async ({ page }) => {
      await page.goto(home.base);
      const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
      const stay = schemas.find((item) => item["@type"] === "Accommodation");
      if (home.street) {
        expect(stay.address).toMatchObject({ "@type": "PostalAddress", streetAddress: home.street, addressCountry: "US" });
        expect(stay.address.postalCode).toMatch(/^(26|45)\d{3}$/);
        expect(stay.geo.latitude).toBeGreaterThan(38);
        expect(stay.geo.longitude).toBeLessThan(-81);
      } else {
        const [locality, region] = home.address.split(", ");
        expect(stay.address).toMatchObject({ "@type": "PostalAddress", addressLocality: locality, addressRegion: region, addressCountry: "US" });
        expect(stay.address.streetAddress).toBeUndefined();
        expect(stay.address.postalCode).toBeUndefined();
        expect(stay.geo).toBeUndefined();
      }
      // An Offer exists only for a confirmed monthly rate (#72); terms.spec.js checks its figures.
      const offer = schemas.find((item) => item["@type"] === "Offer");
      if (terms.homes[home.id].monthlyRate.status === "confirmed") expect(offer).toBeDefined();
      else expect(offer).toBeUndefined();
      // The one BreadcrumbList mirrors the visible trail: Home / Locations / Town, State / Home name (/ Page) (#35).
      const crumbs = schemas.find((item) => item["@type"] === "BreadcrumbList");
      const townSlug = home.base.split("/")[1];
      expect(crumbs.itemListElement.map((item) => item.name)).toEqual(["Home", "Locations", expect.stringMatching(new RegExp(`^${townSlug}, `, "i")), home.name]);
      expect(crumbs.itemListElement.at(-1).item).toBe(`https://mtcottages.com${home.base}`);
      await page.goto(`${home.base}tour.html`);
      const tourSchemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
      const tourCrumbs = tourSchemas.find((item) => item["@type"] === "BreadcrumbList");
      expect(tourCrumbs.itemListElement.at(-1)).toMatchObject({ position: 5, name: "Tour", item: `https://mtcottages.com${home.base}tour.html` });
    });

    test("the plan page has an SVG per floor and the concept labels", async ({ page }) => {
      await page.goto(`${home.base}plan.html`);
      const plans = page.locator("svg.hm-plan-svg");
      expect(await plans.count()).toBeGreaterThanOrEqual(1);
      for (const svg of await plans.all()) {
        await expect(svg).toHaveAttribute("role", "img");
        await expect(svg.locator("text").first()).toBeVisible();
      }
      const body = page.locator("main");
      await expect(body).toContainText(/concept illustrations? generated from the room list/i);
      await expect(body).toContainText(/not to scale/i);
      await expect(body).toContainText(/not a measured survey/i);
      // Homes with concepts show at least two labelled AI pictures (a top-down and a 45-degree view);
      // homes without them show none, and every AI picture is labelled.
      if (home.concepts) expect(await page.locator(".hm-shot--ai img").count()).toBeGreaterThanOrEqual(2);
      else await expect(page.locator(".hm-shot--ai")).toHaveCount(0);
      for (const label of await page.locator(".hm-ai-label").all()) {
        await expect(label).toHaveText("AI-generated concept");
      }
      for (const image of await page.locator(".hm-shot--ai img").all()) {
        await expect(image).toHaveAttribute("alt", /^AI-generated concept/);
      }
    });

    test("the 3D model opens a canvas and responds to its controls", async ({ page }) => {
      await page.goto(`${home.base}plan.html`);
      await expect(page.locator("[data-model-stage]")).toBeHidden();
      await page.locator("[data-model-open]").click();
      const root = page.locator("[data-model-root]");
      await expect(root).toHaveAttribute("data-model-ready", "true", { timeout: 30_000 });
      const canvas = root.locator("canvas");
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box.width).toBeGreaterThan(250);
      expect(box.height).toBeGreaterThan(150);
      const before = await canvas.evaluate((element) => element.toDataURL().length);
      await root.locator('[data-model-act="right"]').click();
      await root.locator('[data-model-act="in"]').click();
      await canvas.focus();
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("r");
      await expect(root.locator("[data-model-status]")).toContainText(/ready/i);
      expect(before).toBeGreaterThan(0);
    });

    test("the 3D model does not animate under reduced motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${home.base}plan.html`);
      await page.locator("[data-model-open]").click();
      await expect(page.locator("[data-model-root]")).toHaveAttribute("data-model-ready", "true", { timeout: 30_000 });
      await expect(page.locator("[data-model-status]")).toContainText(/does not animate/i);
    });

    test("the lightbox opens from the tour and returns focus", async ({ page }) => {
      await page.goto(`${home.base}tour.html`);
      const thumbs = page.locator(".hm-shot img");
      expect(await thumbs.count()).toBeGreaterThanOrEqual(2);
      const first = thumbs.first();
      await first.scrollIntoViewIfNeeded();
      await first.click();
      const viewer = page.locator("dialog.site-lightbox");
      await expect(viewer).toBeVisible();
      await expect(viewer.locator("[data-lightbox-counter]")).toContainText(`1 / ${await thumbs.count()}`);
      await page.keyboard.press("ArrowRight");
      await expect(viewer.locator("[data-lightbox-counter]")).toContainText("2 /");
      await page.keyboard.press("Escape");
      await expect(viewer).toBeHidden();
      await expect(first).toBeFocused();
    });

    test("amenities are grouped with status badges", async ({ page }) => {
      await page.goto(`${home.base}amenities.html`);
      expect(await page.locator(".hm-amenity-group").count()).toBeGreaterThanOrEqual(1);
      for (const badge of await page.locator(".hm-amenity-group .hm-badge").all()) {
        await expect(badge).toHaveText(/^(Confirmed|Listed|In photos|Confirm on inquiry)$/);
      }
      await expect(page.locator(".hm-key")).toContainText("Confirm on inquiry");
    });

    test("axe finds no violations on any page", async ({ page }) => {
      test.setTimeout(240_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const path of pagesOf(home)) {
        await page.goto(path);
        await settle(page);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
        expect(results.violations, `${path}: ${results.violations.map((item) => item.id).join(", ")}`).toEqual([]);
      }
    });

    test("axe finds no violations once the 3D model and the map are open", async ({ page }) => {
      // Up to 30s for the WebGL model on a CPU-only runner, then two full axe scans
      // (plan, and location with its drive-time chart): more than the 45s default
      // under a loaded CI runner, as Frederick showed (site-check job 2566288).
      test.setTimeout(120_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${home.base}plan.html`);
      await page.locator("[data-model-open]").click();
      await expect(page.locator("[data-model-root]")).toHaveAttribute("data-model-ready", "true", { timeout: 30_000 });
      await settle(page);
      let results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, results.violations.map((item) => item.id).join(", ")).toEqual([]);
      await page.goto(`${home.base}location.html`);
      await page.locator("[data-map-load]").click();
      await settle(page);
      results = await new AxeBuilder({ page }).exclude("iframe").analyze();
      expect(results.violations, results.violations.map((item) => item.id).join(", ")).toEqual([]);
    });

    test("there is no horizontal overflow at 390px wide", async ({ page }) => {
      // Heavy by design (every page of the home, then the 3D model (up to 30 s to be ready)): triple the 45 s budget so a slow CI node is not a failure.
      test.slow();
      await page.setViewportSize({ width: 390, height: 844 });
      for (const path of pagesOf(home)) {
        await page.goto(path);
        await settle(page);
        const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
        expect(sizes.content, `${path} html overflows`).toBeLessThanOrEqual(sizes.viewport);
        expect(sizes.body, `${path} body overflows`).toBeLessThanOrEqual(sizes.viewport);
      }
      await page.goto(`${home.base}plan.html`);
      await page.locator("[data-model-open]").click();
      await expect(page.locator("[data-model-root]")).toHaveAttribute("data-model-ready", "true", { timeout: 30_000 });
      const open = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(open.content, "plan page with the 3D model open overflows").toBeLessThanOrEqual(open.viewport);
    });

    test("only approved street addresses appear", async ({ request }) => {
      for (const path of pagesOf(home)) {
        const html = await (await request.get(path)).text();
        for (const banned of ["255 Court", "216 Sand", "287 Ridgeway"]) expect(html).not.toContain(banned);
        const streets = html.match(/\b\d{1,5} (?:Broad|Henrietta|Frederick|Court|Sand|45th|32nd|Walnut|Virginia|Gallatin|Ridgeway) St\b/gi) || [];
        for (const street of streets) expect(approvedStreets, `${path} shows ${street}`).toContain(street);
        if (!home.street) {
          // A town-level home must not leak its own house number anywhere on its pages.
          const own = html.match(/\b\d{1,5} (?:Court|Sand|Broad|45th|32nd|Walnut|Virginia|Gallatin|Ridgeway)\b/gi) || [];
          expect(own, `${path} house numbers`).toEqual([]);
        }
      }
    });
  });
}

test("the old summary pages redirect to the new microsites", async ({ page, request }) => {
  const moves = [
    ["/parkersburg/oak-cottage.html", "/parkersburg/oak-cottage/"],
    ["/ravenswood/henrietta-cottage.html", "/ravenswood/henrietta-cottage/"],
    ["/parkersburg/broad-cottage.html", "/parkersburg/broad-cottage/"],
    ["/parkersburg/buck-apartment-1.html", "/parkersburg/buck-cottage/"],
    ["/parkersburg/buck-cottage.html", "/parkersburg/buck-cottage/"],
    ["/ravenswood/virginia-cottage.html", "/ravenswood/virginia-cottage/"],
  ];
  for (const [from, to] of moves) {
    const html = await (await request.get(from)).text();
    expect(html, from).toContain(`url=${to}`);
    expect(html, from).toContain('name="robots" content="noindex"');
    await page.goto(from);
    await page.waitForURL((url) => url.pathname.startsWith(to), { timeout: 10_000 });
  }
});

test("the family switcher links to every home microsite", async ({ page }) => {
  // /marietta/frederick/index.html is the template's own index file, so the old hub URL still serves the page.
  await page.goto("/marietta/frederick/index.html");
  await expect(page.locator("h1")).toHaveText("Frederick Cottage");
  await expect(page.locator(".hm-family-card")).toHaveCount(familySize);
  await expect(page.locator('.hm-family-card[aria-current="page"]')).toContainText("Frederick Cottage");
  for (const home of homes) {
    await expect(page.locator(`.hm-family-card[href="${home.base}"]`)).toContainText(home.name);
  }
  const henrietta = homes.find((home) => home.id === "henrietta");
  await page.locator(`.hm-family-card[href="${henrietta.base}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${henrietta.base}$`));
  await expect(page.locator("h1")).toHaveText("Henrietta Cottage");
});

test("every old Frederick page lands on its new section", async ({ page, request }) => {
  const moves = [
    ["rooms", "tour.html#bedrooms"],
    ["kitchen", "tour.html#kitchen"],
    ["bathrooms", "tour.html#bathroom"],
    ["living", "tour.html#living"],
    ["outdoors", "tour.html#outdoors"],
    ["gallery", "tour.html"],
    ["area", "location.html#nearby"],
    ["arrival", "location.html"],
    ["utilities", "guide.html#utilities"],
    ["handbook", "guide.html#handbook"],
  ];
  const base = "/marietta/frederick/";
  for (const [old, target] of moves) {
    const from = `${base}${old}.html`;
    const response = await request.get(from);
    expect(response.status(), from).toBe(200);
    const html = await response.text();
    expect(html, from).toContain(`url=${base}${target}`);
    expect(html, from).toMatch(/name="robots" content="noindex"/);
    await page.goto(from);
    const [path, hash] = target.split("#");
    await page.waitForURL((url) => url.pathname === `${base}${path}` && url.hash === (hash ? `#${hash}` : ""), { timeout: 10_000 });
    if (hash) await expect(page.locator(`#${hash}`)).toHaveCount(1);
  }
});

test("Frederick keeps every question and guide topic from its old pages", async ({ page }) => {
  await page.goto("/marietta/frederick/tour.html");
  for (const question of [
    "Is this a full kitchen or a kitchenette?",
    "Can six eat together?",
    "What bed is in each bedroom?",
    "Can three adults each have a private room?",
    "Is it a shower or a tub?",
    "What if something drips or clogs?",
  ]) {
    await expect(page.locator(".hm-faq summary", { hasText: question })).toHaveCount(1);
  }
  // Native disclosures: closed by default, open on click, no script needed.
  const first = page.locator(".hm-faq").first();
  await expect(first).not.toHaveAttribute("open", "");
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator(".hm-badge")).toBeVisible();

  await page.goto("/marietta/frederick/guide.html");
  for (const id of ["arrival", "utilities", "handbook", "policies", "maintenance"]) {
    await expect(page.locator(`section#${id} h2`)).toHaveCount(1);
  }
  await expect(page.locator("main")).toContainText("call 911 first");
  await expect(page.locator("main")).toContainText("1 Gbps ethernet");
  for (const href of ["/maintenance.html", "/emergency-maintenance.html", "/resident-portal.html"]) {
    await expect(page.locator(`main a[href="${href}"]`)).toHaveCount(1);
  }
  expect(await page.locator(`nav[aria-label="Frederick Cottage sections"] a[href="/marietta/frederick/guide.html"]`).count()).toBeGreaterThanOrEqual(1);
});

// Flagship standard item 8 (#65, #87): every home answers guest questions on its
// photo tour, and every answer says where it comes from.
test("every home tour answers at least eight guest questions, each with an evidence badge", async ({ page }) => {
  for (const home of homes) {
    await page.goto(`${home.base}tour.html`);
    const faqs = page.locator(".hm-faq");
    const count = await faqs.count();
    expect(count, `${home.name} FAQ count`).toBeGreaterThanOrEqual(8);
    await expect(page.locator(".hm-faq .hm-badge")).toHaveCount(count);
    await expect(page.locator(".hm-faq summary", { hasText: "What if something drips or clogs?" })).toHaveCount(1);
  }
});

test("homes without a resident guide have no guide page or nav item", async ({ page, request }) => {
  expect((await request.get("/ravenswood/henrietta-cottage/guide.html")).status()).toBe(404);
  await page.goto("/ravenswood/henrietta-cottage/");
  await expect(page.locator('nav[aria-label="Henrietta Cottage sections"] a[href$="guide.html"]')).toHaveCount(0);
});
