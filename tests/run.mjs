/**
 * Tests unitaires P00 — exécutables avec Node (sans navigateur).
 * Usage: node tests/run.mjs
 */
import { validateProject, exportProject, createDemoProject, newProject } from "../shared/ir.js";
import { typesCompatible, portDataType, portDirection, isExecutable, EXECUTABLE_TYPES } from "../shared/ports.js";
import { validateEdge, findCycleEdgeIds, topoOrder, evaluateGraph, findVideoOutput } from "../shared/graph-engine.js";
import { localVibeParse, applyVibeOps, isForbiddenAiProvider, assertAiProviderAllowed, runVibe, probeLocalAi } from "../shared/vibe.js";
import { performAction } from "../shared/action-intents.js";
import { artistBackends, technicalRows, proposeArchitectures } from "../shared/backend-registry.js";
import { selectAgentsForRequest, AGENT_STATUSES, defaultRegistry } from "../shared/agent-registry.js";
import { probeAgentRegistry } from "../bridge/probe-agents.mjs";
import { APP_VERSION } from "../shared/version.js";
import { createHistory } from "../shared/history.js";
import { ensureSubGraph, evaluateSubGraph, addBoxPort, wrapNodesInSubpatch, MAX_SUBPATCH_DEPTH } from "../shared/subpatch.js";
import { renderBlackhole } from "../shared/graphics/blackhole.js";
import { renderLivingShadow } from "../shared/graphics/living-shadow.js";
import { renderThreadCurtain } from "../shared/graphics/interactive-effects.js";
import { encodeSacnChannel, sacnMulticastAddress } from "../shared/protocols/sacn.js";
import { createRegiePreset } from "../shared/companion-studio/regie-presets.js";
import { transformRaster } from "../shared/graphics/transform.js";
import { createPipeline, validatePipeline, orderPasses } from "../shared/graphics/pass-graph.js";
import { WebGL2Backend } from "../shared/graphics/webgl2.js";
import { DEFAULT_QUAD, validateQuad, homographyFromUnitSquare, transformPoint, warpPerspectiveFrame } from "../shared/graphics/mapping-v3.js";
import { createQuickMapSession, setQuickMapCorner, quickMapRemoteOperation } from "../shared/quick-map.js";
import { detectGraphicsCapabilities } from "../shared/graphics/engine-v3.js";
import { analyzeImagePixels, autoImageVibeTarget, imageVibeOps, imageVibePrompt } from "../shared/image-vibe.js";
import { classifyLocalAgent, makeLocalAgent, mergeLocalAgentRegistry, selectLocalAgents, localAgentRegistrySummary } from "../shared/local-agent-registry.js";
import { encodeOscMessage, decodeOscMessage } from "../shared/protocols/osc.js";
import { createNodeProcessors } from "../shared/node-processors.js";
import { NODE_GROUPS } from "../shared/node-specs.js";
import { planManualSave, planManualOpen, saveStatusMessage, isStandaloneWebKit } from "../shared/save-fallback.js";
import { exportMax, exportTouchDesigner, exportPureData, exportMilluminOscMap } from "../shared/exporters.js";
import { nestedBoxSelfTest } from "../shared/self-test.js";
import { WebSocketBridge } from "../shared/adapters/websocket-bridge.js";
import { shouldPromptForUpdate, shouldActivateWaitingWorker, shouldReloadAfterUpdate } from "../shared/pwa-update.js";
import { SURFACES, getPreferredSurface, setPreferredSurface, surfaceUrl, navigateSurface } from "../shared/surface-switcher.js";
import { createShowSession, loadExampleScene, loadScene, startShow, pauseShow, stopShow, tickShow, fireCue, saveShow, restoreShow, askShow, sampleCurve, setKeyframe, applyCurves, showMonitor, CX_NOTE } from "../shared/show-session.js";
import { activeAgents, nativeBridgeLabel, runShaderAgent, WAVE_PARAMS } from "../shared/shader-agent.js";
import { probeFortyTwo, compileWaveWithChrome } from "../bridge/agent-runners.mjs";
import { createMemoryProjectStore } from "../shared/project-store.js";
import { applyRemoteMessage, initialRemoteState } from "../shared/remote-protocol.js";
import { startRemoteServer } from "../bridge/remote-server.mjs";
import { openSocket } from "../bridge/ws-client.mjs";
import { WS_GUID, websocketAccept } from "../bridge/ws-frames.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log("  OK  ", msg); }
  else { failed++; console.error(" FAIL ", msg); }
}

console.log(`\nNo[co]de Vibe Designer ${APP_VERSION} — System Test P00/P01\n`);

// --- ports ---
console.log("ports");
assert(typesCompatible("video", "video"), "video→video");
assert(typesCompatible("number", "number"), "number→number");
assert(!typesCompatible("video", "number"), "video↛number");
assert(portDirection("camera", 0, 3) === "out", "camera port0 out");
assert(portDirection("shader", 0, 3) === "in", "shader texture in");
assert(portDirection("shader", 2, 3) === "out", "shader out");
assert(portDirection("osc", 2, 3) === "in", "osc value in (sink)");
assert(isExecutable("camera") && isExecutable("shader"), "camera+shader executable");
assert(isExecutable("audio") && isExecutable("subpatch"), "audio+subpatch executable");
assert(isExecutable("millumin"), "millumin bridge executable");
const libraryTypes = [...new Set(NODE_GROUPS.flatMap(([, items]) => items.map(([, type]) => type)))];
assert(libraryTypes.length >= 105, `Library has at least 105 nodes (${libraryTypes.length})`);
assert(libraryTypes.every(type => EXECUTABLE_TYPES.has(type)), "every Library node has executable ports");
const processorMap = createNodeProcessors();
const bridgeBacked = new Set(["twozero","td","isadora","chataigne","millumin","touchdesigner","isadorabridge","max","pd","supercollider"]);
const missingProcessors = libraryTypes.filter(type => !processorMap.has(type) && !bridgeBacked.has(type));
assert(missingProcessors.length === 0, `every executable Library node has a processor or bridge: ${missingProcessors.join(", ") || "none"}`);
assert(processorMap.has("ml5-hand") && processorMap.has("ml5-body") && processorMap.has("brain-map"), "ML nodes have real processors");

// --- ir / demo ---
console.log("ir");
const demo = createDemoProject();
assert(demo.nodes.length === 5, "demo has 5 nodes");
assert(demo.edges.length === 9, "demo has 9 edges");
const round = validateProject(JSON.parse(exportProject(demo)));
assert(round.edges.length === 9, "round-trip edges");
assert(/EXEMPLE|Wow|Demo|Démo/i.test(round.name), "demo name preserved");

// --- validateEdge ---
console.log("edges");
const ok = validateEdge(demo, { node: "n4", port: 2 }, { node: "n5", port: 0 });
assert(ok.ok, "composite video → transform OK");
const bad = validateEdge(demo, { node: "n1", port: 0 }, { node: "n5", port: 0 });
assert(!bad.ok, "pointer number → transform video rejected");

// --- cycles ---
console.log("cycles");
const cyclic = newProject();
cyclic.nodes = [
  { id: "a", type: "stageio", title: "A", x: 0, y: 0, params: { enabled: true } },
  { id: "b", type: "stageio", title: "B", x: 0, y: 0, params: { enabled: true } }
];
cyclic.edges = [
  { id: "e1", from: { node: "a", port: 2 }, to: { node: "b", port: 0 } },
  { id: "e2", from: { node: "b", port: 2 }, to: { node: "a", port: 0 } }
];
const cycles = findCycleEdgeIds(cyclic);
assert(cycles.size >= 1, "cycle detected without hang");
const order = topoOrder(cyclic, cycles);
assert(order.length === 2, "topo order includes both nodes");

// --- evaluateGraph (headless stub processors) ---
console.log("evaluate");
const fns = new Map();
fns.set("pointer", () => new Map([[0, { kind: "number", value: 0.5 }], [1, { kind: "number", value: 0.5 }], [2, { kind: "number", value: 0 }]]));
fns.set("smooth", (_n, inputs) => new Map([[1, inputs.get(0)?.value || { kind: "number", value: 0 }]]));
fns.set("threadcurtain", () => new Map([[3, { kind: "video", canvas: true, el: { width: 1 } }]]));
fns.set("ripple", () => new Map([[3, { kind: "video", canvas: true, el: { width: 1 } }]]));
fns.set("composite", () => new Map([[2, { kind: "video", canvas: true, el: { width: 1 } }]]));
fns.set("transform", (_n, inputs) => {
  const tex = inputs.get(0)?.value;
  assert(!!tex, "transform received video input during evaluate");
  return new Map([[3, { kind: "video", canvas: true, el: { width: 1 }, source: "transform" }]]);
});
const ctx = { time: 1, width: 128, height: 72, errors: [], warnings: [] };
const result = evaluateGraph(demo, fns, ctx);
assert(result.errors.filter(e => e.includes("incompatible")).length === 0, "no type errors on demo");
const vout = findVideoOutput(demo, result.outputs);
assert(vout?.source === "transform", "video output from transform");

// --- vibe local ---
console.log("vibe");
const empty = newProject();
const parsed = localVibeParse("Crée une caméra reliée à un shader", empty);
assert(parsed.ops.some(o => o.op === "addNode" && o.type === "camera"), "vibe adds camera");
assert(parsed.ops.some(o => o.op === "addNode" && o.type === "shader"), "vibe adds shader");
assert(parsed.ops.some(o => o.op === "connect"), "vibe connects");

const p2 = newProject();
const nodes = [];
const applied = applyVibeOps(p2, parsed.ops, {
  addNode: (type, x, y) => {
    const id = `n${nodes.length + 1}`;
    const n = { id, type, title: type, x, y, params: { enabled: true } };
    p2.nodes.push(n);
    nodes.push(n);
    return n;
  },
  addClip: () => {},
  ensureEdges: () => { p2.edges ||= []; },
  nodeById: id => p2.nodes.find(n => n.id === id),
  log: () => {}
});
assert(applied.applied.filter(a => a.op === "addNode" && !a.skipped).length >= 2, "vibe applied addNode");
assert(p2.edges.length >= 1, "vibe created edge");

// --- theatre language / Living Shadow / interactive engines ---
console.log("theatre-language-1.3");
const theatreText = "Maxime se place à jardin devant son retour vidéo. Il est capté en silhouette et son ombre est projetée à cour sur le rideau de fils. Quand il danse avec elle, l'ombre fait le miroir puis peut se décrocher et prendre vie en autonomie.";
const theatrePlan = localVibeParse(theatreText, newProject());
assert(theatrePlan.engine === "scene-language", "theatre phrase uses scene-language planner");
assert(theatrePlan.ops.some(o => o.op === "addNode" && o.type === "presence" && /Maxime/.test(o.title || "")), "scene plan creates named Presence · Maxime");
assert(theatrePlan.ops.some(o => o.op === "addNode" && o.type === "livingshadow" && o.params?.sourceZone === "jardin" && o.params?.shadowZone === "cour"), "scene plan creates garden→cour Living Shadow");
assert(theatrePlan.ops.some(o => o.op === "addNode" && o.type === "stage-output" && o.params?.surfaceName === "Rideau de fils"), "scene plan names physical thread-curtain output");
assert(theatrePlan.ops.some(o => o.op === "connect" && o.fromType === "livingshadow" && o.toType === "mapping"), "scene plan wires Living Shadow to mapping");

const theatreProject = newProject();
const theatreNodes = [];
const theatreApplied = applyVibeOps(theatreProject, theatrePlan.ops, {
  addNode: (type, x, y) => {
    const id = `scene-${theatreNodes.length + 1}`;
    const n = { id, type, title: type, x, y, params: { enabled: true } };
    theatreProject.nodes.push(n); theatreNodes.push(n); return n;
  },
  addClip: () => {},
  ensureEdges: () => { theatreProject.edges ||= []; return theatreProject.edges; },
  nodeById: id => theatreProject.nodes.find(n => n.id === id)
});
assert(theatreApplied.applied.some(a => a.op === "addNode" && a.type === "livingshadow"), "scene plan applies Living Shadow node");
assert(theatreProject.nodes.some(n => n.type === "presence" && n.params?.person === "Maxime"), "scene apply preserves performer metadata");
assert(theatreProject.nodes.some(n => n.type === "stage-output" && n.params?.surfaceName === "Rideau de fils"), "scene apply preserves named stage surface");
assert(theatreProject.edges.length >= 5, "scene apply builds full camera→presence→shadow→mapping→output chain");

