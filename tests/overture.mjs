import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const overture = require("../api/overture.js");

assert.equal(overture.categoryFromOvertureProperties({ taxonomy: '{"primary":"supermarket","hierarchy":["retail","supermarket"]}' }), "market");
assert.equal(overture.categoryFromOvertureProperties({ taxonomy: '{"primary":"coffee_shop","hierarchy":["dining","cafe","coffee_shop"]}' }), "cafe");
assert.equal(overture.categoryFromOvertureProperties({ basic_category: "parking" }), "parking");
assert.equal(overture.categoryFromOvertureProperties({ taxonomy: '{"primary":"pharmacy","hierarchy":["health","pharmacy"]}' }), "pharmacy");
assert.equal(overture.categoryFromOvertureProperties({ basic_category: "hotel" }), null);
assert.equal(overture.primaryName({ "@name": "Kadriye Test" }), "Kadriye Test");
assert.equal(overture.primaryName({ names: '{"primary":"Fallback Name"}' }), "Fallback Name");
assert.equal(overture.addressFromProperties({ addresses: '[{"freeform":"Atatürk Cd. 10","locality":"Serik","region":"Antalya"}]' }), "Atatürk Cd. 10, Serik, Antalya");
assert.equal(overture.phoneFromProperties({ phones: '["+902421234567"]' }), "+902421234567");

const tiles = overture.buildTileList(36.884, 31.0, 4500);
assert.ok(tiles.length > 4, "Nearby Overture search should cover multiple vector tiles");
assert.ok(tiles.length <= 36, "Overture tile fan-out must stay bounded");
assert.ok(tiles.every((tile) => tile.z === overture.TILE_ZOOM));
assert.match(overture.PMTILES_URL, /\/2026-09-23\.1\/places\.pmtiles$/);
assert.equal(overture.MIN_CONFIDENCE, 0.55);

console.log("Overture tests PASS: real schema parsing, category mapping and bounded tile coverage.");
assert.equal(overture.categoryFromOvertureProperties({name:'Medstar Muratpaşa Antalya',basic_category:'food_and_beverage_store',taxonomy:'{"primary":"grocery_store","hierarchy":["shopping","grocery_store"]}'}),null,'Conflicting health/grocery record must not become a market');
assert.equal(overture.categoryFromOvertureProperties({taxonomy:'{"primary":"medical_center"}'}),'hospital');
assert.equal(overture.categoryFromOvertureProperties({taxonomy:'{"primary":"convenience_store"}'}),'market');
assert.equal(overture.categoryFromOvertureProperties({name:'Şok',taxonomy:'{"primary":"grocery_store"}'}),'market');
assert.equal(overture.addressFromProperties({addresses:JSON.stringify([{freeform:'Yıldız, Muratpaşa, Antalya',locality:'Muratpaşa',region:'Antalya'}])}),'Yıldız, Muratpaşa, Antalya');
