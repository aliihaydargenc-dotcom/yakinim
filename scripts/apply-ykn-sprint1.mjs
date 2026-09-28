import fs from "node:fs";

const indexPath = "index.html";
const packagePath = "package.json";

let index = fs.readFileSync(indexPath, "utf8");
const appScript = '<script src="./app.js?v=3.9.0" defer></script>';
const sprintScript = '<script src="./sprint1.js?v=1.0.0" defer></script>';

if (!index.includes(sprintScript)) {
  if (!index.includes(appScript)) throw new Error("app.js script anchor not found");
  index = index.replace(appScript, `${sprintScript}\n    ${appScript}`);
  fs.writeFileSync(indexPath, index);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.version = "3.10.0";
const originalTest = String(pkg.scripts?.test || "");
if (!originalTest.includes("node --check sprint1.js")) {
  pkg.scripts.test = originalTest.replace(
    "node --check app.js && ",
    "node --check app.js && node --check sprint1.js && node tests/sprint1.mjs && ",
  );
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log("YKN Sprint 1 integration applied.");
