// QA du module générique shared/stage/cartouches.js (présentation de conduite, annuler/rétablir, import/export).
// Données neutres : aucune donnée de spectacle.
import { createCartoucheStore } from "../shared/stage/cartouches.js";
let fail = 0; const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) fail = 1; };
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v), m }; };
const entries = [{ id: "a", label: "Top A", sourcePage: 1 }, { id: "b", label: "Top B" }, { id: "c", label: "Top C" }];
const st = mem(); const s = createCartoucheStore({ profile: "demo", entries, storage: st });
ok(s.list().map(e => e.id).join() === "a,b,c", "ordre par défaut");
s.update("b", { color: "#ff0000", favorite: true });
s.update("c", { order: 0 });
ok(s.list().map(e => e.id).join() === "a,c,b" && s.get("b").favorite, "mise à jour + tri par ordre puis index");
s.update("a", { notes: "n" });
ok(s.undo() && s.get("a").notes === "", "annuler");
ok(s.redo() && s.get("a").notes === "n", "rétablir");
for (const bad of [{ color: "red" }, { x: 1 }, { order: -1 }, { favorite: "oui" }, { label: 3 }]) {
  let e = false; try { s.update("a", bad); } catch { e = true; } ok(e, `patch invalide refusé ${JSON.stringify(bad)}`);
}
let e = false; try { s.update("zzz", {}); } catch { e = true; } ok(e, "id inconnu refusé");
const exp = s.export();
const s2 = createCartoucheStore({ profile: "demo", entries, storage: mem() }); s2.import(exp);
ok(s2.get("b").color === "#ff0000", "export/import aller-retour");
e = false; try { createCartoucheStore({ profile: "autre", entries, storage: mem() }).import(exp); } catch { e = true; } ok(e, "import d'un autre profil refusé");
const bad = mem(); bad.setItem("node-cartouches-v1:demo", "{corrompu");
e = false; try { createCartoucheStore({ profile: "demo", entries, storage: bad }); } catch { e = true; } ok(e && bad.m.get("node-cartouches-v1:demo") === "{corrompu", "sauvegarde invalide levée sans l'effacer");
const full = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
const s3 = createCartoucheStore({ profile: "demo", entries, storage: full });
e = false; try { s3.update("a", { label: "X" }); } catch { e = true; } ok(e && s3.get("a").label === "Top A", "échec de quota : état intact");
process.exit(fail);
