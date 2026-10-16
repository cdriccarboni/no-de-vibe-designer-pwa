// Garde-fou de version : la version locale doit être cohérente (version.js / build-info / sw.js / badge)
// et ne jamais être inférieure à celle déjà publiée (Pages) — on ne régresse jamais la PWA publique.
// Usage : node qa/version-guard.mjs   (LIVE_URL pour changer la cible, OFFLINE=1 pour sauter la comparaison en ligne)
import fs from "node:fs";
const read = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const v = (read("shared/version.js").match(/APP_VERSION = "([^"]+)"/) || [])[1];
const info = JSON.parse(read("build-info.json"));
const fail = m => { console.error(`✗ ${m}`); process.exitCode = 1; };
if (!v) fail("APP_VERSION introuvable");
if (info.version !== v) fail(`build-info.json ${info.version} ≠ version.js ${v}`);
if (!read("sw.js").includes(`"nvd-${v}-`)) fail(`sw.js : cache nvd-${v}-… absent`);
if (!read("desktop/index.html").includes(`v${v}<`)) fail(`badge Designer ≠ v${v}`);
const cmp = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
if (!process.env.OFFLINE) {
  const url = process.env.LIVE_URL || "https://cdriccarboni.github.io/no-de-vibe-designer-pwa/build-info.json";
  try {
    const live = await (await fetch(url, { cache: "no-store" })).json();
    if (cmp(v, live.version) < 0) fail(`régression : local ${v} < publié ${live.version}`);
    else console.log(`· publié ${live.version} → local ${v}`);
  } catch (e) { fail(`version publiée illisible (${url}) : ${e.message}`); }
}
if (!process.exitCode) console.log(`OK : version ${v} cohérente`);
