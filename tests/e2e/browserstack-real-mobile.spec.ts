import { expect, test } from "@playwright/test";

const viewportPayload = {
  elements: [
    { type: "node", id: 1, lat: 36.885, lon: 30.705, tags: { shop: "supermarket", name: "Yakın Market", "addr:street": "Atatürk Caddesi" } },
    { type: "node", id: 2, lat: 36.886, lon: 30.706, tags: { amenity: "cafe", name: "Yakın Kafe", "addr:street": "Cumhuriyet Sokak" } },
    { type: "node", id: 3, lat: 36.887, lon: 30.707, tags: { amenity: "atm", name: "Yakın ATM", "addr:street": "Merkez" } },
  ],
};

const overturePayload = {
  places: [
    { id: "overture-real-device-1", name: "Overture Test Kafe", category: "cafe", lat: 36.8853, lng: 30.7058, address: "Kadriye", distanceM: 180 },
    { id: "overture-real-device-2", name: "Yakın Market", category: "market", lat: 36.88501, lng: 30.70501, address: "Atatürk Caddesi", distanceM: 120 },
  ],
};

const dutyPayload = {
  pharmacies: [
    { id: "duty-1", name: "Merkez Nöbetçi Eczane", address: "Kadriye Mahallesi", phone: "02420000000", latitude: 36.8855, longitude: 30.7065, distance_m: 420 },
  ],
};

const newsPayload = {
  items: [
    { id: "n1", title: "Gerçek cihaz test haberi", url: "https://example.com/news", publishedAt: "2026-09-29T09:00:00.000Z", source: "Test Haber" },
  ],
};

const radioPayload = {
  stations: [
    { id: "r1", name: "Gerçek Cihaz Test Radyosu", streamUrl: "https://example.com/test.mp3", codec: "MP3", bitrate: 128, liveVerified: true, measuredRank: 1 },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((fixtures) => {
    const position = {
      coords: {
        latitude: 36.884,
        longitude: 30.704,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success(position as GeolocationPosition),
        watchPosition: (success: PositionCallback) => {
          success(position as GeolocationPosition);
          return 1;
        },
        clearWatch: () => undefined,
      },
    });

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const json = (payload: unknown) => new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      if (url.includes("/api/viewport?")) return json(fixtures.viewport);
      if (url.includes("/api/overture?")) return json(fixtures.overture);
      if (url.includes("/api/duty?")) return json(fixtures.duty);
      if (url.includes("/api/news?")) return json(fixtures.news);
      if (url.includes("/api/radio?")) return json(fixtures.radio);
      return originalFetch(input, init);
    };
  }, {
    viewport: viewportPayload,
    overture: overturePayload,
    duty: dutyPayload,
    news: newsPayload,
    radio: radioPayload,
  });
});

test("Yakınım v2 works on a real mobile device", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}" });

  const device = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    userAgent: navigator.userAgent,
  }));

  expect(device.width).toBeGreaterThanOrEqual(320);
  expect(device.width).toBeLessThanOrEqual(500);
  expect(device.height).toBeGreaterThanOrEqual(600);
  expect(device.userAgent).toMatch(/Android|iPhone|iPad|Mobile/i);

  await expect(page.locator(".brand")).toBeVisible();
  await expect(page.locator(".location-control")).toBeVisible();
  await expect(page.locator(".hero-copy h1")).toHaveText("Şu anda sana ne lazım?");
  await assertNoHorizontalOverflow(page);

  await activateMobile(page.locator(".primary-button"));
  await expect(page.locator(".results-section")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Yakın Market")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Overture Test Kafe")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".results-meta")).toContainText("sonuç", { timeout: 30_000 });

  await activateMobile(page.locator(".category-pill").filter({ hasText: "Nöbetçi" }));
  await expect(page.locator(".results-heading h2")).toHaveText("Nöbetçi eczaneler");
  await expect(page.getByText("Merkez Nöbetçi Eczane")).toBeVisible({ timeout: 30_000 });

  const nav = page.locator(".bottom-nav");
  await activateMobile(nav.locator("button").filter({ hasText: "Harita" }));
  await expect(page.getByRole("button", { name: "Listeye dön" })).toBeVisible();
  await expect(page.locator(".place-marker-label").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".place-marker-label").first()).toContainText("Merkez Nöbetçi Eczane");

  await activateMobile(nav.locator("button").filter({ hasText: "Haber" }));
  await expect(page.getByText("Gerçek cihaz test haberi")).toBeVisible({ timeout: 30_000 });

  await activateMobile(nav.locator("button").filter({ hasText: "Radyo" }));
  await expect(page.getByText("Gerçek Cihaz Test Radyosu")).toBeVisible({ timeout: 30_000 });
  await activateMobile(page.locator(".station-card").filter({ hasText: "Gerçek Cihaz Test Radyosu" }));
  await expect(page.locator(".global-radio-player")).toBeVisible();

  await activateMobile(nav.locator("button").filter({ hasText: "Yakınım" }));
  await expect(page.locator(".hero-copy h1")).toHaveText("Şu anda sana ne lazım?");
  await expect(page.locator(".global-radio-player")).toBeVisible();

  await assertNoHorizontalOverflow(page);
  await assertBottomNavInsideViewport(page);
  await page.screenshot({ path: testInfo.outputPath("browserstack-real-mobile.png"), fullPage: false });
});

async function activateMobile(locator: import("@playwright/test").Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.click({ force: true, timeout: 60_000 });
}

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertBottomNavInsideViewport(page: import("@playwright/test").Page) {
  const navBox = await page.locator(".bottom-nav").boundingBox();
  expect(navBox).not.toBeNull();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  if (!navBox) return;
  expect(navBox.x).toBeGreaterThanOrEqual(0);
  expect(navBox.x + navBox.width).toBeLessThanOrEqual(viewportWidth + 1);
  expect(navBox.height).toBeGreaterThanOrEqual(60);
}
