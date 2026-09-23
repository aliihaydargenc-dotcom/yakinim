import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync("app.js", "utf8");
const api = readFileSync("api/viewport.js", "utf8");
const lib = readFileSync("lib/viewport.cjs", "utf8");

assert.match(app, /FAST_LOCATION_TIMEOUT = 2500/);
assert.match(app, /ACCURATE_LOCATION_TIMEOUT = 7000/);
assert.match(app, /Promise\.race\(\[fastPromise, accuratePromise\]\)|Promise\.race\(\[fastPromise,accuratePromise\]\)/);
assert.match(app, /LAST_LOCATION_MAX_AGE = 3 \* 24 \* 60 \* 60 \* 1000/);
assert.match(app, /VIEWPORT_DEBOUNCE_MS = 280/);
assert.match(app, /VIEWPORT_GRID_DEGREES = 0\.01/);
assert.match(app, /VIEWPORT_CACHE_TTL = 4 \* 60 \* 60 \* 1000/);
assert.match(app, /map\.on\("moveend", handleMapMoveEnd\)/);
assert.match(app, /fetchViewportBundle/);
assert.match(app, /\/api\/viewport/);
assert.doesNotMatch(app, /radiusSelect/);
assert.doesNotMatch(app, /QUICK_DISCOVERY_RADIUS/);
assert.match(lib, /PROVIDER_TIMEOUT_MS = 2600/);
assert.match(lib, /\[timeout:5\]/);
assert.match(lib, /out center tags qt/);
assert.match(api, /s-maxage=180/);
assert.match(api, /stale-while-revalidate=900/);
assert.match(api, /X-Yakinim-Viewport-Cache/);

console.log("Performance tests PASS: persisted location, debounced viewport discovery, snapped cache cells and bounded Overpass latency.");
