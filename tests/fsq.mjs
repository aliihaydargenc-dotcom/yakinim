import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const supplemental = require("../api/fsq.js");

assert.equal(supplemental.categoryFromFsqProperties({ fsq_category_labels: "Retail > Supermarket" }), "market");
assert.equal(supplemental.categoryFromFsqProperties({ fsq_category_labels: "Dining and Drinking > Cafe, Coffee, and Tea House > Coffee Shop" }), "cafe");
assert.equal(supplemental.categoryFromFsqProperties({ fsq_category_labels: "Transportation > Parking" }), "parking");
assert.equal(supplemental.categoryFromFsqProperties({ fsq_category_labels: "Health and Medicine > Pharmacy" }), "pharmacy");
assert.equal(supplemental.categoryFromFsqProperties({ basic_category: "restaurant" }), "food");
assert.equal(supplemental.categoryFromFsqProperties({ taxonomy: '{"primary":"supermarket"}' }), "market");
assert.equal(supplemental.categoryFromFsqProperties({ fsq_category_labels: "Travel and Transportation > Hotel" }), null);

const tiles = supplemental.buildTileList(36.884, 31.0, 4500);
assert.ok(tiles.length > 4, "Nearby supplemental search should cover multiple vector tiles");
assert.ok(tiles.length <= 36, "Supplemental tile fan-out must stay bounded");
assert.ok(tiles.every((tile) => tile.z === supplemental.TILE_ZOOM));
assert.match(supplemental.PMTILES_URL, /\/places\.pmtiles$/);

console.log("Supplemental places tests PASS: category mapping and bounded nearby tile coverage.");
