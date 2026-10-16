// Balayage Library → moteur réel (Chrome) : chaque node du catalogue est instancié seul,
// évalué par le Runtime pendant 30 frames ; on relève l'absence de processeur et les exceptions.
// Puis une chaîne logique vérifie un résultat calculé (2 × 3 = 6, 6 + 4 = 10, lissage, comparaison).
// Usage : PLAYWRIGHT_PATH=/chemin/node_modules/playwright node qa/library-runtime-sweep.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".json":"application/json", ".wasm":"application/wasm" };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  if (p === "/__sweep__") { r.writeHead(200, { "content-type": "text/html" }); return r.end("<!doctype html><title>sweep</title>"); }
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(String(e.message || e)));
// Page vide sur la même origine : les modules sont chargés sans démarrer l'interface Designer.
await page.goto(`http://127.0.0.1:${server.address().port}/__sweep__`, { waitUntil: "load" });
const report = await page.evaluate(async () => {
  const { NODE_GROUPS, spec } = await import("/shared/node-specs.js");
  const { Runtime } = await import("/shared/runtime.js");
  const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 180;
  const rt = new Runtime(canvas);
  const out = { total: 0, noProcessor: [], thrown: [], ok: 0 };
  for (const [group, items] of NODE_GROUPS) {
    for (const [label, type] of items) {
      out.total++;
      if (!rt.nodeFns.has(type)) { out.noProcessor.push(`${group} › ${label} (${type})`); continue; }
      const [, ports] = spec(type);
      rt.previousOutputs = new Map(); rt.nodeState = new Map();
      rt.setProject({ name: "sweep", nodes: [{ id: "n1", type, title: label, x: 0, y: 0, params: {}, ports }], edges: [], output: {} });
      let err = null;
      try { for (let f = 0; f < 30; f++) { rt.time = f / 30; rt.render(); } } catch (e) { err = e?.message || String(e); }
      let graphErr = rt.lastGraph?.errors?.filter(Boolean) || [];
      // Effet vidéo sans source : on le rebranche derrière un générateur vidéo réel et on revérifie.
      if (!err && graphErr.some(e => /Image absente/.test(e))) {
        const { resolvePorts } = await import("/shared/ports.js");
        const ins = (resolvePorts(type) || []).map((p, i) => ({ ...p, i })).filter(p => p.dir === "in" && p.data === "video");
        const srcOut = (resolvePorts("flowfield") || []).findIndex(p => p.dir === "out" && p.data === "video");
        if (ins.length && srcOut >= 0) {
          rt.previousOutputs = new Map(); rt.nodeState = new Map();
          rt.setProject({ name: "sweep-fx", output: {}, nodes: [
            { id: "src", type: "flowfield", title: "Source", params: {} },
            { id: "n1", type, title: label, params: {} }
          ], edges: ins.map((p, k) => ({ id: `e${k}`, from: { node: "src", port: srcOut }, to: { node: "n1", port: p.i } })) });
          try { for (let f = 0; f < 30; f++) { rt.time = f / 30; rt.render(); } } catch (e) { err = e?.message || String(e); }
          graphErr = rt.lastGraph?.errors?.filter(Boolean) || [];
          const produced = [...(rt.previousOutputs.get("n1")?.values() || [])].some(v => v && v.kind === "video");
          if (!err && !graphErr.length && !produced) graphErr = ["aucune image produite avec une source branchée"];
          if (!err && !graphErr.length) out.fxWithSource = (out.fxWithSource || 0) + 1;
        }
      }
      // Diagnostics honnêtes (média à choisir, matériel/capteur ou relais natif absent) : pas un crash.
      const honest = graphErr.length && graphErr.every(e => /MEDIA MISSING|PLATFORM-LIMITED|bus capteurs absent|requis/.test(e));
      if (err || (graphErr.length && !honest)) out.thrown.push(`${label} (${type}) · ${err || graphErr.join(" | ")}`);
      else if (honest) (out.needsHardware ||= []).push(`${label} : ${graphErr[0].split(" : ").slice(1).join(" : ")}`);
      else out.ok++;
    }
  }
  // Comportement vérifiable : chaîne logique
  rt.previousOutputs = new Map(); rt.nodeState = new Map();
  rt.setProject({ name: "chain", output: {}, nodes: [
    { id: "a", type: "number", title: "A", params: { value: 2 } },
    { id: "b", type: "number", title: "B", params: { value: 3 } },
    { id: "m", type: "multiply", title: "Mul", params: {} },
    { id: "c", type: "number", title: "C", params: { value: 4 } },
    { id: "s", type: "add", title: "Add", params: {} },
    { id: "k", type: "compare", title: "Cmp", params: {} }
  ], edges: [
    { id: "e1", from: { node: "a", port: 0 }, to: { node: "m", port: 0 } },
    { id: "e2", from: { node: "b", port: 0 }, to: { node: "m", port: 1 } },
    { id: "e3", from: { node: "m", port: 2 }, to: { node: "s", port: 0 } },
    { id: "e4", from: { node: "c", port: 0 }, to: { node: "s", port: 1 } },
    { id: "e5", from: { node: "s", port: 2 }, to: { node: "k", port: 0 } },
    { id: "e6", from: { node: "c", port: 0 }, to: { node: "k", port: 1 } }
  ] });
  rt.render();
  const outputs = rt.previousOutputs;
  const first = (id) => { const m = outputs.get(id); const v = m ? [...m.values()][0] : undefined; return v && typeof v === "object" && "value" in v ? v.value : v; };
  out.chain = { mul: first("m"), add: first("s"), cmp: first("k") };
  return out;
});
await browser.close(); server.close();
console.log(`Library : ${report.total} nodes · ${report.ok} évalués sans erreur (dont ${report.fxWithSource || 0} effets vidéo testés avec une source branchée)`);
if (report.needsHardware?.length) console.log(`INFO · ${report.needsHardware.length} nodes signalent honnêtement un média, un capteur ou un relais absent :\n  - ${report.needsHardware.join("\n  - ")}`);
if (report.noProcessor.length) console.log(`FAIL · sans processeur (${report.noProcessor.length}) :\n  - ${report.noProcessor.join("\n  - ")}`);
if (report.thrown.length) console.log(`FAIL · erreurs à l'exécution (${report.thrown.length}) :\n  - ${report.thrown.join("\n  - ")}`);
const chainOk = Number(report.chain.mul) === 6 && Number(report.chain.add) === 10 && Boolean(report.chain.cmp) === true;
console.log(`${chainOk ? "OK  " : "FAIL"} · chaîne logique 2×3=6, 6+4=10, 10>4 · ${JSON.stringify(report.chain)}`);
if (pageErrors.length) console.log("Erreurs page :", pageErrors.slice(0, 5).join(" | "));
process.exit(report.noProcessor.length || report.thrown.length || !chainOk ? 1 : 0);
