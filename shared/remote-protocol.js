/**
 * Protocole de télécommande / édition distante.
 * L'hôte (ou le pont s'il est seul) est la source de vérité.
 * Une opération dont la révision de base ne correspond pas est un conflit :
 * elle n'est pas appliquée.
 */

import { addNode, addTimelineClip, newProject, validateProject } from "./ir.js";
import { validateEdge } from "./graph-engine.js";
import { ensureSubGraph } from "./subpatch.js";\nimport { validateQuad, mappingParams } from "./graphics/mapping-v3.js";

export const REMOTE_PORT = 4174;

export function projectSignature(project) {
  return JSON.stringify({
    name: project?.name || "",
    nodes: project?.nodes || [],
    edges: project?.edges || [],
    timeline: project?.timeline || [],
    controls: project?.controls || []
  });
}

export function initialRemoteState(project) {
  const base = project ? validateProject(JSON.parse(JSON.stringify(project))) : newProject();
  return { revision: 0, project: base };
}

function fail(state, error, conflict = false) {
  return {
    ok: false,
    conflict,
    error,
    revision: state.revision,
    project: state.project
  };
}

export function applyRemoteMessage(state, msg) {
  if (!state?.project) return { ok: false, conflict: false, error: "État distant absent", revision: 0, project: null };
  if (!msg || msg.baseRevision !== state.revision) {
    return fail(
      state,
      `Conflit de révision (${msg?.baseRevision} ≠ ${state.revision})`,
      true
    );
  }
  const op = msg.op;
  if (!op || typeof op.kind !== "string") return fail(state, "Opération manquante");

  let project;
  try {
    project = JSON.parse(JSON.stringify(state.project));
  } catch (e) {
    return fail(state, e.message || "Projet illisible");
  }

  try {
    if (op.kind === "replace-project") {
      project = validateProject(JSON.parse(JSON.stringify(op.project)));
    } else if (op.kind === "set-name") {
      project.name = String(op.name || "Sans titre");
    } else if (op.kind === "add-node") {
      const n = addNode(project, op.type, op.title || op.type, op.x ?? 48, op.y ?? 48, op.params || {});
      if (op.params) n.params = { ...n.params, ...op.params };
      if (n.type === "subpatch") ensureSubGraph(n);
    } else if (op.kind === "delete-node") {
      project.nodes = (project.nodes || []).filter(n => n.id !== op.id);
      project.edges = (project.edges || []).filter(e => e.from?.node !== op.id && e.to?.node !== op.id);
    } else if (op.kind === "set-param") {
      const n = (project.nodes || []).find(item => item.id === op.id);
      if (!n) return fail(state, `Node introuvable : ${op.id}`);
      n.params = { ...(n.params || {}), [op.key]: op.value };
    } else if (op.kind === "quick-map-set") {
      let target = op.nodeId
        ? (project.nodes || []).find(n => n.id === op.nodeId && n.type === "mapping")
        : null;
      if (!target) target = (project.nodes || []).find(n => n.type === "mapping");
      if (!target) return fail(state, "Aucun node Mapping vidéo à calibrer");
      const check = validateQuad(op.params?.corners);
      if (!check.ok) return fail(state, check.errors.join(" · "));
      target.params = {
        ...(target.params || {}),
        ...mappingParams(check.quad, {
          gridCols: op.params?.grid?.cols || op.params?.gridCols || 2,
          gridRows: op.params?.grid?.rows || op.params?.gridRows || 2,
          source: op.params?.calibrationSource || "phone"
        })
      };
    } else if (op.kind === "connect") {
      const v = validateEdge(project, op.from, op.to);
      if (!v.ok) return fail(state, v.errors.join(" · "));
      project.edges = (project.edges || []).filter(e => !(e.to?.node === op.to.node && e.to?.port === op.to.port));
      const id = op.id || `e${Date.now()}`;
      project.edges.push({ id, from: op.from, to: op.to });
    } else if (op.kind === "disconnect") {
      project.edges = (project.edges || []).filter(e => e.id !== op.id);
    } else if (op.kind === "add-clip") {
      addTimelineClip(project, op.clip || {});
    } else if (op.kind === "go-cue") {
      const cues = (project.timeline || []).filter(c => c.kind === "cue");
      const cue = (project.timeline || []).find(c => c.id === op.cueId) || cues[op.index || 0];
      if (!cue) return fail(state, "Aucun cue à déclencher");
      project.meta = project.meta || {};
      project.meta.transport = { action: "go", cueId: cue.id, start: cue.start, label: cue.label || cue.id };
    } else {
      return fail(state, `Opération inconnue : ${op.kind}`);
    }
  } catch (e) {
    return fail(state, e.message || String(e));
  }

  project.meta = project.meta || {};
  project.meta.updated = new Date().toISOString();
  return { ok: true, state: { revision: state.revision + 1, project } };
}
