// Brand-option screenshots (#27). Not part of `npm test`: the GitLab job
// brand:capture runs it on merge requests that touch the options.
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: ".",
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:4173",
    bypassCSP: true,
    reducedMotion: "reduce"
  }
});
