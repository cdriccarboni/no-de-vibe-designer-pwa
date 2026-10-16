// Designer réel (Chromium) : 1) bouton « Écouter » du node libpd → AudioWorklet → AnalyserNode, niveau non nul mesuré ;
// 2) node OSC → passerelle OSC/WebSocket : « passerelle requise » sans serveur, puis connexion à un serveur WS simulé
//    (implémenté ici, RFC 6455 minimal) qui reçoit un vrai paquet OSC 1.0 binaire.
// Usage : PLAYWRIGHT_PATH=… [CHROME=…] node qa/libpd-listen-oscws-e2e.mjs
import http from "node:http";
import net from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { decodeOscMessage, encodeOscMessage } from "../shared/protocols/osc.js";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png", ".wasm":"application/wasm", ".webmanifest":"application/manifest+json" };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// Serveur WebSocket simulé : handshake + trames binaires masquées (client → serveur), réponse binaire non masquée.
const received = [];
const wss = http.createServer();
wss.on("upgrade", (req, sock) => {
  const accept = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  let buf = Buffer.alloc(0);
  sock.on("data", d => {
    buf = Buffer.concat([buf, d]);
    while (buf.length >= 2) {
      const op = buf[0] & 0x0f; let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { len = buf.readUInt16BE(2); off = 4; }
      const masked = buf[1] & 0x80; const need = off + (masked ? 4 : 0) + len;
      if (buf.length < need) break;
      const mask = masked ? buf.subarray(off, off + 4) : null; off += masked ? 4 : 0;
      const payload = Buffer.from(buf.subarray(off, off + len)); if (mask) for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
      buf = buf.subarray(need);
      if (op === 2) {
        received.push(decodeOscMessage(new Uint8Array(payload)));
        const reply = Buffer.from(encodeOscMessage("/nvd/ack", [1.5]));
        sock.write(Buffer.concat([Buffer.from([0x82, reply.length]), reply]));
      } else if (op === 8) sock.end();
    }
  });
  sock.on("error", () => {});
});
await new Promise(r => wss.listen(0, "127.0.0.1", r));
const wsUrl = `ws://127.0.0.1:${wss.address().port}`;
const closed = net.createServer(); await new Promise(r => closed.listen(0, "127.0.0.1", r)); const deadPort = closed.address().port; await new Promise(r => closed.close(r));

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: true, args: ["--autoplay-policy=user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on("pageerror", e => errors.push(String(e.message || e)));
await page.addInitScript(() => { if (!sessionStorage.getItem("e2e")) { localStorage.clear(); localStorage.setItem("nvd.general", JSON.stringify({ restoreAutosave: false, loadDemo: false, plugAndPlay: false })); sessionStorage.setItem("e2e", "1"); } });
await page.goto(`${base}/desktop/index.html`, { waitUntil: "load" });
await page.waitForTimeout(1500);
let fail = 0; const ok = (c, m, d = "") => { console.log(`${c ? "✓" : "✗"} ${m}${d ? " · " + d : ""}`); if (!c) fail++; };
const addAndSelect = async type => {
  await page.locator(`#libraryList .lib-item[data-add="${type}"]`).first().click();
  await page.waitForTimeout(300);
  const id = await page.evaluate(t => [...document.querySelectorAll("#patchSpace .node")].map(n => n.dataset.id).filter(Boolean).pop(), type);
  await page.locator(`#patchSpace .node[data-id="${id}"] .nh`).first().click();
  await page.waitForTimeout(300);
};

// 1. libpd · Écouter
await addAndSelect("libpd");
ok(await page.locator("#libpdListenBtn").isVisible(), "bouton « Écouter » visible dans l'inspecteur libpd");
await page.click("#libpdListenBtn");
await page.waitForFunction(() => Number(document.querySelector("#libpdListenStatus")?.dataset.rms) > 0.01, null, { timeout: 8000 }).catch(() => {});
const rms = await page.evaluate(() => Number(document.querySelector("#libpdListenStatus")?.dataset.rms || 0));
const statusText = await page.textContent("#libpdListenStatus");
ok(rms > 0.05, "signal non nul mesuré par l'AnalyserNode après le clic", `RMS ${rms} · « ${statusText} »`);
await page.click("#libpdListenBtn");
await page.waitForTimeout(200);
ok((await page.textContent("#libpdListenBtn")).includes("Écouter"), "arrêt de l'écoute");

// 2. OSC / WebSocket
await addAndSelect("osc");
await page.fill("#oscWsUrl", `ws://127.0.0.1:${deadPort}`);
await page.click("#oscWsConnect");
await page.waitForFunction(() => document.querySelector("#oscWsStatus")?.dataset.state === "gateway-required", null, { timeout: 6000 }).catch(() => {});
ok(await page.evaluate(() => document.querySelector("#oscWsStatus").dataset.state === "gateway-required" && /passerelle requise/.test(document.querySelector("#oscWsStatus").textContent)), "sans passerelle : « passerelle requise » affiché", await page.textContent("#oscWsStatus"));
await page.fill("#oscWsUrl", wsUrl);
await page.click("#oscWsConnect");
await page.waitForFunction(() => document.querySelector("#oscWsStatus")?.dataset.state === "online", null, { timeout: 6000 }).catch(() => {});
ok(await page.evaluate(() => document.querySelector("#oscWsStatus").dataset.state === "online"), "passerelle simulée : statut connecté", await page.textContent("#oscWsStatus"));
await page.fill("#termCmd", "osc bridge /nvd/test 0.5");
await page.press("#termCmd", "Enter");
for (let i = 0; i < 30 && !received.length; i++) await page.waitForTimeout(100);
ok(received.some(m => m.address === "/nvd/test" && m.args[0] === 0.5), "le serveur WS reçoit un paquet OSC 1.0 binaire", JSON.stringify(received));
await page.waitForTimeout(300);
ok(/OSC WS < \/nvd\/ack/.test(await page.textContent("#termLog")), "réponse OSC du serveur reçue et journalisée");
ok(errors.length === 0, "aucune erreur JS", errors.slice(0, 2).join(" | "));
if (process.env.SHOTS_DIR) await page.screenshot({ path: path.join(process.env.SHOTS_DIR, "osc-ws-inspector.png") });
await browser.close(); server.close(); wss.close();
console.log(fail ? `ÉCHEC : ${fail}` : "OK : libpd « Écouter » audible et OSC/WebSocket vérifiés");
process.exit(fail ? 1 : 0);
