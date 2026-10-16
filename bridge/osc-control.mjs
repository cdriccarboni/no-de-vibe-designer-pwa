/**
 * Contrôle externe de No[co]de Vibe Designer par OSC + découverte OSCQuery.
 *
 * Permet à QLab, Chataigne, TouchDesigner, Millumin, Max, Open Stage Control… de piloter la régie :
 *   OSC UDP (port par défaut 9010)            → tops, lecture, paramètres des nodes, boutons Companion
 *   OSCQuery HTTP (même numéro de port, TCP)   → arbre JSON des adresses disponibles (spec OSSIA/Vidvox)
 *
 * Espace d'adresses (aucune adresse n'est inventée : les nodes/paramètres viennent du projet publié par l'hôte) :
 *   /nocode/transport/play | pause | stop | toggle
 *   /nocode/cue/go
 *   /nocode/widget/<widgetId> [valeur]           bouton du layout Companion du poste
 *   /nocode/node/<nodeId>/<param> <valeur>       paramètre scalaire existant d'un node
 *
 * OSC n'a pas d'authentification (comme dans QLab, Millumin, TouchDesigner) : à réserver au réseau de régie.
 * `allow` restreint les adresses IP émettrices ; `false` désactive le module.
 * Spécification OSCQuery : https://github.com/OSSIA/OSCQueryProposal
 */
import dgram from "node:dgram";
import http from "node:http";

export const DEFAULT_OSC_PORT = 9010;
const ROOT = "/nocode";

// ---------- Décodage OSC 1.0 (messages + bundles) ----------
function readString(buf, offset) {
  let end = offset;
  while (end < buf.length && buf[end] !== 0) end++;
  if (end >= buf.length) throw new Error("Chaîne OSC non terminée");
  const text = buf.toString("utf8", offset, end);
  let next = end + 1;
  while (next % 4) next++;
  return { text, next };
}

function decodeMessage(buf) {
  const addr = readString(buf, 0);
  if (!addr.text.startsWith("/")) throw new Error("Adresse OSC invalide");
  if (addr.next >= buf.length) return { address: addr.text, args: [] }; // typetags absents (OSC 1.0 ancien)
  const tags = readString(buf, addr.next);
  if (!tags.text.startsWith(",")) throw new Error("Typetags OSC absents");
  const args = [];
  let p = tags.next;
  for (const t of tags.text.slice(1)) {
    if (t === "i") { args.push(buf.readInt32BE(p)); p += 4; }
    else if (t === "f") { args.push(buf.readFloatBE(p)); p += 4; }
    else if (t === "d") { args.push(buf.readDoubleBE(p)); p += 8; }
    else if (t === "h") { args.push(Number(buf.readBigInt64BE(p))); p += 8; }
    else if (t === "s" || t === "S") { const s = readString(buf, p); args.push(s.text); p = s.next; }
    else if (t === "b") { const n = buf.readInt32BE(p); p += 4 + n; while (p % 4) p++; args.push(null); }
    else if (t === "T") args.push(true);
    else if (t === "F") args.push(false);
    else if (t === "N" || t === "I") args.push(null);
    else throw new Error(`Typetag OSC non supporté : ${t}`);
    if (p > buf.length) throw new Error("Message OSC tronqué");
  }
  return { address: addr.text, args };
}

export function decodeOscPacket(buf, depth = 0) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (depth > 8) throw new Error("Bundle OSC trop imbriqué");
  if (buf.length >= 16 && buf.toString("ascii", 0, 8) === "#bundle\0") {
    const out = [];
    let p = 16; // "#bundle\0" + timetag (exécution immédiate : la régie n'attend pas)
    while (p + 4 <= buf.length) {
      const size = buf.readInt32BE(p);
      p += 4;
      if (size <= 0 || p + size > buf.length) throw new Error("Élément de bundle OSC invalide");
      out.push(...decodeOscPacket(buf.subarray(p, p + size), depth + 1));
      p += size;
    }
    return out;
  }
  return [decodeMessage(buf)];
}

// ---------- Encodage minimal (tests, retours) ----------
function pad(b) { const n = (4 - (b.length % 4)) % 4; return n ? Buffer.concat([b, Buffer.alloc(n)]) : b; }
function oscString(s) { return pad(Buffer.concat([Buffer.from(String(s), "utf8"), Buffer.alloc(1)])); }
export function encodeOscMessage(address, args = []) {
  let tags = ",";
  const parts = [];
  for (const a of args) {
    if (typeof a === "number" && Number.isInteger(a)) { tags += "i"; const b = Buffer.alloc(4); b.writeInt32BE(a); parts.push(b); }
    else if (typeof a === "number") { tags += "f"; const b = Buffer.alloc(4); b.writeFloatBE(a); parts.push(b); }
    else if (a === true) tags += "T";
    else if (a === false) tags += "F";
    else if (a == null) tags += "N";
    else { tags += "s"; parts.push(oscString(a)); }
  }
  return Buffer.concat([oscString(address), oscString(tags), ...parts]);
}
export function encodeOscBundle(messages) {
  const head = Buffer.concat([oscString("#bundle"), Buffer.from([0, 0, 0, 0, 0, 0, 0, 1])]);
  const items = messages.map(m => { const b = encodeOscMessage(m.address, m.args); const s = Buffer.alloc(4); s.writeInt32BE(b.length); return Buffer.concat([s, b]); });
  return Buffer.concat([head, ...items]);
}

