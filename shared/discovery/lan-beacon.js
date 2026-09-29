/**
 * Balise LAN UDP — annonce de carte hôte sans dépendre de Bonjour/mDNS natif.
 * Multicast 239.255.190.74:4175 · schéma nvd.beacon v1
 * mDNS/Bonjour reste PLATFORM-LIMITED tant qu'aucun backend native n'est lié.
 */

export const LAN_BEACON_MULTICAST = "239.255.190.74";
export const LAN_BEACON_PORT = 4175;
export const LAN_BEACON_SCHEMA = "nvd.beacon";

export function encodeLanBeacon(card, { ttlMs = 8000 } = {}) {
  if (!card?.wsUrl && !(card?.host && card?.port)) {
    throw new Error("Balise LAN : carte hôte incomplète");
  }
  const payload = {
    schema: LAN_BEACON_SCHEMA,
    version: 1,
    name: card.name || "No-de Vibe Designer",
    host: card.host,
    port: Number(card.port),
    httpPort: card.httpPort == null ? null : Number(card.httpPort),
    pairCode: card.pairCode || null,
    wsUrl: card.wsUrl || `ws://${card.host}:${card.port}`,
    httpUrl: card.httpUrl || (card.httpPort ? `http://${card.host}:${card.httpPort}/` : null),
    appVersion: card.appVersion || card.version || "",
    expiresAt: Date.now() + Math.max(1000, Number(ttlMs) || 8000)
  };
  return new TextEncoder().encode(JSON.stringify(payload));
}

export function decodeLanBeacon(buf) {
  let text;
  if (typeof buf === "string") text = buf;
  else if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(buf)) text = buf.toString("utf8");
  else text = new TextDecoder().decode(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error("Balise LAN illisible"); }
  if (data?.schema !== LAN_BEACON_SCHEMA || data.version !== 1) {
    throw new Error("Schéma de balise LAN inconnu");
  }
  if (!data.host || !data.port) throw new Error("Balise LAN incomplète");
  if (data.expiresAt && Date.now() > Number(data.expiresAt)) {
    throw new Error("Balise LAN expirée");
  }
  return {
    schema: LAN_BEACON_SCHEMA,
    version: 1,
    name: data.name || "No-de",
    host: data.host,
    port: Number(data.port),
    httpPort: data.httpPort == null ? null : Number(data.httpPort),
    pairCode: data.pairCode || null,
    wsUrl: data.wsUrl || `ws://${data.host}:${data.port}`,
    httpUrl: data.httpUrl || null,
    appVersion: data.appVersion || "",
    expiresAt: data.expiresAt || null,
    discovery: "lan-udp"
  };
}

/** Statut honnête de la discovery : balise UDP vs mDNS. */
export function discoveryCapabilities({ hasNativeMdns = false } = {}) {
  return {
    lanUdpBeacon: true,
    qrFallback: true,
    httpHostJson: true,
    mdns: !!hasNativeMdns,
    mdnsStatus: hasNativeMdns ? "available" : "PLATFORM-LIMITED",
    note: hasNativeMdns
      ? "mDNS natif lié"
      : "Pas de backend Bonjour/mDNS — balise UDP + QR + /nvd-host.json"
  };
}
