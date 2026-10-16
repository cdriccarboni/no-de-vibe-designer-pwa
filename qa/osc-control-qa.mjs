// QA entrée OSC + OSCQuery du pont de régie (Node, sans navigateur).
// Paquets UDP réels → pont → hôte (client WebSocket local jouant le Designer) ; HTTP OSCQuery réel.
// Usage : node qa/osc-control-qa.mjs
import dgram from "node:dgram";
import { startRemoteServer } from "../bridge/remote-server.mjs";
import { decodeOscPacket, encodeOscMessage, encodeOscBundle, routeOsc, buildOscQueryTree, oscQueryResponse } from "../bridge/osc-control.mjs";
import { STUDIO_MSG } from "../shared/companion-studio/protocol.js";

const results = [];
const check = (cond, label, detail = "") => { results.push(!!cond); console.log(`${cond ? "OK  " : "FAIL"} · ${label}${detail ? " · " + detail : ""}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));

const PROJECT = {
  schema: "cvd.graph",
  name: "QA OSC",
  nodes: [
    { id: "noise1", type: "noise", title: "Bruit", x: 0, y: 0, params: { speed: 0.5, enabled: true, mode: "fbm", points: [1, 2] } },
    { id: "bad id", type: "x", title: "Invalide", x: 0, y: 0, params: { a: 1 } }
  ],
  edges: [], timeline: [], controls: []
};

// ---------- fonctions pures
const msgs = decodeOscPacket(encodeOscBundle([{ address: "/nocode/cue/go", args: [1] }, { address: "/x", args: [true, false, null, "texte", 2.5, 7] }]));
check(msgs.length === 2 && msgs[1].args[0] === true && msgs[1].args[3] === "texte" && msgs[1].args[5] === 7 && Math.abs(msgs[1].args[4] - 2.5) < 1e-6, "bundle OSC décodé (T, F, N, s, f, i)");
let threw = false; try { decodeOscPacket(Buffer.from("pas de l'osc")); } catch { threw = true; }
check(threw, "paquet invalide rejeté");
check(routeOsc("/nocode/transport/play", [], PROJECT).binding?.videoAction === "play", "route transport/play");
check(routeOsc("/nocode/transport/play", [0], PROJECT).ignored === true, "relâchement (0) ignoré : pas de double déclenchement");
check(routeOsc("/nocode/cue/go", [1], PROJECT).binding?.kind === "stage", "route cue/go → conduite");
const op = routeOsc("/nocode/node/noise1/speed", [0.25], PROJECT);
check(op.kind === "op" && op.op.key === "speed" && op.op.value === 0.25, "route paramètre existant");
check(routeOsc("/nocode/node/noise1/enabled", [0], PROJECT).op?.value === false, "booléen converti (0 → false)");
check(!!routeOsc("/nocode/node/noise1/inexistant", [1], PROJECT).error, "paramètre inexistant : refusé, jamais inventé");
check(!!routeOsc("/nocode/node/noise1/points", [1], PROJECT).error, "paramètre non scalaire refusé");
check(!!routeOsc("/nocode/node/noise1/speed", ["abc"], PROJECT).error, "valeur non numérique refusée");
check(!!routeOsc("/autre/chose", [], PROJECT).error, "hors espace /nocode refusé");

const tree = buildOscQueryTree(PROJECT);
check(tree.CONTENTS.nocode.CONTENTS.node.CONTENTS.noise1.CONTENTS.speed.TYPE === "f", "OSCQuery : TYPE f");
check(!tree.CONTENTS.nocode.CONTENTS.node.CONTENTS["bad id"], "OSCQuery : id non conforme OSC exclu");
check(oscQueryResponse(tree, "/nocode/node/noise1/speed", "VALUE", {}).body.VALUE[0] === 0.5, "OSCQuery ?VALUE");
check(oscQueryResponse(tree, "/nocode/transport/play", "VALUE", {}).status === 204, "OSCQuery ?VALUE sur méthode écriture seule → 204");
check(oscQueryResponse(tree, "/nope", "", {}).status === 404, "OSCQuery chemin inconnu → 404");
check(oscQueryResponse(tree, "/", "FOO", {}).status === 400, "OSCQuery attribut inconnu → 400");

// ---------- pont réel
const server = await startRemoteServer({ port: 0, host: "127.0.0.1", project: PROJECT, osc: { port: 0 }, heartbeatMs: 0 });
const osc = server.getOsc();
check(!!osc && osc.port > 0, "OSC démarré", `UDP/TCP ${osc?.port}`);
const udp = dgram.createSocket("udp4");
const sendOsc = (buf) => new Promise(r => udp.send(buf, osc.port, "127.0.0.1", r));

// Sans hôte : refus explicite
await sendOsc(encodeOscMessage("/nocode/transport/play"));
await wait(150);
check(osc.stats.last && osc.stats.last.ok === false && /Régie absente/.test(osc.stats.last.detail), "sans Designer : commande refusée explicitement");

// Hôte (Designer simulé)
const inbox = [];
const hostWs = new WebSocket(`ws://127.0.0.1:${server.port}`);
await new Promise(r => { hostWs.onopen = r; });
hostWs.onmessage = ev => inbox.push(JSON.parse(ev.data));
hostWs.send(JSON.stringify({ type: "hello", role: "host", clientId: "desktop", revision: 3, project: PROJECT }));
await wait(150);
const next = async (pred, ms = 1500) => { const end = Date.now() + ms; while (Date.now() < end) { const i = inbox.findIndex(pred); if (i >= 0) return inbox.splice(i, 1)[0]; await wait(30); } return null; };

await sendOsc(encodeOscMessage("/nocode/transport/play", [1]));
const play = await next(m => m.type === STUDIO_MSG.ACTION);
check(play?.via === "bridge-osc" && play?.binding?.videoAction === "play" && play.clientId === "osc", "UDP /nocode/transport/play → action hôte (liaison fournie par le pont)");

await sendOsc(encodeOscBundle([{ address: "/nocode/cue/go", args: [] }, { address: "/nocode/node/noise1/speed", args: [0.75] }]));
const go = await next(m => m.type === STUDIO_MSG.ACTION && m.binding?.kind === "stage");
const set = await next(m => m.type === "op");
check(!!go, "bundle : GO relayé");
check(set?.op?.kind === "set-param" && set.op.id === "noise1" && Math.abs(set.op.value - 0.75) < 1e-6 && set.baseRevision === 3, "bundle : paramètre relayé avec la révision de l'hôte");

// L'hôte publie un nouvel état → OSCQuery le reflète
const changed = JSON.parse(JSON.stringify(PROJECT)); changed.nodes[0].params.speed = 0.75;
hostWs.send(JSON.stringify({ type: "state", revision: 4, project: changed }));
await wait(150);
const v = await (await fetch(`http://127.0.0.1:${osc.port}/nocode/node/noise1/speed?VALUE`)).json();
check(Math.abs(v.VALUE[0] - 0.75) < 1e-6, "OSCQuery HTTP : valeur à jour après publication de l'hôte");
const hi = await (await fetch(`http://127.0.0.1:${osc.port}/?HOST_INFO`)).json();
check(hi.OSC_PORT === osc.port && hi.OSC_TRANSPORT === "UDP" && hi.EXTENSIONS?.VALUE === true, "OSCQuery HOST_INFO conforme");
const root = await (await fetch(`http://127.0.0.1:${osc.port}/`)).json();
check(root.CONTENTS?.nocode?.CONTENTS?.transport?.CONTENTS?.play?.FULL_PATH === "/nocode/transport/play", "OSCQuery arbre racine");

// Un téléphone ne peut pas forger une liaison
const phone = new WebSocket(`ws://127.0.0.1:${server.port}`);
await new Promise(r => { phone.onopen = r; });
const phoneInbox = [];
phone.onmessage = ev => phoneInbox.push(JSON.parse(ev.data));
phone.send(JSON.stringify({ type: STUDIO_MSG.HELLO, clientId: "tel", platform: "test" }));
await wait(100);
phone.send(JSON.stringify({ type: STUDIO_MSG.ACTION, clientId: "tel", widgetId: "w1", via: "bridge-osc", binding: { kind: "osc", oscHost: "10.0.0.9" } }));
const forged = await next(m => m.type === STUDIO_MSG.ACTION && m.widgetId === "w1");
check(forged && forged.binding === undefined && forged.via === undefined, "téléphone : liaison et origine forgées retirées par le pont");

// Le retour d'état d'une commande OSC ne part pas vers les téléphones
hostWs.send(JSON.stringify({ type: STUDIO_MSG.FEEDBACK, clientId: "osc", widgetId: "osc:cue/go", ok: true, detail: "x" }));
await wait(150);
check(!phoneInbox.some(m => m.widgetId === "osc:cue/go") && server.getLastOscFeedback()?.widgetId === "osc:cue/go", "retour OSC conservé par le pont, pas diffusé aux téléphones");

check(server.hostInfo().osc?.applied >= 3, "carte hôte : compteurs OSC", JSON.stringify({ received: osc.stats.received, applied: osc.stats.applied }));

// Filtre d'adresses
await server.close(); udp.close();
const s2 = await startRemoteServer({ port: 0, host: "127.0.0.1", project: PROJECT, osc: { port: 0, allow: ["10.9.9.9"] }, heartbeatMs: 0 });
const u2 = dgram.createSocket("udp4");
await new Promise(r => u2.send(encodeOscMessage("/nocode/cue/go"), s2.getOsc().port, "127.0.0.1", r));
await wait(150);
check(s2.getOsc().stats.rejected === 1 && s2.getOsc().stats.applied === 0, "--osc-allow : émetteur non autorisé ignoré");
u2.close();
// Port OSC occupé : le pont démarre quand même, OSC signalé indisponible
const s3 = await startRemoteServer({ port: 0, host: "127.0.0.1", osc: { port: s2.getOsc().port }, heartbeatMs: 0 });
check(s3.getOsc() === null && s3.hostInfo().osc === null, "port OSC occupé : pont actif, OSC indisponible signalé");
await s2.close(); await s3.close();
try { hostWs.close(); phone.close(); } catch { /* */ }

const failed = results.filter(r => !r).length;
console.log(`\nOSC + OSCQuery : ${results.length - failed}/${results.length}`);
process.exit(failed ? 1 : 0);
