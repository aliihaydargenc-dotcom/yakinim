import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const source = fs.readFileSync("sprint2.js", "utf8");

assert.match(index, /sprint2\.js\?v=1\.0\.0/);
assert.match(source, /draggable/);
assert.match(source, /dragstart/);
assert.match(source, /drop/);
assert.match(source, /En kısa sıraya diz/);
assert.match(source, /persistRoute/);
assert.match(source, /routeStops\.splice/);
assert.match(source, /aria-label/);
assert.match(source, /durağını yukarı taşı/);
assert.match(source, /durağını aşağı taşı/);
assert.match(source, /durağını rotadan çıkar/);
assert.match(source, /min-height:44px/);

console.log("Sprint 2 route UX assertions passed.");
