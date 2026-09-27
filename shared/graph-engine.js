import { typesCompatible, portDataType, isExecutable } from "./ports.js";

/**
 * Moteur de graphe No-de Vibe Designer.
 * Évalue les edges, valide les types, gère les cycles (feedback = frame précédente).
 */

export function validateEdge(project, from, to) {
  const errors = [];
  if (!from || !to) return { ok: false, errors: ["Connexion incomplète"] };
  if (from.node === to.node) return { ok: false, errors: ["Impossible de connecter un node à lui-même"] };

  const src = project.nodes.find(n => n.id === from.node);
  const dst = project.nodes.find(n => n.id === to.node);
  if (!src || !dst) return { ok: false, errors: ["Node introuvable"] };

  const fromType = portDataType(src.type, from.port);
  const toType = portDataType(dst.type, to.port);
  if (!typesCompatible(fromType, toType)) {
    errors.push(`Types incompatibles : ${fromType} → ${toType} (${src.title || src.type} → ${dst.title || dst.type})`);
  }

  if (!isExecutable(dst.type)) {
    errors.push(`Le node « ${dst.title || dst.type} » n'est pas encore câblé au moteur (indisponible)`);
  }

  return { ok: errors.length === 0, errors, fromType, toType };
}

/** Détecte les edges participant à un cycle. */
export function findCycleEdgeIds(project) {
  const edges = project.edges || [];
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from.node)) adj.set(e.from.node, []);
    adj.get(e.from.node).push(e);
  }
  const cycleEdges = new Set();
  const color = new Map();
  const pathEdges = [];

  function dfs(nodeId) {
    color.set(nodeId, 1);
    for (const e of adj.get(nodeId) || []) {
      const t = e.to.node;
      const c = color.get(t) || 0;
      pathEdges.push(e);
      if (c === 1) {
        // back-edge: mark edges in the cycle portion
        cycleEdges.add(e.id);
        for (let i = pathEdges.length - 2; i >= 0; i--) {
          cycleEdges.add(pathEdges[i].id);
          if (pathEdges[i].from.node === t) break;
        }
      } else if (c === 0) {
        dfs(t);
      }
      pathEdges.pop();
    }
    color.set(nodeId, 2);
  }

  for (const n of project.nodes || []) {
    if ((color.get(n.id) || 0) === 0) dfs(n.id);
  }
  return cycleEdges;
}

export function topoOrder(project, cycleEdgeIds) {
  const edges = (project.edges || []).filter(e => !cycleEdgeIds.has(e.id));
  const indeg = new Map();
  const adj = new Map();
  for (const n of project.nodes || []) {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (!indeg.has(e.to.node) || !indeg.has(e.from.node)) continue;
    adj.get(e.from.node).push(e.to.node);
    indeg.set(e.to.node, (indeg.get(e.to.node) || 0) + 1);
  }
  const q = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const order = [];
  while (q.length) {
    const id = q.shift();
    order.push(id);
    for (const t of adj.get(id) || []) {
      indeg.set(t, indeg.get(t) - 1);
      if (indeg.get(t) === 0) q.push(t);
    }
  }
  for (const n of project.nodes || []) {
    if (!order.includes(n.id)) order.push(n.id);
  }
  return order;
}

export function collectInputs(project, nodeId, outputs, previousOutputs, cycleEdgeIds) {
  const inputs = new Map();
  for (const e of project.edges || []) {
    if (e.to.node !== nodeId) continue;
    let bag = outputs.get(e.from.node);
    if (cycleEdgeIds.has(e.id)) {
      bag = previousOutputs?.get(e.from.node) || bag;
    }
    if (!bag) continue;
    const val = bag.get(e.from.port);
    if (val !== undefined) inputs.set(e.to.port, { value: val, edgeId: e.id, from: e.from });
  }
  return inputs;
}

/**
 * Évalue le graphe une fois.
 * nodeFns: Map<type, (node, inputs, ctx) => Map<portIndex, value>>
 */
export function evaluateGraph(project, nodeFns, ctx, previousOutputs = new Map()) {
  const errors = [];
  const warnings = [];
  const cycleEdgeIds = findCycleEdgeIds(project);
  if (cycleEdgeIds.size) {
    warnings.push(`Feedback détecté (${cycleEdgeIds.size} connexion(s)) — valeurs de la frame précédente utilisées`);
  }

  for (const e of project.edges || []) {
    const src = project.nodes.find(n => n.id === e.from.node);
    const dst = project.nodes.find(n => n.id === e.to.node);
    if (!src || !dst) {
      errors.push(`Connexion orpheline ${e.id}`);
      continue;
    }
    const fromType = portDataType(src.type, e.from.port);
    const toType = portDataType(dst.type, e.to.port);
    if (!typesCompatible(fromType, toType)) {
      errors.push(`Types incompatibles : ${src.title || src.type} (${fromType}) → ${dst.title || dst.type} (${toType})`);
    }
    if (!isExecutable(dst.type) && isExecutable(src.type)) {
      warnings.push(`Signal vers « ${dst.title || dst.type} » ignoré (node indisponible)`);
    }
  }

  const order = topoOrder(project, cycleEdgeIds);
  const outputs = new Map();

  for (const nodeId of order) {
    const node = project.nodes.find(n => n.id === nodeId);
    if (!node) continue;
    if (node.params?.enabled === false) {
      outputs.set(nodeId, new Map());
      continue;
    }
    const inputs = collectInputs(project, nodeId, outputs, previousOutputs, cycleEdgeIds);
    const fn = nodeFns.get(node.type);
    if (!fn) {
      if ((project.edges || []).some(e => e.from.node === nodeId || e.to.node === nodeId)) {
        if (!isExecutable(node.type)) {
          warnings.push(`Node « ${node.title || node.type} » connecté mais moteur indisponible`);
        }
      }
      outputs.set(nodeId, new Map());
      continue;
    }
    try {
      const out = fn(node, inputs, ctx) || new Map();
      outputs.set(nodeId, out instanceof Map ? out : new Map());
    } catch (err) {
      errors.push(`${node.title || node.type} : ${err?.message || err}`);
      outputs.set(nodeId, new Map());
    }
  }

  ctx.errors = [...(ctx.errors || []), ...errors];
  ctx.warnings = [...(ctx.warnings || []), ...warnings];
  return { outputs, errors, warnings, cycleEdgeIds, order };
}

export function findVideoOutput(project, outputs) {
  for (const n of project.nodes || []) {
    if (n.type !== "shader" || n.params?.enabled === false) continue;
    const bag = outputs.get(n.id);
    const v = bag?.get(2);
    if (v && (v.kind === "video" || v.el || v.canvas)) return { node: n, value: v, source: "shader" };
  }
  for (const n of project.nodes || []) {
    if (!(n.type === "camera" || n.type === "phone-camera-front" || n.type === "phone-camera-back")) continue;
    if (n.params?.enabled === false) continue;
    const bag = outputs.get(n.id);
    const v = bag?.get(0) || bag?.get(2);
    if (v) return { node: n, value: v, source: "camera" };
  }
  return null;
}
