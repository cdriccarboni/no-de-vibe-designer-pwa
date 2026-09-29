/**
 * Companion Studio wire protocol — bidirectional Action ↔ Feedback.
 * Runs over CompanionTransport (WS first). Never embeds tokens in logs.
 */

export const STUDIO_ROLE = "companion";

export const STUDIO_MSG = Object.freeze({
  HELLO: "studio-hello",
  HELLO_ACK: "studio-hello-ack",
  DETECT: "studio-detect",
  PAIR: "studio-pair",
  ACTION: "studio-action",
  FEEDBACK: "studio-feedback",
  LAYOUT: "studio-layout",
  LAYOUT_ACK: "studio-layout-ack",
  PING: "studio-ping",
  PONG: "studio-pong",
  STATUS: "studio-status",
  DISCONNECT: "studio-disconnect"
});

export function makeStudioHello({
  clientId = "companion",
  pairCode = "",
  layoutName = "",
  platform = "pwa",
  capabilities = {}
} = {}) {
  return {
    type: STUDIO_MSG.HELLO,
    role: STUDIO_ROLE,
    clientId,
    pairCode: pairCode || undefined,
    layoutName: layoutName || undefined,
    platform,
    capabilities: {
      usb: false,
      lan: true,
      webrtc: typeof RTCPeerConnection !== "undefined",
      wakeLock: typeof navigator !== "undefined" && !!navigator.wakeLock,
      ...capabilities
    },
    t: Date.now()
  };
}

export function makeStudioAction({ widgetId, action, value = true, clientId = "" } = {}) {
  if (!widgetId) throw new Error("widgetId requis");
  return {
    type: STUDIO_MSG.ACTION,
    widgetId,
    action: action || "press",
    value,
    clientId: clientId || undefined,
    t: Date.now()
  };
}

export function makeStudioFeedback({ widgetId, value, ok = true, detail = "", rttMs = null } = {}) {
  if (!widgetId) throw new Error("widgetId requis pour feedback");
  return {
    type: STUDIO_MSG.FEEDBACK,
    widgetId,
    value,
    ok: !!ok,
    detail: detail || undefined,
    rttMs: typeof rttMs === "number" ? rttMs : undefined,
    t: Date.now()
  };
}

export function makeStudioLayout(doc, { revision = 0 } = {}) {
  return {
    type: STUDIO_MSG.LAYOUT,
    revision,
    layout: doc,
    t: Date.now()
  };
}

export function makeStudioPing(t = Date.now()) {
  return { type: STUDIO_MSG.PING, t };
}

export function makeStudioPong(t, serverT = Date.now()) {
  return { type: STUDIO_MSG.PONG, t, serverT };
}

/** Measure RTT from ping t → pong (never invent 0). */
export function rttFromPong(pong, now = Date.now()) {
  if (!pong || typeof pong.t !== "number") return null;
  const ms = now - pong.t;
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}
