// Génère shared/scenic/scenic-pack.js depuis le lab AI Studio (labs/ai-studio-scenographe).
// Usage : node scripts/import-ai-studio-library.mjs   (nécessite npm install dans le lab)
import fs from "node:fs";
import { createRequire } from "node:module";
const labDir = new URL("../labs/ai-studio-scenographe/", import.meta.url);
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
const out = `// GÉNÉRÉ par scripts/import-ai-studio-library.mjs depuis labs/ai-studio-scenographe — ne pas éditer à la main.
export const SCENIC_PACK_VERSION = 1;
export const SCENIC_LIBRARY = ${JSON.stringify(lib, null, 1)};
export const SCENIC_TRACKS = ${JSON.stringify(tracks, null, 1)};
export const SCENIC_CUES = ${JSON.stringify(cues, null, 1)};
`;
fs.writeFileSync(new URL("../shared/scenic/scenic-pack.js", import.meta.url), out);
console.log(`library=${lib.length} tracks=${tracks.length} cues=${cues.length}`);
