/**
 * Demo projects for 2.2 — graph fixtures only (no live devices claimed CONNECTED).
 */

import { newProject } from "./ir.js";

function base(name) {
  const p = newProject();
  p.name = name;
  return p;
}

/** RemoteCamera → Blob → Threshold → Ghost → Mirror → Body Clone → Magic FX → Preview → OUTPUT */
export function createRemoteGhostDemo() {
  const p = base("Remote-Ghost-Demo");
  p.nodes = [
    { id: "n1", type: "remote-camera", title: "Remote Camera", x: 40, y: 120, params: { enabled: true, duration: 5, opacity: 1, status: "WAITING", room: "" } },
    { id: "n2", type: "blob", title: "Blob", x: 240, y: 40, params: { enabled: true, duration: 5, opacity: 1, points: 7, size: 0.22, softness: 0.65, noise: 0.18, speed: 0.6 } },
    { id: "n3", type: "threshold", title: "Threshold", x: 440, y: 40, params: { enabled: true, duration: 5, opacity: 1, threshold: 0.45, invert: false } },
    { id: "n4", type: "ghost", title: "Ghost", x: 640, y: 40, params: { enabled: true, duration: 5, opacity: 1, decay: 0.82, dx: 8, dy: 0 } },
    { id: "n5", type: "mirror", title: "Mirror", x: 840, y: 40, params: { enabled: true, duration: 5, opacity: 1, axis: "x" } },
    { id: "n6", type: "bodyclone", title: "Body Clone", x: 640, y: 200, params: { enabled: true, duration: 5, opacity: 1, threshold: 0.45, dx: 64, dy: 0 } },
    { id: "n7", type: "composite", title: "Magic FX / Composite", x: 840, y: 200, params: { enabled: true, duration: 5, opacity: 1, blend: "screen" } },
    { id: "n8", type: "transform", title: "Preview", x: 1040, y: 120, params: { enabled: true, duration: 5, opacity: 1, scale: 1, rotation: 0, dx: 0, dy: 0 } }
  ];
  p.edges = [
    { id: "e1", from: { node: "n1", port: 0 }, to: { node: "n3", port: 0 } },
    { id: "e2", from: { node: "n3", port: 0 }, to: { node: "n4", port: 0 } },
    { id: "e3", from: { node: "n4", port: 0 }, to: { node: "n5", port: 0 } },
    { id: "e4", from: { node: "n5", port: 0 }, to: { node: "n6", port: 0 } },
    { id: "e5", from: { node: "n6", port: 0 }, to: { node: "n7", port: 0 } },
    { id: "e6", from: { node: "n2", port: 0 }, to: { node: "n7", port: 1 } },
    { id: "e7", from: { node: "n7", port: 0 }, to: { node: "n8", port: 0 } }
  ];
  p.meta.demo = "remote-ghost";
  p.meta.note = "Remote Camera reste WAITING jusqu'à FIRST_FRAME réel — jamais LIVE faux.";
  return p;
}

/** Videofile (MEDIA MISSING until Relocaliser) → Magic FX chain → Preview */
export function createVideoMagicFxDemo() {
  const p = base("Video-MagicFX-Demo");
  p.nodes = [
    { id: "n1", type: "videofile", title: "Vidéo source", x: 40, y: 100, params: { enabled: true, duration: 5, opacity: 1, loop: true, srcName: "" } },
    { id: "n2", type: "threshold", title: "Threshold", x: 260, y: 40, params: { enabled: true, duration: 5, opacity: 1, threshold: 0.4 } },
    { id: "n3", type: "ghost", title: "Ghost", x: 460, y: 40, params: { enabled: true, duration: 5, opacity: 1, decay: 0.78 } },
    { id: "n4", type: "mirror", title: "Mirror", x: 660, y: 40, params: { enabled: true, duration: 5, opacity: 1, axis: "y" } },
    { id: "n5", type: "shadow", title: "Shadow", x: 460, y: 200, params: { enabled: true, duration: 5, opacity: 1, threshold: 0.45, trail: true, decay: 0.85 } },
    { id: "n6", type: "composite", title: "Magic FX", x: 860, y: 100, params: { enabled: true, duration: 5, opacity: 1, blend: "add" } },
    { id: "n7", type: "transform", title: "Preview / OUTPUT", x: 1060, y: 100, params: { enabled: true, duration: 5, opacity: 1, scale: 1 } }
  ];
  p.edges = [
    { id: "e1", from: { node: "n1", port: 0 }, to: { node: "n2", port: 0 } },
    { id: "e2", from: { node: "n2", port: 0 }, to: { node: "n3", port: 0 } },
    { id: "e3", from: { node: "n3", port: 0 }, to: { node: "n4", port: 0 } },
    { id: "e4", from: { node: "n1", port: 0 }, to: { node: "n5", port: 0 } },
    { id: "e5", from: { node: "n4", port: 0 }, to: { node: "n6", port: 0 } },
    { id: "e6", from: { node: "n5", port: 0 }, to: { node: "n6", port: 1 } },
    { id: "e7", from: { node: "n6", port: 0 }, to: { node: "n7", port: 0 } }
  ];
  p.meta.demo = "video-magicfx";
  p.meta.note = "videofile sans fichier → MEDIA MISSING + Relocaliser.";
  return p;
}

/** Stage cues + OSC map — local offline */
export function createStageOscDemo() {
  const p = base("Stage-OSC-Demo");
  p.nodes = [
    { id: "n1", type: "number", title: "Intensity", x: 40, y: 80, params: { enabled: true, duration: 5, opacity: 1, value: 0.6 } },
    { id: "n2", type: "smooth", title: "Lissage", x: 240, y: 80, params: { enabled: true, duration: 5, opacity: 1, amount: 0.2 } },
    { id: "n3", type: "osc", title: "OSC Out", x: 460, y: 80, params: { enabled: true, duration: 5, opacity: 1, host: "127.0.0.1", address: "/nvd/stage/intensity" } },
    { id: "n4", type: "boolean", title: "GO gate", x: 40, y: 220, params: { enabled: true, duration: 5, opacity: 1, value: false } },
    { id: "n5", type: "text", title: "Cue label", x: 240, y: 220, params: { enabled: true, duration: 5, opacity: 1, text: "TOP" } }
  ];
  p.edges = [
    { id: "e1", from: { node: "n1", port: 0 }, to: { node: "n2", port: 0 } },
    { id: "e2", from: { node: "n2", port: 0 }, to: { node: "n3", port: 0 } }
  ];
  p.timeline = [
    { id: "c1", kind: "cue", label: "TOP", start: 0, duration: 1, track: 0, actions: [{ type: "set-param", nodeId: "n1", key: "value", value: 1 }] },
    { id: "c2", kind: "cue", label: "FADE", start: 4, duration: 1, track: 0, actions: [{ type: "set-param", nodeId: "n1", key: "value", value: 0.2 }] }
  ];
  p.channels = [
    { id: "ch-int", name: "Stage · Intensity", nodeId: "n1", param: "value", min: 0, max: 1, step: 0.01 }
  ];
  p.meta.demo = "stage-osc";
  p.meta.note = "OSC/Stage locaux — pas de faux CONNECTED bridge.";
  return p;
}

export const DEMO_FACTORIES = Object.freeze({
  "remote-ghost": createRemoteGhostDemo,
  "video-magicfx": createVideoMagicFxDemo,
  "stage-osc": createStageOscDemo
});
