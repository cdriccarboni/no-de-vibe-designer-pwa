import { NODE_GROUPS } from "./node-specs.js";
import { isExecutable } from "./ports.js";
import { assessLocalModels, classifyLocalAiFailure, factsFromLocalAiError, LOCAL_AI_PROBE_TIMEOUT_MS } from "./local-ai-diagnostic.js";

export { LOCAL_AI_PROBE_TIMEOUT_MS, assessLocalModels, classifyLocalAiFailure };

export const LOCAL_AI_DEFAULTS = Object.freeze({
  enabled: true,
  baseUrl: "http://127.0.0.1:11434",
  model: "qwen2.5-coder:7b",
  secondaryModel: "gemma3:1b",
  parallel: true,
  temperature: 0.15,
  maxOps: 64,
  remoteFallback: false
});

export function normalizeLocalAiConfig(raw = {}) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const legacyEndpoint = typeof cfg.localEndpoint === "string" ? cfg.localEndpoint : "";
  return {
    enabled: cfg.localEnabled !== false,
    baseUrl: String(cfg.localBaseUrl || legacyEndpoint || LOCAL_AI_DEFAULTS.baseUrl).replace(/\/+$/, ""),
    model: String(cfg.localModel || LOCAL_AI_DEFAULTS.model).trim() || LOCAL_AI_DEFAULTS.model,
    secondaryModel: String(cfg.localSecondaryModel || LOCAL_AI_DEFAULTS.secondaryModel).trim() || LOCAL_AI_DEFAULTS.secondaryModel,
    parallel: cfg.localParallel !== false,
    temperature: Math.max(0, Math.min(1, Number(cfg.localTemperature ?? LOCAL_AI_DEFAULTS.temperature))),
    maxOps: Math.max(1, Math.min(128, Number(cfg.localMaxOps ?? LOCAL_AI_DEFAULTS.maxOps) || LOCAL_AI_DEFAULTS.maxOps)),
    remoteFallback: cfg.remoteFallback === true,
    agents: Array.isArray(cfg.localAgents) ? cfg.localAgents : []
  };
}

export function isTrustedLocalAiUrl(raw = "") {
  try {
    const url = new URL(String(raw || LOCAL_AI_DEFAULTS.baseUrl));
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (["127.0.0.1", "localhost", "::1"].includes(host)) return true;
    if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
    const m = host.match(/^172\.(\d+)\./);
    return !!m && Number(m[1]) >= 16 && Number(m[1]) <= 31;
  } catch {
    return false;
  }
}

export const isLoopbackLocalAiUrl = isTrustedLocalAiUrl;

export function modelNamesFromTags(payload = {}) {
  const models = Array.isArray(payload?.models) ? payload.models : [];
  return models.map(m => String(m?.name || m?.model || "").trim()).filter(Boolean);
}

export function selectLocalModel(names = [], preferred = LOCAL_AI_DEFAULTS.model) {
  const list = [...new Set((names || []).map(String).filter(Boolean))];
  if (!list.length) return preferred;
  if (list.includes(preferred)) return preferred;
  const noTag = String(preferred).split(":")[0];
  const same = list.find(n => n === noTag || n.startsWith(noTag + ":"));
  if (same) return same;
  const ranked = list.map(name => {
    const n = name.toLowerCase();
    let score = 0;
    if (n.includes("qwen")) score += 50;
    if (n.includes("coder")) score += 25;
    if (/(:|\b)(0\.5|0\.6|1\.5|1\.7|3|4|7)b\b/.test(n)) score += 10;
    if (n.includes("embedding")) score -= 100;
    if (n.includes("vision")) score -= 15;
    return { name, score };
  }).sort((a,b) => b.score - a.score);
  return ranked[0]?.score > -50 ? ranked[0].name : preferred;
}


export function selectLocalModels(names = [], preferred = LOCAL_AI_DEFAULTS.model, secondary = LOCAL_AI_DEFAULTS.secondaryModel) {
  const primary = selectLocalModel(names, preferred);
  const list = [...new Set((names || []).map(String).filter(Boolean))];
  const secondaryBase = String(secondary || "").split(":")[0];
  const second = list.find(n => n === secondary || n === secondaryBase || n.startsWith(secondaryBase + ":")) || "";
  return { primary, secondary: second && second !== primary ? second : "" };
}

export function executableNodeCatalog() {
  return NODE_GROUPS.flatMap(([group, items]) =>
    items.filter(([, type]) => isExecutable(type)).map(([label, type]) => ({ group, label, type }))
  );
}

function compactProject(project = {}) {
  return {
    name: String(project.name || "Projet"),
    nodes: (project.nodes || []).slice(0, 120).map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      params: Object.fromEntries(
        Object.entries(n.params || {})
          .filter(([key, value]) => ["number","string","boolean"].includes(typeof value) && !/key|token|secret/i.test(key))
          .slice(0, 12)
      )
    })),
    edges: (project.edges || []).slice(0, 180).map(e => ({ from: e.from, to: e.to })),
    timeline: (project.timeline || []).slice(0, 80).map(c => ({
      id: c.id, kind: c.kind, label: c.label, track: c.track, start: c.start, duration: c.duration
    }))
  };
}