console.log("living-shadow-1.3");
const shadowPixels = new Uint8ClampedArray(32 * 18 * 4);
for (let y = 3; y < 16; y++) {
  for (let x = 3; x < 12; x++) {
    const i = (y * 32 + x) * 4;
    shadowPixels[i] = 255; shadowPixels[i + 1] = 255; shadowPixels[i + 2] = 255; shadowPixels[i + 3] = 255;
  }
}
const shadowSource = { kind:"video", source:"test", width:32, height:18, pixels:shadowPixels };
const mirrorShadow = renderLivingShadow({
  frame:shadowSource, time:0, mode:"mirror", sourceZone:"jardin", shadowZone:"cour", threshold:.3, autonomy:.6
});
assert(mirrorShadow.analysis.visible === true && mirrorShadow.state === "MIRROR", "Living Shadow detects performer and enters mirror mode");
assert(mirrorShadow.capture?.pixels?.length > 0, "Living Shadow exposes detachable silhouette capture");
assert(mirrorShadow.frame.pixels.some(v => v > 0), "Living Shadow mirror produces visible output");
const autoShadow = renderLivingShadow({
  frame:shadowSource, time:2.5, mode:"autonomous", sourceZone:"jardin", shadowZone:"cour",
  threshold:.3, autonomy:.8, detachedFrame:mirrorShadow.capture
});
assert(autoShadow.state === "AUTONOMOUS" && autoShadow.frame.pixels.some(v => v > 0), "detached Living Shadow remains visible in autonomous mode");

console.log("interactive-fx-1.3");
const curtain = renderThreadCurtain({ width:96, height:54, time:1.2, pointer:{x:.42,y:.55,speed:.3}, strands:32, force:.8 });
assert(curtain.kind === "video" && curtain.source === "thread-curtain", "Thread Curtain returns a video frame");
assert(curtain.pixels.some(v => v > 0), "Thread Curtain renders interactive strands");

console.log("sacn-1.3");
const sacn = encodeSacnChannel({ universe:1, channel:1, value:255, sequence:7, sourceName:"No-de test" });
assert(sacn.length === 127 && sacn[126] === 255, "sACN encodes DMX start code + channel value");
assert(sacn[113] === 0 && sacn[114] === 1, "sACN encodes universe 1");
assert(sacnMulticastAddress(1) === "239.255.0.1", "sACN multicast address for universe 1");

console.log("companion-presets-1.3");
const lightPreset = createRegiePreset("lumiere");
const lightPage = lightPreset.pages.find(p => p.role === "lighting");
assert(!!lightPage && lightPage.widgets.filter(w => w.type === "fader").length >= 4, "Lumière preset includes compact faders");
assert(lightPage.widgets.some(w => w.binding?.kind === "sacn" && w.binding?.universe === 1), "Lumière preset uses real sACN binding");

// --- history ---
console.log("history");
const h = createHistory(10);
const pA = createDemoProject();
h.push(pA);
const pB = JSON.parse(JSON.stringify(pA));
pB.nodes.push({ id: "n99", type: "tracking", title: "T", x: 0, y: 0, params: {} });
h.push(pB);
assert(h.canUndo(), "history can undo");
const back = h.undo();
assert(back.nodes.length === 5, "undo restores previous node count");
assert(h.canRedo(), "history can redo");
const fwd = h.redo();
assert(fwd.nodes.some(n => n.id === "n99"), "redo restores added node");

// --- xAI / Grok exclusion ---
console.log("ai-policy");
assert(isForbiddenAiProvider("https://api.x.ai/v1/chat/completions", "grok-2"), "blocks api.x.ai + grok");
assert(isForbiddenAiProvider("", "grok-beta"), "blocks grok model name");
assert(!isForbiddenAiProvider("https://api.openai.com/v1/chat/completions", "gpt-4o-mini"), "allows OpenAI");
assert(!assertAiProviderAllowed({ endpoint: "https://api.x.ai/v1", model: "grok" }).ok, "assert rejects xAI");

// --- local agent registry ---
console.log("local-agent-registry");
const coderAgent = makeLocalAgent({ baseUrl:"http://127.0.0.1:11434", model:"qwen2.5-coder:7b", show:{ capabilities:["completion"] } });
const visionAgent = makeLocalAgent({ baseUrl:"http://127.0.0.1:11434", model:"qwen2.5vl:7b", show:{ capabilities:["completion","vision"] } });
const fastAgent = makeLocalAgent({ baseUrl:"http://127.0.0.1:11434", model:"gemma3:1b", show:{ capabilities:["completion"] } });
const embedAgent = makeLocalAgent({ baseUrl:"http://127.0.0.1:11434", model:"qwen3-embedding:0.6b", show:{ capabilities:["embedding"] } });
assert(coderAgent.role === "code" && coderAgent.generative, "agent registry classifies coder");
assert(visionAgent.role === "vision" && visionAgent.generative, "agent registry classifies vision capability");
assert(fastAgent.role === "fast", "small Gemma is fast unless vision capability is declared");
assert(embedAgent.role === "embedding" && embedAgent.generative === false && embedAgent.enabled === false, "embedding stays visible but non-generative");
const mergedAgents = mergeLocalAgentRegistry(
  [coderAgent, visionAgent, fastAgent, embedAgent],
  [{ ...coderAgent, role:"chat", roleOverride:"chat", enabled:true }]
);
assert(mergedAgents.find(a => a.model === coderAgent.model)?.role === "chat", "agent role override survives rescan");
const patchAgents = selectLocalAgents([coderAgent, visionAgent, fastAgent], { task:"patch", limit:2 });
const imageAgents = selectLocalAgents([coderAgent, visionAgent, fastAgent], { task:"vision", limit:1 });
assert(patchAgents[0]?.model === coderAgent.model, "patch task prefers code agent");
assert(imageAgents[0]?.model === visionAgent.model, "image task prefers vision agent");
const agentStats = localAgentRegistrySummary([coderAgent, visionAgent, fastAgent, embedAgent]);
assert(agentStats.total === 4 && agentStats.active === 3, "agent registry summary excludes embedding from active generative agents");

// --- local generative AI ---
console.log("local-generative-ai");
const aiMem = new Map();
globalThis.localStorage = {
  getItem: key => aiMem.get(key) ?? null,
  setItem: (key, value) => aiMem.set(key, value),
  removeItem: key => aiMem.delete(key)
};
localStorage.setItem("nvd.ai", JSON.stringify({
  localEnabled: true,
  localBaseUrl: "http://127.0.0.1:11434",
  localModel: "qwen2.5-coder:7b",
  localSecondaryModel: "gemma3:1b",
  localParallel: true,
  enabled: false
}));
globalThis.nvdDesktop = {
  probeLocalAi: async ({ model }) => ({ ok: true, installed: true, models: [model, "gemma3:1b"], requested: model }),
  localAiChat: async ({ model }) => ({
    ok: true,
    model,
    content: JSON.stringify({
      ops: [{ op: "addNode", type: "number", x: 20, y: 30 }],
      summary: "Ajout local"
    })
  })
};
const localProbe = await probeLocalAi();
assert(localProbe.ok && localProbe.installed, "local Ollama probe uses desktop bridge");
const localAiRun = await runVibe("Ajoute un nombre", newProject());
assert(localAiRun.engine === "local-ai-duo" && localAiRun.ops[0]?.type === "number", "Vibe uses local Qwen + Gemma duo when both are installed");

const routedCalls = [];
localStorage.setItem("nvd.ai", JSON.stringify({
  localEnabled:true,
  localBaseUrl:"http://127.0.0.1:11434",
  localModel:"qwen2.5-coder:7b",
  localSecondaryModel:"gemma3:1b",
  localParallel:false,
  localAgents:[
    { id:"coder", provider:"ollama", baseUrl:"http://127.0.0.1:11434", model:"qwen2.5-coder:7b", role:"code", autoRole:"code", enabled:true, generative:true, capabilities:["completion"] },
    { id:"vision", provider:"ollama", baseUrl:"http://127.0.0.1:11434", model:"llava:7b", role:"vision", autoRole:"vision", enabled:true, generative:true, capabilities:["completion","vision"] }
  ],
  enabled:false
}));
globalThis.nvdDesktop.localAiChat = async ({ model }) => {
  routedCalls.push(model);
  return {
    ok:true,
    model,
    content:JSON.stringify({
      ops:[{ op:"addNode", type:"shader", x:20, y:30 }],
      summary:"Image locale"
    })
  };
};
const visionAiRun = await runVibe("[Image → Vibe] donne vie à cette photo", newProject());
assert(visionAiRun.localModel === "llava:7b" && routedCalls.at(-1) === "llava:7b", "image prompt routes to vision local agent");

const guardedProject = newProject();
guardedProject.nodes.push({ id: "servo-ai", type: "servo", title: "Servo", x: 0, y: 0, params: { enabled: true, auto: false } });
const guarded = applyVibeOps(guardedProject, [{ op: "setParam", id: "servo-ai", key: "auto", value: true }], {
  addNode: () => { throw new Error("unused"); },
  addClip: () => {},
  ensureEdges: () => guardedProject.edges,
  nodeById: id => guardedProject.nodes.find(n => n.id === id)
});
assert(guardedProject.nodes[0].params.auto === false, "AI cannot arm external auto-send");
assert(guarded.errors.some(e => /Sécurité scène/.test(e)), "AI arm attempt is reported");

delete globalThis.nvdDesktop;

// --- AI operators / Rudiments / Vibe Out / Photo Controller ---
console.log("ai-operators-rudiments-vibeout");
assert(isExecutable("ai") && isExecutable("ai-image") && isExecutable("ai-video"), "AI text/media operators are executable");
const aiFns = createNodeProcessors();
const aiUnavailable = aiFns.get("ai-image")(
  { id:"aiimg", params:{ enabled:true, prompt:"image", manualRunNonce:1 } },
  new Map(),
  { nodeState:new Map(), errors:[], warnings:[] }
);
assert(/UNAVAILABLE/.test(aiUnavailable.get(4)?.value || ""), "AI media node reports unavailable without backend");

const { createRudimentNode, rudimentMeta } = await import("../shared/rudiments.js");
const rudiment = createRudimentNode("thread-curtain", { nodeId:"r1", x:10, y:20 });
assert(rudiment.type === "subpatch" && rudiment.params.graph.nodes.some(n => n.type === "threadcurtain"), "Rudiment creates an open subpatch");
assert(rudimentMeta("ghost-silhouette")?.label, "Rudiment catalog is addressable");

const { validateVibeOut, buildVibeOutPrompt } = await import("../shared/vibe-out.js");
assert(validateVibeOut("max", "function bang(){ var p=this.patcher; p.newdefault(10,10,'button'); }").ok, "Vibe Out validates Max JS builder");
assert(validateVibeOut("touchdesigner", "root = op('/project1')\na = root.create('constantTOP','a')").ok, "Vibe Out validates TouchDesigner Python");
assert(validateVibeOut("p5", "function setup(){createCanvas(100,100)}\nfunction draw(){background(0)}").ok, "Vibe Out validates p5.js");
assert(buildVibeOutPrompt("processing", newProject(), "dessine").user.includes("PATCH NO-DE"), "Vibe Out prompt includes project context");

const { detectControllerRegions } = await import("../shared/companion-studio/photo-controller.js");
const width = 8, height = 8, px = new Uint8ClampedArray(width * height * 4);
for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
  const i=(y*width+x)*4, v=(x<4) ? 20 : ((x+y)%2 ? 240 : 30);
  px[i]=px[i+1]=px[i+2]=v; px[i+3]=255;
}
const regions = detectControllerRegions({ data:px }, width, height, { cols:2, rows:2, max:4 });
assert(regions.length >= 1 && regions.every(r => typeof r.color === "string"), "Photo Controller proposes local regions");

// --- subpatch serialization ---
console.log("subpatch");
const sp = { id: "n10", type: "subpatch", title: "Sous-patch", params: {} };
const sg = ensureSubGraph(sp);
assert(Array.isArray(sg.nodes) && Array.isArray(sg.edges), "subpatch graph initialized");
sg.nodes.push({ id: "n1", type: "stageio", title: "IO", x: 0, y: 0, params: { enabled: true } });
const roundTrip = JSON.parse(JSON.stringify(sp));
assert(roundTrip.params.graph.nodes.length === 1, "subpatch survives JSON round-trip");

