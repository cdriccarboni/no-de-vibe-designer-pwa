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
import { ensureSubGraph, evaluateSubGraph, MAX_SUBPATCH_DEPTH } from "../shared/subpatch.js";
import { createNodeProcessors } from "../shared/node-processors.js";
import { planManualSave, planManualOpen, saveStatusMessage, isStandaloneWebKit } from "../shared/save-fallback.js";
import { exportMax, exportTouchDesigner } from "../shared/exporters.js";
import { nestedBoxSelfTest } from "../shared/self-test.js";
import { WebSocketBridge } from "../shared/adapters/websocket-bridge.js";
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
const tdFile = path.join(os.tmpdir(), "nvd-td-export.py");
fs.writeFileSync(tdFile, td.content);
const compiled = spawnSync("python3", ["-m", "py_compile", tdFile]);
assert(compiled.status === 0, "TouchDesigner export compiles");

console.log(`\nRésultat : ${passed} OK · ${failed} FAIL\n`);
process.exit(failed ? 1 : 0);
