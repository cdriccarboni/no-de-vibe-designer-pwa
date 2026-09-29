/**
 * Démarre le pont WebSocket dans un processus Node à part.
 * Le spec Playwright ne doit pas importer shared/*.js : sans "type":"module"
 * dans package.json, ce chargement est vu comme du CommonJS.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function startOnce(port) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, NVD_REMOTE_PORT: String(port) };
    delete env.NVD_WS_GUID;
    const child = spawn(process.execPath, ["bridge/remote-server.mjs"], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let out = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`Pont distant trop long à démarrer\n${out}`));
    }, 8000);
    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
      const match = out.match(/ws:\/\/127\.0\.0\.1:\d+/);
      if (!match || settled) return;
      settled = true;
      clearTimeout(timer);
      const url = match[0];
      resolve({
        url,
        httpUrl: url.replace(/^ws:/, "http:"),
        port: Number(new URL(url).port),
        async close() {
          if (child.exitCode != null || child.signalCode) return;
          child.kill("SIGTERM");
          await new Promise((res) => {
            const killTimer = setTimeout(() => {
              child.kill("SIGKILL");
              res();
            }, 2000);
            child.once("exit", () => {
              clearTimeout(killTimer);
              res();
            });
          });
        }
      });
    });
    child.stderr.on("data", (chunk) => { out += chunk.toString(); });
    child.on("error", fail);
    child.on("exit", (code) => {
      if (!settled) fail(new Error(`Pont distant terminé (${code}) · ${out}`));
    });
  });
}

export async function startBridgeProcess(portOrOptions = 0, attempts = 8) {
  const port = typeof portOrOptions === "object" && portOrOptions
    ? Number(portOrOptions.port ?? 0)
    : Number(portOrOptions);
  let last = new Error("Pont distant indisponible");
  for (let i = 0; i < attempts; i++) {
    try {
      return await startOnce(Number.isFinite(port) ? port : 0);
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw last;
}
