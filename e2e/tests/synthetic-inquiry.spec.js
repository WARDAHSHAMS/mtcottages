const { test, expect } = require("@playwright/test");

// #85: every real guest inquiry got HTTP 400 for weeks and no check noticed.
// This is the synthetic real-form submission that fails CI when that happens.
//
// The browser opens the real stay form at its production URL. Every request to
// stay.mtcottages.com is answered by infra/azure/apply-proxy/ci/synthetic_host.py,
// which runs the packaged Function code itself: the page comes from
// application_form and the POST reaches apply with its real bot screen, real
// Turnstile verification (Cloudflare's live siteverify, with Cloudflare's
// always-pass test keys and the real widget script), real field validation and
// real Logic App delivery, to a stub trigger. The test fills every field the
// form shows the way a guest would and fails on anything but a 2xx.
//
// Nothing reaches the real Logic App, Dynamics 365 or any guest.
const HOST = process.env.SYNTHETIC_HOST_URL;
const STAY = "https://stay.mtcottages.com";

test.skip(!HOST, "SYNTHETIC_HOST_URL is unset: run synthetic_host.py and point this at it (CI job synthetic:inquiry)");

// A valid answer for every visible control, chosen from the control itself so a
// field added to the form is filled without editing this test.
async function fillLikeAGuest(page) {
  const form = page.locator("form[data-application-form]");
  const controls = form.locator("input:visible, select:visible, textarea:visible");
  const moveIn = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const byName = {
    firstName: "Synthetic",
    lastName: "Gate",
    email: "synthetic-gate@example.invalid",
    phone: "304 555 0100",
    occupants: "2",
    monthlyBudget: "1800",
    message: "CI synthetic inquiry (#85). Stub trigger only; never delivered.",
  };
  const filled = [];
  for (const control of await controls.all()) {
    const name = await control.getAttribute("name");
    if (!name || name === "website") continue;
    const tag = await control.evaluate((element) => element.tagName.toLowerCase());
    const type = ((await control.getAttribute("type")) || "").toLowerCase();
    if (tag === "select") {
      const values = await control.locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
      expect(values.length, `select ${name} offers no option`).toBeGreaterThan(0);
      await control.selectOption(values[0]);
    } else if (type === "checkbox") {
      await control.check();
    } else if (type === "date") {
      await control.fill(moveIn);
    } else {
      await control.fill(byName[name] || "Synthetic value");
    }
    filled.push(name);
  }
  return filled;
}

test("a guest's real-form inquiry is accepted end to end", async ({ page, request }) => {
  test.slow();
  const before = await (await request.get(`${HOST}/__synthetic/deliveries`)).json();

  const answers = [];
  await page.route(`${STAY}/**`, async (route) => {
    const url = new URL(route.request().url());
    // Cookieless analytics beacons are not what this gate measures.
    if (url.pathname === "/api/collect") return route.fulfill({ status: 204 });
    const response = await route.fetch({ url: `${HOST}${url.pathname}${url.search}` });
    if (url.pathname === "/api/apply" && route.request().method() === "POST") {
      answers.push({ status: response.status(), body: await response.text() });
    }
    return route.fulfill({ response });
  });

  await page.goto(`${STAY}/`);
  // The real widget, with the always-pass test site key, issues a token itself.
  await expect(page.locator('[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 60_000 });

  const filled = await fillLikeAGuest(page);
  for (const required of ["firstName", "lastName", "email", "phone", "moveInDate", "duration", "occupants", "preferredLocation", "stayType", "message", "termsAccepted"]) {
    expect(filled, `the form no longer shows ${required}`).toContain(required);
  }
  await page.locator('form[data-application-form] [type="submit"]').click();

  await expect.poll(() => answers.length, { timeout: 60_000, message: "the form never POSTed /api/apply" }).toBeGreaterThan(0);
  const last = answers[answers.length - 1];
  // The gate: a guest's inquiry must get a 2xx. Print the stage and reason when it does not.
  expect(last.status, `POST /api/apply answered ${last.status}: ${last.body}`).toBeGreaterThanOrEqual(200);
  expect(last.status, `POST /api/apply answered ${last.status}: ${last.body}`).toBeLessThan(300);
  await expect(page.locator("[data-form-status]")).toHaveAttribute("data-state", "success");

  const after = await (await request.get(`${HOST}/__synthetic/deliveries`)).json();
  expect(after.count - before.count, "the stub Logic App trigger got no lead").toBe(1);
  expect(after.fields[after.fields.length - 1]).toEqual(expect.arrayContaining(["email", "firstName", "message", "submissionId", "termsAccepted"]));
});
