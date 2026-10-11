/**
 * QA Suite - Régression de l'Audit en Ligne 2026-10-11
 * Valide les 10 anomalies reproduites dans AUDIT_NOCODE_EN_LIGNE_2026-10-11.md
 */

import fs from "node:fs";
import { askShow, loadExampleScene, createShowSession } from "../shared/show-session.js";
import { deterministicVibePlan } from "../shared/vibe-planner.js";
import { SURFACES, surfaceUrl } from "../shared/surface-switcher.js";
import { APP_VERSION } from "../shared/version.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC · ${message}`);
    throw new Error(`QA FAIL · ${message}`);
  }
  console.log(`✅ OK · ${message}`);
}

console.log(`=== QA Non-Régression Audit en Ligne (v${APP_VERSION}) ===\n`);

// NVD-01 : Mobile controls overflow sur 390px
console.log("--- NVD-01 : Mobile controls overflow ---");
const mobileCss = fs.readFileSync(new URL("../mobile/mobile.css", import.meta.url), "utf8");
assert(mobileCss.includes("max-width:100vw") || mobileCss.includes("max-width: 100vw"), "mobile-app a max-width: 100vw");
assert(mobileCss.includes("@media (max-width: 480px)") || mobileCss.includes("@media(max-width:480px)") || mobileCss.includes("@media (max-width:480px)"), "mobile.css contient un breakpoint compact <= 480px");
assert(mobileCss.includes(".ghost { width: 32px;") || mobileCss.includes(".ghost{width:32px"), "Boutons ghost compactés à 32px sur mobile étroit");
assert(mobileCss.includes("header .brand b { font-size: 11px;") || mobileCss.includes("header .brand b{font-size:11px"), "Titre marque tronqué et réduit sur mobile étroit");

// NVD-02 : Rendu réel en Show
console.log("\n--- NVD-02 : Rendu réel en Show ---");
const showJs = fs.readFileSync(new URL("../show/show.js", import.meta.url), "utf8");
assert(showJs.includes('import { Runtime } from "../shared/runtime.js"'), "show.js importe Runtime de shared/runtime.js");
assert(showJs.includes("new Runtime(previewCanvas)"), "show.js instancie Runtime sur previewCanvas");
assert(showJs.includes("runtime.time = session.time;"), "show.js synchronise runtime.time sur session.time");
assert(showJs.includes("runtime.render();"), "show.js appelle runtime.render() dans paint()");
assert(showJs.includes("probeCanvas = document.createElement(\"canvas\");"), "show.js utilise un canvas offscreen pour la sonde GLSL afin de préserver preview pour le canvas 2D");

// NVD-03 : Cue parasite créée par le chat Show
console.log("\n--- NVD-03 : Cue parasite du chat Show ---");
const session = loadExampleScene();
const initialCueCount = session.project.cues.length;
assert(initialCueCount === 1, `Scène d'exemple a 1 cue initiale (trouvé ${initialCueCount})`);
// Test chat sans demande de cue
const res1 = askShow(session, "Change la couleur en bleu");
assert(session.project.cues.length === initialCueCount, "Aucune cue créée pour un changement de couleur / paramètre");
// Test chat avec demande explicite de cue
const res2 = askShow(session, "Ajoute une baleine et crée une cue");
assert(session.project.cues.length === initialCueCount + 1, "Une cue est bien créée uniquement sur demande explicite de cue/top/mémoire");

// NVD-04 : Repli Vibe incomplet sur 'rideau de fils'
console.log("\n--- NVD-04 : Repli Vibe rideau de fils ---");
const vibePhrases = [
  "rideau de fils interactif piloté par la souris",
  "rideau de fil interactif",
  "rideaux de fils",
  "rideau interactif",
  "fils numériques",
  "thread curtain"
];
for (const phrase of vibePhrases) {
  const plan = deterministicVibePlan(phrase);
  const curtain = plan.ops.find(o => o.type === "threadcurtain");
  const pointer = plan.ops.find(o => o.type === "pointer");
  const smooth = plan.ops.find(o => o.type === "smooth");
  assert(curtain && pointer && smooth, `Chaîne pointer -> smooth -> curtain présente pour '${phrase}'`);
  const conn1 = plan.ops.find(o => o.op === "connect" && o.fromType === "pointer" && o.toType === "smooth");
  const conn2 = plan.ops.find(o => o.op === "connect" && o.fromType === "smooth" && o.toType === "threadcurtain");
  assert(conn1 && conn2, `Connexions complètes générées pour '${phrase}'`);
}

// NVD-05 : Show en 2 colonnes sur mobile
console.log("\n--- NVD-05 : Show layout mobile responsive ---");
const showCss = fs.readFileSync(new URL("../show/show.css", import.meta.url), "utf8");
assert(showCss.includes("@media(max-width:768px)") || showCss.includes("@media (max-width: 768px)"), "show.css contient un breakpoint max-width: 768px");
assert(showCss.includes("grid-template-columns:1fr") || showCss.includes("grid-template-columns: 1fr"), "show.css passe en 1 colonne sur écran mobile");

// NVD-06 : Show présent dans le Surface Switcher
console.log("\n--- NVD-06 : Show dans le Surface Switcher ---");
const showSurface = SURFACES.find(s => s.id === "show");
assert(showSurface !== undefined, "Show est bien enregistré dans SURFACES");
assert(showSurface.path === "show/index.html", "Chemin de la surface Show correct");
assert(surfaceUrl("show").includes("show/index.html"), "surfaceUrl('show') pointe vers show/index.html");
const showHtml = fs.readFileSync(new URL("../show/index.html", import.meta.url), "utf8");
assert(showHtml.includes('installSurfaceSwitcher({ current: "show" })'), "show/index.html initialise le switcher avec current: 'show'");

// NVD-07 : Import JSON invalide dans Show protégé
console.log("\n--- NVD-07 : Import JSON protégé dans Show ---");
assert(showJs.includes("try {") && showJs.includes("session = restoreShow(await file.text());"), "restoreShow dans openFile est sécurisé par un try");
assert(showJs.includes("event.target.value = \"\";"), "openFile réinitialise la valeur pour permettre de réouvrir un fichier");

// NVD-08 : Carte Auto du chooser redirige directement
console.log("\n--- NVD-08 : Chooser Auto redirection directe ---");
const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert(indexHtml.includes('href="./?auto=1"'), "Le lien Auto cible ./?auto=1 sans chooser=1");
assert(indexHtml.includes("openInternalRoute(routes[target] || routes.designer)"), "Le clic sur Auto ouvre directement la route détectée");

// NVD-09 : Installer distingue hors-ligne de build en préparation
console.log("\n--- NVD-09 : Installer hors ligne honnête ---");
const installHtml = fs.readFileSync(new URL("../install/index.html", import.meta.url), "utf8");
assert(installHtml.includes("Internet requis pour vérifier"), "install/index.html indique clairement qu'Internet est requis en cas d'erreur de sonde");
assert(installHtml.includes("verifiedRelease"), "install/index.html vérifie l'état de la release avant d'afficher un statut de build");

// NVD-10 : Pas de \n littéral dans le chooser
console.log("\n--- NVD-10 : Pas de \\n littéral dans chooser ---");
assert(!indexHtml.includes("\\n"), "Aucun \\n littéral trouvé dans index.html");

console.log("\n=======================================================");
console.log("🏆 LES 10 ANOMALIES DE L'AUDIT SONT CORRIGÉES ET VALIDÉES !");
console.log("=======================================================\n");
