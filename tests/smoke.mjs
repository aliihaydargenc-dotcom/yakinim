import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, index, sw, manifestText, headers, wranglerText, builtIndex, builtApp, builtHeaders] = await Promise.all([
  readFile("app.js", "utf8"),
  readFile("index.html", "utf8"),
  readFile("sw.js", "utf8"),
  readFile("manifest.webmanifest", "utf8"),
  readFile("_headers", "utf8"),
  readFile("wrangler.jsonc", "utf8"),
  readFile("public/index.html", "utf8"),
  readFile("public/app.js", "utf8"),
  readFile("public/_headers", "utf8"),
]);

const wrangler = JSON.parse(wranglerText);

const manifest = JSON.parse(manifestText);

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

assert.match(headers, /Permissions-Policy: geolocation=\(self\)/);
assert.match(headers, /X-Content-Type-Options: nosniff/);

assert.equal(wrangler.name, "yakinim");
assert.equal(wrangler.assets.directory, "./public");
assert.equal(wrangler.compatibility_date, "2026-09-22");

assert.equal(builtIndex, index);
assert.equal(builtApp, app);
assert.equal(builtHeaders, headers);

console.log("Yakınımda smoke tests: PASS");
