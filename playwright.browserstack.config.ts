import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /browserstack-real-mobile\.spec\.ts/,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-browserstack", open: "never" }],
  ],
  use: {
    baseURL: "http://bs-local.com:4173",
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
    actionTimeout: 60_000,
    navigationTimeout: 60_000,
  },
  webServer: {
    command: "npm run dev -- --host 0.0.0.0 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
