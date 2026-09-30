/**
 * Local Agent Registry — adapté du scan d'engines de CX hub.
 * Registre local-first pour No-de Vibe Designer.
 */

export const LOCAL_AGENT_ROLES = Object.freeze([
  { id:"auto", label:"Auto" },
  { id:"code", label:"Code / patch" },
  { id:"vision", label:"Vision / image" },
  { id:"fast", label:"Rapide" },
  { id:"chat", label:"Chat / général" },
  { id:"embedding", label:"Embedding" },
  { id:"utility", label:"Utilitaire" }
]);

function uniq(values = []) {
  return [...new Set(values.map(x => String(x || "").trim()).filter(Boolean))];
}

function privateLocalUrl(raw = "") {
  try {
    const u = new URL(String(raw || "http://127.0.0.1:11434"));
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!["http:","https:"].includes(u.protocol)) return false;
    if (["127.0.0.1","localhost","::1"].includes(host)) return true;
    if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
    const m = host.match(/^172\.(\d+)\./);
    return !!m && Number(m[1]) >= 16 && Number(m[1]) <= 31;
  } catch {
    return false;
  }
}

export function normalizeLocalAgentBase(raw = "") {
  const value = String(raw || "http://127.0.0.1:11434").trim().replace(/\/+$/,"");
  if (!privateLocalUrl(value)) throw new Error("Agents locaux : utilise localhost ou une IP privée du réseau local");
  return value;
}

export function normalizeAgentCapabilities(show = {}) {
  const values = [
    ...(Array.isArray(show?.capabilities) ? show.capabilities : []),
    ...(Array.isArray(show?.details?.capabilities) ? show.details.capabilities : [])
  ];
  return uniq(values.map(x => String(x).toLowerCase()));
}

export function classifyLocalAgent(model = "", show = {}) {
  const name = String(model || "").toLowerCase();
  const caps = normalizeAgentCapabilities(show);
  const families = [
    show?.details?.family,
    ...(Array.isArray(show?.details?.families) ? show.details.families : [])
  ].filter(Boolean).map(x => String(x).toLowerCase());
  const text = [name, ...caps, ...families].join(" ");

  if (/(embedding|embed|rerank|nomic|bge[-_:]|e5[-_:])/.test(text)) {
    return { role:"embedding", generative:false, reason:"embedding" };
  }
  if (caps.length && !caps.some(x => ["completion","tools","vision"].includes(x))) {
    return { role:"utility", generative:false, reason:"pas de capacité générative déclarée" };
  }
  if (caps.includes("vision") || /(vision|llava|bakllava|moondream|minicpm-v|qwen[^ ]*-vl)/.test(text)) {
    return { role:"vision", generative:true, reason:"vision" };
  }
  if (/(coder|codeqwen|deepseek-coder|starcoder|codestral)/.test(text)) {
    return { role:"code", generative:true, reason:"code" };
  }
  if (/(:|\b)(0\.5|0\.6|1|1\.5|1\.7|2|3|4)b\b/.test(name)) {
    return { role:"fast", generative:true, reason:"petit modèle" };
  }
  return { role:"chat", generative:true, reason:"général" };
}

function agentKey(baseUrl, model) {
  return `ollama:${String(baseUrl)}:${String(model)}`;
}

export function makeLocalAgent({ baseUrl, model, show = {}, source = "scan" } = {}) {
  const base = normalizeLocalAgentBase(baseUrl);
  const name = String(model || "").trim();
  if (!name) throw new Error("Nom d'agent local manquant");
  const cls = classifyLocalAgent(name, show);
  const parameterSize = String(show?.details?.parameter_size || "").trim();
  const quant = String(show?.details?.quantization_level || "").trim();
  return {
    id: agentKey(base, name),
    provider:"ollama",
    baseUrl:base,
    model:name,
    label:name,
    role:cls.role,
    autoRole:cls.role,
    enabled:cls.generative,
    generative:cls.generative,
    capabilities:normalizeAgentCapabilities(show),
    parameterSize,
    quantization:quant,
    reason:cls.reason,
    source,
    seenAt:Date.now()
  };
}

