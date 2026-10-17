// QA DNS-SD / mDNS de la régie : encodage, réponses aux requêtes de découverte (_oscjson._tcp, _osc._udp),
// requête réelle sur le réseau (multicast, interface de bouclage), annonce d'au-revoir, pont complet.
import dgram from "node:dgram";
import { buildQuery, parsePacket, serviceRecords, answerFor, buildResponse, startMdnsAnnounce, DNS_TYPE, decodeName, encodeName } from "../bridge/mdns-announce.mjs";
import { startRemoteServer } from "../bridge/remote-server.mjs";

let fail = 0;
const ok = (c, m, d = "") => { console.log(`${c ? "✓" : "✗"} ${m}${d ? " · " + d : ""}`); if (!c) fail = 1; };

// 1. Encodage / décodage
ok(decodeName(encodeName("_oscjson._tcp.local"), 0).name === "_oscjson._tcp.local", "nom DNS encodé/décodé");
const q = parsePacket(buildQuery("_oscjson._tcp.local"));
ok(q.questions[0].name === "_oscjson._tcp.local" && q.questions[0].type === DNS_TYPE.PTR && !q.response, "requête PTR construite et relue");
let threw = false; try { parsePacket(Buffer.from([0, 1, 2])); } catch { threw = true; }
ok(threw, "paquet tronqué refusé sans planter");
// boucle de pointeurs de compression : refusée
const loop = Buffer.concat([Buffer.alloc(12), Buffer.from([0xc0, 12, 0, 12, 0, 1])]); loop.writeUInt16BE(1, 4);
threw = false; try { parsePacket(loop); } catch { threw = true; }
ok(threw, "boucle de compression DNS refusée");

// 2. Table d'enregistrements et réponses
const table = serviceRecords({
  instance: "Régie.Test", hostname: "Mac de Régie.local", addresses: ["192.168.1.20"],
  services: [{ type: "_oscjson._tcp", port: 9010, txt: { txtvers: 1 } }, { type: "_osc._udp", port: 9010 }]
});
ok(table.host === "Mac-de-Regie.local", "nom d'hôte assaini (accents, espaces → .local)", table.host);
ok(!table.instance.includes("."), "nom d'instance sans point", table.instance);
const resp = parsePacket(buildResponse(answerFor(table, [{ name: "_oscjson._tcp.local", type: DNS_TYPE.PTR }])));
const ptr = resp.answers.find(a => a.type === DNS_TYPE.PTR);
const srv = resp.answers.find(a => a.type === DNS_TYPE.SRV);
const a = resp.answers.find(a => a.type === DNS_TYPE.A);
const txt = resp.answers.find(a => a.type === DNS_TYPE.TXT);
ok(resp.response && ptr?.data === `${table.instance}._oscjson._tcp.local`, "PTR _oscjson._tcp → instance", ptr?.data);
ok(srv?.data.port === 9010 && srv.data.target === table.host, "SRV : port 9010 et hôte", JSON.stringify(srv?.data));
ok(a?.data === "192.168.1.20", "A : adresse IPv4 du poste");
ok(txt?.data.includes("txtvers=1"), "TXT txtvers=1");
ok(answerFor(table, [{ name: "_http._tcp.local", type: DNS_TYPE.PTR }]).length === 0, "aucune réponse pour un service non annoncé");
ok(answerFor(table, [{ name: "_services._dns-sd._udp.local", type: DNS_TYPE.PTR }]).length === 2, "énumération des types de services (2)");

// 3. Réseau réel : annonce sur l'interface de bouclage, requête « legacy unicast » (port ≠ 5353)
const ann = await startMdnsAnnounce({
  instance: "No[co]de QA", hostname: "qa-regie", addresses: ["127.0.0.1"], multicastInterface: "127.0.0.1",
  services: [{ type: "_oscjson._tcp", port: 9123 }, { type: "_osc._udp", port: 9123 }]
});
if (!ann.ok) {
  console.log(`· SKIPPED (réseau) : mDNS non démarrable ici — ${ann.reason}`);
} else {
  const client = dgram.createSocket({ type: "udp4", reuseAddr: true });
  await new Promise(r => client.bind(0, "127.0.0.1", r));
  client.setMulticastInterface("127.0.0.1");
  const answer = await new Promise(resolve => {
    const t = setTimeout(() => resolve(null), 3000);
    client.on("message", buf => { try { const p = parsePacket(buf); if (p.response && p.answers.some(x => x.type === DNS_TYPE.SRV)) { clearTimeout(t); resolve(p); } } catch { /* */ } });
    client.send(buildQuery("_oscjson._tcp.local"), 5353, "224.0.0.251");
  });
  const s = answer?.answers.find(x => x.type === DNS_TYPE.SRV);
  ok(s?.data.port === 9123, "requête réseau réelle : la régie répond (SRV port 9123)", s ? JSON.stringify(s.data) : "pas de réponse");
  ok(ann.stats.answered >= 1, "statistiques de réponses");
  // Au revoir : PTR TTL 0 émis à la fermeture
  const bye = await new Promise(resolve => {
    const t = setTimeout(() => resolve(null), 2000);
    const l = dgram.createSocket({ type: "udp4", reuseAddr: true });
    l.bind(5353, () => {
      try { l.addMembership("224.0.0.251", "127.0.0.1"); } catch { /* */ }
      l.on("message", buf => { try { const p = parsePacket(buf); const g = p.answers.find(x => x.type === DNS_TYPE.PTR && x.ttl === 0); if (g) { clearTimeout(t); l.close(); resolve(g); } } catch { /* */ } });
      ann.close();
    });
  });
  ok(!!bye, "annonce d'au-revoir (TTL 0) à la fermeture");
  client.close();
}

// 4. Pont complet : mdns annoncé seulement hors bouclage ; jamais en mode local
const local = await startRemoteServer({ port: 0, host: "127.0.0.1", osc: { port: 0 }, mdns: true });
ok(local.hostInfo().mdns === null, "mode local (127.0.0.1) : aucune annonce réseau");
await local.close();
const lan = await startRemoteServer({ port: 0, host: "0.0.0.0", osc: { port: 0 }, mdns: { addresses: ["127.0.0.1"], multicastInterface: "127.0.0.1", hostname: "qa-pont" } });
const info = lan.hostInfo().mdns;
ok(info && (info.services?.length === 2 || info.error), "pont LAN : annonce démarrée (ou erreur explicite)", JSON.stringify(info));
ok(info?.services?.every(s => s.port === lan.getOsc().port), "port annoncé = port OSC/OSCQuery réel");
await lan.close();
process.exit(fail);
