/**
 * Conduite Show, indépendante du Designer.
 * Les cues passent par le moteur existant. Le langage naturel passe par la couche d'actions.
 * Le graphe et les cues restent dans ce dépôt.
 * Les agents et la mémoire CX passent par le pont local, jamais par le site public.
 */
import { newProject, openProject, exportProject, createDemoProject } from "./ir.js";
import { applyCue, listCues, setCuePlayhead, advanceCuePlayhead } from "./stage/cues.js";
import { performAction } from "./action-intents.js";
import { consultAgents } from "./agent-registry.js";

export const CX_BRIDGE_URL = "http://127.0.0.1:4877/chat";
export const CX_NOTE = "Le navigateur public ne peut pas importer le moteur CX ni joindre 127.0.0.1. Les agents et la mémoire tournent seulement si le pont local est lancé sur ce Mac.";

export function createShowSession(raw) {
  const project = raw ? openProject(raw).project : newProject();
  return { project, running: false, paused: false, time: 0, sceneName: "", fired: [] };
}

export function loadExampleScene() {
  const project = createDemoProject();
  const node = project.nodes[0];
  project.cues = [{
    id: "show-cue-1",
    number: "1",
    label: "TOP",
    time: 1,
    armed: true,
    actions: [{ type: "set-param", nodeId: node.id, key: "opacity", value: 0.35 }]
  }];
  project.curves = [{
    nodeId: node.id,
    param: "opacity",
    keys: [
      { time: 0, value: 1, ease: "linear" },
      { time: 2, value: 0.2, ease: "ease-in" },
      { time: 4, value: 1, ease: "ease-out" }
    ]
  }];
  const session = createShowSession(project);
  loadScene(session);
  return session;
}

export function loadScene(session, name = "") {
  const scenes = Array.isArray(session.project.scenes) ? session.project.scenes : [];
  const scene = name ? scenes.find(item => item.name === name || item.id === name) : scenes[0];
  if (scene?.project) {
    session.project = openProject(scene.project).project;
    session.sceneName = scene.name || scene.id || session.project.name || "Scène";
  } else {
    session.sceneName = session.project.name || "Scène";
  }
  const first = listCues(session.project)[0];
  if (first) setCuePlayhead(session.project, first.id);
  session.fired = [];
  session.time = 0;
  return session.sceneName;
}

export function startShow(session) {
  session.running = true;
  session.paused = false;
  return session;
}

export function pauseShow(session) {
  session.paused = session.running ? !session.paused : false;
  return session;
}

export function stopShow(session) {
  session.running = false;
  session.paused = false;
  session.time = 0;
  session.fired = [];
  return session;
}

export function sampleCurve(keys, time) {
  if (!keys?.length) return null;
  const sorted = [...keys].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0].value;
  const last = sorted[sorted.length - 1];
  if (time >= last.time) return last.value;
  let index = 1;
  while (index < sorted.length && sorted[index].time < time) index += 1;
  const from = sorted[index - 1];
  const to = sorted[index];
  const span = to.time - from.time || 1;
  const amount = (time - from.time) / span;
  const ease = to.ease || "linear";
  const curved = ease === "ease-in" ? amount * amount
    : ease === "ease-out" ? 1 - ((1 - amount) * (1 - amount))
    : amount;
  return from.value + (to.value - from.value) * curved;
}

export function setKeyframe(project, nodeId, param, time, value, ease = "linear") {
  project.curves ||= [];
  let curve = project.curves.find(item => item.nodeId === nodeId && item.param === param);
  if (!curve) {
    curve = { nodeId, param, keys: [] };
    project.curves.push(curve);
  }
  const key = curve.keys.find(item => item.time === time);
  if (key) Object.assign(key, { value, ease });
  else curve.keys.push({ time, value, ease });
  curve.keys.sort((a, b) => a.time - b.time);
  return curve;
}

export function applyCurves(session, time = session.time) {
  const applied = [];
  for (const curve of session.project.curves || []) {
    const node = session.project.nodes.find(item => item.id === curve.nodeId);
    if (!node) continue;
    const value = sampleCurve(curve.keys, time);
    if (value == null) continue;
    node.params ||= {};
    node.params[curve.param] = value;
    applied.push({ nodeId: node.id, param: curve.param, value });
  }
  return applied;
}

