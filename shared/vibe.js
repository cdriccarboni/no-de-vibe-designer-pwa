import { APP_NAME, APP_VERSION } from "./version.js";
import { isExecutable } from "./ports.js";
import { validateEdge } from "./graph-engine.js";

/**
 * Vibe coding — génération structurée de patch.
 * 1) Si un endpoint IA est configuré → appel réel
 * 2) Sinon → moteur local déterministe (règles) clairement libellé
 * Jamais de faux « succès IA ».
 */

export function readAiConfig() {
  try {
    return JSON.parse(localStorage.getItem("nvd.ai") || localStorage.getItem("cvd.ai") || "null") || {};
  } catch {
    return {};
  }
}

export function saveAiConfig(cfg) {
  localStorage.setItem("nvd.ai", JSON.stringify(cfg));
}

/** Grok / xAI explicitement exclus de No-de Vibe Designer. */
export function isForbiddenAiProvider(endpoint = "", model = "") {
  const s = `${endpoint} ${model}`.toLowerCase();
  return /(?:^|\/\/|\.)x\.ai\b/.test(s)
    || s.includes("api.x.ai")
    || s.includes("grok")
    || s.includes("xai.com")
    || /\bxai\b/.test(s);
}

export function assertAiProviderAllowed(cfg = {}) {
  if (isForbiddenAiProvider(cfg.endpoint, cfg.model)) {
    return {
      ok: false,
      error: "Grok / xAI est exclu de No-de Vibe Designer. Utilisez un endpoint OpenAI-compatible autorisé, ou le moteur local."
    };
  }
  return { ok: true };
}

