/**
 * WebSocket CompanionTransport — reuses No-de remote bridge (LAN / localhost).
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
  onLog = () => {}
} = {}) {
  if (!url) throw new Error("URL WebSocket Companion requise");
  let ws = null;
  let pingTimer = null;
  let hooks = { setState: () => {}, setRtt: () => {} };
  let closedByUser = false;

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
      await new Promise((resolve, reject) => {
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
          api.setState(TRANSPORT_STATES.CONNECTED);
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
        ws.onclose = () => {
          clearPing();
          if (closedByUser) api.setState(TRANSPORT_STATES.DISCONNECTED);
          else api.setState(TRANSPORT_STATES.RECONNECTING);
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
    },
    disconnect() {
      closedByUser = true;
      clearPing();
      try { ws?.close(); } catch { /* */ }
      ws = null;
    },
    send(msg) {
      if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error("Companion WS fermé");
      ws.send(JSON.stringify(msg));
    }
  });

  transport.onLog = onLog;
  return transport;
}
