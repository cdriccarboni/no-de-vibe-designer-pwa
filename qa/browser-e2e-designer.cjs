// E2E Designer : Library complète, fenêtres déplaçables, timeline alignée. Chrome réel.
const http = require("http"), fs = require("fs"), path = require("path");
const puppeteer = require(process.env.PUPPETEER_PATH || "puppeteer-core");
const root = path.resolve(__dirname, "..");
const T = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".webmanifest":"application/json", ".png":"image/png", ".wasm":"application/wasm" };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html"; const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": T[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
const ok = (c, m) => { if (!c) { console.error("FAIL ·", m); throw new Error(m); } console.log("OK ·", m); };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
  await page.goto(`${base}/desktop/index.html`, { waitUntil: "load" }); await wait(1500);

  // Library complète : chaque node du catalogue est présent dans le DOM
  const { NODE_GROUPS } = await import(path.join(root, "shared/node-specs.js"));
  const expected = NODE_GROUPS.reduce((n, [, l]) => n + l.length, 0);
  const items = await page.$$eval("#libraryList *", els => els.map(e => e.textContent.trim()).join("\n"));
  const missing = NODE_GROUPS.flatMap(([, l]) => l.map(([label]) => label)).filter(label => !items.includes(label));
  ok(missing.length === 0, `Library complète (${expected} nodes${missing.length ? ", manquants: " + missing.slice(0, 5) : ""})`);

  // Fenêtres déplaçables : détacher la timeline puis la glisser
  const handle = await page.$("#timelinePanel .panel-head");
  const dock = await page.$("#timelinePanel .float-dock");
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + 40, hb.y + 10); await page.mouse.down(); await page.mouse.move(hb.x + 140, hb.y - 80, { steps: 8 }); await page.mouse.up(); await wait(300);
  const floating = await page.$eval("#timelinePanel", p => p.classList.contains("is-floating"));
  ok(floating, "timeline détachable par glisser sur son bandeau");
  const r1 = await page.$eval("#timelinePanel", p => { const b = p.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, vw: innerWidth, vh: innerHeight }; });
  ok(r1.y >= 0 && r1.x + r1.w > 96 && r1.x < r1.vw - 96, "fenêtre flottante visible dans l'écran");
  const hb2 = await (await page.$("#timelinePanel .panel-head")).boundingBox();
  await page.mouse.move(hb2.x + 40, hb2.y + 10); await page.mouse.down(); await page.mouse.move(-500, 5000, { steps: 8 }); await page.mouse.up(); await wait(300);
  const r2 = await page.$eval("#timelinePanel", p => { const b = p.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, vw: innerWidth, vh: innerHeight }; });
  ok(r2.y < r2.vh - 20 && r2.x + r2.w > 40, "fenêtre ramenée dans l'écran même si on tire hors zone");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("nvd.float.panels.v1") || "{}"));
  ok(saved.timeline?.floating === true, "position de la fenêtre persistée");
  await page.reload({ waitUntil: "load" }); await wait(1200);
  ok(await page.$eval("#timelinePanel", p => p.classList.contains("is-floating")), "fenêtre restaurée après rechargement");
  const dockBtn = await page.$("#timelinePanel .float-dock"); await dockBtn.click(); await wait(300);
  ok(!(await page.$eval("#timelinePanel", p => p.classList.contains("is-floating"))), "timeline ré-ancrable");

  // Timeline alignée : colonnes d'en-tête = colonnes de lignes ; un clip ne déborde pas de sa piste
  const al = await page.evaluate(() => {
    const m = sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, width: b.width }; };
    return { head: m(".timeline-head"), track: m(".timeline-track"), lh: m(".layers-head"), lab: m(".timeline-track-label"), rh: m(".route-head"), rt: m(".timeline-route") };
  });
  ok(Math.abs(al.head.left - al.track.left) <= 2 && Math.abs(al.head.width - al.track.width) <= 2, `en-tête Timeline aligné sur les pistes (Δx=${(al.head.left - al.track.left).toFixed(1)}px)`);
  ok(al.head && al.track && al.lh && al.lab, "éléments de la timeline présents");
  ok(Math.abs(al.rh.left - al.rt.left) <= 2 && Math.abs(al.rh.width - al.rt.width) <= 2, "colonne Sortie alignée");
  ok(Math.abs(al.lh.left - al.lab.left) <= 2 && Math.abs(al.lh.width - al.lab.width) <= 2, "colonne Layers alignée");
  await browser.close(); server.close(); console.log("DESIGNER E2E OK");
})().catch(e => { console.error(e.message); server.close(); setTimeout(() => process.exit(1), 100); });
