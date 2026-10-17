/**
 * Pont de régie No[co]de Vibe Designer — un seul port pour :
 *   - servir l'application (Designer, Régie, Companion…) aux appareils du réseau local ;
 *   - le canal WebSocket hôte ↔ télécommandes / Companion Studio ;
 *   - /health (diagnostic public minimal) et /__nocode/host (infos d'appairage, poste local seulement).
 *
 * Sécurité adaptée à un réseau de spectacle sans Internet :
 *   - tout appareil qui n'est pas ce poste doit présenter le code d'appairage
 *     (QR code ou saisie) — pour les fichiers comme pour le WebSocket ;
 *   - seul ce poste (loopback) peut prendre le rôle « host » ;
 *   - un WebSocket ouvert depuis une page d'un autre site est refusé (Origin) ;
 *   - essais de code limités par adresse IP.
 *
 * Sans hôte connecté, le pont applique lui-même les opérations (mode autorité).
 * Avec un hôte (Designer), les opérations lui sont transmises : seul son état publié fait foi.
 * Aucune dépendance npm : Node ≥ 18 ou Electron.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL, fileURLToPath } from "node:url";
import { applyRemoteMessage, initialRemoteState } from "../shared/remote-protocol.js";
import { createFrameParser, encodeFrame, encodePong, encodeText, websocketAccept } from "./ws-frames.mjs";
import { STUDIO_MSG } from "../shared/companion-studio/protocol.js";
import { startOscControl, DEFAULT_OSC_PORT } from "./osc-control.mjs";
import { startMdnsAnnounce } from "./mdns-announce.mjs";

export const DEFAULT_PORT = 4174;
const PAIR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIR_COOKIE = "nvd_pair";
const MAX_FAILS = 8;
const FAIL_WINDOW_MS = 60_000;
const AUTH_TIMEOUT_MS = 6_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2"
};

const STUDIO_FORWARD = new Set([
  STUDIO_MSG.HELLO, STUDIO_MSG.HELLO_ACK, STUDIO_MSG.DETECT, STUDIO_MSG.PAIR,
  STUDIO_MSG.ACTION, STUDIO_MSG.FEEDBACK, STUDIO_MSG.LAYOUT, STUDIO_MSG.LAYOUT_ACK,
  STUDIO_MSG.PING, STUDIO_MSG.PONG, STUDIO_MSG.STATUS, STUDIO_MSG.MONITOR_START,
  STUDIO_MSG.MONITOR_FRAME, STUDIO_MSG.MONITOR_STOP, STUDIO_MSG.DISCONNECT
]);

export function generatePairCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) out += PAIR_ALPHABET[crypto.randomInt(PAIR_ALPHABET.length)];
  return out;
}

export function normalizePairCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isLoopback(address) {
  const a = String(address || "");
  return a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1" || a.startsWith("127.");
}

/** Adresses IPv4 du poste joignables depuis le réseau local (Wi-Fi / Ethernet de régie). */
export function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const item of list || []) {
      if (item.family !== "IPv4" && item.family !== 4) continue;
      if (item.internal) continue;
      if (/^169\.254\./.test(item.address)) continue; // auto-IP sans DHCP : rarement utile
      out.push({ interface: name, address: item.address });
    }
  }
  return out;
}

