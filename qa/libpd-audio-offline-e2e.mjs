// libpd audible : rendu hors ligne (OfflineAudioContext) dans Chromium, avec le vrai wasm libpd,
// l'AudioWorklet, le gain et l'enveloppe. Vérifie un signal non nul, sa fréquence (osc~ 440),
// le silence hors enveloppe et à gain 0. Usage : PLAYWRIGHT_PATH=… [CHROME=…] node qa/libpd-audio-offline-e2e.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".wasm":"application/wasm" };
const server = http.createServer((q, r) => {
  const p = decodeURIComponent(q.url.split("?")[0]);
  if (p === "/__t.html") { r.writeHead(200, { "content-type": "text/html" }); return r.end("<!doctype html><title>t</title>"); }
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: true });
const page = await browser.newPage();
page.on("console", m => { if (m.type() === "error") console.log("console:", m.text()); });
await page.goto(base + "/__t.html");
const res = await page.evaluate(async () => {
  const rt = await import("/shared/libpd-runtime.js");
  const { LibpdVoice } = await import("/shared/libpd-audio.js");
  await rt.openLibpdStream(rt.LIBPD_AUDIO_PATCH);
  const renderCase = async ({ level, trigger }) => {
    const sr = 44100, ctx = new OfflineAudioContext(2, sr, sr);
    const voice = await new LibpdVoice(ctx, { level }).init();
    for (let i = 0; i < 24; i++) await voice.push(2048); // ~1,1 s pré-calculé par libpd
    if (trigger) voice.trigger({ time: 0.2, attack: 0.01, hold: 0.3, release: 0.05 }); else voice.gate(true, 0);
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const rms = (a, s, e) => { let x = 0; for (let i = s; i < e; i++) x += a[i] * a[i]; return Math.sqrt(x / (e - s)); };
    let zc = 0; for (let i = Math.floor(0.25 * sr) + 1; i < Math.floor(0.5 * sr); i++) if (L[i - 1] < 0 && L[i] >= 0) zc++;
    return { pre: rms(L, 0, Math.floor(0.19 * sr)), mid: rms(L, Math.floor(0.25 * sr), Math.floor(0.5 * sr)), midR: rms(R, Math.floor(0.25 * sr), Math.floor(0.5 * sr)),
      post: rms(L, Math.floor(0.6 * sr), sr), hz: zc / 0.25, all: rms(L, 0, sr) };
  };
  return { env: await renderCase({ level: 0.5, trigger: true }), mute: await renderCase({ level: 0, trigger: false }) };
});
await browser.close(); server.close();
let fail = 0; const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };
const { env, mute } = res;
ok(env.mid > 0.05, `signal libpd non nul pendant l'enveloppe (RMS ${env.mid.toFixed(4)})`);
ok(env.midR > 0.05, `canal droit routé (RMS ${env.midR.toFixed(4)})`);
ok(Math.abs(env.hz - 440) < 12, `fréquence osc~ 440 mesurée : ${env.hz.toFixed(1)} Hz`);
ok(env.pre < 1e-4, `silence avant le trigger (RMS ${env.pre.toExponential(2)})`);
ok(env.post < 1e-4, `silence après le relâchement (RMS ${env.post.toExponential(2)})`);
ok(Math.abs(env.mid - 0.5 * 0.5 / Math.SQRT2) < 0.03, `gain appliqué (attendu ≈ 0,177, mesuré ${env.mid.toFixed(3)})`);
ok(mute.all < 1e-6, `gain 0 = silence (RMS ${mute.all.toExponential(2)})`);
console.log(fail ? `ÉCHEC : ${fail}` : "OK : libpd audible, gain, routage stéréo et enveloppe vérifiés hors ligne");
process.exit(fail ? 1 : 0);
