import { defineConfig, devices } from "@playwright/test";

const chromiumLaunch = {executablePath:process.env.CHROMIUM_EXECUTABLE,args:["--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]};

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["shell.spec.ts", "redesign.spec.ts", "fixes.spec.ts", "city-services.spec.ts", "fishing-prices.spec.ts", "discovery.spec.ts", "map-feedback.spec.ts", "browserstack-real-mobile.spec.ts", "unified-mobile.spec.ts"],
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    // Keep API fixtures inside Playwright interception, including on WebKit.
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    geolocation: { latitude: 36.884, longitude: 30.704 },
    permissions: ["geolocation"],
  },
  projects: [
    {
      name: "iphone-14-webkit-390x844",
      use: {
        ...devices["iPhone 14"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "pixel-7-chromium-412x915",
      use: {
        ...devices["Pixel 7"],
        launchOptions: chromiumLaunch,
        viewport: { width: 412, height: 915 },
      },
    },
    {
      name: "compact-android-360x800",
      use: {
        ...devices["Pixel 5"],
        launchOptions: chromiumLaunch,
        viewport: { width: 360, height: 800 },
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
