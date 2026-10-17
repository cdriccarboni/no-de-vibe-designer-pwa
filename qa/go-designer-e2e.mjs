// E2E réel : GO de conduite dans le Designer (Chrome) depuis plusieurs sources — bouton et OSC UDP.
// Vérifie standby, protection double-GO commune, fin de conduite sans retour à la première cue,
// « Prêt ◀/▶ » sans déclenchement, OSC /nocode/cue/next|prev|panic, journal dans la console du Designer.
// Usage : PLAYWRIGHT_PATH=… CHROME=… node qa/go-designer-e2e.mjs
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
async function until(fn, ms = 6000) { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn().catch(() => null); if (v) return v; await wait(80); } return null; }

const CUES = [
  { id: "q1", kind: "cue", label: "Ouverture", start: 0, duration: 1, number: "1" },
  { id: "q2", kind: "cue", label: "Orage", start: 5, duration: 1, number: "2" },
  { id: "q3", kind: "cue", label: "Final", start: 9, duration: 1, number: "3" }
];
const server = await startRemoteServer({ port: 0, host: "127.0.0.1", staticRoot: root, osc: { port: 0 }, heartbeatMs: 1000, version: "qa" });
const oscPort = server.getOsc().port;
const udp = dgram.createSocket("udp4");
const osc = (address, args = []) => new Promise(r => udp.send(encodeOscMessage(address, args), oscPort, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-proxy-server"] });
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(cues => {
    if (localStorage.getItem("qa.seeded")) return;
    localStorage.clear();
    localStorage.setItem("qa.seeded", "1");
    localStorage.setItem("nvd.general", JSON.stringify({ restoreAutosave: true, loadDemo: false, plugAndPlay: false }));
    localStorage.setItem("cvd.autosave", JSON.stringify({ schema: "cvd.graph", version: 2, appVersion: "qa", name: "QA GO", nodes: [], edges: [], timeline: cues, controls: [] }));
  }, CUES);
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.port}/desktop/?surface=designer&companionHost=1`, { waitUntil: "load" });
  check(await until(async () => server.hostInfo().hasHost), "Designer hôte du pont");
  const standby = () => page.locator("#cueStandby").textContent();
  const transportCue = () => page.evaluate(() => JSON.parse(localStorage.getItem("cvd.autosave") || "{}").meta?.transport?.cueId || null);
  const logText = () => page.locator("#termLog").textContent();

  check(await until(async () => (await standby()).includes("1 · Ouverture")), "standby initial affiché : 1 · Ouverture", await standby());
  await page.click("#cueGo");
  check(await until(async () => (await transportCue()) === "q1"), "GO bouton → cue 1 exécutée");
  check((await standby()).includes("2 · Orage"), "standby avance : 2 · Orage", await standby());

  // Double GO : OSC immédiatement après le bouton → refusé
  await osc("/nocode/cue/go", [1]);
  await wait(150);
  check((await transportCue()) === "q1" && (await logText()).includes("double GO bloqué"), "OSC juste après le bouton : double GO bloqué (sources différentes)");

  await wait(400);
  await osc("/nocode/cue/go", [1]);
  check(await until(async () => (await transportCue()) === "q2"), "OSC /nocode/cue/go après le délai → cue 2");
  check(await until(async () => (await standby()).includes("3 · Final")), "standby : 3 · Final");

  // Standby précédent/suivant : ne déclenche rien
  await page.click("#cuePrev");
  check((await standby()).includes("2 · Orage") && (await transportCue()) === "q2", "◀ Prêt : standby recule sans déclencher");
  await osc("/nocode/cue/next", [1]);
  check(await until(async () => (await standby()).includes("3 · Final")) && (await transportCue()) === "q2", "OSC /nocode/cue/next : standby avance sans déclencher");

  await wait(400);
  await page.click("#cueGo");
  check(await until(async () => (await transportCue()) === "q3"), "GO → cue 3 (dernière)");
  check(await until(async () => (await standby()).includes("Fin de conduite")), "fin de conduite affichée");
  await wait(400);
  await page.click("#cueGo");
  await wait(200);
  check((await transportCue()) === "q3" && (await logText()).includes("fin de conduite"), "GO en fin de conduite : refusé, pas de retour à la cue 1");

  // PANIC via OSC
  await osc("/nocode/cue/panic", [1]);
  check(await until(async () => (await logText()).includes("PANIC")), "OSC /nocode/cue/panic exécuté");

  // État persistant après rechargement
  await page.click("#cuePrev");
  const before = await standby();
  await page.reload({ waitUntil: "load" });
  check(await until(async () => (await standby()) === before), "standby conservé après rechargement", before);

  // OSCQuery expose les nouvelles adresses
  const tree = await (await fetch(`http://127.0.0.1:${oscPort}/nocode/cue`)).json();
  check(["go", "next", "prev", "panic"].every(k => tree.CONTENTS?.[k]), "OSCQuery : /nocode/cue/{go,next,prev,panic}");
  check(errors.length === 0, "aucune erreur JS", errors.join(" | "));
} finally {
  udp.close();
  await browser.close();
  await server.close();
}
const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} contrôles OK`);
process.exit(failed ? 1 : 0);
