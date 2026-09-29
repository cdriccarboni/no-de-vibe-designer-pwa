import { APP_VERSION, PROJECT_FORMAT, PROJECT_SCHEMA } from "./version.js";
import { migrateProject } from "./project-migrate.js";

export function newProject() {
  return {
    schema: PROJECT_SCHEMA,
    version: PROJECT_FORMAT,
    appVersion: APP_VERSION,
    name: "Nouveau projet",
    nodes: [],
    edges: [],
    timeline: [],
    controls: [],
    channels: [],
    resources: [],
    output: { width: 1280, height: 720, fps: 60, background: "#090b0d", name: "OUTPUT principal" },
    routing: { tracks: {} },
    devices: [],
    meta: { created: new Date().toISOString(), updated: new Date().toISOString(), appVersion: APP_VERSION }
  };
}

export function validateProject(p) {
  const { project } = migrateProject(p, { keepOriginal: false });
  // Mutate caller's object for legacy desktop callers that reuse the same ref
  Object.keys(project).forEach((k) => { p[k] = project[k]; });
  Object.keys(p).forEach((k) => { if (!(k in project)) delete p[k]; });
  return p;
}

/** Validate + keep original snapshot (migration N→N+1 without silent overwrite). */
export function openProject(raw) {
  return migrateProject(raw, { keepOriginal: true });
}

export function exportProject(p) {
  p.meta ||= {};
  p.meta.updated = new Date().toISOString();
  p.meta.appVersion = APP_VERSION;
  p.appVersion = APP_VERSION;
  p.version = PROJECT_FORMAT;
  return JSON.stringify(p, null, 2);
}

export function nodeById(project, id) {
  return project.nodes.find(n => n.id === id);
}

export function addNode(project, type, title, x = 0, y = 0, params = {}) {
  const seq = (project.nodes.reduce((m, n) => Math.max(m, parseInt(String(n.id).replace(/\D/g, "")) || 0), 0) + 1);
  const node = { id: `n${seq}`, type, title, x, y, params: { enabled: true, duration: 5, opacity: 1, ...params } };
  project.nodes.push(node);
  return node;
}

export function addTimelineClip(project, clip) {
  const seq = (project.timeline.reduce((m, c) => Math.max(m, parseInt(String(c.id).replace(/\D/g, "")) || 0), 0) + 1);
  const value = { id: `c${seq}`, track: 0, start: 0, duration: 1, label: "Clip", kind: "effect", ...clip };
  project.timeline.push(value);
  return value;
}

/** Démo signature : Pointer → lissages → Baleine → Transform. Aucune permission. */
export function createDemoProject() {
  const p = newProject();
  p.name = "Démo — Baleine interactive";
  p.nodes = [
    { id: "n1", type: "pointer", title: "Pointer / Souris", x: 38, y: 74, params: { enabled: true, duration: 5, opacity: 1 } },
    { id: "n2", type: "smooth", title: "Lissage X", x: 230, y: 54, params: { enabled: true, duration: 5, opacity: 1, amount: 0.11 } },
    { id: "n3", type: "smooth", title: "Lissage Y", x: 230, y: 170, params: { enabled: true, duration: 5, opacity: 1, amount: 0.09 } },
    { id: "n4", type: "whale", title: "Baleine interactive", x: 438, y: 96, params: { enabled: true, duration: 5, opacity: 1, scale: 1, trail: 0.18, breathe: 0.035 } },
    { id: "n5", type: "transform", title: "Transform", x: 676, y: 108, params: { enabled: true, duration: 5, opacity: 1, scale: 1, rotation: 0, dx: 0, dy: 0 } }
  ];
  p.edges = [
    { id: "e1", from: { node: "n1", port: 0 }, to: { node: "n2", port: 0 } },
    { id: "e2", from: { node: "n1", port: 1 }, to: { node: "n3", port: 0 } },
    { id: "e3", from: { node: "n2", port: 1 }, to: { node: "n4", port: 0 } },
    { id: "e4", from: { node: "n3", port: 1 }, to: { node: "n4", port: 1 } },
    { id: "e5", from: { node: "n1", port: 2 }, to: { node: "n4", port: 2 } },
    { id: "e6", from: { node: "n4", port: 3 }, to: { node: "n5", port: 0 } }
  ];
  p.timeline = [];
  p.controls = [];
  p.channels = [
    { id: "ch-whale-scale", name: "Baleine · Échelle", nodeId: "n4", param: "scale", min: 0.5, max: 1.8, step: 0.01 },
    { id: "ch-whale-trail", name: "Baleine · Traînée", nodeId: "n4", param: "trail", min: 0, max: 0.7, step: 0.01 }
  ];
  return p;
}
