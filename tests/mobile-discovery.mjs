import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const app = readFileSync("app.js", "utf8");
const styles = readFileSync("styles.css", "utf8");

function extract(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const signatureEnd = app.indexOf(") {", start);
  let depth = 0, seen = false, end = signatureEnd + 2;
  for (; end < app.length; end += 1) {
    if (app[end] === "{") { depth += 1; seen = true; }
    else if (app[end] === "}") { depth -= 1; if (seen && depth === 0) { end += 1; break; } }
  }
  return app.slice(start, end);
}

const map = {
  zoom: 15,
  getZoom() { return this.zoom; },
  latLngToLayerPoint([lat, lng]) { return { x: Math.round(lng * 10000), y: Math.round(lat * 10000) }; },
};
const context = vm.createContext({
  map, Map, Math,
  categories: [{ id: "market", label: "Market" }],
  selectedPlace: null,
  favorites: [],
  routeStops: [],
  activeCategory: { id: "all", type: "all" },
  isFavorite: () => false,
  placeDataQualityScore: () => 0,
  openingStatus: () => null,
  hasMeaningfulPersonalization: () => false,
  discoverySignals: { categoryViews: {}, placeViews: {}, interactions: 0 },
});
for (const name of ["shouldClusterPlaces", "placeHasSpecificName", "placeDisplayPriority", "markerCollisionDistancePx", "buildMapClusters"]) {
  vm.runInContext(extract(name), context);
}

context.places = [
  { id: "a", name: "A Market", category: "market", lat: 36.8900, lng: 30.7000, distanceKm: .1 },
  { id: "b", name: "B Market", category: "market", lat: 36.8901, lng: 30.7001, distanceKm: .2 },
  { id: "c", name: "C Market", category: "market", lat: 36.9000, lng: 30.7100, distanceKm: 1.2 },
];
let groups = vm.runInContext("buildMapClusters(places)", context);
assert.equal(groups.length, 2, "Screen-colliding pins should cluster even at normal close zoom");
assert.ok(groups.some(group => group.places.length === 2));

map.zoom = 17;
groups = vm.runInContext("buildMapClusters(places)", context);
assert.ok(groups.some(group => group.places.length === 2), "Nearly identical POIs still must not stack at high zoom");
assert.equal(vm.runInContext("markerCollisionDistancePx()", context), 22, "High zoom uses a much tighter cluster radius");

assert.match(app, /map\.createPane\("placeLabels"\)/);
assert.ok(app.includes("window.maplibregl.supported"));
assert.ok(!app.includes('!window.matchMedia("(pointer: coarse)").matches'));
assert.match(app, /pane: "placeLabels"/);
assert.match(app, /direction: "top"/);
assert.match(app, /hitsOtherPin/);
assert.match(app, /placeMarkerById/);
assert.match(app, /applyNearestMarkerState/);
assert.match(app, /openMapQuickCard\(marker\.place/);
assert.match(app, /syncMapControlOffset/);
assert.match(app, /map\.on\("dragstart", handleMapDragStart\)/);
assert.match(app, /yakinimView: "map-place"/);
assert.match(app, /keepSelectedPlaceVisible/);
assert.match(app, /mobileViewport \? 10 : 22/);
assert.match(styles, /has-location\[data-view=map\] \.map-context\{display:none!important\}/);
assert.match(styles, /data-section=nearby\]\[data-view=map\] \.section-nav\{[\s\S]*display:flex!important/);
assert.match(app, /· en yakın/);
assert.match(app, /if \(isMobileLayout\) \{[\s\S]*loadNowDashboard\(\)/);
assert.match(app, /yakinimView: isMobileLayout \? "section-now" : "list"/);
assert.match(styles, /v3\.3 mobile app shell \+ Now home/);
assert.match(app, /history\.pushState\(\{ yakinimView: "map-detail", yakinimSection: "nearby" \}/);
assert.doesNotMatch(app, /pointer: coarse\), \(prefers-reduced-motion/);

console.log("Mobile discovery tests PASS: collision clustering, separate label pane, Now-home mobile navigation and touch motion.");
