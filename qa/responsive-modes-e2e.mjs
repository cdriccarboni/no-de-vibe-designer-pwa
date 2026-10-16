// Responsive réel du Designer (Chromium headless) : à 375/390/430/768/1024/1440 px, clique vraiment
// Bureau, Plateau et Exemple, et vérifie l'état obtenu (pas de simple capture).
// Usage : PLAYWRIGHT_PATH=/chemin/node_modules/playwright [CHROME=/chemin/chrome] node qa/responsive-modes-e2e.mjs
// Sans CHROME, le Chromium fourni par Playwright est utilisé (npx playwright install chromium).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".webmanifest":"application/manifest+json", ".png":"image/png", ".wasm":"application/wasm" };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
const base = process.env.NVD_URL || (await new Promise(r => server.listen(0, "127.0.0.1", r)), `http://127.0.0.1:${server.address().port}/desktop/index.html`);
const shots = process.env.SHOTS_DIR;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: true });
const WIDTHS = [375, 390, 430, 768, 1024, 1440];
let failures = 0;
const check = (w, ok, msg) => { if (!ok) { failures++; console.log(`✗ ${w}px · ${msg}`); } };
for (const w of WIDTHS) {
  const mobile = w <= 760;
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 800 ? 844 : w < 1100 ? 1366 : 900 }, hasTouch: w < 1100, isMobile: mobile, serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e.message || e)));
  await page.goto(base, { waitUntil: "load" });
  await page.waitForTimeout(800);
  // En-tête : aucun bouton visible ne sort de l'écran ni n'est recouvert par un voisin.
  const header = await page.evaluate(() => [...document.querySelectorAll(".topbar button, .topbar a")].filter(e => e.offsetParent && e.getBoundingClientRect().width > 0).map(e => {
    const b = e.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { id: e.id || e.textContent.trim(), out: b.left < -1 || b.right > innerWidth + 1, covered: !(hit && (e === hit || e.contains(hit))) };
  }));
  for (const h of header) { check(w, !h.out, `en-tête : « ${h.id} » hors écran`); check(w, !h.covered, `en-tête : « ${h.id} » recouvert`); }
  check(w, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "défilement horizontal de la page");
  const tap = sel => (mobile ? page.tap(sel, { timeout: 4000 }) : page.click(sel, { timeout: 4000 })).catch(e => { throw new Error(`${sel} : ${(e.message.match(/<[^\n]*intercepts pointer events/) || [e.message.split("\n")[0]])[0]}`); });
  try { await tap("#modePlateau"); check(w, await page.evaluate(() => document.body.dataset.workspace === "plateau" && document.querySelector("#modePlateau").classList.contains("active")), "Plateau non activé"); }
  catch (e) { check(w, false, `Plateau non cliquable : ${e.message.split("\n")[0]}`); }
  try { await tap("#modeBureau"); check(w, await page.evaluate(() => document.body.dataset.workspace === "bureau" && document.querySelector("#modeBureau").classList.contains("active")), "Bureau non activé"); }
  catch (e) { check(w, false, `Bureau non cliquable : ${e.message.split("\n")[0]}`); }
  if (mobile) {
    await tap("#libraryToggle");
    const lib = await page.evaluate(() => { const l = document.querySelector(".library").getBoundingClientRect(); const t = document.querySelector(".topbar").getBoundingClientRect(); return { top: l.top, bottom: l.bottom, tb: t.bottom, vh: innerHeight }; });
    check(w, lib.top >= lib.tb - 1 && lib.bottom <= lib.vh + 1, `tiroir Library mal placé (${JSON.stringify(lib)})`);
  }
  try {
    await tap("#loadExampleBtn");
    const st = await page.evaluate(() => {
      const ban = document.querySelector("#demoModeBanner"); const bb = ban.getBoundingClientRect();
      const pv = document.querySelector("#previewPanel").getBoundingClientRect();
      const lib = document.querySelector(".library"); const lb = lib.getBoundingClientRect();
      const libHit = lb.width > 0 ? document.elementFromPoint(lb.left + lb.width / 2, lb.top + 20) : null;
      return { demo: document.body.classList.contains("demo-mode"), banner: !ban.classList.contains("hidden") && bb.top >= 0 && bb.bottom <= innerHeight + 1,
        preview: pv.top >= -1 && pv.left >= -1 && pv.right <= innerWidth + 1 && pv.bottom <= innerHeight + 1,
        libraryOpen: document.body.classList.contains("library-open"), libVisible: !!(libHit && lib.contains(libHit)) };
    });
    check(w, st.demo && st.banner, `Exemple : mode démo/bannière absents (${JSON.stringify(st)})`);
    check(w, st.preview, "Exemple : Preview hors de l'écran");
    if (mobile) check(w, st.libVisible, "Exemple : la Library ouverte est masquée");
    if (shots) await page.screenshot({ path: path.join(shots, `responsive-${w}-exemple.png`) });
    await tap("#demoModeBanner button");
    check(w, await page.evaluate(() => !document.body.classList.contains("demo-mode")), "Exemple : sortie impossible");
  } catch (e) { check(w, false, `Exemple non cliquable : ${e.message.split("\n")[0]}`); }
  check(w, errs.length === 0, `erreurs JS : ${errs.slice(0, 2).join(" | ")}`);
  if (shots) await page.screenshot({ path: path.join(shots, `responsive-${w}.png`) });
  console.log(`· ${w}px vérifié`);
  await ctx.close();
}
await browser.close(); server.close();
console.log(failures ? `ÉCHEC : ${failures} problème(s)` : `OK : ${WIDTHS.length} largeurs, Bureau/Plateau/Exemple cliqués et vérifiés`);
process.exit(failures ? 1 : 0);