export function fireCue(session, query = "") {
  const cues = listCues(session.project);
  const needle = String(query || "").trim().toLowerCase();
  const cue = needle
    ? cues.find(item => item.id === query || String(item.number) === needle || String(item.label || "").toLowerCase() === needle)
    : cues.find(item => item.id === session.project.meta?.cuePlayheadId) || cues[0];
  if (!cue) return { ok: false, error: "cue introuvable" };
  const applied = applyCue(session.project, cue);
  session.project = applied.project;
  advanceCuePlayhead(session.project, cue.id);
  session.fired = [...new Set([...(session.fired || []), cue.id])];
  const failed = applied.effects.some(effect => effect.type === "error");
  return { ok: !failed, ...applied };
}

export function tickShow(session, dt = 0) {
  if (!session.running || session.paused) return { advanced: false, fired: [] };
  session.time += Math.max(0, Number(dt) || 0);
  applyCurves(session, session.time);
  const fired = [];
  for (const cue of listCues(session.project)) {
    if (session.fired?.includes(cue.id)) continue;
    if (Number(cue.time) > session.time) continue;
    const result = fireCue(session, cue.id);
    if (result.ok) fired.push(cue.id);
  }
  return { advanced: true, fired };
}

export function saveShow(session) {
  return exportProject(session.project);
}

export function restoreShow(text) {
  const session = createShowSession(JSON.parse(text));
  session.sceneName = session.project.name || "Scène";
  return session;
}

export function showMonitor(session) {
  return {
    sceneName: session.sceneName || "",
    running: Boolean(session.running),
    paused: Boolean(session.paused),
    time: session.time,
    edges: session.project.edges?.length || 0,
    nodes: (session.project.nodes || []).map(node => ({
      id: node.id,
      type: node.type,
      title: node.title || node.type,
      opacity: Number(node.params?.opacity ?? 1)
    })),
    cues: listCues(session.project).map(cue => ({ id: cue.id, label: cue.label, time: cue.time })),
    fired: [...(session.fired || [])]
  };
}

export function askShow(session, text, cx = null, registry = null) {
  const consultation = consultAgents(text, registry);
  const before = session.project.nodes.length;
  const result = performAction("patch-from-text", { project: session.project, text });
  let cue = null;
  if (result.ok) {
    const node = session.project.nodes.at(-1);
    if (node) {
      const id = `cx-${node.id}`;
      if (!(session.project.cues || []).some(item => item.id === id)) {
        session.project.cues = [...(session.project.cues || []), {
          id,
          number: String((session.project.cues || []).length + 1),
          label: "CX",
          time: session.time,
          armed: true,
          actions: [{ type: "set-param", nodeId: node.id, key: "opacity", value: 1 }]
        }];
      }
      cue = fireCue(session, id);
    }
  }
  const linked = Boolean(cx?.ok && Array.isArray(cx.roles) && cx.roles.includes("Conductor"));
  return {
    ...result,
    added: session.project.nodes.length - before,
    cueId: cue?.cue?.id || null,
    cueOk: Boolean(cue?.ok),
    cx: linked,
    chain: linked ? cx.chain : "",
    note: [linked ? `CX ${cx.chain}` : CX_NOTE, consultation.notice].filter(Boolean).join(" · "),
    registryConsulted: consultation.consulted,
    claimsWebcam: false,
    experimental: consultation.notice || "",
    agents: consultation.agents.map(agent => agent.id)
  };
}

export function timelineRows(session) {
  const cues = listCues(session.project).map(cue => ({
    kind: "cue",
    id: cue.id,
    label: cue.label,
    time: cue.time,
    number: cue.number
  }));
  const clips = (session.project.timeline || []).map(clip => ({
    kind: clip.kind || "clip",
    id: clip.id,
    label: clip.label,
    time: clip.start,
    duration: clip.duration
  }));
  const layers = (session.project.layers || []).map(layer => ({
    kind: "layer",
    id: layer.id,
    label: layer.name,
    hidden: layer.hidden === true,
    locked: layer.locked === true,
    order: layer.order
  }));
  const curves = (session.project.curves || []).map(curve => ({
    kind: "curve",
    id: `${curve.nodeId}:${curve.param}`,
    label: `${curve.param}`,
    nodeId: curve.nodeId,
    keys: curve.keys
  }));
  return [...layers, ...cues, ...clips, ...curves];
}
