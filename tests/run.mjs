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
assert(!isExecutable("audio"), "audio not executable yet");

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

console.log(`\nRésultat : ${passed} OK · ${failed} FAIL\n`);
process.exit(failed ? 1 : 0);
