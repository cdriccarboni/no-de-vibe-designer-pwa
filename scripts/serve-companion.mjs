#!/usr/bin/env node
/**
 * Serve Companion Remote Camera on LAN (HTTP).
 * getUserMedia needs secure context on real phones → use HTTPS or localhost.
 * Honest: HTTP LAN is PLATFORM-LIMITED for camera permission.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const companionDir = path.join(root, "companion");
const sharedDir = path.join(root, "shared");
const port = Number(process.env.NVD_COMPANION_PORT || 4177);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json"
};

function lanIPv4() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === "IPv4" && !n.internal) return n.address;
    }
  }
  return "127.0.0.1";
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  let file;
  if (rel.startsWith("/shared/")) file = path.join(sharedDir, rel.slice("/shared/".length));
  else file = path.join(companionDir, path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, ""));
  const safe = file.startsWith(companionDir) || file.startsWith(sharedDir);
  if (!safe || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end("Not found"); return;
  }
  const ext = path.extname(file);
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  const ip = lanIPv4();
  console.log(`Companion Remote Camera · http://127.0.0.1:${port}/`);
  console.log(`LAN · http://${ip}:${port}/  (caméra téléphone souvent BLOQUÉE hors HTTPS — PLATFORM-LIMITED)`);
  console.log(`Imports shared via /shared/…`);
});
