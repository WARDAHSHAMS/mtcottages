// WCAG 2.2 AA audit fixes and the public accessibility statement (#75).
// Covers the statement page (search targeting, the standard, known limits, contact path, links to every
// home and the hubs, axe), the footer link to it, and regression checks for what the manual audit found:
// focus hidden under the sticky header, microsite nav and mobile inquiry bar (2.4.11), scroll regions
// that repeated their section's label (axe landmark-unique), and the stay form's wordmark contrast and
// focus indicators. The stay form is served from the checked-in infra/azure/apply-proxy/index.html, so
// nothing reaches the live stay host and nothing is ever submitted.
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const PAGE = "/accessibility/";
const ORIGIN = "https://mtcottages.com";
const STAY = "https://stay.mtcottages.com/";
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const homes = [
  ["Frederick Cottage", "/marietta/frederick/", "Marietta, Ohio"],
  ["Broad Cottage", "/parkersburg/broad-cottage/", "Parkersburg, WV"],
  ["Buck Cottage", "/parkersburg/buck-cottage/", "Parkersburg, WV"],
  ["Oak Cottage", "/parkersburg/oak-cottage/", "Parkersburg, WV"],
  ["Virginia Cottage", "/ravenswood/virginia-cottage/", "Ravenswood, WV"],
  ["Henrietta Cottage", "/ravenswood/henrietta-cottage/", "Ravenswood, WV"],
];

const formHtml = fs
  .readFileSync(path.join(__dirname, "..", "..", "infra", "azure", "apply-proxy", "index.html"), "utf8")
  .replaceAll("__INLINE_SCRIPT_NONCE__", "e2e");

/** Serves the checked-in stay form and answers anything that is not a GET with 202, so nothing is sent. */
const serveStayForm = async (context) => {
  const methods = [];
  await context.route(`${STAY}**`, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "GET" || url.pathname.startsWith("/api/")) {
      if (url.pathname !== "/api/collect") methods.push(request.method());
      return route.fulfill({ status: 202, body: "" });
    }
    return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: formHtml });
  });
  await context.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  return methods;
};

/** Waits two frames so a focus-driven scroll and any style change have painted. */
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

/**
 * One keyboard stop in a single round trip: lets any finite transition or animation finish (the skip link
 * leaving the screen, a smooth scroll), waits two frames for the focus scroll to paint, then names the
 * focused element and what covers its centre, if anything (WCAG 2.4.11).
 */
const focusStop = async () => {
  const finite = document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
  await Promise.race([Promise.allSettled(finite.map((animation) => animation.finished)), new Promise((done) => setTimeout(done, 1000))]);
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return resolve({ key: null, cover: null });
    const key = `${active.tagName}|${active.getAttribute("href") ?? ""}|${active.textContent?.trim().slice(0, 30)}`;
    const box = active.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return resolve({ key, cover: null });
    const x = Math.min(Math.max(box.left + box.width / 2, 0), innerWidth - 1);
    const y = Math.min(Math.max(box.top + box.height / 2, 0), innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    const covered = hit && !(active === hit || active.contains(hit) || hit.contains(active));
    resolve({ key, cover: covered ? `${key} is under ${hit.closest("header, nav, aside, [class]")?.className || hit.tagName}` : null });
  })));
};

/** What covers the centre of the focused element, or null when nothing does (WCAG 2.4.11). */
const focusCover = (page) =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return null;
    const box = active.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return null;
    const x = Math.min(Math.max(box.left + box.width / 2, 0), innerWidth - 1);
    const y = Math.min(Math.max(box.top + box.height / 2, 0), innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    if (!hit || active === hit || active.contains(hit) || hit.contains(active)) return null;
    const label = (active.getAttribute("href") || active.textContent || "").trim().slice(0, 60);
    return `${active.tagName} "${label}" is under ${hit.closest("header, nav, aside, [class]")?.className || hit.tagName}`;
  });

