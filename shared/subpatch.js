/**
 * Sous-patches — graphe imbriqué sérialisable.
 * Un node `subpatch` contient params.graph = { nodes, edges }.
 */

/** Ports proxy du sous-patch au niveau parent. */
export const SUBPATCH_PORTS = [
  { name: "in", dir: "in", data: "any" },
  { name: "params", dir: "in", data: "number" },
  { name: "out", dir: "out", data: "any" }
];

export const MAX_SUBPATCH_DEPTH = 32;

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Ajoute un port parent et le node interne box-in / box-out correspondant. */
export function addBoxPort(node, direction, name, dataType = "any") {
  ensureSubGraph(node);
  if (!Array.isArray(node.params.ports) || !node.params.ports.length) {
    node.params.ports = SUBPATCH_PORTS.map(p => ({ ...p }));
  }
  const dir = direction === "out" || direction === "output" ? "out" : "in";
  const port = { name: String(name || (dir === "in" ? "In" : "Out")), dir, data: dataType || "any" };
  node.params.ports.push(port);
  const index = node.params.ports.length - 1;
  const nodeId = `${dir === "in" ? "bin" : "bout"}_${index}`;
  node.params.graph.nodes.push({
    id: nodeId,
    type: dir === "in" ? "box-in" : "box-out",
    title: port.name,
    x: dir === "in" ? 24 : 420,
    y: 36 + index * 72,
    params: { enabled: true, portIndex: index, data: port.data }
  });
  return { port, index, nodeId };
}

/**
 * Enveloppe une sélection dans un sous-patch cvd.graph.
 * Les câbles qui traversent la frontière deviennent des ports de boîte.
 */
export function wrapNodesInSubpatch(graph, nodeIds, name = "Boîte") {
  const ids = new Set(nodeIds || []);
  if (!ids.size) throw new Error("Sélection vide");
  const nodes = graph.nodes || [];
  const selected = nodes.filter(n => ids.has(n.id));
  if (selected.length !== ids.size) throw new Error("Node de la sélection introuvable");
  const edges = graph.edges || [];
  const seq = nodes.reduce((m, n) => Math.max(m, parseInt(String(n.id).replace(/\D/g, ""), 10) || 0), 0) + 1;
  const box = {
    id: `n${seq}`,
    type: "subpatch",
    title: name,
    x: Math.round(selected.reduce((s, n) => s + (n.x || 0), 0) / selected.length),
    y: Math.round(selected.reduce((s, n) => s + (n.y || 0), 0) / selected.length),
    params: {
      enabled: true,
      opacity: 1,
      graph: {
        nodes: selected.map(clone),
        edges: edges.filter(e => ids.has(e.from?.node) && ids.has(e.to?.node)).map(clone)
      },
      ports: SUBPATCH_PORTS.map(p => ({ ...p }))
    }
  };
  const parentEdges = [];
  edges.filter(e => !ids.has(e.from?.node) && ids.has(e.to?.node)).forEach((e, i) => {
    const added = addBoxPort(box, "in", `In ${i + 1}`, "any");
    box.params.graph.edges.push({
      id: `wrap-in-${i}`,
      from: { node: added.nodeId, port: 0 },
      to: { ...e.to }
    });
    parentEdges.push({ id: `wrap-pe-in-${i}`, from: { ...e.from }, to: { node: box.id, port: added.index } });
  });
  edges.filter(e => ids.has(e.from?.node) && !ids.has(e.to?.node)).forEach((e, i) => {
    const added = addBoxPort(box, "out", `Out ${i + 1}`, "any");
    box.params.graph.edges.push({
      id: `wrap-out-${i}`,
      from: { ...e.from },
      to: { node: added.nodeId, port: 0 }
    });
    parentEdges.push({ id: `wrap-pe-out-${i}`, from: { node: box.id, port: added.index }, to: { ...e.to } });
  });
  graph.nodes = nodes.filter(n => !ids.has(n.id));
  graph.nodes.push(box);
  graph.edges = edges
    .filter(e => !ids.has(e.from?.node) && !ids.has(e.to?.node))
    .concat(parentEdges);
  return box;
}

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
  const savedInputs = ctx.subpatchInputs;
  const savedOutputs = ctx.subpatchOutputs;
  const savedDepth = ctx._subDepth;
  ctx._subDepth = depth;
  ctx.subpatchInputs = parentInputs || new Map();
  ctx.subpatchOutputs = new Map();
  ctx.subpatchIn = parentInputs?.get(0)?.value;
  ctx.subpatchParam = parentInputs?.get(1)?.value;

  try {
    const result = evaluateGraph(project, nodeFns, ctx, previousOutputs);
    const video = findVideoOutput?.(project, result.outputs);
    const outVal = pickSubGraphOutput(project, result, video);
    return { ...result, outVal, boxOutputs: ctx.subpatchOutputs };
  } finally {
    ctx.subpatchIn = savedIn;
    ctx.subpatchParam = savedParam;
    ctx.subpatchInputs = savedInputs;
    ctx.subpatchOutputs = savedOutputs;
    ctx._subDepth = savedDepth;
  }
}
