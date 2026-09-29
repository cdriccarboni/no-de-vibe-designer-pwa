/**
 * Graphe de passes GPU, indépendant du backend.
 * WebGL2 aujourd'hui, un backend WebGPU pourra consommer la même liste.
 */

export const PASS_KINDS = new Set(["source", "shader", "transform", "composite", "output"]);
export const BLEND_MODES = new Set(["normal", "add", "multiply", "screen"]);

export function createPipeline({ width = 1280, height = 720, passes = [] } = {}) {
  return {
    width: width | 0,
    height: height | 0,
    passes: passes.map(p => ({ blend: "normal", inputs: [], ...p }))
  };
}

export function validatePipeline(pipeline) {
  const errors = [];
  const passes = pipeline?.passes || [];
  const ids = new Set();
  for (const pass of passes) {
    if (!pass?.id) errors.push("Passe sans id");
    else if (ids.has(pass.id)) errors.push(`Id de passe dupliqué : ${pass.id}`);
    else ids.add(pass.id);
    if (!PASS_KINDS.has(pass?.kind)) errors.push(`Type de passe inconnu : ${pass?.kind || "?"}`);
    if (pass?.blend && !BLEND_MODES.has(pass.blend)) errors.push(`Blend inconnu : ${pass.blend}`);
  }
  for (const pass of passes) {
    for (const input of pass.inputs || []) {
      if (!ids.has(input)) errors.push(`Entrée inconnue « ${input} » pour ${pass.id}`);
    }
  }
  if (!passes.some(p => p.kind === "output")) errors.push("Passe output manquante");
  if (hasCycle(passes)) errors.push("Cycle dans le graphe de passes");
  return { ok: errors.length === 0, errors };
}

function hasCycle(passes) {
  const byId = new Map(passes.filter(p => p.id).map(p => [p.id, p]));
  const color = new Map();
  function dfs(id) {
    const state = color.get(id) || 0;
    if (state === 1) return true;
    if (state === 2) return false;
    color.set(id, 1);
    const pass = byId.get(id);
    for (const input of pass?.inputs || []) {
      if (byId.has(input) && dfs(input)) return true;
    }
    color.set(id, 2);
    return false;
  }
  return [...byId.keys()].some(id => dfs(id));
}

export function orderPasses(pipeline) {
  const check = validatePipeline(pipeline);
  if (!check.ok) {
    const err = new Error(check.errors.join(" · "));
    err.errors = check.errors;
    throw err;
  }
  const passes = pipeline.passes;
  const indeg = new Map(passes.map(p => [p.id, 0]));
  const adj = new Map(passes.map(p => [p.id, []]));
  for (const pass of passes) {
    for (const input of pass.inputs || []) {
      adj.get(input).push(pass.id);
      indeg.set(pass.id, indeg.get(pass.id) + 1);
    }
  }
  const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of adj.get(id) || []) {
      indeg.set(next, indeg.get(next) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  return order;
}

/** Cibles rtA/rtB alternées. Une passe ne lit pas le buffer qu'elle écrit. */
export function assignPingPong(passes) {
  let flip = 0;
  return passes.map(pass => {
    if (pass.kind === "output" || pass.kind === "source") return { ...pass };
    const target = flip % 2 === 0 ? "rtA" : "rtB";
    flip += 1;
    const inputs = (pass.inputs || []).map(input => input);
    return { ...pass, target, inputs };
  });
}