export function buildLocalAiPrompt(text, project = {}) {
  const catalog = executableNodeCatalog();
  return {
    system: [
      "Tu es Local AI Core de No-de Vibe Designer, logiciel de création/régie pour spectacle vivant.",
      "Tu travailles OFFLINE sur la machine de l'utilisateur.",
      "Ta sortie est exclusivement un objet JSON, sans markdown ni commentaire.",
      "Tu proposes un patch exécutable, léger et robuste. Tu réutilises les nodes existants quand possible.",
      "Tu n'actives jamais automatiquement caméra, micro, MIDI, Serial, OSC, Art-Net ou tout autre accès matériel.",
      "Tu peux préparer ces nodes, mais les permissions et sorties externes restent explicitement déclenchées par l'humain.",
      "N'invente aucun type de node hors catalogue.",
      "Si la demande nomme plusieurs sorties, par exemple un shader et Processing, produis toutes ces sorties dans le même tableau ops, reliées entre elles.",
      "Un node shader doit avoir params.glsl : fragment WebGL1 avec precision mediump float, varying vec2 v_uv, uniforms u_time u_intensity u_resolution, et gl_FragColor. Pas de #version 300 es.",
      "Un node p5 ou sketch doit avoir params.script composé uniquement de background(), fill(), circle(), rect(), line() et wave(). Pas de setup/draw JavaScript.",
      "Pour mélanger deux images, ajoute un node composite et connecte les sorties vidéo sur ses entrées.",
      "Ne produis jamais de code shell, de commande système, de chemin privé, de clé ni de secret."
    ].join("\n"),
    user: JSON.stringify({
      task: String(text || "").slice(0, 6000),
      outputSchema: {
        ops: [
          { op: "addNode", type: "<catalog type>", x: 100, y: 100, allowDuplicate: false },
          { op: "connect", fromType: "<type>", fromPort: 0, toType: "<type>", toPort: 0 },
          { op: "setParam", type: "<type>", key: "<param>", value: "<json value>" },
          { op: "addClip", track: 0, start: 0, duration: 1, label: "<label>", kind: "effect|points|cue|shader" }
        ],
        summary: "résumé très court"
      },
      nodeCatalog: catalog,
      currentProject: compactProject(project)
    })
  };
}

function parseMaybeJson(value) {
  if (value && typeof value === "object") return value;
  const text = String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (!text) return null;
  return JSON.parse(text);
}

export function sanitizeLocalAiResponse(raw, { maxOps = LOCAL_AI_DEFAULTS.maxOps } = {}) {
  let parsed;
  try {
    const content = raw?.message?.content ?? raw?.choices?.[0]?.message?.content ?? raw?.content ?? raw;
    parsed = parseMaybeJson(content);
  } catch {
    return { ok: false, error: "Réponse Local AI non JSON", ops: [] };
  }
  if (!parsed || !Array.isArray(parsed.ops)) return { ok: false, error: "Réponse Local AI sans tableau ops", ops: [] };

  const allowedOps = new Set(["addNode","connect","setParam","addClip"]);
  const catalog = new Set(executableNodeCatalog().map(n => n.type));
  const ops = [];
  for (const op of parsed.ops.slice(0, Math.max(1, Math.min(128, maxOps)))) {
    if (!op || typeof op !== "object" || !allowedOps.has(op.op)) continue;
    if (op.op === "addNode") {
      if (!catalog.has(op.type)) continue;
      const params = {};
      if (op.params && typeof op.params === "object") {
        for (const [key, value] of Object.entries(op.params).slice(0, 32)) {
          if (!/^(key|token|secret|password|apiKey)$/i.test(key)) {
            if (typeof value === "string") params[key] = value.slice(0, 60000);
            else if (typeof value === "number" && Number.isFinite(value)) params[key] = value;
            else if (typeof value === "boolean") params[key] = value;
            else if (key === "isf" && value && typeof value === "object") {
              params.isf = {
                ISFVSERSION:String(value.ISFVSERSION || value.ISFVERSION || "2").slice(0, 12),
                TYPE:String(value.TYPE || "IMAGE").slice(0, 32),
                NAME:String(value.NAME || "No[co]de ISF").slice(0, 160),
                DESCRIPTION:String(value.DESCRIPTION || "").slice(0, 500),
                INPUTS:Array.isArray(value.INPUTS) ? value.INPUTS.slice(0, 32) : []
              };
            }
          }
        }
      }
      ops.push({
        op: "addNode",
        type: op.type,
        x: Math.max(0, Math.min(6000, Number(op.x) || 60)),
        y: Math.max(0, Math.min(4000, Number(op.y) || 60)),
        allowDuplicate: op.allowDuplicate === true,
        ...(Object.keys(params).length ? { params } : {})
      });
    } else if (op.op === "connect") {
      const fromType = String(op.fromType || "");
      const toType = String(op.toType || "");
      if ((!op.fromId && !catalog.has(fromType)) || (!op.toId && !catalog.has(toType))) continue;
      ops.push({
        op: "connect",
        ...(op.fromId ? { fromId: String(op.fromId) } : { fromType }),
        fromPort: Math.max(0, Math.min(32, Number(op.fromPort) || 0)),
        ...(op.toId ? { toId: String(op.toId) } : { toType }),
        toPort: Math.max(0, Math.min(32, Number(op.toPort) || 0))
      });
    } else if (op.op === "setParam") {
      if (!op.id && !catalog.has(String(op.type || ""))) continue;
      const key = String(op.key || "").trim();
      if (!key || key.length > 64 || /(?:key|token|secret|password)/i.test(key)) continue;
      ops.push({
        op: "setParam",
        ...(op.id ? { id: String(op.id) } : { type: String(op.type) }),
        key,
        value: op.value
      });
    } else if (op.op === "addClip") {
      ops.push({
        op: "addClip",
        track: Math.max(0, Math.min(64, Number(op.track) || 0)),
        start: Math.max(0, Number(op.start) || 0),
        duration: Math.max(0.05, Math.min(86400, Number(op.duration) || 1)),
        label: String(op.label || "Local AI").slice(0, 120),
        kind: ["effect","points","cue","shader"].includes(op.kind) ? op.kind : "effect"
      });
    }
  }
  return {
    ok: ops.length > 0,
    ops,
    summary: String(parsed.summary || "").slice(0, 500),
    error: ops.length ? "" : "Local AI n'a produit aucune opération exploitable"
  };
}