function norm(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Parse local déterministe → ops IR.
 */
export function localVibeParse(text, project) {
  const t = norm(text);
  const ops = [];
  const has = (type) => project.nodes.some(n => n.type === type);

  if ((t.includes("camera") || t.includes("webcam") || /\bvideo\b/.test(t)) && !has("camera")) {
    ops.push({ op: "addNode", type: "camera", x: 40, y: 60 });
  }
  if ((t.includes("shader") || t.includes("effet") || t.includes("glsl")) && !has("shader")) {
    ops.push({ op: "addNode", type: "shader", x: 280, y: 120 });
  }
  if (t.includes("midi") && !has("midi")) {
    ops.push({ op: "addNode", type: "midi", x: 40, y: 220 });
  }
  if (/\bosc\b/.test(t) && !has("osc")) {
    ops.push({ op: "addNode", type: "osc", x: 280, y: 220 });
  }
  if ((t.includes("tracking") || t.includes("point")) && !has("tracking")) {
    ops.push({ op: "addNode", type: "tracking", x: 500, y: 60 });
  }

  const willHaveCam = has("camera") || ops.some(o => o.type === "camera");
  const willHaveShader = has("shader") || ops.some(o => o.type === "shader");
  const willHaveMidi = has("midi") || ops.some(o => o.type === "midi");
  const willHaveOsc = has("osc") || ops.some(o => o.type === "osc");

  if (willHaveCam && willHaveShader) {
    ops.push({ op: "connect", fromType: "camera", fromPort: 0, toType: "shader", toPort: 0 });
  }
  if (willHaveMidi && willHaveShader) {
    ops.push({ op: "connect", fromType: "midi", fromPort: 1, toType: "shader", toPort: 1 });
  }
  if (willHaveMidi && willHaveOsc) {
    ops.push({ op: "connect", fromType: "midi", fromPort: 1, toType: "osc", toPort: 2 });
  }

  if (t.includes("5 seconde") || t.includes("5s") || t.includes("5 sec")) {
    ops.push({ op: "addClip", track: 1, start: 12, duration: 5, label: "Anim points", kind: "points" });
  }
  if (t.includes("top") || t.includes("cue")) {
    ops.push({ op: "addClip", track: 4, start: 10, duration: 1.5, label: "Top", kind: "cue" });
  }

  if ((t.includes("demo") || t.includes("chaine") || t.includes("patch video")) && !ops.some(o => o.op === "addNode")) {
    if (!has("camera")) ops.push({ op: "addNode", type: "camera", x: 40, y: 60 });
    if (!has("shader")) ops.push({ op: "addNode", type: "shader", x: 280, y: 120 });
    ops.push({ op: "connect", fromType: "camera", fromPort: 0, toType: "shader", toPort: 0 });
  }

  return { engine: "local", ops, note: "Moteur local (règles). Pas d'appel IA." };
}

async function callRemoteAi(text, project, cfg) {
  const endpoint = (cfg.endpoint || "").trim();
  const apiKey = (cfg.apiKey || "").trim();
  const model = (cfg.model || "gpt-4o-mini").trim();
  if (!endpoint) {
    return { ok: false, unavailable: true, error: "Aucun endpoint IA configuré dans Préférences → IA / Vibe coding." };
  }
  const allowed = assertAiProviderAllowed({ endpoint, model });
  if (!allowed.ok) {
    return { ok: false, unavailable: true, error: allowed.error };
  }

  const schemaHint = `Tu es le moteur Vibe de ${APP_NAME} ${APP_VERSION}.
Réponds UNIQUEMENT en JSON: {"ops":[{"op":"addNode","type":"camera|shader|midi|osc|tracking","x":n,"y":n},{"op":"connect","fromType":"...","fromPort":0,"toType":"...","toPort":0},{"op":"setParam","type":"...","key":"...","value":...},{"op":"addClip","track":0,"start":0,"duration":1,"label":"...","kind":"effect|points|cue|shader"}],"summary":"..."}
Nodes exécutables uniquement: camera, shader, midi, osc, tracking, stageio.
Projet actuel nodes: ${JSON.stringify(project.nodes.map(n => ({ id: n.id, type: n.type })))}
edges: ${JSON.stringify(project.edges || [])}
Instruction: ${text}`;

  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: "Tu génères des opérations de patch JSON pour No-de Vibe Designer." },
          { role: "user", content: schemaHint }
        ],
        response_format: { type: "json_object" }
      })
    });
  } catch (e) {
    return { ok: false, unavailable: true, error: `Moteur IA injoignable : ${e.message || e}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, unavailable: true, error: `Moteur IA HTTP ${res.status} : ${body.slice(0, 200)}` };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, unavailable: true, error: "Réponse IA non JSON" };
  }

  let content = data.choices?.[0]?.message?.content;
  if (content == null && data.ops) content = data;
  if (typeof content === "string") {
    try { content = JSON.parse(content); } catch {
      return { ok: false, unavailable: true, error: "JSON IA invalide" };
    }
  }
  if (!content?.ops || !Array.isArray(content.ops)) {
    return { ok: false, unavailable: true, error: "Réponse IA sans tableau ops" };
  }
  return { ok: true, engine: "ai", ops: content.ops, summary: content.summary || "", note: `IA · ${model}` };
}

export async function runVibe(text, project, { forceLocal = false } = {}) {
  const cfg = readAiConfig();
  const blocked = assertAiProviderAllowed(cfg);
  if (!blocked.ok && cfg.endpoint && !forceLocal) {
    const local = localVibeParse(text, project);
    return {
      ok: local.ops.length > 0,
      engine: "local-fallback",
      ops: local.ops,
      aiError: blocked.error,
      note: `IA refusée — ${blocked.error} · moteur local uniquement`,
      aiUnavailable: true
    };
  }
  const preferAi = cfg.enabled !== false && cfg.endpoint && !forceLocal;

  if (preferAi) {
    const remote = await callRemoteAi(text, project, cfg);
    if (remote.ok) return remote;
    const local = localVibeParse(text, project);
    return {
      ok: local.ops.length > 0,
      engine: "local-fallback",
      ops: local.ops,
      summary: local.note,
      aiError: remote.error,
      note: `IA indisponible — ${remote.error} · repli moteur local`
    };
  }

  const local = localVibeParse(text, project);
  const cfgMissing = !cfg.endpoint;
  return {
    ok: local.ops.length > 0,
    engine: "local",
    ops: local.ops,
    summary: local.note,
    note: cfgMissing
      ? "Moteur local (règles). Configure un endpoint IA dans Préférences pour un appel réel."
      : "Moteur local (IA désactivée dans Préférences).",
    aiUnavailable: cfgMissing || cfg.enabled === false
  };
}

const ALLOWED_TYPES = new Set(["camera", "shader", "midi", "osc", "tracking", "stageio", "phone-camera-front", "phone-camera-back"]);

export function applyVibeOps(project, ops, helpers) {
  const { addNode, addClip, ensureEdges, nodeById } = helpers;
  const errors = [];
  const applied = [];
  const findByType = (type) => project.nodes.filter(n => n.type === type);

  for (const op of ops || []) {
    try {
      if (op.op === "addNode") {
        if (!ALLOWED_TYPES.has(op.type) && !isExecutable(op.type)) {
          errors.push(`Type de node non exécutable ignoré : ${op.type}`);
          continue;
        }
        if (project.nodes.some(n => n.type === op.type) && !op.allowDuplicate) {
          applied.push({ op: "addNode", skipped: true, type: op.type, reason: "déjà présent" });
        } else {
          const n = addNode(op.type, op.x ?? 60, op.y ?? 60);
          applied.push({ op: "addNode", id: n.id, type: op.type });
        }
      } else if (op.op === "connect") {
        ensureEdges();
        const fromNode = op.fromId ? nodeById(op.fromId) : findByType(op.fromType).at(-1);
        const toNode = op.toId ? nodeById(op.toId) : findByType(op.toType).at(-1);
        if (!fromNode || !toNode) {
          errors.push(`Connexion impossible : nodes manquants (${op.fromType || op.fromId} → ${op.toType || op.toId})`);
          continue;
        }
        const from = { node: fromNode.id, port: op.fromPort ?? 0 };
        const to = { node: toNode.id, port: op.toPort ?? 0 };
        const v = validateEdge(project, from, to);
        if (!v.ok) {
          errors.push(...v.errors);
          continue;
        }
        project.edges = project.edges.filter(x => !(x.to.node === to.node && x.to.port === to.port));
        const id = `e${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        if (!project.edges.some(x => x.from.node === from.node && x.from.port === from.port && x.to.node === to.node && x.to.port === to.port)) {
          project.edges.push({ id, from, to });
          applied.push({ op: "connect", id, from, to });
        }
      } else if (op.op === "setParam") {
        const n = op.id ? nodeById(op.id) : findByType(op.type).at(-1);
        if (!n) {
          errors.push(`setParam : node introuvable (${op.type || op.id})`);
          continue;
        }
        n.params = { ...n.params, [op.key]: op.value };
        applied.push({ op: "setParam", id: n.id, key: op.key, value: op.value });
      } else if (op.op === "addClip") {
        addClip(op.track ?? 1, op.start ?? 0, op.duration ?? 2, op.label || "Vibe", op.kind || "effect");
        applied.push({ op: "addClip", label: op.label });
      } else {
        errors.push(`Opération inconnue : ${op.op}`);
      }
    } catch (e) {
      errors.push(e.message || String(e));
    }
  }
  return { applied, errors };
}
