/**
 * WebSocket CompanionTransport — reuses No[co]de remote bridge (LAN / localhost).
 */

import { createCompanionTransport, TRANSPORT_KINDS, TRANSPORT_STATES } from "./transport.js";
import {
  STUDIO_MSG,
  makeStudioHello,
  makeStudioPing,
  rttFromPong
} from "./protocol.js";

export function createWsCompanionTransport({
  url,
  clientId = "companion-studio",
  pairCode = "",
  onMessage = () => {},
  onLog = () => {},
  reconnect = true,
  maxBackoffMs = 8000
} = {}) {
  if (!url) throw new Error("URL WebSocket Companion requise");
  let ws = null;
  let pingTimer = null;
  let hooks = { setState: () => {}, setRtt: () => {} };
  let closedByUser = false;
  let retryTimer = null;
  let attempt = 0;
  let refused = false;

  function clearRetry() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  }

  // Reconnexion automatique : coupure Wi-Fi, redémarrage de la régie, veille du téléphone.
  // Jamais après une déconnexion volontaire ni après un refus d'appairage (4401) :
  // retenter un mauvais code ne ferait que déclencher la limitation du pont.
  function scheduleReconnect() {
    if (!reconnect || closedByUser || refused || retryTimer) return;
    attempt += 1;
    const delay = Math.min(maxBackoffMs, 500 * 2 ** Math.min(attempt - 1, 5));
    hooks.setState(TRANSPORT_STATES.RECONNECTING, { retryInMs: delay, attempt });
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (closedByUser) return;
      open().catch(() => scheduleReconnect());
    }, delay);
  }

  function clearPing() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  }

  const transport = createCompanionTransport({
    kind: TRANSPORT_KINDS.WS,
    capabilities: () => ({
      kind: TRANSPORT_KINDS.WS,
      ready: transport.state === TRANSPORT_STATES.CONNECTED,
      url,
      status: "available"
    }),
    async connect(_opts, api) {
      hooks = api;
      closedByUser = false;
      refused = false;
      attempt = 0;
      clearRetry();
      await open();
    },
    disconnect() {
      closedByUser = true;
      clearRetry();
      clearPing();
      try { ws?.close(); } catch { /* */ }
      ws = null;
    },
    send(msg) {
      if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error("Companion WS fermé");
      ws.send(JSON.stringify(msg));
    }
  });

  function open() {
    const api = hooks;
      return new Promise((resolve, reject) => {
        let settled = false;
        try {
          ws = new WebSocket(url);
        } catch (e) {
          reject(e);
          return;
        }
        const failTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            try { ws.close(); } catch { /* */ }
            reject(new Error("Timeout connexion Companion WS"));
          }
        }, 4000);
        ws.onopen = () => {
          clearTimeout(failTimer);
          settled = true;
          const wasRetry = attempt > 0;
          attempt = 0;
          api.setState(TRANSPORT_STATES.CONNECTED, { reconnected: wasRetry });
          ws.send(JSON.stringify(makeStudioHello({ clientId, pairCode, platform: "studio" })));
          // also speak classic hello so bridge knows a peer exists
          ws.send(JSON.stringify({ type: "hello", role: "companion", clientId, revision: 0 }));
          clearPing();
          pingTimer = setInterval(() => {
            try {
              if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(makeStudioPing()));
            } catch { /* */ }
          }, 2000);
          resolve();
        };
        ws.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(failTimer);
            reject(new Error("Erreur réseau Companion WS"));
          }
        };
        ws.onclose = (ev) => {
          clearPing();
          if (ev?.code === 4401) {
            refused = true;
            api.setState(TRANSPORT_STATES.DISCONNECTED, { error: "Code d'appairage refusé — rescanne le QR de la régie" });
            return;
          }
          if (closedByUser) api.setState(TRANSPORT_STATES.DISCONNECTED);
          else if (settled) scheduleReconnect();
        };
        ws.onmessage = (ev) => {
          let msg;
          try { msg = JSON.parse(ev.data); } catch { return; }
          if (msg.type === STUDIO_MSG.PONG || msg.type === "pong") {
            const rtt = rttFromPong(msg);
            if (rtt != null) api.setRtt(rtt);
            return;
          }
          if (msg.type === STUDIO_MSG.PING || msg.type === "ping") {
            try {
              ws.send(JSON.stringify({ type: STUDIO_MSG.PONG, t: msg.t, serverT: Date.now() }));
            } catch { /* */ }
            return;
          }
          onMessage(msg);
        };
      });
  }

  transport.onLog = onLog;
  return transport;
}
