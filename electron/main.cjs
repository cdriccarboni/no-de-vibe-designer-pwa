/**
 * No-de Vibe Designer — process principal Electron (Chromium embarqué).
 * Sert l'UI locale sans dépendre d'une installation Chrome externe.
 */
const { app, BrowserWindow, shell, dialog, session, ipcMain } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_NAME = "No[co]de Vibe Designer";


function appleHelperPath() {
  return path.join(__dirname, "..", "native", "apple", "nvd-apple-intel");
}

function runAppleHelper(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const child = spawn(appleHelperPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Apple Intelligence : délai dépassé"));
    }, timeoutMs);
    child.stdout.on("data", chunk => { out += chunk; });
    child.stderr.on("data", chunk => { err += chunk; });
    child.on("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0 && !out.trim()) {
        reject(new Error(err.trim() || `Apple Intelligence : sortie ${code}`));
        return;
      }
      try { resolve(JSON.parse(out)); }
      catch { reject(new Error(err.trim() || "Apple Intelligence : réponse illisible")); }
    });
  });
}

const LOCAL_AI_DEFAULT_BASE = "http://127.0.0.1:11434";

function isTrustedAiHost(hostname = "") {
  const host = String(hostname).toLowerCase().replace(/^\[|\]$/g, "");
  if (["127.0.0.1", "localhost", "::1"].includes(host)) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  return !!m && Number(m[1]) >= 16 && Number(m[1]) <= 31;
}

