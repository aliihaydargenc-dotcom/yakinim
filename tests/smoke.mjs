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

assert.match(app, /APP_VERSION = "2\.11\.0"/);
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
assert.doesNotMatch(app, /if \(permissionState === "denied"\)/);
assert.match(app, /one authoritative geolocation request/);
assert.match(app, /locationZoomForAccuracy/);
assert.match(app, /applyNearestMarkerState/);
assert.match(app, /openMapQuickCard/);
assert.match(app, /dismissMapQuickCard/);
assert.match(app, /sharePlace/);
assert.match(app, /keepSelectedPlaceVisible/);
assert.match(app, /history\.pushState\(\{[\s\S]*yakinimView: "map-place"/);
assert.match(app, /document\.body\.dataset\.sheetState = nextState/);
assert.match(app, /if \(document\.body\.dataset\.view === "map"\) openMapQuickCard\(place, main\)/);
assert.match(app, /recenterOnUser/);
assert.match(app, /formatWalkingTime/);
assert.match(app, /openingStatus/);
assert.match(app, /rankDiscoveryPlaces/);
assert.match(app, /placeDataQualityScore/);
assert.match(app, /hasMeaningfulPersonalization/);
assert.match(app, /recordPlaceSignal/);
assert.match(app, /supportsVectorBaseMap/);
assert.ok(app.includes("window.maplibregl.supported"));
assert.match(app, /switchToRasterBaseMap/);
assert.doesNotMatch(app, /pointer: coarse.*mobile raster mode/);
assert.doesNotMatch(app, /Promise\.race\(\[fastPromise, accuratePromise\]\)/);
assert.doesNotMatch(app, /radiusSelect/);
assert.match(app, /Veri: Eczane Adresi/);
assert.match(app, /Veri: OpenStreetMap · canlı harita havuzu/);

assert.match(index, /OpenFreeMap/);
assert.match(index, /viewport-live-hint/);
assert.doesNotMatch(index, /id="radiusSelect"/);
assert.doesNotMatch(index, /map-context-chevron/);
assert.match(index, /id="mapSearch"/);
assert.match(index, /id="recenterButton"/);
assert.match(index, /id="mapQuickCard"/);
assert.match(index, /id="quickShare"/);
assert.match(index, /Öne çıkanlar/);
assert.match(styles, /v2\.7\.1 mobile cartography density pass/);
assert.match(styles, /v2\.7 spatial pool \+ collision-aware map labels/);
assert.match(styles, /v2\.8 mobile vector basemap reliability/);
assert.match(styles, /v2\.8\.1 final map state semantics/);
assert.match(styles, /v2\.9 standard mobile map chrome \+ quick place card/);
assert.match(styles, /v2\.9\.1 map interaction stabilization/);
assert.match(styles, /v2\.10 single-surface map interaction model/);
assert.match(styles, /v2\.11 product-value pass: compact list \+ discovery brain/);
assert.doesNotMatch(styles, /is-nearest\{[^}]*background:var\(--accent\)/s);
assert.ok(styles.includes("leaflet-tile.base-map-tile"));
assert.match(styles, /leaflet-placeLabels-pane/);
assert.match(styles, /leaflet-tooltip-top\.place-label/);

assert.equal(manifest.name, "Yakınımda");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");

assert.match(sw, /networkFirst/);
assert.match(sw, /cache: "no-store"/);
assert.match(sw, /yakinimda-shell-v33/);

assert.ok(Array.isArray(vercel.headers));
assert.ok(vercel.functions["api/viewport.js"]);
assert.equal(vercel.functions["api/viewport.js"].maxDuration, 30);

console.log("Yakınımda smoke tests: PASS");