test.describe("accessibility statement", () => {
  test("targets search and is listed under its canonical", async ({ page, request }) => {
    const response = await page.goto(PAGE);
    expect(response?.status()).toBe(200);
    const title = await page.title();
    expect(title).toBe("Accessibility statement | Mt Cottages");
    expect(title.length).toBeLessThanOrEqual(60);
    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toContain("WCAG 2.2 AA");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect([`${ORIGIN}${PAGE}`, `${ORIGIN}${PAGE}index.html`]).toContain(canonical);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap, "the statement is in the sitemap under its canonical").toContain(`<loc>${canonical}</loc>`);
  });

  test("states the standard, how it is checked, the known limits and a contact path", async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator(".lede")).toContainText("WCAG) 2.2 at level AA");
    await expect(page.locator("time").first()).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
    const headings = await page.locator("main h2").allTextContents();
    expect(headings).toEqual(["The standard we work to", "How we check it", "Known limits", "Access in the homes themselves", "Tell us what got in the way"]);
    const limits = page.locator("#limits li");
    await expect(limits).toHaveCount(4);
    for (const limit of [/3D model/, /Google Maps/, /Cloudflare Turnstile/, /tested with every screen reader/]) await expect(limits.filter({ hasText: limit })).toHaveCount(1);
    await expect(page.locator("#testing")).toContainText("minimum accessibility score of 95");
    const mail = page.locator('a[href="mailto:stay@mtcottages.com"]');
    expect(await mail.count()).toBeGreaterThanOrEqual(2);
    // Honest about the homes: nothing is claimed step-free, and the inquiry field for needs is named exactly.
    await expect(page.locator("#homes")).toContainText("We do not yet list any home as step-free.");
    expect(formHtml).toContain("Furnishing or accessibility needs");
    await expect(page.locator("#homes")).toContainText('"Furnishing or accessibility needs" field');
  });

  test("links to every home and both work-stay hubs", async ({ page }) => {
    await page.goto(PAGE);
    for (const [name, href, place] of homes) {
      const item = page.locator("#homes li").filter({ has: page.locator(`a[href="${href}"]`) });
      await expect(item, name).toHaveText(`${name}, ${place}`);
    }
    await expect(page.locator('#homes a[href="/travel-nurses/"]')).toHaveCount(1);
    await expect(page.locator('#homes a[href="/corporate-housing/"]')).toHaveCount(1);
    const text = (await page.locator("main").textContent()) ?? "";
    expect(text.match(/Marietta(?!,? (Ohio|OH))/g) ?? [], "bare Marietta").toEqual([]);
  });

  test("is linked from the footer of every page type", async ({ page }) => {
    for (const pathname of ["/", "/faq.html", "/marietta/frederick/", "/corporate-housing/", "/parkersburg/index.html"]) {
      await page.goto(pathname);
      await expect(page.locator(`footer a[href="${PAGE}"]`), pathname).toHaveText("Accessibility");
    }
  });

  test("has no axe violations", async ({ page }) => {
    await page.goto(PAGE);
    const results = await new AxeBuilder({ page }).withTags([...WCAG, "best-practice"]).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

test.describe("audit regressions", () => {
  // reducedMotion is a browser-context option, not a Playwright Test option: test.use({ reducedMotion }) is silently
  // ignored, which left smooth scrolling on and sampled the focus walks mid-scroll in CI. Pass it as a context option.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("the skip link is the first stop and is visible when focused", async ({ page }) => {
    await page.goto("/faq.html");
    await page.keyboard.press("Tab");
    await settle(page);
    const skip = page.locator(".skip-link");
    await expect(skip).toBeFocused();
    const box = await skip.boundingBox();
    expect(box && box.y >= 0 && box.height > 0, "skip link on screen").toBe(true);
    expect(await focusCover(page)).toBeNull();
  });

  // Each walk tabs through the whole page; a stop whose centre is under a sticky bar fails.
  const walks = [
    { name: "mobile FAQ under the inquiry bar", viewport: { width: 390, height: 844 }, path: "/faq.html" },
    { name: "mobile town page under the inquiry bar", viewport: { width: 390, height: 844 }, path: "/parkersburg/index.html" },
    { name: "mobile microsite under the nav and inquiry bar", viewport: { width: 390, height: 844 }, path: "/marietta/frederick/location.html" },
    { name: "desktop microsite under the sticky nav", viewport: { width: 1280, height: 800 }, path: "/marietta/frederick/location.html" },
  ];
  for (const walk of walks) {
    test(`keyboard focus is never hidden: ${walk.name}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize(walk.viewport);
      await page.goto(walk.path);
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "reduced motion is emulated").toBe(true);
      const hidden = [];
      let first = null;
      for (let stop = 0; stop < 200; stop += 1) {
        await page.keyboard.press("Tab");
        const { key, cover } = await page.evaluate(focusStop);
        if (!key) continue;
        if (key === first) break;
        first ??= key;
        if (cover) hidden.push(cover);
      }
      expect(first, "the walk reached a focusable element").not.toBeNull();
      expect(hidden).toEqual([]);
    });
  }

  test("scrollable tables are labelled by their own caption, not the section heading", async ({ page }) => {
    test.setTimeout(120_000);
    for (const pathname of ["/parkersburg/index.html", "/marietta/index.html", "/corporate-housing/", "/travel-nurses/camden-clark/"]) {
      await page.goto(pathname);
      const results = await new AxeBuilder({ page }).withRules(["landmark-unique", "region"]).analyze();
      expect(results.violations.map((violation) => `${pathname} ${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
      const regions = await page.locator('section [role="region"]').evaluateAll((nodes) =>
        nodes.map((node) => ({ own: node.getAttribute("aria-labelledby"), section: node.closest("section")?.getAttribute("aria-labelledby") })),
      );
      for (const region of regions) expect(region.own, pathname).not.toBe(region.section);
    }
  });
});

test.describe("stay form", () => {
  test("the wordmark meets contrast and keyboard focus is visible on every control", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const methods = await serveStayForm(context);
    const page = await context.newPage();
    await page.goto(STAY);
    const contrast = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    expect(contrast.violations.map((violation) => violation.nodes.map((node) => node.target.join(" ")).join(", "))).toEqual([]);
    // Every keyboard stop draws a solid or auto outline at least 2px wide, or the platform focus ring.
    const missing = [];
    for (let stop = 0; stop < 40; stop += 1) {
      await page.keyboard.press("Tab");
      await settle(page);
      const ring = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return null;
        const style = getComputedStyle(active);
        const width = parseFloat(style.outlineWidth);
        const ok = (style.outlineStyle === "solid" && width >= 2) || style.outlineStyle === "auto" || style.boxShadow !== "none";
        return { ok, name: `${active.tagName}#${active.id || active.getAttribute("name") || ""}` };
      });
      if (!ring) break;
      if (!ring.ok) missing.push(ring.name);
    }
    expect(missing).toEqual([]);
    // The consent checkboxes and the Turnstile slot use the stronger accent ring.
    expect(formHtml).toMatch(/\.consent input:focus-visible[^{]*\{outline:\.2rem solid var\(--accent-strong\)/);
    expect(formHtml).toMatch(/\.cf-turnstile:focus-within\{outline:\.2rem solid var\(--accent-strong\)/);
    expect(methods, "nothing was submitted").toEqual([]);
    await context.close();
  });
});
