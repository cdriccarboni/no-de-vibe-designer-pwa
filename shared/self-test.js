/**
 * Auto-test boîtes imbriquées : racine → A → B → ×2 → sortie A.
 * Même scénario que l'acceptation 0.8.0, exprimé dans le graphe 0.9.x.
 */
import { evaluateGraph } from "./graph-engine.js";
import { createNodeProcessors } from "./node-processors.js";
import { evaluateSubGraph } from "./subpatch.js";

export function countGraphs(project) {
  let n = 1;
  const walk = g => {
    for (const node of g?.nodes || []) {
      if (node.type === "subpatch" && node.params?.graph) {
        n += 1;
        walk(node.params.graph);
      }
    }
  };
  walk(project);
  return n;
}

export function nestedBoxFixture() {
  const B = {
    nodes: [
      { id: "bin", type: "stageio", title: "B in", x: 40, y: 160, params: { enabled: true } },
      { id: "two", type: "number", title: "2", x: 40, y: 40, params: { enabled: true, value: 2 } },
      { id: "mul", type: "multiply", title: "× 2", x: 240, y: 80, params: { enabled: true } }
    ],
    edges: [
      { id: "be1", from: { node: "bin", port: 2 }, to: { node: "mul", port: 0 } },
      { id: "be2", from: { node: "two", port: 0 }, to: { node: "mul", port: 1 } }
    ]
  };
  const A = {
    nodes: [
      { id: "ain", type: "stageio", title: "A in", x: 40, y: 80, params: { enabled: true } },
      { id: "B", type: "subpatch", title: "B", x: 240, y: 60, params: { enabled: true, graph: B } }
    ],
    edges: [
      { id: "ae1", from: { node: "ain", port: 2 }, to: { node: "B", port: 0 } }
    ]
  };
  return {
    schema: "cvd.graph",
    version: 1,
    name: "Nested critical",
    nodes: [
      { id: "src", type: "number", title: "3", x: 40, y: 40, params: { enabled: true, value: 3 } },
      { id: "A", type: "subpatch", title: "A", x: 260, y: 40, params: { enabled: true, graph: A } }
    ],
    edges: [
      { id: "re1", from: { node: "src", port: 0 }, to: { node: "A", port: 0 } }
    ],
    output: { width: 64, height: 64, background: "#090b0d" }
  };
}

export function readSubpatchValue(project, nodeId = "A") {
  const fns = createNodeProcessors();
  const ctx = {
    time: 0,
    width: 64,
    height: 64,
    errors: [],
    warnings: [],
    honestFlags: new Set(),
    _graphApi: { evaluateGraph },
    _subpatchApi: { evaluateSubGraph }
  };
  const result = evaluateGraph(project, fns, ctx);
  const bag = result.outputs.get(nodeId);
  const value = bag?.get(2);
  const numeric = typeof value?.value === "number" ? value.value : value;
  return { numeric, errors: result.errors, warnings: result.warnings };
}

export function nestedBoxSelfTest() {
  try {
    const restored = JSON.parse(JSON.stringify(nestedBoxFixture()));
    const { numeric, errors } = readSubpatchValue(restored, "A");
    const patches = countGraphs(restored);
    const ok = numeric === 6 && patches === 3 && errors.length === 0;
    return { ok, value: numeric, patches, errors };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