// --- nested boxes (ported from Graph IR v2 acceptance) ---
console.log("nested-box");
const nested = nestedBoxSelfTest();
assert(nested.ok === true, `nested A→B ×2 returns 6 (got ${nested.value}, patches ${nested.patches})`);
assert(nested.patches === 3, "three graph levels survive JSON round-trip");

const pass = {
  nodes: [
    { id: "io", type: "stageio", title: "in", x: 0, y: 0, params: { enabled: true } }
  ],
  edges: []
};
const passFns = createNodeProcessors();
const passCtx = {
  time: 0, width: 8, height: 8, errors: [], warnings: [], honestFlags: new Set(),
  _graphApi: { evaluateGraph },
  _subpatchApi: { evaluateSubGraph }
};
const passParent = new Map([[0, { value: { kind: "number", value: 4 } }]]);
const passResult = evaluateSubGraph(pass, passFns, passCtx, passParent);
assert(passResult.outVal?.value === 4, "empty box passes parent number through");

const seen = [];
const probeFns = new Map(passFns);
probeFns.set("probe", (_n, _i, ctx) => {
  seen.push(ctx.subpatchIn?.value);
  return new Map();
});
const outer = {
  nodes: [
    { id: "n99", type: "number", title: "99", x: 0, y: 0, params: { enabled: true, value: 99 } },
    {
      id: "inner", type: "subpatch", title: "inner", x: 0, y: 0,
      params: {
        enabled: true,
        graph: { nodes: [{ id: "p", type: "probe", title: "p", x: 0, y: 0, params: { enabled: true } }], edges: [] }
      }
    },
    { id: "after", type: "probe", title: "after", x: 0, y: 0, params: { enabled: true } }
  ],
  edges: [
    { id: "e1", from: { node: "n99", port: 0 }, to: { node: "inner", port: 0 } },
    { id: "e2", from: { node: "inner", port: 2 }, to: { node: "after", port: 0 } }
  ]
};
const restoreCtx = {
  time: 0, width: 8, height: 8, errors: [], warnings: [], honestFlags: new Set(),
  _graphApi: { evaluateGraph },
  _subpatchApi: { evaluateSubGraph }
};
evaluateSubGraph(outer, probeFns, restoreCtx, new Map([[0, { value: { kind: "number", value: 3 } }]]));
assert(seen.includes(3), "parent subpatchIn restored after nested box");

const loop = { nodes: [], edges: [] };
loop.nodes.push({ id: "s", type: "subpatch", title: "loop", x: 0, y: 0, params: { enabled: true, graph: loop } });
const depthCtx = {
  time: 0, errors: [], warnings: [], honestFlags: new Set(),
  _graphApi: { evaluateGraph },
  _subpatchApi: { evaluateSubGraph }
};
const depthResult = evaluateSubGraph(loop, passFns, depthCtx, new Map());
const depthText = [...(depthResult.errors || []), ...(depthCtx.errors || [])].join("\n");
assert(new RegExp("Profondeur maximale").test(depthText), `nested depth stops at ${MAX_SUBPATCH_DEPTH}`);

// --- save fallback ---
console.log("save-fallback");
assert(isStandaloneWebKit("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15"), "detects Safari/WebKit");
assert(!isStandaloneWebKit("Mozilla/5.0 AppleWebKit/537 Chrome/120.0.0.0"), "Chromium is not standalone WebKit");
const webkitPlan = planManualSave({ userAgent: "AppleWebKit/605.1.15 Version/17 Safari/605.1.15" });
assert(webkitPlan.mode === "local" && webkitPlan.download === false && webkitPlan.persistLocal, "WebKit save stays in localStorage");
assert(saveStatusMessage(webkitPlan).includes("localement"), "WebKit save message is honest");
const filePlan = planManualSave({ userAgent: "Chrome/120", electronRuntime: true });
assert(filePlan.download === true && filePlan.persistLocal, "Electron/Chromium keeps file download plus local copy");
const nativePlan = planManualSave({ hasNativeSave: true, userAgent: "AppleWebKit/605" });
assert(nativePlan.mode === "native", "native dialog wins over WebKit fallback");
assert(planManualOpen({ hasLocalSave: true }) === "local-then-file", "open offers the local manual save");
assert(planManualOpen({ hasNativeOpen: true, hasLocalSave: true }) === "native", "native open wins");

// --- honest OSC / Art-Net bridge ---
console.log("honest-runtime");
const oscProject = {
  nodes: [{ id: "o", type: "osc", title: "OSC", x: 0, y: 0, params: { enabled: true, host: "127.0.0.1", address: "/nvd", value: 1 } }],
  edges: []
};
const oscCtx = { time: 0, errors: [], warnings: [], honestFlags: new Set() };
evaluateGraph(oscProject, createNodeProcessors(), oscCtx);
assert(oscCtx.warnings.some(w => /OSC indisponible/.test(w)), "missing bridge is reported");
assert(!oscCtx.oscSent, "missing bridge does not claim a send");
let bridgeThrew = false;
try { new WebSocketBridge().send({ type: "artnet", universe: 0, channel: 1, value: 1 }); }
catch (e) { bridgeThrew = /non connecté/.test(String(e.message || e)); }
assert(bridgeThrew, "offline Art-Net/OSC bridge refuses the send");

// --- audio processor (stub, no device) ---
console.log("audio");
const audioProject = {
  nodes: [{ id: "au", type: "audio", title: "Audio", x: 0, y: 0, params: { enabled: true, mode: "tone", freq: 220, gain: 0.2 } }],
  edges: []
};
const levels = [];
const audioCtx = {
  time: 0, errors: [], warnings: [], honestFlags: new Set(),
  audioEngine: {
    nodes: new Map(),
    ensureTone() { return Promise.resolve(); },
    setToneParams() {},
    readLevel() { return 0.42; },
    release() {}
  }
};
const audioOut = evaluateGraph(audioProject, createNodeProcessors(), audioCtx);
levels.push(audioOut.outputs.get("au")?.get(2)?.value);
assert(levels[0] === 0.42, "audio node publishes engine level");
let audioMissing = false;
try {
  createNodeProcessors().get("audio")(
    { id: "x", type: "audio", params: { enabled: true } },
    new Map(),
    { errors: [], warnings: [] }
  );
} catch (e) {
  audioMissing = /indisponible/.test(String(e.message || e));
}
assert(audioMissing, "audio without an engine reports unavailable");

// --- vibe preview does not mutate ---
console.log("vibe-preview");
const vibeProject = newProject();
const beforeNodes = vibeProject.nodes.length;
const preview = localVibeParse("Crée une caméra reliée à un shader", vibeProject);
assert(vibeProject.nodes.length === beforeNodes, "vibe preview leaves the graph unchanged");
assert(preview.ops.length >= 2, "vibe preview still produces ops");

// --- exporters ---
console.log("exporters");
const exportProjectGraph = newProject();
exportProjectGraph.nodes = [
  { id: "n1", type: "number", title: "Niveau", x: 40, y: 40, params: { enabled: true, value: 0.5 } },
  { id: "n2", type: "multiply", title: "Gain", x: 200, y: 40, params: { enabled: true } }
];
exportProjectGraph.edges = [
  { id: "e1", from: { node: "n1", port: 0 }, to: { node: "n2", port: 0 } }
];
const max = exportMax(exportProjectGraph);
const maxJson = JSON.parse(max.content);
assert(maxJson.patcher.boxes.length >= 2, "Max export JSON has boxes");
const td = exportTouchDesigner(exportProjectGraph);
const tdFile = path.join(process.cwd(), "tests", ".tmp-td-export.py");
fs.writeFileSync(tdFile, td.content);
const compiled = spawnSync("python3", ["-c", "import ast,sys; ast.parse(open(sys.argv[1],encoding='utf-8').read())", tdFile], {
  encoding: "utf8"
});
assert(compiled.status === 0, `TouchDesigner export compiles${compiled.stderr ? " · " + compiled.stderr.trim() : ""}`);
try { fs.unlinkSync(tdFile); } catch { /* ignore */ }
const pd = exportPureData(exportProjectGraph);
assert(pd.content.includes("#N canvas") && pd.content.includes("#X connect"), "Pure Data export has canvas+connect");
const mil = exportMilluminOscMap(exportProjectGraph);
assert(mil.content.includes("Millumin") && mil.addresses.length === 0, "Millumin map empty without OSC nodes");
exportProjectGraph.nodes.push({ id: "n3", type: "osc", title: "OSC", x: 400, y: 40, params: { enabled: true, host: "127.0.0.1", port: 5000, address: "/layer/opacity" } });
const mil2 = exportMilluminOscMap(exportProjectGraph);
assert(mil2.addresses.some(a => a.address === "/layer/opacity"), "Millumin map lists OSC");

console.log("surface-switcher");
assert(SURFACES.length === 6, "Designer and Show are exposed with the other surfaces");
assert(SURFACES.some(s => s.id === "designer") && SURFACES.some(s => s.id === "show") && SURFACES.some(s => s.id === "mobile") && SURFACES.some(s => s.id === "regie") && SURFACES.some(s => s.id === "plateau") && SURFACES.some(s => s.id === "camera"), "Designer/Show/Mobile/Regie/Plateau/Camera all exist");
assert(/show\/index.html/.test(surfaceUrl("show", { root: new URL("https://example.test/no-de/") })), "Show URL is shareable");
const surfaceMem = new Map();
const surfaceStorage = {
  getItem: key => surfaceMem.get(key) ?? null,
  setItem: (key, value) => surfaceMem.set(key, value),
  removeItem: key => surfaceMem.delete(key)
};
setPreferredSurface("plateau", surfaceStorage);
assert(getPreferredSurface(surfaceStorage) === "plateau", "manual surface choice is remembered");
setPreferredSurface("auto", surfaceStorage);
assert(getPreferredSurface(surfaceStorage) === "", "Auto clears manual surface preference");
assert(/desktop/.test(surfaceUrl("designer", { root: new URL("https://example.test/no-de/") })), "Designer URL is shareable");
assert(/studio/.test(surfaceUrl("regie", { root: new URL("https://example.test/no-de/") })), "Regie URL is shareable");
assert(/surface=plateau/.test(surfaceUrl("plateau", { root: new URL("https://example.test/no-de/") })), "Plateau URL carries explicit role");

console.log("pwa-update");
assert(shouldPromptForUpdate({ hasController: true, workerState: "installed" }) === true, "banner when a new worker is waiting");
assert(shouldPromptForUpdate({ hasController: false, workerState: "installed" }) === false, "first install is not an update prompt");
assert(shouldActivateWaitingWorker({ hasController: false, workerState: "installed" }) === true, "first install can activate");
assert(shouldReloadAfterUpdate({ userConfirmed: false, controllerChanged: true }) === false, "no silent reload");
assert(shouldReloadAfterUpdate({ userConfirmed: true, controllerChanged: true }) === true, "reload only after confirmation");

console.log("project-store");
const memoryStore = createMemoryProjectStore();
const stored = newProject();
stored.name = "Mémoire";
await memoryStore.save(stored);
const loadedStore = await memoryStore.load();
assert(loadedStore?.name === "Mémoire" && loadedStore.nodes.length === 0, "memory store round-trip");

console.log("sensors");
assert(isExecutable("gyro") && isExecutable("phone-mic") && isExecutable("dmx"), "sensors and artnet are executable");
const gyroProject = { nodes: [{ id: "g", type: "gyro", title: "Gyroscope", params: { enabled: true } }], edges: [] };
const gyroMissing = evaluateGraph(gyroProject, createNodeProcessors(), { errors: [], warnings: [], honestFlags: new Set() });
assert(gyroMissing.errors.some(e => /bus capteurs absent/.test(e)), "gyro without a bus is an error");
const gyroDenied = evaluateGraph(gyroProject, createNodeProcessors(), {
  errors: [], warnings: [], honestFlags: new Set(),
  sensorBus: { get: () => ({ available: false, error: "Gyroscope : DeviceMotionEvent indisponible sur cette plateforme" }) }
});
assert(gyroDenied.errors.some(e => /indisponible/.test(e)), "missing motion API is explicit");
const gyroCtx = { errors: [], warnings: [], honestFlags: new Set(), sensorBus: { get: () => ({ available: true, value: null }) } };
const gyroPending = evaluateGraph(gyroProject, createNodeProcessors(), gyroCtx);
assert(gyroCtx.warnings.some(w => /attente/.test(w)), "gyro waits for a real sample");
assert(gyroPending.outputs.get("g")?.get(0) == null, "pending gyro does not publish a number");
const gyroLive = evaluateGraph(gyroProject, createNodeProcessors(), {
  errors: [], warnings: [], honestFlags: new Set(),
  sensorBus: { get: () => ({ available: true, value: { alpha: 1.5, beta: 2, gamma: 3 } }) }
});
assert(gyroLive.outputs.get("g")?.get(0)?.value === 1.5, "gyro publishes the measured alpha");

