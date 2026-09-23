import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");
const index = readFileSync("index.html", "utf8");
const styles = readFileSync("styles.css", "utf8");

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

const context = vm.createContext({ Number, Math, Date, String });
for (const name of ["estimateWalkingMinutes", "formatWalkingTime", "openingStatus"]) {
  vm.runInContext(extract(name), context);
}
assert.equal(vm.runInContext("estimateWalkingMinutes(0.8)", context), 10);
assert.equal(vm.runInContext('formatWalkingTime(0.8)', context), "~10 dk yürüme");
assert.equal(vm.runInContext('formatWalkingTime(5)', context), "~1 sa 3 dk yürüme");

context.mondayTen = new Date("2026-09-21T10:00:00");
context.mondayLate = new Date("2026-09-21T23:00:00");
let status = vm.runInContext('openingStatus("24/7", mondayTen)', context);
assert.equal(status.state, "open");
status = vm.runInContext('openingStatus("Mo-Su 09:00-22:00", mondayTen)', context);
assert.equal(status.state, "open");
assert.match(status.label, /22:00/);
status = vm.runInContext('openingStatus("Mo-Su 09:00-22:00", mondayLate)', context);
assert.equal(status.state, "closed");
assert.equal(vm.runInContext('openingStatus("sunrise-sunset", mondayTen)', context), null);

for (const id of ["mapSearch", "recenterButton", "mapQuickCard", "quickDirections", "quickFavorite", "quickDetails"]) {
  assert.match(index, new RegExp(`id="${id}"`));
}
assert.match(styles, /body\[data-view=map\] \.topbar\{display:none!important\}/);
assert.match(styles, /leaflet-control-zoom\{display:none!important\}/);
assert.match(app, /if \(!userLocation\) \{\s*locateUser\(\{ forceFresh: false \}\)/);
assert.match(app, /searchableVisiblePlaces/);
assert.match(app, /mapSearchInput/);
assert.match(app, /document\.body\.dataset\.sheetState = nextState/);
assert.match(app, /if \(document\.body\.dataset\.view === "map"\) openMapQuickCard\(place, main\)/);
assert.match(styles, /data-sheet-state=peek.*map-recenter/s);

console.log("Product-standard tests PASS: compact map chrome, recenter, quick card, search, walking time and safe opening status.");
