/**
 * No-de Vibe Designer — process principal Electron (Chromium embarqué).
 * Sert l'UI locale sans dépendre d'une installation Chrome externe.
 */
const { app, BrowserWindow, shell, dialog, session, ipcMain } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_NAME = "No-de Vibe Designer";

const LOCAL_AI_DEFAULT_BASE = "http://127.0.0.1:11434";

function normalizeLocalAiBase(value = LOCAL_AI_DEFAULT_BASE) {
  const raw = String(value || LOCAL_AI_DEFAULT_BASE).trim().replace(/\/+$/, "");
  let url;
  try { url = new URL(raw); } catch { throw new Error("URL IA locale invalide"); }
  const host = url.hostname.toLowerCase();
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    throw new Error("IA locale refusée : seul localhost est autorisé");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Protocole IA locale invalide");
  return url.origin;
}

async function localAiRequest(pathname, { baseUrl = LOCAL_AI_DEFAULT_BASE, method = "GET", body = null, timeoutMs = 45000 } = {}) {
  const base = normalizeLocalAiBase(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 45000));
  try {
    const response = await fetch(base + pathname, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* handled below */ }
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status} · ${text.slice(0, 240)}`);
    if (data == null) throw new Error("Réponse IA locale non JSON");
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("IA locale : délai dépassé");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

let mainWindow = null;
let httpServer = null;
let httpPort = 0;
let hostCard = null;
let sendOscUdp = null;
let sendArtNetUdp = null;
let lanAnnouncer = null;

function appRoot() {
  // En développement : racine du dépôt. Empaqueté : resources/app.asar ou resources/app
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar");
  }
  return path.join(__dirname, "..");
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".map": "application/json"
  })[ext] || "application/octet-stream";
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0].split("#")[0]);
  const cleaned = decoded.replace(/^\/+/, "");
  const full = path.normalize(path.join(root, cleaned || "index.html"));
  if (!full.startsWith(path.normalize(root))) return null;
  return full;
}

function startLocalServer(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        let rel = req.url || "/";
        if (rel === "/") rel = "/index.html";
        if (rel === "/nvd-host.json" && hostCard) {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
          res.end(JSON.stringify(hostCard, null, 2));
          return;
        }
        let filePath = safeJoin(root, rel);
        if (!filePath) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }
        if (!fs.existsSync(filePath)) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const data = fs.readFileSync(filePath);
        res.writeHead(200, {
          "Content-Type": contentType(filePath),
          "Cache-Control": "no-cache"
        });
        res.end(data);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err?.message || err));
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      httpPort = addr.port;
      httpServer = server;
      resolve(httpPort);
    });
    server.on("error", reject);
  });
}

async function startRemoteBridge() {
  try {
    const mod = await import(pathToFileURL(path.join(__dirname, "..", "bridge", "remote-server.mjs")).href);
    const started = await mod.startRemoteServer({ port: 4174, host: "127.0.0.1" });
    console.log("REMOTE", started.url);
  } catch (err) {
    console.error("REMOTE_FAILED", err?.message || err);
  }
}

async function loadNativeModules() {
  try {
    const osc = await import(pathToFileURL(path.join(__dirname, "..", "bridge", "osc-udp.mjs")).href);
    sendOscUdp = osc.sendOscUdp;
  } catch (err) {
    console.error("OSC_UDP_LOAD_FAILED", err?.message || err);
  }
  try {
    const artnet = await import(pathToFileURL(path.join(__dirname, "..", "bridge", "artnet-udp.mjs")).href);
    sendArtNetUdp = artnet.sendArtNetUdp;
  } catch (err) {
    console.error("ARTNET_UDP_LOAD_FAILED", err?.message || err);
  }
  try {
    const discovery = await import(pathToFileURL(path.join(__dirname, "..", "shared", "discovery", "host-card.js")).href);
    hostCard = discovery.createHostCard({
      name: APP_NAME,
      host: "127.0.0.1",
      port: 4174,
      httpPort,
      version: app.getVersion()
    });
  } catch (err) {
    console.error("HOST_CARD_FAILED", err?.message || err);
  }
  try {
    const lan = await import(pathToFileURL(path.join(__dirname, "..", "bridge", "lan-discovery.mjs")).href);
    if (lanAnnouncer) lanAnnouncer.stop();
    lanAnnouncer = lan.startLanAnnouncer(() => hostCard);
    console.log("LAN_BEACON", "multicast announce started");
  } catch (err) {
    console.error("LAN_BEACON_FAILED", err?.message || err);
  }
}

ipcMain.handle("nvd:osc-udp", async (_event, message = {}) => {
  if (!sendOscUdp) throw new Error("OSC UDP indisponible dans cet hôte");
  return sendOscUdp(message);
});

ipcMain.handle("nvd:artnet-udp", async (_event, message = {}) => {
  if (!sendArtNetUdp) throw new Error("Art-Net UDP indisponible dans cet hôte");
  return sendArtNetUdp(message);
});

ipcMain.handle("nvd:host-card", async () => {
  if (!hostCard) throw new Error("Carte hôte indisponible");
  return hostCard;
});


ipcMain.handle("nvd:local-ai-probe", async (_event, options = {}) => {
  const data = await localAiRequest("/api/tags", { baseUrl: options.baseUrl, timeoutMs: 3500 });
  const models = Array.isArray(data.models) ? data.models.map(m => m?.name || m?.model).filter(Boolean) : [];
  const requested = String(options.model || "qwen2.5-coder:7b");
  const installed = models.includes(requested) || models.some(name => name.split(":")[0] === requested.split(":")[0]);
  return { ok: true, baseUrl: normalizeLocalAiBase(options.baseUrl), requested, installed, models };
});

ipcMain.handle("nvd:local-ai-chat", async (_event, options = {}) => {
  const model = String(options.model || "qwen2.5-coder:7b").trim();
  if (!model) throw new Error("Modèle IA local manquant");
  const messages = Array.isArray(options.messages) ? options.messages.slice(-12).map(m => ({
    role: ["system", "user", "assistant"].includes(m?.role) ? m.role : "user",
    content: String(m?.content || "").slice(0, 30000)
  })) : [];
  if (!messages.length) throw new Error("Messages IA locale absents");
  const data = await localAiRequest("/api/chat", {
    baseUrl: options.baseUrl,
    method: "POST",
    timeoutMs: options.timeoutMs || 60000,
    body: {
      model,
      stream: false,
      format: "json",
      options: { temperature: Math.max(0, Math.min(1, Number(options.temperature ?? 0.15))) },
      messages
    }
  });
  const content = data?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("IA locale : réponse vide");
  return { ok: true, model: data.model || model, content, totalDuration: data.total_duration || null, evalCount: data.eval_count || null };
});


async function createWindow() {
  await startRemoteBridge();
  const root = appRoot();
  const port = await startLocalServer(root);
  await loadNativeModules();
  const win = new BrowserWindow({
    width: 1440,
    height: 930,
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    backgroundColor: "#101214",
    ...(process.platform === "darwin" ? {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 14, y: 16 }
    } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs")
    }
  });
  mainWindow = win;
  win.setTitle(APP_NAME);

  // Permissions caméra / micro
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === "media" || permission === "mediaKeySystem") callback(true);
    else callback(false);
  });

  if (process.argv.includes("--smoke-test")) {
    const timeout = setTimeout(() => {
      console.error("PACKAGED_SELF_TEST_TIMEOUT");
      app.exit(3);
    }, 20000);
    const run = async () => {
      try {
        let result = null;
        for (let i = 0; i < 50; i++) {
          result = await win.webContents.executeJavaScript(
            "window.__nvdSelfTest ? window.__nvdSelfTest() : null"
          );
          if (result) break;
          await new Promise(r => setTimeout(r, 100));
        }
        clearTimeout(timeout);
        if (!result) result = { ok: false, error: "self-test hook missing" };
        console.log("PACKAGED_SELF_TEST", JSON.stringify(result));
        app.exit(result.ok ? 0 : 2);
      } catch (e) {
        clearTimeout(timeout);
        console.error("PACKAGED_SELF_TEST_ERROR", e);
        app.exit(2);
      }
    };
    win.webContents.once("did-finish-load", () => { run(); });
  }

  await win.loadURL(`http://127.0.0.1:${port}/desktop/`);
  if (process.platform === "darwin") {
    await win.webContents.executeJavaScript(
      'document.documentElement.classList.add("electron-macos")'
    );
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    // OUTPUT popup relative → laisser Electron ouvrir une fenêtre enfant sur même origine
    if (url.startsWith(`http://127.0.0.1:${port}/`)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 960,
          height: 540,
          title: `${APP_NAME} — OUTPUT`,
          backgroundColor: "#000000",
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
          }
        }
      };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.on("closed", () => {
    mainWindow = null;
  });
}

function shutdown() {
  try { httpServer?.close(); } catch { /* */ }
  httpServer = null;
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (err) {
    dialog.showErrorBox(APP_NAME, `Impossible de démarrer : ${err?.message || err}`);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  shutdown();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", shutdown);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
