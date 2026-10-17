// Non-régression : un projet avec plus de 6 layers doit pouvoir lire la route de chaque piste.
import { effectiveRoute, ensureRouting } from "../shared/routing.js";
let fail = 0; const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) fail = 1; };
const project = {}; ensureRouting(project);
for (const track of [0, 5, 6, 7, 11]) {
  const r = effectiveRoute(project, track);
  ok(r && r.mode === "main" && r.destinations[0] === "main-output", `piste ${track} : route principale par défaut`);
}
process.exit(fail);