function normalizeLocalAiBase(value = LOCAL_AI_DEFAULT_BASE) {
  const raw = String(value || LOCAL_AI_DEFAULT_BASE).trim().replace(/\/+$/, "");
  let url;
  try { url = new URL(raw); } catch { throw new Error("URL IA locale invalide"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Protocole IA locale invalide");
  if (!isTrustedAiHost(url.hostname)) {
    throw new Error("IA locale refusée : utilise localhost ou une IP privée du réseau local");
  }
  return url.origin;
}

function normalizeAiEndpoint(value = "") {
  let url;
  try { url = new URL(String(value || "").trim()); } catch { throw new Error("Endpoint IA invalide"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Endpoint IA : HTTP/HTTPS uniquement");
  return url.toString();
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
let cxShowBridge = null;
let httpPort = 0;
let hostCard = null;
let sendOscUdp = null;
let sendArtNetUdp = null;
let sendSacnUdp = null;
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


function cxHealth() {
  return new Promise(resolve => {
    const req = http.get("http://127.0.0.1:4877/health", res => {
      let body = "";
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          resolve(json?.ok && json.commit ? json : null);
        } catch {
          resolve(null);
        }
      });
    });
    req.setTimeout(4000, () => { req.destroy(); resolve(null); });
    req.on("error", () => resolve(null));
  });
}

async function startCxShowBridge() {
  if (cxShowBridge?.server) return;
  try {
    let health = await cxHealth();
    if (!health) {
      const mod = await import(pathToFileURL(path.join(__dirname, "..", "bridge", "cx-show-server.mjs")).href);
      cxShowBridge = await mod.startCxShowBridge();
      health = await cxHealth();
    } else {
      cxShowBridge = { url: "http://127.0.0.1:4877/chat", already: true, server: null };
    }
    if (health?.commit) console.log("CX_BRIDGE", health.commit, health.chain || "");
    else console.error("CX_BRIDGE_UNHEALTHY");
  } catch (err) {
    console.error("CX_BRIDGE_FAILED", err?.message || err);
  }
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
    const sacn = await import(pathToFileURL(path.join(__dirname, "..", "bridge", "sacn-udp.mjs")).href);
    sendSacnUdp = sacn.sendSacnUdp;
  } catch (err) {
    console.error("SACN_UDP_LOAD_FAILED", err?.message || err);
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

ipcMain.handle("nvd:sacn-udp", async (_event, message = {}) => {
  if (!sendSacnUdp) throw new Error("sACN UDP indisponible dans cet hôte");
  return sendSacnUdp(message);
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

ipcMain.handle("nvd:local-ai-show", async (_event, options = {}) => {
  const model = String(options.model || "").trim();
  if (!model) throw new Error("Modèle IA local manquant");
  return localAiRequest("/api/show", {
    baseUrl: options.baseUrl,
    method: "POST",
    timeoutMs: 5000,
    body: { model }
  });
});

ipcMain.handle("nvd:local-ai-agents-scan", async (_event, options = {}) => {
  const baseUrl = normalizeLocalAiBase(options.baseUrl);
  const data = await localAiRequest("/api/tags", { baseUrl, timeoutMs: 3500 });
  const models = Array.isArray(data.models) ? data.models.map(m => m?.name || m?.model).filter(Boolean) : [];
  const agents = [];
  for (let i = 0; i < models.length; i += 4) {
    const batch = models.slice(i, i + 4);
    const rows = await Promise.all(batch.map(async model => {
      try {
        const show = await localAiRequest("/api/show", {
          baseUrl,
          method: "POST",
          timeoutMs: 5000,
          body: { model }
        });
        return { model, show };
      } catch {
        return { model, show: {} };
      }
    }));
    agents.push(...rows);
  }
  return { ok:true, baseUrl, agents };
});

ipcMain.handle("nvd:local-ai-install", async (_event, options = {}) => {
  const model = String(options.model || "").trim();
  if (!model || model.length > 120 || /[\r\n]/.test(model)) throw new Error("Nom de modèle Ollama invalide");
  const data = await localAiRequest("/api/pull", {
    baseUrl: options.baseUrl,
    method: "POST",
    timeoutMs: options.timeoutMs || 30 * 60 * 1000,
    body: { name: model, stream: false }
  });
  return { ok: true, model, status: data?.status || "success" };
});

ipcMain.handle("nvd:ai-node-request", async (_event, options = {}) => {
  const protocol = String(options.protocol || "ollama").toLowerCase();
  const model = String(options.model || "qwen2.5-coder:7b").trim();
  const prompt = String(options.prompt || "").slice(0, 30000);
  const system = String(options.system || "Tu es un moteur créatif relié à No-de Vibe Designer.").slice(0, 12000);
  if (!prompt.trim()) throw new Error("Prompt IA vide");

  if (protocol === "apple") {
    const result = await runAppleHelper(["respond", prompt]);
    if (!result?.ok || !String(result.content || "").trim()) {
      throw new Error(result?.reason || result?.error || "Apple Intelligence indisponible");
    }
    return { ok: true, protocol, model: "foundation-models", content: String(result.content).trim() };
  }

  if (protocol === "ollama") {
    const data = await localAiRequest("/api/chat", {
      baseUrl: options.baseUrl,
      method: "POST",
      timeoutMs: options.timeoutMs || 60000,
      body: {
        model,
        stream: false,
        options: { temperature: Math.max(0, Math.min(1, Number(options.temperature ?? 0.2))) },
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }]
      }
    });
    const content = String(data?.message?.content || "").trim();
    if (!content) throw new Error("IA locale : réponse vide");
    return { ok: true, protocol, model: data?.model || model, content };
  }

  const endpoint = normalizeAiEndpoint(options.endpoint);
  const hostText = endpoint.toLowerCase();
  if (hostText.includes("api.x.ai") || /\bgrok\b/.test(model.toLowerCase())) {
    throw new Error("Ce fournisseur IA est désactivé dans No-de Vibe Designer");
  }
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (options.apiKey) headers.Authorization = "Bearer " + String(options.apiKey);
  const payload = protocol === "generic"
    ? { model, prompt, input: prompt, ...(options.body && typeof options.body === "object" ? options.body : {}) }
    : {
        model,
        temperature: Math.max(0, Math.min(1, Number(options.temperature ?? 0.2))),
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }]
      };
  const response = await fetch(endpoint, {
    method: String(options.method || "POST").toUpperCase(),
    headers,
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Endpoint IA HTTP " + response.status + " · " + text.slice(0, 240));
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* plain text allowed */ }
  const content = String(
    data?.choices?.[0]?.message?.content
      ?? data?.message?.content
      ?? data?.output_text
      ?? data?.response
      ?? data?.text
      ?? text
      ?? ""
  ).trim();
  if (!content) throw new Error("Endpoint IA : réponse vide");
  return { ok: true, protocol, model, content };
});

ipcMain.handle("nvd:ai-asset-request", async (_event, options = {}) => {
  const kind = String(options.kind || "image").toLowerCase();
  const endpoint = normalizeAiEndpoint(options.endpoint);
  const model = String(options.model || "").trim();
  const prompt = String(options.prompt || "").slice(0, 30000);
  if (!prompt.trim()) throw new Error("Prompt média IA vide");
  if (!["image","video","audio","3d"].includes(kind)) throw new Error("Type média IA invalide");
  const hostText = endpoint.toLowerCase();
  if (hostText.includes("api.x.ai") || /\bgrok\b/.test(model.toLowerCase())) {
    throw new Error("Ce fournisseur IA est désactivé dans No-de Vibe Designer");
  }
  const headers = { "Content-Type":"application/json", ...(options.headers || {}) };
  if (options.apiKey) headers.Authorization = "Bearer " + String(options.apiKey);
  const payload = {
    kind,
    model,
    prompt,
    input: prompt,
    referenceUrl: options.referenceUrl || "",
    ...(options.params && typeof options.params === "object" ? options.params : {}),
    ...(options.body && typeof options.body === "object" ? options.body : {})
  };
  const response = await fetch(endpoint, {
    method: String(options.method || "POST").toUpperCase(),
    headers,
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Endpoint média IA HTTP " + response.status + " · " + text.slice(0,240));
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* plain text URL accepted */ }
  const url = String(
    data?.url
      ?? data?.output_url
      ?? data?.outputUrl
      ?? data?.file_url
      ?? data?.fileUrl
      ?? data?.data_url
      ?? data?.dataUrl
      ?? data?.data?.[0]?.url
      ?? (/^(https?:|data:)/.test(text.trim()) ? text.trim() : "")
      ?? ""
  ).trim();
  if (!url) throw new Error("Endpoint média IA : aucune URL de sortie exploitable");
  return { ok:true, kind, model, url };
});

ipcMain.handle("nvd:local-ai-chat", async (_event, options = {}) => {
  const model = String(options.model || "qwen2.5-coder:7b").trim();
  if (!model) throw new Error("Modèle IA local manquant");
  const sourceMessages = Array.isArray(options.messages)
    ? options.messages
    : [
        { role: "system", content: options.system },
        { role: "user", content: options.user }
      ];
  const messages = sourceMessages.slice(-12).map(m => ({
    role: ["system", "user", "assistant"].includes(m?.role) ? m.role : "user",
    content: String(m?.content || "").slice(0, 30000)
  })).filter(m => m.content.trim());
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
  await startCxShowBridge();
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
  try { cxShowBridge?.server?.close(); } catch { /* */ }
  cxShowBridge = null;
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
