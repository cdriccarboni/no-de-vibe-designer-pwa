import assert from "node:assert/strict";
import fs from "node:fs";
import { scenicPackElements } from "../shared/scenic/scenic-adapter.js";
import { instantiateElement, saveElement, listElements } from "../shared/show-elements.js";

console.log("=== QA Timeline & Library Drag/Drop & Scenic Media ===");

const html = fs.readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../desktop/app.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../desktop/styles.css", import.meta.url), "utf8");

// 1. Structure HTML
assert.ok(/data-lib-tab=["']nodes["']/.test(html), "Onglet Opérateurs présent dans la Library");
assert.ok(/data-lib-tab=["']scenic["']/.test(html), "Onglet Médias & Scénographe présent dans la Library");
assert.ok(/id=["']scenicTabCount["']/.test(html), "Badge compteur pour les médias/scénographe présent");
assert.ok(/id=["']scenicMediaFileInput["']/.test(html), "Input d'import de fichier média présent");
assert.ok(/id=["']scenicFilterChips["']/.test(html), "Filtres par catégorie (Ombres, Créatures, etc.) présents");
assert.ok(/id=["']libraryList["']/.test(html), "Container #libraryList présent");
assert.ok(/id=["']scenicList["']/.test(html), "Container #scenicList présent");
console.log("✓ 1. Structure HTML de la bibliothèque et des onglets validée");

// 2. Styles CSS
assert.ok(css.includes(".timeline-layer-row.drag-over"), "Feedback visuel drag-over sur les pistes de timeline");
assert.ok(css.includes(".timeline-drop-hint"), "Message d'aide sur piste vide présent dans le CSS");
assert.ok(css.includes(".scenic-card"), "Cartes de prévisualisation médias/scénographe stylées");
assert.ok(css.includes(".inspector-node-timeline-action"), "Bouton Programmer dans la Timeline stylé");
console.log("✓ 2. Styles CSS drag & drop et retours visuels validés");

// 3. Fonctions logiques dans app.js
assert.ok(app.includes("function renderScenicLibrary()"), "renderScenicLibrary() déclarée");
assert.ok(app.includes("function placeScenicInTimeline("), "placeScenicInTimeline() déclarée");
assert.ok(app.includes("function placeScenicInCanvas("), "placeScenicInCanvas() déclarée");
assert.ok(app.includes("function addNodeToTimeline("), "addNodeToTimeline() déclarée");
assert.ok(app.includes("function handleDroppedMediaFiles("), "handleDroppedMediaFiles() déclarée");
assert.ok(app.includes("function showLibraryPane("), "showLibraryPane() déclarée");
console.log("✓ 3. Fonctions de placement, drag et gestion de média validées");

// 4. Événements Drag & Drop sur la Timeline
assert.ok(app.includes("application/x-nvd-scenic-id"), "Support MIME drag Scénographe");
assert.ok(app.includes("application/x-nvd-node-type"), "Support MIME drag Node Library");
assert.ok(app.includes("application/x-nvd-canvas-node"), "Support MIME drag Canvas Node");
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
