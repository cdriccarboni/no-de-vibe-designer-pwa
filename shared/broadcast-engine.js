/**
 * Broadcast / Radio engine — dormant until a Radio Out node is explicitly put ON AIR.
 * Primary transport: secure WebSocket relay carrying MediaRecorder WebM/Opus.
 * WHIP remains available as an alternate transport.
 */
function waitForIceComplete(pc, timeoutMs = 2500) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      pc.removeEventListener("icegatheringstatechange", onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export class BroadcastEngine {
  constructor() {
    this.sessions = new Map();
  }

  state(nodeId) {
    return this.sessions.get(nodeId)?.state || {
      phase: "standby",
      live: false,
      detail: "STANDBY",
      endpoint: ""
    };
  }

  async startRelay(nodeId, stream, {
    endpoint = "",
    token = "",
    metadata = {},
    audioBitsPerSecond = 128000,
    chunkMs = 250
  } = {}) {
    if (!nodeId) throw new Error("Radio Out : nodeId manquant");
    if (!endpoint) throw new Error("Radio Out : endpoint relais manquant");
    if (!stream?.getAudioTracks?.().length) throw new Error("Radio Out : aucun flux audio entrant");
    if (typeof WebSocket === "undefined") throw new Error("Radio Out : WebSocket indisponible");
    if (typeof MediaRecorder === "undefined") throw new Error("Radio Out : MediaRecorder indisponible");

    const current = this.sessions.get(nodeId);
    if (current?.state?.live || current?.state?.phase === "connecting") return current.state;
    await this.stop(nodeId);

    const url = new URL(endpoint);
    if (token) url.searchParams.set("token", token);
    const ws = new WebSocket(url.toString());
    ws.binaryType = "arraybuffer";

    const hasVideo = stream.getVideoTracks?.().length > 0;
    const mimeCandidates = hasVideo
      ? ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm", ""]
      : ["audio/webm;codecs=opus", "audio/webm", "video/webm;codecs=opus", ""];
    const mimeType = mimeCandidates.find(type => !type || MediaRecorder.isTypeSupported?.(type)) || "";
    const recorderOptions = { audioBitsPerSecond: Math.max(64000, Math.min(256000, Number(audioBitsPerSecond) || 128000)) };
    if (mimeType) recorderOptions.mimeType = mimeType;

    const session = {
      ws,
      recorder: null,
      sendChain: Promise.resolve(),
      state: {
        phase: "connecting",
        live: false,
        detail: "CONNEXION RELAIS…",
        endpoint,
        startedAt: 0,
        metadata: { ...metadata }
      }
    };
    this.sessions.set(nodeId, session);

    return await new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error) => {
        const message = error?.message || String(error || "connexion relais impossible");
        session.state = { ...session.state, phase: "error", live: false, detail: `ERREUR · ${message}` };
        try { session.recorder?.stop(); } catch { /* noop */ }
        try { ws.close(); } catch { /* noop */ }
        if (!settled) {
          settled = true;
          reject(error instanceof Error ? error : new Error(message));
        }
      };

      ws.addEventListener("open", () => {
        try {
          ws.send(JSON.stringify({
            type: "hello",
            media: hasVideo ? "video" : "audio",
            station: metadata?.station || "",
            show: metadata?.show || ""
          }));
          const recorder = new MediaRecorder(stream, recorderOptions);
          session.recorder = recorder;
          recorder.addEventListener("dataavailable", event => {
            if (!event.data?.size || ws.readyState !== WebSocket.OPEN) return;
            session.sendChain = session.sendChain
              .then(() => event.data.arrayBuffer())
              .then(buffer => {
                if (buffer.byteLength && ws.readyState === WebSocket.OPEN) ws.send(buffer);
              })
              .catch(() => {});
          });
          recorder.addEventListener("error", event => fail(event.error || new Error("Erreur encodeur audio")));
          recorder.start(Math.max(100, Number(chunkMs) || 250));
          session.state = {
            ...session.state,
            phase: "live",
            live: true,
            detail: "ON AIR",
            startedAt: Date.now(),
            mimeType: recorder.mimeType || mimeType || (hasVideo ? "video/webm" : "audio/webm"),
            media: hasVideo ? "video" : "audio"
          };
          if (!settled) {
            settled = true;
            resolve(session.state);
          }
        } catch (error) {
          fail(error);
        }
      }, { once: true });

      ws.addEventListener("error", () => fail(new Error("Connexion relais refusée")));
      ws.addEventListener("close", event => {
        try {
          if (session.recorder?.state && session.recorder.state !== "inactive") session.recorder.stop();
        } catch { /* noop */ }
        if (this.sessions.get(nodeId) === session) {
          session.state = {
            ...session.state,
            phase: "standby",
            live: false,
            detail: event.code === 1000 ? "STANDBY" : `COUPÉ · ${event.code || "réseau"}`
          };
        }
        if (!settled) fail(new Error(`Relais fermé · ${event.code || "réseau"}`));
      });
    });
  }

  async startWhip(nodeId, stream, {
    endpoint = "",
    token = "",
    iceServers = [],
    metadata = {}
  } = {}) {
    if (!nodeId) throw new Error("Radio Out : nodeId manquant");
    if (!endpoint) throw new Error("Radio Out : endpoint WHIP manquant");
    if (!stream?.getAudioTracks?.().length) throw new Error("Radio Out : aucun flux audio entrant");

    const current = this.sessions.get(nodeId);
    if (current?.state?.live || current?.state?.phase === "connecting") return current.state;
    await this.stop(nodeId);

    if (typeof RTCPeerConnection === "undefined") {
      throw new Error("Radio Out : WebRTC indisponible sur cette plateforme");
    }
    if (typeof fetch === "undefined") {
      throw new Error("Radio Out : fetch indisponible sur cette plateforme");
    }

    const pc = new RTCPeerConnection({ iceServers: Array.isArray(iceServers) ? iceServers : [] });
    for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);

    const session = {
      pc,
      resourceUrl: "",
      controller: new AbortController(),
      state: {
        phase: "connecting",
        live: false,
        detail: "CONNEXION…",
        endpoint,
        startedAt: 0,
        metadata: { ...metadata }
      }
    };
    this.sessions.set(nodeId, session);

    pc.addEventListener("connectionstatechange", () => {
      const state = pc.connectionState;
      if (state === "connected") {
        session.state = {
          ...session.state,
          phase: "live",
          live: true,
          detail: "ON AIR",
          startedAt: session.state.startedAt || Date.now()
        };
      } else if (state === "failed" || state === "disconnected" || state === "closed") {
        session.state = {
          ...session.state,
          phase: state === "closed" ? "standby" : "error",
          live: false,
          detail: state === "closed" ? "STANDBY" : `ERREUR · ${state}`
        };
      }
    });

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      await waitForIceComplete(pc);
      const localSdp = pc.localDescription?.sdp || offer.sdp;

      const headers = { "Content-Type": "application/sdp", "Accept": "application/sdp" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: localSdp,
        signal: session.controller.signal
      });
      if (!response.ok) throw new Error(`WHIP HTTP ${response.status}`);
      const answerSdp = await response.text();
      const location = response.headers.get("Location");
      if (location) session.resourceUrl = new URL(location, endpoint).toString();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      session.state = {
        ...session.state,
        phase: pc.connectionState === "connected" ? "live" : "connecting",
        live: pc.connectionState === "connected",
        detail: pc.connectionState === "connected" ? "ON AIR" : "CONNEXION…",
        startedAt: pc.connectionState === "connected" ? Date.now() : 0
      };
      return session.state;
    } catch (error) {
      session.state = {
        ...session.state,
        phase: "error",
        live: false,
        detail: `ERREUR · ${error?.message || error}`
      };
      try { pc.close(); } catch { /* noop */ }
      throw error;
    }
  }

  async stop(nodeId) {
    const session = this.sessions.get(nodeId);
    if (!session) return { phase: "standby", live: false, detail: "STANDBY" };
    this.sessions.delete(nodeId);
    try { session.controller?.abort(); } catch { /* noop */ }
    try {
      if (session.recorder?.state && session.recorder.state !== "inactive") {
        session.recorder.requestData?.();
        session.recorder.stop();
      }
    } catch { /* noop */ }
    try {
      if (session.ws?.readyState === WebSocket.OPEN || session.ws?.readyState === WebSocket.CONNECTING) {
        session.ws.close(1000, "standby");
      }
    } catch { /* noop */ }
    try {
      if (session.resourceUrl && typeof fetch !== "undefined") {
        const headers = {};
        await fetch(session.resourceUrl, { method: "DELETE", headers }).catch(() => {});
      }
    } catch { /* noop */ }
    try { session.pc?.close(); } catch { /* noop */ }
    return { phase: "standby", live: false, detail: "STANDBY" };
  }

  async stopAll() {
    await Promise.all([...this.sessions.keys()].map(id => this.stop(id)));
  }
}

export const sharedBroadcast = new BroadcastEngine();
