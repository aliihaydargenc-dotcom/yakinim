import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, index, sw, manifestText, vercelText] = await Promise.all([
  readFile("app.js", "utf8"),
  readFile("index.html", "utf8"),
  readFile("sw.js", "utf8"),
  readFile("manifest.webmanifest", "utf8"),
  readFile("vercel.json", "utf8"),
]);

const manifest = JSON.parse(manifestText);
const vercel = JSON.parse(vercelText);

assert.match(app, /APP_VERSION = "2\.6\.0"/);
for (const id of ["duty", "market", "greengrocer", "bakery", "pharmacy", "atm", "hospital", "fuel", "parking", "food", "favorites"]) {
  assert.match(app, new RegExp(`id: "${id}"`));
}
assert.match(app, /LAST_LOCATION_KEY/);
assert.match(app, /VIEWPORT_CACHE_PREFIX/);
assert.match(app, /bootstrapLocationDiscovery/);
assert.match(app, /handleMapMoveEnd/);
assert.match(app, /buildViewportEnvelope/);
assert.match(app, /fetchViewportPayload/);
assert.match(app, /renderActiveCategoryFromBundle/);
assert.match(app, /persistLastLocation/);
assert.doesNotMatch(app, /radiusSelect/);
assert.match(app, /SHEET_STATES = \["peek", "half", "expanded"\]/);
assert.match(app, /updateResultSummary/);
assert.match(app, /nearestBadge\.hidden/);
assert.match(app, /startSheetGesture/);
assert.match(app, /endSheetGesture/);
assert.match(app, /updateNearestAction/);
assert.match(app, /DISCOVERY_SIGNALS_KEY/);
assert.match(app, /rankDiscoveryCategories/);
assert.match(app, /renderDiscoveryHub/);
assert.match(app, /recordCategorySignal/);
assert.match(app, /buildDirectionsUrl/);
assert.match(app, /MAP_STYLE_URL = "https:\/\/tiles\.openfreemap\.org\/styles\/positron"/);
assert.match(app, /getCurrentPosition/);
assert.match(app, /getGeolocationPermissionState/);
assert.match(app, /enableManualLocationMode/);
assert.match(app, /handleManualMapClick/);
assert.match(app, /MOTION = Object\.freeze/);
assert.match(app, /buildMapClusters/);
assert.match(app, /addPlaceCluster/);
assert.match(app, /map-detail/);
assert.match(app, /Veri: Eczane Adresi/);

assert.match(index, /OpenFreeMap/);
assert.match(index, /content="light only"/);
assert.match(index, /OpenMapTiles/);
assert.match(index, /OpenStreetMap/);
assert.match(index, /rel="manifest"/);
assert.match(index, /leaflet@1\.9\.4/);
assert.match(index, /id="map"/);
assert.match(index, /id="mapContext"/);
assert.match(index, /id="mapContextLabel"/);
assert.match(index, /id="results"/);
assert.match(index, /id="sheetToggle"/);
assert.match(index, /id="resultSummary"/);
assert.match(index, /nearest-badge/);
assert.match(index, /id="nearestAction"/);
assert.match(index, /id="nearestActionMeta"/);
assert.match(index, /id="manualLocationButton"/);
assert.match(index, /id="discoveryHub"/);
assert.match(index, /id="discoveryCards"/);
assert.match(index, /id="discoverySummary"/);
assert.match(index, /viewport-live-hint/);
assert.doesNotMatch(index, /id="radiusSelect"/);

assert.equal(manifest.name, "Yakınımda");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");

assert.match(sw, /networkFirst/);
assert.match(sw, /cache: "no-store"/);
assert.match(sw, /LEAFLET_ORIGIN/);
assert.match(sw, /yakinimda-shell-v23/);
assert.doesNotMatch(sw, /tile\.openstreetmap\.org/);

assert.ok(Array.isArray(vercel.headers));
assert.equal(vercel.headers.length, 1);
assert.ok(vercel.functions["api/viewport.js"]);
assert.equal(vercel.functions["api/viewport.js"].maxDuration, 30);
const headerNames = new Set(vercel.headers[0].headers.map((item) => item.key));
for (const name of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]) {
  assert.ok(headerNames.has(name), `Missing Vercel header: ${name}`);
}

console.log("Yakınımda smoke tests: PASS");
