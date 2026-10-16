// E2E OSC → Designer réel (Chrome) : un logiciel de régie (QLab, Chataigne, TouchDesigner…) envoie de l'OSC UDP
// au pont ; le Designer ouvert exécute. Vérifie lecture/pause, paramètre de node appliqué et republié,
// OSCQuery reflétant l'état du Designer, commande refusée quand le Designer est fermé.
// Usage : PLAYWRIGHT_PATH=/chemin/node_modules/playwright CHROME=/chemin/chrome node qa/osc-designer-e2e.mjs
import dgram from "node:dgram";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startRemoteServer } from "../bridge/remote-server.mjs";
import { encodeOscMessage } from "../bridge/osc-control.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (cond, label, detail = "") => { results.push(!!cond); console.log(`${cond ? "OK  " : "FAIL"} · ${label}${detail ? " · " + detail : ""}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 8000) { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn().catch(() => null); if (v) return v; await wait(120); } return null; }

const server = await startRemoteServer({ port: 0, host: "127.0.0.1", staticRoot: root, osc: { port: 0 }, heartbeatMs: 1000, version: "qa" });
const oscPort = server.getOsc().port;
const udp = dgram.createSocket("udp4");
const osc = (address, args = []) => new Promise(r => udp.send(encodeOscMessage(address, args), oscPort, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-proxy-server"] });
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem("qa.seeded")) return;
    sessionStorage.setItem("qa.seeded", "1");
    localStorage.clear();
    localStorage.setItem("nvd.general", JSON.stringify({ restoreAutosave: true, loadDemo: false, plugAndPlay: false }));
  });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", d => d.accept());
  await page.goto(`http://127.0.0.1:${server.port}/desktop/?surface=designer`, { waitUntil: "load" });
  check(await until(async () => server.hostInfo().hasHost), "Designer hôte du pont");

  // Un node réel ajouté par le canal distant (comme depuis un téléphone en mode édition).
  const remote = new WebSocket(`ws://127.0.0.1:${server.port}`);
  await new Promise(r => { remote.onopen = r; });
  remote.send(JSON.stringify({ type: "hello", role: "remote", clientId: "qa" }));
  await wait(200);
  remote.send(JSON.stringify({ type: "op", baseRevision: server.getState().revision, op: { kind: "add-node", type: "ripple", title: "Ondes QA", x: 80, y: 80 } }));
  const node = await until(async () => server.getState().project?.nodes?.find(n => n.title === "Ondes QA"));
  check(!!node, "node « Ondes QA » ajouté et publié par le Designer", node?.id);

  const label = () => page.evaluate(() => document.querySelector("#play")?.textContent || "");
  if ((await label()) === "Ⅱ") await page.click("#play");
  check(await until(async () => (await label()) === "▶"), "Designer à l'arrêt");
  await osc("/nocode/transport/play", [1]);
  check(await until(async () => (await label()) === "Ⅱ"), "OSC /nocode/transport/play → lecture réelle du Designer");
  await osc("/nocode/transport/pause");
  check(await until(async () => (await label()) === "▶"), "OSC /nocode/transport/pause → pause");

  await osc(`/nocode/node/${node.id}/opacity`, [0.25]);
  check(await until(async () => server.getState().project.nodes.find(n => n.id === node.id)?.params?.opacity === 0.25),
    "OSC paramètre : opacity appliquée par le Designer et republiée");
  const saved = () => page.evaluate((id) => {
    const p = JSON.parse(localStorage.getItem("cvd.autosave") || "null");
    return p?.nodes?.find(n => n.id === id)?.params?.opacity ?? null;
  }, node.id);
  check(await until(async () => (await saved()) === 0.25), "modification distante enregistrée (autosave)", String(await saved()));
  await page.reload({ waitUntil: "load" });
  check(await until(async () => server.getState().project?.nodes?.find(n => n.id === node.id)?.params?.opacity === 0.25 && server.hostInfo().hasHost),
    "après rechargement du Designer : la valeur reçue par OSC est conservée");

  const q = await (await fetch(`http://127.0.0.1:${oscPort}/nocode/node/${node.id}/opacity?VALUE`)).json();
  check(q.VALUE?.[0] === 0.25, "OSCQuery lit la valeur du Designer");

  await osc(`/nocode/node/${node.id}/inexistant`, [1]);
  await wait(200);
  check(server.getOsc().stats.last?.ok === false, "paramètre inexistant : refusé (jamais créé)");

  await ctx.close();
  check(await until(async () => !server.hostInfo().hasHost), "Designer fermé");
  await osc("/nocode/cue/go");
  await wait(200);
  check(/Régie absente/.test(server.getOsc().stats.last?.detail || ""), "Designer fermé : commande OSC refusée explicitement");
  check(errors.length === 0, "aucune erreur JavaScript", errors.slice(0, 2).join(" | "));
  remote.close();
} catch (e) {
  check(false, "exception", e.stack || String(e));
} finally {
  await browser.close();
  udp.close();
  await server.close();
}
const failed = results.filter(r => !r).length;
console.log(`\nOSC → Designer : ${results.length - failed}/${results.length}`);
process.exit(failed ? 1 : 0);
