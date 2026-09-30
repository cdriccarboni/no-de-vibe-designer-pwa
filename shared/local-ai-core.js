import { NODE_GROUPS } from "./node-specs.js";
import { isExecutable } from "./ports.js";

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
      ops.push({
        op: "addNode",
        type: op.type,
        x: Math.max(0, Math.min(6000, Number(op.x) || 60)),
        y: Math.max(0, Math.min(4000, Number(op.y) || 60)),
        allowDuplicate: op.allowDuplicate === true
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

export async function directOllamaProbe(baseUrl = LOCAL_AI_DEFAULTS.baseUrl) {
  if (!isTrustedLocalAiUrl(baseUrl)) throw new Error("Local AI Core exige localhost ou une IP privée du réseau local");
  const res = await fetch(String(baseUrl).replace(/\/+$/, "") + "/api/tags", { method: "GET" });
  if (!res.ok) throw new Error("Ollama HTTP " + res.status);
  const data = await res.json();
  return { ok: true, models: modelNamesFromTags(data) };
}

export async function directOllamaChat({ baseUrl, model, system, user, temperature = .15 } = {}) {
  if (!isTrustedLocalAiUrl(baseUrl)) throw new Error("Local AI Core exige localhost ou une IP privée du réseau local");
  const res = await fetch(String(baseUrl).replace(/\/+$/, "") + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      options: { temperature, num_predict: 1800 },
      messages: [{ role: "system", content: system }, { role: "user", content: user }]
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("Ollama HTTP " + res.status + " · " + body.slice(0, 180));
  }
  return res.json();
}
