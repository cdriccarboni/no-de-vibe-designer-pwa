/**
 * Classement pur des échecs Ollama / IA locale.
 * Aucun accès réseau : les appelants fournissent les faits déjà observés.
 * responded est toujours false — un échec n'est jamais une réponse de modèle.
 */

export const LOCAL_AI_PROBE_TIMEOUT_MS = 2500;
export const LOCAL_AI_CHAT_TIMEOUT_MS = 30000;

const MODEL_MISSING = "model_missing";

function modelMissingMessage(model = "") {
  const name = String(model || "").trim();
  return name ? `Modèle Ollama absent : ${name}` : "Modèle Ollama absent";
}

/**
 * @returns {{code:string,message:string,responded:false}|null}
 */
export function classifyLocalAiFailure(facts = {}) {
  const message = String(facts.message || "").trim();
  const code = String(facts.code || "");
  const name = String(facts.name || "");
  const status = Number(facts.status) || Number((message.match(/\bHTTP\s+(\d{3})\b/) || [])[1]) || 0;
  const page = String(facts.pageProtocol || "");
  const target = String(facts.targetProtocol || "");
  const model = String(facts.model || "").trim();
  const aborted = facts.aborted === true
    || name === "AbortError"
    || name === "TimeoutError"
    || code === "LOCAL_AI_TIMEOUT"
    || code === "ABORT_ERR";
  const connectionRefused = facts.connectionRefused === true
    || code === "ECONNREFUSED"
    || /ECONNREFUSED|connection refused/i.test(message);
  const corsBlocked = facts.corsBlocked === true
    || /cors|cross-origin|access-control-allow-origin/i.test(message);
  const modelMissing = facts.modelMissing === true
    || (status === 404 && /model/i.test(message))
    || /model ['"]?.+['"]? not found/i.test(message);
  const fetchFailed = /failed to fetch|fetch failed|networkerror|network error|load failed|econnreset|enotfound|ehostunreach|etimedout|socket hang up/i.test(message)
    || ["ENOTFOUND", "EHOSTUNREACH", "ETIMEDOUT", "ECONNRESET", "UND_ERR_CONNECT_TIMEOUT"].includes(code);
  const mixed = facts.localTarget !== true && (page === "https:" || facts.securePage === true) && target === "http:";
  const hasSignal = mixed || modelMissing || corsBlocked || connectionRefused || aborted || fetchFailed || status >= 400 || !!message;
  if (!hasSignal) return null;

  if (mixed) {
    return {
      code: "mixed_content",
      message: "Ollama bloqué : contenu mixte (HTTPS → HTTP)",
      responded: false
    };
  }
  if (modelMissing) {
    return { code: MODEL_MISSING, message: modelMissingMessage(model), responded: false };
  }
  if (corsBlocked) {
    return { code: "cors", message: "Ollama bloqué par CORS", responded: false };
  }
  const closedPort = connectionRefused || (facts.loopback === true && fetchFailed && !aborted);
  if (closedPort) {
    if (facts.binaryPresent === false) {
      return { code: "not_installed", message: "Ollama n'est pas installé", responded: false };
    }
    return { code: "not_started", message: "Ollama n'est pas démarré", responded: false };
  }
  if (facts.binaryPresent === false && (aborted || fetchFailed)) {
    return { code: "not_installed", message: "Ollama n'est pas installé", responded: false };
  }
  const timedOut = aborted && (facts.probeTimeout === true || facts.chatTimeout === true);
  if (timedOut) {
    const seconds = Math.max(0.1, Number(facts.timeoutMs || (facts.probeTimeout ? LOCAL_AI_PROBE_TIMEOUT_MS : LOCAL_AI_CHAT_TIMEOUT_MS)) / 1000);
    return {
      code: "timeout",
      message: `Ollama inaccessible : aucune réponse avant ${seconds % 1 ? seconds.toFixed(1) : seconds} s`,
      responded: false
    };
  }
  let detail = "Ollama inaccessible";
  if (message && !/^Ollama inaccessible/.test(message)) detail = `Ollama inaccessible : ${message}`;
  else if (message) detail = message;
  return { code: "unreachable", message: detail, responded: false };
}

/** Lit un Error (et sa cause) sans déclencher d'I/O. */
export function factsFromLocalAiError(error, extra = {}) {
  const cause = error?.cause;
  const nested = cause?.cause;
  const message = [error?.message, cause?.message, nested?.message].filter(Boolean).join(" · ");
  const code = String(error?.code || cause?.code || nested?.code || "");
  const name = String(error?.name || cause?.name || "");
  const status = Number(error?.status || cause?.status) || 0;
  return {
    message,
    name,
    code,
    status,
    aborted: name === "AbortError" || name === "TimeoutError" || error?.aborted === true,
    connectionRefused: code === "ECONNREFUSED" || /ECONNREFUSED|connection refused/i.test(message),
    ...extra
  };
}

function modelNames(models) {
  return [...new Set((Array.isArray(models) ? models : [])
    .map(item => String(item?.name || item?.model || item || "").trim())
    .filter(Boolean))];
}

/**
 * Serveur déjà joint : distingue « modèle absent » d'une liste utilisable.
 * N'invente pas de réponse de modèle.
 */
export function assessLocalModels(models = [], requested = "") {
  const list = modelNames(models);
  const name = String(requested || "").trim();
  if (!list.length) {
    const failure = classifyLocalAiFailure({ modelMissing: true, model: name });
    return {
      ok: false,
      installed: false,
      models: list,
      responded: false,
      failure,
      error: failure.message,
      notice: ""
    };
  }
  const base = name.split(":")[0];
  const installed = !name || list.includes(name) || list.some(item => item === base || item.startsWith(base + ":"));
  if (!installed) {
    const failure = classifyLocalAiFailure({ modelMissing: true, model: name });
    return {
      ok: true,
      installed: false,
      models: list,
      responded: false,
      failure,
      error: "",
      notice: failure.message
    };
  }
  return {
    ok: true,
    installed: true,
    models: list,
    responded: false,
    failure: null,
    error: "",
    notice: ""
  };
}
