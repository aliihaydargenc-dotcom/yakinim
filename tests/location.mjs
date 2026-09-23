import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");

function extract(name) {
  const starts = [`async function ${name}(`, `function ${name}(`];
  let start = -1;
  for (const candidate of starts) {
    start = app.indexOf(candidate);
    if (start >= 0) break;
  }
  assert.notEqual(start, -1, `${name} must exist`);
  const signatureEnd = app.indexOf(") {", start);
  let depth = 0, seen = false, end = signatureEnd + 2;
  for (; end < app.length; end += 1) {
    if (app[end] === "{") { depth += 1; seen = true; }
    else if (app[end] === "}") {
      depth -= 1;
      if (seen && depth === 0) { end += 1; break; }
    }
  }
  return app.slice(start, end);
}

assert.doesNotMatch(app, /if \(permissionState === "denied"\)/);
assert.match(app, /Do not gate geolocation behind Permissions API/);
assert.match(app, /navigator\.geolocation\.getCurrentPosition/);
assert.match(app, /if \(restored \|\| permissionState === "granted"\)/);

const errorContext = vm.createContext({});
vm.runInContext(extract("chooseLocationError"), errorContext);
errorContext.permission = { code: 1 };
errorContext.timeout = { code: 3 };
assert.equal(vm.runInContext("chooseLocationError(timeout, permission).code", errorContext), 1);
assert.equal(vm.runInContext("chooseLocationError(permission, timeout).code", errorContext), 1);
assert.equal(vm.runInContext("chooseLocationError(null, timeout).code", errorContext), 3);

let backgroundCalls = [];
const bootstrapContext = vm.createContext({
  navigator: { geolocation: {} },
  restoreLastLocation: () => true,
  getGeolocationPermissionState: async () => "prompt",
  locateUser: options => backgroundCalls.push(options),
});
vm.runInContext(extract("bootstrapLocationDiscovery"), bootstrapContext);
await vm.runInContext("bootstrapLocationDiscovery()", bootstrapContext);
assert.equal(backgroundCalls.length, 1);
assert.deepEqual(JSON.parse(JSON.stringify(backgroundCalls[0])), { forceFresh: false, background: true });

backgroundCalls = [];
const firstVisitContext = vm.createContext({
  navigator: { geolocation: {} },
  restoreLastLocation: () => false,
  getGeolocationPermissionState: async () => "prompt",
  locateUser: options => backgroundCalls.push(options),
});
vm.runInContext(extract("bootstrapLocationDiscovery"), firstVisitContext);
await vm.runInContext("bootstrapLocationDiscovery()", firstVisitContext);
assert.equal(backgroundCalls.length, 0, "First visit should wait for a user gesture while permission is prompt");

console.log("Location tests PASS: iOS-safe permission advisory flow and stored-location background refresh.");
