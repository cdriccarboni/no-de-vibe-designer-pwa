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
    layers: [
      { id: "layer-video-1", type: "video", name: "Vidéo", height: 30 },
      { id: "layer-effect-1", type: "effect", name: "Effets", height: 30 },
      { id: "layer-shader-1", type: "shader", name: "Shader", height: 30 },
      { id: "layer-shadow-1", type: "shadow", name: "Ombre", height: 30 },
      { id: "layer-cue-1", type: "cue", name: "Cues", height: 30 },
      { id: "layer-bridge-1", type: "bridge", name: "Liaisons", height: 30 }
    ],
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

/** Démo signature : Pointer → Rideau de fils + Ondes → Composite. Aucune permission. */
export function createDemoProject() {
  const p = newProject();
  p.name = "EXEMPLE — Wow interactif";
  p.nodes = [
    { id: "n1", type: "pointer", title: "Bouge la souris", x: 34, y: 122, params: { enabled: true, duration: 5, opacity: 1 } },
    { id: "n2", type: "threadcurtain", title: "Rideau de fils", x: 250, y: 44, params: { enabled: true, duration: 5, opacity: 1, strands: 118, force: 0.92, wave: 0.34 } },
    { id: "n3", type: "ripple", title: "Ondes lumineuses", x: 250, y: 214, params: { enabled: true, duration: 5, opacity: 1, energy: 0.82, rings: 15 } },
    { id: "n4", type: "composite", title: "Fusion WOW", x: 518, y: 126, params: { enabled: true, duration: 5, opacity: 1, blend: "screen" } },
    { id: "n5", type: "transform", title: "Sortie / Transform", x: 746, y: 126, params: { enabled: true, duration: 5, opacity: 1, scale: 1.04, rotation: 0, dx: 0, dy: 0 } }
  ];
  p.edges = [
    { id: "e1", from: { node: "n1", port: 0 }, to: { node: "n2", port: 0 } },
    { id: "e2", from: { node: "n1", port: 1 }, to: { node: "n2", port: 1 } },
    { id: "e3", from: { node: "n1", port: 2 }, to: { node: "n2", port: 2 } },
    { id: "e4", from: { node: "n1", port: 0 }, to: { node: "n3", port: 0 } },
    { id: "e5", from: { node: "n1", port: 1 }, to: { node: "n3", port: 1 } },
    { id: "e6", from: { node: "n1", port: 2 }, to: { node: "n3", port: 2 } },
    { id: "e7", from: { node: "n2", port: 3 }, to: { node: "n4", port: 0 } },
    { id: "e8", from: { node: "n3", port: 3 }, to: { node: "n4", port: 1 } },
    { id: "e9", from: { node: "n4", port: 2 }, to: { node: "n5", port: 0 } }
  ];
  p.timeline = [];
  p.controls = [];
  p.channels = [
    { id: "ch-curtain-force", name: "Rideau · Force", nodeId: "n2", param: "force", min: 0, max: 1, step: 0.01 },
    { id: "ch-ripple-energy", name: "Ondes · Énergie", nodeId: "n3", param: "energy", min: 0, max: 1, step: 0.01 }
  ];
  p.meta.demo = "wow-interactive";
  p.meta.note = "Déplace la souris dans le Preview. EXIT restaure le projet précédent.";
  return p;
}
