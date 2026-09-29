import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/pwa",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://127.0.0.1:4175",
    serviceWorkers: "allow",
    ...devices["Desktop Chrome"]
  },
  webServer: {
    command: "node scripts/serve-pwa.mjs",
    url: "http://127.0.0.1:4175/",
    reuseExistingServer: true,
    timeout: 20000
  }
});
