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
    target: action.target || null,
    elementId: action.elementId || null,
    instanceId: action.instanceId || null
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
const PANIC_AUDIO_TYPES = new Set([
  "audio", "organicaudio", "soundmemo", "audiofilter", "audiodelay", "audiofft", "phone-mic"
]);

/** Ports par défaut déjà utilisés par les nodes OSC, pas une nouvelle destination. */
const OSC_NODE_DEFAULTS = {
  osc: { port: 9000 },
  twozero: { port: 9000 },
  td: { port: 9000 },
  isadora: { port: 9000 },
  chataigne: { port: 9000 },
  millumin: { port: 5000 },
  touchdesigner: { port: 9000 },
  isadorabridge: { port: 9000 },
  max: { port: 9000 },
  pd: { port: 9000 },
  supercollider: { port: 57120 }
};

function isStopAddress(address) {
  return typeof address === "string" && /(?:^|\/)(stop|panic|blackout)(?:\/|$)/i.test(address);
}

function explicitUdpPort(value, fallback) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : fallback;
}

function explicitUdpHost(value) {
  if (typeof value !== "string") return null;
  const host = value.trim();
  if (!host || host === "bridge") return null;
  return host;
}

function remember(map, key, value) {
  if (!map.has(key)) map.set(key, value);
}

/** Univers déjà écrits sur un node DMX ou une action Art-Net. Aucun univers par défaut. */
export function configuredArtNetBlackouts(project) {
  const found = new Map();
  const add = (universe, host, port) => {
    const uni = Number(universe);
    if (!Number.isInteger(uni) || uni < 0 || uni > 32767) return;
    if (typeof host === "string" && host.trim() === "bridge") return;
    const destHost = explicitUdpHost(host) || "127.0.0.1";
    const destPort = explicitUdpPort(port, 6454);
    remember(found, `${uni}|${destHost}|${destPort}`, {
      type: "artnet-blackout",
      universe: uni,
      host: destHost,
      port: destPort,
      channels: 512
    });
  };
  for (const node of project?.nodes || []) {
    if (node?.type !== "dmx") continue;
    if (node.params?.transport === "bridge") continue;
    const universe = node.params?.universe;
    if (universe == null || universe === "") continue;
    add(universe, node.params?.host, node.params?.port);
  }
  for (const cue of [...(project?.timeline || []), ...(project?.cues || [])]) {
    for (const action of cue?.actions || []) {
      if (action?.type !== "dmx" && action?.type !== "artnet") continue;
      if (action.universe == null || action.universe === "") continue;
      add(action.universe, action.host, action.port);
    }
  }
  return [...found.values()];
}

/**
 * Message OSC d'arrêt seulement s'il est déjà déclaré (node, cue ou layout).
 * Un node OSC sans hôte UDP reste sur la passerelle WebSocket : pas d'invention.
 */
export function configuredOscStops(project, layout = null) {
  const found = new Map();
  const add = (address, host, port, args) => {
    if (!isStopAddress(address)) return;
    const destHost = explicitUdpHost(host);
    if (!destHost) return;
    const destPort = explicitUdpPort(port, 9000);
    const packetArgs = Array.isArray(args) ? args : [];
    remember(found, `${destHost}|${destPort}|${address}|${JSON.stringify(packetArgs)}`, {
      type: "osc-stop",
      host: destHost,
      port: destPort,
      address,
      args: packetArgs
    });
  };
  for (const node of project?.nodes || []) {
    const defaults = OSC_NODE_DEFAULTS[node?.type];
    if (!defaults) continue;
    const rawHost = node.params?.host;
    if (typeof rawHost === "string" && rawHost.trim() === "bridge") continue;
    const host = node.type === "osc" ? rawHost : (explicitUdpHost(rawHost) || "127.0.0.1");
    const value = node.params?.value;
    add(node.params?.address, host, node.params?.port ?? defaults.port, value == null ? [] : [value]);
  }
  for (const cue of [...(project?.timeline || []), ...(project?.cues || [])]) {
    for (const action of cue?.actions || []) {
      if (action?.type !== "osc") continue;
      if (typeof action.host === "string" && action.host.trim() === "bridge") continue;
      const args = Array.isArray(action.args) ? action.args : (action.value == null ? [] : [action.value]);
      add(action.address, explicitUdpHost(action.host) || "127.0.0.1", action.port, args);
    }
  }
  for (const page of layout?.pages || []) {
    for (const widget of page?.widgets || []) {
      const binding = widget?.binding || {};
      if (binding.kind !== "osc") continue;
      if (typeof binding.oscHost === "string" && binding.oscHost.trim() === "bridge") continue;
      add(
        binding.oscAddress,
        explicitUdpHost(binding.oscHost) || "127.0.0.1",
        binding.oscPort,
        binding.value == null ? [] : [binding.value]
      );
    }
  }
  return [...found.values()];
}

