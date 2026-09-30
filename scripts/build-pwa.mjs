/**
 * Build PWA multi-surface reproductible.
 *
 * Racine :
 *   /            routeur Auto / sélecteur
 *   /desktop/    Designer complet
 *   /mobile/     interface compacte
 *   /studio/     Companion Studio / Régie / Plateau
 *   /companion/  Remote Camera
 *
 * Une même machine peut prendre n'importe quel rôle.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist", "pwa");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;

function rimraf(dir) { fs.rmSync(dir, { recursive: true, force: true }); }
function copyDir(src, dst, { skip = [] } = {}) {
  fs.mkdirSync(dst, { recursive: true });
  const excluded = new Set(skip);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}
function write(rel, content) {
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

rimraf(dist);
fs.mkdirSync(dist, { recursive: true });

spawnSync(process.execPath, [path.join(root, "scripts", "make-icons.mjs")], { stdio: "inherit" });

copyDir(path.join(root, "shared"), path.join(dist, "shared"));
copyDir(path.join(root, "docs", "manual"), path.join(dist, "manuel"));
copyDir(path.join(root, "mobile", "icons"), path.join(dist, "icons"));

write("index.html", read("index.html"));

const rootManifest = {
  id: "./",
  name: "No-de Vibe Designer",
  short_name: "No-de",
  description: "VIBE · PATCH · STAGE — Designer, Mobile, Régie, Plateau et Remote Camera",
  lang: "fr",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "any",
  background_color: "#101214",
  theme_color: "#101214",
  icons: [
    { src: "./icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "./icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "./icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "./icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
};
write("manifest.webmanifest", JSON.stringify(rootManifest, null, 2) + "\n");

copyDir(path.join(root, "desktop"), path.join(dist, "desktop"), { skip: ["sw.js"] });
let desktopHtml = read("desktop/index.html")
  .replaceAll("../docs/manual/index.html", "../manuel/index.html")
  .replace(/<span class="badge">v[^<]+<\/span>/, '<span class="badge">v' + version + '</span>');
write("desktop/index.html", desktopHtml);
let desktopJs = read("desktop/app.js")
  .replace('navigator.serviceWorker.register("./sw.js")', 'navigator.serviceWorker.register("../sw.js", { scope: "../" })');
write("desktop/app.js", desktopJs);

copyDir(path.join(root, "mobile"), path.join(dist, "mobile"), { skip: ["sw.js"] });
let mobileHtml = read("mobile/index.html").replaceAll("../docs/manual/index.html", "../manuel/index.html");
write("mobile/index.html", mobileHtml);
let mobileJs = read("mobile/mobile.js")
  .replaceAll("../docs/manual/index.html", "../manuel/index.html")
  .replace('navigator.serviceWorker.register("./sw.js", { scope: "./" })', 'navigator.serviceWorker.register("../sw.js", { scope: "../" })');
write("mobile/mobile.js", mobileJs);

copyDir(path.join(root, "studio"), path.join(dist, "studio"));
copyDir(path.join(root, "companion"), path.join(dist, "companion"));

const assets = walk(dist)
  .filter((rel) => rel !== "sw.js")
  .map((rel) => "./" + rel)
  .sort();

let sw = read("mobile/sw.js")
  .replaceAll("__CACHE__", "nvd-" + version + "-multi")
  .replaceAll("__ASSETS__", JSON.stringify(assets, null, 2));
write("sw.js", sw);

const stamp = {
  name: "No-de Vibe Designer",
  version,
  builtAt: new Date().toISOString(),
  files: assets.length,
  surfaces: ["designer", "mobile", "regie", "plateau", "camera"]
};
write("build-info.json", JSON.stringify(stamp, null, 2) + "\n");

console.log("PWA multi-surface " + version + " · " + assets.length + " fichiers · " + dist);
