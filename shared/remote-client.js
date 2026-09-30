/**
 * Client WebSocket partagé (rôle hôte desktop ou télécommande mobile).
 */

import { applyRemoteMessage, projectSignature } from "./remote-protocol.js";
import { validateProject } from "./ir.js";

export function connectRemote({
  url,
  role = "remote",
  clientId = "client",
  getState,
  setState,
  onStatus = () => {},
  onLog = () => {},
  onConflict = null,
  onMessage = null
} = {}) {
  let ws = null;
  let closedByUser = false;
  let retry = 0;
  let timer = null;
  let lastKey = "";
  let applying = false;

  function status(state, detail = "") {
    const key = `${state}|${detail}`;
    if (key === lastKey) return;
    lastKey = key;
    onStatus({ state, detail, url, role });
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function connect() {
    status("connecting", url);
    let socket;
    try {
      socket = new WebSocket(url);
    } catch (e) {
      status("error", e.message || "Erreur réseau WebSocket");
      onLog("Erreur réseau WebSocket");
      schedule();
      return;
    }
    ws = socket;
    const openTimer = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        status("error", "Erreur réseau WebSocket");
        onLog("Erreur réseau WebSocket");
        try { socket.close(); } catch { /* */ }
      }
    }, 2500);
    const stopOpenTimer = () => clearTimeout(openTimer);
    socket.onopen = () => {
      stopOpenTimer();
      retry = 0;
      status("online", "canal ouvert");
      const snap = getState();
      send({
        type: "hello",
        role,
        clientId,
        revision: snap.revision ?? 0,
        project: role === "host" ? snap.project : undefined
      });
    };
    socket.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === "ping") {
        send({ type: "pong", t: msg.t || Date.now() });
        return;
      }
      if (msg.type === "pong") {
        onLog("pong");
        return;
      }
      if (msg.type === "peer-lost") {
        status("lost", msg.message || "Perte du pair");
        onLog(msg.message || "Perte du pair");
        return;
      }
      if (msg.type === "conflict" || (msg.type === "error" && msg.error)) {
        const text = msg.error || msg.message || "Erreur distante";
        onLog(text);
        onConflict?.({ ...msg, error: text });
        status("conflict", text);
        if (msg.project) {
          applying = true;
          setState({ revision: msg.revision, project: validateProject(msg.project), remote: true, conflict: true });
          applying = false;
        }
        return;
      }
      if (msg.type === "op" && role === "host") {
        const cur = getState();
        const result = applyRemoteMessage({ revision: cur.revision, project: cur.project }, msg);
        if (!result.ok) {
          send({
            type: result.conflict ? "conflict" : "error",
            error: result.error,
            revision: cur.revision,
            project: cur.project
          });
          onLog(result.error);
          return;
        }
        applying = true;
        setState({ revision: result.state.revision, project: result.state.project, remote: true });
        applying = false;
        send({ type: "state", revision: result.state.revision, project: result.state.project, source: "host" });
        return;
      }
      if (msg.type === "state" && msg.project) {
        applying = true;
        const outcome = setState({ revision: msg.revision, project: validateProject(msg.project), remote: true });
        applying = false;
        if (outcome?.holdStatus) status(outcome.state || "conflict", outcome.detail || "Conflit");
        else status("online", `révision ${msg.revision}`);
        return;
      }
      onMessage?.(msg);
    };
    socket.onerror = () => {
      stopOpenTimer();
      status("error", "Erreur réseau WebSocket");
      onLog("Erreur réseau WebSocket");
    };
    socket.onclose = () => {
      stopOpenTimer();
      if (ws === socket) ws = null;
      if (closedByUser) {
        status("offline", "Déconnecté");
        return;
      }
      status("lost", "Perte réseau — reconnexion…");
      onLog("Perte réseau");
      schedule();
    };
  }

  function schedule() {
    if (closedByUser) return;
    const delay = Math.min(4000, 400 * (2 ** Math.min(retry, 4)));
    retry += 1;
    clearTimeout(timer);
    timer = setTimeout(connect, delay);
  }

  connect();

  return {
    get online() {
      return ws?.readyState === WebSocket.OPEN;
    },
    get applying() {
      return applying;
    },
    send(obj) { send(obj); },
    sendOp(op) {
      const snap = getState();
      send({ type: "op", baseRevision: snap.revision ?? 0, op, clientId });
    },
    pushState(snap) {
      send({ type: "state", revision: snap.revision, project: snap.project, source: role });
    },
    ping() { send({ type: "ping", t: Date.now() }); },
    close() {
      closedByUser = true;
      clearTimeout(timer);
      try { ws?.close(); } catch { /* */ }
    },
    signature: projectSignature
  };
}