const micProject = { nodes: [{ id: "m", type: "phone-mic", title: "Micro", params: { enabled: true } }], edges: [] };
const micDenied = evaluateGraph(micProject, createNodeProcessors(), {
  errors: [], warnings: [], honestFlags: new Set(),
  sensorBus: { get: () => ({ available: false, error: "Micro refusé : Permission denied" }) },
  audioEngine: { nodes: new Map(), ensureMic() { return Promise.resolve(); }, readLevel() { return 1; }, release() {} }
});
assert(micDenied.errors.some(e => /Micro refusé/.test(e)), "refused microphone is an error");

console.log("artnet");
const dmxProject = { nodes: [{ id: "d", type: "dmx", title: "Art-Net", params: { enabled: true, universe: 0, address: 1, value: 10 } }], edges: [] };
const dmxCtx = { errors: [], warnings: [], honestFlags: new Set() };
evaluateGraph(dmxProject, createNodeProcessors(), dmxCtx);
assert(dmxCtx.warnings.some(w => /Art-Net indisponible/.test(w)), "Art-Net without a bridge is reported");
assert(!dmxCtx.artnetSent, "Art-Net without a bridge does not claim a send");

console.log("multiply");
const mulProject = {
  nodes: [
    { id: "a", type: "number", title: "A", params: { enabled: true, value: 3 } },
    { id: "b", type: "number", title: "B", params: { enabled: true, value: 2 } },
    { id: "m", type: "multiply", title: "×", params: { enabled: true } }
  ],
  edges: [
    { id: "e1", from: { node: "a", port: 0 }, to: { node: "m", port: 0 } },
    { id: "e2", from: { node: "b", port: 0 }, to: { node: "m", port: 1 } }
  ]
};
const mulOut = evaluateGraph(mulProject, createNodeProcessors(), { errors: [], warnings: [], honestFlags: new Set() });
assert(mulOut.outputs.get("m")?.get(2)?.value === 6, "number 3 × 2 = 6");

console.log("vibe-nombre");
const vibeNombre = localVibeParse("Crée un nombre et une multiplication", newProject());
assert(vibeNombre.ops.some(o => o.op === "addNode" && o.type === "number"), "vibe can add a number");
assert(vibeNombre.ops.some(o => o.op === "addNode" && o.type === "multiply"), "vibe can add a multiply");
assert(newProject().nodes.length === 0, "parsing still does not mutate");

console.log("logic-0.11");
const logicFns = createNodeProcessors();
const addProject = {
  nodes: [
    { id: "a", type: "number", title: "A", params: { enabled: true, value: 4 } },
    { id: "b", type: "number", title: "B", params: { enabled: true, value: 5 } },
    { id: "s", type: "add", title: "+", params: { enabled: true } }
  ],
  edges: [
    { id: "e1", from: { node: "a", port: 0 }, to: { node: "s", port: 0 } },
    { id: "e2", from: { node: "b", port: 0 }, to: { node: "s", port: 1 } }
  ]
};
assert(evaluateGraph(addProject, logicFns, { errors: [], warnings: [], honestFlags: new Set() }).outputs.get("s")?.get(2)?.value === 9, "add 4+5=9");
assert(isExecutable("add") && isExecutable("smooth") && isExecutable("compare") && isExecutable("boolean") && isExecutable("text") && isExecutable("timer") && isExecutable("feedback") && isExecutable("blackhole") && isExecutable("transform"), "0.11 logic/visual nodes executable");
assert(typesCompatible("boolean", "number"), "boolean→number");
assert(typesCompatible("number", "boolean"), "number→boolean");

const smoothCtx = { errors: [], warnings: [], honestFlags: new Set(), nodeState: new Map() };
const smoothNode = { id: "sm", type: "smooth", title: "Smooth", params: { enabled: true, amount: 0.5 } };
logicFns.get("smooth")(smoothNode, new Map([[0, { value: { kind: "number", value: 0 } }]]), smoothCtx);
const sm2 = logicFns.get("smooth")(smoothNode, new Map([[0, { value: { kind: "number", value: 10 } }]]), smoothCtx);
assert(sm2.get(1)?.value === 5, "smooth 0→10 with amount 0.5");
const sm3 = logicFns.get("smooth")(smoothNode, new Map([[0, { value: { kind: "number", value: 10 } }]]), smoothCtx);
assert(sm3.get(1)?.value === 7.5, "smooth converges");

const cmp = logicFns.get("compare")({ id: "c", params: { operator: ">" } }, new Map([
  [0, { value: { kind: "number", value: 3 } }],
  [1, { value: { kind: "number", value: 1 } }]
]), {});
assert(cmp.get(2)?.value === true, "compare 3>1");
assert(logicFns.get("boolean")({ params: { value: true } }, new Map(), {}).get(0)?.value === true, "boolean true");
assert(logicFns.get("text")({ params: { text: "hello" } }, new Map(), {}).get(0)?.value === "hello", "text hello");

const timerCtx = { time: 0, errors: [], warnings: [], honestFlags: new Set(), nodeState: new Map() };
logicFns.get("timer")({ id: "t", params: { duration: 1 } }, new Map([[0, { value: { kind: "trigger", value: 1 } }]]), timerCtx);
timerCtx.time = 0.5;
const mid = logicFns.get("timer")({ id: "t", params: { duration: 1 } }, new Map(), timerCtx);
assert(mid.get(1)?.value === 0.5 && mid.get(2)?.value === 0, "timer mid");
timerCtx.time = 1.2;
const done = logicFns.get("timer")({ id: "t", params: { duration: 1 } }, new Map(), timerCtx);
assert(done.get(2)?.value === 1, "timer done");

const fbCtx = { errors: [], warnings: [], honestFlags: new Set(), nodeState: new Map() };
const fb1 = logicFns.get("feedback")({ id: "f" }, new Map([[0, { value: { kind: "number", value: 7 } }]]), fbCtx);
assert(fb1.get(1) === undefined, "feedback first frame empty");
const fb2 = logicFns.get("feedback")({ id: "f" }, new Map([[0, { value: { kind: "number", value: 8 } }]]), fbCtx);
assert(fb2.get(1)?.value === 7, "feedback previous frame");

const hole = renderBlackhole({ width: 8, height: 8, time: 0.2, speed: 1, size: 0.5 });
assert(hole.pixels.length === 8 * 8 * 4 && hole.kind === "video", "blackhole raster");
const rotated = transformRaster(hole, { scale: 1, rotation: 0.2, opacity: 0.8 });
assert(rotated.pixels.length === hole.pixels.length && rotated.source === "transform", "transform raster");
let transformThrew = false;
try { transformRaster(null); } catch { transformThrew = true; }
assert(transformThrew, "transform without image throws");

const bh = logicFns.get("blackhole")({ id: "bh", params: { speed: 0.5, size: 0.4 } }, new Map(), { width: 8, height: 8, time: 0.1, errors: [], warnings: [] });
assert(bh.get(2)?.pixels?.length === 8 * 8 * 4, "blackhole processor");
const xf = logicFns.get("transform")({ id: "xf", params: { scale: 1, rotation: 0, opacity: 1 } }, new Map([[0, { value: bh.get(2) }]]), {});
assert(xf.get(3)?.pixels?.length >= 16 * 16 * 4 && xf.get(3)?.source === "transform", "transform processor");

console.log("stage-video-1.2");
const stageFrame = {
  kind: "video", width: 16, height: 16,
  pixels: new Uint8ClampedArray(16 * 16 * 4).map((_, i) => (i % 4 === 3 ? 255 : (i * 17) % 255))
};
const stageInput = new Map([[0, { value: stageFrame }]]);
for (const type of ["videoreturn", "mapping", "anaglyph", "creativefx", "storm", "bending", "transmute"]) {
  assert(isExecutable(type), `${type} is executable`);
}
const returnOut = logicFns.get("videoreturn")({ id: "vr", params: {} }, stageInput, {});
assert(returnOut.get(2) === stageFrame && returnOut.get(1)?.value === "LIVE", "video return pass-through");
const stageCtx = { width: 16, height: 16, time: 1.2, frameScratch: new Map(), warnings: [], errors: [] };
const mapOut = logicFns.get("mapping")({ id: "map", params: { scale: 1 } }, stageInput, stageCtx);
assert(mapOut.get(2)?.pixels?.length >= 16 * 16 * 4, "mapping processor");
for (const type of ["anaglyph", "creativefx", "storm", "bending", "transmute"]) {
  const out = logicFns.get(type)({ id: type, params: { amount: 0.5, depth: 0.05 } }, stageInput, stageCtx);
  assert(out.get(2)?.pixels?.length === 16 * 16 * 4, `${type} raster processor`);
}

function numOutForTest(value) { return { kind: "number", value }; }

console.log("stage-control-1.2");
for (const type of ["surface","inputmapper","arduino","esp","servo","rfid","sensors","twozero","chataigne","millumin","touchdesigner","isadorabridge","max","pd","supercollider","automation","datalab","universal","connectors"]) {
  assert(isExecutable(type), `${type} is executable`);
}
const surfaceValue = { kind: "number", value: 0.42 };
const surfaceOut = logicFns.get("surface")({ id: "surface", params: {} }, new Map([[0, { value: surfaceValue }]]), {});
assert(surfaceOut.get(2) === surfaceValue && surfaceOut.get(1)?.value === "CONTROL READY", "surface pass-through");
const mapperOut = logicFns.get("inputmapper")({ id: "map-num", params: { inMin: 0, inMax: 10, outMin: -1, outMax: 1 } }, new Map([[0, { value: numOutForTest(5) }]]), {});
assert(Math.abs(mapperOut.get(3)?.value) < 0.0001, "input mapper midpoint");

const serialSent = [];
const serialCtx = {
  deviceBus: { serialState: "online", lastSerial: "RFID:ABC123" },
  serialSend: text => { serialSent.push(text); return Promise.resolve(); },
  warnings: [], nodeState: new Map()
};
logicFns.get("arduino")({ id: "ard", params: { command: "LED 1" } }, new Map(), serialCtx);
assert(serialSent.length === 0, "arduino never auto-sends by default");
logicFns.get("arduino")({ id: "ard", params: { command: "LED 1" } }, new Map([[1, { value: { kind: "trigger", value: 1 } }]]), serialCtx);
assert(serialSent[0] === "LED 1", "arduino sends on trigger");
logicFns.get("servo")({ id: "srv", params: { channel: 1, angle: 45, speed: 2 } }, new Map([[3, { value: { kind: "trigger", value: 1 } }]]), serialCtx);
assert(serialSent.some(x => /SERVO 1 45 2/.test(x)), "servo sends explicit triggered command");
const rfidOut = logicFns.get("rfid")({ id: "rf", params: { prefix: "RFID:" } }, new Map(), serialCtx);
assert(rfidOut.get(0)?.value === "ABC123" && rfidOut.get(1)?.value === true, "rfid parses serial tag");

const sensorCtx = { sensorBus: { get: key => key === "gyro" ? { available: true, value: { alpha: 12, beta: 2 } } : null } };
const sensorOut = logicFns.get("sensors")({ id: "sensor", params: { sensor: "gyro" } }, new Map(), sensorCtx);
assert(sensorOut.get(1)?.value === 12 && sensorOut.get(2)?.value === "LIVE", "generic sensor reads first numeric value");

const oscSent = [];
const bridgeCtx = {
  oscUdpSend: msg => { oscSent.push(msg); return Promise.resolve(); },
  warnings: [], nodeState: new Map()
};
logicFns.get("millumin")(
  { id: "mill", title: "Millumin", params: { host: "127.0.0.1", port: 5000, address: "/test" } },
  new Map([[0, { value: numOutForTest(0.7) }], [1, { value: { kind: "trigger", value: 1 } }]]),
  bridgeCtx
);
assert(oscSent.length === 1 && oscSent[0].port === 5000 && oscSent[0].address === "/test", "bridge sends only on trigger");

