import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = 3333;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".wasm": "application/wasm",
  ".txt": "text/plain"
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split("?")[0]);
  if (reqPath.endsWith("/")) reqPath += "index.html";
  const filePath = path.join(root, reqPath);

  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("404 Not Found");
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      return fs.createReadStream(indexPath).pipe(res);
    }
    res.writeHead(403);
    return res.end("Forbidden");
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-cache"
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`No[co]de Vibe Designer Preview Server running on http://localhost:${port}/`);
});
