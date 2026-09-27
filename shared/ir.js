import { APP_VERSION, PROJECT_SCHEMA } from "./version.js";

export function newProject() {
  return {
    schema: PROJECT_SCHEMA,
    version: 1,
    appVersion: APP_VERSION,
    name: "Nouveau projet",
    nodes: [],
    edges: [],
    timeline: [],
    controls: [],
    resources: [],
    output: { width: 1280, height: 720, fps: 60, background: "#090b0d", name: "OUTPUT principal" },
    routing: { tracks: {} },
    devices: [],
    meta: { created: new Date().toISOString(), updated: new Date().toISOString(), appVersion: APP_VERSION }
  };
}

export function validateProject(p) {
  if (!p || (p.schema !== PROJECT_SCHEMA && p.schema !== "cvd.graph")) {
    throw new Error("Projet No-de Vibe Designer invalide");
  }
  p.schema = PROJECT_SCHEMA;
  p.nodes ||= [];
  p.edges ||= [];
  p.timeline ||= [];
  p.controls ||= [];
  p.resources ||= [];
  p.devices ||= [];
  p.output ||= { width: 1280, height: 720, fps: 60, background: "#090b0d" };
  p.meta ||= {};
  p.appVersion ||= APP_VERSION;
  return p;
}

export function exportProject(p) {
  p.meta ||= {};
  p.meta.updated = new Date().toISOString();
  p.meta.appVersion = APP_VERSION;
  p.appVersion = APP_VERSION;
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

/** Patch de démonstration P00 : caméra → shader (+ midi optionnel). */
export function createDemoProject() {
  const p = newProject();
  p.name = "Demo P00 — Caméra → Shader";
  p.nodes = [
    { id: "n1", type: "camera", title: "Caméra live", x: 40, y: 70, params: { enabled: true, duration: 5, opacity: 1 } },
    { id: "n2", type: "shader", title: "Shader Lab", x: 300, y: 140, params: { enabled: true, duration: 5, opacity: 0.9, intensity: 1 } },
    { id: "n3", type: "midi", title: "MIDI Hub", x: 40, y: 260, params: { enabled: true, duration: 5, opacity: 1, fallback: 0.4 } },
    { id: "n4", type: "osc", title: "OSC", x: 300, y: 280, params: { enabled: true, host: "bridge", address: "/nvd/cc", value: 0 } }
  ];
  p.edges = [
    { id: "e1", from: { node: "n1", port: 0 }, to: { node: "n2", port: 0 } },
    { id: "e2", from: { node: "n3", port: 1 }, to: { node: "n2", port: 1 } },
    { id: "e3", from: { node: "n3", port: 1 }, to: { node: "n4", port: 2 } }
  ];
  p.timeline = [
    { id: "c1", track: 1, start: 10, duration: 5, label: "Anim points", kind: "points" },
    { id: "c2", track: 4, start: 9, duration: 1.5, label: "Top demo", kind: "cue" }
  ];
  p.controls = [{ id: "p1", type: "point2d", x: 0.35, y: 0.45 }, { id: "p2", type: "point2d", x: 0.62, y: 0.4 }];
  return p;
}