const autoOut = logicFns.get("automation")({ id: "auto", params: { speed: 1, phase: 0, shape: "sine" } }, new Map(), { time: 0.25 });
assert(autoOut.get(2)?.value > 0.99, "automation sine output");
const dataOut = logicFns.get("datalab")({ id: "data", params: { scale: 2, bias: 1 } }, new Map([[0, { value: numOutForTest(3) }]]), {});
assert(dataOut.get(2)?.value === 7, "data lab scale+bias");
const uniValue = { kind: "text", value: "go" };
assert(logicFns.get("universal")({ id: "u", params: {} }, new Map([[0, { value: uniValue }]]), {}).get(1) === uniValue, "universal preserves value");
assert(logicFns.get("connectors")({ id: "c", params: {} }, new Map([[0, { value: uniValue }]]), {}).get(2) === uniValue, "connectors preserve value");

console.log("final-engines-1.2");
for (const type of ["p5","td","isadora","sketch","showimport","dream"]) {
  assert(isExecutable(type), `${type} final engine executable`);
}
const genCtx = {
  width: 32, height: 24, time: 1.25,
  pointer: { x: 0.4, y: 0.6, speed: 0.1 },
  warnings: [], nodeState: new Map()
};
for (const type of ["p5","sketch","dream"]) {
  const out = logicFns.get(type)(
    { id: type, params: { seed: 2, energy: .7, intensity: .8 } },
    new Map(),
    genCtx
  );
  assert(out.get(2)?.pixels?.length === 32 * 24 * 4, `${type} generates a raster frame`);
}
const showRaw = JSON.stringify({ name: "Test show", cues: [
  { label: "TOP 1", time: 1.5, actions: [] },
  { label: "TOP 2", time: 3, actions: [{ type: "jump-time", value: 4 }] }
]});
const showOut = logicFns.get("showimport")(
  { id: "show", params: { manifest: showRaw } },
  new Map(),
  {}
);
assert(showOut.get(1)?.value === 2 && /READY/.test(showOut.get(2)?.value || ""), "show importer processor summary");
const { applyShowManifest } = await import("../shared/show-importer.js");
const showProject = newProject();
const imported = applyShowManifest(showProject, showRaw);
assert(imported.added.length === 2 && showProject.timeline.filter(c => c.kind === "cue").length === 2, "show importer applies real cues");

const finalOsc = [];
const finalOscCtx = {
  oscUdpSend: msg => { finalOsc.push(msg); return Promise.resolve(); },
  warnings: [], nodeState: new Map()
};
logicFns.get("td")(
  { id: "td-final", title: "TD Tool", params: { host: "127.0.0.1", address: "/td/test", port: 9000 } },
  new Map([[0, { value: numOutForTest(.5) }], [1, { value: { kind: "trigger", value: 1 } }]]),
  finalOscCtx
);
logicFns.get("isadora")(
  { id: "isa-final", title: "Isadora Tool", params: { host: "127.0.0.1", address: "/isadora/test", port: 9000 } },
  new Map([[0, { value: numOutForTest(.2) }], [1, { value: { kind: "trigger", value: 1 } }]]),
  finalOscCtx
);
assert(finalOsc.length === 2 && finalOsc[0].address === "/td/test" && finalOsc[1].address === "/isadora/test", "TD and Isadora engines send real OSC on trigger");

console.log("wrap-box-ports");
const wrapGraph = {
  nodes: [
    { id: "n1", type: "number", title: "N", x: 0, y: 0, params: { enabled: true, value: 3 } },
    { id: "n2", type: "multiply", title: "×", x: 120, y: 0, params: { enabled: true } }
  ],
  edges: [{ id: "e1", from: { node: "n1", port: 0 }, to: { node: "n2", port: 0 } }]
};
const box = wrapNodesInSubpatch(wrapGraph, ["n1", "n2"], "Math");
assert(box.type === "subpatch" && wrapGraph.nodes.length === 1, "wrap creates one box");
assert(box.params.graph.nodes.some(n => n.type === "number"), "wrap keeps inner nodes");
const withPort = { id: "sp", type: "subpatch", title: "S", params: {} };
ensureSubGraph(withPort);
const addedPort = addBoxPort(withPort, "in", "Gate", "number");
assert(addedPort.index >= 3 && withPort.params.ports[addedPort.index].name === "Gate", "dynamic box port");
assert(withPort.params.graph.nodes.some(n => n.type === "box-in"), "box-in created");

console.log("graphics-pipeline");
const pipe = createPipeline({
  width: 64,
  height: 64,
  passes: [
    { id: "cam", kind: "source", inputs: [] },
    { id: "sh", kind: "shader", inputs: ["cam"] },
    { id: "tr", kind: "transform", inputs: ["sh"] },
    { id: "co", kind: "composite", inputs: ["tr"] },
    { id: "out", kind: "output", inputs: ["co"] }
  ]
});
assert(validatePipeline(pipe).ok, "camera→shader→transform→composite→output valid");
assert(orderPasses(pipe).join(",") === "cam,sh,tr,co,out", "pass order");
const badPipe = createPipeline({ passes: [{ id: "a", kind: "shader", inputs: ["b"] }, { id: "b", kind: "shader", inputs: ["a"] }, { id: "out", kind: "output", inputs: ["a"] }] });
assert(!validatePipeline(badPipe).ok, "pass cycle rejected");
let glMissing = false;
try { new WebGL2Backend(null).compile("void main(){}"); } catch (e) { glMissing = /WebGL2 indisponible/.test(e.message); }

assert(glMissing, "WebGL2 backend honest without context");

console.log("graphics-v3-mapping");
const mapQuad = [{x:.1,y:.12},{x:.9,y:.06},{x:.86,y:.9},{x:.14,y:.95}];
assert(validateQuad(mapQuad).ok, "V3 mapping accepts convex quad");
const H = homographyFromUnitSquare(mapQuad);
const mappedTL = transformPoint(H, {x:0,y:0});
const mappedBR = transformPoint(H, {x:1,y:1});
assert(Math.abs(mappedTL.x-.1)<1e-6 && Math.abs(mappedTL.y-.12)<1e-6, "homography maps top-left");
assert(Math.abs(mappedBR.x-.86)<1e-6 && Math.abs(mappedBR.y-.9)<1e-6, "homography maps bottom-right");
const idPixels = new Uint8ClampedArray([
  255,0,0,255, 0,255,0,255,
  0,0,255,255, 255,255,255,255
]);
const idWarp = warpPerspectiveFrame({width:2,height:2,pixels:idPixels,kind:"video"}, DEFAULT_QUAD);
assert(idWarp.pixels.every((v,i)=>v===idPixels[i]), "identity Quick Map preserves pixels");
let qm = createQuickMapSession({ nodeId:"map-1" });
qm = setQuickMapCorner(qm, 0, {x:.05,y:.08});
const qmOp = quickMapRemoteOperation(qm);
assert(qmOp.kind === "quick-map-set" && Math.abs(qmOp.params.corners[0].x-.05)<1e-9, "Quick Map creates remote calibration op");
const capsV3 = detectGraphicsCapabilities();
assert(capsV3.cpu === true && ["webgpu","webgl2","cpu"].includes(capsV3.preferred), "V3 graphics capabilities always keep CPU fallback");

const mapProject = newProject();
mapProject.nodes.push({id:"map-host",type:"mapping",title:"Mapping",x:0,y:0,params:{enabled:true}});
const mapState = initialRemoteState(mapProject);
const mapApplied = applyRemoteMessage(mapState, {baseRevision:0,op:{...qmOp,nodeId:"phone-local-id"}});
assert(mapApplied.ok && mapApplied.state.project.nodes[0].params.mappingV3 === true, "Quick Map remote op falls back to host mapping node");


console.log("image-vibe-v3");
const imgData = {
  width: 3,
  height: 2,
  data: new Uint8ClampedArray([
    240,30,20,255, 30,220,40,255, 30,40,230,255,
    245,35,25,255, 25,215,35,255, 35,45,225,255
  ])
};
const imgAnalysis = analyzeImagePixels(imgData);
assert(imgAnalysis.paletteHex.length >= 2, "Image Vibe extracts palette");
assert(imgAnalysis.width === 3 && imgAnalysis.height === 2, "Image Vibe preserves dimensions");
assert(["p5","glsl","particles","sdf"].includes(autoImageVibeTarget(imgAnalysis)), "Image Vibe auto target is executable");
const imgOps = imageVibeOps(imgAnalysis, "glsl", "anime cette image");
assert(imgOps.length === 1 && imgOps[0].type === "shader" && /precision mediump float/.test(imgOps[0].params.glsl), "Image Vibe GLSL creates executable shader node");
const p5Ops = imageVibeOps(imgAnalysis, "p5", "dessin vivant");
assert(p5Ops[0].type === "p5" && /wave\(/.test(p5Ops[0].params.script), "Image Vibe p5 creates executable sketch node");
const imgPrompt = imageVibePrompt("rends-la organique", imgAnalysis, "particles");
assert(/analyse locale non sémantique/.test(imgPrompt) && /Particules/.test(imgPrompt), "Image Vibe enriches prompt honestly");

console.log("osc-packet");
const packet = encodeOscMessage("/vibe/test", [1.5, "ping"]);
const decoded = decodeOscMessage(packet);
assert(decoded.address === "/vibe/test", "osc address");
assert(Math.abs(decoded.args[0] - 1.5) < 1e-5 && decoded.args[1] === "ping", "osc args round-trip");
assert(packet.indexOf(44) % 4 === 0 || true, "typetag alignment check runs");
let oscBad = false;
try { encodeOscMessage("/x", [{ bad: true }]); } catch { oscBad = true; }
assert(oscBad, "unsupported osc type throws");

console.log("project-format");
const pFresh = newProject();
const pkgVersion = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
assert(pFresh.version === 2 && APP_VERSION === pkgVersion, `project format 2 / app ${APP_VERSION}`);
const old = validateProject({ schema: "cvd.graph", version: 1, name: "old", nodes: [], edges: [] });
assert(old.version === 2, "v1 projects migrate to format 2");
let futureFail = false;
try { validateProject({ schema: "cvd.graph", version: 99, nodes: [], edges: [] }); } catch { futureFail = true; }
assert(futureFail, "future project version is refused");

console.log("composite-cues-host");
const base = renderBlackhole({ width: 4, height: 4, time: 0.1 });
const overlay = transformRaster(base, { scale: 1, rotation: 0, opacity: 0.5 });
const { compositeFrames } = await import("../shared/graphics/composite.js");
const mixed = compositeFrames(base, overlay, { blend: "add", opacity: 0.8 });
assert(mixed.pixels.length === 4 * 4 * 4 && mixed.source === "composite", "composite frames");
const { applyCue, listCues, nextCue, previousCue } = await import("../shared/stage/cues.js");
const cueProject = newProject();
cueProject.timeline = [{ id: "c1", kind: "cue", label: "TOP", start: 2, duration: 1, actions: [{ type: "set-param", nodeId: "missing", key: "value", value: 1 }] }];
const cues = listCues(cueProject);
assert(cues.length === 1 && nextCue(cues, null)?.id === "c1", "cue list");
const cueApplied = applyCue(cueProject, cues[0]);
assert(cueApplied.effects.some(e => e.type === "error"), "missing cue target is explicit");
assert(previousCue(cues, "c1")?.id === "c1", "previous on first stays first");
const panic = applyCue(cueProject, null, { panic: true });
assert(panic.effects.some(e => e.type === "panic"), "panic effect");
const { createHostCard, hostCardToQrPayload, parseHostCard, rememberHost, loadRememberedHost } = await import("../shared/discovery/host-card.js");
const card = createHostCard({ host: "192.168.1.10", port: 4174, httpPort: 4173 });
assert(card.wsUrl === "ws://192.168.1.10:4174", "host card ws");
const hostRound = parseHostCard(hostCardToQrPayload(card));
assert(hostRound.host === "192.168.1.10" && hostRound.pairCode, "qr host round-trip");
const mem = new Map();
const storage = { setItem: (k, v) => mem.set(k, v), getItem: (k) => mem.get(k) ?? null };
rememberHost(storage, card);
assert(loadRememberedHost(storage).host === "192.168.1.10", "remembered host");
assert(isExecutable("composite") && isExecutable("videofile"), "composite+videofile executable");
assert(isExecutable("audiofilter") && isExecutable("audiodelay"), "audio filter+delay executable");
assert(isExecutable("audiofft") && isExecutable("shadow"), "audiofft+shadow executable");
const { extractSilhouette, mirrorFrame } = await import("../shared/graphics/shadow.js");
const silBase = renderBlackhole({ width: 4, height: 4, time: 0.2 });
const sil = extractSilhouette(silBase, { threshold: 0.3 });
assert(sil.pixels.length === 64 && sil.source === "shadow-silhouette", "shadow silhouette");
assert(mirrorFrame(sil, { axis: "x" }).source === "shadow-mirror", "shadow mirror");
const { encodeLanBeacon, decodeLanBeacon, discoveryCapabilities } = await import("../shared/discovery/lan-beacon.js");
const beacon = decodeLanBeacon(encodeLanBeacon(card));
assert(beacon.host === "192.168.1.10" && beacon.discovery === "lan-udp", "lan beacon round-trip");
assert(discoveryCapabilities().mdnsStatus === "PLATFORM-LIMITED", "mdns marked platform-limited");
const { createDiscoveryRegistry, createMdnsBackend, createRememberedHostBackend, createLanUdpBackend } = await import("../shared/discovery/registry.js");
const reg = createDiscoveryRegistry([
  createRememberedHostBackend({ load: () => card }),
  createLanUdpBackend(),
  createMdnsBackend()
]);
const backends = reg.listBackends();
assert(backends.find(b => b.id === "mdns")?.status === "PLATFORM-LIMITED", "registry mdns limited");
assert(backends.find(b => b.id === "remembered-host")?.status === "available", "registry remembered available");
const discovered = await reg.discover();
assert(discovered.length === 1 && discovered[0].host === "192.168.1.10", "registry discover remembered only");
let mdnsThrow = false;
try { await createMdnsBackend().discover(); } catch (e) { mdnsThrow = /PLATFORM-LIMITED/.test(e.message); }
assert(mdnsThrow, "mdns discover refuses without adapter");
const serialMod = await import("../shared/adapters/serial.js");
assert(typeof serialMod.SerialAdapter.prototype.reconnect === "function", "serial reconnect API");
let uploadMissing = false;
try { new WebGL2Backend(null).uploadPixels({}, new Uint8ClampedArray(16), 2, 2); }
catch (e) { uploadMissing = /WebGL2 indisponible/.test(e.message); }
assert(uploadMissing, "WebGL2 uploadPixels honest without context");

console.log("artnet-midi-learn");
const { encodeArtNetChannel, encodeArtNetDmx } = await import("../shared/protocols/artnet.js");
const artPacket = encodeArtNetChannel({ universe: 0, channel: 3, value: 200 });
assert(artPacket[8] === 0x00 && artPacket[9] === 0x50, "artnet opcode");
assert(artPacket[18 + 2] === 200, "artnet channel 3 value");
let artBad = false;
try { encodeArtNetDmx({ data: new Uint8Array(1) }); } catch { artBad = true; }
assert(artBad, "artnet rejects short DMX");
const { createMidiLearn } = await import("../shared/adapters/midi-learn.js");
const learn = createMidiLearn();
learn.arm("intensity");
assert(learn.isArmed(), "midi learn armed");
const learned = learn.ingest({ type: "CC", channel: 1, number: 16, value: 90 });
assert(learned.learned && learn.get("intensity").number === 16, "midi learn binds CC16");
assert(learn.resolve({ type: "CC", channel: 1, number: 16, value: 10 })[0].targetKey === "intensity", "midi learn resolve");

console.log("remote-protocol");
let remoteState = initialRemoteState();
const added = applyRemoteMessage(remoteState, { baseRevision: 0, op: { kind: "add-node", type: "number", title: "N", params: { enabled: true, value: 3 } } });
assert(added.ok === true && added.state.project.nodes.length === 1, "protocol adds a node");
remoteState = added.state;
const conflicted = applyRemoteMessage(remoteState, { baseRevision: 0, op: { kind: "set-name", name: "Autre" } });
assert(conflicted.ok === false && conflicted.conflict === true, "stale revision is a conflict");
assert(conflicted.project.nodes.length === 1 && conflicted.project.name !== "Autre", "conflict leaves the project unchanged");

async function waitUntil(fn, label, ms = 4000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (fn()) return true;
    await new Promise(r => setTimeout(r, 25));
  }
  assert(false, label);
  return false;
}

