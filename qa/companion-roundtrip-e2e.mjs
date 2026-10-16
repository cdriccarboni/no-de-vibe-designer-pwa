// E2E Companion ↔ Designer à travers le pont de régie LAN (Chrome réel, Playwright).
// Le « téléphone » arrive par l'adresse réseau local du poste (pas 127.0.0.1) :
// il est donc traité comme un appareil distant et doit présenter le code d'appairage du QR.
// Vérifie : QR → connexion automatique, ping aller-retour, commande réelle du moteur (lecture),
// échec explicite sans conduite, perte puis retour de la régie sans action sur le téléphone,
// redémarrage du pont avec reconnexion automatique, refus d'un mauvais code.
// Usage : PLAYWRIGHT_PATH=/chemin/node_modules/playwright CHROME=/chemin/chrome node qa/companion-roundtrip-e2e.mjs
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startRemoteServer, lanAddresses } from "../bridge/remote-server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (cond, label, detail = "") => {
  results.push({ ok: !!cond, label });
  console.log(`${cond ? "OK  " : "FAIL"} · ${label}${detail ? " · " + detail : ""}`);
};
const wait = ms => new Promise(r => setTimeout(r, ms));

const lan = lanAddresses()[0]?.address;
if (!lan) {
  console.log("· non exécuté : aucune interface réseau locale (le téléphone simulé doit arriver par le LAN)");
  process.exit(0);
}

// Layout de régie : le poste hôte fait foi pour les liaisons (le téléphone n'envoie qu'un widgetId).
const LAYOUT = {
  schema: "nvd.companion", version: 1, name: "QA Régie",
  pages: [{ id: "p1", name: "Régie", cols: 4, rows: 4, widgets: [
    { id: "w-ping", type: "button", presentation: { label: "PING", x: 0, y: 0, w: 2, h: 1 }, binding: { kind: "action", action: "ping" }, state: { value: null } },
    { id: "w-play", type: "button", presentation: { label: "LECTURE", x: 2, y: 0, w: 2, h: 1 }, binding: { kind: "video", videoAction: "play", action: "play" }, state: { value: null } },
    { id: "w-go", type: "button", presentation: { label: "GO", x: 0, y: 1, w: 2, h: 1 }, binding: { kind: "stage", action: "go" }, state: { value: null } }
  ] }]
};

let server = await startRemoteServer({ port: 0, host: "0.0.0.0", staticRoot: root, heartbeatMs: 1000, version: "qa", log: process.env.QA_DEBUG ? (m => console.log("   [pont] " + m)) : undefined });
const port = server.port;
const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-proxy-server"] // le pont est sur le réseau local : jamais via un proxy sortant
});
const errors = [];
const seed = (layout) => () => {
  if (sessionStorage.getItem("qa.seeded")) return;
  sessionStorage.setItem("qa.seeded", "1");
  localStorage.clear();
  localStorage.setItem("nvd.general", JSON.stringify({ restoreAutosave: false, loadDemo: false, plugAndPlay: false }));
  localStorage.setItem("nvd.companion.layout", JSON.stringify(window.__QA_LAYOUT__));
};

async function openHost() {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(`window.__QA_LAYOUT__ = ${JSON.stringify(LAYOUT)};`);
  await ctx.addInitScript(seed());
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(`host: ${e.message}`));
  page.on("dialog", d => d.accept());
  await page.goto(`http://127.0.0.1:${port}/desktop/?surface=designer`, { waitUntil: "load" });
  return { ctx, page };
}

const health = async () => (await fetch(`http://127.0.0.1:${port}/health`)).json();
async function until(fn, ms = 8000, step = 150) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = await fn().catch(() => null); if (v) return v; await wait(step); }
  return null;
}

