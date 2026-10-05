/**
 * PeerJS video session — adapted from ART `app/intercom.tsx` MediaConnection lifecycle.
 * Desktop = host (answer). Phone = caller (getUserMedia + call). Video-only.
 * LIVE only after FIRST_FRAME watcher fires.
 */

import { RC_STATES, remoteCameraHostId, makeRoomCode } from "./states.js";
import { createRcMetrics } from "./metrics.js";
import { openCamera, stopStream } from "./camera.js";

async function loadPeerCtor() {
  if (typeof window !== "undefined" && window.Peer) return window.Peer;
  if (typeof window !== "undefined" && typeof window.__nvdLoadPeer === "function") {
    return await window.__nvdLoadPeer();
  }
  throw new Error("PeerJS indisponible — connexion distante impossible hors-ligne");
}

function watchFirstFrame(stream, videoEl, onFirstFrame) {
  let seen = false;
  const track = stream?.getVideoTracks?.()?.[0];
  if (!track) return () => {};

  const fire = (via) => {
    if (seen) return;
    seen = true;
    onFirstFrame({ stream, via });
  };

  if (videoEl) {
    videoEl.srcObject = stream;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.play?.().catch?.(() => {});
    if (typeof videoEl.requestVideoFrameCallback === "function") {
      videoEl.requestVideoFrameCallback(() => fire("rvfc"));
      return () => { seen = true; };
    }
  }

  let raf = 0;
  const tick = () => {
    if (seen) return;
    if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
      fire("readyState");
      return;
    }
    // Fallback: track unmuted + live
    if (track.readyState === "live" && !track.muted) {
      fire("track-live");
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    seen = true;
    if (raf) cancelAnimationFrame(raf);
  };
}

/**
 * @param {"host"|"phone"} role
 */
