/**
 * Envoi Art-Net UDP. Module Node / Electron uniquement.
 */
import dgram from "node:dgram";
import { encodeArtNetChannel, encodeArtNetDmx } from "../shared/protocols/artnet.js";

export function artnetUdpAvailable() {
  return true;
}

export function sendArtNetUdp({
  host = "127.0.0.1",
  port = 6454,
  universe = 0,
  channel = 1,
  value = 0,
  data = null
} = {}) {
  if (typeof host !== "string" || !host.trim()) return Promise.reject(new Error("Hôte Art-Net manquant"));
  const udpPort = Number(port);
  if (!Number.isInteger(udpPort) || udpPort < 1 || udpPort > 65535) {
    return Promise.reject(new Error("Port Art-Net invalide"));
  }
  const packet = data
    ? encodeArtNetDmx({ universe, data })
    : encodeArtNetChannel({ universe, channel, value });
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const fail = (error) => {
      socket.close();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    socket.once("error", fail);
    socket.send(packet, udpPort, host, (error) => {
      if (error) fail(error);
      else {
        socket.close();
        resolve({ host, port: udpPort, bytes: packet.length, universe });
      }
    });
  });
}
