import fs from "node:fs";

const indexPath = "index.html";
const packagePath = "package.json";

let index = fs.readFileSync(indexPath, "utf8");
const appScript = '<script src="./app.js?v=3.9.0" defer></script>';
const sprint2Script = '<script src="./sprint2.js?v=1.0.0" defer></script>';
if (!index.includes(sprint2Script)) {
  if (!index.includes(appScript)) throw new Error("app.js script anchor not found");
  index = index.replace(appScript, `${appScript}\n    ${sprint2Script}`);
  fs.writeFileSync(indexPath, index);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.version = "3.11.0";
const current = String(pkg.scripts?.test || "");
if (!current.includes("node --check sprint2.js")) {
  pkg.scripts.test = current.replace(
    "node --check sprint1.js && ",
    "node --check sprint1.js && node --check sprint2.js && node tests/sprint2.mjs && ",
  );
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("YKN Sprint 2 integration applied.");
