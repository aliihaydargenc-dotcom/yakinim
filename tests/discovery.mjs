import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");
const context = vm.createContext({
  window: { matchMedia: () => ({ matches: false }) },
  Number, Math, Date, String, Set, Map,
});
vm.runInContext(app.slice(0, app.indexOf("const prefs =")), context);

function extract(name) {
  const starts = [`function ${name}(`, `async function ${name}(`];
  let start = -1;
  for (const candidate of starts) {
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

const stubs = {
  normalizeSearchValue: value => String(value || "").trim().toLocaleLowerCase("tr"),
  placeHasSpecificName: place => Boolean(place?.name && place.name !== "Market"),
  openingStatus: (hours) => hours === "24/7" ? { state: "open", label: "Açık 24 saat" } : hours === "closed" ? { state: "closed", label: "Kapalı" } : null,
  formatWalkingTime: km => `~${Math.max(1, Math.ceil(km * 12.5))} dk yürüme`,
};
Object.assign(context, stubs);
for (const name of [
  "categoryForOsmElement",
  "distanceBetween",
  "hasUsefulAddress",
  "placeDataQualityScore",
  "personalizationSignalStrength",
  "hasMeaningfulPersonalization",
  "discoveryBrandKey",
  "discoveryContextBoost",
  "parseDiscoveryQuery",
  "discoveryScore",
  "discoveryReason",
  "rankDiscoveryPlaces",
]) vm.runInContext(extract(name), context);

assert.equal(vm.runInContext("categories[0].id", context), "all");
for (const [tags, expected] of [
  [{ amenity: "cafe" }, "cafe"],
  [{ amenity: "restaurant" }, "food"],
  [{ leisure: "park" }, "park"],
  [{ shop: "mall" }, "shopping"],
  [{ amenity: "pharmacy" }, "pharmacy"],
  [{ shop: "supermarket" }, "market"],
]) {
  context.sample = { tags };
  assert.equal(vm.runInContext("categoryForOsmElement(sample).id", context), expected);
}

context.signals = { categoryViews: { market: 1 }, placeViews: {}, lastCategory: "market", interactions: 1 };
context.favs = [];
assert.equal(vm.runInContext("hasMeaningfulPersonalization(signals, favs)", context), false);
context.signals = { categoryViews: { market: 5 }, placeViews: {}, lastCategory: "market", interactions: 5 };
assert.equal(vm.runInContext("hasMeaningfulPersonalization(signals, favs)", context), true);

context.bundle = {
  market: [
    { id: "m1", category: "market", name: "BİM", address: "Yıldız Cd 1", openingHours: "24/7", phone: "1", lat: 36.89, lng: 30.70, distanceKm: .2 },
    { id: "m2", category: "market", name: "BİM", address: "", openingHours: "", phone: "", lat: 36.891, lng: 30.701, distanceKm: .25 },
  ],
  cafe: [
    { id: "c1", category: "cafe", name: "Kahve Evi", address: "Cadde 4", openingHours: "24/7", phone: "", lat: 36.892, lng: 30.702, distanceKm: .35 },
  ],
  food: [
    { id: "f1", category: "food", name: "Lokanta", address: "Sokak 8", openingHours: "closed", phone: "", lat: 36.893, lng: 30.703, distanceKm: .1 },
  ],
};
context.discoverySignals = { categoryViews: {}, placeViews: {}, lastCategory: null, interactions: 0 };
context.CATEGORY_QUERY_ALIASES = {
  cafe: ["kafe", "kahve", "coffee"],
  food: ["yemek", "restoran", "lokanta", "fast food"],
  market: ["market", "süpermarket", "supermarket"],
  pharmacy: ["eczane"],
};
context.favorites = [];
context.fixedNow = new Date("2026-09-21T10:00:00");
context.result = vm.runInContext("rankDiscoveryPlaces(bundle, discoverySignals, favorites, fixedNow, 3)", context);
assert.equal(context.result.length, 3);
assert.notEqual(context.result[0].place.id, "f1", "A closed place should not win only because it is nearer");
assert.equal(context.result.some(item => item.place.id === "m1"), true);
assert.equal(context.result.some(item => item.place.id === "c1"), true);
assert.ok(new Set(context.result.map(item => item.place.category)).size >= 2, "Recommendations should preserve category diversity");
assert.ok(context.result.find(item => item.place.id === "c1").contextScore > 0, "Morning context should boost cafe relevance");

context.discoverySignals = { categoryViews: { cafe: 6 }, placeViews: { c1: 2 }, lastCategory: "cafe", interactions: 8 };
context.result = vm.runInContext("rankDiscoveryPlaces(bundle, discoverySignals, favorites, fixedNow, 3)", context);
const cafe = context.result.find(item => item.place.id === "c1");
assert.equal(cafe.personalized, true);
assert.equal(cafe.reason, "Şu an açık");
assert.doesNotMatch(cafe.reason, /dk yürüme/);

context.q1 = vm.runInContext('parseDiscoveryQuery("açık market")', context);
assert.equal(context.q1.categoryId, "market");
assert.equal(context.q1.openOnly, true);
context.q2 = vm.runInContext('parseDiscoveryQuery("10 dk içinde kahve")', context);
assert.equal(context.q2.categoryId, "cafe");
assert.equal(context.q2.maxWalkMinutes, 10);
context.q3 = vm.runInContext('parseDiscoveryQuery("en yakın eczane")', context);
assert.equal(context.q3.categoryId, "pharmacy");
assert.equal(context.q3.nearestFirst, true);
context.morning = new Date("2026-09-21T08:00:00");
assert.ok(vm.runInContext('discoveryContextBoost({category:"cafe"}, morning)', context) > 0);

assert.equal(vm.runInContext('hasUsefulAddress({address:"Adres OpenStreetMap’te belirtilmemiş"})', context), false);
assert.ok(vm.runInContext('placeDataQualityScore({name:"BİM",category:"market",address:"Cadde 1",openingHours:"24/7",phone:"1"})', context) > 10);

console.log("Discovery brain tests PASS: relevance, diversity, data quality and honest personalization.");
