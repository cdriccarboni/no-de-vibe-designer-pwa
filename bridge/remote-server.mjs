/**
 * Pont WebSocket No-de Vibe Designer.
 * Sans hôte connecté, le pont applique les opérations (mode autorité).
 * Avec un hôte (desktop), les opérations lui sont transmises et seul
 * son état publié devient la source de vérité.
 */
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { applyRemoteMessage, initialRemoteState } from "../shared/remote-protocol.js";
import { createFrameParser, encodePong, encodeText, websocketAccept } from "./ws-frames.mjs";

function acceptKey(key) {
  return websocketAccept(key);
}

export function startRemoteServer({ port = 0, host = "127.0.0.1", project = null } = {}) {
  let state = initialRemoteState(project || undefined);
  const clients = new Set();
  let hostClient = null;

  function send(client, obj) {
    if (!client || client.closed) return;
    try { client.socket.write(encodeText(JSON.stringify(obj))); } catch { /* socket mort */ }
  }

  function broadcast(obj, except = null) {
    for (const client of clients) {
      if (client !== except) send(client, obj);
    }
  }

  function forget(client) {
    clients.delete(client);
    if (hostClient === client) {
      hostClient = null;
      broadcast({ type: "peer-lost", role: "host", message: "Hôte déconnecté — perte réseau côté desktop" });
    }
  }

  function handleMessage(client, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { send(client, { type: "error", error: "JSON distant illisible" }); return; }

    if (msg.type === "ping") {
      send(client, { type: "pong", t: msg.t || Date.now() });
      return;
    }
    if (msg.type === "pong") return;

    if (msg.type === "hello") {
      client.role = msg.role === "host" ? "host" : "remote";
      client.id = msg.clientId || client.role;
      if (client.role === "host") {
        if (hostClient && hostClient !== client) {
          send(client, { type: "error", error: "Un hôte est déjà connecté" });
          return;
        }
        hostClient = client;
        if (msg.project) {
          state = { revision: Number.isFinite(msg.revision) ? msg.revision : state.revision, project: msg.project };
          broadcast({ type: "state", revision: state.revision, project: state.project, source: "host" }, client);
        }
      }
      send(client, {
        type: "hello-ack",
        role: client.role,
        revision: state.revision,
        hasHost: !!hostClient
      });
      send(client, { type: "state", revision: state.revision, project: state.project, source: "server" });
      return;
    }

    if (msg.type === "state" && client.role === "host") {
      state = { revision: Number(msg.revision) || 0, project: msg.project };
      broadcast({ type: "state", revision: state.revision, project: state.project, source: "host" }, client);
      return;
    }

    if (msg.type === "conflict" && client.role === "host") {
      broadcast(msg, client);
      return;
    }

    if (msg.type === "op") {
      if (hostClient && client !== hostClient) {
        send(hostClient, msg);
        return;
      }
      const result = applyRemoteMessage(state, msg);
      if (!result.ok) {
        send(client, {
          type: result.conflict ? "conflict" : "error",
          error: result.error,
          revision: result.revision,
          project: result.project
        });
        return;
      }
      state = result.state;
      broadcast({ type: "state", revision: state.revision, project: state.project, source: "server" });
    }
  }

  const server = http.createServer((req, res) => {
    if ((req.url || "").split("?")[0] === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({
        ok: true,
        revision: state.revision,
        clients: clients.size,
        hasHost: !!hostClient,
        nodes: state.project?.nodes?.length || 0
      }));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      return;
    }
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n` +
      "\r\n"
    );
    const client = { socket, role: "remote", id: "", closed: false };
    clients.add(client);
    const parser = createFrameParser((opcode, payload) => {
      if (opcode === 0x8) {
        client.closed = true;
        forget(client);
        try { socket.end(); } catch { /* */ }
        return;
      }
      if (opcode === 0x9) {
        try { socket.write(encodePong(payload)); } catch { /* */ }
        return;
      }
      if (opcode === 0x1) handleMessage(client, payload.toString("utf8"));
    });
    socket.on("data", chunk => {
      try { parser(chunk); } catch (e) {
        send(client, { type: "error", error: e.message || String(e) });
      }
    });
    const drop = () => {
      if (client.closed) return;
      client.closed = true;
      forget(client);
      try { socket.destroy(); } catch { /* */ }
    };
    socket.on("end", drop);
    socket.on("close", drop);
    socket.on("error", drop);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const addr = server.address();
      const bound = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        port: bound,
        host,
        url: `ws://${host}:${bound}`,
        httpUrl: `http://${host}:${bound}`,
        getState: () => state,
        close() {
          for (const client of clients) {
            try { client.socket.destroy(); } catch { /* */ }
          }
          return new Promise(res => server.close(() => res()));
        }
      });
    });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const rawPort = process.env.NVD_REMOTE_PORT;
  const port = rawPort == null || rawPort === "" ? 4174 : Number(rawPort);
  startRemoteServer({ port, host: "127.0.0.1" }).then(server => {
    console.log(`Pont distant No-de Vibe Designer · ${server.url}`);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
