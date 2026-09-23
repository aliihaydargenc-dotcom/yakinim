import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const app = readFileSync("app.js", "utf8");
assert.ok(!app.includes('document.querySelectorAll("[data-view]")'));

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

let selected = null;
const marker = {
  bindTooltip(text, options) { this.tooltip = { text, options }; return this; },
  addTo() { return this; },
  on(event, callback) { this.click = callback; },
  getElement() { return { id: "pin" }; },
  getLatLng() { return { lat: 36, lng: 30 }; },
  openTooltip() { this.labelOpen = true; },
  closeTooltip() { this.labelOpen = false; },
};
const context = vm.createContext({
  L: { marker: () => marker, divIcon: o => o },
  map: {
    getZoom: () => 15,
    getSize: () => ({ x: 400, y: 800 }),
    latLngToContainerPoint: () => ({ x: 180, y: 220 }),
  },
  Map,
  Math,
  markers: [],
  placeMarkerById: new Map(),
  selectedPlace: null,
  favorites: [],
  routeStops: [],
  activeCategory: { id: "all", type: "all" },
  categories: [{ id: "cafe", label: "Kafe" }],
  LABEL_MARKER_GAP_PX: 7,
  isFavorite: () => false,
  categorySvg: () => "<svg/>",
  escapeHtml: s => s,
  openPlaceDetails: p => { selected = p; },
});
vm.runInContext(extract("placeDisplayPriority"), context);
vm.runInContext(extract("addPlaceMarker"), context);
context.place = { id: "one", name: "Test cafe", category: "cafe", lat: 36, lng: 30, distanceKm: .2 };
vm.runInContext('createdMarker = addPlaceMarker(place,"",false,0)', context);
context.placeMarkerById.set("one", marker);
marker.click();
assert.equal(selected.id, "one");
assert.equal(marker.tooltip.options.permanent, true);
assert.equal(marker.tooltip.options.direction, "top");
assert.equal(marker.tooltip.options.pane, "placeLabels");

vm.runInContext(extract("updateMapLabels"), context);
vm.runInContext("updateMapLabels()", context);
assert.equal(marker.labelOpen, true);

let created = 0;
const buttons = [];
const strip = { children: buttons, append: b => buttons.push(b), querySelectorAll: () => buttons };
const ctx2 = vm.createContext({
  categoryStrip: strip,
  categories: [{ id: "cafe", label: "Kafe" }, { id: "market", label: "Market" }],
  activeCategory: { id: "cafe" },
  categorySvg: () => "<svg/>",
  escapeHtml: s => s,
  selectCategory: () => {},
  document: { createElement() { created++; return { dataset: {}, attrs: {}, setAttribute(k,v){this.attrs[k]=v;}, addEventListener(){} }; } },
});
vm.runInContext(extract("renderCategoryButtons"), ctx2);
vm.runInContext("renderCategoryButtons()", ctx2);
const first = buttons[0];
ctx2.activeCategory = { id: "market" };
vm.runInContext("renderCategoryButtons()", ctx2);
assert.equal(created, 2);
assert.equal(buttons[0], first);
assert.equal(buttons[1].attrs["aria-pressed"], "true");

const routeContext = vm.createContext({ URLSearchParams });
vm.runInContext(extract("buildRouteUrl"), routeContext);
const url = vm.runInContext('buildRouteUrl([{lat:36.9,lng:30.7},{lat:36.91,lng:30.71},{lat:36.92,lng:30.72}])', routeContext);
const params = new URL(url).searchParams;
assert.equal(params.get("destination"), "36.92,30.72");

let collapsed = 0;
const mapClickContext = vm.createContext({ manualLocationMode: false, document: { body: { dataset: { view: "map" } } }, collapseMapPanel: () => collapsed++ });
vm.runInContext(extract("handleManualMapClick"), mapClickContext);
vm.runInContext("handleManualMapClick({})", mapClickContext);
assert.equal(collapsed, 1);

console.log("Interaction tests PASS: labels sit above pins; pin details, categories, route and map tap remain coherent.");
