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
context.MAX_VISIBLE_PLACES = 120;
for (const name of ["estimateWalkingMinutes", "formatWalkingTime", "openingStatus", "resultCountLabel"]) {
  vm.runInContext(extract(name), context);
}
assert.equal(vm.runInContext("estimateWalkingMinutes(0.8)", context), 10);
assert.equal(vm.runInContext('formatWalkingTime(0.8)', context), "~10 dk yürüme");
assert.equal(vm.runInContext('formatWalkingTime(5)', context), "~1 sa 3 dk yürüme");
assert.equal(vm.runInContext('resultCountLabel(119)', context), "119 sonuç");
assert.equal(vm.runInContext('resultCountLabel(120)', context), "120+ sonuç");

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

for (const id of ["mapSearch", "recenterButton", "mapQuickCard", "quickDirections", "quickFavorite", "quickDetails", "quickShare", "sectionNav", "sectionTransition", "newsSection", "radioSection", "radioPlayer", "radioSearch", "radioLibraryTabs", "radioPlayerFavorite", "radioPlayerExpand", "radioPrev", "radioNext", "radioVolume"]) {
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
assert.match(styles, /has-map-quick-card \.sheet\{display:none!important\}/);
assert.match(styles, /body\[data-view=list\] \.viewport-live-hint\{display:none!important\}/);
assert.match(styles, /has-location\[data-view=map\] \.map-context\{display:none!important\}/);
assert.match(app, /sheet\.inert = true/);
assert.match(app, /map\.on\("dragstart", handleMapDragStart\)/);
assert.match(app, /yakinimView: "map-place"/);
assert.match(app, /navigator\.share/);
assert.match(app, /rankDiscoveryPlaces/);
assert.match(app, /hasUsefulAddress/);
assert.match(app, /parseDiscoveryQuery/);
assert.match(app, /setSection/);
assert.match(app, /loadNews/);
assert.match(app, /loadRadio/);
assert.doesNotMatch(index, /data-radio-scope=/);
assert.match(app, /toggleRadioFavorite/);
assert.match(app, /normalizeRadioArtworkUrl/);
assert.doesNotMatch(index, /rel="preload" href="https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js"/);
assert.match(app, /failedRadioArtwork/);
assert.match(app, /navigator\.mediaSession/);
assert.match(app, /rememberRadioRecent/);
assert.match(app, /toggleRadioPlayerExpanded/);
assert.match(app, /recoverRadioStream/);
assert.match(app, /showSectionTransition/);
assert.match(app, /hideSectionTransition/);
assert.match(styles, /radio-player\.is-expanded \.radio-player-tools/);
assert.match(styles, /radio-player\.is-expanded \.radio-player-tools\{display:grid!important/);
assert.match(styles, /section-transition/);\nassert.match(index, /class="radio-player-actions"/);\nassert.match(styles, /v3\.2\.1 definitive mobile mini-player layout/);
assert.match(styles, /v3\.1 radio studio/);
assert.match(styles, /v3\.0 lifestyle shell: nearby \+ news \+ radio/);
assert.match(styles, /data-section=nearby\]\[data-view=map\] \.section-nav\{[\s\S]*display:flex!important/);
assert.match(app, /setView\(isMobileLayout \? "map" : "list", isMobileLayout \? "peek"/);

console.log("Product-standard tests PASS: compact map chrome, recenter, quick card, search, walking time and safe opening status.");
