/**
 * No-de Vibe Designer · Cue Engine V2.2
 * Conduite linéaire inspirée des conventions éprouvées du spectacle vivant :
 * une cue "standby" est déclenchée par GO, puis le playhead avance.
 * Le moteur reste UI-agnostique et compatible avec les anciens projets.
 */

export const CUE_CONTINUE = Object.freeze({
  MANUAL: "manual",
  AUTO_CONTINUE: "auto-continue",
  AUTO_FOLLOW: "auto-follow"
});

export function normalizeCue(raw = {}, index = 0) {
  const continueMode =
    raw.continueMode ||
    (raw.autoFollow ? CUE_CONTINUE.AUTO_FOLLOW : raw.autoContinue ? CUE_CONTINUE.AUTO_CONTINUE : CUE_CONTINUE.MANUAL);

  return {
    id: raw.id || `cue_${Date.now()}_${index}`,
    number: String(raw.number ?? raw.cueNumber ?? (index + 1)),
    label: raw.label || raw.name || "Cue",
    notes: raw.notes || "",
    type: raw.type || raw.cueType || "cue",
    color: raw.color || "",
    time: Math.max(0, Number(raw.time ?? raw.start) || 0),
    preWait: Math.max(0, Number(raw.preWait ?? raw.delay) || 0),
    duration: Math.max(0, Number(raw.duration) || 0),
    postWait: Math.max(0, Number(raw.postWait) || 0),
    fade: Math.max(0, Number(raw.fade) || 0),
    continueMode,
    autoFollow: continueMode === CUE_CONTINUE.AUTO_FOLLOW,
    autoContinue: continueMode === CUE_CONTINUE.AUTO_CONTINUE,
    armed: raw.armed !== false,
    flagged: !!raw.flagged,
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
    universe: action.universe ?? 0,
    host: action.host || null,
    port: action.port ?? null,
    target: action.target || null
  };
}

export function listCues(project) {
  const fromTimeline = (project?.timeline || [])
    .filter(c => c.kind === "cue")
    .map((c, index) => normalizeCue({
      id: c.id,
      number: c.number,
      label: c.label,
      notes: c.notes,
      type: c.cueType || "cue",
      color: c.color,
      time: c.start,
      preWait: c.preWait,
      duration: c.duration,
      postWait: c.postWait,
      continueMode: c.continueMode,
      autoFollow: c.autoFollow,
      autoContinue: c.autoContinue,
      armed: c.armed,
      flagged: c.flagged,
      actions: c.actions || []
    }, index));

  const explicit = (project?.cues || []).map((c, index) => normalizeCue(c, fromTimeline.length + index));
  const byId = new Map();
  for (const cue of [...fromTimeline, ...explicit]) byId.set(cue.id, cue);

  return [...byId.values()]
    .sort((a, b) => a.time - b.time || Number(a.number) - Number(b.number))
    .map((cue, index) => ({ ...cue, order: index }));
}

export function findCueIndex(cues, cueId) {
  return cues.findIndex(c => c.id === cueId);
}

export function standingByCue(project, cues = listCues(project)) {
  if (!cues.length) return null;
  const id = project?.meta?.cuePlayheadId;
  return cues.find(c => c.id === id) || cues[0];
}

export function setCuePlayhead(project, cueId) {
  project.meta ||= {};
  const cues = listCues(project);
  const next = cues.find(c => c.id === cueId) || cues[0] || null;
  project.meta.cuePlayheadId = next?.id || null;
  return next;
}

export function advanceCuePlayhead(project, playedCueId) {
  const cues = listCues(project);
  const index = findCueIndex(cues, playedCueId);
  const next = index >= 0 ? (cues[index + 1] || null) : (cues[0] || null);
  project.meta ||= {};
  project.meta.lastCueId = playedCueId || null;
  project.meta.cuePlayheadId = next?.id || null;
  return next;
}

export function buildCueState(project, {
  activeCueIds = [],
  pausedCueIds = [],
  now = Date.now()
} = {}) {
  const cues = listCues(project);
  const standby = standingByCue(project, cues);
  const lastCueId = project?.meta?.lastCueId || project?.meta?.transport?.cueId || null;
  const active = new Set(activeCueIds);
  const paused = new Set(pausedCueIds);

  return {
    type: "cue-state",
    revision: Number(project?.meta?.cueRevision) || 0,
    projectName: project?.name || "Sans nom",
    playheadId: standby?.id || null,
    lastCueId,
    generatedAt: now,
    cues: cues.map(cue => ({
      ...cue,
      status:
        cue.id === standby?.id ? "standby" :
        paused.has(cue.id) ? "paused" :
        active.has(cue.id) ? "active" :
        cue.id === lastCueId ? "last" : "idle"
    }))
  };
}

/**
 * Applique une cue sur une copie du projet + effets I/O déclarés.
 * Les I/O externes sont retournées sous forme d'effets ; l'appelant effectue l'envoi.
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
  if (!normalized.armed) {
    effects.push({ type: "error", error: `Cue ${normalized.number} désarmée` });
    return { project: next, effects, cue: normalized };
  }

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
      effects.push({
        type: "osc",
        host: action.host || "127.0.0.1",
        port: Number(action.port) || 9000,
        address: action.address || "/nvd/cue",
        args: [action.value]
      });
    } else if (action.type === "dmx" || action.type === "artnet") {
      effects.push({
        type: "artnet",
        universe: action.universe || 0,
        channel: action.channel || 1,
        value: Math.max(0, Math.min(255, Number(action.value) || 0))
      });
    } else if (action.type === "jump-time") {
      effects.push({ type: "jump-time", time: Number(action.value) || 0 });
    } else if (action.type === "goto") {
      effects.push({ type: "goto", target: action.target || action.value || null });
    } else if (action.type === "midi") {
      effects.push({ type: "midi", value: action.value, target: action.target || null });
    } else if (action.type === "ascii") {
      effects.push({ type: "ascii", value: String(action.value ?? ""), target: action.target || null });
    }
  }

  effects.push({
    type: "go",
    cueId: normalized.id,
    number: normalized.number,
    label: normalized.label,
    time: normalized.time,
    preWait: normalized.preWait,
    duration: normalized.duration,
    postWait: normalized.postWait,
    continueMode: normalized.continueMode
  });

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
