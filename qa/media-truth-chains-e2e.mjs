// Chaînes de vérité avec le vrai moteur (Runtime + graph-engine + sharedAudio) dans Chromium.
// Périphériques SIMULÉS par Chromium (--use-fake-device-for-media-stream : bip micro + mire caméra animée) :
// le matériel réel (micro/caméra physiques) n'est PAS testé ici.
//  1) libpd (sortie audio) + micro → Audio Mixer → Gain : niveau non nul en sortie du mixer et du gain.
//  2) micro RMS → Flow Field (énergie) : la valeur reçue par le node particules est le RMS mesuré (> 0).
//  3) caméra → Optical Flow (mouvement > 0) → Shader (paramètre glsl) : le shader reçoit le mouvement.
//  4) États honnêtes : micro refusé → « REFUSÉ », pas d'appareil → « AUCUN … ».
// Usage : PLAYWRIGHT_PATH=… [CHROME=…] node qa/media-truth-chains-e2e.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".json":"application/json", ".wasm":"application/wasm" };
const server = http.createServer((q, r) => {
  const p = decodeURIComponent(q.url.split("?")[0]);
  if (p === "/__t.html") { r.writeHead(200, { "content-type": "text/html" }); return r.end("<!doctype html><title>t</title><canvas id=c width=320 height=180></canvas>"); }
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const fake = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"];
let fail = 0; const ok = (c, m, d = "") => { console.log(`${c ? "✓" : "✗"} ${m}${d !== "" ? " · " + d : ""}`); if (!c) fail++; };

async function run(args, fn, arg = null, opts = {}) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: true, args });
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(String(e.message || e)));
  await page.goto(base + "/__t.html");
  const res = await page.evaluate(fn, arg);
  await browser.close();
  return { res, errors };
}

const chains = async () => {
  const { Runtime } = await import("/shared/runtime.js");
  const { LIBPD_AUDIO_PATCH } = await import("/shared/libpd-runtime.js");
  const N = (id, type, params = {}) => ({ id, type, title: id, x: 0, y: 0, params: { enabled: true, duration: 5, opacity: 1, ...params } });
  const E = (id, a, ap, b, bp) => ({ id, from: { node: a, port: ap }, to: { node: b, port: bp } });
  const project = {
    schema: "cvd.graph", format: 2, meta: {}, output: { background: "#000" }, timeline: [], layers: [], controls: [], channels: [],
    nodes: [N("pd", "libpd", { audioOut: true, patch: LIBPD_AUDIO_PATCH, level: 0.5 }), N("mic", "audio-in"), N("mix", "audio-mixer"), N("gain", "audio-gain", { gain: 1 }),
      N("ff", "flowfield", { width: 160, height: 90, count: 60 }), N("cam", "camera"), N("flow", "opticalflow", { step: 4 }), N("sh", "shader")],
    edges: [E("e1", "pd", 3, "mix", 0), E("e2", "mic", 0, "mix", 1), E("e3", "mix", 4, "gain", 0), E("e4", "mic", 1, "ff", 2), E("e5", "cam", 0, "flow", 0), E("e6", "flow", 1, "sh", 1)]
  };
  const rt = new Runtime(document.getElementById("c"));
  rt.setProject(project);
  await rt.enableCamera("user");
  const outs = () => rt.lastGraph.outputs;
  const num = (id, port) => { const v = outs()?.get(id)?.get(port); return typeof v?.value === "number" ? v.value : null; };
  const inVal = (toId, toPort) => { const e = project.edges.find(x => x.to.node === toId && x.to.port === toPort); return num(e.from.node, e.from.port); };
  const best = { pd: 0, mic: 0, mix: 0, gain: 0, ff: 0, motion: 0, sh: 0 };
  let shaderFrame = false, pdStatus = "";
  for (let i = 0; i < 90; i++) {
    rt.render();
    await new Promise(r => setTimeout(r, 60));
    best.pd = Math.max(best.pd, num("pd", 1) || 0); best.mic = Math.max(best.mic, num("mic", 1) || 0);
    best.mix = Math.max(best.mix, num("mix", 5) || 0); best.gain = Math.max(best.gain, num("gain", 3) || 0);
    best.ff = Math.max(best.ff, inVal("ff", 2) || 0); best.motion = Math.max(best.motion, num("flow", 1) || 0); best.sh = Math.max(best.sh, inVal("sh", 1) || 0);
    shaderFrame ||= !!outs()?.get("sh")?.get(2);
    pdStatus = outs()?.get("pd")?.get(2)?.value || pdStatus;
  }
  const ffOut = !!outs()?.get("ff")?.get(3);
  return { best, shaderFrame, ffOut, pdStatus, errors: rt.lastGraph.errors.slice(0, 3), warnings: rt.lastGraph.warnings.slice(0, 3) };
};

const a = await run(fake, chains);
const b = a.res.best;
console.log("  (périphériques simulés par Chromium — matériel réel non testé)");
ok(b.pd > 0.01, "libpd dans sharedAudio : niveau non nul", `${b.pd.toFixed(4)} · ${a.res.pdStatus}`);
ok(b.mic > 0.001, "micro (simulé) : RMS non nul", b.mic.toFixed(4));
ok(b.mix > 0.01, "Audio Mixer (libpd + micro) : niveau non nul", b.mix.toFixed(4));
ok(b.gain > 0.01, "Gain après Mixer : niveau non nul", b.gain.toFixed(4));
ok(b.ff > 0.001 && a.res.ffOut, "chaîne micro RMS → Flow Field (énergie reçue + image rendue)", b.ff.toFixed(4));
ok(b.motion > 0, "caméra (simulée) → Optical Flow : mouvement > 0", b.motion.toFixed(4));
ok(b.sh > 0 && a.res.shaderFrame, "chaîne mouvement caméra → paramètre Shader (+ image rendue)", b.sh.toFixed(4));
ok(a.errors.length === 0, "aucune erreur JS", a.errors.slice(0, 2).join(" | "));

// États honnêtes : permission refusée (aucune permission accordée, pas de fake-ui) et absence d'appareil.
const state = async (absent = false) => {
  const { sharedAudio } = await import("/shared/audio-engine.js");
  const { mediaErrorState } = await import("/shared/media-errors.js");
  let mic = "";
  try { await sharedAudio.ensureInput("m1", absent ? { deviceId: "__aucun__" } : {}); mic = "ouvert"; } catch { mic = sharedAudio.inputFailure("m1")?.label || "?"; }
  let cam = "";
  try { await navigator.mediaDevices.getUserMedia(absent ? { video: { deviceId: { exact: "__aucun__" } } } : { video: true }); cam = "ouverte"; } catch (e) { cam = mediaErrorState(e, "caméra").label; }
  return { mic, cam };
};
const denied = await run(["--use-fake-device-for-media-stream", "--deny-permission-prompts"], state, false);
ok(/^REFUSÉ/.test(denied.res.mic), "micro refusé → état « REFUSÉ »", denied.res.mic);
ok(/^REFUSÉ/.test(denied.res.cam), "caméra refusée → état « REFUSÉ »", denied.res.cam);
const none = await run(["--use-fake-ui-for-media-stream"], state, true);
ok(/AUCUN|indisponible|REFUSÉ/.test(none.res.mic) && none.res.mic !== "ouvert", "sans périphérique simulé → jamais « ouvert » à tort", `${none.res.mic} / ${none.res.cam}`);
server.close();
console.log(fail ? `ÉCHEC : ${fail}` : "OK : chaînes audio/vidéo vérifiées (périphériques simulés)");
process.exit(fail ? 1 : 0);
