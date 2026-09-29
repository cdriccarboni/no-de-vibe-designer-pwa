/**
 * Trames WebSocket minimales (texte, ping, close) pour le pont distant.
 * Le serveur envoie des trames non masquées ; le client masque les siennes.
 * Pas de permessage-deflate : l'extension n'est pas renvoyée, donc pas négociée.
 */
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

/**
 * GUID RFC 6455. La clé d'exemple « dGhlIHNhbXBsZSBub25jZQ== »
 * doit produire « s3pPLMBiTxaQ9kYGzzhZRbK+xOo= ».
 * NVD_WS_GUID reste une option de debug, jamais utilisée par les tests.
 */
export const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export function websocketAccept(key, guid = process.env.NVD_WS_GUID || WS_GUID) {
  const chosen = String(guid || WS_GUID).trim() || WS_GUID;
  return crypto.createHash("sha1").update(String(key).trim() + chosen).digest("base64");
}

export function encodeFrame(opcode, payload) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload || "");
  const len = data.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, data]);
}

export function encodeText(str) {
  return encodeFrame(0x1, Buffer.from(String(str), "utf8"));
}

export function encodePong(payload = Buffer.alloc(0)) {
  return encodeFrame(0xa, payload);
}

export function createFrameParser(onFrame) {
  let buf = Buffer.alloc(0);
  return function push(chunk) {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        const big = buf.readBigUInt64BE(2);
        if (big > BigInt(8 * 1024 * 1024)) throw new Error("Trame WebSocket trop grande");
        len = Number(big);
        offset = 10;
      }
      const maskLen = masked ? 4 : 0;
      if (buf.length < offset + maskLen + len) return;
      let payload = buf.subarray(offset + maskLen, offset + maskLen + len);
      if (masked) {
        const mask = buf.subarray(offset, offset + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
      } else {
        payload = Buffer.from(payload);
      }
      buf = buf.subarray(offset + maskLen + len);
      onFrame(opcode, payload);
    }
  };
}