try {
  let host = await openHost();
  check(await until(async () => (await health()).hasHost), "Designer servi par le pont : devient hôte sans paramètre");

  const info = await (await fetch(`http://127.0.0.1:${port}/__nocode/host`)).json();
  const join = info.lan.find(l => l.address === lan)?.joinUrl || info.lan[0]?.joinUrl;
  check(!!join && join.includes(`pair=${info.pairCode}`) && !join.includes("127.0.0.1"), "URL du QR : adresse réseau local + code", join);

  // QR affiché dans le Designer
  await host.page.evaluate(() => { document.querySelector("#hostCardPanel") && (document.querySelector("#hostCardPanel").hidden = false); });
  const qrShown = await host.page.evaluate(async () => {
    const btn = document.querySelector("#showHostCard");
    if (!btn) return "bouton absent";
    btn.click();
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 100));
      const p = document.querySelector("#hostCardPanel");
      if (p && !p.hidden && p.querySelector("svg") && /appairage/i.test(p.textContent)) return "ok";
    }
    return document.querySelector("#hostCardPanel")?.textContent?.slice(0, 120) || "panneau vide";
  });
  check(qrShown === "ok", "Designer : QR d'appairage + code affichés", qrShown);

  // Téléphone (viewport mobile), arrivée par le LAN avec l'URL du QR
  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await phoneCtx.addInitScript(`window.__QA_LAYOUT__ = ${JSON.stringify(LAYOUT)};`);
  await phoneCtx.addInitScript(seed());
  const phone = await phoneCtx.newPage();
  phone.on("pageerror", e => errors.push(`phone: ${e.message}`));
  await phone.goto(join, { waitUntil: "load" });
  const status = () => phone.evaluate(() => document.getElementById("netStatus")?.textContent || "");
  check(await until(async () => /Connecté/.test(await status())), "téléphone : connexion automatique depuis le QR", await status());
  check(!(await phone.evaluate(() => location.search)).includes("pair="), "code retiré de la barre d'adresse après connexion");
  check((await health()).companions >= 1, "pont : 1 téléphone appairé");

  await phone.click('[data-mode="TEST"]');
  const logText = () => phone.evaluate(() => document.getElementById("log")?.textContent || "");
  const tap = async (label) => {
    await phone.evaluate((l) => {
      const b = [...document.querySelectorAll("#grid .cs-widget")].find(x => x.textContent.includes(l));
      b?.click();
    }, label);
  };

  await tap("PING");
  check(await until(async () => /Feedback ← w-ping.*OK/.test(await logText())), "PING : aller-retour téléphone → Designer → téléphone");

  const playLabel = () => host.page.evaluate(() => document.querySelector("#play")?.textContent || "");
  if ((await playLabel()) === "Ⅱ") await host.page.click("#play"); // le Designer démarre en lecture
  await until(async () => (await playLabel()) === "▶", 3000);
  const before = await playLabel();
  check(before === "▶", "Designer à l'arrêt avant la commande", before);
  await tap("LECTURE");
  check(await until(async () => /Feedback ← w-play.*OK/.test(await logText())), "LECTURE : retour d'état OK");
  check(await until(async () => (await playLabel()) === "Ⅱ"), "LECTURE : le moteur du Designer est réellement en lecture", `${before} → ${await playLabel()}`);

  await tap("GO");
  check(await until(async () => /Feedback ← w-go/.test(await logText()) && !/Feedback ← w-go[^\n]*· OK/.test(await logText())),
    "GO sans conduite : échec explicite, jamais un faux succès");

  // Perte de la régie (Designer fermé) puis retour : le téléphone ne fait rien.
  await host.ctx.close();
  check(await until(async () => !(await health()).hasHost), "Designer fermé : pont sans hôte");
  await wait(400);
  await host.ctx.close().catch(() => {});
  host = await openHost();
  check(await until(async () => (await health()).hasHost), "Designer rouvert : hôte de retour");
  const n = (await logText()).match(/Feedback ← w-ping/g)?.length || 0;
  await tap("PING");
  check(await until(async () => ((await logText()).match(/Feedback ← w-ping/g)?.length || 0) > n), "après retour de la régie : commande OK sans reconnexion manuelle");

  // Redémarrage du pont (même port, même code) : reconnexion automatique du téléphone.
  const pair = server.getPairCode();
  await server.close();
  check(await until(async () => /Reconnexion|Erreur|Non connecté/.test(await status()), 6000), "pont arrêté : le téléphone affiche la perte", await status());
  server = await startRemoteServer({ port, host: "0.0.0.0", staticRoot: root, heartbeatMs: 1000, pairCode: pair, version: "qa" });
  check(await until(async () => /Connecté/.test(await status()), 15000), "pont relancé : téléphone reconnecté seul", await status());
  check(await until(async () => (await health()).hasHost, 15000), "pont relancé : Designer reconnecté seul");
  const m = (await logText()).match(/Feedback ← w-ping/g)?.length || 0;
  await tap("PING");
  check(await until(async () => ((await logText()).match(/Feedback ← w-ping/g)?.length || 0) > m), "après redémarrage du pont : commande OK");

  // Mauvais code : refus, pas de boucle de reconnexion.
  const intruder = await (await browser.newContext({ serviceWorkers: "block" })).newPage();
  const res = await intruder.goto(`http://${lan}:${port}/studio/?ws=${encodeURIComponent(`ws://${lan}:${port}`)}&pair=ZZZZZZ`);
  check(res.status() === 401, "mauvais code : application refusée (401)", String(res.status()));

  check(errors.length === 0, "aucune erreur JavaScript", errors.slice(0, 3).join(" | "));
} catch (e) {
  check(false, "exception", e.stack || String(e));
} finally {
  await browser.close();
  await server.close().catch(() => {});
}

const failed = results.filter(r => !r.ok).length;
console.log(`\nCompanion ↔ Designer : ${results.length - failed}/${results.length}`);
process.exit(failed ? 1 : 0);
