import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  canonicalizeViewport,
  viewportKey,
  buildViewportQuery,
  queryViewport,
  PROVIDER_TIMEOUT_MS,
  PROVIDER_HEDGE_MS,
  QUALITY_WAIT_MS,
  MIN_GOOD_ELEMENT_COUNT,
  ENDPOINTS,
} = require("../lib/viewport.cjs");
const handler = require("../api/viewport.js");

const viewport = canonicalizeViewport({ south: 36.8841, west: 30.6922, north: 36.9062, east: 30.7241 });
assert.deepEqual(viewport, { south: 36.88, west: 30.69, north: 36.91, east: 30.73 });
assert.equal(viewportKey(viewport), "36.88:30.69:36.91:30.73");
const query = buildViewportQuery(viewport);
assert.match(query, /36\.88,30\.69,36\.91,30\.73/);
assert.match(query, /supermarket\|convenience/);
assert.match(query, /restaurant\|fast_food/);
assert.match(query, /out center tags qt/);
assert.equal(PROVIDER_TIMEOUT_MS, 5000);
assert.equal(PROVIDER_HEDGE_MS, 350);
assert.equal(QUALITY_WAIT_MS, 3500);
assert.equal(MIN_GOOD_ELEMENT_COUNT, 12);
assert.ok(ENDPOINTS.some(endpoint => endpoint.includes("maps.mail.ru")));
assert.throws(() => canonicalizeViewport({ south: 36, west: 30, north: 36.5, east: 30.5 }), /bbox_too_large/);
assert.doesNotThrow(() => canonicalizeViewport({ south: 36.83, west: 31.04, north: 36.95, east: 31.16 }));

const ok = elements => ({ ok: true, json: async () => ({ elements }) });
const richElements = Array.from({ length: MIN_GOOD_ELEMENT_COUNT }, (_, index) => ({ id: index + 1 }));
let calls = 0;
const result = await queryViewport(viewport, async () => { calls += 1; return ok(richElements); });
assert.equal(result.elements.length, MIN_GOOD_ELEMENT_COUNT);
assert.equal(calls, 1);

let hedgedCalls = 0;
const hedgedResult = await queryViewport(viewport, async endpoint => {
  hedgedCalls += 1;
  if (endpoint === ENDPOINTS[0]) {
    await new Promise(resolve => setTimeout(resolve, PROVIDER_HEDGE_MS + 120));
    throw new Error("slow primary");
  }
  return ok(richElements.map((item) => ({ ...item, provider: 2 })));
});
assert.equal(hedgedResult.elements[0].provider, 2);
assert.ok(hedgedCalls >= 2);

let qualityCalls = 0;
const qualityResult = await queryViewport(viewport, async endpoint => {
  qualityCalls += 1;
  if (endpoint === ENDPOINTS[0]) return ok([{ id: "sparse-1" }, { id: "sparse-2" }]);
  if (endpoint === ENDPOINTS[1]) {
    await new Promise(resolve => setTimeout(resolve, 80));
    return ok(Array.from({ length: 24 }, (_, index) => ({ id: `rich-${index}` })));
  }
  throw new Error("unused provider");
});
assert.equal(qualityResult.elements.length, 24);
assert.equal(qualityResult.provider, new URL(ENDPOINTS[1]).hostname);
assert.ok(qualityCalls >= 2);

const res = () => ({
  headers: {},
  setHeader(k, v) { this.headers[k] = v; },
  status(n) { this.code = n; return this; },
  json(body) { this.body = body; return this; },
});
let response = res();
await handler({ method: "GET", url: "/api/viewport?south=36&west=30&north=36.5&east=30.5" }, response);
assert.equal(response.code, 400);

const originalFetch = globalThis.fetch;
let providerCalls = 0;
try {
  globalThis.fetch = async () => { providerCalls += 1; return ok(richElements); };
  response = res();
  await handler({ method: "GET", url: "/api/viewport?south=36.8841&west=30.6922&north=36.9062&east=30.7241" }, response);
  assert.equal(response.code, 200);
  assert.equal(response.headers["X-Yakinim-Viewport-Cache"], "MISS");
  assert.match(response.headers["Cache-Control"], /s-maxage=900/);
  assert.equal(response.headers["X-Yakinim-Viewport-Provider"], "overpass.private.coffee");

  const cached = res();
  await handler({ method: "GET", url: "/api/viewport?south=36.8842&west=30.6923&north=36.9061&east=30.7240" }, cached);
  assert.equal(cached.code, 200);
  assert.equal(cached.headers["X-Yakinim-Viewport-Cache"], "HIT");
  assert.equal(providerCalls, 1);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Viewport tests PASS: snapped queries, quality hedging and shared cache.");