export function createRemoteCameraSession({
  role = "host",
  room = "",
  onState = () => {},
  onStream = () => {},
  onLog = () => {},
  videoEl = null,
  peerOptions = undefined
} = {}) {
  const metrics = createRcMetrics();
  let state = RC_STATES.WAITING;
  let error = null;
  let peer = null;
  let localStream = null;
  let remoteStream = null;
  let callRef = null;
  let dataConnections = new Map();
  let pingTimer = null;
  let roomCode = room || makeRoomCode();
  let leaving = false;
  let stopWatch = null;
  let reconnectTimer = null;

  function setState(next, detail = {}) {
    state = next;
    metrics.mark(next, detail);
    onState({ state, error, room: roomCode, peerId: peer?.id || null, metrics: metrics.snapshot(), ...detail });
  }

  function clearCall() {
    try { callRef?.close?.(); } catch { /* */ }
    callRef = null;
  }

  function handleData(raw, conn) {
    if (!raw || typeof raw !== "object" || !raw.type) return;
    if (raw.type === "ping" && typeof raw.sentAt === "number") {
      if (conn?.open) conn.send({ type: "pong", sentAt: raw.sentAt });
      return;
    }
    if (raw.type === "pong" && typeof raw.sentAt === "number") {
      const rtt = Math.max(0, Date.now() - raw.sentAt);
      metrics.setRtt(rtt);
      onState({ state, error, room: roomCode, peerId: peer?.id || null, metrics: metrics.snapshot(), rttMs: rtt });
    }
  }

  function attachDataConnection(conn) {
    const prev = dataConnections.get(conn.peer);
    if (prev && prev !== conn) {
      try { prev.close(); } catch { /* */ }
    }
    dataConnections.set(conn.peer, conn);
    conn.on("data", (raw) => handleData(raw, conn));
    conn.on("close", () => dataConnections.delete(conn.peer));
    conn.on("error", () => dataConnections.delete(conn.peer));
  }

  function startPingProbe() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      const sentAt = Date.now();
      for (const conn of dataConnections.values()) {
        if (conn?.open) {
          try { conn.send({ type: "ping", sentAt }); } catch { /* */ }
        }
      }
    }, 1200);
  }

  function clearDataConnections() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
    for (const conn of dataConnections.values()) {
      try { conn.close(); } catch { /* */ }
    }
    dataConnections.clear();
  }

  function attachCall(call, { answerWith = null } = {}) {
    // ART intercom: never attach the same peer twice
    if (callRef && callRef.peer === call.peer) {
      try { call.close(); } catch { /* */ }
      return;
    }
    clearCall();
    callRef = call;
    if (answerWith) call.answer(answerWith);
    call.on("stream", (stream) => {
      remoteStream = stream;
      setState(RC_STATES.PEER_CONNECTED, { peerId: call.peer });
      onStream(stream);
      stopWatch?.();
      stopWatch = watchFirstFrame(stream, videoEl, ({ via }) => {
        metrics.mark("FIRST_FRAME", { via });
        setState(RC_STATES.FIRST_FRAME, { via });
        setState(RC_STATES.LIVE, { via });
        onLog("Remote Camera · FIRST_FRAME → LIVE");
      });
    });
    call.on("close", () => {
      if (leaving) return;
      remoteStream = null;
      setState(RC_STATES.DISCONNECTED);
      scheduleReconnect();
    });
    call.on("error", () => {
      error = "Liaison vidéo interrompue";
      setState(RC_STATES.ERROR, { error });
    });
  }

  function scheduleReconnect() {
    if (leaving || role !== "phone" || reconnectTimer) return;
    setState(RC_STATES.RECONNECTING);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (leaving || !peer || peer.destroyed) return;
      if (peer.disconnected) {
        try { peer.reconnect(); } catch { /* */ }
      }
      if (localStream && peer.open && peer.id) {
        const hostId = remoteCameraHostId(roomCode);
        if (!callRef) {
          setState(RC_STATES.CONNECTING);
          attachCall(peer.call(hostId, localStream, { metadata: { nvdRemoteCamera: "2.2" } }));
        }
      }
    }, 1600);
  }

  async function startHost() {
    leaving = false;
    error = null;
    setState(RC_STATES.QR_OPEN);
    const Peer = await loadPeerCtor();
    const hostId = remoteCameraHostId(roomCode);
    peer = peerOptions ? new Peer(hostId, peerOptions) : new Peer(hostId);
    peer.on("open", (id) => {
      onLog(`Remote Camera host · ${id}`);
      setState(RC_STATES.WAITING, { peerId: id });
    });
    peer.on("call", (call) => {
      // Host does not send local camera — answer with empty / recvonly style: answer() without stream
      setState(RC_STATES.CONNECTING);
      attachCall(call, { answerWith: undefined });
    });
    peer.on("connection", (conn) => {
      attachDataConnection(conn);
      startPingProbe();
    });
    peer.on("disconnected", () => {
      if (leaving || peer.destroyed) return;
      setState(RC_STATES.RECONNECTING);
      setTimeout(() => { if (!peer.destroyed) peer.reconnect(); }, 1200);
    });
    peer.on("error", (err) => {
      error = err?.type === "unavailable-id"
        ? "Code déjà pris — régénère le QR"
        : (err?.message || "Connexion PeerJS impossible");
      setState(RC_STATES.ERROR, { error });
    });
    return { room: roomCode, hostId };
  }

  async function startPhone({ deviceId = "", facingMode = "environment" } = {}) {
    leaving = false;
    error = null;
    setState(RC_STATES.CAMERA_PERMISSION);
    localStream = await openCamera({ deviceId, facingMode });
    setState(RC_STATES.CAMERA_READY);
    const Peer = await loadPeerCtor();
    peer = peerOptions ? new Peer(peerOptions) : new Peer();
    setState(RC_STATES.CONNECTING);
    peer.on("open", () => {
      const hostId = remoteCameraHostId(roomCode);
      onLog(`Remote Camera phone → ${hostId}`);
      attachCall(peer.call(hostId, localStream, { metadata: { nvdRemoteCamera: "2.2" } }));
      try {
        const conn = peer.connect(hostId, { reliable: true });
        attachDataConnection(conn);
        conn.on("open", startPingProbe);
      } catch { /* data channel RTT is optional; media stays primary */ }
    });
    peer.on("disconnected", () => {
      if (leaving || peer.destroyed) return;
      setState(RC_STATES.RECONNECTING);
      setTimeout(() => { if (!peer.destroyed) peer.reconnect(); }, 1200);
      scheduleReconnect();
    });
    peer.on("error", (err) => {
      error = err?.message || "Connexion PeerJS impossible";
      setState(RC_STATES.ERROR, { error });
      scheduleReconnect();
    });
  }

  function stop() {
    leaving = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    stopWatch?.();
    stopWatch = null;
    clearCall();
    clearDataConnections();
    try { peer?.destroy?.(); } catch { /* */ }
    peer = null;
    stopStream(localStream);
    localStream = null;
    remoteStream = null;
    metrics.reset();
    setState(RC_STATES.DISCONNECTED);
  }

  return {
    get state() { return state; },
    get error() { return error; },
    get room() { return roomCode; },
    get localStream() { return localStream; },
    get remoteStream() { return remoteStream; },
    get metrics() { return metrics; },
    setRoom(code) { roomCode = String(code || makeRoomCode()).toUpperCase(); },
    startHost,
    startPhone,
    stop,
    snapshot: () => metrics.snapshot()
  };
}

export { makeRoomCode, remoteCameraHostId, RC_STATES };