function loopbackHost(hostname = "") {
  return ["127.0.0.1", "localhost", "::1"].includes(String(hostname || "").toLowerCase().replace(/^\[|\]$/g, ""));
}

function throwLocalAiFailure(failure, cause) {
  const error = new Error(failure?.message || "Ollama inaccessible");
  error.failure = failure || { code: "unreachable", message: error.message, responded: false };
  error.responded = false;
  if (cause) error.cause = cause;
  return error;
}

async function opaqueOllamaReachable(url, timeoutMs) {
  if (typeof document === "undefined") return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(100, timeoutMs));
  try {
    await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function directOllamaProbe(baseUrl = LOCAL_AI_DEFAULTS.baseUrl, options = {}) {
  if (!isTrustedLocalAiUrl(baseUrl)) throw new Error("Local AI Core exige localhost ou une IP privée du réseau local");
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : LOCAL_AI_PROBE_TIMEOUT_MS;
  const target = new URL(String(baseUrl).replace(/\/+$/, ""));
  const pageProtocol = options.pageProtocol || globalThis?.location?.protocol || "";
  const loopback = loopbackHost(target.hostname);
  const mixed = classifyLocalAiFailure({ pageProtocol, targetProtocol: target.protocol, model: options.model });
  if (mixed?.code === "mixed_content") throw throwLocalAiFailure(mixed);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(target.origin + "/api/tags", { method: "GET", cache: "no-store", signal: controller.signal });
    if (!res.ok) {
      const failure = classifyLocalAiFailure({
        status: res.status,
        message: "Ollama HTTP " + res.status,
        endpoint: "tags",
        model: options.model,
        probeTimeout: true
      });
      throw throwLocalAiFailure(failure);
    }
    const data = await res.json();
    const models = modelNamesFromTags(data);
    const assessed = assessLocalModels(models, options.model || "");
    return {
      ok: assessed.ok,
      models,
      installed: assessed.installed,
      notice: assessed.notice,
      error: assessed.error,
      failure: assessed.failure,
      responded: false
    };
  } catch (error) {
    if (error?.failure) throw error;
    let corsBlocked = false;
    const remaining = timeoutMs - (Date.now() - started);
    if (remaining > 200 && typeof document !== "undefined" && error?.name !== "AbortError") {
      corsBlocked = await opaqueOllamaReachable(target.origin + "/api/tags", remaining);
    }
    const failure = classifyLocalAiFailure(factsFromLocalAiError(error, {
      pageProtocol,
      targetProtocol: target.protocol,
      corsBlocked,
      loopback,
      probeTimeout: true,
      binaryPresent: options.binaryPresent,
      model: options.model
    })) || { code: "unreachable", message: "Ollama inaccessible", responded: false };
    throw throwLocalAiFailure(failure, error);
  } finally {
    clearTimeout(timer);
  }
}

export async function directOllamaChat({ baseUrl, model, system, user, temperature = .15, numPredict = 1800 } = {}) {
  if (!isTrustedLocalAiUrl(baseUrl)) throw new Error("Local AI Core exige localhost ou une IP privée du réseau local");
  const res = await fetch(String(baseUrl).replace(/\/+$/, "") + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      options: { temperature, num_predict: Math.max(512, Math.min(12000, Number(numPredict) || 1800)) },
      messages: [{ role: "system", content: system }, { role: "user", content: user }]
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const failure = classifyLocalAiFailure({
      status: res.status,
      message: ("Ollama HTTP " + res.status + " · " + body.slice(0, 180)).trim(),
      endpoint: "chat",
      model
    });
    throw throwLocalAiFailure(failure);
  }
  return res.json();
}
