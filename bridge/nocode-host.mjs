#!/usr/bin/env node
/**
 * Poste de régie No[co]de Vibe Designer sans application desktop.
 *
 *   node bridge/nocode-host.mjs                 # réseau local, port 4174
 *   node bridge/nocode-host.mjs --port 4180
 *   node bridge/nocode-host.mjs --local         # ce poste seulement (pas d'appareils distants)
 *   node bridge/nocode-host.mjs --pair ABC234   # code d'appairage fixe (sinon nouveau à chaque lancement)
 *
 * Ouvre ensuite le Designer sur ce poste (adresse affichée) : il devient l'hôte.
 * Les téléphones rejoignent via le QR code « Companion » du Designer
 * (Préférences → Carte hôte / QR), sur le même réseau, sans Internet.
 */
import { startRemoteServer, defaultStaticRoot, DEFAULT_PORT } from "./remote-server.mjs";
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

const root = path.resolve(String(arg("root", defaultStaticRoot())));
const local = !!arg("local", false);
const port = Number(arg("port", process.env.NVD_REMOTE_PORT || DEFAULT_PORT));
let version = "";
try { version = JSON.parse(fs.readFileSync(path.join(root, "build-info.json"), "utf8")).version || ""; } catch { /* */ }

const server = await startRemoteServer({
  port,
  host: local ? "127.0.0.1" : "0.0.0.0",
  staticRoot: root,
  pairCode: typeof arg("pair") === "string" ? arg("pair") : null,
  version,
  log: m => console.log(`${new Date().toLocaleTimeString("fr-FR")} ${m}`)
}).catch(err => {
  if (err?.code === "EADDRINUSE") {
    console.error(`Le port ${port} est déjà utilisé (une autre régie No[co]de est peut-être ouverte). Essaie --port ${port + 1}.`);
  } else {
    console.error(err?.message || err);
  }
  process.exit(1);
});

const info = server.hostInfo();
console.log(`\nNo[co]de Vibe Designer ${version} · poste de régie`);
console.log(`  Designer (ce poste) : http://127.0.0.1:${server.port}/desktop/?surface=designer&companionHost=1`);
if (local) {
  console.log("  Mode local : aucun appareil distant accepté.");
} else if (!info.lan.length) {
  console.log("  ⚠ Aucune interface réseau locale détectée : connecte le poste au Wi-Fi / réseau de régie.");
} else {
  console.log(`  Code d'appairage : ${info.pairCode}`);
  for (const item of info.lan) console.log(`  Companion (${item.interface}) : ${item.joinUrl}`);
}
console.log("  Ctrl+C pour arrêter.\n");

const stop = async () => { await server.close(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
