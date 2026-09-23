import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const app = readFileSync("app.js", "utf8");
const context = vm.createContext({ window: { matchMedia: () => ({ matches: false }) }, Number, Math });
vm.runInContext(app.slice(0, app.indexOf("const prefs =")), context);

function include(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = app.indexOf("\nfunction ", start + 1);
  vm.runInContext(app.slice(start, end < 0 ? app.length : end), context);
}
["categoryForOsmElement", "distanceBetween", "rankDiscoveryCategories"].forEach(include);

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
assert.ok(vm.runInContext("distanceBetween(36.89,30.70,36.891,30.70)", context) > 0);
assert.equal(vm.runInContext('osmCategories.some(c=>c.id === "all" || c.id === "duty")', context), false);
context.discoveryBundle = { cafe: [{ id: "c" }], food: [{ id: "f" }], market: [{ id: "m" }], park: [{ id: "p" }] };
context.discoverySignals = { categoryViews: { market: 3 }, lastCategory: "market" };
assert.equal(vm.runInContext("rankDiscoveryCategories(discoveryBundle, discoverySignals, [])[0].id", context), "market");
context.discoverySignals = { categoryViews: {}, lastCategory: null };
assert.equal(vm.runInContext("rankDiscoveryCategories(discoveryBundle, discoverySignals, [])[0].id", context), "food");
console.log("Discovery behavior tests: PASS (category mapping, distance and personalized ordering).");
