/**
 * Build PWA reproductible.
 * Sortie : dist/pwa/ — même moteur shared/, interface mobile, manifest et service worker.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist", "pwa");
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;

function rimraf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function walk(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, base));
    else files.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return files;
}

rimraf(dist);
fs.mkdirSync(dist, { recursive: true });

spawnSync(process.execPath, [path.join(root, "scripts", "make-icons.mjs")], { stdio: "inherit" });

let html = fs.readFileSync(path.join(root, "mobile", "index.html"), "utf8");
if (!html.includes('name="nvd-pwa"')) {
  html = html.replace(
    "<head>",
    '<head>\n<meta name="nvd-pwa" content="build">'
  );
}
html = html.replaceAll("../docs/manual/index.html", "./manuel/index.html");
fs.writeFileSync(path.join(dist, "index.html"), html);

fs.copyFileSync(path.join(root, "mobile", "mobile.css"), path.join(dist, "mobile.css"));
let js = fs.readFileSync(path.join(root, "mobile", "mobile.js"), "utf8");
js = js.replaceAll("../shared/", "./shared/");
js = js.replaceAll("../docs/manual/index.html", "./manuel/index.html");
fs.writeFileSync(path.join(dist, "mobile.js"), js);

fs.copyFileSync(path.join(root, "mobile", "manifest.webmanifest"), path.join(dist, "manifest.webmanifest"));
copyDir(path.join(root, "mobile", "icons"), path.join(dist, "icons"));
copyDir(path.join(root, "shared"), path.join(dist, "shared"));
copyDir(path.join(root, "docs", "manual"), path.join(dist, "manuel"));

const assets = walk(dist)
  .filter((rel) => rel !== "sw.js")
  .map((rel) => `./${rel}`);
let sw = fs.readFileSync(path.join(root, "mobile", "sw.js"), "utf8");
sw = sw.replaceAll("__CACHE__", `nvd-${version}`);
sw = sw.replaceAll("__ASSETS__", JSON.stringify(assets, null, 2));
fs.writeFileSync(path.join(dist, "sw.js"), sw);

const stamp = {
  name: "No-de Vibe Designer",
  version,
  builtAt: new Date().toISOString(),
  files: assets.length
};
fs.writeFileSync(path.join(dist, "build-info.json"), JSON.stringify(stamp, null, 2));
console.log(`PWA ${version} · ${assets.length} fichiers · ${dist}`);
