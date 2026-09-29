/**
 * CompanionTransport — editor-independent link abstraction.
 * Priority intent: USB → LAN → WebRTC → local WS.
 * P0: WS works. Others report PLATFORM-LIMITED until wired.
 */

export const TRANSPORT_KINDS = Object.freeze({
  USB: "usb",
  LAN: "lan",
  WEBRTC: "webrtc",
  WS: "ws",
  LOCAL: "local"
});

export const TRANSPORT_STATES = Object.freeze({
  IDLE: "IDLE",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  RECONNECTING: "RECONNECTING",
  DISCONNECTED: "DISCONNECTED",
  UNAVAILABLE: "UNAVAILABLE"
});

/**
 * @param {{ kind: string, connect: Function, disconnect: Function, send: Function }} impl
 */
export function createCompanionTransport(impl) {
  if (!impl?.kind || typeof impl.connect !== "function" || typeof impl.send !== "function") {
    throw new Error("CompanionTransport incomplet");
  }
  let state = TRANSPORT_STATES.IDLE;
  let lastRttMs = null;
  let quality = "unknown";
  const listeners = new Set();

  function setState(next, detail = {}) {
    state = next;
    for (const fn of listeners) fn({ state, lastRttMs, quality, ...detail });
  }

  return {
    get kind() { return impl.kind; },
    get state() { return state; },
    get lastRttMs() { return lastRttMs; },
    get quality() { return quality; },
    statusLine() {
      if (state === TRANSPORT_STATES.UNAVAILABLE) {
        return `${impl.kind.toUpperCase()} · PLATFORM-LIMITED`;
      }
      if (state !== TRANSPORT_STATES.CONNECTED) return `${impl.kind.toUpperCase()} · ${state}`;
      if (lastRttMs == null) return `${impl.kind.toUpperCase()} · CONNECTED · RTT n/a`;
      const q = lastRttMs < 20 ? "Stable" : lastRttMs < 80 ? "OK" : "Lent";
      quality = q;
      return `LAN · ${Math.round(lastRttMs)} ms · ${q}`;
    },
    onStatus(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setRtt(ms) {
      if (typeof ms === "number" && Number.isFinite(ms) && ms >= 0) lastRttMs = ms;
      else lastRttMs = null;
      setState(state);
    },
    async connect(opts) {
      setState(TRANSPORT_STATES.CONNECTING);
      try {
        await impl.connect(opts, { setState, setRtt: (ms) => this.setRtt(ms) });
        if (state === TRANSPORT_STATES.CONNECTING) setState(TRANSPORT_STATES.CONNECTED);
      } catch (e) {
        setState(TRANSPORT_STATES.UNAVAILABLE, { error: e.message || String(e) });
        throw e;
      }
    },
    disconnect() {
      try { impl.disconnect?.(); } catch { /* */ }
      setState(TRANSPORT_STATES.DISCONNECTED);
    },
    send(msg) {
      if (state !== TRANSPORT_STATES.CONNECTED && state !== TRANSPORT_STATES.CONNECTING) {
        throw new Error(`Transport ${impl.kind} non connecté (${state})`);
      }
      return impl.send(msg);
    },
    /** Feature matrix — honest. */
    capabilities() {
      return impl.capabilities?.() || { kind: impl.kind, ready: state === TRANSPORT_STATES.CONNECTED };
    }
  };
}

export function createUnavailableTransport(kind, reason) {
  return createCompanionTransport({
    kind,
    capabilities: () => ({ kind, ready: false, status: "PLATFORM-LIMITED", reason }),
    async connect() {
      throw new Error(`${kind.toUpperCase()} · PLATFORM-LIMITED · ${reason}`);
    },
    disconnect() {},
    send() {
      throw new Error(`${kind.toUpperCase()} indisponible`);
    }
  });
}

/** Pick best available: prefer explicit WS/LAN URL; USB/WebRTC stubbed. */
export function selectCompanionTransport({ wsUrl = "", prefer = [] } = {}) {
  const order = prefer.length ? prefer : [TRANSPORT_KINDS.USB, TRANSPORT_KINDS.LAN, TRANSPORT_KINDS.WEBRTC, TRANSPORT_KINDS.WS];
  const available = [];
  for (const kind of order) {
    if (kind === TRANSPORT_KINDS.USB) {
      available.push(createUnavailableTransport(TRANSPORT_KINDS.USB, "WebUSB Companion non branché / non détecté"));
      continue;
    }
    if (kind === TRANSPORT_KINDS.WEBRTC) {
      available.push(createUnavailableTransport(TRANSPORT_KINDS.WEBRTC, "Studio datachannel WebRTC pas encore câblé (Remote Camera PeerJS reste séparé)"));
      continue;
    }
    if ((kind === TRANSPORT_KINDS.LAN || kind === TRANSPORT_KINDS.WS) && wsUrl) {
      // Caller wires concrete WS impl via createWsCompanionTransport
      available.push({ kind, needsWs: true, wsUrl });
      continue;
    }
  }
  return available;
}