function safeEqual(a, b) {
  const x = Buffer.from(normalizePairCode(a));
  const y = Buffer.from(normalizePairCode(b));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function startRemoteServer({
  port = 0,
  host = "127.0.0.1",
  project = null,
  staticRoot = null,
  pairCode = null,
  requirePair = true,
  allowedOrigins = [],
  maxClients = 32,
  heartbeatMs = 10_000,
  name = "No[co]de Vibe Designer",
  version = "",
  osc = false,              // false | true | numéro de port | { port, allow }
  mdns = false,             // annonce DNS-SD (_oscjson._tcp, _osc._udp) sur le réseau local ; jamais en mode --local
  log = () => {}
} = {}) {
  let state = initialRemoteState(project || undefined);
  let currentPair = normalizePairCode(pairCode) || generatePairCode();
  const clients = new Set();
  const fails = new Map(); // ip → [timestamps]
  let hostClient = null;
  let boundPort = port;
  const OSC_CLIENT_ID = "osc";
  let oscControl = null;
  let lastOscFeedback = null;
  let mdnsAnnounce = null;
  const root = staticRoot ? path.resolve(staticRoot) : null;

  // ------------------------------------------------------------------ utilitaires
  function tooManyFails(ip) {
    const now = Date.now();
    const list = (fails.get(ip) || []).filter(t => now - t < FAIL_WINDOW_MS);
    fails.set(ip, list);
    return list.length >= MAX_FAILS;
  }
  function recordFail(ip) {
    const list = fails.get(ip) || [];
    list.push(Date.now());
    fails.set(ip, list);
  }

  function originAllowed(origin) {
    if (!origin) return true; // client non navigateur (Node, outils de régie)
    let u;
    try { u = new URL(origin); } catch { return false; }
    if (allowedOrigins.includes(u.origin)) return true;
    // Page servie par ce pont (même port) : poste local ou appareil du réseau.
    const p = Number(u.port || (u.protocol === "https:" ? 443 : 80));
    return u.protocol === "http:" && p === boundPort;
  }

  function send(client, obj) {
    if (!client || client.closed) return;
    try { client.socket.write(encodeText(JSON.stringify(obj))); } catch { /* socket mort */ }
  }
  function broadcast(obj, except = null) {
    for (const client of clients) if (client !== except && client.authed) send(client, obj);
  }
  function companions() {
    return [...clients].filter(c => c.authed && c.role === "companion");
  }
  function peersSummary() {
    return [...clients].filter(c => c.authed && c !== hostClient).map(c => ({
      id: c.id || c.role, role: c.role, address: c.loopback ? "local" : c.address
    }));
  }
  function notifyHostPeers() {
    if (hostClient) send(hostClient, { type: "bridge-peers", peers: peersSummary(), t: Date.now() });
  }

  function forget(client) {
    if (!clients.delete(client)) return;
    if (hostClient === client) {
      hostClient = null;
      broadcast({ type: "peer-lost", role: "host", message: "Hôte déconnecté — perte réseau côté régie" });
    } else if (client.role === "companion" && hostClient) {
      send(hostClient, { type: STUDIO_MSG.DISCONNECT, clientId: client.id, t: Date.now() });
    }
    notifyHostPeers();
    log(`pont · départ ${client.role} ${client.id || ""} (${client.loopback ? "local" : client.address})`);
  }

  function drop(client, code = 1000, reason = "") {
    if (client.closed) return;
    client.closed = true;
    try {
      const body = Buffer.alloc(2 + Buffer.byteLength(reason));
      body.writeUInt16BE(code, 0);
      body.write(reason, 2);
      client.socket.write(encodeFrame(0x8, body));
    } catch { /* */ }
    try { client.socket.end(); } catch { /* */ }
    setTimeout(() => { try { client.socket.destroy(); } catch { /* */ } }, 200);
    forget(client);
  }

  // ------------------------------------------------------------------ authentification
  function authenticate(client, msg) {
    if (client.authed) return true;
    const offered = msg?.pairCode ?? msg?.pair;
    if (offered && safeEqual(offered, currentPair)) {
      client.authed = true;
      clearTimeout(client.authTimer);
      log(`pont · appairé ${client.address}`);
      return true;
    }
    recordFail(client.address);
    send(client, { type: "error", code: "pair-required", error: offered ? "Code d'appairage incorrect" : "Code d'appairage requis (QR code de la régie)" });
    drop(client, 4401, "pair");
    return false;
  }

  // ------------------------------------------------------------------ messages
  function handleMessage(client, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { send(client, { type: "error", error: "JSON distant illisible" }); return; }
    if (!client.authed && !authenticate(client, msg)) return;

    if (msg.type === "ping" || msg.type === STUDIO_MSG.PING) {
      send(client, { type: msg.type === STUDIO_MSG.PING ? STUDIO_MSG.PONG : "pong", t: msg.t || Date.now(), serverT: Date.now() });
      return;
    }
    if (msg.type === "pong" || msg.type === STUDIO_MSG.PONG) return;

    if (STUDIO_FORWARD.has(msg.type)) {
      if (msg.type === STUDIO_MSG.HELLO) {
        if (client !== hostClient) client.role = "companion";
        client.id = String(msg.clientId || client.id || "companion").slice(0, 64);
        send(client, { type: STUDIO_MSG.HELLO_ACK, role: client.role, hasHost: !!hostClient, revision: state.revision, t: Date.now() });
        if (hostClient && client !== hostClient) {
          send(hostClient, {
            type: STUDIO_MSG.DETECT, clientId: client.id, pairCode: null,
            platform: msg.platform || "studio", detail: "Companion Studio détecté", t: Date.now()
          });
        }
        notifyHostPeers();
        return;
      }
      if (client === hostClient) {
        if (msg.clientId === OSC_CLIENT_ID) { lastOscFeedback = msg; return; }
        const targets = msg.clientId ? companions().filter(c => c.id === msg.clientId) : [];
        for (const c of (targets.length ? targets : companions())) send(c, msg);
        return;
      }
      if (hostClient) {
        // Un téléphone ne fournit jamais la liaison d'un bouton : c'est le layout du poste qui fait foi.
        const { binding: _b, via: _v, ...clean } = msg;
        send(hostClient, { ...clean, clientId: client.id || msg.clientId });
        return;
      }
      if (msg.type === STUDIO_MSG.ACTION) {
        send(client, {
          type: STUDIO_MSG.FEEDBACK, widgetId: msg.widgetId, value: null, ok: false,
          detail: "Régie absente : ouvre le Designer sur le poste hôte", t: Date.now()
        });
      }
      return;
    }

    if (msg.type === "hello") {
      const wanted = msg.role === "host" ? "host" : msg.role === "companion" ? "companion" : "remote";
      if (wanted === "host" && !client.loopback) {
        send(client, { type: "error", code: "host-local-only", error: "Seul le poste de régie peut être hôte" });
        client.role = "remote";
      } else {
        client.role = wanted;
      }
      client.id = String(msg.clientId || client.role).slice(0, 64);
      if (client.role === "host") {
        if (hostClient && hostClient !== client && !hostClient.closed) {
          // Un rechargement du Designer ouvre un nouveau socket avant que l'ancien ne se ferme : le plus récent gagne.
          const previous = hostClient;
          hostClient = null;
          send(previous, { type: "error", code: "host-replaced", error: "Hôte remplacé par une nouvelle fenêtre" });
          drop(previous, 4409, "host-replaced");
        }
        hostClient = client;
        if (msg.project) {
          state = { revision: Number.isFinite(msg.revision) ? msg.revision : state.revision, project: msg.project };
          broadcast({ type: "state", revision: state.revision, project: state.project, source: "host" }, client);
        }
        for (const c of companions()) {
          send(hostClient, { type: STUDIO_MSG.DETECT, clientId: c.id, detail: "Companion déjà en ligne", t: Date.now() });
        }
        broadcast({ type: "peer-back", role: "host", t: Date.now() }, client);
      } else if (client.role === "companion" && hostClient) {
        send(hostClient, { type: STUDIO_MSG.DETECT, clientId: client.id, detail: "Companion Studio détecté", t: Date.now() });
      }
      send(client, { type: "hello-ack", role: client.role, revision: state.revision, hasHost: !!hostClient });
      if (client.role !== "companion") {
        send(client, { type: "state", revision: state.revision, project: state.project, source: "server" });
      }
      notifyHostPeers();
      return;
    }

    if (msg.type === "state" && client === hostClient) {
      state = { revision: Number(msg.revision) || 0, project: msg.project };
      broadcast({ type: "state", revision: state.revision, project: state.project, source: "host" }, client);
      return;
    }
    if (msg.type === "conflict" && client === hostClient) {
      broadcast(msg, client);
      return;
    }
    if (msg.type === "op") {
      if (hostClient && client !== hostClient) {
        send(hostClient, { ...msg, clientId: client.id });
        return;
      }
      const result = applyRemoteMessage(state, msg);
      if (!result.ok) {
        send(client, { type: result.conflict ? "conflict" : "error", error: result.error, revision: result.revision, project: result.project });
        return;
      }
      state = result.state;
      broadcast({ type: "state", revision: state.revision, project: state.project, source: "server" });
      return;
    }
    send(client, { type: "error", error: `Message inconnu : ${String(msg.type).slice(0, 40)}` });
  }

  // ------------------------------------------------------------------ HTTP
  function remoteIp(req) {
    return req.socket.remoteAddress || "";
  }

  function hostInfo() {
    const lan = lanAddresses();
    const studio = (addr) => `http://${addr}:${boundPort}/studio/?surface=regie&ws=${encodeURIComponent(`ws://${addr}:${boundPort}`)}&pair=${currentPair}`;
    return {
      schema: "nvd.bridge",
      name,
      version,
      port: boundPort,
      pairCode: currentPair,
      requirePair,
      lan: lan.map(item => ({ ...item, joinUrl: studio(item.address), wsUrl: `ws://${item.address}:${boundPort}` })),
      localWsUrl: `ws://127.0.0.1:${boundPort}`,
      hasHost: !!hostClient,
      peers: peersSummary(),
      revision: state.revision,
      osc: oscControl ? {
        port: oscControl.port,
        oscQueryUrls: lan.map(item => `http://${item.address}:${oscControl.port}/`),
        received: oscControl.stats.received,
        applied: oscControl.stats.applied,
        last: oscControl.stats.last
      } : null,
      mdns: mdnsAnnounce?.ok ? { host: mdnsAnnounce.host, instance: mdnsAnnounce.instance, services: mdnsAnnounce.services } : (mdnsAnnounce ? { error: mdnsAnnounce.reason } : null)
    };
  }

  function json(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  }

  function staticAuthorized(req, url) {
    if (!requirePair || isLoopback(remoteIp(req))) return { ok: true };
    const fromQuery = url.searchParams.get("pair");
    if (fromQuery && safeEqual(fromQuery, currentPair)) return { ok: true, setCookie: true };
    const cookie = parseCookies(req.headers.cookie)[PAIR_COOKIE];
    if (cookie && safeEqual(cookie, currentPair)) return { ok: true };
    if (fromQuery) recordFail(remoteIp(req));
    return { ok: false };
  }

  function serveStatic(req, res, url) {
    if (!root) { res.writeHead(404); res.end("Not found"); return; }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); res.end(); return; }
    const ip = remoteIp(req);
    if (!isLoopback(ip) && tooManyFails(ip)) { res.writeHead(429, { "Retry-After": "60" }); res.end("Trop d'essais"); return; }
    const auth = staticAuthorized(req, url);
    if (!auth.ok) {
      res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Appairage requis</title><body style="background:#101214;color:#e8eaed;font:16px system-ui;padding:24px"><h1>No[co]de · appairage requis</h1><p>Scanne le QR code affiché par la régie, ou saisis le code :</p><form><input name="pair" autocapitalize="characters" autocomplete="off" style="font-size:20px;padding:8px;width:9ch"> <button style="font-size:18px;padding:8px 14px">Entrer</button></form></body>`);
      return;
    }
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end(); return; }
    rel = rel.replace(/^\/+/, "");
    if (rel.split("/").some(seg => seg.startsWith("."))) { res.writeHead(404); res.end("Not found"); return; }
    let file = path.normalize(path.join(root, rel));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end("Forbidden"); return; }
    let stat;
    try { stat = fs.statSync(file); } catch { stat = null; }
    if (stat?.isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
        res.end();
        return;
      }
      file = path.join(file, "index.html");
      try { stat = fs.statSync(file); } catch { stat = null; }
    }
    if (!stat?.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not found"); return; }
    const headers = {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      // Signal lisible par la page (performance.getEntriesByType("navigation")[0].serverTiming) :
      // le Designer sait qu'il est servi par un pont de régie, quel que soit le port.
      "Server-Timing": "nvdbridge"
    };
    if (auth.setCookie) headers["Set-Cookie"] = `${PAIR_COOKIE}=${currentPair}; Path=/; HttpOnly; SameSite=Strict`;
    res.writeHead(200, headers);
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  }

  const server = http.createServer((req, res) => {
    let url;
    try { url = new URL(req.url || "/", "http://bridge.local"); } catch { res.writeHead(400); res.end(); return; }
    const local = isLoopback(remoteIp(req));
    if (url.pathname === "/health") {
      json(res, 200, {
        ok: true, app: name, version, revision: state.revision,
        clients: [...clients].filter(c => c.authed).length,
        companions: companions().length, hasHost: !!hostClient
      });
      return;
    }
    if (url.pathname === "/__nocode/host") {
      // Le code d'appairage n'est donné qu'au poste local, et jamais à une page d'un autre site.
      if (!local || !originAllowed(req.headers.origin)) { json(res, 403, { ok: false, error: "Réservé au poste de régie" }); return; }
      json(res, 200, { ok: true, ...hostInfo() });
      return;
    }
    if (url.pathname === "/__nocode/rotate-pair") {
      if (!local || req.method !== "POST" || !originAllowed(req.headers.origin)) { json(res, 403, { ok: false, error: "Réservé au poste de régie" }); return; }
      currentPair = generatePairCode();
      for (const c of [...clients]) if (!c.loopback) drop(c, 4401, "pair-rotated");
      log("pont · nouveau code d'appairage, appareils distants déconnectés");
      json(res, 200, { ok: true, ...hostInfo() });
      return;
    }
    serveStatic(req, res, url);
  });

  server.on("upgrade", (req, socket) => {
    const address = req.socket.remoteAddress || "";
    const loopback = isLoopback(address);
    const reject = (status, text) => {
      try { socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); } catch { /* */ }
      socket.destroy();
    };
    const key = req.headers["sec-websocket-key"];
    if (!key) return reject(400, "Bad Request");
    if (!originAllowed(req.headers.origin)) { log(`pont · origine refusée ${req.headers.origin}`); return reject(403, "Forbidden"); }
    if (!loopback && tooManyFails(address)) return reject(429, "Too Many Requests");
    if (clients.size >= maxClients) return reject(503, "Service Unavailable");
    let url;
    try { url = new URL(req.url || "/", "http://bridge.local"); } catch { return reject(400, "Bad Request"); }
    const offered = url.searchParams.get("pair") || parseCookies(req.headers.cookie)[PAIR_COOKIE];

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${websocketAccept(key)}\r\n\r\n`
    );
    socket.setNoDelay?.(true);
    const client = {
      socket, address, loopback, role: "remote", id: "", closed: false,
      authed: loopback || !requirePair || (offered ? safeEqual(offered, currentPair) : false),
      lastSeen: Date.now(), authTimer: null
    };
    if (!loopback && offered && !client.authed) recordFail(address);
    clients.add(client);
    log(`pont · arrivée ${loopback ? "locale" : address}${client.authed ? "" : " (appairage en attente)"}`);
    if (!client.authed) {
      client.authTimer = setTimeout(() => {
        if (!client.authed) {
          send(client, { type: "error", code: "pair-required", error: "Code d'appairage requis (QR code de la régie)" });
          drop(client, 4401, "pair");
        }
      }, AUTH_TIMEOUT_MS);
    }
    const parser = createFrameParser((opcode, payload) => {
      client.lastSeen = Date.now();
      if (opcode === 0x8) { drop(client); return; }
      if (opcode === 0x9) { try { socket.write(encodePong(payload)); } catch { /* */ } return; }
      if (opcode === 0xa) return;
      if (opcode === 0x1) handleMessage(client, payload.toString("utf8"));
    });
    socket.on("data", chunk => {
      try { parser(chunk); } catch (e) {
        send(client, { type: "error", error: e.message || String(e) });
        drop(client, 1009, "frame");
      }
    });
    const gone = () => {
      if (client.closed) { forget(client); return; }
      client.closed = true;
      clearTimeout(client.authTimer);
      forget(client);
      try { socket.destroy(); } catch { /* */ }
    };
    socket.on("end", gone);
    socket.on("close", gone);
    socket.on("error", gone);
  });

  // Battement : détecte les téléphones mis en veille ou sortis du Wi-Fi.
  const heartbeat = heartbeatMs > 0 ? setInterval(() => {
    const now = Date.now();
    for (const c of [...clients]) {
      if (now - c.lastSeen > heartbeatMs * 3) { log(`pont · ${c.id || c.role} muet, déconnecté`); drop(c, 1001, "timeout"); continue; }
      try { c.socket.write(encodeFrame(0x9, Buffer.alloc(0))); } catch { /* */ }
    }
  }, heartbeatMs) : null;
  heartbeat?.unref?.();

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const addr = server.address();
      boundPort = typeof addr === "object" && addr ? addr.port : port;
      const shownHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
      const finish = () => resolve({
        port: boundPort,
        host,
        url: `ws://${shownHost}:${boundPort}`,
        httpUrl: `http://${shownHost}:${boundPort}`,
        getState: () => state,
        getPairCode: () => currentPair,
        hostInfo,
        getOsc: () => oscControl,
        getLastOscFeedback: () => lastOscFeedback,
        async close() {
          if (heartbeat) clearInterval(heartbeat);
          for (const client of clients) { try { client.socket.destroy(); } catch { /* */ } }
          clients.clear();
          if (mdnsAnnounce) await mdnsAnnounce.close().catch(() => {});
          if (oscControl) await oscControl.close().catch(() => {});
          return new Promise(res => server.close(() => res()));
        }
      });
      if (!osc) return finish();
      const cfg = typeof osc === "object" ? osc : { port: typeof osc === "number" ? osc : DEFAULT_OSC_PORT };
      startOscControl({
        port: cfg.port ?? DEFAULT_OSC_PORT,
        host,
        allow: cfg.allow || null,
        name,
        log,
        getProject: () => state.project,
        dispatch: (route) => {
          if (!hostClient) return { ok: false, error: "Régie absente (Designer fermé)" };
          if (route.kind === "op") {
            send(hostClient, { type: "op", baseRevision: state.revision, op: route.op, clientId: OSC_CLIENT_ID });
            return { ok: true };
          }
          send(hostClient, {
            type: STUDIO_MSG.ACTION, widgetId: route.widgetId, value: route.value,
            binding: route.binding, via: route.binding ? "bridge-osc" : undefined,
            clientId: OSC_CLIENT_ID, t: Date.now()
          });
          return { ok: true };
        }
      }).then(async (ctl) => {
        oscControl = ctl;
        // Découverte automatique (Millumin, Chataigne, TouchOSC…) : uniquement si la régie écoute le réseau local.
        if (mdns && !isLoopback(host)) {
          const m = typeof mdns === "object" ? mdns : {};
          mdnsAnnounce = await startMdnsAnnounce({
            instance: m.instance || name,
            hostname: m.hostname,
            addresses: m.addresses,
            multicastInterface: m.multicastInterface || null,
            log,
            services: [
              { type: "_oscjson._tcp", port: ctl.port, txt: { txtvers: 1, osc: ctl.port, app: "nocode" } },
              { type: "_osc._udp", port: ctl.port, txt: { txtvers: 1, app: "nocode" } }
            ]
          }).catch(e => ({ ok: false, reason: e.message, close: async () => {} }));
          log(mdnsAnnounce.ok ? `mdns · annoncé ${mdnsAnnounce.instance} (${mdnsAnnounce.host}) : _oscjson._tcp, _osc._udp port ${ctl.port}` : `mdns · non annoncé : ${mdnsAnnounce.reason}`);
        }
        finish();
      }, (err) => {
        // Port OSC occupé : le pont reste utilisable, l'échec est signalé (jamais un faux « OSC actif »).
        log(`osc · indisponible : ${err?.code === "EADDRINUSE" ? `port ${cfg.port} occupé` : err?.message || err}`);
        finish();
      });
    });
  });
}

/** Racine de l'application quand ce fichier est lancé depuis le dépôt. */
export function defaultStaticRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const rawPort = process.env.NVD_REMOTE_PORT;
  const port = rawPort == null || rawPort === "" ? DEFAULT_PORT : Number(rawPort);
  startRemoteServer({ port, host: "127.0.0.1", log: m => console.log(m) }).then(server => {
    console.log(`Pont distant No[co]de Vibe Designer (local seulement) · ${server.url}`);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
