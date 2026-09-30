import { APP_NAME, APP_VERSION } from "./version.js";
import { isExecutable } from "./ports.js";
import { validateEdge } from "./graph-engine.js";
import { deterministicVibePlan } from "./vibe-planner.js";
import { secureVibePlan } from "./vibe-safety.js";
import { buildLocalAiPrompt, directOllamaChat, directOllamaProbe, normalizeLocalAiConfig, sanitizeLocalAiResponse, selectLocalModel } from "./local-ai-core.js";

/**
 * Vibe coding — génération structurée de patch.
 * 1) Si un endpoint IA est configuré → appel réel
 * 2) Sinon → moteur local déterministe (règles) clairement libellé
 * Jamais de faux « succès IA ».
 */

export function readAiConfig() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem("nvd.ai") || localStorage.getItem("cvd.ai") || "null") || {};
  } catch {
    raw = {};
  }
  const local = normalizeLocalAiConfig(raw);
  return {
    ...raw,
    localEnabled: local.enabled,
    localBaseUrl: local.baseUrl,
    localModel: local.model,
    localTemperature: local.temperature,
    localMaxOps: local.maxOps,
    // Cloud is opt-in. Legacy configs remain readable but are not contacted unless enabled === true.
    enabled: raw.enabled === true
  };
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
  return deterministicVibePlan(text, project);
}

function buildVibePrompt(text, project) {
  const executable = project?.nodes?.map(n => n.type) || [];
  return `Tu es le moteur Vibe de ${APP_NAME} ${APP_VERSION}.
Réponds UNIQUEMENT en JSON strict :
{"ops":[{"op":"addNode","type":"...","x":0,"y":0},{"op":"connect","fromType":"...","fromPort":0,"toType":"...","toPort":0},{"op":"setParam","type":"...","key":"...","value":0},{"op":"addClip","track":0,"start":0,"duration":1,"label":"...","kind":"effect|points|cue|shader"}],"summary":"..."}.
Utilise uniquement des nodes exécutables de No-de. N'active jamais automatiquement caméra, micro, Serial, OSC, Art-Net, Servo ou sortie externe. Toute action externe doit rester désarmée ou passer par un Trigger explicite.
Projet actuel nodes: ${JSON.stringify(project.nodes.map(n => ({ id:n.id, type:n.type })))}
Edges: ${JSON.stringify(project.edges || [])}
Instruction utilisateur: ${text}
Nodes déjà présents: ${JSON.stringify(executable)}`;
}

function parseAiOps(content, label = "IA") {
  let parsed = content;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); }
    catch { return { ok:false, unavailable:true, error:`${label} : JSON invalide` }; }
  }
  if (!parsed?.ops || !Array.isArray(parsed.ops)) {
    return { ok:false, unavailable:true, error:`${label} : réponse sans tableau ops` };
  }
  return { ok:true, ops:parsed.ops, summary:parsed.summary || "" };
}

async function callLocalAi(text, project, cfg) {
  const local = normalizeLocalAiConfig(cfg);
  if (!local.enabled) return { ok:false, unavailable:true, error:"Local AI Core désactivé" };

  const probe = await probeLocalAi(cfg);
  if (!probe.ok) return { ok:false, unavailable:true, error:probe.error || "Ollama local indisponible" };

  const model = probe.model || local.model;
  const prompt = buildLocalAiPrompt(text, project);
  try {
    const raw = typeof globalThis?.nvdDesktop?.localAiChat === "function"
      ? await globalThis.nvdDesktop.localAiChat({
          baseUrl:local.baseUrl,
          model,
          temperature:local.temperature,
          system:prompt.system,
          user:prompt.user
        })
      : await directOllamaChat({
          baseUrl:local.baseUrl,
          model,
          temperature:local.temperature,
          system:prompt.system,
          user:prompt.user
        });
    const parsed = sanitizeLocalAiResponse(raw, { maxOps:local.maxOps });
    if (!parsed.ok) return { ok:false, unavailable:true, error:parsed.error || "Réponse locale inexploitable" };
    return {
      ok:true,
      engine:"local-ai",
      ops:parsed.ops,
      summary:parsed.summary,
      note:"Local AI Core · " + model + " · OFFLINE",
      localModel:model
    };
  } catch (e) {
    return { ok:false, unavailable:true, error:"Local AI Core injoignable : " + (e?.message || e) };
  }
}

async function callRemoteAi(text, project, cfg) {
  const endpoint = (cfg.endpoint || "").trim();
  const apiKey = (cfg.apiKey || "").trim();
  const model = (cfg.model || "gpt-4o-mini").trim();
  if (!endpoint) return { ok:false, unavailable:true, error:"Aucun endpoint IA distant configuré." };
  const allowed = assertAiProviderAllowed({ endpoint, model });
  if (!allowed.ok) return { ok:false, unavailable:true, error:allowed.error };

  const headers = { "Content-Type":"application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  let res;
  try {
    res = await fetch(endpoint, {
      method:"POST",
      headers,
      body:JSON.stringify({
        model,
        temperature:0.2,
        messages:[
          { role:"system", content:"Tu génères des opérations de patch JSON sûres pour No-de Vibe Designer." },
          { role:"user", content:buildVibePrompt(text, project) }
        ],
        response_format:{ type:"json_object" }
      })
    });
  } catch (e) {
    return { ok:false, unavailable:true, error:`Moteur IA distant injoignable : ${e?.message || e}` };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok:false, unavailable:true, error:`Moteur IA HTTP ${res.status} : ${body.slice(0,200)}` };
  }
  let data;
  try { data = await res.json(); }
  catch { return { ok:false, unavailable:true, error:"Réponse IA distante non JSON" }; }

  const parsed = parseAiOps(data.choices?.[0]?.message?.content ?? data, "IA distante");
  if (!parsed.ok) return parsed;
  return { ok:true, engine:"ai", ops:parsed.ops, summary:parsed.summary, note:`IA distante · ${model}` };
}

