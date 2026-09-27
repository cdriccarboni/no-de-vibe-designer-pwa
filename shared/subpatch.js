/**
 * Sous-patches — graphe imbriqué sérialisable.
 * Un node `subpatch` contient params.graph = { nodes, edges }.
 */

export function emptySubGraph() {
  return { nodes: [], edges: [] };
}

export function ensureSubGraph(node) {
  node.params ||= {};
  if (!node.params.graph || typeof node.params.graph !== "object") {
    node.params.graph = emptySubGraph();
  }
  node.params.graph.nodes ||= [];
  node.params.graph.edges ||= [];
  return node.params.graph;
}

/** Ports proxy du sous-patch au niveau parent. */
export const SUBPATCH_PORTS = [
  { name: "in", dir: "in", data: "any" },
  { name: "params", dir: "in", data: "number" },
  { name: "out", dir: "out", data: "any" }
];

/**
 * Évalue un sous-graphe avec les processeurs fournis.
 * Injecte l'entrée parent sur tous les nodes `stageio` / premiers ports libres.
 */
export function evaluateSubGraph(graph, nodeFns, ctx, parentInputs, previousOutputs = new Map()) {
  // Import dynamique évité : l'appelant passe evaluateGraph
  const { evaluateGraph, findVideoOutput } = ctx._graphApi || {};
  if (!evaluateGraph) throw new Error("API graphe manquante pour sous-patch");

  const project = {
    nodes: graph.nodes || [],
    edges: graph.edges || [],
    controls: ctx.controls || [],
    output: { width: ctx.width, height: ctx.height, background: ctx.background }
  };

  // Inject parent input into first stageio or first executable sink via synthetic bus
  ctx.subpatchIn = parentInputs?.get(0)?.value;
  ctx.subpatchParam = parentInputs?.get(1)?.value;

  const result = evaluateGraph(project, nodeFns, ctx, previousOutputs);
  const video = findVideoOutput?.(project, result.outputs);
  let outVal = video?.value || null;

  // Prefer explicit stageio out if present
  for (const n of project.nodes) {
    if (n.type !== "stageio") continue;
    const bag = result.outputs.get(n.id);
    const v = bag?.get(2);
    if (v) { outVal = v; break; }
  }

  // Fallback: last number from midi/audio/tracking
  if (!outVal) {
    for (const [, bag] of result.outputs) {
      for (const [, v] of bag) {
        if (v?.kind === "number" || v?.kind === "video") outVal = v;
      }
    }
  }

  return { ...result, outVal };
}
