/**
 * Envoi OSC UDP. Module Node / Electron uniquement.
 * Le navigateur doit passer par le bridge WebSocket existant.
 */
import dgram from "node:dgram";
import { encodeOscMessage } from "../shared/protocols/osc.js";

export function oscUdpAvailable() {
  return true;
}

export function sendOscUdp({ host = "127.0.0.1", port = 9000, address, args = [] } = {}) {
  if (typeof host !== "string" || !host.trim()) return Promise.reject(new Error("Hôte OSC manquant"));
  const udpPort = Number(port);
  if (!Number.isInteger(udpPort) || udpPort < 1 || udpPort > 65535) {
    return Promise.reject(new Error("Port OSC invalide"));
  }
  const packet = encodeOscMessage(address, args);
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
        resolve({ host, port: udpPort, bytes: packet.length });
      }
    });
  });
}
