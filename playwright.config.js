const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tcc/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "node tcc/e2e/server.cjs",
    url: "http://127.0.0.1:4173/tcc/admin/",
    reuseExistingServer: false,
  },
});
