/**
 * OSC 1.0 — encodage/décodage de messages, sans réseau.
 * Le navigateur n'ouvre pas d'UDP : voir OSC_CAPABILITY.
 */

export const OSC_CAPABILITY = {
  udp: "node-or-electron",
  browser: "websocket-only",
  note: "Le navigateur ne peut pas ouvrir un socket UDP."
};

function pad4(length) {
  return (4 - (length % 4)) % 4;
}

function writeString(parts, text) {
  const bytes = new TextEncoder().encode(text);
  parts.push(bytes);
  const pad = pad4(bytes.length + 1);
  parts.push(new Uint8Array(1 + pad));
}

export function encodeOscMessage(address, args = []) {
  if (typeof address !== "string" || !address.startsWith("/")) {
    throw new Error("Adresse OSC invalide");
  }
  const tags = [","];
  const payloads = [];
  for (const arg of args) {
    if (typeof arg === "number") {
      tags.push("f");
      const buf = new ArrayBuffer(4);
      new DataView(buf).setFloat32(0, arg, false);
      payloads.push(new Uint8Array(buf));
    } else if (typeof arg === "string") {
      tags.push("s");
      const bytes = new TextEncoder().encode(arg);
      const pad = pad4(bytes.length + 1);
      const block = new Uint8Array(bytes.length + 1 + pad);
      block.set(bytes, 0);
      payloads.push(block);
    } else if (arg && arg.type === "i" && Number.isInteger(arg.value)) {
      tags.push("i");
      const buf = new ArrayBuffer(4);
      new DataView(buf).setInt32(0, arg.value, false);
      payloads.push(new Uint8Array(buf));
    } else {
      throw new Error("Type OSC non supporté");
    }
  }
  const parts = [];
  writeString(parts, address);
  writeString(parts, tags.join(""));
  parts.push(...payloads);
  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function readPaddedString(bytes, offset) {
  let end = offset;
  while (end < bytes.length && bytes[end] !== 0) end += 1;
  const text = new TextDecoder().decode(bytes.subarray(offset, end));
  let next = end + 1;
  while (next % 4 !== 0) next += 1;
  return { text, next };
}

export function decodeOscMessage(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const address = readPaddedString(bytes, 0);
  if (!address.text.startsWith("/")) throw new Error("Message OSC illisible");
  const tags = readPaddedString(bytes, address.next);
  if (!tags.text.startsWith(",")) throw new Error("Typetags OSC absents");
  const args = [];
  let cursor = tags.next;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (const tag of tags.text.slice(1)) {
    if (tag === "f") {
      args.push(view.getFloat32(cursor, false));
      cursor += 4;
    } else if (tag === "i") {
      args.push({ type: "i", value: view.getInt32(cursor, false) });
      cursor += 4;
    } else if (tag === "s") {
      const str = readPaddedString(bytes, cursor);
      args.push(str.text);
      cursor = str.next;
    } else {
      throw new Error(`Typetag OSC non supporté : ${tag}`);
    }
  }
  return { address: address.text, args };
}
