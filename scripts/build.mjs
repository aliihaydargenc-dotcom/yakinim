import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const outputDir = "public";
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "icon.svg",
  "manifest.webmanifest",
  "sw.js",
  "_headers",
];

await mkdir(outputDir, { recursive: true });

for (const file of files) {
  await copyFile(file, join(outputDir, file));
}

console.log(`Static assets synced: ${files.length} files -> ${outputDir}/`);