export function mergeLocalAgentRegistry(discovered = [], saved = []) {
  const overrides = new Map((Array.isArray(saved) ? saved : []).map(a => [String(a?.id || agentKey(a?.baseUrl, a?.model)), a]));
  const merged = discovered.map(agent => {
    const old = overrides.get(agent.id);
    if (!old) return agent;
    const role = String(old.role || old.roleOverride || agent.role);
    return {
      ...agent,
      enabled: old.enabled !== false && agent.generative !== false,
      role: LOCAL_AGENT_ROLES.some(r => r.id === role) && role !== "auto" ? role : agent.autoRole,
      roleOverride: role === agent.autoRole ? "" : role,
      label: String(old.label || agent.label || agent.model)
    };
  });
  const ids = new Set(merged.map(a => a.id));
  for (const old of overrides.values()) {
    const id = String(old?.id || agentKey(old?.baseUrl, old?.model));
    if (ids.has(id) || !old?.model || !old?.baseUrl) continue;
    try {
      merged.push({
        ...makeLocalAgent({ baseUrl:old.baseUrl, model:old.model, show:{}, source:"saved" }),
        ...old,
        id,
        enabled:old.enabled !== false
      });
    } catch { /* ignore invalid stale entries */ }
  }
  return merged.sort((a,b) => {
    const order = { code:0, vision:1, fast:2, chat:3, embedding:4, utility:5 };
    return (order[a.role] ?? 9) - (order[b.role] ?? 9) || a.model.localeCompare(b.model);
  });
}

async function browserTags(baseUrl) {
  const res = await fetch(baseUrl + "/api/tags");
  if (!res.ok) throw new Error("Ollama HTTP " + res.status);
  const data = await res.json();
  return Array.isArray(data?.models) ? data.models.map(m => m?.name || m?.model).filter(Boolean) : [];
}

async function browserShow(baseUrl, model) {
  const res = await fetch(baseUrl + "/api/show", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ model })
  });
  if (!res.ok) throw new Error("Ollama show HTTP " + res.status);
  return res.json();
}

export async function scanLocalAgents({ baseUrl = "http://127.0.0.1:11434", saved = [] } = {}) {
  const base = normalizeLocalAgentBase(baseUrl);
  const desktop = globalThis?.nvdDesktop;
  let models = [];
  if (typeof desktop?.localAiAgentsScan === "function") {
    const result = await desktop.localAiAgentsScan({ baseUrl:base });
    const agents = Array.isArray(result?.agents) ? result.agents : [];
    return mergeLocalAgentRegistry(agents.map(a => ({
      ...makeLocalAgent({ baseUrl:base, model:a.model, show:a.show || a, source:"electron" }),
      ...a,
      id:a.id || agentKey(base, a.model)
    })), saved);
  }
  if (typeof desktop?.localAiProbe === "function") {
    const result = await desktop.localAiProbe({ baseUrl:base });
    models = Array.isArray(result?.models) ? result.models : [];
  } else {
    models = await browserTags(base);
  }

  const agents = [];
  const concurrency = 4;
  for (let i=0; i<models.length; i+=concurrency) {
    const batch = models.slice(i, i+concurrency);
    const details = await Promise.all(batch.map(async model => {
      try {
        const show = typeof desktop?.localAiShow === "function"
          ? await desktop.localAiShow({ baseUrl:base, model })
          : await browserShow(base, model);
        return makeLocalAgent({ baseUrl:base, model, show, source:"scan" });
      } catch {
        return makeLocalAgent({ baseUrl:base, model, show:{}, source:"scan-name-only" });
      }
    }));
    agents.push(...details);
  }
  return mergeLocalAgentRegistry(agents, saved);
}

function taskRoleOrder(task = "patch") {
  if (task === "vision" || task === "image") return ["vision","code","chat","fast"];
  if (task === "fast") return ["fast","chat","code","vision"];
  if (task === "chat") return ["chat","fast","code","vision"];
  return ["code","chat","fast","vision"];
}

export function selectLocalAgents(agents = [], { task = "patch", limit = 2 } = {}) {
  const roleOrder = taskRoleOrder(task);
  const roleScore = new Map(roleOrder.map((r,i) => [r, 100 - i*20]));
  return (Array.isArray(agents) ? agents : [])
    .filter(a => a && a.enabled !== false && a.generative !== false && !["embedding","utility"].includes(a.role))
    .map((a,index) => {
      let score = roleScore.get(a.role) ?? 5;
      const n = String(a.model || "").toLowerCase();
      if (task === "patch" && /coder/.test(n)) score += 25;
      if ((task === "vision" || task === "image") && (a.capabilities || []).includes("vision")) score += 30;
      if (a.source === "electron") score += 1;
      return { a, score, index };
    })
    .sort((x,y) => y.score - x.score || x.index - y.index)
    .slice(0, Math.max(1, Math.min(8, Number(limit)||2)))
    .map(x => x.a);
}

export function localAgentRegistrySummary(agents = []) {
  const list = Array.isArray(agents) ? agents : [];
  const active = list.filter(a => a.enabled !== false && a.generative !== false);
  const roles = active.reduce((acc,a) => {
    acc[a.role] = (acc[a.role] || 0) + 1;
    return acc;
  }, {});
  return { total:list.length, active:active.length, roles };
}
