/**
 * Private, device-local publisher for the three public Radio Paillettes
 * title states. This module intentionally owns no project data and does not
 * issue a request unless a caller explicitly invokes publishLiveTitle().
 */

export const LIVE_TITLE_PREFERENCE_KEY = "nvd.live-title.control-address";

export const LIVE_TITLE_PRESETS = Object.freeze([
  Object.freeze({ id: "radio", label: "RADIO PAILLETTES" }),
  Object.freeze({ id: "pirates", label: "PIRATES PAILLETTES" }),
  Object.freeze({ id: "radio-pirate", label: "RADIO PIRATE PAILLETTES" })
]);

const LIVE_TITLE_IDS = new Set(LIVE_TITLE_PRESETS.map(preset => preset.id));
const CONTROL_PATH = "/api/radio-paillettes-live";

function failed(code, message) {
  return { ok: false, code, message };
}

function controlToken(hash) {
  if (!hash || hash === "#") return "";
  try { return decodeURIComponent(hash.slice(1)).trim(); }
  catch { return ""; }
}

/**
 * Parse an operator address while keeping its secret fragment out of the
 * endpoint. Query parameters are forbidden so a control secret cannot leak
 * into a request URL, referrer, or proxy log.
 */
export function parseLiveTitleControlAddress(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return failed("missing-address", "Adresse de régie absente.");
  let url;
  try { url = new URL(raw); }
  catch { return failed("invalid-address", "Adresse de régie invalide."); }
  if (url.protocol !== "https:") return failed("invalid-address", "L'adresse de régie doit utiliser HTTPS.");
  if (url.username || url.password || url.search || url.pathname !== CONTROL_PATH) return failed("invalid-address", "L'adresse de régie doit viser l'API live privée.");
  const token = controlToken(url.hash);
  if (!token || /[\r\n\s]/.test(token) || token.length > 512) return failed("missing-secret", "La clé privée de régie est absente ou invalide.");
  url.hash = "";
  return { ok: true, endpoint: url.toString(), token };
}

/** Read only a valid local preference; malformed remnants cannot be published. */
export function loadLiveTitleControlAddress(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem?.(LIVE_TITLE_PREFERENCE_KEY) || "";
    return parseLiveTitleControlAddress(value).ok ? value : "";
  } catch {
    return "";
  }
}

/** Save only to the dedicated device preference, never to a No-de project. */
export function saveLiveTitleControlAddress(value, storage = globalThis.localStorage) {
  const parsed = parseLiveTitleControlAddress(value);
  if (!parsed.ok) return parsed;
  try {
    storage?.setItem?.(LIVE_TITLE_PREFERENCE_KEY, String(value).trim());
    return { ok: true, controlAddress: String(value).trim() };
  } catch {
    return failed("storage", "L'adresse de régie ne peut pas être mémorisée sur cet appareil.");
  }
}

/**
 * Publish one fixed title state after a deliberate operator action.
 * A 2xx response without the expected JSON acknowledgement is not success.
 */
export async function publishLiveTitle({ controlAddress, titleId, fetchImpl = globalThis.fetch, signal } = {}) {
  const parsed = parseLiveTitleControlAddress(controlAddress);
  if (!parsed.ok) return parsed;
  if (!LIVE_TITLE_IDS.has(titleId)) return failed("invalid-title", "Titre live non autorisé.");
  if (typeof fetchImpl !== "function") return failed("network", "Diffusion Internet indisponible dans cette régie.");

  const body = JSON.stringify({ schema: 1, titleId, issuedAt: new Date().toISOString(), source: "no-de-show" });
  let response;
  try {
    response = await fetchImpl(parsed.endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${parsed.token}`
      },
      body,
      cache: "no-store",
      signal
    });
  } catch (error) {
    return failed(error?.name === "AbortError" ? "timeout" : "network", error?.name === "AbortError" ? "Diffusion expirée : vérifie la connexion Internet." : "Diffusion impossible : vérifie la connexion Internet.");
  }

  if (!response?.ok) return failed("rejected", `Diffusion refusée par le relais (${Number(response?.status) || 0}).`);
  const contentType = response.headers?.get?.("content-type") || "";
  if (!/\bapplication\/json\b/i.test(contentType)) return failed("invalid-ack", "Le relais n'a pas confirmé une diffusion lisible.");
  let acknowledgement;
  try { acknowledgement = await response.json(); }
  catch { return failed("invalid-ack", "Le relais a répondu sans confirmation lisible."); }
  if (!acknowledgement || acknowledgement.ok !== true || acknowledgement.titleId !== titleId) return failed("invalid-ack", "Le relais n'a pas confirmé le titre demandé.");
  return { ok: true, titleId, message: "Titre diffusé." };
}
