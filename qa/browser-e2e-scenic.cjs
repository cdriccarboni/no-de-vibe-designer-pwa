// E2E navigateur réel (Chrome système + puppeteer-core). Usage: node qa/browser-e2e-scenic.cjs  (PUPPETEER_PATH=/chemin/node_modules/puppeteer-core)
const http = require("http"), fs = require("fs"), path = require("path");
const puppeteer = require(process.env.PUPPETEER_PATH || "puppeteer-core");
const root = path.resolve(__dirname, "..");
const types = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".webmanifest":"application/json", ".png":"image/png", ".wasm":"application/wasm", ".mp3":"audio/mpeg", ".data":"application/octet-stream" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
const ok = (c, m) => { if (!c) { console.error("FAIL ·", m); process.exitCode = 1; throw new Error(m); } console.log("OK ·", m); };
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
  const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${base}/desktop/index.html`, { waitUntil: "load" }); await new Promise(r => setTimeout(r, 1500));
  await page.click('[data-right-pane="elements"]');
  await page.waitForSelector("#installScenicPack", { visible: true, timeout: 5000 });
  ok(true, "onglet Éléments avec bouton Pack Scénographe");
  const count = () => page.$$eval(".element-card", c => c.length);
  const before = await count();
  await page.click("#installScenicPack"); await new Promise(r => setTimeout(r, 400));
  const after1 = await count(); ok(after1 >= before + 25, `pack installé (${before} → ${after1} éléments)`);
  await page.click("#installScenicPack"); await new Promise(r => setTimeout(r, 400));
  ok(await count() === after1, "2e clic idempotent (aucun doublon)");
  const clipsBefore = await page.$$eval(".clip", c => c.length);
  await page.click(".element-card [data-place-element]"); await new Promise(r => setTimeout(r, 400));
  const clipsAfter = await page.$$eval(".clip", c => c.length); ok(clipsAfter === clipsBefore + 1, "élément du pack placé sur la timeline");
  const fatal = errors.filter(e => !/favicon|net::ERR|Failed to load resource|ServiceWorker|manifest|^pd |version [0-9]|for PD version/i.test(e));
  ok(fatal.length === 0, `aucune erreur JS console (${fatal.join(" | ").slice(0, 300)})`);
  await browser.close(); server.close(); console.log("BROWSER E2E OK");
})().catch(async e => { console.error(e.message); process.exitCode = 1; server.close(); setTimeout(() => process.exit(1), 100); });
