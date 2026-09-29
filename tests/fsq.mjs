import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const fsq = require("../api/fsq.js");

assert.equal(fsq.categoryFromFsqProperties({ fsq_category_labels: "Retail > Supermarket" }), "market");
assert.equal(fsq.categoryFromFsqProperties({ fsq_category_labels: "Dining and Drinking > Cafe, Coffee, and Tea House > Coffee Shop" }), "cafe");
assert.equal(fsq.categoryFromFsqProperties({ fsq_category_labels: "Transportation > Parking" }), "parking");
assert.equal(fsq.categoryFromFsqProperties({ fsq_category_labels: "Health and Medicine > Pharmacy" }), "pharmacy");
assert.equal(fsq.categoryFromFsqProperties({ fsq_category_labels: "Travel and Transportation > Hotel" }), null);

const tiles = fsq.buildTileList(36.884, 31.0, 4500);
assert.ok(tiles.length > 4, "Nearby FSQ search should cover multiple vector tiles");
assert.ok(tiles.length <= 36, "FSQ tile fan-out must stay bounded");
assert.ok(tiles.every((tile) => tile.z === fsq.TILE_ZOOM));
assert.match(fsq.PMTILES_URL, /fsq-os-places\.pmtiles$/);

console.log("FSQ tests PASS: category mapping and bounded nearby tile coverage.");
