import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const sprint = fs.readFileSync("sprint1.js", "utf8");

assert.match(index, /sprint1\.js\?v=1\.0\.0/);
assert.match(sprint, /data-mobile-destination="nearby"/);
assert.match(sprint, /data-mobile-destination="map"/);
assert.match(sprint, /data-mobile-destination="route"/);
assert.match(sprint, /data-mobile-destination="news"/);
assert.match(sprint, /data-mobile-destination="radio"/);

for (const state of ["idle", "requesting", "granted", "denied", "unavailable", "timeout", "manual"]) {
  assert.ok(sprint.includes(`"${state}"`), `missing location state: ${state}`);
}

assert.match(sprint, /min-height:\s*44px/);
assert.match(sprint, /safe-area-inset-bottom/);
assert.match(sprint, /100dvh/);
assert.match(sprint, /prefers-reduced-motion/);
assert.match(sprint, /data-nearby-state/);
assert.match(sprint, /aria-current/);
assert.match(sprint, /result-card\.is-active/);

console.log("Sprint 1 UX assertions passed.");
