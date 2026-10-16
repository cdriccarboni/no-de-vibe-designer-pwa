// Garde-fou de confidentialité du dépôt PUBLIC No[co]de Vibe Designer.
// Échoue (exit 1) si un fichier suivi contient :
//  - un terme privé de spectacle (liste stockée sous forme d'empreintes SHA-256, jamais en clair) ;
//  - un chemin ou un fichier personnel (dossiers de spectacle privés, conduites PDF, marqueur de version privée) ;
//  - un secret probable (clé d'API, jeton, clé privée).
// Exécuté avant fusion (pull_request) et avant tout build/déploiement public.
// Usage : node qa/privacy-guard.mjs [--staged]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "qa/privacy-terms.json"), "utf8"));
const hashes = new Set(cfg.sha256);
const maxN = cfg.maxWords || 4;
const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);

const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sha = s => crypto.createHash("sha256").update(cfg.salt + s).digest("hex");
const SECRET = /(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|gh[ousr]_[A-Za-z0-9]{30,}|sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
// Chemins réservés : exprimés par empreinte comme les termes (dossier de spectacle) + motifs génériques.
const PRIVATE_PATHS = [ /(^|\/)\.nocode-private$/, /(^|\/)private[-_]?data(\/|$)/i, /conduite.*\.pdf$/i, /(^|\/)HERMES_SESSION\.json$/];
const SKIP = [/^qa\/privacy-terms\.json$/, /^qa\/privacy-guard\.mjs$/, /^shared\/vendor\//, /\.(png|jpe?g|gif|webp|ico|icns|wasm|woff2?|ttf|mp3|wav|ogg|mp4|webm|zip|gz|aab|apk|dmg|pdf)$/i, /package-lock\.json$/];

const problems = [];
for (const f of files) {
  const segs = norm(f.replace(/\.[a-z0-9]+$/i, "")).split(" ");
  if (segs.some(seg => hashes.has(sha(seg)))) problems.push(`${f} · chemin portant un nom privé de spectacle`);
  if (PRIVATE_PATHS.some(rx => rx.test(f))) problems.push(`${f} · chemin réservé à la version privée`);
  if (SKIP.some(rx => rx.test(f))) continue;
  let text;
  try { text = fs.readFileSync(path.join(root, f), "utf8"); } catch { continue; }
  for (const allowed of cfg.allow || []) text = text.split(allowed).join(" ");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (SECRET.test(line)) problems.push(`${f}:${i + 1} · secret probable`);
    const words = norm(line).split(" ").filter(Boolean);
    for (let a = 0; a < words.length; a++) {
      for (let n = 1; n <= maxN && a + n <= words.length; n++) {
        if (hashes.has(sha(words.slice(a, a + n).join(" ")))) {
          // Le terme lui-même n'est jamais affiché : seul l'emplacement l'est.
          problems.push(`${f}:${i + 1} · terme privé de spectacle (empreinte ${sha(words.slice(a, a + n).join(" ")).slice(0, 8)})`);
          a += n - 1; break;
        }
      }
    }
  });
}
if (problems.length) {
  console.error(`✗ Garde-fou confidentialité : ${problems.length} problème(s)\n  - ${[...new Set(problems)].slice(0, 60).join("\n  - ")}`);
  console.error("Ces éléments appartiennent à la version privée et ne doivent pas être publiés. Voir docs/PUBLIC_PRIVE.md.");
  process.exit(1);
}
console.log(`✓ Garde-fou confidentialité : ${files.length} fichiers suivis, aucun terme privé, chemin privé ni secret`);
