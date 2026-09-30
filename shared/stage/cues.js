/**
 * Cues Stage — exécution déterministe sans UI.
 * Un cue peut porter plusieurs actions (params, GO timeline, messages).
 */

export function normalizeCue(raw = {}) {
  return {
    id: raw.id || `cue_${Date.now()}`,
    label: raw.label || "Cue",
    time: Number(raw.time) || 0,
    fade: Math.max(0, Number(raw.fade) || 0),
    autoFollow: !!raw.autoFollow,
    delay: Math.max(0, Number(raw.delay) || 0),
    actions: Array.isArray(raw.actions) ? raw.actions.map(normalizeAction) : []
  };
}

function normalizeAction(action = {}) {
  const type = action.type || "set-param";
  return {
    type,
    nodeId: action.nodeId || null,
    key: action.key || null,
    value: action.value,
    address: action.address || null,
    channel: action.channel ?? null,
    universe: action.universe ?? 0
  };
}

export function listCues(project) {
  const fromTimeline = (project?.timeline || [])
    .filter(c => c.kind === "cue")
    .map(c => normalizeCue({ id: c.id, label: c.label, time: c.start, actions: c.actions || [] }));
  const explicit = (project?.cues || []).map(normalizeCue);
  const byId = new Map();
  for (const cue of [...fromTimeline, ...explicit]) byId.set(cue.id, cue);
  return [...byId.values()].sort((a, b) => a.time - b.time);
}

export function findCueIndex(cues, cueId) {
  return cues.findIndex(c => c.id === cueId);
}

/**
 * Applique un cue sur une copie du projet + effets I/O déclarés.
 * Ne ment jamais : les envois OSC/DMX sont listés, l'appelant doit les transmettre.
 */
export function applyCue(project, cue, { panic = false } = {}) {
  const next = JSON.parse(JSON.stringify(project || { nodes: [], timeline: [], cues: [] }));
  const effects = [];
  if (panic) {
    for (const node of next.nodes || []) {
      if (node.type === "audio" || node.type === "organicaudio" || node.type === "soundmemo") {
        node.params = { ...(node.params || {}), enabled: false };
      }
    }
    effects.push({ type: "panic", stopped: true });
    return { project: next, effects, cue: normalizeCue(cue || { label: "PANIC" }) };
  }
  const normalized = normalizeCue(cue);
  for (const action of normalized.actions) {
    if (action.type === "set-param" && action.nodeId && action.key) {
      const node = (next.nodes || []).find(n => n.id === action.nodeId);
      if (node) {
        node.params = { ...(node.params || {}), [action.key]: action.value };
        effects.push({ type: "set-param", nodeId: action.nodeId, key: action.key, value: action.value });
      } else {
        effects.push({ type: "error", error: `Node ${action.nodeId} introuvable pour le cue` });
      }
    } else if (action.type === "osc") {
      effects.push({ type: "osc", address: action.address || "/nvd/cue", args: [action.value] });
    } else if (action.type === "dmx" || action.type === "artnet") {
      effects.push({
        type: "artnet",
        universe: action.universe || 0,
        channel: action.channel || 1,
        value: Math.max(0, Math.min(255, Number(action.value) || 0))
      });
    } else if (action.type === "jump-time") {
      effects.push({ type: "jump-time", time: Number(action.value) || 0 });
    }
  }
  effects.push({ type: "go", cueId: normalized.id, label: normalized.label, time: normalized.time });
  return { project: next, effects, cue: normalized };
}

export function nextCue(cues, currentId) {
  if (!cues.length) return null;
  if (!currentId) return cues[0];
  const i = findCueIndex(cues, currentId);
  if (i < 0) return cues[0];
  return cues[i + 1] || null;
}

export function previousCue(cues, currentId) {
  if (!cues.length) return null;
  const i = findCueIndex(cues, currentId);
  if (i <= 0) return cues[0];
  return cues[i - 1];
}
