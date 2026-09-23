import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const app = readFileSync("app.js", "utf8");
function extract(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  let depth = 0, seen = false, end = start;
  for (; end < app.length; end += 1) {
    if (app[end] === "{") { depth += 1; seen = true; }
    else if (app[end] === "}") { depth -= 1; if (seen && depth === 0) { end += 1; break; } }
  }
  return app.slice(start, end);
}
const map = { zoom: 13, getZoom() { return this.zoom; }, latLngToLayerPoint([lat, lng]) { return { x: Math.round(lng * 1000), y: Math.round(lat * 1000) }; } };
const context = vm.createContext({ map, Map, Math, MAP_CLUSTER_MIN_COUNT: 8, MAP_CLUSTER_MAX_ZOOM: 14 });
vm.runInContext(extract("shouldClusterPlaces"), context);
vm.runInContext(extract("buildMapClusters"), context);
context.places = Array.from({ length: 8 }, (_, index) => ({ id: String(index), lat: 36.8900 + (index < 4 ? 0.00001 : 0.2), lng: 30.7000 + (index < 4 ? 0.00001 : 0.2) }));
assert.equal(vm.runInContext("shouldClusterPlaces(places)", context), true);
const clustered = vm.runInContext("buildMapClusters(places)", context);
assert.ok(clustered.length < context.places.length, "Low zoom should reduce visible markers");
map.zoom = 15;
assert.equal(vm.runInContext("shouldClusterPlaces(places)", context), false);
assert.equal(vm.runInContext("buildMapClusters(places).length", context), 8, "High zoom should show individual places");
assert.match(app, /setView\(isMobileLayout \? "map" : "list"/, "Mobile starts map-first");
assert.match(app, /history\.pushState\(\{ yakinimView: "map-detail" \}/, "Place detail owns a back-stack step");
assert.match(app, /history\.go\(-2\)/, "Map tap can collapse detail and open sheet to peek");
assert.match(app, /mapBottomPadding\(\)/, "Map framing accounts for the live sheet height");
assert.doesNotMatch(app, /pointer: coarse\), \(prefers-reduced-motion/, "Touch devices must not disable product motion");
console.log("Mobile discovery tests PASS: map-first, clustering, back-stack, motion and sheet-aware framing.");