// ---------- Espace d'adresses ----------
const TRANSPORT = ["play", "pause", "stop", "toggle"];
const SEG = /^[A-Za-z0-9_.~-]+$/; // segments OSC sûrs (pas d'espace, pas de joker)

function isScalar(v) { return typeof v === "number" || typeof v === "boolean" || typeof v === "string"; }

function scalarParams(node) {
  const out = [];
  for (const [key, value] of Object.entries(node?.params || {})) {
    if (!SEG.test(key) || !isScalar(value)) continue;
    if (typeof value === "string" && value.length > 256) continue;
    out.push([key, value]);
  }
  return out;
}

function firstArg(args) { return args.length ? args[0] : null; }

function coerce(current, value) {
  if (typeof current === "number") {
    const n = typeof value === "boolean" ? (value ? 1 : 0) : Number(value);
    if (!Number.isFinite(n)) throw new Error("Valeur numérique attendue");
    return n;
  }
  if (typeof current === "boolean") {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return /^(1|true|on|oui)$/i.test(String(value));
  }
  if (value == null) throw new Error("Valeur texte attendue");
  return String(value);
}

/**
 * Traduit un message OSC en action pour l'hôte. Fonction pure (testable).
 * Retour : { kind:"action", widgetId, binding?, value, label } | { kind:"op", op, label } | { error }
 */
export function routeOsc(address, args, project) {
  if (address !== ROOT && !address.startsWith(ROOT + "/")) return { error: `Hors espace ${ROOT} : ${address}` };
  const parts = address.slice(ROOT.length + 1).split("/");
  const [area, a, b, extra] = parts;
  const v = firstArg(args);

  if (area === "transport" && parts.length === 2 && TRANSPORT.includes(a)) {
    if (v === false || v === 0) return { ignored: true }; // relâchement d'un bouton (1 puis 0) : un seul déclenchement
    return { kind: "action", widgetId: `osc:transport/${a}`, binding: { kind: "video", videoAction: a, action: a }, value: true, label: `transport ${a}` };
  }
  if (area === "cue" && a === "go" && parts.length === 2) {
    if (v === false || v === 0) return { ignored: true };
    return { kind: "action", widgetId: "osc:cue/go", binding: { kind: "stage", action: "go" }, value: true, label: "GO" };
  }
  if (area === "widget" && a && parts.length === 2) {
    if (!SEG.test(a)) return { error: "Identifiant de bouton invalide" };
    return { kind: "action", widgetId: a, value: v ?? true, label: `bouton ${a}` };
  }
  if (area === "node" && a && b && extra === undefined) {
    const node = (project?.nodes || []).find(n => n.id === a);
    if (!node) return { error: `Node introuvable : ${a}` };
    const param = scalarParams(node).find(([k]) => k === b);
    if (!param) return { error: `Paramètre introuvable ou non scalaire : ${a}/${b}` };
    if (!args.length) return { error: "Valeur manquante" };
    try {
      return { kind: "op", op: { kind: "set-param", id: a, key: b, value: coerce(param[1], v) }, label: `${node.title || a}.${b}` };
    } catch (e) {
      return { error: `${a}/${b} : ${e.message}` };
    }
  }
  return { error: `Adresse inconnue : ${address}` };
}

// ---------- OSCQuery ----------
function typeOf(v) { return typeof v === "number" ? (Number.isInteger(v) ? "i" : "f") : typeof v === "boolean" ? "T" : "s"; }

export function buildOscQueryTree(project, { name = "No[co]de Vibe Designer" } = {}) {
  const leaf = (path, description, extra = {}) => ({ FULL_PATH: path, ACCESS: 2, TYPE: "", DESCRIPTION: description, ...extra });
  const transport = {};
  for (const t of TRANSPORT) transport[t] = leaf(`${ROOT}/transport/${t}`, `Transport : ${t}`);
  const nodes = {};
  for (const node of project?.nodes || []) {
    if (!SEG.test(String(node.id || ""))) continue;
    const params = scalarParams(node);
    if (!params.length) continue;
    const contents = {};
    for (const [key, value] of params) {
      const type = typeOf(value);
      contents[key] = {
        FULL_PATH: `${ROOT}/node/${node.id}/${key}`,
        TYPE: type === "T" ? "T" : type,
        ACCESS: 3,
        VALUE: [value],
        DESCRIPTION: `${node.title || node.type || node.id} · ${key}`
      };
    }
    nodes[node.id] = { FULL_PATH: `${ROOT}/node/${node.id}`, DESCRIPTION: node.title || node.type || node.id, CONTENTS: contents };
  }
  return {
    FULL_PATH: "/",
    DESCRIPTION: name,
    CONTENTS: {
      nocode: {
        FULL_PATH: ROOT,
        DESCRIPTION: name,
        CONTENTS: {
          transport: { FULL_PATH: `${ROOT}/transport`, DESCRIPTION: "Lecture du Designer", CONTENTS: transport },
          cue: { FULL_PATH: `${ROOT}/cue`, DESCRIPTION: "Conduite", CONTENTS: { go: leaf(`${ROOT}/cue/go`, "Top suivant (GO)") } },
          node: { FULL_PATH: `${ROOT}/node`, DESCRIPTION: "Paramètres des nodes du projet ouvert", CONTENTS: nodes }
        }
      }
    }
  };
}

