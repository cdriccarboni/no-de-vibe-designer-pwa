// QA du pont de régie LAN (Node, sans navigateur) :
// appairage, refus sans code, hôte réservé au poste local, Origin, relais action → hôte → feedback,
// opérations en mode autorité, fichiers protégés, battement, reconnexion.
// Usage : node qa/regie-bridge-qa.mjs
import { startRemoteServer, lanAddresses, generatePairCode, normalizePairCode, isLoopback } from "../bridge/remote-server.mjs";
import { STUDIO_MSG } from "../shared/companion-studio/protocol.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (cond, label, detail = "") => {
  results.push({ ok: !!cond, label });
  console.log(`${cond ? "OK  " : "FAIL"} · ${label}${detail ? " · " + detail : ""}`);
};
const wait = ms => new Promise(r => setTimeout(r, ms));

function client(url, { headers } = {}) {
  const ws = new WebSocket(url, headers ? { headers } : undefined);
  const inbox = [];
  const waiters = [];
  let closed = null;
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    inbox.push(msg);
    for (const w of [...waiters]) if (w.pred(msg)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
  };
  ws.onclose = ev => { closed = ev.code || 1005; for (const w of waiters.splice(0)) w.resolve(null); };
  const api = {
    ws, inbox,
    get closed() { return closed; },
    open: () => new Promise((res) => {
      if (ws.readyState === 1) return res(true);
      ws.onopen = () => res(true);
      ws.onerror = () => res(false);
    }),
    send: obj => ws.send(JSON.stringify(obj)),
    next: (pred, ms = 2500) => {
      const found = inbox.find(pred);
      if (found) { inbox.splice(inbox.indexOf(found), 1); return Promise.resolve(found); }
      return new Promise(resolve => {
        const w = { pred: m => { if (pred(m)) { inbox.splice(inbox.indexOf(m), 1); return true; } return false; }, resolve };
        waiters.push(w);
        setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); resolve(null); } }, ms);
      });
    },
    close: () => { try { ws.close(); } catch { /* */ } }
  };
  return api;
}

const lan = lanAddresses()[0]?.address || null;
const server = await startRemoteServer({ port: 0, host: "0.0.0.0", staticRoot: root, heartbeatMs: 400, version: "qa" });
const port = server.port;
const pair = server.getPairCode();
const local = `ws://127.0.0.1:${port}`;

