import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const app = readFileSync('app.js', 'utf8');
const context = vm.createContext({ window: { matchMedia: () => ({ matches: false }) }, Number, Math });
vm.runInContext(app.slice(0, app.indexOf('const prefs =')), context);
function include(name) {
  const start = app.indexOf(`function ${name}(`);
  const end = app.indexOf('\nfunction ', start + 1);
  vm.runInContext(app.slice(start, end < 0 ? app.length : end), context);
}
['categoryForOsmElement','distanceBetween','filterPlacesForRadius'].forEach(include);
vm.runInContext('const prefs = {radius:1000}; let userLocation = {lat:36.89, lng:30.70};', context);
assert.equal(vm.runInContext('categories[0].id',context),'all');
for (const [tags,expected] of [[{amenity:'cafe'},'cafe'],[{amenity:'restaurant'},'food'],[{leisure:'park'},'park'],[{shop:'mall'},'shopping'],[{amenity:'pharmacy'},'pharmacy'],[{shop:'supermarket'},'market']]) {
  context.sample = {tags};
  assert.equal(vm.runInContext('categoryForOsmElement(sample).id',context),expected);
}
context.places = [{id:'far',lat:37,lng:31,distanceKm:0},{id:'near',lat:36.8901,lng:30.70,distanceKm:100},{id:'mid',lat:36.891,lng:30.70,distanceKm:0}];
assert.equal(vm.runInContext('filterPlacesForRadius(places).map(p=>p.id).join(",")',context),'near,mid');
assert.equal(vm.runInContext('osmCategories.some(c=>c.id === "all" || c.id === "duty")',context),false);
console.log('Discovery behavior tests: PASS (categories, distance recalculation, radius, sort)');
