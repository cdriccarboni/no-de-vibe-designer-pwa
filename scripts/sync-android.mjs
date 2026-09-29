#!/usr/bin/env node
/**
 * Prépare dist/pwa puis synchronise Capacitor Android si le CLI est installé.
 * Ne simule pas un APK : sans @capacitor/cli l'échec est explicite.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status || 1);
};

console.log("→ build:pwa");
run("npm", ["run", "build:pwa"]);

const capBin = path.join(root, "node_modules", "@capacitor", "cli", "bin", "capacitor");
const hasCap = fs.existsSync(capBin) || fs.existsSync(path.join(root, "node_modules", ".bin", "cap"));
if (!hasCap) {
  console.error("Capacitor CLI absent. Installer : npm i -D @capacitor/cli @capacitor/core @capacitor/android");
  console.error("Puis : npx cap add android && npm run android:sync");
  process.exit(2);
}

if (!fs.existsSync(path.join(root, "android"))) {
  console.log("→ cap add android");
  run("npx", ["cap", "add", "android"]);
}

console.log("→ cap sync android");
run("npx", ["cap", "sync", "android"]);
console.log("OK · projet Android synchronisé sur dist/pwa");