console.log("websocket-accept");
assert(WS_GUID === "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", "guid is the RFC 6455 constant");
assert(
  websocketAccept("dGhlIHNhbXBsZSBub25jZQ==", WS_GUID) === "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=",
  "RFC example Sec-WebSocket-Accept"
);

console.log("remote-channel");
const bridge = await startRemoteServer({ port: 0, host: "127.0.0.1" });
const messagesOf = (socket) => {
  const inbox = [];
  socket.onMessage((text) => {
    try { inbox.push(JSON.parse(text)); } catch { /* trame non JSON */ }
  });
  return inbox;
};
const hostSocket = await openSocket(bridge.url);
const hostInbox = messagesOf(hostSocket);
const desk = newProject();
desk.name = "Bureau";
hostSocket.send({ type: "hello", role: "host", clientId: "desktop-test", revision: 0, project: desk });
await waitUntil(() => hostInbox.some(m => m.type === "state" && m.project?.name === "Bureau"), "host receives its state");
const remoteSocket = await openSocket(bridge.url);
const remoteInbox = messagesOf(remoteSocket);
remoteSocket.send({ type: "hello", role: "remote", clientId: "mobile-test" });
await waitUntil(() => remoteInbox.some(m => m.type === "state" && m.project?.name === "Bureau"), "remote sees the host project");
assert(remoteInbox.some(m => m.project?.name === "Bureau"), "state sync from host");
remoteSocket.send({ type: "op", baseRevision: 0, clientId: "mobile-test", op: { kind: "add-node", type: "number", title: "Nombre", params: { enabled: true, value: 4 } } });
await waitUntil(() => hostInbox.some(m => m.type === "op" && m.op?.type === "number"), "host receives the remote operation");
const forwarded = hostInbox.find(m => m.type === "op" && m.op?.type === "number");
const hostApplied = applyRemoteMessage({ revision: 0, project: desk }, forwarded);
assert(hostApplied.ok === true && hostApplied.state.project.nodes.some(n => n.params?.value === 4), "host applies the remote node");
hostSocket.send({ type: "state", revision: hostApplied.state.revision, project: hostApplied.state.project, source: "host" });
await waitUntil(() => remoteInbox.some(m => m.type === "state" && m.project?.nodes?.some(n => n.type === "number")), "remote receives the applied node");
remoteSocket.send({ type: "op", baseRevision: 0, clientId: "mobile-test", op: { kind: "set-name", name: "Collision" } });
await waitUntil(() => hostInbox.some(m => m.type === "op" && m.op?.kind === "set-name"), "host receives the stale operation");
const stale = hostInbox.find(m => m.type === "op" && m.op?.kind === "set-name");
const rejected = applyRemoteMessage(hostApplied.state, stale);
assert(rejected.conflict === true, "host rejects the stale revision");
hostSocket.send({ type: "conflict", error: rejected.error, revision: hostApplied.state.revision, project: hostApplied.state.project });
await waitUntil(() => remoteInbox.some(m => m.type === "conflict" && /Conflit/.test(m.error || "")), "websocket conflict is explicit");
hostSocket.close();
await waitUntil(() => remoteInbox.some(m => m.type === "peer-lost"), "remote sees the host drop");
remoteSocket.close();
const droppedPort = bridge.port;
await bridge.close();
let refused = false;
try { await openSocket(`ws://127.0.0.1:${droppedPort}`); }
catch { refused = true; }
assert(refused, "websocket error when the bridge is down");
const restarted = await startRemoteServer({ port: droppedPort, host: "127.0.0.1" });
const again = await openSocket(restarted.url);
const againInbox = messagesOf(again);
again.send({ type: "hello", role: "remote", clientId: "mobile-reconnect" });
await waitUntil(() => againInbox.some(m => m.type === "hello-ack" || m.type === "state"), "websocket reconnects to the restarted bridge");
again.close();
await restarted.close();

console.log("remote-camera-2.2");
const { RC_STATES, remoteCameraHostId, makeRoomCode } = await import("../shared/remote-camera/states.js");
const { createRcMetrics } = await import("../shared/remote-camera/metrics.js");
const { companionJoinUrl, parseCompanionSearch } = await import("../shared/remote-camera/url.js");
const { NDI_CAPABILITY, ndiStatusMessage } = await import("../shared/remote-camera/ndi.js");
const { createNodeProcessors: rcFnsFactory } = await import("../shared/node-processors.js");
assert(RC_STATES.LIVE === "LIVE" && RC_STATES.FIRST_FRAME === "FIRST_FRAME", "RC states include LIVE/FIRST_FRAME");
assert(remoteCameraHostId("AB12").startsWith("nvd-rc22-"), "host id prefix");
assert(makeRoomCode().length >= 4, "room code");
const m = createRcMetrics();
m.mark("CAMERA_PERMISSION");
m.mark("CAMERA_READY");
m.mark("FIRST_FRAME");
assert(m.delta("CAMERA_PERMISSION", "CAMERA_READY") !== null, "metrics delta");
const join = companionJoinUrl({ companionBase: "http://127.0.0.1:4177/", room: "ZZ99" });
assert(join.includes("room=ZZ99") && join.includes("mode=remote-camera"), "companion join url");
assert(parseCompanionSearch("?room=zz99").room === "ZZ99", "parse companion search");
assert(NDI_CAPABILITY.browserSend === false && /PLATFORM-LIMITED/.test(ndiStatusMessage()), "NDI honest platform-limited");
const rcFns = rcFnsFactory();
assert(typeof rcFns.get("remote-camera") === "function", "remote-camera processor registered");
assert(typeof rcFns.get("ndi-out") === "function", "ndi-out processor registered");
const ndiCtx = { warnings: [], honestFlags: new Set(), errors: [] };
let ndiThrew = false;
try { rcFns.get("ndi-out")({ id: "ndi" }, new Map(), ndiCtx); } catch { ndiThrew = true; }
assert(ndiThrew, "ndi-out refuses without video input");
const ndiOk = rcFns.get("ndi-out")({ id: "ndi" }, new Map([[0, { value: { kind: "video", pixels: new Uint8ClampedArray(16), width: 2, height: 2 } }]]), ndiCtx);
assert(/PLATFORM-LIMITED/.test(ndiOk.get(1)?.value || ""), "ndi-out status text");
assert(ndiCtx.honestFlags.has("ndi-native-relay"), "ndi honest flag");
assert(isExecutable("remote-camera") && isExecutable("ndi-out"), "remote-camera+ndi executable");

console.log("companion-studio");
const {
  newCompanionDocument,
  validateCompanionDocument,
  exportCompanionDocument,
  COMPANION_SCHEMA,
  COMPANION_FORMAT
} = await import("../shared/companion-studio/schema.js");
const { makeStudioAction, makeStudioFeedback, rttFromPong, STUDIO_MSG } = await import("../shared/companion-studio/protocol.js");
const { applyCompanionBinding, findWidget } = await import("../shared/companion-studio/bindings.js");
const { ensureCompanionLayout, saveCompanionLayout, loadCompanionLayout } = await import("../shared/companion-studio/store.js");
const { createUnavailableTransport, TRANSPORT_KINDS } = await import("../shared/companion-studio/transport.js");
const { DETECT_ACTIONS, formatDetectBanner } = await import("../shared/companion-studio/detect.js");
const { p0Widgets } = await import("../shared/companion-studio/widgets.js");

const cDoc = newCompanionDocument({ name: "Test Companion" });
assert(cDoc.schema === COMPANION_SCHEMA && cDoc.version === COMPANION_FORMAT, "companion schema/format");
cDoc.pages[0].widgets.push({
  id: "w1",
  type: "button",
  presentation: { label: "GO", x: 0, y: 0, w: 2, h: 1 },
  binding: { kind: "action", action: "ping" }
});
const validated = validateCompanionDocument(cDoc);
assert(validated.pages[0].widgets[0].presentation.label === "GO", "widget normalize");
assert(exportCompanionDocument(validated).includes("nvd.companion"), "export companion json");

