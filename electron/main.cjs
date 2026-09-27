/**
 * No-de Vibe Designer — process principal Electron (Chromium embarqué).
 * Sert l'UI locale sans dépendre d'une installation Chrome externe.
 */
const { app, BrowserWindow, shell, dialog, session } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_NAME = "No-de Vibe Designer";
let mainWindow = null;
let httpServer = null;
let httpPort = 0;

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

async function createWindow() {
  const root = appRoot();
  const port = await startLocalServer(root);
  const win = new BrowserWindow({
    width: 1440,
    height: 930,
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    backgroundColor: "#101214",
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
