// qa/radio-ui-qa.mjs
// Test UI/DOM pour l'interface Radio et Audio dans No[co]de Vibe Designer Desktop

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appJsPath = path.resolve(__dirname, "../desktop/app.js");
const appJs = fs.readFileSync(appJsPath, "utf-8");

console.log("▶ 1. Vérification statique des composants UI Audio & Radio dans desktop/app.js");

// 1. Initialisation des types dans addNode
assert(appJs.includes('if (type === "radio-out")'), "addNode initialise radio-out");
assert(appJs.includes('if (type === "audio-in")'), "addNode initialise audio-in");
assert(appJs.includes('if (type === "audio-mixer")'), "addNode initialise audio-mixer");
console.log("  ✓ Paramètres par défaut déclarés dans addNode pour la chaîne radio");

// 2. Badges et familles dans drawNode
assert(appJs.includes('node-radio'), "drawNode applique la classe .node-radio");
assert(appJs.includes('node-audio'), "drawNode applique la classe .node-audio");
assert(appJs.includes('node-on-air'), "drawNode crée le badge .node-on-air");
console.log("  ✓ Styles et badges .node-on-air / .node-radio présents dans drawNode");

// 3. Inspecteur : cartes et champs
assert(appJs.includes('radio-live-card'), "selectNode injecte la carte radio-live-card");
assert(appJs.includes('audio-settings-card'), "selectNode injecte la carte audio-settings-card");
assert(appJs.includes('radioOnAirBtn'), "selectNode câble le bouton radioOnAirBtn");
assert(appJs.includes('radioStandbyBtn'), "selectNode câble le bouton radioStandbyBtn");
assert(appJs.includes('audioInputStart'), "selectNode câble le bouton audioInputStart");
assert(appJs.includes('audioInputStop'), "selectNode câble le bouton audioInputStop");
assert(appJs.includes('nAudioDevice'), "selectNode câble le sélecteur de périphérique nAudioDevice");
console.log("  ✓ Cartes de réglages et contrôles d'antenne ON AIR/STANDBY câblés dans l'inspecteur");

// 4. Sécurité : pas d'émission automatique, pas d'ouverture micro sans geste utilisateur
assert(appJs.includes('enabled:false'), "audio-in désarmé par défaut (pas de micro ouvert automatiquement)");
assert(appJs.includes('onAir:false'), "radio-out STANDBY par défaut (pas de diffusion intempestive)");
console.log("  ✓ Politiques de sécurité (micro fermé par défaut, STANDBY par défaut) validées");

// 5. Lecteur standalone radio/index.html
const radioHtmlPath = path.resolve(__dirname, "../radio/index.html");
assert(fs.existsSync(radioHtmlPath), "Le lecteur standalone radio/index.html existe");
const radioHtml = fs.readFileSync(radioHtmlPath, "utf-8");
assert(radioHtml.includes("Radio Paillettes"), "radio/index.html mentionne Radio Paillettes");
assert(radioHtml.includes("/listen"), "radio/index.html gère le flux /listen");
assert(radioHtml.includes("radio-relay-production.up.railway.app"), "radio/index.html cible le relais Railway par défaut");
console.log("  ✓ Lecteur d'écoute auditeur radio/index.html présent et configuré");

console.log("\n✓ QA UI AUDIO & RADIO : Tous les contrôles, badges et sécurités sont validés.");
