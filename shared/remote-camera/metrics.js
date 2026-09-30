/**
 * Lightweight latency / path marks for Remote Camera.
 * Prefer direct MediaStream; avoid JSON frames / extra canvases in the hot path.
 */
export function createRcMetrics() {
  const marks = new Map();
  let frames = 0;
  let drops = 0;
  let lastFrameAt = 0;
  let rttMs = null;

  function mark(name, detail = {}) {
    const t = typeof performance !== "undefined" ? performance.now() : Date.now();
    marks.set(name, { t, detail, wall: Date.now() });
    return t;
  }

  function delta(from, to) {
    const a = marks.get(from);
    const b = marks.get(to);
    if (!a || !b) return null;
    return Math.round(b.t - a.t);
  }

  function onFrame() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (lastFrameAt && now - lastFrameAt > 80) drops += 1;
    lastFrameAt = now;
    frames += 1;
  }

  function setRtt(ms) {
    rttMs = typeof ms === "number" ? ms : null;
  }

  function snapshot() {
    return {
      marks: Object.fromEntries([...marks.entries()].map(([k, v]) => [k, { wall: v.wall, detail: v.detail }])),
      cameraReadyMs: delta("CAMERA_PERMISSION", "CAMERA_READY"),
      peerConnectedMs: delta("QR_OPEN", "PEER_CONNECTED") ?? delta("CONNECTING", "PEER_CONNECTED"),
      firstFrameMs: delta("CAMERA_READY", "FIRST_FRAME") ?? delta("PEER_CONNECTED", "FIRST_FRAME"),
      liveMs: delta("QR_OPEN", "LIVE") ?? delta("CONNECTING", "LIVE"),
      frames,
      drops,
      rttMs,
      fpsEstimate: frames > 1 && marks.has("FIRST_FRAME")
        ? Math.round((frames / Math.max(0.001, ((typeof performance !== "undefined" ? performance.now() : Date.now()) - marks.get("FIRST_FRAME").t) / 1000)) * 10) / 10
        : null
    };
  }

  function reset() {
    marks.clear();
    frames = 0;
    drops = 0;
    lastFrameAt = 0;
    rttMs = null;
  }

  return { mark, delta, onFrame, setRtt, snapshot, reset };
}
