import { expect, test } from "@playwright/test";

const viewportPayload = {
  elements: [
    { type: "node", id: 1, lat: 36.885, lon: 30.705, tags: { shop: "supermarket", name: "Yakın Market", "addr:street": "Atatürk Caddesi" } },
    { type: "node", id: 2, lat: 36.886, lon: 30.706, tags: { amenity: "cafe", name: "Yakın Kafe", "addr:street": "Cumhuriyet Sokak" } },
    { type: "node", id: 3, lat: 36.887, lon: 30.707, tags: { amenity: "atm", name: "Yakın ATM", "addr:street": "Merkez" } },
  ],
};

const dutyPayload = {
  pharmacies: [
    { id: "duty-1", name: "Merkez Nöbetçi Eczane", address: "Kadriye Mahallesi", phone: "02420000000", latitude: 36.8855, longitude: 30.7065, distance_m: 420 },
  ],
};

const newsPayload = {
  items: [
    { id: "n1", title: "Mobil test haberi", url: "https://example.com/news", publishedAt: "2026-09-29T09:00:00.000Z", source: "Test Haber" },
  ],
};

const radioPayload = {
  stations: [
    { id: "r1", name: "Test Radyo", streamUrl: "https://example.com/test.mp3", codec: "MP3", bitrate: 128, liveVerified: true, measuredRank: 1 },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/viewport?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(viewportPayload) }));
  await page.route("**/api/duty?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(dutyPayload) }));
  await page.route("**/api/news?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(newsPayload) }));
  await page.route("**/api/radio?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(radioPayload) }));
});

test("mobile layout and core flows stay inside the device viewport", async ({ page }, testInfo) => {
  await page.goto("/");

  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    touchPoints: navigator.maxTouchPoints,
  }));
  expect(viewport.width).toBeGreaterThanOrEqual(360);
  expect(viewport.width).toBeLessThanOrEqual(430);
  expect(viewport.height).toBeGreaterThanOrEqual(760);
  expect(viewport.touchPoints).toBeGreaterThan(0);

  await expect(page.getByRole("button", { name: "Yakınım ana ekran" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Konumum" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Şu anda sana ne lazım?" })).toBeVisible();

  await assertNoHorizontalOverflow(page);
  await assertBottomNavInsideViewport(page);

  await page.getByRole("button", { name: "Konumumu kullan" }).click();
  await expect(page.getByText("Yakın Market")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Nöbetçi" }).click();
  await expect(page.getByText("Merkez Nöbetçi Eczane")).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Ana navigasyon" });
  await nav.getByRole("button", { name: "Harita" }).click();
  await expect(page.getByRole("button", { name: "Listeye dön" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await nav.getByRole("button", { name: "Haber" }).click();
  await expect(page.getByRole("heading", { name: "Haberler" })).toBeVisible();
  await expect(page.getByText("Mobil test haberi")).toBeVisible();

  await nav.getByRole("button", { name: "Radyo" }).click();
  await expect(page.getByRole("heading", { name: "Radyo" })).toBeVisible();
  await expect(page.getByText("Test Radyo")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await assertBottomNavInsideViewport(page);

  await page.screenshot({ path: testInfo.outputPath("mobile-final.png"), fullPage: false });
});

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertBottomNavInsideViewport(page: import("@playwright/test").Page) {
  const navBox = await page.getByRole("navigation", { name: "Ana navigasyon" }).boundingBox();
  expect(navBox).not.toBeNull();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  if (!navBox) return;
  expect(navBox.x).toBeGreaterThanOrEqual(0);
  expect(navBox.x + navBox.width).toBeLessThanOrEqual(viewportWidth + 1);
  expect(navBox.height).toBeGreaterThanOrEqual(60);
}
