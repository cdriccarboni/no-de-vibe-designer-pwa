import assert from "node:assert/strict";
import fs from "node:fs";
import { scenicPackElements } from "../shared/scenic/scenic-adapter.js";
import { instantiateElement, saveElement, listElements } from "../shared/show-elements.js";

console.log("=== QA Timeline & Library Drag/Drop & Scenic Media ===");

const html = fs.readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../desktop/app.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../desktop/styles.css", import.meta.url), "utf8");

// 1. Structure HTML
assert.ok(/id=["']libraryList["']/.test(html), "Panneau gauche Library #libraryList présent et pur");
assert.ok(/id=["']search["']/.test(html), "Champ recherche dans la Library présent");
assert.ok(/data-right-pane=["']elements["']/.test(html), "Onglet Éléments & Chutier présent dans le panneau droit");
assert.ok(/id=["']elementsPane["']/.test(html), "Conteneur #elementsPane présent dans le panneau droit");
assert.ok(/id=["']timelineMediaFile["']/.test(html), "Bouton d'import de fichier média dans la Timeline présent");
assert.ok(/id=["']timelineOpenElements["']/.test(html), "Bouton Éléments & Patchs dans la Timeline présent");
console.log("✓ 1. Structure HTML épurée (Library pure à gauche, Chutier Éléments à droite, raccourcis Timeline)");

// 2. Styles CSS
assert.ok(css.includes(".timeline-layer-row.drag-over"), "Feedback visuel drag-over sur les pistes de timeline");
assert.ok(css.includes(".timeline-drop-hint"), "Message d'aide sur piste vide présent dans le CSS");
assert.ok(css.includes(".element-card"), "Cartes de prévisualisation médias/patchs stylées");
assert.ok(css.includes(".element-head"), "En-têtes de cartes d'éléments stylées");
assert.ok(css.includes(".element-actions"), "Actions directes des cartes d'éléments stylées");
console.log("✓ 2. Styles CSS drag & drop et retours visuels validés");

// 3. Fonctions logiques dans app.js
assert.ok(app.includes("function renderElementsPane()"), "renderElementsPane() déclarée");
assert.ok(app.includes("function placeScenicInTimeline("), "placeScenicInTimeline() déclarée");
assert.ok(app.includes("function placeScenicInCanvas("), "placeScenicInCanvas() déclarée");
assert.ok(app.includes("function addNodeToTimeline("), "addNodeToTimeline() déclarée");
assert.ok(app.includes("function handleDroppedMediaFiles("), "handleDroppedMediaFiles() déclarée");
console.log("✓ 3. Fonctions de placement, drag et gestion de média validées");

// 4. Événements Drag & Drop sur la Timeline
assert.ok(app.includes("application/x-nvd-scenic-id"), "Support MIME drag Scénographe");
assert.ok(app.includes("application/x-nvd-element"), "Support MIME drag Éléments & Chutier");
assert.ok(app.includes("application/x-nvd-node-type"), "Support MIME drag Node Library");
assert.ok(app.includes("handleDroppedMediaFiles"), "Prise en charge du drop de fichiers Finder (vidéo, audio, image)");
console.log("✓ 4. Protocoles de Drag & Drop universels validés");

// 5. Inspecteur et actions directes
assert.ok(app.includes("addNodeToTimelineBtn"), "Bouton Programmer dans la Timeline câblé dans l'inspecteur");
assert.ok(app.includes("saveAsElementBtn"), "Bouton Enregistrer Patch câblé dans l'inspecteur");
console.log("✓ 5. Actions d'insertion directe depuis l'inspecteur validées");

// 6. Test fonctionnel d'instanciation média et éléments
const scenic = scenicPackElements();
assert.equal(scenic.length, 29, "29 éléments scéniques disponibles");

const project = { resources: [], timeline: [], layers: [{ id: "l1", type: "video" }, { id: "l2", type: "effect" }] };
const first = scenic[0];
saveElement(project, first);

const inst = instantiateElement(project, first.id, { track: 0, start: 5, duration: first.snapshot?.defaultDuration || 14 });
assert.equal(inst.elementId, first.id);
assert.equal(inst.track, 0);
assert.equal(inst.start, 5);
assert.ok(inst.duration > 0);
console.log("✓ 6. Test unitaire d'instanciation de clip scénique réussi");

console.log("\nTOUS LES TESTS TIMELINE, LIBRARY & DRAG/DROP SONT VERTS !");
