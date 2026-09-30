/**
 * Desktop detection prompt helpers — not a camera mirror.
 * Options: Open Studio / Sync / Monitor / Controller / Ignore
 */

export const DETECT_ACTIONS = Object.freeze({
  OPEN_STUDIO: "open-studio",
  SYNC: "sync",
  MONITOR: "monitor",
  CONTROLLER: "controller",
  IGNORE: "ignore"
});

const DETECT_KEY = "nvd.companion.detect-pref";

export function rememberDetectPref(action, storage = globalThis.localStorage) {
  if (!DETECT_ACTIONS[Object.keys(DETECT_ACTIONS).find((k) => DETECT_ACTIONS[k] === action)]) {
    // allow raw values from DETECT_ACTIONS
  }
  const allowed = new Set(Object.values(DETECT_ACTIONS));
  if (!allowed.has(action)) throw new Error(`Action detect inconnue : ${action}`);
  storage?.setItem?.(DETECT_KEY, action);
  return action;
}

export function loadDetectPref(storage = globalThis.localStorage) {
  const v = storage?.getItem?.(DETECT_KEY);
  return Object.values(DETECT_ACTIONS).includes(v) ? v : null;
}

export function formatDetectBanner({ name = "Companion", rttMs = null, transport = "LAN" } = {}) {
  const rtt = typeof rttMs === "number" ? ` · ${Math.round(rttMs)} ms` : "";
  return `${name} détecté · ${transport}${rtt} — Open Studio / Sync / Monitor / Controller / Ignore`;
}
