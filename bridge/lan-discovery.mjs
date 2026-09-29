/**
 * Annonce périodique de la carte hôte sur le multicast LAN.
 * Démarre depuis Electron ; échec = log, pas de faux « découvert ».
 */
import dgram from "node:dgram";
import {
  encodeLanBeacon,
  decodeLanBeacon,
  LAN_BEACON_MULTICAST,
  LAN_BEACON_PORT
} from "../shared/discovery/lan-beacon.js";

export function startLanAnnouncer(getCard, { intervalMs = 2500 } = {}) {
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  let timer = null;
  let stopped = false;

  socket.on("error", (err) => {
    console.error("LAN_BEACON_ERROR", err?.message || err);
  });

  socket.bind(0, () => {
    try { socket.setBroadcast(true); } catch { /* */ }
    try { socket.setMulticastTTL(1); } catch { /* */ }
  });

  const tick = () => {
    if (stopped) return;
    let card;
    try { card = typeof getCard === "function" ? getCard() : getCard; }
    catch (e) {
      console.error("LAN_BEACON_CARD", e?.message || e);
      return;
    }
    if (!card) return;
    let buf;
    try { buf = encodeLanBeacon(card); }
    catch (e) {
      console.error("LAN_BEACON_ENCODE", e?.message || e);
      return;
    }
    socket.send(buf, LAN_BEACON_PORT, LAN_BEACON_MULTICAST, (err) => {
      if (err) console.error("LAN_BEACON_SEND", err.message || err);
    });
  };

  timer = setInterval(tick, Math.max(800, intervalMs));
  tick();

  return {
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      try { socket.close(); } catch { /* */ }
    }
  };
}

export function startLanListener(onBeacon) {
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  socket.on("error", (err) => console.error("LAN_LISTEN_ERROR", err?.message || err));
  socket.on("message", (msg) => {
    try {
      const card = decodeLanBeacon(msg);
      onBeacon?.(card);
    } catch { /* ignore foreign packets */ }
  });
  socket.bind(LAN_BEACON_PORT, () => {
    try { socket.addMembership(LAN_BEACON_MULTICAST); } catch (e) {
      console.error("LAN_LISTEN_MEMBERSHIP", e?.message || e);
    }
  });
  return {
    stop() { try { socket.close(); } catch { /* */ } }
  };
}
