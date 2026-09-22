import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, index, sw, manifestText, vercelText] = await Promise.all([
  readFile("app.js", "utf8"),
  readFile("index.html", "utf8"),
  readFile("sw.js", "utf8"),
  readFile("manifest.webmanifest", "utf8"),
  readFile("vercel.json", "utf8"),
]);

const manifest = JSON.parse(manifestText);
const vercel = JSON.parse(vercelText);

assert.match(app, /APP_VERSION = "1\.0\.0"/);
for (const id of ["duty", "market", "greengrocer", "bakery", "pharmacy", "atm", "favorites"]) {
  assert.match(app, new RegExp(`id: "${id}"`));
}

assert.match(app, /https:\/\/eczaneadresi\.com\/api\/public\/v1\/nearest-pharmacies/);
assert.match(app, /const radiusKm = Number\(prefs\.radius\) \/ 1000;/);
assert.doesNotMatch(app, /radiusKm = Number\(prefs\.radius\) \/ 1000 \+ 0\.25/);
assert.match(app, /son kaydedilen veri gösteriliyor/);
assert.match(app, /Veri: Eczane Adresi/);
assert.match(app, /OpenStreetMap contributors/);

assert.match(index, /rel="manifest"/);
assert.match(index, /leaflet@1\.9\.4/);
assert.match(index, /id="map"/);
assert.match(index, /id="results"/);

assert.equal(manifest.name, "Yakınımda");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");

assert.match(sw, /networkFirst/);
assert.match(sw, /staleWhileRevalidate/);
assert.match(sw, /LEAFLET_ORIGIN/);
assert.doesNotMatch(sw, /tile\.openstreetmap\.org/);

assert.ok(Array.isArray(vercel.headers));
assert.equal(vercel.headers.length, 1);
assert.equal(vercel.headers[0].source, "/(.*)");
const headerNames = new Set(vercel.headers[0].headers.map((item) => item.key));
for (const name of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]) {
  assert.ok(headerNames.has(name), `Missing Vercel header: ${name}`);
}

console.log("Yakınımda smoke tests: PASS");
