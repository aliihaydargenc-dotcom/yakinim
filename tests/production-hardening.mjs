import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const sprint3 = fs.readFileSync("sprint3.js", "utf8");
const mobileFlowJs = fs.readFileSync("mobile-flow.js", "utf8");
const mobileFlowCss = fs.readFileSync("mobile-flow.css", "utf8");
const robots = fs.readFileSync("robots.txt", "utf8");
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

assert.match(index, /rel="canonical" href="https:\/\/yakinim\.vercel\.app\/"/);
assert.match(index, /property="og:title"/);
assert.match(index, /property="og:image" content="https:\/\/yakinim\.vercel\.app\/mobile-preview\.png"/);
assert.match(index, /name="twitter:card" content="summary_large_image"/);
assert.match(index, /sprint3\.js\?v=1\.0\.0/);

const oldMobileBootstrap = `nowSection.hidden = false;\n  newsSection.hidden = true;\n  radioSection.hidden = true;\n  loadNowDashboard();`;
assert.equal(app.includes(oldMobileBootstrap), false, "mobile bootstrap must not prefetch Now/news/radio");
assert.match(app, /setSection\("nearby", \{ pushHistory: false \}\);/);

for (const asset of ["sprint1.js?v=1.0.0", "sprint2.js?v=1.0.0", "sprint3.js?v=1.0.0"]) {
  assert.ok(sw.includes(asset), `offline shell missing ${asset}`);
}
assert.match(sprint3, /aria-modal/);
assert.match(sprint3, /Escape/);
assert.match(sprint3, /aria-busy/);
assert.match(sprint3, /navigator\.onLine/);
assert.match(sprint3, /URLSearchParams/);
assert.match(sprint3, /searchParams\.set\("q"/);
assert.match(sprint3, /watchPosition/);
assert.match(sprint3, /enableHighAccuracy:\s*true/);
assert.match(sprint3, /maximumAge:\s*0/);
assert.match(sprint3, /stopImmediatePropagation/);
assert.match(sprint3, /Kesin Konum/);
assert.match(sprint3, /mobile-flow\.css\?v=1\.0\.0/);
assert.match(sprint3, /mobile-flow\.js\?v=1\.0\.0/);

assert.doesNotThrow(() => new Function(mobileFlowJs), "mobile-flow.js must parse");
assert.match(mobileFlowJs, /applySheetState\("half"\)/);
assert.match(mobileFlowJs, /Yakındaki yerlerden ekle/);
assert.match(mobileFlowJs, /route-pick-mode/);
assert.match(mobileFlowJs, /data-mobile-destination='nearby'/);
assert.match(mobileFlowCss, /--med-sea:#0b7f8f/);
assert.match(mobileFlowCss, /body\[data-section="nearby"\] \.view-switch/);
assert.match(mobileFlowCss, /\.sheet\[data-state="half"\] \.results/);
assert.match(mobileFlowCss, /\.ykn-route-discover/);
assert.match(mobileFlowCss, /yknMobileSurfaceIn/);

assert.match(robots, /Sitemap: https:\/\/yakinim\.vercel\.app\/sitemap\.xml/);
assert.match(sitemap, /<loc>https:\/\/yakinim\.vercel\.app\/<\/loc>/);

const headerNames = new Set(vercel.headers.flatMap(rule => rule.headers.map(header => header.key)));
for (const header of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]) {
  assert.ok(headerNames.has(header), `security header missing: ${header}`);
}

console.log("Production hardening assertions passed.");