export async function probeLocalAi(cfg = readAiConfig(), { fresh = false } = {}) {
  const local = normalizeLocalAiConfig(cfg);
  if (!local.enabled) return { ok:false, available:false, disabled:true, error:"Local AI Core désactivé", models:[] };
  try {
    const result = typeof globalThis?.nvdDesktop?.localAiProbe === "function"
      ? await globalThis.nvdDesktop.localAiProbe({ baseUrl:local.baseUrl })
      : await directOllamaProbe(local.baseUrl);
    const models = Array.isArray(result?.models) ? result.models : [];
    const model = selectLocalModel(models, local.model);
    return { ok:true, available:true, baseUrl:local.baseUrl, models, model, fresh };
  } catch (e) {
    return { ok:false, available:false, baseUrl:local.baseUrl, models:[], error:e?.message || String(e) };
  }
}

function finalizeVibeResult(result, project, source = result?.engine || "unknown") {
  const secured = secureVibePlan(project, result?.ops || [], { source });
  const securityNotes = [
    ...(secured.security?.rewrites || []),
    ...(secured.security?.dropped || []).map(x => `Refusé : ${x}`)
  ];
  return {
    ...result,
    ok: secured.ops.length > 0,
    ops: secured.ops,
    security: secured.security,
    note: [result?.note, securityNotes.length ? `Safety Engine · ${securityNotes.length} correction(s)` : "Safety Engine · OK"].filter(Boolean).join(" · ")
  };
}

export async function runVibe(text, project, { forceLocal = false } = {}) {
  const cfg = readAiConfig();
  const localGenerativeEnabled = cfg.localEnabled !== false;

  if (!forceLocal && localGenerativeEnabled) {
    const localAi = await callLocalAi(text, project, cfg);
    if (localAi.ok) return finalizeVibeResult(localAi, project, "local-ai");

    if (cfg.enabled === true && cfg.endpoint) {
      const remote = await callRemoteAi(text, project, cfg);
      if (remote.ok) {
        return finalizeVibeResult({ ...remote, localAiError: localAi.error }, project, "remote-ai");
      }
    }

    const rules = localVibeParse(text, project);
    return finalizeVibeResult({
      ok: rules.ops.length > 0,
      engine: "local-planner-fallback",
      ops: rules.ops,
      summary: rules.note,
      planner: rules.diagnostics,
      aiError: localAi.error,
      note: `IA locale indisponible — ${localAi.error} · repli Planner déterministe`,
      aiUnavailable: true
    }, project, "local-planner-fallback");
  }

  if (!forceLocal && cfg.enabled === true && cfg.endpoint) {
    const remote = await callRemoteAi(text, project, cfg);
    if (remote.ok) return finalizeVibeResult(remote, project, "remote-ai");
  }

  const local = localVibeParse(text, project);
  return finalizeVibeResult({
    ok: local.ops.length > 0,
    engine: "local-planner",
    ops: local.ops,
    summary: local.note,
    planner: local.diagnostics,
    note: "Planner local déterministe.",
    aiUnavailable: true
  }, project, "local-planner");
}

const AI_PROTECTED_EXTERNAL_TYPES = new Set(["arduino","esp","servo","dmx","osc","twozero","chataigne","millumin","touchdesigner","isadorabridge","max","pd","supercollider"]);

const ALLOWED_TYPES = new Set(["camera", "pointer", "whale", "blob", "threshold", "ghost", "mirror", "bodyclone", "shadow", "transform", "composite", "blackhole", "shader", "midi", "osc", "tracking", "stageio", "subpatch", "audio", "organicaudio", "soundmemo", "phone-camera-front", "phone-camera-back"]);

export function applyVibeOps(project, ops, helpers) {
  const { addNode, addClip, ensureEdges, nodeById } = helpers;
  const secured = secureVibePlan(project, ops || [], { source: "apply", maxOps: 64, maxNewNodes: 16 });
  const errors = [
    ...(secured.security?.dropped || []).map(x => `Safety Engine · ${x}`),
    ...(secured.security?.rewrites || []).map(x => `Safety Engine · ${x}`)
  ];
  const applied = [];
  const findByType = (type) => project.nodes.filter(n => n.type === type);

  for (const op of secured.ops) {
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
        if (AI_PROTECTED_EXTERNAL_TYPES.has(n.type) && op.key === "auto" && op.value === true) {
          errors.push(`Sécurité scène : l’IA ne peut pas armer automatiquement « ${n.title || n.type} »`);
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
