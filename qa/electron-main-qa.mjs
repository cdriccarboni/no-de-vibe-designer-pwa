// QA de electron/main.cjs sans binaire Electron : le module « electron » est simulé.
// Vérifie la logique réelle du main : pont de régie démarré sur 0.0.0.0, port suivant si 4174 est pris,
// fenêtre chargée sur le Designer servi par le pont (signal Server-Timing), arrêt propre.
// Limite assumée : ne prouve pas le comportement d'Electron lui-même (fenêtre, asar, signature).
// Usage : node qa/electron-main-qa.mjs
import net from "node:net";
import path from "node:path";
import Module from "node:module";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (cond, label, detail = "") => {
  results.push({ ok: !!cond });
  console.log(`${cond ? "OK  " : "FAIL"} · ${label}${detail ? " · " + detail : ""}`);
};
const wait = ms => new Promise(r => setTimeout(r, ms));

// Occupe 4174 comme le ferait une autre régie déjà ouverte (si le port est libre).
const blocker = net.createServer();
const blocked = await new Promise(r => { blocker.once("error", () => r(false)); blocker.listen(4174, "0.0.0.0", () => r(true)); });

let loaded = null;
let quitHandler = null;
let ready = null;
const fake = {
  app: {
    isPackaged: false,
    getVersion: () => "0.0.0",
    requestSingleInstanceLock: () => true,
    whenReady: () => ({ then: fn => { ready = Promise.resolve().then(fn); return ready; } }),
    on: (ev, fn) => { if (ev === "window-all-closed") quitHandler = fn; },
    quit: () => {}
  },
  BrowserWindow: class { constructor() { this.webContents = { setWindowOpenHandler: () => {} }; } async loadURL(u) { loaded = u; } },
  shell: { openExternal: () => {} },
  session: { defaultSession: { setPermissionRequestHandler: () => {} } },
  dialog: { showMessageBox: () => Promise.resolve() }
};
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "electron") return fake;
  return origLoad.call(this, request, ...rest);
};

try {
  require(path.join(root, "electron", "main.cjs"));
  await ready;
  check(!!loaded, "fenêtre chargée", loaded || "");
  const u = loaded ? new URL(loaded) : null;
  check(u && u.pathname === "/desktop/" && u.searchParams.get("surface") === "designer", "Designer ouvert");
  if (blocked) check(u && u.port === "4175", "4174 occupé : port suivant utilisé", u?.port);
  const res = await fetch(loaded);
  check(res.ok && /nvdbridge/.test(res.headers.get("server-timing") || ""), "page servie par le pont (Server-Timing)");
  const info = await (await fetch(`${u.origin}/__nocode/host`)).json();
  check(info.schema === "nvd.bridge" && /^[A-Z2-9]{6}$/.test(info.pairCode), "carte hôte + code d'appairage disponibles", info.pairCode);
  check(Array.isArray(info.lan), "adresses réseau local listées", String(info.lan.length));
  quitHandler?.();
  await wait(200);
  const after = await fetch(`${u.origin}/health`).then(() => "up", () => "down");
  check(after === "down", "fermeture : pont arrêté");
} catch (e) {
  check(false, "exception", e.stack || String(e));
} finally {
  Module._load = origLoad;
  blocker.close();
}
const failed = results.filter(r => !r.ok).length;
console.log(`\nelectron/main.cjs : ${results.length - failed}/${results.length}`);
process.exit(failed ? 1 : 0);
