const { test, expect } = require("@playwright/test");

// #85 probe: how the production Function answers a real Turnstile token that is
// reused, or that a guest holds longer than Cloudflare's 300 s token lifetime
// (a long form, or a phone that suspended the tab while the guest looked
// something up). Every request carries only the token, never a name, an email
// or consent, so the Function stops at verification or at field validation and
// nothing ever reaches the Logic App. No valid application is ever submitted.
//
// It only observes: each answer is printed as one JSON line and attached to the
// report, and the test fails only when the production widget cannot be probed
// at all. Run by hand: the manual `probe:turnstile-age` job.
test.use({
  headless: !process.env.DISPLAY,
  launchOptions: { args: ["--disable-blink-features=AutomationControlled"] },
});

const HOLD_MS = Number(process.env.TURNSTILE_HOLD_SECONDS || 330) * 1_000;
const label = `ci-${(process.env.CI_COMMIT_SHORT_SHA || "probe").trim().slice(0, 8)}`;

async function openForm(context) {
  const page = await context.newPage();
  await page.goto(`/?mtc_test=${label}`);
  const tokenField = page.locator('[name="cf-turnstile-response"]');
  const deadline = Date.now() + 60_000;
  let token = "";
  while (Date.now() < deadline && !token) {
    token = (await tokenField.count()) ? await tokenField.first().inputValue() : "";
    if (!token) await page.waitForTimeout(1_000);
  }
  const clientError = (await page.locator(".cf-turnstile").getAttribute("data-turnstile-error")) || "none";
  return { page, token, clientError, issuedAt: Date.now() };
}

async function currentToken(page) {
  const field = page.locator('[name="cf-turnstile-response"]');
  return (await field.count()) ? field.first().inputValue() : "";
}

// Posts a token with an otherwise empty inquiry, from the page itself (same
// origin, same browser IP as the widget), and returns the Function's answer.
async function post(page, token) {
  return page.evaluate(async (value) => {
    const response = await fetch("/api/apply", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({ "cf-turnstile-response": value }),
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, stage: body.stage || "", reason: body.reason || "", message: body.message || "" };
  }, token);
}

test("Turnstile token reuse and age against production (observe only)", async ({ browser }) => {
  test.setTimeout(HOLD_MS + 240_000);
  const results = [];
  const record = (scenario, answer, extra = {}) => {
    const row = { scenario, ...answer, ...extra };
    results.push(row);
    console.log(`PROBE ${JSON.stringify(row)}`);
    // An empty inquiry can never be accepted; a 2xx would mean the probe itself is wrong.
    expect(answer.status, JSON.stringify(row)).not.toBeLessThan(300);
  };

  const context = await browser.newContext();
  const [fresh, held, frozen] = await Promise.all([openForm(context), openForm(context), openForm(context)]);
  for (const [name, form] of Object.entries({ fresh, held, frozen })) {
    console.log(`PROBE ${JSON.stringify({ scenario: `${name}:widget`, token: form.token ? form.token.length : 0, clientError: form.clientError })}`);
  }
  test.skip(!fresh.token || !held.token || !frozen.token, "Turnstile issued no token to the CI browser; nothing to probe");

  // 1. A fresh token, then the same token again (a double submit, or a retry
  //    that resends the token the first attempt already spent).
  record("fresh", await post(fresh.page, fresh.token));
  record("fresh:reused", await post(fresh.page, fresh.token));

  // 2. Hold two forms open past the token lifetime. "held" stays active, so the
  //    widget's own timers run. "frozen" is suspended the way a phone suspends
  //    a background tab (Page lifecycle "frozen"), then resumed just before send.
  const cdp = await context.newCDPSession(frozen.page);
  await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
  await held.page.waitForTimeout(HOLD_MS);
  await cdp.send("Page.setWebLifecycleState", { state: "active" });

  const heldNow = await currentToken(held.page);
  const frozenNow = await currentToken(frozen.page);
  const ageSeconds = (form) => Math.round((Date.now() - form.issuedAt) / 1_000);
  // The token as first issued, now past its lifetime (only when the widget
  // replaced it; otherwise the field post below is that same token).
  if (heldNow && heldNow !== held.token) {
    record("held:original", await post(held.page, held.token), { ageSeconds: ageSeconds(held) });
  }
  // What the real form would send: whatever the hidden field holds at that moment.
  record("held:field", await post(held.page, heldNow), { refreshed: heldNow !== held.token, empty: !heldNow, ageSeconds: ageSeconds(held) });
  record("frozen:field", await post(frozen.page, frozenNow), { refreshed: frozenNow !== frozen.token, empty: !frozenNow, ageSeconds: ageSeconds(frozen) });

  await test.info().attach("turnstile-probe.json", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  await context.close();
});
