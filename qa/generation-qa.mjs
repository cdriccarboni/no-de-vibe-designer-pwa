/**
 * QA génération Vibe (P0) — prompt → graphe → câblage valide → bilan honnête.
 *
 * Pour chaque prompt de référence : planner local, application réelle via applyVibeOps,
 * vérification des nœuds attendus, des liaisons réellement créées (validateEdge), de l'absence
 * d'erreur et du statut de couverture (jamais « complete » quand des manques sont connus).
 * L'exécution runtime/rendu est vérifiée par qa/browser-e2e-generation.cjs (Chrome).
 */
import { runVibe, applyVibeOps } from "../shared/vibe.js";

const CASES = [
  {
    prompt: "Crée une vidéo générative avec des particules qui réagissent au microphone.",
    nodes: ["audio", "smooth", "flowfield", "stage-output"], minEdges: 5, status: "complete",
    paramOn: { type: "audio", key: "enabled", value: false }
  },
  {
    prompt: "Crée un bouton qui lance un son et déclenche un changement lumineux.",
    nodes: ["boolean", "audio", "shader", "dmx"], minEdges: 4, status: "partial",
    paramOn: { type: "dmx", key: "auto", value: false }
  },
  {
    prompt: "Crée un masque vidéo interactif piloté par la caméra.",
    nodes: ["camera", "depthmask", "composite", "stage-output"], minEdges: 5, status: "partial"
  },
  {
    prompt: "Crée un fondu entre deux vidéos déclenché par une commande OSC.",
    nodes: ["videofile", "videofile", "composite", "automation"], minEdges: 4, status: "partial", mustMiss: /OSC/
  },
  {
    prompt: "Crée une silhouette interactive qui suit un acteur et produit des particules.",
    nodes: ["camera", "presence", "threshold", "flowfield", "composite", "stage-output"], minEdges: 8, status: "complete"
  },
  {
    prompt: "Crée une ambiance sonore générative qui réagit au mouvement d'une personne.",
    nodes: ["camera", "presence", "smooth", "organicaudio"], minEdges: 3, status: "partial"
  }
];

let failures = 0;
const fail = (msg) => { failures++; console.error("  ✗", msg); };
const ok = (msg) => console.log("  ✓", msg);

for (const c of CASES) {
  console.log(`\n▶ ${c.prompt}`);
  const project = { nodes: [], edges: [] };
  const result = await runVibe(c.prompt, project, { forceLocal: true });
  if (!result.coverage) { fail("pas de bilan de couverture"); continue; }
  console.log(`  statut=${result.coverage.status} · ${result.ops.length} op(s) · ${result.note}`);

  let seq = 0;
  const { applied, errors } = applyVibeOps(project, result.ops, {
    addNode: (type, x, y) => { const n = { id: `n${++seq}`, type, title: type, x, y, params: {} }; project.nodes.push(n); return n; },
    addClip: () => {},
    ensureEdges: () => project.edges,
    nodeById: id => project.nodes.find(n => n.id === id)
  });

  const types = project.nodes.map(n => n.type);
  const wanted = [...c.nodes];
  const missingNodes = [];
  for (const t of wanted) {
    const i = types.indexOf(t);
    if (i < 0) missingNodes.push(t); else types.splice(i, 1);
  }
  if (missingNodes.length) fail(`nœuds absents : ${missingNodes.join(", ")}`); else ok(`${project.nodes.length} nœud(s) : ${project.nodes.map(n => n.type).join(" · ")}`);
  if (project.edges.length < c.minEdges) fail(`${project.edges.length} liaison(s) < ${c.minEdges}`); else ok(`${project.edges.length} liaison(s) valides`);
  if (errors.length) fail(`erreurs d'application : ${errors.join(" | ")}`); else ok("aucune erreur d'application");
  const connects = applied.filter(a => a.op === "connect").length;
  if (connects !== project.edges.length) fail(`liaisons appliquées (${connects}) ≠ liaisons du projet (${project.edges.length})`);
  if (result.coverage.status !== c.status) fail(`statut ${result.coverage.status} ≠ attendu ${c.status}`); else ok(`statut « ${result.coverage.status} » conforme`);
  if (result.coverage.status === "complete" && result.coverage.missing.length) fail("« complete » alors que des manques sont déclarés");
  if (c.mustMiss && !result.coverage.missing.some(m => c.mustMiss.test(m.need))) fail("le manque OSC n'est pas déclaré");
  if (c.paramOn) {
    const n = project.nodes.find(x => x.type === c.paramOn.type);
    if (n?.params?.[c.paramOn.key] !== c.paramOn.value) fail(`${c.paramOn.type}.${c.paramOn.key} doit valoir ${c.paramOn.value} (périphérique/permission non armé)`);
    else ok(`${c.paramOn.type}.${c.paramOn.key}=${c.paramOn.value} (désarmé)`);
  }

  // Idempotence : rejouer la même commande ne duplique rien.
  const before = { nodes: project.nodes.length, edges: project.edges.length };
  const again = await runVibe(c.prompt, project, { forceLocal: true });
  if (again.ops.length !== 0 || again.coverage?.status !== "unchanged") fail(`2ᵉ exécution non idempotente : ${again.ops.length} op(s), statut ${again.coverage?.status}`);
  else ok(`2ᵉ exécution idempotente (0 op, ${before.nodes} nœuds / ${before.edges} liaisons conservés)`);
}

// Un prompt incompréhensible ne doit PAS produire de succès.
{
  console.log("\n▶ prompt vide de sens");
  const r = await runVibe("blablabla qwerty zzz", { nodes: [], edges: [] }, { forceLocal: true });
  if (r.ops.length === 0 && r.coverage?.status === "none") ok("aucune opération, statut « none »");
  else fail(`résultat inattendu : ${r.ops.length} op(s), statut ${r.coverage?.status}`);
}

if (failures) { console.error(`\n✗ ${failures} échec(s) génération`); process.exit(1); }
console.log("\n✓ QA génération : toutes les vérifications passent");
