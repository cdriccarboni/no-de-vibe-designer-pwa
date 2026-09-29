/**
 * Client WebSocket minimal. Le Sec-WebSocket-Accept attendu est celui de la RFC 6455.
 */
import net from "node:net";
import crypto from "node:crypto";
import { createFrameParser, websocketAccept } from "./ws-frames.mjs";

function encodeClientText(str) {
  const payload = Buffer.from(String(str));
  const mask = crypto.randomBytes(4);
  const masked = Buffer.from(payload);
  for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i % 4];
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, 0x80 | payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    throw new Error("Message WebSocket trop long");
  }
  return Buffer.concat([header, mask, masked]);
}

export function openSocket(url) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString("base64");
    const expected = websocketAccept(key);
    const socket = net.connect(Number(target.port), target.hostname);
    let headerBuf = Buffer.alloc(0);
    let established = false;
    const listeners = new Set();
    const parser = createFrameParser((opcode, payload) => {
      if (opcode === 0x1) {
        const text = payload.toString("utf8");
        for (const fn of listeners) fn(text);
      }
    });
    const api = {
      send(value) {
        const text = typeof value === "string" ? value : JSON.stringify(value);
        socket.write(encodeClientText(text));
      },
      onMessage(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      close() {
        try { socket.destroy(); } catch { /* */ }
      }
    };
    socket.on("error", (err) => {
      if (!established) reject(err);
    });
    socket.on("data", (chunk) => {
      if (!established) {
        headerBuf = Buffer.concat([headerBuf, chunk]);
        const sep = headerBuf.indexOf("\r\n\r\n");
        if (sep < 0) return;
        const header = headerBuf.subarray(0, sep).toString("utf8");
        const rest = headerBuf.subarray(sep + 4);
        const accept = header.match(/Sec-WebSocket-Accept:\s*(\S+)/i)?.[1];
        if (!header.startsWith("HTTP/1.1 101") || accept !== expected) {
          socket.destroy();
          reject(new Error(`Poignée WebSocket refusée (${accept || "sans accept"})`));
          return;
        }
        established = true;
        if (rest.length) parser(rest);
        resolve(api);
        return;
      }
      parser(chunk);
    });
    socket.write(
      `GET ${target.pathname || "/"} HTTP/1.1\r\n` +
      `Host: ${target.host}\r\n` +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Key: ${key}\r\n` +
      "Sec-WebSocket-Version: 13\r\n\r\n"
    );
  });
}
