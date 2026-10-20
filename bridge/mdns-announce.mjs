// No[co]de · annonce DNS-SD / mDNS (RFC 6762 / RFC 6763) sans dépendance.
// Rend la régie découvrable automatiquement par les logiciels qui parcourent :
//   _oscjson._tcp  (OSCQuery : serveur HTTP de l'arbre d'adresses)
//   _osc._udp      (entrée OSC UDP)
// Constat REA (17/10/2026) : Millumin 5.14 embarque VVOSCQueryProtocol ; la spécification OSCQuery
// impose l'annonce _oscjson._tcp pour la découverte. Sans elle, l'adresse doit être saisie à la main.
// Portée : réseau local uniquement (multicast 224.0.0.251, TTL 255 non routé). Rien n'est exposé sur Internet.
import dgram from "node:dgram";
import os from "node:os";

const MDNS_ADDR = "224.0.0.251";
const MDNS_PORT = 5353;
const TYPE = { A: 1, PTR: 12, TXT: 16, SRV: 33, ANY: 255 };
const CLASS_IN = 1;
const CACHE_FLUSH = 0x8000;

export function encodeName(name) {
  const parts = String(name).replace(/\.$/, "").split(".");
  const bufs = [];
  for (const label of parts) {
    const b = Buffer.from(label, "utf8");
    if (b.length > 63) throw new Error(`Label DNS trop long : ${label}`);
    bufs.push(Buffer.from([b.length]), b);
  }
  bufs.push(Buffer.from([0]));
  return Buffer.concat(bufs);
}

export function decodeName(buf, offset) {
  const labels = [];
  let pos = offset, jumped = false, end = offset, guard = 0;
  while (true) {
    if (pos >= buf.length || ++guard > 128) throw new Error("Nom DNS invalide");
    const len = buf[pos];
    if (len === 0) { if (!jumped) end = pos + 1; break; }
    if ((len & 0xc0) === 0xc0) {
      if (pos + 1 >= buf.length) throw new Error("Pointeur DNS tronqué");
      if (!jumped) end = pos + 2;
      pos = ((len & 0x3f) << 8) | buf[pos + 1];
      jumped = true;
      continue;
    }
    if (pos + 1 + len > buf.length) throw new Error("Label DNS tronqué");
    labels.push(buf.toString("utf8", pos + 1, pos + 1 + len));
    pos += 1 + len;
  }
  return { name: labels.join("."), next: end };
}

export function parsePacket(buf) {
  if (buf.length < 12) throw new Error("Paquet DNS trop court");
  const flags = buf.readUInt16BE(2);
  const qd = buf.readUInt16BE(4), an = buf.readUInt16BE(6);
  let pos = 12;
  const questions = [];
  for (let i = 0; i < qd; i++) {
    const { name, next } = decodeName(buf, pos);
    const type = buf.readUInt16BE(next), klass = buf.readUInt16BE(next + 2);
    questions.push({ name, type, unicast: !!(klass & 0x8000) });
    pos = next + 4;
  }
  const answers = [];
  for (let i = 0; i < an; i++) {
    const { name, next } = decodeName(buf, pos);
    const type = buf.readUInt16BE(next), ttl = buf.readUInt32BE(next + 4), rdlen = buf.readUInt16BE(next + 8);
    const rdStart = next + 10;
    const rec = { name, type, ttl };
    if (type === TYPE.PTR) rec.data = decodeName(buf, rdStart).name;
    else if (type === TYPE.SRV) rec.data = { port: buf.readUInt16BE(rdStart + 4), target: decodeName(buf, rdStart + 6).name };
    else if (type === TYPE.A) rec.data = [...buf.subarray(rdStart, rdStart + 4)].join(".");
    else if (type === TYPE.TXT) {
      const items = []; let p = rdStart;
      while (p < rdStart + rdlen) { const l = buf[p]; items.push(buf.toString("utf8", p + 1, p + 1 + l)); p += 1 + l; }
      rec.data = items;
    }
    answers.push(rec);
    pos = rdStart + rdlen;
  }
  return { id: buf.readUInt16BE(0), response: !!(flags & 0x8000), questions, answers };
}

function record(name, type, ttl, rdata, flush = false) {
  const head = Buffer.alloc(10);
  head.writeUInt16BE(type, 0);
  head.writeUInt16BE(CLASS_IN | (flush ? CACHE_FLUSH : 0), 2);
  head.writeUInt32BE(ttl, 4);
  head.writeUInt16BE(rdata.length, 8);
  return Buffer.concat([encodeName(name), head, rdata]);
}

function txtData(entries) {
  const parts = Object.entries(entries).map(([k, v]) => Buffer.from(`${k}=${v}`, "utf8")).filter(b => b.length < 256);
  if (!parts.length) return Buffer.from([0]);
  return Buffer.concat(parts.flatMap(b => [Buffer.from([b.length]), b]));
}

export function buildResponse(records, id = 0) {
  const head = Buffer.alloc(12);
  head.writeUInt16BE(id, 0);
  head.writeUInt16BE(0x8400, 2); // réponse + autoritaire
  head.writeUInt16BE(records.length, 6);
  return Buffer.concat([head, ...records]);
}

export function buildQuery(name, type = TYPE.PTR) {
  const head = Buffer.alloc(12);
  head.writeUInt16BE(1, 4);
  const tail = Buffer.alloc(4);
  tail.writeUInt16BE(type, 0); tail.writeUInt16BE(CLASS_IN, 2);
  return Buffer.concat([head, encodeName(name), tail]);
}

