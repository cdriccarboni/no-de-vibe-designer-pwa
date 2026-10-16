// Remote Camera : le QR affiché se décode réellement (BarcodeDetector de Chrome) en l'URL du salon,
// et l'adresse proposée au téléphone n'est jamais 127.0.0.1 quand le déploiement est joignable.
// Usage : PLAYWRIGHT_PATH=/chemin/node_modules/playwright node qa/remote-camera-qr-e2e.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defaultCompanionBase } from "../shared/remote-camera/qr.js";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let fails = 0;
const ok = (c, m) => { console.log(`${c ? "OK  " : "FAIL"} · ${m}`); if (!c) fails++; };

const pages = defaultCompanionBase(null, "https://cdriccarboni.github.io/no-de-vibe-designer-pwa/desktop/index.html");
ok(pages.reachable && pages.base === "https://cdriccarboni.github.io/no-de-vibe-designer-pwa/companion/", "GitHub Pages → lien Companion HTTPS du même déploiement");
ok(!defaultCompanionBase(null, "http://127.0.0.1:3333/desktop/index.html").reachable, "localhost → signalé non joignable (pas de QR trompeur)");
ok(defaultCompanionBase("http://192.168.1.20:4177/").reachable, "adresse LAN mémorisée → utilisée");

const server = http.createServer((q, r) => {
  const p = decodeURIComponent(q.url.split("?")[0]);
  if (p === "/__qr__") { r.writeHead(200, { "content-type": "text/html" }); return r.end("<!doctype html><title>qr</title>"); }
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": "text/javascript" }); fs.createReadStream(f).pipe(r);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/__qr__`);
const url = "https://cdriccarboni.github.io/no-de-vibe-designer-pwa/companion/?room=K7QX2M&mode=remote-camera";
const decoded = await page.evaluate(async (text) => {
  const { qrSvg } = await import("/shared/remote-camera/qr.js");
  if (!("BarcodeDetector" in window)) return { skipped: true };
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qrSvg(text, { cellSize: 6 }));
  await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  const codes = await new BarcodeDetector({ formats: ["qr_code"] }).detect(c);
  return { value: codes[0]?.rawValue || null };
}, url);
if (decoded.skipped) console.log("· BarcodeDetector indisponible dans ce Chrome : décodage non vérifié");
else ok(decoded.value === url, `QR décodé = URL du salon (${decoded.value})`);
await browser.close(); server.close();
process.exit(fails ? 1 : 0);
