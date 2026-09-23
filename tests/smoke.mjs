import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, index, styles, sw, manifestText, vercelText] = await Promise.all([
  readFile("app.js", "utf8"),
  readFile("index.html", "utf8"),
  readFile("styles.css", "utf8"),
  readFile("sw.js", "utf8"),
  readFile("manifest.webmanifest", "utf8"),
  readFile("vercel.json", "utf8"),
]);

const manifest = JSON.parse(manifestText);
const vercel = JSON.parse(vercelText);

assert.match(app, /APP_VERSION = "2\.7\.2"/);
for (const id of ["duty", "market", "greengrocer", "bakery", "pharmacy", "atm", "hospital", "fuel", "parking", "food", "favorites"]) {
  assert.match(app, new RegExp(`id: "${id}"`));
}
for (const contract of [
  "LAST_LOCATION_KEY",
  "SPATIAL_CELL_CACHE_PREFIX",
  "spatialPoiPool",
  "spatialCellState",
  "buildSpatialPrefetchEnvelope",
  "spatialCellsForEnvelope",
  "mergePlacesIntoSpatialPool",
  "persistSpatialCells",
  "activeViewportRequest",
  "placeMarkerById",
  "markerCollisionDistancePx",
  "placeDisplayPriority",
  "placeLabels",
]) assert.match(app, new RegExp(contract));

assert.match(app, /activeViewportRequest\?\.controller\.abort\(\)/);
assert.match(app, /pane: "placeLabels"/);
assert.match(app, /direction: "top"/);
assert.match(app, /Do not gate geolocation behind Permissions API/);
assert.doesNotMatch(app, /if \(permissionState === "denied"\)/);
assert.doesNotMatch(app, /radiusSelect/);
assert.match(app, /Veri: Eczane Adresi/);
assert.match(app, /Veri: OpenStreetMap · canlı harita havuzu/);

assert.match(index, /OpenFreeMap/);
assert.match(index, /viewport-live-hint/);
assert.doesNotMatch(index, /id="radiusSelect"/);
assert.doesNotMatch(index, /map-context-chevron/);
assert.match(styles, /v2\.7\.1 mobile cartography density pass/);
assert.match(styles, /v2\.7 spatial pool \+ collision-aware map labels/);
assert.match(styles, /leaflet-placeLabels-pane/);
assert.match(styles, /leaflet-tooltip-top\.place-label/);

assert.equal(manifest.name, "Yakınımda");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");

assert.match(sw, /networkFirst/);
assert.match(sw, /cache: "no-store"/);
assert.match(sw, /yakinimda-shell-v26/);

assert.ok(Array.isArray(vercel.headers));
assert.ok(vercel.functions["api/viewport.js"]);
assert.equal(vercel.functions["api/viewport.js"].maxDuration, 30);

console.log("Yakınımda smoke tests: PASS");
