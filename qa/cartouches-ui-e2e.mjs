// E2E réel (Chrome) du panneau Conduite · cartouches dans le Designer.
// Vérifie : création/modification, tri, glisser-déposer, sélection multiple, favoris, couleurs, groupes, notes,
// annuler/rétablir, sauvegarde + rechargement, export/import, IDs de cues inchangés, GO inchangé,
// sauvegarde illisible non écrasée, cartouches d'une cue supprimée conservées.
// Usage : PLAYWRIGHT_PATH=… CHROME=… node qa/cartouches-ui-e2e.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startRemoteServer } from "../bridge/remote-server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (cond, label, detail = "") => { results.push(!!cond); console.log(`${cond ? "OK  " : "FAIL"} · ${label}${detail ? " · " + detail : ""}`); };

const server = await startRemoteServer({ port: 0, host: "127.0.0.1", staticRoot: root, osc: false, version: "qa" });
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-proxy-server"] });
const errors = [];
const CUES = [
  { id: "cue-alpha", kind: "cue", label: "Ouverture", start: 0, duration: 1, number: "1", actions: [{ type: "jump-time", value: 0 }] },
  { id: "cue-beta", kind: "cue", label: "Tempête", start: 5, duration: 1, number: "2", actions: [{ type: "set-param", nodeId: "n1", key: "opacity", value: 0.5 }] },
  { id: "cue-gamma", kind: "cue", label: "Calme", start: 9, duration: 1, number: "3" },
  { id: "cue-delta", kind: "cue", label: "Final", start: 14, duration: 1, number: "4" }
];
try {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, serviceWorkers: "block", acceptDownloads: true });
  await ctx.addInitScript(cues => {
    if (localStorage.getItem("qa.seeded")) return;
    localStorage.clear();
    localStorage.setItem("qa.seeded", "1");
    localStorage.setItem("nvd.general", JSON.stringify({ restoreAutosave: true, loadDemo: false, plugAndPlay: false }));
    localStorage.setItem("cvd.autosave", JSON.stringify({ schema: "cvd.graph", version: 2, appVersion: "3.3.18", name: "QA Conduite", nodes: [], edges: [], timeline: cues, controls: [] }));
  }, CUES);
  let page = await ctx.newPage();
  page.on("pageerror", e => errors.push(e.message));
  const url = `http://127.0.0.1:${server.port}/desktop/?surface=designer`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(800);

  const open = async () => { if (!(await page.locator("#conduiteDialog[open]").count())) await page.click("#conduiteOpen"); await page.waitForSelector("#conduiteDialog[open] .cd-row"); };
  const order = () => page.$$eval(".cd-row", rows => rows.map(r => r.dataset.id));
  const labels = () => page.$$eval(".cd-row .cd-label", els => els.map(e => e.textContent));
  const saved = () => page.evaluate(() => { const p = JSON.parse(localStorage.getItem("cvd.autosave") || "{}"); return p.meta?.cartouches ? JSON.parse(p.meta.cartouches) : null; });
  const ids = () => page.evaluate(() => JSON.parse(localStorage.getItem("cvd.autosave")).timeline.map(c => c.id + ":" + c.label + ":" + c.start));
  const idsBefore = CUES.map(c => c.id + ":" + c.label + ":" + c.start);

  // Modifie le stockage hors de l'app (page fermée → pas d'autosave de fermeture), puis rouvre le Designer.
  async function mutateStorageAndReopen(fnSource) {
    await page.close();
    const raw = await ctx.newPage();
    await raw.goto(`http://127.0.0.1:${server.port}/build-info.json`);
    // Toutes les copies du projet (autosave, sauvegarde manuelle, reprise après crash) reçoivent la même modification.
    await raw.evaluate(src => {
      const fn = new Function("p", src);
      for (const key of Object.keys(localStorage)) {
        try { const p = JSON.parse(localStorage.getItem(key)); if (p && p.schema === "cvd.graph") { fn(p); localStorage.setItem(key, JSON.stringify(p)); } } catch { /* pas un projet */ }
      }
    }, fnSource);
    await raw.evaluate(() => new Promise(r => { const q = indexedDB.deleteDatabase("nvd-projects"); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
    await raw.close();
    page = await ctx.newPage();
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
    await open();
  }
  await open();
  check((await order()).join() === "cue-alpha,cue-beta,cue-gamma,cue-delta", "4 cartouches issues des cues, ordre d'origine");

  // Sélection + édition des propriétés
  await page.click('.cd-row[data-id="cue-beta"] .cd-label');
  await page.fill('[data-field="label"]', "Tempête (orage)");
  await page.fill('[data-field="page"]', "12");
  await page.fill('[data-field="group"]', "Acte 1");
  await page.fill('[data-field="notes"]', "Attention au noir avant");
  await page.click('.cd-edit .cd-sw[data-color="#5b8def"]');
  check((await labels())[1] === "Tempête (orage)", "libellé modifié");
  check(await page.locator('.cd-row[data-id="cue-beta"] .cd-page').textContent() === "p.12", "numéro de page affiché");
  check(await page.locator('.cd-row[data-id="cue-beta"] .cd-group').textContent() === "Acte 1", "groupe affiché");
  check((await page.locator('.cd-row[data-id="cue-beta"]').getAttribute("style")).includes("#5b8def"), "couleur appliquée");
  check(await page.locator('.cd-row[data-id="cue-beta"] .cd-note').count() === 1, "notes présentes");
  const preview = await page.locator(".cd-preview").textContent();
  check(preview.includes("set-param") && preview.includes("n1.opacity"), "aperçu en lecture seule des actions", preview.replace(/\s+/g, " ").slice(0, 80));

  // Favori + filtre
  await page.click('.cd-row[data-id="cue-delta"] [data-act="fav"]');
  await page.selectOption('[data-act="filter"]', "fav");
  check((await order()).join() === "cue-delta", "filtre Favoris");
  await page.selectOption('[data-act="filter"]', "group:Acte 1");
  check((await order()).join() === "cue-beta", "filtre par groupe");
  await page.selectOption('[data-act="filter"]', "all");

  // Réordonner : boutons, clavier, glisser-déposer
  await page.click('.cd-row[data-id="cue-gamma"] [data-act="up"]');
  check((await order()).join() === "cue-alpha,cue-gamma,cue-beta,cue-delta", "bouton ▲ réordonne");
  await page.focus('.cd-row[data-id="cue-delta"]');
  await page.keyboard.press("Alt+ArrowUp");
  check((await order()).join() === "cue-alpha,cue-gamma,cue-delta,cue-beta", "Alt+↑ réordonne au clavier");
  await page.dragAndDrop('.cd-row[data-id="cue-beta"]', '.cd-row[data-id="cue-alpha"]', { targetPosition: { x: 40, y: 3 } });
  check((await order()).join() === "cue-beta,cue-alpha,cue-gamma,cue-delta", "glisser-déposer réordonne", (await order()).join());

  // Sélection multiple : groupe + couleur + favoris en un pas
  await page.click('.cd-row[data-id="cue-alpha"] .cd-label');
  await page.click('.cd-row[data-id="cue-delta"] .cd-label', { modifiers: ["Shift"] });
  check((await page.locator(".cd-row.selected").count()) === 3, "sélection multiple (Maj)");
  await page.fill('[data-multi="group"]', "Fin");
  await page.click('[data-multicolor="#6fbf73"]');
  await page.click('[data-act="multi-fav"]');
  check((await page.locator(".cd-row .cd-group", { hasText: "Fin" }).count()) === 3, "groupe appliqué à la sélection");
  const afterMulti = await order();
  await page.click('[data-act="undo"]'); await page.click('[data-act="undo"]'); await page.click('[data-act="undo"]');
  check((await page.locator(".cd-row .cd-group", { hasText: "Fin" }).count()) === 0, "annuler ×3 défait groupe + couleur + favoris (un pas chacun)");
  await page.click('[data-act="redo"]'); await page.click('[data-act="redo"]'); await page.click('[data-act="redo"]');
  check((await page.locator(".cd-row .cd-group", { hasText: "Fin" }).count()) === 3 && (await order()).join() === afterMulti.join(), "rétablir ×3");

  // Sauvegarde dans le projet + rechargement
  const snap = await saved();
  check(snap?.version === 1 && snap.overrides["cue-beta"]?.label === "Tempête (orage)" && snap.overrides["cue-beta"]?.color === "#5b8def", "présentation écrite dans le projet (cvd.autosave)");
  const orderBefore = await order();
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(800);
  await open();
  check((await order()).join() === orderBefore.join() && (await labels()).includes("Tempête (orage)"), "rechargement : ordre et libellés conservés");

  // Séparation présentation / exécution : IDs, libellés et temps des cues inchangés
  check(JSON.stringify(await ids()) === JSON.stringify(idsBefore), "cues du projet inchangées (IDs, libellés d'origine, temps)", (await ids()).join(" | "));

  // GO depuis une cartouche : exécute la cue réelle (le journal du Designer l'enregistre)
  await page.click('.cd-row[data-id="cue-gamma"] [data-act="go"]');
  await page.waitForTimeout(300);
  const transport = await page.evaluate(() => JSON.parse(localStorage.getItem("cvd.autosave")).meta?.transport);
  check(transport?.cueId === "cue-gamma" && transport.action === "go", "GO d'une cartouche exécute la cue d'origine", JSON.stringify(transport));

  // Export / import
  const [download] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="export"]')]);
  const file = path.join(os.tmpdir(), `cd-${Date.now()}.json`);
  await download.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, "utf8"));
  check(exported.version === 1 && exported.profile === "conduite" && exported.overrides["cue-beta"], "export JSON versionné");
  await page.click('.cd-row[data-id="cue-beta"] .cd-label');
  await page.click('[data-act="reset-one"]');
  check((await labels()).includes("Tempête") && !(await labels()).includes("Tempête (orage)"), "rétablir la présentation d'origine d'une cartouche");
  await page.setInputFiles('input[data-act="import"]', file);
  await page.waitForTimeout(300);
  check((await labels()).includes("Tempête (orage)"), "import restaure la présentation");
  fs.writeFileSync(file, JSON.stringify({ version: 1, profile: "autre", overrides: {} }));
  await page.setInputFiles('input[data-act="import"]', file);
  await page.waitForTimeout(300);
  check((await page.locator(".cd-notice").count()) === 1 && (await labels()).includes("Tempête (orage)"), "import incompatible refusé sans perte", await page.locator(".cd-notice").textContent().catch(() => ""));
  fs.unlinkSync(file);

  // Cue supprimée : sa présentation est conservée
  const before = (await saved()).overrides["cue-delta"];
  await mutateStorageAndReopen('p.timeline = p.timeline.filter(c => c.id !== "cue-delta");');
  check(!(await order()).includes("cue-delta") && (await order()).length === 3, "cue supprimée : 3 cartouches restantes", (await order()).join() + " / ls=" + (await page.evaluate(() => JSON.parse(localStorage.getItem("cvd.autosave")).timeline.map(c => c.id).join())));
  await page.click('.cd-row[data-id="cue-gamma"] [data-act="fav"]');
  const orphan = (await saved()).overrides["cue-delta"];
  check(JSON.stringify(orphan) === JSON.stringify(before), "présentation de la cue supprimée conservée à l'écriture");

  // Sauvegarde illisible : jamais écrasée
  await mutateStorageAndReopen('p.meta = p.meta || {}; p.meta.cartouches = "{corrompu";');
  check((await page.locator(".cd-notice").count()) === 1 && (await order()).length === 3, "sauvegarde illisible : avertissement + présentation par défaut");
  await page.click('.cd-row[data-id="cue-alpha"] [data-act="fav"]');
  const raw = await page.evaluate(() => JSON.parse(localStorage.getItem("cvd.autosave")).meta.cartouches);
  check(raw === "{corrompu", "sauvegarde illisible non écrasée par une modification temporaire");

  check(errors.length === 0, "aucune erreur JS inattendue", errors.join(" | "));
} finally {
  await browser.close();
  await server.close();
}
const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} contrôles OK`);
process.exit(failed ? 1 : 0);
