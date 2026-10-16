// E2E Designer — parcours réel dans Chrome (Playwright) :
// Library, ajout, câblage, exécution, undo/redo, sauvegarde/rechargement, exports, fichier corrompu.
// Usage : PLAYWRIGHT_PATH=/chemin/node_modules/playwright node qa/designer-workflow-e2e.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".webmanifest":"application/json", ".png":"image/png", ".wasm":"application/wasm" };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
const results = [];
const check = (cond, label, detail = "") => { results.push({ ok: !!cond, label, detail }); console.log(`${cond ? "OK  " : "FAIL"} · ${label}${detail ? " · " + detail : ""}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));

await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true, serviceWorkers: "block" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e.message || e)));
// Le lien optionnel vers un lab non publié est sondé en HEAD : son 404 est attendu (il garde le lien masqué).
page.on("console", m => { if (m.type() === "error" && !/\/labs\/[^/]+\/dist\//.test(m.location()?.url || "")) errors.push(m.text()); });
page.on("dialog", d => d.accept());
const autosavedEdges = () => page.evaluate(() => JSON.parse(localStorage.getItem("cvd.autosave") || "{}").edges?.length ?? -1);
try {
  // Démarrage propre : pas d'exemple auto, autosave vide.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e.init")) {
      localStorage.clear();
      localStorage.setItem("nvd.general", JSON.stringify({ restoreAutosave: true, loadDemo: false, plugAndPlay: false }));
      sessionStorage.setItem("e2e.init", "1");
    }
  });
  await page.goto(`${base}/desktop/index.html`, { waitUntil: "load" });
  await wait(2000);
  const bootErrors = [...errors];
  check(bootErrors.length === 0, "Démarrage sans erreur JS", bootErrors.slice(0, 3).join(" | "));

  // 1. Library
  const lib = await page.evaluate(async () => {
    const { NODE_GROUPS } = await import("/shared/node-specs.js");
    const { isExecutable } = await import("/shared/ports.js");
    const all = NODE_GROUPS.flatMap(([, l]) => l);
    const shown = [...document.querySelectorAll("#libraryList .lib-item")].map(e => e.dataset.add);
    const visibleBox = [...document.querySelectorAll("#libraryList .lib-item")].filter(e => e.getBoundingClientRect().height > 0).length;
    return { total: all.length, executable: all.filter(([, t]) => isExecutable(t)).length, shown: shown.length, visibleBox,
      hiddenExec: all.filter(([, t]) => isExecutable(t) && !shown.includes(t)).map(([n]) => n),
      nonExec: all.filter(([, t]) => !isExecutable(t)).map(([, t]) => t) };
  });
  check(lib.hiddenExec.length === 0, `Library : tous les nodes exécutables affichés (${lib.shown} affichés / ${lib.total} catalogue, ${lib.executable} exécutables)`, lib.hiddenExec.join(", "));
  check(lib.visibleBox > 0, "Library : éléments réellement visibles à l'écran", `${lib.visibleBox} visibles`);
  console.log("     nodes non exécutables (masqués en mode Production) :", lib.nonExec.join(", ") || "aucun");

  // 2. Ajout par clic dans la Library
  const count = () => page.locator("#patchSpace .node").count();
  const before = await count();
  for (const t of ["number", "number", "multiply"]) { await page.locator(`#libraryList .lib-item[data-add="${t}"]`).first().click(); await wait(120); }
  await wait(300);
  const after = await count();
  check(after === before + 3, "Ajout de nodes depuis la Library (clic)", `${before} → ${after}`);

  // 3. Câblage par glisser entre ports (vraie souris)
  async function dragPort(fromSel, toSel) {
    const a = await page.locator(fromSel).first().boundingBox();
    const b = await page.locator(toSel).first().boundingBox();
    if (!a || !b) return false;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); await page.mouse.up(); await wait(250);
    return true;
  }
  const ids = await page.evaluate(() => [...document.querySelectorAll("#patchSpace .node")].slice(-3).map(n => n.dataset.id));
  const portSel = (id, dir, idx) => `.port-dot[data-node="${id}"][data-port-index="${idx}"][data-dir="${dir}"]`;
  const d1 = await dragPort(portSel(ids[0], "out", 0), portSel(ids[2], "in", 0));
  const d2 = await dragPort(portSel(ids[1], "out", 0), portSel(ids[2], "in", 1));
  const edges = await autosavedEdges();
  check(d1 && d2 && edges === 2, "Câblage souris entre ports (2 câbles) + autosave", `drag=${d1 && d2} câbles(autosave)=${edges}`);

  // 4. Undo / Redo
  await page.locator("#patchSpace").click({ position: { x: 5, y: 5 } }).catch(() => {});
  const n0 = await count();
  await page.keyboard.press("Meta+z"); await wait(250);
  const n1 = await count();
  const e1 = await autosavedEdges();
  await page.keyboard.press("Meta+Shift+z"); await wait(250);
  const e2 = await autosavedEdges();
  check(e1 === 1 && e2 === 2 && n1 === n0, "Undo annule le dernier câble, Redo le rétablit", `nodes ${n0}/${n1} · câbles undo=${e1} redo=${e2}`);

  // 5. Rechargement : l'autosave restaure le patch
  await page.reload({ waitUntil: "load" }); await wait(2000);
  const restored = { nodes: await count(), edges: await autosavedEdges() };
  check(restored.nodes === n0 && restored.edges === 2, "Rechargement : nodes et câbles restaurés depuis l'autosave", JSON.stringify(restored));

  // 6. Undo juste après rechargement ne doit pas vider le projet
  await page.locator("#patchSpace").click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.keyboard.press("Meta+z"); await wait(250);
  const afterUndoReload = await count();
  check(afterUndoReload === n0, "Undo après rechargement ne détruit pas le projet restauré", `${n0} → ${afterUndoReload}`);
  await page.keyboard.press("Meta+Shift+z"); await wait(200);

  // 7. Exports : téléchargements réels et contenu structurellement valide
  async function grab(btn) {
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 4000 }).catch(() => null), page.evaluate(id => document.getElementById(id)?.click(), btn)]);
    if (!dl) return null;
    return fs.readFileSync(await dl.path(), "utf8");
  }
  const maxpat = await grab("exportMaxBtn");
  let maxOk = false, maxDetail = "aucun téléchargement";
  if (maxpat) { try { const j = JSON.parse(maxpat); const lines = j.patcher.lines; maxOk = j.patcher.boxes.length >= 3 && lines.length >= 2 && lines.some(l => l.patchline.destination[1] === 1); maxDetail = `${j.patcher.boxes.length} boxes, inlets cibles ${lines.map(l => l.patchline.destination[1]).join(",")}`; } catch (e) { maxDetail = e.message; } }
  check(maxOk, "Export Max : .maxpat JSON valide, câble b → inlet droit", maxDetail);
  const pd = await grab("exportPdBtn");
  const pdOk = !!pd && /^#N canvas/.test(pd) && !/#X obj [-\d]+ [-\d]+ floatatom/.test(pd) && /#X connect \d+ 0 \d+ 1;/.test(pd);
  check(pdOk, "Export Pure Data : floatatom natif, câble b → inlet droit", pd ? pd.split("\n").slice(0, 8).join(" ⏎ ") : "aucun téléchargement");
  const td = await grab("exportTdBtn");
  const tdOk = !!td && /chopop/.test(td) && /setInput\(1,/.test(td);
  check(tdOk, "Export TouchDesigner : Math CHOP en multiplication, 2 entrées", td ? "" : "aucun téléchargement");

  // 8. Ouverture d'un fichier corrompu : message clair, projet courant intact
  errors.length = 0;
  const nBefore = await count();
  await page.setInputFiles("#projectFile", { name: "casse.cvd.json", mimeType: "application/json", buffer: Buffer.from("{ pas du json") });
  await wait(400);
  const termHas = await page.evaluate(() => /invalide|illisible|impossible/i.test(document.querySelector("#termLog")?.textContent || ""));
  check(errors.filter(e => /JSON/.test(e)).length === 0 && termHas && (await count()) === nBefore, "Fichier projet corrompu : message utile, aucun crash, projet conservé", errors.slice(0, 2).join(" | "));

  // 9. Fenêtre étroite (≤760px) : la Library reste accessible via « ＋ Objets »
  await page.setViewportSize({ width: 700, height: 900 }); await wait(300);
  const hiddenBefore = await page.locator('#libraryList .lib-item[data-add="number"]').first().isVisible();
  await page.locator("#libraryToggle").click(); await wait(250);
  const shownAfter = await page.locator('#libraryList .lib-item[data-add="number"]').first().isVisible();
  const nNarrow = await count();
  if (shownAfter) await page.locator('#libraryList .lib-item[data-add="number"]').first().click();
  await wait(250);
  const closed = !(await page.evaluate(() => document.body.classList.contains("library-open")));
  check(!hiddenBefore && shownAfter && (await count()) === nNarrow + 1 && closed, "Fenêtre étroite : Library ouverte par « ＋ Objets », ajout puis fermeture du tiroir", `masquée=${!hiddenBefore} ouverte=${shownAfter} fermée=${closed}`);
  await page.setViewportSize({ width: 1600, height: 950 });
} catch (e) {
  check(false, "Exécution du scénario", e.stack?.split("\n").slice(0, 3).join(" ") || String(e));
} finally {
  await browser.close(); server.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} vérifications OK`);
  process.exit(failed ? 1 : 0);
}
