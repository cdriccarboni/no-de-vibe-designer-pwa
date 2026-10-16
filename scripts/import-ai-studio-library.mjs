// Génère shared/scenic/scenic-pack.js depuis un lab AI Studio Scénographe.
// Le lab n'est PAS dans le dépôt public : il vit dans le dépôt privé.
// Usage (dépôt privé uniquement) : NVD_LAB_DIR=/chemin/vers/le/lab node scripts/import-ai-studio-library.mjs
// Le pack généré peut contenir des données de spectacle : ne jamais l'importer dans le dépôt public
// (qa/privacy-guard.mjs le bloque).
import fs from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
if (!process.env.NVD_LAB_DIR) { console.error("NVD_LAB_DIR requis (chemin du lab Scénographe, dépôt privé)."); process.exit(2); }
const labDir = pathToFileURL(process.env.NVD_LAB_DIR.replace(/\/?$/, "/"));
const require = createRequire(new URL("package.json", labDir));
const { transform } = require("sucrase");
const src = fs.readFileSync(new URL("src/services/timelineEngine.ts", labDir), "utf8");
const js = transform(src, { transforms: ["typescript"] }).code
  .replace(/^(?:import|const\s+\{[^}]*\}\s*=\s*require)[^;]*;?$/gm, "")
  .replace(/exports\.(\w+)\s*=/g, "export const $1 =")
  .replace(/Object\.defineProperty\(exports[^;]*;/g, "");
const tmp = new URL("../.tmp-lab-engine.mjs", import.meta.url);
fs.writeFileSync(tmp, js.replace(/^"use strict";?/m, ""));
const mod = await import(tmp.href);
fs.unlinkSync(tmp);
const lib = mod.INITIAL_REUSABLE_LIBRARY, tracks = mod.INITIAL_TIMELINE_TRACKS, cues = mod.INITIAL_CUE_LIST;
if (!Array.isArray(lib) || !lib.length) throw new Error("Bibliothèque du lab introuvable");
const out = `// GÉNÉRÉ par scripts/import-ai-studio-library.mjs depuis le lab Scénographe — ne pas éditer à la main.
export const SCENIC_PACK_VERSION = 1;
export const SCENIC_LIBRARY = ${JSON.stringify(lib, null, 1)};
export const SCENIC_TRACKS = ${JSON.stringify(tracks, null, 1)};
export const SCENIC_CUES = ${JSON.stringify(cues, null, 1)};
`;
fs.writeFileSync(new URL("../shared/scenic/scenic-pack.js", import.meta.url), out);
console.log(`library=${lib.length} tracks=${tracks.length} cues=${cues.length}`);
