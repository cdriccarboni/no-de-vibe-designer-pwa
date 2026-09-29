import { createRemoteCameraSession } from "/shared/remote-camera/session.js";
import { listVideoInputs } from "/shared/remote-camera/camera.js";
import { parseCompanionSearch } from "/shared/remote-camera/url.js";
import { rcStateLabel } from "/shared/remote-camera/states.js";

const $ = (id) => document.getElementById(id);
const stateEl = $("state");
const roomEl = $("room");
const deviceEl = $("device");
const metricsEl = $("metrics");
const preview = $("preview");

const parsed = parseCompanionSearch(location.search);
if (parsed.room) roomEl.value = parsed.room;

let session = null;

function renderState(payload) {
  const s = payload?.state || "WAITING";
  stateEl.textContent = `${s} · ${rcStateLabel(s)}${payload?.error ? ` · ${payload.error}` : ""}`;
  if (payload?.metrics) {
    const m = payload.metrics;
    metricsEl.textContent = JSON.stringify({
      firstFrameMs: m.firstFrameMs,
      liveMs: m.liveMs,
      frames: m.frames,
      drops: m.drops,
      fpsEstimate: m.fpsEstimate,
      rttMs: m.rttMs
    }, null, 2);
  }
}

async function fillDevices() {
  try {
    const devices = await listVideoInputs();
    for (const d of devices) {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Caméra ${d.deviceId.slice(0, 6)}`;
      deviceEl.appendChild(opt);
    }
  } catch (e) {
    stateEl.textContent = `ERROR · ${e.message || e}`;
  }
}

$("connect").onclick = async () => {
  try {
    session?.stop();
    const room = (roomEl.value || "").trim().toUpperCase();
    if (!room) throw new Error("Code salon requis (QR Desktop)");
    if (!window.Peer) throw new Error("PeerJS encore en chargement — réessaie");
    session = createRemoteCameraSession({
      role: "phone",
      room,
      videoEl: preview,
      onState: renderState,
      onStream: (stream) => {
        preview.srcObject = stream;
        preview.play?.().catch?.(() => {});
      },
      onLog: (msg) => console.info(msg)
    });
    await session.startPhone({ deviceId: deviceEl.value || "" });
  } catch (e) {
    renderState({ state: "ERROR", error: e.message || String(e) });
  }
};

$("stop").onclick = () => {
  session?.stop();
  preview.srcObject = null;
  renderState({ state: "DISCONNECTED" });
};

fillDevices();
renderState({ state: "WAITING" });
