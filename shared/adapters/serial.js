/**
 * Web Serial — connexion, lecture ligne à ligne, reconnexion sur ports déjà autorisés.
 * Jamais de faux « online » sans port ouvert.
 */

export class SerialAdapter {
  constructor(onEvent = () => {}) {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.onEvent = onEvent;
    this.reading = false;
    this.baudRate = 115200;
    this.reconnectEnabled = true;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.lastInfo = null;
    this.intentionalClose = false;
  }

  supported() {
    return typeof navigator !== "undefined" && !!navigator.serial;
  }

  async connect({ baudRate = 115200 } = {}) {
    if (!this.supported()) throw new Error("Web Serial indisponible");
    this.baudRate = baudRate;
    this.intentionalClose = false;
    const port = await navigator.serial.requestPort();
    await this._openPort(port);
    return port;
  }

  /**
   * Rouvre un port déjà autorisé (sans dialogue) si disponible.
   * @returns {Promise<object|null>} port ouvert ou null si aucun candidat
   */
  async reconnect({ baudRate } = {}) {
    if (!this.supported()) throw new Error("Web Serial indisponible");
    if (this.port?.readable) return this.port;
    this.intentionalClose = false;
    if (baudRate) this.baudRate = baudRate;
    const ports = await navigator.serial.getPorts();
    if (!ports.length) {
      this.onEvent({ type: "serial-state", state: "offline", reason: "no-authorized-port" });
      return null;
    }
    let candidate = ports[0];
    if (this.lastInfo) {
      const match = ports.find(p => samePortInfo(p.getInfo?.() || {}, this.lastInfo));
      if (match) candidate = match;
    }
    await this._openPort(candidate);
    return candidate;
  }

  async _openPort(port) {
    await port.open({ baudRate: this.baudRate });
    this.port = port;
    this.writer = port.writable?.getWriter?.() || null;
    this.lastInfo = port.getInfo?.() || {};
    this.reconnectAttempts = 0;
    this.onEvent({ type: "serial-state", state: "online", info: this.lastInfo });
    this.readLoop();
  }

  scheduleReconnect() {
    if (!this.reconnectEnabled || this.intentionalClose || this.reconnectTimer) return;
    if (!this.supported()) return;
    const delay = Math.min(15000, 800 * (2 ** Math.min(this.reconnectAttempts, 4)));
    this.reconnectAttempts += 1;
    this.onEvent({ type: "serial-state", state: "reconnecting", attempt: this.reconnectAttempts, delay });
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        const port = await this.reconnect();
        if (!port) this.scheduleReconnect();
      } catch (e) {
        this.onEvent({ type: "serial-error", error: String(e?.message || e) });
        this.scheduleReconnect();
      }
    }, delay);
  }

  async readLoop() {
    if (!this.port?.readable || this.reading) return;
    this.reading = true;
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (this.port?.readable) {
        this.reader = this.port.readable.getReader();
        try {
          while (true) {
            const { value, done } = await this.reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || "";
            for (const line of lines) {
              const clean = line.trim();
              if (clean) this.onEvent({ type: "serial-line", line: clean });
            }
          }
        } finally {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    } catch (e) {
      this.onEvent({ type: "serial-error", error: String(e?.message || e) });
    }
    this.reading = false;
    if (!this.intentionalClose) {
      this.onEvent({ type: "serial-state", state: "offline", reason: "disconnect" });
      try { await this.port?.close(); } catch { /* */ }
      this.port = null;
      this.writer = null;
      this.scheduleReconnect();
    }
  }

  async send(text) {
    if (!this.port?.writable) throw new Error("Port série non connecté");
    const writer = this.writer || this.port.writable.getWriter();
    const own = !this.writer;
    const payload = String(text).endsWith("\n") ? String(text) : `${String(text)}\n`;
    await writer.write(new TextEncoder().encode(payload));
    if (own) writer.releaseLock();
    this.onEvent({ type: "serial-out", text: String(text) });
  }

  async disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try { await this.reader?.cancel(); } catch { /* */ }
    try { this.writer?.releaseLock(); } catch { /* */ }
    this.reader = null;
    this.writer = null;
    try { await this.port?.close(); } catch { /* */ }
    this.port = null;
    this.onEvent({ type: "serial-state", state: "offline", reason: "user" });
  }
}

function samePortInfo(a, b) {
  if (!a || !b) return false;
  if (a.usbVendorId != null && b.usbVendorId != null) {
    return a.usbVendorId === b.usbVendorId && a.usbProductId === b.usbProductId;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}
