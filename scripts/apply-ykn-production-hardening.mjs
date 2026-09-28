import fs from "node:fs";

const read = path => fs.readFileSync(path, "utf8");
const write = (path, value) => fs.writeFileSync(path, value);

// 1) Utility-first bootstrap: do not start the mobile session by prefetching Now/news/radio.
let app = read("app.js");
const oldBootstrap = `if (isMobileLayout) {\n  document.body.dataset.view = "list";\n  nowSection.hidden = false;\n  newsSection.hidden = true;\n  radioSection.hidden = true;\n  loadNowDashboard();\n} else {\n  setSection("nearby", { pushHistory: false });\n  setView("list", "expanded");\n}\nbootstrapLocationDiscovery();`;
const newBootstrap = `setSection("nearby", { pushHistory: false });\nsetView("list", "expanded");\nbootstrapLocationDiscovery();`;
if (app.includes(oldBootstrap)) {
  app = app.replace(oldBootstrap, newBootstrap);
  write("app.js", app);
} else if (!app.includes(newBootstrap)) {
  throw new Error("mobile bootstrap anchor not found");
}

// 2) SEO/share metadata + current script versions.
let index = read("index.html");
if (!index.includes('rel="canonical" href="https://yakinim.vercel.app/"')) {
  const description = '    <meta name="description" content="Yakınındaki kafeleri, yemek yerlerini, mağazaları, parkları ve günlük ihtiyaç noktalarını keşfet." />';
  const seo = `${description}\n    <meta name="robots" content="index,follow,max-image-preview:large" />\n    <link rel="canonical" href="https://yakinim.vercel.app/" />\n    <meta property="og:type" content="website" />\n    <meta property="og:locale" content="tr_TR" />\n    <meta property="og:title" content="Yakınımda — Yakındakileri bul, rotanı kur" />\n    <meta property="og:description" content="Yakınındaki günlük ihtiyaç noktalarını keşfet, kaydet ve rotanı oluştur." />\n    <meta property="og:url" content="https://yakinim.vercel.app/" />\n    <meta property="og:image" content="https://yakinim.vercel.app/mobile-preview.png" />\n    <meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:title" content="Yakınımda — Yakındakileri bul, rotanı kur" />\n    <meta name="twitter:description" content="Yakınındaki günlük ihtiyaç noktalarını keşfet, kaydet ve rotanı oluştur." />\n    <meta name="twitter:image" content="https://yakinim.vercel.app/mobile-preview.png" />`;
  if (!index.includes(description)) throw new Error("description meta anchor not found");
  index = index.replace(description, seo);
}
if (!index.includes('rel="apple-touch-icon"')) {
  index = index.replace('    <link rel="icon" href="./icon.svg" type="image/svg+xml" />', '    <link rel="icon" href="./icon.svg" type="image/svg+xml" />\n    <link rel="apple-touch-icon" href="./icon.svg" />');
}
index = index.replaceAll("app.js?v=3.9.0", "app.js?v=3.12.0");
const sprint2Script = '<script src="./sprint2.js?v=1.0.0" defer></script>';
const sprint3Script = '<script src="./sprint3.js?v=1.0.0" defer></script>';
if (!index.includes(sprint3Script)) {
  if (!index.includes(sprint2Script)) throw new Error("sprint2 script anchor not found");
  index = index.replace(sprint2Script, `${sprint2Script}\n    ${sprint3Script}`);
}
write("index.html", index);

// 3) Offline shell must include every client behavior file.
let sw = read("sw.js");
sw = sw.replace('const CACHE_NAME = "yakinimda-shell-v57";', 'const CACHE_NAME = "yakinimda-shell-v58";');
const oldShell = 'const APP_SHELL = ["./", "./index.html", "./styles.css?v=3.9.0", "./app.js?v=3.9.0", "./manifest.webmanifest", "./icon.svg"];';
const newShell = 'const APP_SHELL = ["./", "./index.html", "./styles.css?v=3.9.0", "./sprint1.js?v=1.0.0", "./app.js?v=3.12.0", "./sprint2.js?v=1.0.0", "./sprint3.js?v=1.0.0", "./manifest.webmanifest", "./icon.svg", "./robots.txt", "./sitemap.xml"];';
if (sw.includes(oldShell)) sw = sw.replace(oldShell, newShell);
else if (!sw.includes(newShell)) throw new Error("service worker shell anchor not found");
write("sw.js", sw);

// 4) Keep smoke expectations aligned with the intentional service-worker cache bump.
let smoke = read("tests/smoke.mjs");
smoke = smoke.replace("assert.match(sw, /yakinimda-shell-v57/);", "assert.match(sw, /yakinimda-shell-v58/);");
write("tests/smoke.mjs", smoke);

// 5) Test/version wiring.
const pkg = JSON.parse(read("package.json"));
pkg.version = "3.12.0";
let test = String(pkg.scripts?.test || "");
if (!test.includes("node --check sprint3.js")) {
  test = test.replace(
    "node --check sprint2.js && node tests/sprint2.mjs && ",
    "node --check sprint2.js && node tests/sprint2.mjs && node --check sprint3.js && node tests/production-hardening.mjs && ",
  );
}
pkg.scripts.test = test;
write("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

console.log("YKN production hardening integration applied.");