export async function dispatchPanicEffects(effects, { sendOsc, sendArtNet } = {}) {
  const results = [];
  for (const effect of effects || []) {
    if (effect?.type === "artnet-blackout") {
      if (typeof sendArtNet !== "function") {
        results.push({
          kind: "artnet",
          sent: false,
          universe: effect.universe,
          host: effect.host,
          port: effect.port,
          reason: "bridge absent"
        });
        continue;
      }
      const data = new Uint8Array(512);
      try {
        const result = await sendArtNet({
          host: effect.host,
          port: effect.port,
          universe: effect.universe,
          data
        });
        results.push({
          kind: "artnet",
          sent: true,
          universe: effect.universe,
          host: result?.host || effect.host,
          port: result?.port || effect.port,
          bytes: result?.bytes ?? null
        });
      } catch (error) {
        results.push({
          kind: "artnet",
          sent: false,
          universe: effect.universe,
          host: effect.host,
          port: effect.port,
          reason: error?.message || String(error)
        });
      }
    } else if (effect?.type === "osc-stop") {
      if (typeof sendOsc !== "function") {
        results.push({
          kind: "osc",
          sent: false,
          address: effect.address,
          host: effect.host,
          port: effect.port,
          reason: "bridge absent"
        });
        continue;
      }
      try {
        const result = await sendOsc({
          host: effect.host,
          port: effect.port,
          address: effect.address,
          args: effect.args || []
        });
        results.push({
          kind: "osc",
          sent: true,
          address: effect.address,
          host: result?.host || effect.host,
          port: result?.port || effect.port,
          bytes: result?.bytes ?? null
        });
      } catch (error) {
        results.push({
          kind: "osc",
          sent: false,
          address: effect.address,
          host: effect.host,
          port: effect.port,
          reason: error?.message || String(error)
        });
      }
    }
  }
  return results;
}

export function formatPanicResult(effects, results) {
  const lines = ["PANIC · audio du projet coupé · lecture arrêtée"];
  const artnet = (effects || []).filter(effect => effect.type === "artnet-blackout");
  const osc = (effects || []).filter(effect => effect.type === "osc-stop");
  if (!artnet.length) lines.push("PANIC · aucun univers Art-Net configuré · blackout non envoyé");
  if (!osc.length) lines.push("PANIC · aucun message OSC d'arrêt prévu par le protocole · OSC non envoyé");
  for (const result of results || []) {
    if (result.kind === "artnet" && result.sent) {
      lines.push(`PANIC · Art-Net blackout univers ${result.universe} → ${result.host}:${result.port} · 512 canaux à 0`);
    } else if (result.kind === "artnet") {
      lines.push(`PANIC · Art-Net univers ${result.universe} non envoyé · ${result.reason}`);
    } else if (result.kind === "osc" && result.sent) {
      lines.push(`PANIC · OSC ${result.address} → ${result.host}:${result.port}`);
    } else if (result.kind === "osc") {
      lines.push(`PANIC · OSC ${result.address || "arrêt"} non envoyé · ${result.reason}`);
    }
  }
  lines.push("PANIC · non coupé : NDI, MIDI matériel, projecteur, sACN, caméra, série");
  return lines;
}

export function applyCue(project, cue, { panic = false, layout = null } = {}) {
  const next = JSON.parse(JSON.stringify(project || { nodes: [], timeline: [], cues: [] }));
  const effects = [];

  if (panic) {
    for (const node of next.nodes || []) {
      if (PANIC_AUDIO_TYPES.has(node.type)) {
        node.params = { ...(node.params || {}), enabled: false };
      }
    }
    effects.push({ type: "panic", stopped: true, repeatable: true });
    effects.push(...configuredArtNetBlackouts(next));
    effects.push(...configuredOscStops(next, layout));
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
    } else if (action.type === "element-instance") {
      const instance = (next.timeline || []).find(item => item?.id === action.instanceId && item?.elementId === action.elementId);
      if (!instance) effects.push({ type: "error", error: `Instance d’Élément ${action.instanceId || action.elementId || "inconnue"} introuvable pour le cue` });
      else {
        next.meta ||= {};
        next.meta.activeElementInstanceId = instance.id;
        effects.push({ type:"element-instance", instanceId:instance.id, elementId:instance.elementId, snapshot:instance.snapshot || {} });
      }
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
