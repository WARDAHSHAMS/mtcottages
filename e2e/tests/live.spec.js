const { test, expect } = require("@playwright/test");

async function waitForPublishedApplication(request) {
  await expect
    .poll(
      async () => {
        try {
          const response = await request.get("/", { maxRedirects: 5 });
          if (!response.ok()) return "";
          return await response.text();
        } catch {
          return "";
        }
      },
      { timeout: 180_000, intervals: [5_000, 10_000] }
    )
    .toContain("Find a cottage that feels like home.");
}

test("stay.mtcottages.com serves the cottage application page", async ({ page, request }) => {
  await waitForPublishedApplication(request);
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  expect(response.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/Find Your Mt Cottages Stay/);
  await expect(page.locator(".hero h1")).toHaveText("Find a cottage that feels like home.");
  await expect(page.locator("[data-human-verification], .human-check")).toHaveCount(1);
  await expect(page.locator(".cf-turnstile")).toHaveCount(1);
  await expect(page.locator('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]')).toHaveCount(1);
  await expect(page.locator(".cf-turnstile")).toHaveAttribute("data-sitekey", /.+/);
  await expect(page.locator(".cf-turnstile")).not.toHaveAttribute("data-sitekey", "__TURNSTILE_SITE_KEY__");
  await expect(page.locator('[data-turnstile-unavailable], .human-check__unavailable, [data-turnstile-config-required], [data-turnstile-state="configuration-required"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("__TURNSTILE_SITE_KEY__");
  await expect(page.locator('form[data-application-form]')).toHaveCount(1);
  await expect(page.locator('form[data-application-form]')).toHaveAttribute(
    "action",
    "https://stay.mtcottages.com/api/apply"
  );
});

test("stay query parameters prefill the canonical inquiry context", async ({ page, request }) => {
  await waitForPublishedApplication(request);
  await page.goto("/?property=frederick&stayType=family&location=Marietta");
  await expect(page.locator("[data-property-context]")).toBeVisible();
  await expect(page.locator("[data-property-name]")).toHaveText("Frederick Cottage");
  await expect(page.locator('input[name="propertyId"]')).toHaveValue("frederick");
  await expect(page.locator('select[name="stayType"]')).toHaveValue("Family or furnished stay");
  await expect(page.locator('select[name="preferredLocation"]')).toHaveValue("Marietta, OH");
});

test("the application API is healthy and safely rejects a bot probe", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  await expect(health.json()).resolves.toMatchObject({ status: "ok" });

  // After a pipeline deploy the GitLab smoke job passes the commit it published.
  // The new package can take a short while to start serving, so poll for it.
  const expectedCommit = (process.env.EXPECTED_COMMIT || "").trim();
  if (expectedCommit) {
    await expect
      .poll(
        async () => {
          try {
            const response = await request.get("/api/health");
            if (!response.ok()) return "";
            return (await response.json()).commit || "";
          } catch {
            return "";
          }
        },
        { timeout: 180_000, intervals: [5_000, 10_000] }
      )
      .toBe(expectedCommit);

    // #23: the staff dashboard must be its own key-protected route. When the
    // catch-all form route shadowed it, /api/stats answered the form page with
    // HTTP 200. Checked against the commit just deployed, so the GitHub Pages
    // run (no EXPECTED_COMMIT) never races a GitLab deploy here.
    const stats = await request.get("/api/stats?format=json");
    expect(stats.status(), "GET /api/stats without a key").toBe(401);
  }

  const rejected = await request.post("/api/apply", {
    form: { website: "ci-probe" }
  });
  expect(rejected.status()).toBe(400);
  await expect(rejected.json()).resolves.toMatchObject({
    success: false,
    message: "Invalid submission"
  });
});

// #15: every inquiry carries a client idempotency key so a retry never creates
// a second lead. Checked on the published page only; nothing is submitted.
test("the inquiry form carries a fresh idempotency key", async ({ page, request }) => {
  const expectedCommit = (process.env.EXPECTED_COMMIT || "").trim();
  if (expectedCommit) {
    await expect
      .poll(
        async () => {
          try {
            const response = await request.get("/api/health");
            return response.ok() ? (await response.json()).commit || "" : "";
          } catch {
            return "";
          }
        },
        { timeout: 180_000, intervals: [5_000, 10_000] }
      )
      .toBe(expectedCommit);
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  await page.goto("/");
  const first = await page.locator('input[name="submissionId"]').inputValue();
  expect(first).toMatch(uuid);
  await page.reload();
  const second = await page.locator('input[name="submissionId"]').inputValue();
  expect(second).toMatch(uuid);
  expect(second).not.toBe(first);
});

// #23: cookieless analytics. The beacons of this webdriver browser carry a test label
// (ci-<sha8>), so the collector keeps them out of the real counts, and the GitLab job
// verify:analytics then finds this run's form_view and form_start on the dashboard.
// Nothing is ever submitted.
const analyticsLabel = `ci-${(process.env.EXPECTED_COMMIT || process.env.GITHUB_SHA || "manual").trim().slice(0, 8)}`;
const collectorStatuses = (page) => {
  const statuses = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/api/collect") {
      statuses.push({ status: response.status(), cookie: response.headers()["set-cookie"] || "" });
    }
  });
  return statuses;
};

