/**
 * QA Broadcast Radio & Audio In/Out (Priorité P0 / Scénario de diffusion).
 * Vérifie :
 * 1. Les 11 types de nodes audio et radio dans la bibliothèque et les specs.
 * 2. La chaîne complète : Audio In ➔ Mixer ➔ Radio Bus ➔ Radio Out.
 * 3. La compatibilité stricte des ports typés audio (aucun type inventé ni faux cast).
 * 4. La sécurité d'antenne : Radio Out reste STANDBY par défaut (jamais de direct sans geste explicite).
 * 5. L'intégration de BroadcastEngine dans le Runtime et l'arrêt propre des flux.
 */
import assert from "node:assert/strict";
import { spec, NODE_GROUPS } from "../shared/node-specs.js";
import { portLabels, portMeta, typesCompatible, EXECUTABLE_PORTS } from "../shared/ports.js";
import { validateEdge } from "../shared/graph-engine.js";
import { createNodeProcessors } from "../shared/node-processors.js";
import { BroadcastEngine } from "../shared/broadcast-engine.js";

console.log("▶ 1. Catalogue et types de nœuds Broadcast / Radio");
const broadcastTypes = [
  "audio-in", "audio-mixer", "audio-gain", "audio-limiter", "audio-monitor",
  "radio-live", "broadcast-in", "stream-studio", "radio-bus", "radio-out", "radio-monitor"
];

for (const type of broadcastTypes) {
  assert(EXECUTABLE_PORTS[type], `node ${type} est déclaré dans EXECUTABLE_PORTS`);
  const s = spec(type);
  assert(s && s[0], `node ${type} a un titre lisible : "${s?.[0]}"`);
  assert(s[1].length > 0, `node ${type} a des ports définis`);
}
console.log(`  ✓ ${broadcastTypes.length} types audio/radio déclarés et typés`);

console.log("▶ 2. Construction de la chaîne Audio In ➔ Mixer ➔ Radio Bus ➔ Radio Out");
const project = {
  nodes: [
    { id: "n_in1", type: "audio-in", title: "Micro 1", x: 40, y: 60, params: { enabled: false } },
    { id: "n_in2", type: "audio-in", title: "Micro 2", x: 40, y: 220, params: { enabled: false } },
    { id: "n_mix", type: "audio-mixer", title: "Mixer A/B", x: 280, y: 140, params: { gainA: 1, gainB: 0.8 } },
    { id: "n_gain", type: "audio-gain", title: "Gain Master", x: 500, y: 140, params: { gain: 1 } },
    { id: "n_lim", type: "audio-limiter", title: "Limiteur Broadcast", x: 700, y: 140, params: { threshold: -3 } },
    { id: "n_bus", type: "radio-bus", title: "Radio Bus", x: 920, y: 140, params: { gain: 1 } },
    { id: "n_out", type: "radio-out", title: "Radio Out", x: 1140, y: 140, params: { onAir: false } }
  ],
  edges: []
};

// Vérification de compatibilité de chaque liaison
const links = [
  { from: { node: "n_in1", port: 0 }, to: { node: "n_mix", port: 0 }, label: "Micro 1 (audio) ➔ Mixer In A" },
  { from: { node: "n_in2", port: 0 }, to: { node: "n_mix", port: 1 }, label: "Micro 2 (audio) ➔ Mixer In B" },
  { from: { node: "n_mix", port: 4 }, to: { node: "n_gain", port: 0 }, label: "Mixer (audio) ➔ Gain In" },
  { from: { node: "n_gain", port: 2 }, to: { node: "n_lim", port: 0 }, label: "Gain (audio) ➔ Limiteur In" },
  { from: { node: "n_lim", port: 2 }, to: { node: "n_bus", port: 0 }, label: "Limiteur (audio) ➔ Radio Bus In" },
  { from: { node: "n_bus", port: 2 }, to: { node: "n_out", port: 0 }, label: "Radio Bus (audio) ➔ Radio Out In" }
];

for (const l of links) {
  const v = validateEdge(project, l.from, l.to);
  assert(v.ok, `Liaison invalide : ${l.label} (${v.errors.join(", ")})`);
  project.edges.push({ id: `e_${l.from.node}_${l.to.node}`, from: l.from, to: l.to });
  console.log(`  ✓ ${l.label}`);
}

console.log("▶ 3. Exécution des processeurs et sécurité STANDBY");
const processors = createNodeProcessors();
const mockAudioEngine = {
  nodes: new Map(),
  ensureInput: async () => {},
  ensureMixer: async () => {},
  ensureStreamProcessor: async () => {},
  audioValue: (id) => ({ kind: "audio", stream: { getAudioTracks: () => [{ label: "Micro Test" }] }, nodeId: id }),
  readLevel: () => 0.42,
  readPeak: () => 0.55,
  readFftEnergy: () => 0.38,
  readEnvelope: () => 0.4,
  inputInfo: () => ({ label: "Micro Test Built-in" }),
  release: () => {}
};

const broadcastEngine = new BroadcastEngine();
const ctx = {
  audioEngine: mockAudioEngine,
  broadcastEngine,
  requestRender: () => {},
  errors: [],
  warnings: []
};

// Exécution de Radio Out avec onAir: false (défaut)
const radioOutNode = project.nodes.find(n => n.type === "radio-out");
const mockAudioInput = new Map([[0, { kind: "audio", stream: { getAudioTracks: () => [{}] } }]]);
const outResult = processors.get("radio-out")(radioOutNode, mockAudioInput, ctx);

assert(outResult.get(2)?.value === "STANDBY", `Radio Out en standby affiche "STANDBY" (obtenu "${outResult.get(2)?.value}")`);
assert(outResult.get(3)?.value === false, "Radio Out en standby n'est pas live");
assert(broadcastEngine.state("n_out").live === false, "BroadcastEngine session n'est pas live");
console.log("  ✓ Sécurité antenne : Radio Out reste STANDBY par défaut (aucun envoi non désiré)");

console.log("▶ 4. Cycle de vie et arrêt de diffusion");
await broadcastEngine.stopAll();
assert(broadcastEngine.sessions.size === 0, "stopAll() nettoie toutes les sessions broadcast");
console.log("  ✓ Nettoyage broadcast sans résidu OK");

console.log("\n✓ QA BROADCAST RADIO : Toutes les vérifications de la chaîne et de sécurité passent.");
