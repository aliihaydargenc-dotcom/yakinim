import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { queryNearby, buildNearbyQuery, PROVIDER_TIMEOUT_MS } = require("../lib/nearby.cjs");
const handler = require("../api/nearby.js");
let replies = [], calls = [];
const fake = async (url, opts) => { calls.push({ url, opts }); const r = replies.shift(); if (r instanceof Error) throw r; return r; };
const ok = elements => ({ ok: true, json: async () => ({ elements }) });

replies = [{ ok: false, status: 503 }, ok([{ id: 1 }])];
assert.equal((await queryNearby({ lat: 36.89, lng: 30.70 }, 1000, fake)).elements.length, 1);
assert.equal(calls.length, 2);
assert.equal(PROVIDER_TIMEOUT_MS, 3200);
assert.match(buildNearbyQuery({ lat: 36.89, lng: 30.70 }, 1000), /around:1000/);

const res = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(b) { this.body = b; return this; } });
for (const url of ["/api/nearby", "/api/nearby?lat=NaN&lng=30&radius=1000", "/api/nearby?lat=36&lng=30&radius=999999"]) {
  const r = res();
  await handler({ url, method: "GET" }, r);
  assert.equal(r.code, 400);
}
const method = res();
await handler({ url: "/api/nearby", method: "POST" }, method);
assert.equal(method.code, 405);
console.log("Legacy nearby API tests PASS: compatibility endpoint remains valid while the app uses viewport discovery.");
