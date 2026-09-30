/**
 * Discrete diagnostic snapshot — version/build/platform/FPS/Remote/WS/MIDI/…
 * Never include tokens, API keys, or private session material.
 */

import { APP_NAME, APP_VERSION, BUILD_LABEL, PROJECT_FORMAT, SOURCE_COMMIT } from "./version.js";

const SECRET_KEYS = /token|secret|password|apikey|api_key|authorization|bearer|sk-|sessionToken/i;

function scrub(value, depth = 0) {
  if (depth > 6) return "[…]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (SECRET_KEYS.test(value) || /^sk-[A-Za-z0-9]{10,}/.test(value)) return "[redacted]";
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 40).map((v) => scrub(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.test(k)) out[k] = "[redacted]";
      else out[k] = scrub(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function detectPlatform() {
  if (typeof window === "undefined") return "node";
  if (window.nvdDesktop?.runtime === "electron") return "electron";
  if (window.Capacitor?.isNativePlatform?.()) return "capacitor";
  if (navigator.userAgentData?.platform) return navigator.userAgentData.platform;
  return navigator.platform || "browser";
}

/**
 * @param {object} live — optional live probes from desktop/runtime
 */
export function buildDiagnosticSnapshot(live = {}) {
  const snap = {
    app: APP_NAME,
    version: APP_VERSION,
    build: BUILD_LABEL,
    projectFormat: PROJECT_FORMAT,
    commit: SOURCE_COMMIT || live.commit || null,
    platform: live.platform || detectPlatform(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    secureContext: typeof window !== "undefined" ? !!window.isSecureContext : null,
    fps: live.fps ?? null,
    remote: scrub(live.remote || { state: "DISCONNECTED" }),
    remoteCamera: scrub(live.remoteCamera || { state: "WAITING" }),
    ws: scrub(live.ws || { state: "DISCONNECTED" }),
    midi: scrub(live.midi || { state: "DISCONNECTED" }),
    serial: scrub(live.serial || { state: "DISCONNECTED" }),
    osc: scrub(live.osc || { state: "DISCONNECTED" }),
    artnet: scrub(live.artnet || { state: "DISCONNECTED" }),
    pwaUrl: live.pwaUrl || null,
    pwaOnlineClaim: false,
    recentErrors: scrub(Array.isArray(live.recentErrors) ? live.recentErrors.slice(-20) : []),
    session: scrub(live.session || null),
    generatedAt: new Date().toISOString()
  };
  return scrub(snap);
}

export function formatDiagnosticText(snap) {
  return JSON.stringify(snap, null, 2);
}

export async function copyDiagnostic(snap, clipboard = globalThis.navigator?.clipboard) {
  const text = formatDiagnosticText(snap);
  if (!clipboard?.writeText) throw new Error("Presse-papiers indisponible");
  await clipboard.writeText(text);
  return text;
}
