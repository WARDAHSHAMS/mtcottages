const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

// #85: the stay form must send a live Turnstile token. Hermetic: the real
// infra/azure/apply-proxy/index.html is served from disk at the production
// URL, Cloudflare's api.js is replaced by a stub that issues numbered tokens,
// and /api/apply is answered by the test. Nothing leaves the browser.
const FORM = fs.readFileSync(path.join(__dirname, "../../infra/azure/apply-proxy/index.html"), "utf8")
  .replace("<!-- TURNSTILE_SCRIPT -->", '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>')
  .replace("__TURNSTILE_SITE_KEY__", "0x4AAAAAAAstub")
  .replace(/ nonce="__INLINE_SCRIPT_NONCE__"/g, "");

// Each render or reset issues "token-N" and calls the widget's data-callback,
// the way the real widget does.
const TURNSTILE_STUB = `
  (() => {
    let issued = 0;
    const issue = () => {
      const widget = document.querySelector(".cf-turnstile");
      let field = widget.querySelector('[name="cf-turnstile-response"]');
      if (!field) {
        field = document.createElement("input");
        field.type = "hidden";
        field.name = "cf-turnstile-response";
        widget.appendChild(field);
      }
      field.value = "";
      setTimeout(() => {
        issued += 1;
        field.value = "token-" + issued;
        const callback = window[widget.dataset.callback];
        if (typeof callback === "function") callback(field.value);
      }, 50);
    };
    window.turnstile = { reset: issue };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", issue);
    else issue();
  })();
`;

async function openForm(page, answers) {
  const posted = [];
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: TURNSTILE_STUB }));
  await page.route("https://stay.mtcottages.com/api/collect", (route) => route.fulfill({ status: 204, body: "" }));
  await page.route("https://stay.mtcottages.com/api/apply", (route) => {
    const body = new URLSearchParams(route.request().postData() || "");
    posted.push({ token: body.get("cf-turnstile-response"), submissionId: body.get("submissionId") });
    const answer = answers[Math.min(posted.length - 1, answers.length - 1)];
    return route.fulfill({ status: answer.status, contentType: "application/json", body: JSON.stringify(answer.body) });
  });
  await page.route("https://stay.mtcottages.com/", (route) => route.fulfill({ contentType: "text/html", body: FORM }));
  await page.goto("https://stay.mtcottages.com/");
  await expect(page.locator('[name="cf-turnstile-response"]')).toHaveValue("token-1");
  return posted;
}

async function fillInquiry(page) {
  await page.fill('[name="firstName"]', "Test");
  await page.fill('[name="lastName"]', "Stub");
  await page.fill('[name="email"]', "stub@example.invalid");
  await page.fill('[name="phone"]', "304 555 0100");
  await page.fill('[name="moveInDate"]', "2027-01-15");
  await page.selectOption('[name="duration"]', "Flexible / not sure");
  await page.fill('[name="occupants"]', "1");
  await page.selectOption('[name="preferredLocation"]', "Open to options");
  await page.selectOption('[name="stayType"]', "Something else");
  await page.fill('[name="message"]', "Stubbed browser test; never sent anywhere.");
  await page.check('[name="termsAccepted"]');
}

const accepted = { status: 200, body: { success: true, message: "ok" } };
const spent = {
  status: 400,
  body: { success: false, message: "Please complete the human verification", stage: "verification", reason: "rejected:timeout-or-duplicate" },
};

test("a fresh token is sent as is", async ({ page }) => {
  const posted = await openForm(page, [accepted]);
  await fillInquiry(page);
  await page.click('[type="submit"]');
  await expect(page.locator("[data-form-status]")).toHaveAttribute("data-state", "success");
  expect(posted.map((entry) => entry.token)).toEqual(["token-1"]);
});

test("a token older than four minutes is replaced before sending", async ({ page }) => {
  await page.clock.install();
  const posted = await openForm(page, [accepted]);
  await fillInquiry(page);
  // The guest took six minutes, or the phone froze the tab and its timers.
  await page.clock.fastForward("06:00");
  await page.click('[type="submit"]');
  await page.clock.runFor(1_000);
  await expect(page.locator("[data-form-status]")).toHaveAttribute("data-state", "success");
  expect(posted.map((entry) => entry.token)).toEqual(["token-2"]);
});

test("an expired-or-duplicate refusal is retried once with a new token and the same submission id", async ({ page }) => {
  const posted = await openForm(page, [spent, accepted]);
  await fillInquiry(page);
  await page.click('[type="submit"]');
  await expect(page.locator("[data-form-status]")).toHaveAttribute("data-state", "success");
  expect(posted.map((entry) => entry.token)).toEqual(["token-1", "token-2"]);
  expect(posted[1].submissionId).toBe(posted[0].submissionId);
});

test("a second refusal is shown to the guest, not retried forever", async ({ page }) => {
  const posted = await openForm(page, [spent, spent]);
  await fillInquiry(page);
  await page.click('[type="submit"]');
  await expect(page.locator("[data-form-status]")).toHaveAttribute("data-state", "error");
  await expect(page.locator("[data-form-status]")).toHaveText("Please complete the human verification");
  expect(posted).toHaveLength(2);
  await expect(page.locator('[type="submit"]')).toBeEnabled();
});
