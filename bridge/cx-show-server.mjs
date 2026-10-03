/**
 * Runtime local du chat CX. Écoute seulement 127.0.0.1.
 * Le site HTTPS public ne peut pas l'appeler.
 */
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(root, "cx_show_bridge.py");
const port = Number(process.env.CX_SHOW_PORT || 4877);
const host = "127.0.0.1";

function headers() {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

function ask(text) {
  return new Promise(resolve => {
    const child = spawn("python3", [script, "--remember", text], { env: process.env });
    let out = "";
    let err = "";
    child.stdout.on("data", chunk => { out += chunk; });
    child.stderr.on("data", chunk => { err += chunk; });
    child.on("close", code => {
      try {
        resolve(JSON.parse(out));
      } catch {
        resolve({ ok: false, error: err.trim() || `pont CX arrêté (${code})` });
      }
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers());
    res.end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/chat") {
    res.writeHead(404, headers());
    res.end(JSON.stringify({ ok: false, error: "introuvable" }));
    return;
  }
  let body = "";
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 8000) req.destroy();
  });
  req.on("end", async () => {
    let text = "";
    try { text = String(JSON.parse(body).text || ""); } catch { text = ""; }
    const payload = await ask(text.slice(0, 2000));
    res.writeHead(payload.ok ? 200 : 400, headers());
    res.end(JSON.stringify(payload));
  });
});

server.listen(port, host, () => {
  console.log(`CX show bridge http://${host}:${port}/chat`);
});
