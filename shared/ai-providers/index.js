/**
 * Couche fournisseurs IA commune au Desktop et à la PWA.
 * Elle ne modifie jamais un projet : Vibe valide ensuite chaque opération avec
 * le Safety Engine. Les secrets Electron ne transitent jamais par ce module.
 */

export const AI_TASKS = Object.freeze([
  { id: "planner", label: "Planner" },
  { id: "patch", label: "Génération de patch" },
  { id: "review", label: "Relecture" }
]);

export const CLOUD_SECRET_NAMES = Object.freeze(["openai", "anthropic", "gemini", "xai"]);

const CLOUD_DEFAULTS = Object.freeze({
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { label: "Anthropic", baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-6" },
  gemini: { label: "Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.8-flash" },
  xai: { label: "xAI / Grok", baseUrl: "https://api.x.ai/v1", model: "grok-4.7" }
});

const CLI_DEFAULTS = Object.freeze({
  codex: { label: "Codex CLI", model: "" },
  claude: { label: "Claude CLI", model: "" },
  agy: { label: "Gemini CLI", model: "" }
});

function text(value, fallback = "") {
  const result = String(value ?? fallback).trim();
  return result || fallback;
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizedBaseUrl(value, fallback = "") {
  const raw = text(value, fallback).replace(/\/+$/, "");
  let url;
  try { url = new URL(raw); }
  catch { throw new Error("URL de fournisseur IA invalide"); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Fournisseur IA : HTTP/HTTPS uniquement");
  return url.toString().replace(/\/+$/, "");
}

function isPrivateHost(hostname = "") {
  const host = String(hostname).toLowerCase().replace(/^\[|\]$/g, "");
  if (["127.0.0.1", "localhost", "::1"].includes(host)) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function pathUrl(baseUrl, leaf, { addV1 = false } = {}) {
  const url = new URL(normalizedBaseUrl(baseUrl));
  let pathname = url.pathname.replace(/\/+$/, "");
  if (pathname.endsWith(leaf)) return url.toString();
  if (addV1 && !/\/(?:v\d+(?:beta)?|openai)$/i.test(pathname)) pathname += "/v1";
  url.pathname = `${pathname}/${leaf}`.replace(/\/+/g, "/");
  return url.toString();
}

export function ollamaTagsUrl(baseUrl = "http://127.0.0.1:11434") {
  return pathUrl(baseUrl, "api/tags");
}

export function chatCompletionsUrl(baseUrl) {
  return pathUrl(baseUrl, "chat/completions", { addV1: true });
}

export function modelsUrl(baseUrl) {
  return pathUrl(baseUrl, "models", { addV1: true });
}

function makeProvider(id, kind, values = {}) {
  return {
    id,
    kind,
    label: values.label || id,
    enabled: values.enabled === true,
    baseUrl: values.baseUrl || "",
    model: values.model || "",
    apiKey: values.apiKey || "",
    configured: values.configured === true,
    available: values.available === true
  };
}

export function defaultProviderSettings() {
  return {
    version: 1,
    providers: [
      makeProvider("ollama", "ollama", { label: "Ollama local", baseUrl: "http://127.0.0.1:11434", model: "qwen2.5-coder:7b" }),
      makeProvider("endpoint", "openai-compatible", { label: "Endpoint compatible OpenAI", baseUrl: "", model: "" }),
      ...Object.entries(CLOUD_DEFAULTS).map(([id, item]) => makeProvider(id, id, { ...item })),
      ...Object.entries(CLI_DEFAULTS).map(([id, item]) => makeProvider(id, "cli", { ...item }))
    ],
    routes: { planner: "ollama", patch: "ollama", review: "ollama" }
  };
}

export function normalizeProviderSettings(raw = {}) {
  const defaults = defaultProviderSettings();
  const source = raw && typeof raw === "object" ? raw : {};
  const supplied = new Map((Array.isArray(source.providers) ? source.providers : [])
    .filter(item => item && typeof item === "object" && item.id)
    .map(item => [String(item.id), item]));
  const providers = defaults.providers.map(base => {
    const old = supplied.get(base.id) || {};
    return {
      ...base,
      label: text(old.label, base.label),
      kind: text(old.kind, base.kind),
      enabled: old.enabled === true,
      baseUrl: typeof old.baseUrl === "string" ? old.baseUrl.trim() : base.baseUrl,
      model: typeof old.model === "string" ? old.model.trim() : base.model,
      // PWA only: a generic endpoint may hold an optional key locally. Electron
      // replaces this with encrypted main-process storage before any request.
      apiKey: typeof old.apiKey === "string" ? old.apiKey : "",
      configured: old.configured === true,
      available: old.available === true
    };
  });

  // Migration douce depuis la configuration 3.3.22, sans activer de cloud.
  const ollama = providers.find(item => item.id === "ollama");
  if (ollama) {
    if (typeof source.localBaseUrl === "string") ollama.baseUrl = source.localBaseUrl.trim() || ollama.baseUrl;
    if (typeof source.localModel === "string") ollama.model = source.localModel.trim() || ollama.model;
    if (source.localEnabled === true) ollama.enabled = true;
  }
  const endpoint = providers.find(item => item.id === "endpoint");
  if (endpoint) {
    if (typeof source.endpoint === "string") endpoint.baseUrl = source.endpoint.trim();
    if (typeof source.model === "string") endpoint.model = source.model.trim();
    if (typeof source.apiKey === "string") endpoint.apiKey = source.apiKey;
    if (source.enabled === true && endpoint.baseUrl) endpoint.enabled = true;
  }
  const routes = {};
  for (const task of AI_TASKS) {
    const chosen = source.routes?.[task.id];
    routes[task.id] = providers.some(item => item.id === chosen) ? chosen : defaults.routes[task.id];
  }
  return { version: 1, providers, routes };
}

export function providerForTask(settings, task = "patch") {
  const normalized = normalizeProviderSettings(settings);
  const id = normalized.routes[task] || normalized.routes.patch;
  return normalized.providers.find(item => item.id === id) || null;
}

export function providerList(settings) {
  return normalizeProviderSettings(settings).providers;
}

export function providerRequiresEncryptedSecret(provider) {
  return Boolean(provider && CLOUD_SECRET_NAMES.includes(provider.id));
}

export function providerIsPwaSafe(provider) {
  return Boolean(provider && ["ollama", "endpoint"].includes(provider.id));
}

function responseText(payload) {
  const content = payload?.choices?.[0]?.message?.content
    ?? payload?.message?.content
    ?? payload?.content
    ?? payload?.output_text
    ?? payload?.response
    ?? payload?.text;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) return content.map(part => part?.text || part?.content || "").join("").trim();
  throw new Error("Fournisseur IA : réponse texte absente");
}

async function jsonRequest(fetchImpl, url, init = {}, timeoutMs = 30000) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch indisponible pour le fournisseur IA");
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 30000)) : null;
  try {
    const response = await fetchImpl(url, { ...init, ...(controller ? { signal: controller.signal } : {}) });
    const body = await response.text();
    if (!response.ok) throw new Error(`Fournisseur IA HTTP ${response.status}`);
    try { return body ? JSON.parse(body) : {}; }
    catch { throw new Error("Fournisseur IA : réponse non JSON"); }
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Fournisseur IA : délai dépassé");
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function detectOllama({ baseUrl = "http://127.0.0.1:11434", fetchImpl = globalThis.fetch, timeoutMs = 3500 } = {}) {
  let url;
  try { url = new URL(normalizedBaseUrl(baseUrl)); }
  catch (error) { return { ok: false, available: false, models: [], error: error.message }; }
  if (!isPrivateHost(url.hostname)) return { ok: false, available: false, models: [], error: "Ollama doit être local ou sur le réseau privé" };
  try {
    const data = await jsonRequest(fetchImpl, ollamaTagsUrl(url.toString()), { method: "GET" }, timeoutMs);
    const models = (Array.isArray(data?.models) ? data.models : [])
      .map(item => text(item?.name || item?.model))
      .filter(Boolean);
    return { ok: true, available: true, baseUrl: url.toString().replace(/\/+$/, ""), models };
  } catch (error) {
    return { ok: false, available: false, models: [], error: error?.message || String(error) };
  }
}

export async function listOpenAiModels({ baseUrl, apiKey = "", fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const data = await jsonRequest(fetchImpl, modelsUrl(baseUrl), { method: "GET", headers }, timeoutMs);
  return (Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [])
    .map(item => text(item?.id || item?.name || item?.model))
    .filter(Boolean);
}

/** Une seule interface OpenAI-compatible utilisée par Ollama, LM Studio, llama.cpp, Hermes, LiteLLM et les clouds compatibles. */
export async function chat({ baseUrl, messages, model, apiKey = "", fetchImpl = globalThis.fetch, timeoutMs = 30000, temperature = 0.2, ...extra } = {}) {
  const safeMessages = (Array.isArray(messages) ? messages : []).slice(-24).map(message => ({
    role: ["system", "user", "assistant"].includes(message?.role) ? message.role : "user",
    content: String(message?.content || "").slice(0, 30000)
  })).filter(message => message.content.trim());
  if (!safeMessages.length) throw new Error("Fournisseur IA : messages absents");
  if (!text(model)) throw new Error("Fournisseur IA : modèle absent");
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const data = await jsonRequest(fetchImpl, chatCompletionsUrl(baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({ model: text(model), messages: safeMessages, temperature: Math.max(0, Math.min(1, Number(temperature) || 0.2)), stream: false, ...extra })
  }, timeoutMs);
  return responseText(data);
}

export async function chatAnthropic({ baseUrl, messages, model, apiKey, fetchImpl = globalThis.fetch, timeoutMs = 30000, temperature = 0.2, maxTokens = 1800 } = {}) {
  if (!apiKey) throw new Error("Anthropic : clé non configurée");
  const turns = (Array.isArray(messages) ? messages : []).slice(-24);
  const system = turns.filter(item => item?.role === "system").map(item => String(item.content || "")).filter(Boolean).join("\n");
  const payload = {
    model: text(model), max_tokens: Math.max(64, Math.min(12000, Number(maxTokens) || 1800)),
    messages: turns.filter(item => ["user", "assistant"].includes(item?.role)).map(item => ({ role:item.role, content:String(item.content || "").slice(0, 30000) })),
    temperature: Math.max(0, Math.min(1, Number(temperature) || 0.2)), stream: false
  };
  if (system) payload.system = system;
  const data = await jsonRequest(fetchImpl, pathUrl(baseUrl || CLOUD_DEFAULTS.anthropic.baseUrl, "v1/messages"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(payload)
  }, timeoutMs);
  return responseText({ content:data?.content });
}

export function createProviderRegistry({ fetchImpl = globalThis.fetch, cliChat = null } = {}) {
  const registered = new Map();
  return {
    register(provider) {
      if (!provider?.id || typeof provider.chat !== "function") throw new Error("Fournisseur IA invalide");
      registered.set(provider.id, { ...provider, enabled: provider.enabled === true });
      return provider.id;
    },
    list() { return [...registered.values()].map(item => ({ id:item.id, label:item.label, enabled:item.enabled === true, kind:item.kind })); },
    get(id) { return registered.get(id) || null; },
    enable(id, enabled = true) {
      const provider = registered.get(id);
      if (!provider) throw new Error("Fournisseur IA inconnu");
      provider.enabled = enabled === true;
      return provider;
    },
    async chat({ providerId, ...request } = {}) {
      const provider = registered.get(providerId);
      if (!provider) throw new Error("Fournisseur IA introuvable");
      if (provider.enabled !== true) throw new Error("Fournisseur IA désactivé");
      return provider.chat({ ...request, fetchImpl, cliChat });
    }
  };
}

export function registerSettings(registry, settings, { cliChat = null } = {}) {
  for (const provider of providerList(settings)) {
    if (provider.kind === "cli") {
      registry.register({
        ...provider,
        chat: async request => {
          if (typeof cliChat !== "function") throw new Error("CLI disponible uniquement dans l’application desktop");
          return cliChat({ providerId:provider.id, ...request });
        }
      });
      continue;
    }
    if (provider.id === "anthropic") {
      registry.register({ ...provider, chat: request => chatAnthropic({ ...provider, ...request }) });
      continue;
    }
    registry.register({ ...provider, chat: request => chat({ ...provider, ...request }) });
  }
  return registry;
}

export async function chatForTask({ settings, task = "patch", messages, fetchImpl = globalThis.fetch, cliChat = null, ...request } = {}) {
  const provider = providerForTask(settings, task);
  if (!provider?.enabled) throw new Error("Aucun fournisseur IA activé pour cette tâche");
  const registry = registerSettings(createProviderRegistry({ fetchImpl, cliChat }), settings, { cliChat });
  const textResult = await registry.chat({ providerId:provider.id, messages, model:request.model || provider.model, ...request });
  return { text:textResult, provider };
}
