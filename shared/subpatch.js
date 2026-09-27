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

export const MAX_SUBPATCH_DEPTH = 32;

/**
 * Sortie d'une boîte :
 * 1. stageio alimenté par une connexion (sortie explicite)
 * 2. vidéo shader/caméra
 * 3. dernier nombre ou vidéo produit hors entrée nue
 * 4. pass-through de l'entrée stageio
 */
export function pickSubGraphOutput(project, result, videoHit) {
  const nodes = project.nodes || [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const fed = new Set();
  for (const e of project.edges || []) {
    const n = byId.get(e.to?.node);
    if (n?.type === "stageio" && e.to?.port === 0) fed.add(n.id);
  }
  for (const n of nodes) {
    if (n.type === "stageio" && fed.has(n.id)) {
      const v = result.outputs.get(n.id)?.get(2);
      if (v) return v;
    }
  }
  if (videoHit?.value) return videoHit.value;
  const order = result.order?.length ? result.order : nodes.map(n => n.id);
  let last = null;
  for (const id of order) {
    const n = byId.get(id);
    if (!n || (n.type === "stageio" && !fed.has(n.id))) continue;
    const bag = result.outputs.get(id);
    if (!bag) continue;
    for (const [, v] of bag) {
      if (v?.kind === "number" || v?.kind === "video") last = v;
    }
  }
  if (last) return last;
  for (const n of nodes) {
    if (n.type !== "stageio") continue;
    const v = result.outputs.get(n.id)?.get(2);
    if (v) return v;
  }
  return null;
}

/**
 * Évalue un sous-graphe avec les processeurs fournis.
 * L'entrée parent est visible via ctx.subpatchIn, puis restaurée
 * pour que les boîtes imbriquées n'écrasent pas le contexte parent.
 */
export function evaluateSubGraph(graph, nodeFns, ctx, parentInputs, previousOutputs = new Map()) {
  const { evaluateGraph, findVideoOutput } = ctx._graphApi || {};
  if (!evaluateGraph) throw new Error("API graphe manquante pour sous-patch");

  const depth = (ctx._subDepth || 0) + 1;
  if (depth > MAX_SUBPATCH_DEPTH) {
    throw new Error("Profondeur maximale de sous-patch dépassée");
  }

  const project = {
    nodes: graph.nodes || [],
    edges: graph.edges || [],
    controls: ctx.controls || [],
    output: { width: ctx.width, height: ctx.height, background: ctx.background }
  };

  const savedIn = ctx.subpatchIn;
  const savedParam = ctx.subpatchParam;
  const savedDepth = ctx._subDepth;
  ctx._subDepth = depth;
  ctx.subpatchIn = parentInputs?.get(0)?.value;
  ctx.subpatchParam = parentInputs?.get(1)?.value;

  try {
    const result = evaluateGraph(project, nodeFns, ctx, previousOutputs);
    const video = findVideoOutput?.(project, result.outputs);
    const outVal = pickSubGraphOutput(project, result, video);
    return { ...result, outVal };
  } finally {
    ctx.subpatchIn = savedIn;
    ctx.subpatchParam = savedParam;
    ctx._subDepth = savedDepth;
  }
}
