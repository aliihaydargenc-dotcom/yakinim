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
    // bs-local.com is HTTP, so use a saved manual origin; GPS permission tests
    // run separately on the secure localhost context.
    localStorage.setItem("yakinim:v2:last-location", JSON.stringify({lat:36.884,lng:30.704,mode:"manual",savedAt:Date.now()}));
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

      if (url.includes("tiles.openfreemap.org/styles/liberty")) return json({version:8,sources:{},layers:[{id:"background",type:"background",paint:{"background-color":"#f7f5f1"}}]});
      if (url.includes("/api/location?")) return json({label:"Antalya"});
      if (url.includes("/api/nearby?")) return json({elements:[],places:[]});
      if (url.includes("/api/fishing?")) return json({hourly:[],daily:[]});
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

  await expect(page.locator(".model-header")).toContainText("yakınım");
  await expect(page.getByRole("button", {name:"Konumumu bul",exact:true})).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await expect(page.locator(".place-row").filter({hasText:"Yakın Market"})).toBeVisible();
  await expect(page.locator(".place-row").filter({hasText:"Overture Test Kafe"})).toBeVisible();
  await activateMobile(page.getByRole("button", {name:"Tüm kategorileri aç",exact:true}));
  await activateMobile(page.getByRole("dialog", {name:"Tüm kategoriler",exact:true}).getByRole("button", {name:"Eczane",exact:true}));
  await activateMobile(page.getByRole("button", {name:"Nöbetçi",exact:true}));
  await expect(page.locator(".place-row")).toContainText("Merkez Nöbetçi Eczane");
  await activateMobile(page.getByRole("button", {name:"Harita",exact:true}));
  await expect(page.getByRole("button", {name:/Liste ·/})).toBeVisible();
  await expect(page.locator(".map-stage")).toHaveAttribute("data-map-renderer", "maplibre-layered-discovery");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator(".user-marker")).toBeVisible();
  await activateMobile(page.getByRole('button',{name:/Haritadaki yerler/}));
  const row=page.locator('.map-visible-row').filter({hasText:'Merkez Nöbetçi Eczane'});
  await expect(row).toBeVisible();
  const hit=await row.boundingBox();expect(hit).not.toBeNull();expect(hit!.height).toBeGreaterThanOrEqual(44);
  await activateMobile(row);
  await expect(page.locator('.map-place-sheet')).toContainText('Merkez Nöbetçi Eczane');
  await expect(page.locator('.stable-place-marker')).toHaveCount(0);
  await assertMapChromeDoesNotOverlap(page);
  await page.screenshot({path:testInfo.outputPath('browserstack-map.png')});
  await activateMobile(page.getByRole('button',{name:'Yer kartını kapat',exact:true}));
  const nav = page.locator(".shell-nav--mobile");
  await activateMobile(nav.getByRole("button", {name:"Diğer",exact:true}));
  await activateMobile(page.getByRole("button", {name:/^Haberler/}));
  await expect(page.getByText("Gerçek cihaz test haberi",{exact:true})).toBeVisible();
  await activateMobile(nav.getByRole("button", {name:"Diğer",exact:true}));
  await activateMobile(page.getByRole("button", {name:/^Radyo/}));
  await expect(page.locator('.station-card')).toContainText("Gerçek Cihaz Test Radyosu");
  await activateMobile(page.locator(".station-card").filter({hasText:"Gerçek Cihaz Test Radyosu"}));
  await expect(page.locator(".global-radio-player")).toBeVisible();
  await activateMobile(nav.getByRole("button", {name:"Keşfet",exact:true}));
  await expect(page.locator(".global-radio-player")).toBeVisible();

  await assertNoHorizontalOverflow(page);
  await assertBottomNavInsideViewport(page);
  await page.screenshot({ path: testInfo.outputPath("browserstack-real-mobile.png"), fullPage: false });
});

async function activateMobile(locator: import("@playwright/test").Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.click({ timeout: 60_000 });
}

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertBottomNavInsideViewport(page: import("@playwright/test").Page) {
  const navBox = await page.locator(".shell-nav--mobile").boundingBox();
  expect(navBox).not.toBeNull();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  if (!navBox) return;
  expect(navBox.x).toBeGreaterThanOrEqual(0);
  expect(navBox.x + navBox.width).toBeLessThanOrEqual(viewportWidth + 1);
  expect(navBox.height).toBeGreaterThanOrEqual(60);
}

async function assertMapChromeDoesNotOverlap(page: import("@playwright/test").Page) {
  const header = await page.locator(".model-header").boundingBox();
  const dock = await page.locator(".map-workspace .category-rail").boundingBox();
  const canvas = await page.locator(".maplibregl-canvas").boundingBox();
  const nav = await page.locator('.shell-nav--mobile').boundingBox();
  expect(header && dock && canvas && nav).toBeTruthy();
  if (!header || !dock || !canvas || !nav) return;
  expect(dock.y).toBeGreaterThanOrEqual(header.y + header.height - 2);
  expect(canvas.y).toBeGreaterThanOrEqual(dock.y + dock.height - 2);
  expect(canvas.y + canvas.height).toBeLessThanOrEqual(nav.y + 2);
}