test("the stay form counts a view and a first input, without a cookie or a submission", async ({ page, request }) => {
  const expectedCommit = (process.env.EXPECTED_COMMIT || "").trim();
  if (expectedCommit) {
    await expect
      .poll(async () => {
        try {
          const response = await request.get("/api/health");
          return response.ok() ? (await response.json()).commit || "" : "";
        } catch {
          return "";
        }
      }, { timeout: 180_000, intervals: [5_000, 10_000] })
      .toBe(expectedCommit);
  }
  const statuses = collectorStatuses(page);
  await page.goto(`/?property=frederick&stayType=healthcare&src=smoke&mtc_test=${analyticsLabel}`);
  await expect.poll(() => statuses.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  await page.locator('input[name="firstName"]').fill("Smoke");
  await expect.poll(() => statuses.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
  expect(statuses, "the collector stores every beacon and sets no cookie").toEqual(
    statuses.map(() => ({ status: 202, cookie: "" }))
  );
});

test("a microsite visit and its inquiry click reach the collector, and the marketing site stores nothing", async ({ page, context }) => {
  const statuses = collectorStatuses(page);
  await page.goto(`${marketingUrl}/marietta/frederick/index.html?mtc_test=${analyticsLabel}`);
  await expect.poll(() => statuses.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  const stored = await page.evaluate(() => ({ cookie: document.cookie, local: localStorage.length, session: sessionStorage.length }));
  expect(stored).toEqual({ cookie: "", local: 0, session: 0 });
  expect((await context.cookies()).filter((cookie) => cookie.domain.endsWith("mtcottages.com") && !cookie.domain.startsWith("stay"))).toEqual([]);
  // Stay on the page so the click's beacon response is observed here, not lost to the navigation.
  await page.evaluate(() => document.addEventListener("click", (event) => event.preventDefault()));
  await page.locator('.hm-hero [data-cta="hero"] a[href^="https://stay.mtcottages.com/?property=frederick"]').click();
  await expect.poll(() => statuses.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
  expect(statuses.every(({ status, cookie }) => status === 202 && !cookie), JSON.stringify(statuses)).toBe(true);
});

// #85: the real-browser Turnstile check lives in tests/live-turnstile.spec.js,
// because its headed launch options are worker-scoped and cannot sit in this file's tests.

test("the canonical stay host redirects HTTP to HTTPS", async ({ request }) => {
  const stayHttp = await request.get("http://stay.mtcottages.com/", { maxRedirects: 0 });
  expect(stayHttp.status()).toBe(307);
  expect(stayHttp.headers().location).toBe("https://stay.mtcottages.com/");
});

// Every home microsite on the marketing site must load after a publish.
// They live on the marketing host, whatever BASE_URL the rest of this file targets.
const marketingUrl = (process.env.MARKETING_URL || "https://mtcottages.com").replace(/\/+$/, "");
const microsites = [
  ["/marietta/frederick/index.html", "Frederick Cottage", "frederick"],
  ["/parkersburg/broad-cottage/", "Broad Cottage", "broad"],
  ["/parkersburg/buck-cottage/", "Buck Cottage", "buck"],
  ["/parkersburg/oak-cottage/", "Oak Cottage", "oak"],
  ["/ravenswood/virginia-cottage/", "Virginia Cottage", "virginia"],
  ["/ravenswood/henrietta-cottage/", "Henrietta Cottage", "henrietta"],
];

// The test name contains "microsite index loads": GitLab site-check runs exactly these against the
// local build (MARKETING_URL=$BASE_URL), so a regression fails in the MR, not after deploy.
for (const [route, name, id] of microsites) {
  test(`the ${name} microsite index loads with its address, family switcher and inquiry link`, async ({ page }) => {
    const response = await page.goto(`${marketingUrl}${route}`);
    expect(response.ok()).toBeTruthy();
    await expect(page.locator("h1")).toContainText(/Cottage|home/i);
    await expect(page.locator(".hm-chip")).not.toHaveCount(0);
    await expect(page.locator(".hm-family-card")).toHaveCount(microsites.length);
    // Since #20 every stay link on the page carries the home, including the ones in the closed
    // header panels, so the first match in the DOM can be hidden. A guest needs one they can see.
    await expect(page.locator(`a[href^="https://stay.mtcottages.com/?property=${id}&"]`).filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator("main img").first()).toBeVisible();
  });
}