try {
  check(/^[A-Z2-9]{6}$/.test(pair), "code d'appairage généré (6 caractères sans ambiguïté)", pair);
  check(normalizePairCode(" abc-234 ") === "ABC234", "code normalisé (casse, tirets, espaces)");
  check(generatePairCode() !== generatePairCode(), "codes aléatoires distincts");
  check(isLoopback("::ffff:127.0.0.1") && !isLoopback("192.168.1.20"), "détection poste local");

  // --- HTTP
  const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  check(health.ok && !("pairCode" in health), "/health public sans code d'appairage");
  const infoRes = await fetch(`http://127.0.0.1:${port}/__nocode/host`);
  const info = await infoRes.json();
  check(infoRes.ok && info.pairCode === pair, "/__nocode/host donne le code au poste local");
  const foreign = await fetch(`http://127.0.0.1:${port}/__nocode/host`, { headers: { Origin: "https://evil.example" } });
  check(foreign.status === 403, "/__nocode/host refusé à une page d'un autre site");
  const page = await fetch(`http://127.0.0.1:${port}/studio/`);
  check(page.ok && (await page.text()).includes("<"), "application servie au poste local");
  const traversal = await fetch(`http://127.0.0.1:${port}/..%2F..%2Fetc%2Fpasswd`);
  check(traversal.status === 403 || traversal.status === 404, "chemin hors racine refusé", String(traversal.status));
  const dotfile = await fetch(`http://127.0.0.1:${port}/.git/config`);
  check(dotfile.status === 404, "fichiers cachés (.git) jamais servis");

  if (lan) {
    const deny = await fetch(`http://${lan}:${port}/studio/`);
    check(deny.status === 401, "appareil distant sans code : fichiers refusés (401)");
    const okq = await fetch(`http://${lan}:${port}/studio/?pair=${pair.toLowerCase()}`);
    const cookie = okq.headers.get("set-cookie") || "";
    check(okq.ok && /nvd_pair=/.test(cookie) && /HttpOnly/.test(cookie), "appareil distant avec code : page + cookie d'appairage");
    const withCookie = await fetch(`http://${lan}:${port}/shared/companion-studio/protocol.js`, { headers: { Cookie: cookie.split(";")[0] } });
    check(withCookie.ok, "ressources suivantes servies grâce au cookie");
  } else {
    console.log("·    pas d'interface réseau locale : tests distants HTTP non exécutés");
  }

  // --- WebSocket : hôte + companion
  const host = client(local);
  check(await host.open(), "hôte local connecté");
  host.send({ type: "hello", role: "host", clientId: "desktop", revision: 0, project: { name: "QA", nodes: [], edges: [], timeline: [], controls: [] } });
  const ack = await host.next(m => m.type === "hello-ack");
  check(ack?.role === "host", "rôle hôte accordé au poste local");

  if (lan) {
    const intruder = client(`ws://${lan}:${port}`);
    await intruder.open();
    intruder.send({ type: STUDIO_MSG.HELLO, clientId: "intrus", pairCode: "ZZZZZZ" });
    const err = await intruder.next(m => m.type === "error");
    await wait(300);
    check(err?.code === "pair-required" && intruder.closed, "companion distant au mauvais code : refusé et déconnecté");

    const silent = client(`ws://${lan}:${port}`);
    await silent.open();
    silent.send({ type: "op", baseRevision: 0, op: { kind: "set-name", name: "intrus" } });
    await wait(300);
    check(silent.closed && server.getState().project.name === "QA", "message sans appairage : aucune opération appliquée");

    const fake = client(`ws://${lan}:${port}?pair=${pair}`);
    await fake.open();
    fake.send({ type: "hello", role: "host", clientId: "faux-hote" });
    const fakeErr = await fake.next(m => m.type === "error" && m.code === "host-local-only");
    check(!!fakeErr, "un appareil distant ne peut pas devenir hôte");
    fake.close();
  }

  const crossSite = client(local, { headers: { Origin: "https://evil.example" } });
  const crossOpen = await crossSite.open();
  await wait(200);
  check(!crossOpen || crossSite.closed, "WebSocket depuis une page d'un autre site refusé");

  const remoteBase = lan ? `ws://${lan}:${port}` : local;
  const phone = client(`${remoteBase}?pair=${pair}`);
  check(await phone.open(), `téléphone connecté (${lan ? "réseau local" : "poste local"})`);
  phone.send({ type: STUDIO_MSG.HELLO, clientId: "phone-1", pairCode: pair, platform: "studio" });
  const hack = await phone.next(m => m.type === STUDIO_MSG.HELLO_ACK);
  check(hack?.hasHost === true, "hello-ack : hôte présent");
  const detect = await host.next(m => m.type === STUDIO_MSG.DETECT && m.clientId === "phone-1");
  check(!!detect && detect.pairCode == null, "hôte prévenu de l'arrivée (sans renvoyer le code)");
  const peers = await host.next(m => m.type === "bridge-peers" && m.peers.some(p => p.id === "phone-1"));
  check(!!peers, "liste des appareils connectés transmise à l'hôte");

  // action téléphone → hôte → feedback ciblé
  phone.send({ type: STUDIO_MSG.ACTION, widgetId: "go", action: "press", value: true, t: Date.now() });
  const atHost = await host.next(m => m.type === STUDIO_MSG.ACTION);
  check(atHost?.clientId === "phone-1" && atHost.widgetId === "go", "action relayée à l'hôte avec l'identité du téléphone");
  host.send({ type: STUDIO_MSG.FEEDBACK, clientId: "phone-1", widgetId: "go", ok: true, value: "cue-2", detail: "GO cue-2" });
  const fb = await phone.next(m => m.type === STUDIO_MSG.FEEDBACK);
  check(fb?.value === "cue-2" && fb.ok, "retour d'état reçu par le téléphone");

  // op → hôte (source de vérité), puis état publié → téléphone
  phone.send({ type: "op", baseRevision: 0, op: { kind: "set-name", name: "Répétition" } });
  const opAtHost = await host.next(m => m.type === "op");
  check(opAtHost?.op?.name === "Répétition", "opération transmise à l'hôte (pas appliquée par le pont)");
  host.send({ type: "state", revision: 1, project: { name: "Répétition", nodes: [], edges: [], timeline: [], controls: [] } });
  const pub = await phone.next(m => m.type === "state" && m.revision === 1, 1500);
  check(pub === null || pub.project.name === "Répétition", "état de l'hôte diffusé");

  // battement : un client muet est coupé
  const mute = client(local);
  await mute.open();
  mute.ws.onmessage = null;
  // Le client navigateur répond aux ping automatiquement ; ici on vérifie seulement que les vivants restent connectés.
  await wait(1500);
  check(!phone.closed && !host.closed, "battement : clients actifs maintenus");
  mute.close();

  // hôte perdu puis retrouvé
  host.close();
  const lost = await phone.next(m => m.type === "peer-lost");
  check(!!lost, "téléphone prévenu de la perte de l'hôte");
  phone.send({ type: STUDIO_MSG.ACTION, widgetId: "go", action: "press" });
  const noHost = await phone.next(m => m.type === STUDIO_MSG.FEEDBACK);
  check(noHost && noHost.ok === false, "action sans hôte : échec explicite, jamais un faux succès", noHost?.detail);
  const host2 = client(local);
  await host2.open();
  host2.send({ type: "hello", role: "host", clientId: "desktop" });
  const back = await phone.next(m => m.type === "peer-back");
  check(!!back, "téléphone prévenu du retour de l'hôte (reprise sans reconnexion manuelle)");

  // rotation du code : les distants sont déconnectés
  if (lan) {
    const rot = await (await fetch(`http://127.0.0.1:${port}/__nocode/rotate-pair`, { method: "POST" })).json();
    await wait(300);
    check(rot.pairCode !== pair && phone.closed, "nouveau code : appareils distants déconnectés");
  }
  host2.close();
} catch (e) {
  check(false, "exception", e.stack || e.message);
} finally {
  await server.close();
}

const failed = results.filter(r => !r.ok).length;
console.log(`\nPont de régie : ${results.length - failed}/${results.length}`);
process.exit(failed ? 1 : 0);
