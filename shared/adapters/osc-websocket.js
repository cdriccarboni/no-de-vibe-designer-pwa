/**
 * OSC sur WebSocket : paquets OSC 1.0 binaires (encodeOscMessage) dans des trames WebSocket binaires,
 * compatible avec les passerelles OSC↔WS usuelles (osc.js WebSocketPort, Open Stage Control, TouchOSC Bridge…).
 * Le navigateur ne fait pas d'UDP : une passerelle WS est nécessaire. `WebSocketImpl` est injectable (mocks).
 */
import { encodeOscMessage, decodeOscMessage } from "../protocols/osc.js";

export class OscWebSocket {
  constructor({ url, WebSocketImpl = globalThis.WebSocket, onMessage = () => {}, onState = () => {} } = {}) {
    this.url = url; this.WS = WebSocketImpl; this.onMessage = onMessage; this.onState = onState;
    this.socket = null; this.sent = 0; this.received = 0;
  }
  connect(timeoutMs = 4000) {
    if (typeof this.WS !== "function") return Promise.reject(new Error("WebSocket indisponible"));
    return new Promise((resolve, reject) => {
      const ws = new this.WS(this.url); this.socket = ws; ws.binaryType = "arraybuffer";
      const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error("Timeout OSC WebSocket")); }, timeoutMs);
      ws.onopen = () => { clearTimeout(timer); this.onState("online"); resolve(this); };
      ws.onerror = () => { this.onState("error"); };
      ws.onclose = () => { clearTimeout(timer); this.onState("offline"); };
      ws.onmessage = e => {
        if (typeof e.data === "string") return; // texte ignoré : seuls les paquets OSC binaires comptent
        try { const msg = decodeOscMessage(new Uint8Array(e.data)); this.received++; this.onMessage(msg); }
        catch (err) { this.onState(`paquet OSC invalide : ${err.message || err}`); }
      };
    });
  }
  send(address, args = []) {
    if (!this.socket || this.socket.readyState !== 1) throw new Error("OSC WebSocket non connecté");
    const bytes = encodeOscMessage(address, Array.isArray(args) ? args : [args]);
    this.socket.send(bytes); this.sent++; return bytes.length;
  }
  close() { try { this.socket?.close(); } catch {} this.socket = null; }
}
