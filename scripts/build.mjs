import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const outputDir = "dist";
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "icon.svg",
  "manifest.webmanifest",
  "sw.js",
  "_headers",
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const file of files) {
  await copyFile(file, join(outputDir, file));
}

console.log(`Static build ready: ${files.length} files -> ${outputDir}/`);
