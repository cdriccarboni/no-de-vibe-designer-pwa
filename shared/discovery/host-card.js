/**
 * Carte d'hôte pour contrôleurs — discovery sans prétendre à une API navigateur absente.
 * Electron/Node peut remplir host/port ; le mobile stocke le dernier hôte.
 */

export function createHostCard({
  name = "No-de Vibe Designer",
  host = "127.0.0.1",
  port = 4174,
  httpPort = null,
  version = "",
  pairCode = null
} = {}) {
  if (!host || !port) throw new Error("Hôte ou port manquant");
  const code = pairCode || randomPairCode();
  return {
    schema: "nvd.host",
    version: 1,
    name,
    host,
    port: Number(port),
    httpPort: httpPort == null ? null : Number(httpPort),
    appVersion: version,
    pairCode: code,
    wsUrl: `ws://${host}:${port}`,
    httpUrl: httpPort ? `http://${host}:${httpPort}/` : null,
    createdAt: new Date().toISOString()
  };
}

function randomPairCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[(Math.random() * alphabet.length) | 0];
  return out;
}

export function hostCardToQrPayload(card) {
  return JSON.stringify({
    nvd: 1,
    ws: card.wsUrl,
    http: card.httpUrl,
    code: card.pairCode,
    name: card.name
  });
}

export function parseHostCard(input) {
  let data = input;
  if (typeof input === "string") {
    try { data = JSON.parse(input); }
    catch { throw new Error("Carte hôte illisible"); }
  }
  if (data?.nvd === 1 && data.ws) {
    const url = new URL(data.ws);
    return createHostCard({
      name: data.name || "No-de",
      host: url.hostname,
      port: Number(url.port || 4174),
      httpPort: data.http ? Number(new URL(data.http).port || 0) || null : null,
      pairCode: data.code
    });
  }
  if (data?.schema === "nvd.host") return createHostCard(data);
  throw new Error("Format de carte hôte inconnu");
}

export function rememberHost(storage, card) {
  if (!storage?.setItem) throw new Error("Stockage indisponible");
  storage.setItem("nvd.last-host", JSON.stringify(card));
  return card;
}

export function loadRememberedHost(storage) {
  if (!storage?.getItem) return null;
  const raw = storage.getItem("nvd.last-host");
  if (!raw) return null;
  try { return parseHostCard(raw); }
  catch { return null; }
}