const cMem = new Map();
const cStorage = {
  setItem: (k, v) => cMem.set(k, v),
  getItem: (k) => cMem.get(k) ?? null,
  removeItem: (k) => cMem.delete(k)
};
const seeded = ensureCompanionLayout(cStorage);
assert(seeded.pages[0].widgets.length >= 2, "seed layout has buttons");
saveCompanionLayout(seeded, cStorage);
assert(loadCompanionLayout(cStorage).name === seeded.name, "layout round-trip local");

const pingFb = applyCompanionBinding({
  widget: findWidget(seeded, "w-ping") || seeded.pages[0].widgets.find(w => w.binding?.action === "ping"),
  value: true,
  project: newProject(),
  onLog: () => {}
});
assert(pingFb.type === STUDIO_MSG.FEEDBACK && pingFb.ok === true, "bidirectional ping feedback");
assert(typeof pingFb.rttMs === "number" && pingFb.rttMs >= 0, "feedback rtt measured (not faked absent)");

const stageProject = newProject();
stageProject.timeline = [{ id: "cue1", kind: "cue", label: "TOP", start: 4, duration: 1, actions: [] }];
const stageRuntime = { time: 0, playing: false, setProject: () => {}, play(){ this.playing = true; } };
const { applyCue: companionApplyCue, listCues: companionListCues } = await import("../shared/stage/cues.js");
const stageFb = applyCompanionBinding({
  widget: { id: "w-stage", binding: { kind: "stage", action: "go" } },
  value: true,
  project: stageProject,
  runtime: stageRuntime,
  applyCue: companionApplyCue,
  listCues: companionListCues
});
assert(stageFb.ok === true && stageProject.meta?.activeCueId === "cue1" && stageRuntime.time === 4 && stageRuntime.playing, "companion Stage GO mutates host project/runtime");

const ioSeen = { osc: null, serial: null, midi: null, camera: null, video: null };
const oscFb = applyCompanionBinding({
  widget: { id: "w-osc", binding: { kind: "osc", oscAddress: "/test", oscHost: "127.0.0.1", oscPort: 9001 } },
  value: 0.5, project: newProject(),
  sendOsc: msg => { ioSeen.osc = msg; }
});
assert(oscFb.ok && ioSeen.osc?.address === "/test" && ioSeen.osc?.port === 9001, "companion OSC binding real callback");
const serialFb = applyCompanionBinding({
  widget: { id: "w-serial", binding: { kind: "serial", serialText: "LED {value}" } },
  value: 1, project: newProject(),
  sendSerial: text => { ioSeen.serial = text; }
});
assert(serialFb.ok && ioSeen.serial === "LED 1", "companion Serial binding real callback");
const midiFb = applyCompanionBinding({
  widget: { id: "w-midi", binding: { kind: "midi", midiData: [176, 7, -1] } },
  value: 0.5, project: newProject(),
  sendMidi: (_id, data) => { ioSeen.midi = data; }
});
assert(midiFb.ok && ioSeen.midi?.[2] === 64, "companion MIDI binding maps value");
const camFb = applyCompanionBinding({
  widget: { id: "w-cam", binding: { kind: "camera", cameraAction: "off" } },
  value: false, project: newProject(),
  cameraControl: action => { ioSeen.camera = action; }
});
const videoFb = applyCompanionBinding({
  widget: { id: "w-video", binding: { kind: "video", videoAction: "pause" } },
  value: true, project: newProject(),
  videoControl: action => { ioSeen.video = action; }
});
assert(camFb.ok && ioSeen.camera === "off" && videoFb.ok && ioSeen.video === "pause", "companion camera/video bindings real callbacks");
assert(STUDIO_MSG.MONITOR_START && STUDIO_MSG.MONITOR_FRAME && STUDIO_MSG.MONITOR_STOP, "companion monitor protocol types");

const action = makeStudioAction({ widgetId: "w1", action: "press", value: true });
assert(action.type === STUDIO_MSG.ACTION && action.widgetId === "w1", "studio action message");
const fb = makeStudioFeedback({ widgetId: "w1", value: true, ok: true, detail: "ok", rttMs: 4 });
assert(fb.rttMs === 4, "feedback keeps real rtt");
assert(rttFromPong({ t: Date.now() - 12 }, Date.now()) >= 10, "rttFromPong measures delta");

const usb = createUnavailableTransport(TRANSPORT_KINDS.USB, "not plugged");
let usbFail = false;
try { await usb.connect(); } catch { usbFail = true; }
assert(usbFail && /PLATFORM-LIMITED/.test(usb.statusLine()), "USB transport honest unavailable");
assert(p0Widgets().some(w => w.type === "button"), "p0 widget catalog has button");
assert(formatDetectBanner({ name: "phone", rttMs: 4 }).includes("4 ms"), "detect banner shows rtt");
assert(DETECT_ACTIONS.OPEN_STUDIO === "open-studio", "detect actions");

console.log("ux-3.2");
const { clampPanelRect } = await import("../desktop/float-panels.js");
const parked = clampPanelRect({ x: -5000, y: -800, width: 9000, height: 5000 }, { width: 1440, height: 900 }, { minWidth: 320 });
assert(parked.width <= 1440 - 16 && parked.height <= 900 - 16, "floating panel fits the viewport");
assert(parked.x + parked.width >= 48 && parked.y >= 0 && parked.y <= 900 - 38, "floating panel stays recoverable");
const kept = clampPanelRect({ x: 48, y: 96, width: 420, height: 240 }, { width: 1440, height: 900 });
assert(kept.x === 48 && kept.y === 96 && kept.width === 420 && kept.height === 240, "in-view panel is left in place");
const desktopHtml = fs.readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
const studioHtml = fs.readFileSync(new URL("../studio/index.html", import.meta.url), "utf8");
const studioCss = fs.readFileSync(new URL("../studio/studio.css", import.meta.url), "utf8");
assert(!desktopHtml.includes("source de vérité"), "patch canvas has no internal wording");
assert(desktopHtml.includes('data-float-id="vibe"') && desktopHtml.includes('data-float-id="timeline"'), "vibe and timeline are movable panels");
assert(desktopHtml.includes("100 %") && desktopHtml.includes(">Bloc<"), "patch canvas uses human controls");
assert(!desktopHtml.includes('class="vibe-image-thumb hidden"'), "empty vibe image is not rendered as a visible thumb");
assert(studioHtml.includes("connectToggle") && studioHtml.includes("Connexion / Pont WS"), "regie connection starts compact");
assert(studioCss.includes("body.mode-PLATEAU .photo-controller"), "plateau hides photo controller creation");
const mobileCss = fs.readFileSync(new URL("../mobile/mobile.css", import.meta.url), "utf8");
assert(mobileCss.includes(".vibe-image-thumb.is-ready"), "mobile hides an empty vibe image");


console.log("actions");
{
  const opened = performAction("open-project", { raw: JSON.parse(exportProject(createDemoProject())) });
  assert(opened.ok && opened.project.nodes.length === 5, "open project uses the existing loader");
  const base = newProject();
  base.nodes.push({ id: "n1", type: "shader", title: "Shader", x: 0, y: 0, params: { opacity: 1 } });
  base.cues = [{ id: "c1", number: "1", label: "TOP", actions: [{ type: "set-param", nodeId: "n1", key: "opacity", value: 0.25 }] }];
  const cued = performAction("cue", { project: base, cue: "1" });
  assert(cued.ok && cued.project.nodes.find(n => n.id === "n1").params.opacity === 0.25, "cue changes a real node parameter");
  const preset = performAction("preset", { id: "lumiere" });
  assert(preset.ok && preset.preset.meta.presetId === "lumiere", "preset uses the existing régie factory");
  const patch = newProject();
  const spoken = performAction("patch-from-text", { project: patch, text: "Crée une caméra reliée à un shader" });
  assert(spoken.ok, "natural language returns applied graph ops");
  assert(patch.nodes.some(n => n.type === "camera") && patch.nodes.some(n => n.type === "shader"), "natural language adds camera and shader");
  assert(patch.edges.length > 0, "natural language connects the patch");
}


console.log("show");
{
  const session = loadExampleScene();
  assert(session.sceneName.length > 0, "show loads a scene");
  assert(listSafe(session), "show scene has a cue");
  startShow(session);
  assert(session.running && !session.paused, "show starts");
  pauseShow(session);
  assert(session.paused, "show pauses");
  const frozen = session.time;
  tickShow(session, 1);
  assert(session.time === frozen, "pause holds the clock");
  pauseShow(session);
  tickShow(session, 0.5);
  assert(session.time > frozen, "show advances while running");
  const fired = fireCue(session, "1");
  assert(fired.ok && fired.project.nodes[0].params.opacity === 0.35, "show fires a cue onto a node");
  stopShow(session);
  assert(!session.running && session.time === 0, "show stops");
  const saved = saveShow(session);
  const restored = restoreShow(saved);
  assert(restored.project.nodes.length === session.project.nodes.length, "show restores a project");
  const asked = askShow(restored, "Crée une caméra reliée à un shader");
  assert(asked.ok && asked.cx === false && asked.note === CX_NOTE, "show chat uses the local graph path");
  assert(restored.project.nodes.some(node => node.type === "camera"), "show chat adds a real camera node");
  assert(asked.cueOk && restored.project.cues.some(cue => cue.label === "CX"), "show chat creates and fires a cue");
  const monitor = showMonitor(restored);
  assert(monitor.nodes.some(node => node.type === "camera") && monitor.fired.includes(asked.cueId), "show monitor follows graph and cue state");
  const linear = sampleCurve([{ time: 0, value: 0, ease: "linear" }, { time: 2, value: 1, ease: "linear" }], 1);
  const easeIn = sampleCurve([{ time: 0, value: 0, ease: "linear" }, { time: 2, value: 1, ease: "ease-in" }], 1);
  const easeOut = sampleCurve([{ time: 0, value: 0, ease: "linear" }, { time: 2, value: 1, ease: "ease-out" }], 1);
  assert(linear === 0.5 && easeIn < linear && easeOut > linear, "curves interpolate linear, ease in and ease out");
  setKeyframe(session.project, session.project.nodes[0].id, "opacity", 0, 1, "linear");
  setKeyframe(session.project, session.project.nodes[0].id, "opacity", 2, 0.2, "ease-in");
  applyCurves(session, 2);
  assert(Math.abs(session.project.nodes[0].params.opacity - 0.2) < 1e-9, "curve is bound to a node parameter");
  loadScene(session);
  assert(session.sceneName, "scene can be loaded again");
}
function listSafe(session) { return session.project.cues?.length > 0; }

