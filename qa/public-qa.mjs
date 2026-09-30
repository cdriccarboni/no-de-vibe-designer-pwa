import { NODE_GROUPS } from "../shared/node-specs.js";
import { EXECUTABLE_TYPES, isExecutable, portMeta, portLabels, typesCompatible } from "../shared/ports.js";
import { createNodeProcessors } from "../shared/node-processors.js";
import { localVibeParse } from "../shared/vibe.js";
import { secureVibePlan } from "../shared/vibe-safety.js";
import { renderLivingShadow } from "../shared/graphics/living-shadow.js";
import { renderThreadCurtain } from "../shared/graphics/interactive-effects.js";
import { encodeSacnChannel, sacnMulticastAddress } from "../shared/protocols/sacn.js";
import { createRegiePreset, REGIE_PRESETS } from "../shared/companion-studio/regie-presets.js";
import { APP_VERSION } from "../shared/version.js";

function assert(condition, message) {
  if (!condition) throw new Error(`QA FAIL · ${message}`);
  console.log(`OK · ${message}`);
}

console.log("No-de Vibe Designer public QA");

assert(APP_VERSION === "1.3.0", "runtime version is 1.3.0");

const libraryTypes = new Set();
for (const [, items] of NODE_GROUPS) for (const [, type] of items) libraryTypes.add(type);
const executable = [...libraryTypes].filter(type => EXECUTABLE_TYPES.has(type));
assert(libraryTypes.size === 105, `Library has 105 nodes (got ${libraryTypes.size})`);
assert(executable.length === 105, `105/105 Library nodes are executable (got ${executable.length})`);

const processors = createNodeProcessors();
const bridgeBacked = new Set(["twozero","td","isadora","chataigne","millumin","touchdesigner","isadorabridge","max","pd","supercollider"]);
const missingProcessors = executable.filter(type => !processors.has(type) && !bridgeBacked.has(type));
assert(missingProcessors.length === 0, `no executable node misses a processor: ${missingProcessors.join(", ") || "none"}`);

const scene = "Maxime se place à jardin devant son retour vidéo. Il est capté en silhouette et son ombre est projetée à cour sur le rideau de fils. Quand il danse avec elle, l'ombre fait le miroir puis peut se décrocher et prendre vie en autonomie.";
const plan = localVibeParse(scene, { nodes: [], edges: [] });
assert(plan.engine === "scene-language", "theatre sentence uses scene-language planner");
assert(plan.ops.some(o => o.op === "addNode" && o.type === "presence" && /Maxime/.test(o.title || "")), "named performer Presence is generated");
assert(plan.ops.some(o => o.op === "addNode" && o.type === "livingshadow" && o.params?.sourceZone === "jardin" && o.params?.shadowZone === "cour"), "Living Shadow is generated jardin → cour");
assert(plan.ops.some(o => o.op === "addNode" && o.type === "stage-output" && o.params?.surfaceName === "Rideau de fils"), "physical Rideau de fils output is named");

const pixels = new Uint8ClampedArray(32 * 18 * 4);
for (let y = 3; y < 16; y++) for (let x = 3; x < 12; x++) {
  const i = (y * 32 + x) * 4;
  pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 255;
}
const frame = { kind: "video", source: "qa", width: 32, height: 18, pixels };
const mirror = renderLivingShadow({ frame, time: 0, mode: "mirror", sourceZone: "jardin", shadowZone: "cour", threshold: .3, autonomy: .6 });
assert(mirror.state === "MIRROR" && mirror.analysis.visible, "Living Shadow detects and mirrors a silhouette");
assert(mirror.frame.pixels.some(v => v > 0), "Living Shadow mirror produces visible pixels");
const autonomous = renderLivingShadow({ frame, time: 2.5, mode: "autonomous", sourceZone: "jardin", shadowZone: "cour", threshold: .3, autonomy: .8, detachedFrame: mirror.capture });
assert(autonomous.state === "AUTONOMOUS" && autonomous.frame.pixels.some(v => v > 0), "detached Living Shadow stays visible autonomously");

const curtain = renderThreadCurtain({ width: 96, height: 54, time: 1.2, pointer: { x: .42, y: .55, speed: .3 }, strands: 32, force: .8 });
assert(curtain.kind === "video" && curtain.source === "thread-curtain", "Thread Curtain returns a video frame");
assert(curtain.pixels.some(v => v > 0), "Thread Curtain renders interactive strands");

const packet = encodeSacnChannel({ universe: 1, channel: 1, value: 255, sequence: 7, sourceName: "No-de QA" });
assert(packet.length === 127 && packet[126] === 255, "sACN encodes channel value");
assert(packet[113] === 0 && packet[114] === 1, "sACN encodes universe 1");
assert(sacnMulticastAddress(1) === "239.255.0.1", "sACN multicast address is correct");

const safetyProject = { nodes: [
  { id: "servo1", type: "servo", params: { enabled: true, auto: false } },
  { id: "cam1", type: "camera", params: { enabled: true } }
], edges: [] };
const secured = secureVibePlan(safetyProject, [
  { op: "setParam", id: "servo1", type: "servo", key: "auto", value: true },
  { op: "setParam", id: "cam1", type: "camera", key: "permission", value: true },
  { op: "setParam", id: "servo1", type: "servo", key: "speed", value: 999 },
  { op: "connect", fromType: "camera", fromPort: 0, toType: "servo", toPort: 0 }
], { source: "public-qa" });
assert(secured.ops.some(o => o.type === "servo" && o.key === "auto" && o.value === false), "Safety Engine disarms servo auto-send");
assert(!secured.ops.some(o => o.type === "camera" && o.key === "permission" && o.value === true), "Safety Engine blocks camera permission");
assert(secured.ops.some(o => o.type === "servo" && o.key === "speed" && o.value === 10), "Safety Engine clamps speed");
assert(secured.security.dropped.some(x => /Connexion incompatible/.test(x)), "Safety Engine rejects incompatible connection");

assert(REGIE_PRESETS.length === 5, "Companion ships exactly 5 practical presets");
for (const preset of REGIE_PRESETS) {
  const doc = createRegiePreset(preset.id);
  assert(doc.pages.length > 0 && doc.meta?.quickReady === true, `Companion preset ${preset.id} is valid`);
}
const light = createRegiePreset("lumiere");
const lightPage = light.pages.find(p => p.role === "lighting");
assert(lightPage?.widgets.filter(w => w.type === "fader").length >= 4, "Lumière preset has compact faders");
assert(lightPage?.widgets.some(w => w.binding?.kind === "sacn" && w.binding?.universe === 1), "Lumière preset has real sACN binding");

console.log("PUBLIC QA OK");
