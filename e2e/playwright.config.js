const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  // CI shares its runners with other merge requests; a page load that takes seconds locally can take
  // tens of seconds there, so the per-test budget doubles in CI. Real hangs still fail, just later.
  timeout: process.env.CI ? 90_000 : 45_000,
  expect: {
    timeout: 10_000
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  }
});
