// Application desktop No[co]de Vibe Designer (builds publics macOS / Windows / Linux).
// L'application est servie par le pont de régie (bridge/remote-server.mjs) :
//   - le Designer devient l'hôte des télécommandes ;
//   - les téléphones du réseau local rejoignent par le QR « Companion » (code d'appairage) ;
//   - aucun accès Internet requis.
// Si le pont ne démarre pas (port occupé partout, module absent), on revient au serveur local
// historique (ce poste seulement) et l'interface l'indique : jamais de faux « connecté ».
const { app, BrowserWindow, shell, session, dialog } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_NAME = "No[co]de Vibe Designer";
const BRIDGE_PORTS = [4174, 4175, 4176, 4177, 4178];
const FALLBACK_PORT = 17654;
let bridge = null;
let fallbackServer = null;

function appRoot() {
  return app.isPackaged ? path.join(process.resourcesPath, "app.asar") : path.join(__dirname, "..");
}

// Les modules ES du pont sont dépaquetés (asarUnpack) : import depuis app.asar.unpacked.
function moduleRoot() {
  const root = appRoot();
  const unpacked = root.replace(/app\.asar$/, "app.asar.unpacked");
  return fs.existsSync(path.join(unpacked, "bridge", "remote-server.mjs")) ? unpacked : root;
}

async function startBridge() {
  const mod = await import(pathToFileURL(path.join(moduleRoot(), "bridge", "remote-server.mjs")).href);
  let version = app.getVersion();
  try { version = JSON.parse(fs.readFileSync(path.join(appRoot(), "build-info.json"), "utf8")).version || version; } catch { /* */ }
  let lastError = null;
  for (const port of BRIDGE_PORTS) {
    try {
      return await mod.startRemoteServer({
        port,
        host: "0.0.0.0",
        staticRoot: appRoot(),
        version,
        name: APP_NAME,
        osc: { port: 9010 }, mdns: true, // QLab / Chataigne / TouchDesigner → No[co]de ; OSCQuery sur le même port (TCP)
        log: (m) => console.log(m)
      });
    } catch (err) {
      lastError = err;
      if (err?.code !== "EADDRINUSE") break;
    }
  }
  throw lastError || new Error("Pont de régie indisponible");
}

function mime(p) {
  const e = path.extname(p).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webmanifest": "application/manifest+json", ".wasm": "application/wasm"
  })[e] || "application/octet-stream";
}

function startFallbackServer() {
  const r = appRoot();
  return new Promise((resolve, reject) => {
    fallbackServer = http.createServer((req, res) => {
      let rel = decodeURIComponent((req.url || "/").split("?")[0]).replace(/^\/+/, "") || "index.html";
      let p = path.normalize(path.join(r, rel));
      if (!p.startsWith(path.normalize(r))) { res.writeHead(403); return res.end("Forbidden"); }
      try { if (fs.statSync(p).isDirectory()) p = path.join(p, "index.html"); } catch { /* */ }
      if (!fs.existsSync(p)) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "Content-Type": mime(p), "Cache-Control": "no-cache" });
      fs.createReadStream(p).pipe(res);
    });
    fallbackServer.on("error", reject);
    fallbackServer.listen(FALLBACK_PORT, "127.0.0.1", () => resolve(fallbackServer.address().port));
  });
}

async function create() {
  let base;
  try {
    bridge = await startBridge();
    base = `http://127.0.0.1:${bridge.port}`;
    console.log(`REMOTE ws://0.0.0.0:${bridge.port}`);
  } catch (err) {
    console.error("REMOTE_FAILED", err?.message || err);
    base = `http://127.0.0.1:${await startFallbackServer()}`;
  }
  const win = new BrowserWindow({
    width: 1440, height: 930, minWidth: 1024, minHeight: 700,
    title: APP_NAME, backgroundColor: "#101214",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  session.defaultSession.setPermissionRequestHandler((_wc, p, cb) => cb(p === "media" || p === "geolocation" || p === "notifications"));
  await win.loadURL(`${base}/desktop/?surface=designer`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`${base}/`)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
  if (!bridge) {
    dialog.showMessageBox(win, {
      type: "warning",
      message: "Régie réseau indisponible",
      detail: "Les ports 4174 à 4178 sont occupés : les téléphones ne pourront pas se connecter à ce poste. Ferme l'autre régie No[co]de puis relance l'application."
    }).catch(() => {});
  }
}

if (app.requestSingleInstanceLock()) app.whenReady().then(create);
else app.quit();

app.on("window-all-closed", () => {
  try { bridge?.close(); } catch { /* */ }
  try { fallbackServer?.close(); } catch { /* */ }
  app.quit();
});