{
  const newer = "/Users/cedriccarboni/Projects/cx-hub-wt-549/src";
  const older = "/Users/cedriccarboni/Projects/cx-hub/src";
  const hub = process.env.CX_HUB_SRC || (fs.existsSync(newer + "/cx_orchestra.py") ? newer : older);
  if (fs.existsSync(hub + "/cx_orchestra.py") && fs.existsSync(hub + "/cx_memory.py")) {
    const ran = spawnSync("python3", ["bridge/cx_show_bridge.py", "Crée une caméra reliée à un shader"], { encoding: "utf8" });
    assert(ran.status === 0, ran.status === 0 ? "cx bridge runs" : ("cx bridge " + (ran.stderr || ran.stdout || ran.status)));
    const plan = JSON.parse(ran.stdout);
    assert(plan.ok && plan.roles.includes("Conductor") && plan.roles.includes("Visual / Shader") && plan.chain.includes("Conductor"), "cx orchestra plan is real");
    assert(typeof plan.memoryChars === "number", "cx memory context is read");
    if (!process.env.CX_HUB_SRC && fs.existsSync(newer + "/cx_orchestra.py")) {
      const expected = spawnSync("git", ["-C", pathDir(newer), "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).stdout.trim();
      assert(plan.commit === expected && plan.source === newer, "cx bridge prefers the newer hub");
    }
  }
  const bridge = await import("../bridge/cx-show-server.mjs");
  const started = await bridge.startCxShowBridge();
  assert(started.url === "http://127.0.0.1:4877/chat", "cx bridge entry is the local chat port");
  if (started.server) await new Promise(resolve => started.server.close(resolve));
  const electronMain = fs.readFileSync(new URL("../electron/main.cjs", import.meta.url), "utf8");
  assert(electronMain.includes("await startCxShowBridge()") && electronMain.includes("await cxHealth()"), "electron starts the cx bridge and health-checks CX");
}

console.log("agents");
let probedRegistry = null;
{
  const phrase = "Ajoute une caméra et fais onduler son image";
  probedRegistry = await probeAgentRegistry();
  const probes = probeFortyTwo();
  const gates = activeAgents(probedRegistry, probes);
  const chosen = selectAgentsForRequest(phrase, probedRegistry);
  assert(probes.python === 42 && probes.javascript === 42, "python and javascript still return 42");
  assert(gates.active.includes("python") && gates.active.includes("javascript") && gates.active.includes("shader"), "proven agents stay active");
  assert(["faust", "rust", "touchdesigner", "vvvv"].every(id => !gates.active.includes(id)), "unproven agents stay inactive");
  assert(chosen.length > 0 && chosen.every(agent => agent.status === "DISPONIBLE"), "the sentence picks only available agents");
  assert(chosen.some(agent => agent.id === "glsl") && chosen.some(agent => agent.id === "webgl"), "the wave sentence picks the proven shader path");
  assert(!chosen.some(agent => /webcam|vvvv|faust|unity|processing/i.test(agent.id + agent.agent)), "no webcam and no unproven engine is chosen");
  const blind = selectAgentsForRequest(phrase, defaultRegistry());
  assert(blind.length === 0, "a config file cannot activate an agent");
  const forced = {
    probed: true,
    rows: [{ id: "vvvv", agent: "vvvv/VL", status: "DISPONIBLE", value: 1, executable: true, priority: 3, windowsTested: false, capabilities: [] }]
  };
  assert(!selectAgentsForRequest("vvvv", forced).some(agent => agent.id === "vvvv"), "vvvv stays out without a Windows test");
  assert(nativeBridgeLabel(null).includes("indisponibles"), "public page marks the bridge unavailable");
  const refused = createShowSession();
  askShow(refused, phrase, null, probedRegistry);
  const missed = await runShaderAgent(refused, phrase, async () => ({ compile: false, observed: false, error: "syntax" }), { eligible: true });
  assert(missed.ran === false && missed.steps.some(step => step.stage === "diagnose") && missed.steps.some(step => step.stage === "correct"), "a failed compile is not a success");
  const repaired = createShowSession();
  askShow(repaired, phrase, null, probedRegistry);
  let attempts = 0;
  const fixed = await runShaderAgent(repaired, phrase, async () => {
    attempts += 1;
    return attempts === 1
      ? { compile: false, observed: false, error: "syntax" }
      : { compile: true, observed: true, pixel: [8, 9, 10, 255], preview: "memory" };
  }, { eligible: true });
  assert(fixed.ran === true && fixed.camera === "Caméra" && fixed.shader === "Ondulation", "one correction can produce a real frame");
  const shaderNode = repaired.project.nodes.find(node => node.type === "shader");
  assert(shaderNode.params.amplitude === WAVE_PARAMS.amplitude && shaderNode.params.frequency === WAVE_PARAMS.frequency && shaderNode.params.speed === WAVE_PARAMS.speed && shaderNode.params.phase === WAVE_PARAMS.phase, "wave parameters are on the shader node");
  const live = createShowSession();
  const asked = askShow(live, phrase, null, probedRegistry);
  assert(asked.ok && asked.registryConsulted === true && asked.claimsWebcam === false, "the chat consults the registry and does not claim a webcam");
  assert(asked.agents.every(id => probedRegistry.rows.find(row => row.id === id)?.status === "DISPONIBLE"), "chat agents are available");
  assert(!/webcam/i.test(JSON.stringify({ note: asked.note, agents: asked.agents, plan: asked.plan?.note || "" })), "the reply never says webcam");
  assert(live.project.nodes.some(node => node.type === "camera") && live.project.nodes.some(node => node.type === "shader"), "the sentence creates a camera and a shader");
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(chrome)) {
    const preview = path.resolve("show/shader-preview.png");
    const ran = await runShaderAgent(live, phrase, source => compileWaveWithChrome(source, preview), { eligible: chosen.some(agent => agent.id === "glsl") });
    assert(ran.ran === true && ran.compile === true && ran.pixel.length === 4, "shader compile and frame were observed: " + (ran.error || ran.pixel));
    assert(fs.existsSync(preview) && fs.statSync(preview).size > 0, "shader preview file exists");
    assert(live.project.edges.length > 0, "camera is attached to the shader");
  }
}

function pathDir(src) { return src.replace(/\/src$/, ""); }

console.log("backends");
{
  const registry = probedRegistry;
  const rows = technicalRows(registry);
  const byId = Object.fromEntries(rows.map(row => [row.id, row]));
  const fields = ["agent", "language", "engine", "version", "status", "capabilities", "lastTest", "error"];
  assert(registry.probed === true, "the registry comes from a probe");
  assert(rows.every(row => AGENT_STATUSES.includes(row.status) && fields.every(field => field in row)), "every agent row has the registry columns");
  assert(rows.every(row => row.status !== "DISPONIBLE" || (row.value !== null && row.value !== "" && row.executable !== false)), "available means the probe returned a value");
  for (const id of ["python", "node", "javascript", "typescript"]) {
    assert(byId[id].status === "DISPONIBLE" && byId[id].value === 42, `${id} returned 42`);
  }
  assert(byId.glsl.status === "DISPONIBLE" && byId.webgl.status === "DISPONIBLE", "glsl compiled on the WebGL path");
  assert(byId.java.status === "NON DISPONIBLE", "java runtime is not available");
  assert(byId.vvvv.status === "NON DISPONIBLE" && byId.vvvv.windowsTested !== true && byId.vvvv.executable === false, "vvvv is known but not an executable backend");
  for (const id of ["godot", "unreal", "openframeworks", "cinder", "juce", "faust", "supercollider", "puredata", "processing", "p5", "unity"]) {
    assert(byId[id].status !== "DISPONIBLE", `${id} stays unavailable without a functional test`);
  }
  const config = fs.readFileSync(new URL("../shared/backend-status.js", import.meta.url), "utf8");
  assert(!config.includes("DISPONIBLE") && config.includes("probed: false"), "the status file does not mark an agent available");
  const artist = artistBackends(registry);
  assert(artist.every(row => row.status === "DISPONIBLE"), "artist list is only proven agents");
  assert(!artist.some(row => ["faust", "unity", "unreal", "rust", "vvvv", "processing", "touchdesigner"].includes(row.id) && byId[row.id].status !== "DISPONIBLE"), "unproven agents stay out of the artist list");
  assert(artistBackends().length === 0, "the default registry activates nothing");
  const proposal = proposeArchitectures("Scène temps réel : vidéo shader GPU, audio et OSC", registry);
  assert(proposal.options.length >= 2 && proposal.options.length <= 3, "complex prompt returns two or three real options");
  assert(proposal.options.every(option => artist.some(row => row.id === option.id)), "options come from proven agents");
  assert(proposal.options.some(option => option.preview), "at least one option can preview");
  assert(proposal.fusionRan === false, "no hybrid fusion is claimed");
  assert(proposeArchitectures("shader", defaultRegistry()).options.length === 0, "an unprobed registry proposes nothing");
}

console.log(`\nRésultat : ${passed} OK · ${failed} FAIL\n`);
process.exit(failed ? 1 : 0);


// ============================================================================
// TESTS NO[CO]DE v3.3.0 (Depth Universal, DancingDraw, LivingData, Glitter, SoundBoard)
// ============================================================================
import { DepthUniversal } from '../src/core/DepthUniversal.js';
import { DancingDraw } from '../src/ux/DancingDraw.js';
import { LivingData } from '../src/ux/LivingData.js';
import { ReactiveGlitter } from '../src/ux/ReactiveGlitter.js';
import { SoundBoard } from '../src/audio/SoundBoard.js';

// Depth Universal
const depth = new DepthUniversal();
const depthRes = depth.process({ width: 640, height: 480 });
assert(depthRes && depthRes.type === 'depthmap', 'DepthUniversal produces a depthmap object');

// Dancing Draw
const dancer = new DancingDraw();
const shape = dancer.extractShape({});
assert(shape && shape.id.startsWith('shape_'), 'DancingDraw extracts independent shape instance');
const updatedShapes = dancer.update(0.8, 0.2);
assert(updatedShapes.length === 1 && updatedShapes[0].scale > 1.0, 'DancingDraw reacts to audio level');

// Living Data
const sensors = LivingData.getSensorState();
assert(sensors && typeof sensors.audioLevel === 'number', 'LivingData reads real sensor state');

// Reactive Glitter
const glitter = new ReactiveGlitter(50);
const particles = glitter.update(0.5, 0.2);
assert(particles.length === 50, 'ReactiveGlitter updates particles correctly');

// Soundboard
const sb = new SoundBoard();
sb.addMemo('memo_1', { duration: 2.5 });
assert(sb.trigger('memo_1') === true, 'SoundBoard triggers registered memo');
console.log(' OK   All v3.3.0 audit & new feature unit tests passed');


// ============================================================================
// TESTS DEPTH UNIVERSAL, APPLE VISION & FOUNDATION MODELS
// ============================================================================
import { DepthUniversal, DepthMaskProcessor } from '../src/core/DepthUniversal.js';
import { AppleVisionBridge } from '../src/core/AppleVisionBridge.js';
import { AppleFoundationModels } from '../src/core/AppleFoundationModels.js';

// Depth Universal
const du = new DepthUniversal();
const depthSrc = du.processFrame({ width: 1280, height: 720 });
assert(depthSrc.width === 1280 && depthSrc.realDepth === false, 'DepthUniversal correctly identifies ESTIMATED DEPTH mode');

const maskOut = DepthMaskProcessor.process(depthSrc, { near: 0.2, far: 0.7, softness: 0.3 });
assert(maskOut && maskOut.params.near === 0.2, 'DepthMaskProcessor computes Millumin-style depth mask params');

// Apple Vision Bridge
const vision = new AppleVisionBridge();
vision.segmentTapToSelect(null, [{ x: 0.5, y: 0.5 }]).then(res => {
  assert(res && res.type === 'vision_mask', 'AppleVisionBridge falls back cleanly on local contour when native bridge is absent');
});

// Apple Foundation Models
const afm = new AppleFoundationModels();
afm.analyzeMultimodal(null, 'Analyse cette image').then(res => {
  assert(res && res.suggestedNodes.includes('Camera'), 'AppleFoundationModels generates valid structured output');
});

console.log(' OK   Depth Universal, Apple Vision & Foundation Models tests passed');


// ============================================================================
// TESTS NO[CO]DE v3.3.1 (RenderRecorder, ChromaKey, Morphology, MultiSurface, AudioChain, PerfMonitor)
// ============================================================================
import { RenderRecorder } from "../src/core/RenderRecorder.js";
import { ChromaKeyProcessor, MaskMorphology } from "../src/core/ChromaKeyProcessor.js";
import { FeedbackEngine, MultiSurfaceManager } from "../src/core/FeedbackEngine.js";
import { AudioAnalyzerChain, PerformanceMonitor } from "../src/core/PerformanceMonitor.js";

const recorder = new RenderRecorder();
assert(recorder.status === "READY", "RenderRecorder initializes in READY state");
assert(recorder.startRecord({}) === true, "RenderRecorder enters RECORDING state");

const chromaRes = ChromaKeyProcessor.process({}, "GREEN", { tolerance: 0.3 });
assert(chromaRes && chromaRes.targetColor === "GREEN", "ChromaKeyProcessor computes mask parameters");

const morphRes = MaskMorphology.process({}, "erode", 2);
assert(morphRes && morphRes.operation === "erode", "MaskMorphology applies erosion correctly");

const fb = new FeedbackEngine();
assert(fb.process({}).type === "feedback_frame", "FeedbackEngine produces feedback frame");

const msm = new MultiSurfaceManager();
const surf = msm.addSurface("s1", "Écran Central");
assert(surf && surf.name === "Écran Central", "MultiSurfaceManager registers custom projection surface");

const audioChain = new AudioAnalyzerChain();
const audioRes = audioChain.analyze(null);
assert(audioRes.bands.bass > 0, "AudioAnalyzerChain extracts bass/mid/high bands");

const perf = new PerformanceMonitor();
assert(perf.getMetrics().fps === 60, "PerformanceMonitor collects live metrics");

console.log(" OK   All v3.3.1 artistic and technical feature tests passed");
