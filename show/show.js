import {
  loadExampleScene, loadScene, startShow, pauseShow, stopShow, tickShow,
  fireCue, saveShow, restoreShow, askShow, setKeyframe, timelineRows, showMonitor, CX_NOTE, CX_BRIDGE_URL
} from "../shared/show-session.js";
import { backendStatus } from "../shared/backend-registry.js";
import { activeAgents, nativeBridgeLabel, runShaderAgent } from "../shared/shader-agent.js";

const SAVE_KEY = "nvd.show.save";
let session = loadExampleScene();
let timer = 0;

const $ = id => document.getElementById(id);

function paint() {
  $("sceneName").textContent = session.sceneName || "Scène";
  $("clock").textContent = session.time.toFixed(2) + " s";
  $("runState").textContent = !session.running ? "Arrêt" : session.paused ? "Pause" : "Lecture";
  const node = session.project.nodes[0];
  $("bound").textContent = node ? `${node.title || node.type} · opacité ${Number(node.params?.opacity ?? 1).toFixed(2)}` : "Aucun node";
  $("timeline").textContent = timelineRows(session).map(row => {
    if (row.kind === "curve") return `courbe ${row.label} · ${row.keys.map(key => key.time + ":" + key.value + " " + key.ease).join(" → ")}`;
    return `${row.kind} ${row.number || ""} ${row.label || row.id} · ${row.time ?? 0}s`;
  }).join("\n");
  $("cxNote").textContent = CX_NOTE;
  paintMonitor();
}

function compileInBrowser(source) {
  const canvas = $("preview");
  const gl = canvas.getContext("webgl2");
  if (!gl) return { compile: false, observed: false, error: "WebGL2 indisponible" };
  const make = (type, src) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return gl.getShaderInfoLog(shader) || "compile";
    return shader;
  };
  try {
    const vs = make(gl.VERTEX_SHADER, source.vertex);
    const fs = make(gl.FRAGMENT_SHADER, source.fragment);
    if (typeof vs !== "object" || typeof fs !== "object") {
      return { compile: false, observed: false, error: [vs, fs].filter(item => typeof item === "string").join(" ") };
    }
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return { compile: false, observed: false, error: gl.getProgramInfoLog(program) || "link" };
    }
    gl.useProgram(program);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([
      220, 40, 40, 255, 40, 180, 60, 255, 40, 80, 220, 255, 230, 200, 40, 255
    ]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const [name, value] of [["u_amplitude", 0.08], ["u_frequency", 6], ["u_speed", 1.2], ["u_phase", 0.4], ["u_time", 1]]) {
      const slot = gl.getUniformLocation(program, name);
      if (slot) gl.uniform1f(slot, value);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const pixel = new Uint8Array(4);
    gl.readPixels(160, 90, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return { compile: true, observed: true, pixel: Array.from(pixel), preview: "show/index.html#preview" };
  } catch (error) {
    return { compile: false, observed: false, error: error?.message || String(error) };
  }
}

async function refreshNative() {
  let health = null;
  try {
    const res = await fetch(CX_BRIDGE_URL.replace(/\/chat$/, "/health"), { signal: AbortSignal.timeout(800) });
    if (res.ok) health = await res.json();
  } catch { health = null; }
  $("native").textContent = nativeBridgeLabel(health?.ok ? health : null);
}

function paintMonitor() {
  const state = showMonitor(session);
  const canvas = $("monitor");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#9aa3ab";
  ctx.font = "13px sans-serif";
  const transport = !state.running ? "arrêt" : state.paused ? "pause" : "lecture";
  ctx.fillText(`${state.sceneName || "Scène"} · ${transport} · ${state.time.toFixed(2)} s · ${state.edges} lien(s) · ${state.cues.length} cue(s)`, 16, 22);
  state.nodes.forEach((node, index) => {
    const x = 16 + (index % 6) * 102;
    const y = 40 + Math.floor(index / 6) * 72;
    ctx.globalAlpha = Math.max(0.18, Math.min(1, node.opacity));
    ctx.fillStyle = node.type === "camera" ? "#d7b86a" : node.type === "shader" ? "#3d7ea6" : "#2f6b4f";
    ctx.fillRect(x, y, 92, 52);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#101214";
    ctx.fillText(String(node.title).slice(0, 12), x + 8, y + 22);
    ctx.fillText(node.opacity.toFixed(2), x + 8, y + 40);
  });
}

function remember() {
  localStorage.setItem(SAVE_KEY, saveShow(session));
}

$("openFile").onchange = async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  session = restoreShow(await file.text());
  loadScene(session);
  paint();
};

$("loadScene").onclick = () => { loadScene(session); paint(); };
$("start").onclick = () => { startShow(session); paint(); };
$("pause").onclick = () => { pauseShow(session); paint(); };
$("stop").onclick = () => { stopShow(session); paint(); };
$("go").onclick = () => {
  const result = fireCue(session);
  $("log").textContent = result.ok ? `Cue ${result.cue?.label || ""}` : (result.error || "cue refusée");
  remember();
  paint();
};
$("save").onclick = () => {
  const text = saveShow(session);
  localStorage.setItem(SAVE_KEY, text);
  const blob = new Blob([text], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = (session.project.name || "show") + ".cvd.json";
  link.click();
  URL.revokeObjectURL(link.href);
};
$("restore").onclick = () => {
  const saved = localStorage.getItem(SAVE_KEY);
  if (!saved) { $("log").textContent = "Aucune sauvegarde Show"; return; }
  session = restoreShow(saved);
  loadScene(session);
  paint();
};
$("ask").onclick = async () => {
  const text = $("chat").value.trim();
  if (!text) return;
  let cx = null;
  try {
    const res = await fetch(CX_BRIDGE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) cx = await res.json();
  } catch {
    cx = null;
  }
  const result = askShow(session, text, cx);
  const gates = activeAgents(backendStatus(), {});
  const shader = await runShaderAgent(session, text, compileInBrowser, { eligible: gates.active.includes("shader") });
  const cue = result.cueOk ? ` · cue ${result.cueId}` : "";
  const wave = shader.ran
    ? ` · ${shader.camera} → ${shader.shader} · compilé · pixel ${shader.pixel.join(",")}`
    : "";
  $("log").textContent = result.ok
    ? `${result.added} node(s)${cue}${wave} · ${result.note}`
    : `${result.error || "aucune opération"}${shader.ran ? "" : ""} · ${result.note}`;
  remember();
  paint();
};
$("chat").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("ask").click(); }
});
$("addKey").onclick = () => {
  const node = session.project.nodes[0];
  if (!node) { $("log").textContent = "Aucun node à animer"; return; }
  setKeyframe(session.project, node.id, "opacity", Number($("keyTime").value) || 0, Number($("keyValue").value), $("keyEase").value);
  remember();
  paint();
};

timer = setInterval(() => {
  const before = session.time;
  tickShow(session, 0.1);
  if (session.time !== before) paint();
}, 100);

const saved = localStorage.getItem(SAVE_KEY);
if (saved) {
  try { session = restoreShow(saved); loadScene(session); } catch { session = loadExampleScene(); }
}
paint();
refreshNative();
