// Smoke test de toutes les surfaces publiques (Chrome réel, desktop et mobile) :
// erreurs JS, ressources locales 404, liens internes cassés, nom produit affiché.
// Usage : PLAYWRIGHT_PATH=/chemin/node_modules/playwright node qa/surfaces-smoke-e2e.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".webmanifest":"application/manifest+json", ".png":"image/png", ".jpg":"image/jpeg", ".wasm":"application/wasm", ".woff2":"font/woff2" };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0].split("#")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const SURFACES = ["/", "/desktop/index.html", "/desktop/output.html", "/desktop/shortcuts.html", "/mobile/", "/mobile/?role=regie", "/mobile/?role=plateau", "/mobile/?role=camera", "/show/", "/studio/", "/companion/", "/radio/", "/install/", "/decouvrir/", "/downloads/", "/manuel/", "/privacy/"];
const IGNORE = [/ERR_CONNECTION_REFUSED/, /getUserMedia|Permission|NotAllowedError|requestMIDIAccess|serial|bluetooth/i, /\[libpd\]/, /favicon/i];
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
let failures = 0;
for (const [label, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { ...devices["iPhone 13"], defaultBrowserType: undefined }]]) {
  const ctx = await browser.newContext({ ...opts, serviceWorkers: "block" });
  for (const url of SURFACES) {
    const page = await ctx.newPage();
    const errs = [], missing = new Set();
    page.on("pageerror", e => errs.push(String(e.message || e)));
    // Les liens optionnels (data-optional-link) sont sondés en HEAD : un 404 y est attendu et les garde masqués.
    const probed = u => /\/labs\/[^/]+\/dist\//.test(u || "");
    page.on("console", m => { if (m.type() === "error" && !IGNORE.some(rx => rx.test(m.text())) && !probed(m.location()?.url)) errs.push(`${m.text()} (${(m.location()?.url || "").replace(base, "")})`); });
    page.on("response", res => { if (res.status() === 404 && res.url().startsWith(base) && !(res.request().method() === "HEAD" && probed(res.url()))) missing.add(res.url().slice(base.length)); });
    page.wrongNameSample = () => page.evaluate(() => ((document.title + " " + document.body.innerText).match(/.{0,40}(\bNo-de\b|\bNode Vibe\b|NoCode Vibe|No\[code\]).{0,40}/) || [""])[0]);
    try { await page.goto(base + url, { waitUntil: "load", timeout: 20000 }); await page.waitForTimeout(1500); }
    catch (e) { errs.push(`navigation : ${e.message.split("\n")[0]}`); }
    const info = await page.evaluate(() => ({
      title: document.title,
      wrongName: /\bNo-de\b|\bNode Vibe\b|NoCode Vibe|No\[code\]/.test(document.title + " " + (document.body?.innerText || "").slice(0, 4000)),
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
      links: [...document.querySelectorAll("a[href]:not([data-optional-link])")].map(a => a.getAttribute("href")).filter(h => h && !/^(https?:|mailto:|tel:|#|javascript:|blob:|data:)/.test(h))
    })).catch(() => ({ title: "?", wrongName: false, overflowX: false, links: [] }));
    const brokenLinks = [];
    for (const href of [...new Set(info.links)]) {
      const target = new URL(href, page.url());
      if (target.origin !== base) continue;
      let p = decodeURIComponent(target.pathname); if (p.endsWith("/")) p += "index.html";
      if (!fs.existsSync(path.join(root, p))) brokenLinks.push(href);
    }
    const problems = [
      ...errs.slice(0, 4).map(e => `JS : ${e.slice(0, 160)}`),
      ...[...missing].slice(0, 6).map(m => `404 : ${m}`),
      ...brokenLinks.slice(0, 6).map(h => `lien cassé : ${h}`),
      ...(info.wrongName ? [`nom produit : variante non canonique visible (attendu « No[co]de Vibe Designer ») · « ${await page.wrongNameSample().catch(() => "")} »`] : []),
      ...(label === "mobile" && info.overflowX && !/desktop|studio/.test(url) ? ["mobile : défilement horizontal de la page"] : [])
    ];
    if (problems.length) failures++;
    console.log(`${problems.length ? "FAIL" : "OK  "} · [${label}] ${url} · « ${info.title} »${problems.length ? "\n       - " + problems.join("\n       - ") : ""}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\n${failures ? failures + " surface(s) en échec" : "Toutes les surfaces OK"}`);
process.exit(failures ? 1 : 0);
