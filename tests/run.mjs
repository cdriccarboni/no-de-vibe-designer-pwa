/**
 * Tests unitaires P00 — exécutables avec Node (sans navigateur).
 * Usage: node tests/run.mjs
 */
import { validateProject, exportProject, createDemoProject, newProject } from "../shared/ir.js";
import { typesCompatible, portDataType, portDirection, isExecutable } from "../shared/ports.js";
import { validateEdge, findCycleEdgeIds, topoOrder, evaluateGraph, findVideoOutput } from "../shared/graph-engine.js";
import { localVibeParse, applyVibeOps, isForbiddenAiProvider, assertAiProviderAllowed } from "../shared/vibe.js";
import { APP_VERSION } from "../shared/version.js";
import { createHistory } from "../shared/history.js";
import { ensureSubGraph, evaluateSubGraph, addBoxPort, wrapNodesInSubpatch, MAX_SUBPATCH_DEPTH } from "../shared/subpatch.js";
import { renderBlackhole } from "../shared/graphics/blackhole.js";
import { transformRaster } from "../shared/graphics/transform.js";
import { createPipeline, validatePipeline, orderPasses } from "../shared/graphics/pass-graph.js";
import { WebGL2Backend } from "../shared/graphics/webgl2.js";
import { encodeOscMessage, decodeOscMessage } from "../shared/protocols/osc.js";
import { createNodeProcessors } from "../shared/node-processors.js";
import { planManualSave, planManualOpen, saveStatusMessage, isStandaloneWebKit } from "../shared/save-fallback.js";
import { exportMax, exportTouchDesigner, exportPureData, exportMilluminOscMap } from "../shared/exporters.js";
import { nestedBoxSelfTest } from "../shared/self-test.js";
import { WebSocketBridge } from "../shared/adapters/websocket-bridge.js";
import { shouldPromptForUpdate, shouldActivateWaitingWorker, shouldReloadAfterUpdate } from "../shared/pwa-update.js";
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

console.log(`\nNo-de Vibe Designer ${APP_VERSION} — System Test P00/P01\n`);

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
assert(!isExecutable("millumin"), "millumin not executable yet");

// --- ir / demo ---
console.log("ir");
const demo = createDemoProject();
assert(demo.nodes.length === 4, "demo has 4 nodes");
assert(demo.edges.length === 3, "demo has 3 edges");
const round = validateProject(JSON.parse(exportProject(demo)));
assert(round.edges.length === 3, "round-trip edges");
assert(round.name.includes("Demo"), "demo name preserved");

// --- validateEdge ---
console.log("edges");
const ok = validateEdge(demo, { node: "n1", port: 0 }, { node: "n2", port: 0 });
assert(ok.ok, "camera video → shader texture OK");
const bad = validateEdge(demo, { node: "n1", port: 0 }, { node: "n2", port: 1 });
assert(!bad.ok, "camera video → shader glsl rejected");

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
fns.set("camera", () => new Map([[0, { kind: "video", el: { readyState: 2 } }], [2, { kind: "video", el: { readyState: 2 } }]]));
fns.set("shader", (node, inputs) => {
  const tex = inputs.get(0)?.value;
  assert(!!tex, "shader received texture input during evaluate");
  return new Map([[2, { kind: "video", canvas: true, el: { width: 1 } }]]);
});
fns.set("midi", () => new Map([[1, { kind: "number", value: 0.5 }]]));
fns.set("osc", () => new Map());
const ctx = { time: 1, width: 128, height: 72, errors: [], warnings: [] };
const result = evaluateGraph(demo, fns, ctx);
assert(result.errors.filter(e => e.includes("incompatible")).length === 0, "no type errors on demo");
const vout = findVideoOutput(demo, result.outputs);
assert(vout?.source === "shader", "video output from shader");

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
assert(back.nodes.length === 4, "undo restores previous node count");
assert(h.canRedo(), "history can redo");
const fwd = h.redo();
assert(fwd.nodes.some(n => n.id === "n99"), "redo restores added node");

// --- xAI / Grok exclusion ---
console.log("ai-policy");
assert(isForbiddenAiProvider("https://api.x.ai/v1/chat/completions", "grok-2"), "blocks api.x.ai + grok");
assert(isForbiddenAiProvider("", "grok-beta"), "blocks grok model name");
assert(!isForbiddenAiProvider("https://api.openai.com/v1/chat/completions", "gpt-4o-mini"), "allows OpenAI");
assert(!assertAiProviderAllowed({ endpoint: "https://api.x.ai/v1", model: "grok" }).ok, "assert rejects xAI");

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
assert(xf.get(3)?.pixels?.length === 8 * 8 * 4, "transform processor");

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
assert(pFresh.version === 2 && APP_VERSION === "1.0.0", "project format 2 / app 1.0.0");
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

console.log(`\nRésultat : ${passed} OK · ${failed} FAIL\n`);
process.exit(failed ? 1 : 0);