const sanitizeHost = s => String(s || "nocode").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\.local$/i, "").replace(/[^A-Za-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 63) || "nocode";
const sanitizeInstance = s => String(s || "No[co]de").replace(/\./g, " ").slice(0, 63);

/**
 * Prépare les enregistrements DNS-SD d'une régie. Pure (testable sans réseau).
 * services : [{ type: "_oscjson._tcp", port, txt }]
 */
export function serviceRecords({ instance, hostname, addresses, services, ttl = 120 }) {
  const host = `${sanitizeHost(hostname)}.local`;
  const inst = sanitizeInstance(instance);
  const out = { host, instance: inst, byQuestion: new Map(), all: [] };
  const add = (key, rec) => { if (!out.byQuestion.has(key)) out.byQuestion.set(key, []); out.byQuestion.get(key).push(rec); };
  const aRecs = addresses.map(ip => record(host, TYPE.A, ttl, Buffer.from(ip.split(".").map(Number)), true));
  for (const svc of services) {
    const type = `${svc.type}.local`;
    const full = `${inst}.${type}`;
    const ptr = record(type, TYPE.PTR, ttl * 37, encodeName(full));
    const srvData = Buffer.concat([Buffer.from([0, 0, 0, 0, svc.port >> 8, svc.port & 255]), encodeName(host)]);
    const srv = record(full, TYPE.SRV, ttl, srvData, true);
    const txt = record(full, TYPE.TXT, ttl * 37, txtData(svc.txt || { txtvers: 1 }), true);
    const meta = record("_services._dns-sd._udp.local", TYPE.PTR, ttl * 37, encodeName(type));
    add(type.toLowerCase(), [ptr, srv, txt, ...aRecs]);
    add(full.toLowerCase(), [srv, txt, ...aRecs]);
    add("_services._dns-sd._udp.local", [meta]);
    out.all.push(ptr, srv, txt, meta);
  }
  add(host.toLowerCase(), aRecs);
  out.all.push(...aRecs);
  // Enregistrements « au revoir » (TTL 0) pour la fermeture
  out.goodbye = services.map(svc => {
    const type = `${svc.type}.local`;
    return record(type, TYPE.PTR, 0, encodeName(`${inst}.${type}`));
  });
  return out;
}

export function answerFor(table, questions) {
  const recs = [];
  const seen = new Set();
  for (const q of questions) {
    if (![TYPE.PTR, TYPE.SRV, TYPE.TXT, TYPE.A, TYPE.ANY].includes(q.type)) continue;
    for (const group of table.byQuestion.get(q.name.toLowerCase()) || []) {
      for (const r of (Array.isArray(group) ? group : [group])) {
        const k = r.toString("hex");
        if (!seen.has(k)) { seen.add(k); recs.push(r); }
      }
    }
  }
  return recs;
}

export function lanIPv4() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === "IPv4" && !i.internal) out.push(i.address);
  return out;
}

/**
 * Démarre l'annonce. Renvoie { close(), records, stats } ; ne lève pas si le port 5353 est indisponible
 * (le résultat porte alors ok:false et la raison), pour ne jamais empêcher la régie de démarrer.
 */
export function startMdnsAnnounce({
  instance = "No[co]de Vibe Designer",
  hostname = os.hostname(),
  addresses = lanIPv4(),
  services = [],
  ttl = 120,
  log = () => {},
  multicastInterface = null
} = {}) {
  return new Promise(resolve => {
    if (!services.length || !addresses.length) return resolve({ ok: false, reason: addresses.length ? "aucun service" : "aucune interface réseau locale", close: async () => {} });
    const table = serviceRecords({ instance, hostname, addresses, services, ttl });
    const stats = { queries: 0, answered: 0 };
    const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    let closed = false;
    const send = (buf, port = MDNS_PORT, addr = MDNS_ADDR) => new Promise(r => sock.send(buf, port, addr, () => r()));
    sock.on("error", err => {
      log(`mdns · indisponible : ${err.message}`);
      try { sock.close(); } catch { /* */ }
      if (!closed) { closed = true; resolve({ ok: false, reason: err.message, close: async () => {} }); }
    });
    sock.on("message", (buf, rinfo) => {
      let pkt; try { pkt = parsePacket(buf); } catch { return; }
      if (pkt.response || !pkt.questions.length) return;
      stats.queries++;
      const recs = answerFor(table, pkt.questions);
      if (!recs.length) return;
      stats.answered++;
      const legacy = rinfo.port !== MDNS_PORT; // requête « unicast legacy » (RFC 6762 §6.7)
      const unicast = legacy || pkt.questions.some(q => q.unicast);
      send(buildResponse(recs, legacy ? pkt.id : 0), unicast ? rinfo.port : MDNS_PORT, unicast ? rinfo.address : MDNS_ADDR);
    });
    sock.bind(MDNS_PORT, () => {
      try {
        if (multicastInterface) sock.setMulticastInterface(multicastInterface);
        for (const ip of multicastInterface ? [multicastInterface] : addresses) {
          try { sock.addMembership(MDNS_ADDR, ip); } catch (e) { log(`mdns · adhésion multicast ${ip} : ${e.message}`); }
        }
        sock.setMulticastTTL(255);
        sock.setMulticastLoopback(true);
      } catch (e) { log(`mdns · configuration multicast : ${e.message}`); }
      const announce = () => send(buildResponse(table.all));
      announce();
      const t = setTimeout(announce, 1000); // RFC 6762 §8.3 : au moins deux annonces, à 1 s d'intervalle
      resolve({
        ok: true,
        host: table.host,
        instance: table.instance,
        services: services.map(s => ({ type: s.type, port: s.port })),
        stats,
        async close() {
          if (closed) return; closed = true;
          clearTimeout(t);
          await send(buildResponse(table.goodbye)).catch(() => {});
          await new Promise(r => sock.close(() => r()));
        }
      });
    });
  });
}

export { TYPE as DNS_TYPE, MDNS_ADDR, MDNS_PORT };