const ATTRS = new Set(["VALUE", "TYPE", "RANGE", "ACCESS", "DESCRIPTION", "FULL_PATH", "CONTENTS", "TAGS", "UNIT", "CLIPMODE", "EXTENDED_TYPE", "CRITICAL", "OVERLOADS"]);

/** Réponse HTTP OSCQuery pour un chemin + éventuel attribut. Fonction pure. */
export function oscQueryResponse(tree, pathname, query, hostInfo) {
  if (query === "HOST_INFO") return { status: 200, body: hostInfo };
  let node = tree;
  const segs = decodeURIComponent(pathname).split("/").filter(Boolean);
  for (const s of segs) {
    node = node?.CONTENTS?.[s];
    if (!node) return { status: 404, body: { error: "Adresse OSC inconnue" } };
  }
  if (!query) return { status: 200, body: node };
  if (!ATTRS.has(query)) return { status: 400, body: { error: `Attribut inconnu : ${query}` } };
  if (query === "VALUE" && !(node.ACCESS & 1)) return { status: 204, body: null };
  if (!(query in node)) return { status: 204, body: null };
  return { status: 200, body: { [query]: node[query] } };
}

// ---------- Serveurs ----------
export function startOscControl({
  port = DEFAULT_OSC_PORT,
  host = "0.0.0.0",
  allow = null,               // liste d'IP autorisées (null = toutes)
  getProject = () => null,
  dispatch = () => ({ ok: false, error: "Régie absente" }),
  name = "No[co]de Vibe Designer",
  log = () => {}
} = {}) {
  const stats = { received: 0, applied: 0, rejected: 0, last: null };
  const allowed = Array.isArray(allow) && allow.length ? new Set(allow) : null;
  const udp = dgram.createSocket({ type: "udp4", reuseAddr: true });

  udp.on("message", (buf, rinfo) => {
    stats.received++;
    if (allowed && !allowed.has(rinfo.address)) { stats.rejected++; return; }
    let messages;
    try { messages = decodeOscPacket(buf); } catch (e) { stats.rejected++; log(`osc · paquet illisible (${rinfo.address}) : ${e.message}`); return; }
    for (const m of messages) {
      const route = routeOsc(m.address, m.args, getProject());
      if (route.ignored) continue;
      if (route.error) { stats.rejected++; stats.last = { address: m.address, ok: false, detail: route.error }; log(`osc · ${route.error}`); continue; }
      const r = dispatch(route, { from: rinfo.address, address: m.address });
      stats.last = { address: m.address, ok: !!r?.ok, detail: r?.error || route.label, at: Date.now() };
      if (r?.ok) { stats.applied++; log(`osc · ${route.label} (${rinfo.address})`); }
      else { stats.rejected++; log(`osc · ${m.address} ignoré : ${r?.error || "refusé"}`); }
    }
  });

  const hostInfo = () => ({
    NAME: name,
    OSC_PORT: boundPort,
    OSC_TRANSPORT: "UDP",
    EXTENSIONS: { ACCESS: true, VALUE: true, DESCRIPTION: true, TYPE: true, OVERLOADS: true, LISTEN: false, PATH_CHANGED: false }
  });

  const web = http.createServer((req, res) => {
    let url;
    try { url = new URL(req.url || "/", "http://oscquery.local"); } catch { res.writeHead(400); res.end(); return; }
    const remote = (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
    if (allowed && !allowed.has(remote) && !remote.startsWith("127.")) { res.writeHead(403); res.end(); return; }
    if (req.method !== "GET") { res.writeHead(405); res.end(); return; }
    const query = url.search ? url.search.slice(1).split("&")[0] : "";
    const { status, body } = oscQueryResponse(buildOscQueryTree(getProject(), { name }), url.pathname, query, hostInfo());
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
    res.end(body == null ? "" : JSON.stringify(body));
  });

  let boundPort = port;
  return new Promise((resolve, reject) => {
    udp.once("error", reject);
    udp.bind(port, host, () => {
      boundPort = udp.address().port;
      udp.off("error", reject);
      udp.on("error", e => log(`osc · ${e.message}`));
      web.once("error", (e) => { try { udp.close(); } catch { /* */ } reject(e); });
      web.listen(boundPort, host, () => {
        resolve({
          port: boundPort,
          stats,
          close: () => new Promise(r => { try { udp.close(); } catch { /* */ } web.close(() => r()); })
        });
      });
    });
  });
}
