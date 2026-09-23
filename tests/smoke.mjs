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

assert.match(app, /APP_VERSION = "2\.1\.1"/);
for (const id of ["duty", "market", "greengrocer", "bakery", "pharmacy", "atm", "hospital", "fuel", "parking", "food", "favorites"]) {
  assert.match(app, new RegExp(`id: "${id}"`));
}

assert.match(app, /https:\/\/eczaneadresi\.com\/api\/public\/v1\/nearest-pharmacies/);
assert.match(app, /const radiusKm = Number\(prefs\.radius\) \/ 1000;/);
assert.doesNotMatch(app, /radiusKm = Number\(prefs\.radius\) \/ 1000 \+ 0\.25/);
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
assert.match(app, /fitResultsOnMap/);
assert.match(app, /son kaydedilen veri gösteriliyor/);
assert.match(app, /Veri: Eczane Adresi/);
assert.match(index, /OpenFreeMap/);
assert.match(index, /content="light only"/);
assert.match(index, /OpenMapTiles/);
assert.match(index, /OpenStreetMap/);

assert.match(index, /rel="manifest"/);
assert.match(index, /leaflet@1\.9\.4/);
assert.match(index, /id="map"/);
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
assert.match(index, /maplibre-gl@5/);
assert.match(index, /OpenFreeMap/);

assert.equal(manifest.name, "Yakınımda");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");

assert.match(sw, /networkFirst/);
assert.match(sw, /cache: "no-store"/);
assert.doesNotMatch(sw, /staleWhileRevalidate/);
assert.match(sw, /LEAFLET_ORIGIN/);
assert.match(sw, /yakinimda-shell-v13/);
assert.doesNotMatch(sw, /tile\.openstreetmap\.org/);

assert.ok(Array.isArray(vercel.headers));
assert.equal(vercel.headers.length, 1);
assert.equal(vercel.headers[0].source, "/(.*)");
const headerNames = new Set(vercel.headers[0].headers.map((item) => item.key));
for (const name of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]) {
  assert.ok(headerNames.has(name), `Missing Vercel header: ${name}`);
}

console.log("Yakınımda smoke tests: PASS");

