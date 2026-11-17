const { test, expect } = require("@playwright/test");

// #85: a token the production widget issues to a real browser must pass the
// Function's siteverify. The token is posted with a deliberately incomplete
// inquiry (no name, no email, no consent): the Function verifies Turnstile
// first, so "stage: validation" proves the token passed, and the request stops
// there, before any Logic App call. No valid application is ever submitted.
// Runs only in the GitLab deploy smoke (EXPECTED_COMMIT), against the commit it deployed.
//
// This lives in its own file because `headless` and `launchOptions` are
// worker-scoped: Playwright accepts them in a file-level test.use, but rejects
// them inside a describe group ("forces a new worker").
test.use({
  headless: !process.env.DISPLAY,
  launchOptions: { args: ["--disable-blink-features=AutomationControlled"] },
});

const analyticsLabel = `ci-${(process.env.EXPECTED_COMMIT || process.env.GITHUB_SHA || "manual").trim().slice(0, 8)}`;

// Client error families that mean the widget itself is misconfigured, not that
// Cloudflare chose to challenge this datacenter browser: 110xxx (sitekey or
// domain not allowed) and 400xxx (invalid widget parameters).
const configurationError = /^(110|400)\d{3}$/;

test("a production widget token passes siteverify and stops at field validation", async ({ page, request }) => {
  const expectedCommit = (process.env.EXPECTED_COMMIT || "").trim();
  test.skip(!expectedCommit, "runs in the GitLab deploy smoke, against the commit it deployed");
  test.setTimeout(300_000);
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

  await page.goto(`/?mtc_test=${analyticsLabel}`);
  const widget = page.locator(".cf-turnstile");
  await expect(widget).toHaveAttribute("data-error-callback", "mtcTurnstileError");
  const tokenField = page.locator('[name="cf-turnstile-response"]');
  let token = "";
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    token = (await tokenField.count()) ? await tokenField.first().inputValue() : "";
    if (token) break;
    const clientError = await widget.getAttribute("data-turnstile-error");
    if (clientError && configurationError.test(clientError)) break;
    await page.waitForTimeout(1_000);
  }
  const clientError = (await widget.getAttribute("data-turnstile-error")) || "none";
  expect(configurationError.test(clientError), `Turnstile widget configuration error ${clientError}`).toBe(false);
  if (!token) {
    // Cloudflare may keep a datacenter browser on an interactive challenge.
    // That says nothing about the key pairing, so it is reported, not failed.
    test.info().annotations.push({
      type: "inconclusive",
      description: `the widget issued no token in 60 s (client error ${clientError})`,
    });
    test.skip(true, `Turnstile issued no token to the CI browser (client error ${clientError})`);
  }

  const answer = await page.evaluate(async (value) => {
    const response = await fetch("/api/apply", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({ "cf-turnstile-response": value }),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  }, token);
  // On failure the body names the stage and Cloudflare's error codes, e.g.
  // "rejected:invalid-input-response" for a secret from another widget.
  expect(answer, JSON.stringify(answer)).toEqual({
    status: 400,
    body: { success: false, message: "Please complete the required fields", stage: "validation" },
  });
});
