import { expect, test } from "@playwright/test";

const viewportPayload = {
  elements: [
    { type: "node", id: 1, lat: 36.885, lon: 30.705, tags: { shop: "supermarket", name: "Yakın Market", "addr:street": "Atatürk Caddesi" } },
    { type: "node", id: 2, lat: 36.886, lon: 30.706, tags: { amenity: "cafe", name: "Yakın Kafe", "addr:street": "Cumhuriyet Sokak" } },
    { type: "node", id: 3, lat: 36.887, lon: 30.707, tags: { amenity: "atm", name: "Yakın ATM", "addr:street": "Merkez" } },
    { type: "node", id: 4, lat: 36.8872, lon: 30.7072, tags: { shop: "supermarket", "addr:street": "İsimsiz Sokak" } },
    { type: "node", id: 5, lat: 36.888, lon: 30.708, tags: { shop: "supermarket", brand: "Migros", "addr:street": "Serik Caddesi" } },
    { type: "way", id: 6, center: { lat: 36.88801, lon: 30.70801 }, tags: { shop: "supermarket", brand: "Migros", "addr:street": "Serik Caddesi" } },
    { type: "way", id: 7, center: { lat: 36.889, lon: 30.709 }, tags: { amenity: "parking" } },
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

const EXPECTED_VIEWPORTS: Record<string, { width: number; height: number }> = {
  "iphone-14-webkit-390x844": { width: 390, height: 844 },
  "pixel-7-chromium-412x915": { width: 412, height: 915 },
  "compact-android-360x800": { width: 360, height: 800 },
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
  }));
  const expected = EXPECTED_VIEWPORTS[testInfo.project.name];
  expect(expected, `Unknown mobile project: ${testInfo.project.name}`).toBeTruthy();
  expect(viewport).toEqual(expected);

  await expect(page.getByRole("button", { name: "Yakınım ana ekran" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Konumum", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Şu anda sana ne lazım?" })).toBeVisible();

  await assertNoHorizontalOverflow(page);
  await assertBottomNavInsideViewport(page);
  await assertCategoryRailIsMobileScrollable(page);
  await page.screenshot({ path: testInfo.outputPath("mobile-home.png"), fullPage: false });

  const viewportRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/viewport?")) viewportRequests.push(request.url());
  });
  await page.getByRole("button", { name: "Konumumu kullan" }).click();
  await expect.poll(() => viewportRequests.length).toBe(9);
  assertSegmentedNearbyCoverage(viewportRequests);

  await expect(page.getByText("Yakın Market")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Market", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Migros", exact: true })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Otopark", exact: true })).toHaveCount(1);

  const sortGroup = page.getByRole("group", { name: "Sonuç sıralaması" });
  await sortGroup.getByRole("button", { name: "A-Z" }).click();
  await expect(sortGroup.getByRole("button", { name: "A-Z" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".place-card h3").first()).toHaveText("Migros");
  await sortGroup.getByRole("button", { name: "Yakın" }).click();
  await expect(sortGroup.getByRole("button", { name: "Yakın" })).toHaveAttribute("aria-pressed", "true");

  await assertNoHorizontalOverflow(page);

  const nav = page.getByRole("navigation", { name: "Ana navigasyon" });
  await nav.getByRole("button", { name: "Harita", exact: true }).click();
  await expect(page.getByRole("button", { name: "Listeye dön" })).toBeVisible();
  await expect(page.locator(".place-marker.is-cluster").first()).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await nav.getByRole("button", { name: "Yakınım", exact: true }).click();
  await page.getByRole("button", { name: "Nöbetçi", exact: true }).click();
  await expect(page.getByText("Merkez Nöbetçi Eczane")).toBeVisible();

  await nav.getByRole("button", { name: "Harita", exact: true }).click();
  await expect(page.getByRole("button", { name: "Listeye dön" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await nav.getByRole("button", { name: "Haber", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Haberler" })).toBeVisible();
  await expect(page.getByText("Mobil test haberi")).toBeVisible();

  await nav.getByRole("button", { name: "Radyo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Radyo" })).toBeVisible();
  await expect(page.getByText("Test Radyo")).toBeVisible();
  await page.locator(".station-card").filter({ hasText: "Test Radyo" }).click();
  await expect(page.getByRole("complementary", { name: "Radyo oynatıcı" })).toBeVisible();
  await expect(page.locator(".global-radio-player").getByText("Test Radyo")).toBeVisible();

  await nav.getByRole("button", { name: "Yakınım", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Şu anda sana ne lazım?" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Radyo oynatıcı" })).toBeVisible();

  await assertNoHorizontalOverflow(page);
  await assertBottomNavInsideViewport(page);

  await page.getByRole("button", { name: "Radyo oynatıcıyı kapat" }).click();
  await expect(page.getByRole("complementary", { name: "Radyo oynatıcı" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("mobile-final.png"), fullPage: false });
});

function assertSegmentedNearbyCoverage(requestUrls: string[]) {
  expect(requestUrls).toHaveLength(9);
  const boxes = requestUrls.map((requestUrl) => {
    const url = new URL(requestUrl);
    return {
      south: Number(url.searchParams.get("south")),
      west: Number(url.searchParams.get("west")),
      north: Number(url.searchParams.get("north")),
      east: Number(url.searchParams.get("east")),
    };
  });

  expect(Math.max(...boxes.map((box) => box.north)) - Math.min(...boxes.map((box) => box.south))).toBeGreaterThanOrEqual(0.089);
  expect(Math.max(...boxes.map((box) => box.east)) - Math.min(...boxes.map((box) => box.west))).toBeGreaterThanOrEqual(0.109);
  boxes.forEach((box) => {
    expect(box.north - box.south).toBeLessThanOrEqual(0.031);
    expect(box.east - box.west).toBeLessThanOrEqual(0.038);
  });
}

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

async function assertCategoryRailIsMobileScrollable(page: import("@playwright/test").Page) {
  const rail = page.locator(".category-rail");
  const metrics = await rail.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
}
