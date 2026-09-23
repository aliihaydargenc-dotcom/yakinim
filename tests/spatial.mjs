import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");

function extract(name) {
  const candidates = [`function ${name}(`, `async function ${name}(`];
  let start = -1;
  for (const candidate of candidates) {
    start = app.indexOf(candidate);
    if (start >= 0) break;
  }
  assert.notEqual(start, -1, `${name} must exist`);
  const signatureEnd = app.indexOf(") {", start);
  let depth = 0, seen = false, end = signatureEnd + 2;
  for (; end < app.length; end += 1) {
    if (app[end] === "{") { depth += 1; seen = true; }
    else if (app[end] === "}") { depth -= 1; if (seen && depth === 0) { end += 1; break; } }
  }
  return app.slice(start, end);
}

const context = vm.createContext({
  Map,
  Math,
  Date,
  Number,
  SPATIAL_CELL_DEGREES: 0.01,
  SPATIAL_POOL_LIMIT: 4,
  SPATIAL_CELL_FRESH_MS: 4 * 60 * 60 * 1000,
  SPATIAL_CELL_STALE_MS: 24 * 60 * 60 * 1000,
  spatialPoiPool: new Map(),
  spatialCellState: new Map(),
  osmCategories: [{ id: "market" }, { id: "food" }],
});

for (const name of [
  "spatialCellKey",
  "spatialCellsForEnvelope",
  "pointInSpatialCell",
  "mergePlacesIntoSpatialPool",
  "bundleFromSpatialPool",
  "spatialCellsAreFresh",
  "spatialCellsHaveCoverage",
]) vm.runInContext(extract(name), context);

context.envelope = { south: 36.88, west: 30.69, north: 36.90, east: 30.71 };
const cells = vm.runInContext("spatialCellsForEnvelope(envelope)", context);
assert.equal(cells.length, 4);
assert.equal(cells[0].key, "3688:3069");

context.rows = [
  { id: "osm:node:1", category: "market", name: "A", lat: 36.885, lng: 30.695 },
  { id: "osm:node:2", category: "food", name: "B", lat: 36.895, lng: 30.705 },
  { id: "osm:node:1", category: "market", name: "A güncel", lat: 36.885, lng: 30.695 },
];
vm.runInContext("mergePlacesIntoSpatialPool(rows)", context);
assert.equal(context.spatialPoiPool.size, 2);
assert.equal(context.spatialPoiPool.get("osm:node:1").name, "A güncel");
const bundle = vm.runInContext("bundleFromSpatialPool()", context);
assert.equal(bundle.market.length, 1);
assert.equal(bundle.food.length, 1);

const now = Date.now();
for (const cell of cells) context.spatialCellState.set(cell.key, { savedAt: now });
context.cells = cells;
assert.equal(vm.runInContext("spatialCellsAreFresh(cells)", context), true);
assert.equal(vm.runInContext("spatialCellsHaveCoverage(cells)", context), true);

console.log("Spatial tests PASS: cell coverage, OSM-id dedupe and persistent POI pool behavior.");
