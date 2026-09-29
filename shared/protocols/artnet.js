/**
 * Art-Net 4 — paquet DMX OpOutput (0x5000), sans réseau.
 */

export const ARTNET_CAPABILITY = {
  udp: "node-or-electron",
  browser: "websocket-only",
  note: "Le navigateur ne peut pas ouvrir un socket UDP Art-Net."
};

const HEADER = new TextEncoder().encode("Art-Net\0");

export function encodeArtNetDmx({ universe = 0, data, sequence = 0, physical = 0 } = {}) {
  const uni = Math.max(0, Math.min(32767, Number(universe) || 0));
  let payload;
  if (data instanceof Uint8Array) payload = data;
  else if (Array.isArray(data)) payload = Uint8Array.from(data.map(v => Math.max(0, Math.min(255, Number(v) || 0))));
  else throw new Error("Art-Net : données DMX manquantes");
  if (payload.length < 2 || payload.length > 512) throw new Error("Art-Net : longueur DMX invalide (2–512)");
  if (payload.length % 2 === 1) {
    const padded = new Uint8Array(payload.length + 1);
    padded.set(payload);
    payload = padded;
  }
  const packet = new Uint8Array(18 + payload.length);
  packet.set(HEADER, 0);
  packet[8] = 0x00; // OpCode lo
  packet[9] = 0x50; // OpCode hi — OpDmx
  packet[10] = 0; // ProtVer Hi
  packet[11] = 14; // ProtVer Lo
  packet[12] = sequence & 0xff;
  packet[13] = physical & 0xff;
  packet[14] = uni & 0xff;
  packet[15] = (uni >> 8) & 0xff;
  packet[16] = (payload.length >> 8) & 0xff;
  packet[17] = payload.length & 0xff;
  packet.set(payload, 18);
  return packet;
}

export function encodeArtNetChannel({ universe = 0, channel = 1, value = 0 } = {}) {
  const ch = Math.max(1, Math.min(512, Number(channel) || 1));
  const data = new Uint8Array(Math.max(2, ch));
  data[ch - 1] = Math.max(0, Math.min(255, Number(value) || 0));
  return encodeArtNetDmx({ universe, data });
}
