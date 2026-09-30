import { installSurfaceSwitcher } from "../shared/surface-switcher.js";
import { newProject, validateProject, exportProject, createDemoProject, openProject } from "../shared/ir.js";
import { Runtime } from "../shared/runtime.js";
import { DESTINATIONS, ROUTE_MODES, ensureRouting, effectiveRoute } from "../shared/routing.js";
import { DeviceManager } from "../shared/device-manager.js";
import { portDirection, portLabels, portDataType, isExecutable } from "../shared/ports.js";
import { validateEdge } from "../shared/graph-engine.js";
import { runVibe, applyVibeOps, readAiConfig, saveAiConfig, assertAiProviderAllowed, probeLocalAi } from "../shared/vibe.js";
import { APP_NAME, APP_VERSION, BUILD_LABEL } from "../shared/version.js";
import { NODE_GROUPS, spec as sharedSpec } from "../shared/node-specs.js";
import { createHistory } from "../shared/history.js";
import { addBoxPort, ensureSubGraph, wrapNodesInSubpatch } from "../shared/subpatch.js";
import { sharedAudio } from "../shared/audio-engine.js";
import { planManualSave, planManualOpen, saveStatusMessage, MANUAL_SAVE_KEY } from "../shared/save-fallback.js";
import { nestedBoxSelfTest } from "../shared/self-test.js";
import { connectRemote } from "../shared/remote-client.js";
import { REMOTE_PORT } from "../shared/remote-protocol.js";
import { applyCue, listCues, nextCue, previousCue } from "../shared/stage/cues.js";
import { exportMax, exportTouchDesigner, exportPureData, exportMilluminOscMap } from "../shared/exporters.js";
import { createHostCard, hostCardToQrPayload } from "../shared/discovery/host-card.js";
import { discoveryCapabilities } from "../shared/discovery/lan-beacon.js";
import { createRemoteCameraSession, makeRoomCode } from "../shared/remote-camera/session.js";
import { companionJoinUrl } from "../shared/remote-camera/url.js";
import { rcStateLabel } from "../shared/remote-camera/states.js";
import { ndiStatusMessage } from "../shared/remote-camera/ndi.js";
import { markCrashRecovery, clearCrashRecovery, loadCrashRecovery, pushRecentProject } from "../shared/session-recovery.js";
import {
  loadSession,
  saveSession,
  rememberRemoteCameraRoom,
  loadRemoteCameraRoom,
  markProjectMeta,
  COMPANION_BASE_KEY
} from "../shared/session-store.js";
import { LINK_STATES, linkFromRemoteCamera } from "../shared/connection-states.js";
import { buildDiagnosticSnapshot, copyDiagnostic, formatDiagnosticText } from "../shared/diagnostic.js";
import { mediaStatusForNode, MEDIA_STATUS } from "../shared/media-status.js";
import { createRemoteGhostDemo, createVideoMagicFxDemo, createStageOscDemo } from "../shared/demos.js";
import { STUDIO_MSG } from "../shared/companion-studio/protocol.js";
import { applyCompanionBinding, findWidget } from "../shared/companion-studio/bindings.js";
import { loadCompanionLayout, ensureCompanionLayout, saveCompanionLayout } from "../shared/companion-studio/store.js";
import { validateCompanionDocument } from "../shared/companion-studio/schema.js";
import { DETECT_ACTIONS, formatDetectBanner, loadDetectPref, rememberDetectPref } from "../shared/companion-studio/detect.js";
import { DEFAULT_P5_SCRIPT, DEFAULT_SKETCH_SCRIPT } from "../shared/graphics/sketch-engine.js";
import { applyShowManifest, showManifestSummary } from "../shared/show-importer.js";

installSurfaceSwitcher({ current:"designer" });

const $ = s => document.querySelector(s);
const qall = s => [...document.querySelectorAll(s)];

if ("serviceWorker" in navigator && window.nvdDesktop?.runtime !== "electron") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(err => console.warn("PWA_SW", err?.message || err));
  });
}

let project = newProject();
let nodeSeq = 0, clipSeq = 0, pointSeq = 0, selectedNode = null;
const selection = new Set();
const deviceBus = { lastMidi: null, lastSerial: null, serialState: "offline" };
let graphLogThrottle = 0;
const history = createHistory(40);
let historySuspended = false;
const view = { x: 0, y: 0, scale: 1 };
let panDrag = null;
/** Pile de navigation sous-patch : [{ id, title }] */
let graphPath = [];
let pendingVibe = null;
let rcSession = null;

const runtime = new Runtime($("#previewCanvas"), {
  onGraphEvent: ev => {
    if (ev.type === "camera-error") log(`ERREUR · ${ev.error}`);
    if (ev.type === "camera-state") log(`Caméra · ${ev.state === "on" ? "ACTIVE" : "COUPÉE"}`);
    if (ev.type === "graph") {
      const now = performance.now();
      if (now - graphLogThrottle < 2000) return;
      graphLogThrottle = now;
      for (const e of (ev.errors || []).slice(0, 2)) log(`GRAPHE · ${e}`);
      for (const w of (ev.warnings || []).slice(0, 1)) log(`ATTENTION · ${w}`);
    }
  }
});
runtime.setDeviceBus(deviceBus);

const devices = new DeviceManager(e => {
  if (e.type === "midi-in") {
    deviceBus.lastMidi = e.message;
    log(`MIDI ${e.message.type} ch${e.message.channel} #${e.message.number} ${e.message.value}`);
  } else if (e.type === "serial-line") {
    deviceBus.lastSerial = e.line;
    log(`SERIAL < ${e.line}`);
  } else if (e.type === "serial-state") {
    deviceBus.serialState = e.state || "offline";
    log(`SERIAL · ${e.state}`);
  } else if (e.type === "bridge-message") {
    log(`BRIDGE < ${typeof e.data === "string" ? e.data : JSON.stringify(e.data).slice(0, 160)}`);
  } else if (e.type === "bridge-state") log(`BRIDGE · ${e.state}`);
  else if (e.type === "midi-state") log(`MIDI · ${e.inputs.length} IN / ${e.outputs.length} OUT`);
});

runtime.setBridgeSend(packet => {
  try { devices.bridge.send(packet); }
  catch (err) { throw err; }
});
runtime.setSerialSend(text => devices.serial.send(text));
if (typeof window.nvdDesktop?.sendOscUdp === "function") {
  runtime.setOscUdpSend(msg => window.nvdDesktop.sendOscUdp(msg));
}
if (typeof window.nvdDesktop?.sendArtNetUdp === "function") {
  runtime.setArtNetUdpSend(msg => window.nvdDesktop.sendArtNetUdp(msg));
}

ensureRouting(project);

/** Catalogue UI — mêmes groupes ; marque visuelle des nodes exécutables. */
const LIB = NODE_GROUPS.map(([title, items]) => [title, items]);
const OSC_BRIDGE_TYPES = new Set(["twozero","td","isadora","chataigne","millumin","touchdesigner","isadorabridge","max","pd","supercollider"]);
const SERIAL_NODE_TYPES = new Set(["arduino","esp","servo","rfid"]);
let showExperimental = localStorage.getItem("nvd.showExperimental") === "1";

function spec(t) {
  return sharedSpec(t);
}

function log(msg) {
  const t = new Date().toLocaleTimeString("fr-FR", { hour12: false });
  const el = $("#termLog");
  if (!el) return;
  el.insertAdjacentHTML("beforeend", `<div>[${t}] ${msg}</div>`);
  el.scrollTop = el.scrollHeight;
}

function commitHistory() {
  if (historySuspended) return;
  history.push(project);
}

function applyViewTransform() {
  const world = $("#patchWorld");
  if (!world) return;
  world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
}

function ensurePatchWorld() {
  let world = $("#patchWorld");
  if (!world) {
    world = document.createElement("div");
    world.id = "patchWorld";
    world.className = "patch-world";
    $("#patchSpace").appendChild(world);
  }
  applyViewTransform();
  return world;
}

function buildLibrary() {
  $("#libraryList").innerHTML = LIB.map(([title, items]) => {
    const visible = items.filter(([, t]) => showExperimental || isExecutable(t));
    if (!visible.length) return "";
    return `<div class="lib-section"><div class="lib-title">${title}</div>${visible.map(([n, t]) => {
      const ok = isExecutable(t);
      return `<div class="lib-item ${ok ? "executable" : "unavailable"}" data-add="${t}" title="${ok ? "Exécutable" : "Expérimental — moteur incomplet ou backend externe requis"}"><span>${n}${ok ? "" : " · expérimental"}</span><span>${ok ? "＋" : "○"}</span></div>`;
    }).join("")}</div>`;
  }).join("");
  qall("[data-add]").forEach(x => x.onclick = () => addNode(x.dataset.add));
  const q = $("#search")?.value?.toLowerCase?.() || "";
  if (q) qall(".lib-item").forEach(x => { x.style.display = x.textContent.toLowerCase().includes(q) ? "flex" : "none"; });
  const expCount = LIB.flatMap(([, items]) => items).filter(([, t]) => !isExecutable(t)).length;
  const mode = document.querySelector(".library-mode");
  if (mode) mode.style.display = expCount ? "flex" : "none";
}

function activeGraph() {
  if (!graphPath.length) return project;
  let g = project;
  let node = null;
  for (const step of graphPath) {
    node = (g.nodes || project.nodes).find(n => n.id === step.id);
    if (!node) break;
    g = ensureSubGraph(node);
  }
  return g;
}

function isRootGraph() {
  return graphPath.length === 0;
}

function updateGraphBreadcrumb() {
  const el = $("#graphPath");
  if (!el) return;
  const parts = ["Racine", ...graphPath.map(p => p.title || p.id)];
  el.innerHTML = parts.map((p, i) =>
    `<button type="button" class="crumb" data-crumb="${i}">${p}</button>`
  ).join("<span class='crumb-sep'>/</span>");
  el.querySelectorAll("[data-crumb]").forEach(b => {
    b.onclick = () => {
      const idx = +b.dataset.crumb;
      graphPath = graphPath.slice(0, Math.max(0, idx));
      selectedNode = null;
      redraw();
      updateGraphBreadcrumb();
      log(graphPath.length ? `Sous-patch · ${graphPath.map(x => x.title).join(" / ")}` : "Racine du patch");
    };
  });
}

function enterSubpatch(node) {
  if (node.type !== "subpatch") return;
  ensureSubGraph(node);
  graphPath.push({ id: node.id, title: node.title || "Sous-patch" });
  selectedNode = null;
  redraw();
  updateGraphBreadcrumb();
  log(`Ouverture sous-patch · ${node.title}`);
}

function nodeById(id) { return activeGraph().nodes.find(n => n.id === id); }
function ensureEdges() {
  const g = activeGraph();
  g.edges ||= [];
  if (isRootGraph()) project.edges = g.edges;
  return g.edges;
}
let wireDraft = null, wireSeq = 0;

function ensureWireLayer() {
  ensurePatchWorld();
  let svg = $("#wireLayer");
  if (svg) return svg;
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "wireLayer";
  svg.classList.add("patch-wires");
  svg.innerHTML = '<g id="wirePaths"></g><path id="wireDraftPath" class="wire draft" d=""/>';
  $("#patchWorld").prepend(svg);
  return svg;
}

function portCenter(dot) {
  const world = $("#patchWorld") || $("#patchSpace");
  const wr = world.getBoundingClientRect();
  const r = dot.getBoundingClientRect();
  const s = view.scale || 1;
  return {
    x: (r.left - wr.left + r.width / 2) / s,
    y: (r.top - wr.top + r.height / 2) / s
  };
}

function edgePath(a, b) {
  const span = Math.max(60, Math.abs(b.x - a.x) * .45);
  const h1 = a.x + (b.x >= a.x ? span : -span), h2 = b.x - (b.x >= a.x ? span : -span);
  return `M ${a.x} ${a.y} C ${h1} ${a.y}, ${h2} ${b.y}, ${b.x} ${b.y}`;
}

function findPort(nodeId, index, dir) {
  return document.querySelector(`.port-dot[data-node="${nodeId}"][data-port-index="${index}"][data-dir="${dir}"]`);
}

function renderWires() {
  ensureEdges();
  const svg = ensureWireLayer(), group = $("#wirePaths");
  const world = $("#patchWorld") || $("#patchSpace");
  svg.setAttribute("width", Math.max(world.scrollWidth || 2400, 2400));
  svg.setAttribute("height", Math.max(world.scrollHeight || 1600, 1600));
  group.innerHTML = "";
  const g = activeGraph();
  for (const edge of g.edges || []) {
    const from = findPort(edge.from.node, edge.from.port, "out");
    const to = findPort(edge.to.node, edge.to.port, "in");
    if (!from || !to) continue;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("wire");
    path.dataset.edgeId = edge.id;
    const v = validateEdge({ nodes: g.nodes, edges: g.edges }, edge.from, edge.to);
    if (!v.ok) path.classList.add("invalid");
    path.setAttribute("d", edgePath(portCenter(from), portCenter(to)));
    path.addEventListener("dblclick", e => {
      e.stopPropagation();
      g.edges = g.edges.filter(x => x.id !== edge.id);
      if (isRootGraph()) project.edges = g.edges;
      renderWires();
      autosave();
      commitHistory();
      log("Connexion supprimée");
    });
    group.appendChild(path);
  }
}

function beginWire(e, dot) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const start = { node: dot.dataset.node, port: +dot.dataset.portIndex, dir: dot.dataset.dir, dot };
  wireDraft = start;
  const p = portCenter(dot), draft = $("#wireDraftPath");
  draft.setAttribute("d", edgePath(p, p));
  draft.classList.add("active");
  try { dot.setPointerCapture(e.pointerId); } catch { /* */ }
}

function moveWire(e) {
  if (!wireDraft) return;
  const world = $("#patchWorld") || $("#patchSpace");
  const wr = world.getBoundingClientRect();
  const s = view.scale || 1;
  const a = portCenter(wireDraft.dot);
  const b = {
    x: (e.clientX - wr.left) / s,
    y: (e.clientY - wr.top) / s
  };
  $("#wireDraftPath").setAttribute("d", edgePath(a, b));
}

function finishWire(e) {
  if (!wireDraft) return;
  const target = e.target?.closest?.(".port-dot");
  const start = wireDraft;
  wireDraft = null;
  $("#wireDraftPath")?.classList.remove("active");
  $("#wireDraftPath")?.setAttribute("d", "");
  if (!target || target === start.dot || target.dataset.dir === start.dir) return;
  let from, to;
  if (start.dir === "out") {
    from = { node: start.node, port: start.port };
    to = { node: target.dataset.node, port: +target.dataset.portIndex };
  } else {
    from = { node: target.dataset.node, port: +target.dataset.portIndex };
    to = { node: start.node, port: start.port };
  }
  if (from.node === to.node) {
    log("ERREUR · Impossible de connecter un node à lui-même");
    return;
  }
  const v = validateEdge({ nodes: activeGraph().nodes, edges: activeGraph().edges }, from, to);
  if (!v.ok) {
    log(`ERREUR · ${v.errors.join(" · ")}`);
    return;
  }
  ensureEdges();
  const edges = activeGraph().edges;
  activeGraph().edges = edges.filter(x => !(x.to.node === to.node && x.to.port === to.port));
  if (!activeGraph().edges.some(x => x.from.node === from.node && x.from.port === from.port && x.to.node === to.node && x.to.port === to.port)) {
    wireSeq++;
    activeGraph().edges.push({ id: `e${Date.now()}-${wireSeq}`, from, to });
    log(`Connexion · ${nodeById(from.node)?.title || from.node} → ${nodeById(to.node)?.title || to.node}`);
  }
  if (isRootGraph()) project.edges = activeGraph().edges;
  renderWires();
  autosave();
  commitHistory();
  if (isRootGraph()) runtime.render();
}

function attachPortInteractions(el) {
  el.querySelectorAll(".port-dot").forEach(dot => dot.addEventListener("pointerdown", e => beginWire(e, dot)));
}
window.addEventListener("pointermove", moveWire);
window.addEventListener("pointerup", finishWire);
window.addEventListener("resize", () => requestAnimationFrame(renderWires));

function addNode(type, x = 50 + (nodeSeq % 4) * 180, y = 60 + Math.floor(nodeSeq / 4) * 110) {
  const g = activeGraph();
  const seq = (g.nodes.reduce((m, n) => Math.max(m, parseInt(String(n.id).replace(/\D/g, "")) || 0), 0) + 1);
  nodeSeq = Math.max(nodeSeq, seq);
  const [title] = spec(type);
  const n = {
    id: `n${seq}`,
    type,
    title,
    x, y,
    params: { enabled: true, duration: 5, opacity: 1, intensity: 1, host: "bridge", address: "/nvd/value", value: 0, fallback: 0, freq: 220, gain: 0.15, mode: "tone" }
  };
  if (type === "subpatch") ensureSubGraph(n);
  g.nodes.push(n);
  if (isRootGraph()) project.nodes = g.nodes;
  drawNode(n);
  selectNode(n.id);
  if (!isExecutable(type)) {
    log(`Node ajouté · ${title} · INDISPONIBLE (pas encore câblé au moteur)`);
  } else {
    log(`Node ajouté · ${title}`);
  }
  if (isRootGraph()) runtime.setProject(project);
  autosave();
  commitHistory();
  return n;
}

function drawNode(n) {
  const el = document.createElement("div");
  el.className = "node" + (isExecutable(n.type) ? " executable" : " unavailable");
  el.dataset.id = n.id;
  el.style.left = n.x + "px";
  el.style.top = n.y + "px";
  const ports = portLabels(n.type, n) || spec(n.type)[1];
  el.className += selection.has(n.id) ? " sel" : "";
  el.innerHTML = `<div class="nh">${n.title}${isExecutable(n.type) ? "" : " · ○"}</div><div class="nb">${ports.map((p, i) => {
    const dir = portDirection(n.type, i, ports.length, n);
    return `<div class="port port-${dir}">${dir === "in" ? `<span class="port-dot input" data-node="${n.id}" data-port-index="${i}" data-dir="in" title="Entrée ${p}"></span>` : ""}<span class="port-label">${p}</span>${dir === "out" ? `<span class="port-dot output" data-node="${n.id}" data-port-index="${i}" data-dir="out" title="Sortie ${p}"></span>` : ""}</div>`;
  }).join("")}</div>`;
  $("#patchWorld").appendChild(el);
  el.onmousedown = (e) => selectNode(n.id, { additive: e.shiftKey });
  el.ondblclick = () => { if (n.type === "subpatch") enterSubpatch(n); };
  attachPortInteractions(el);
  makeDraggable(el, n);
  requestAnimationFrame(renderWires);
}

function makeDraggable(el, n) {
  const h = el.querySelector(".nh");
  let d = false, sx = 0, sy = 0, ox = 0, oy = 0;
  h.onmousedown = e => { d = true; sx = e.clientX; sy = e.clientY; ox = n.x; oy = n.y; e.preventDefault(); };
  window.addEventListener("mousemove", e => {
    if (!d) return;
    n.x = Math.max(0, ox + e.clientX - sx);
    n.y = Math.max(0, oy + e.clientY - sy);
    el.style.left = n.x + "px";
    el.style.top = n.y + "px";
    renderWires();
  });
  window.addEventListener("mouseup", () => {
    if (d) { d = false; renderWires(); autosave(); commitHistory(); }
  });
}

function channelCandidatesForNode(n) {
  const common = [
    ["opacity", "Opacité", 0, 1, 0.01],
    ["scale", "Échelle", 0.2, 3, 0.01],
    ["rotation", "Rotation", -3.14, 3.14, 0.01],
    ["threshold", "Seuil", 0, 1, 0.01],
    ["trail", "Traînée", 0, 0.8, 0.01],
    ["decay", "Persistance", 0, 0.98, 0.01],
    ["speed", "Vitesse", 0, 3, 0.01],
    ["size", "Taille", 0.03, 1, 0.01],
    ["softness", "Souplesse", 0, 1, 0.01],
    ["noise", "Mouvement organique", 0, 0.65, 0.01],
    ["dx", "Décalage X", -600, 600, 1],
    ["dy", "Décalage Y", -600, 600, 1]
  ];
  const allowed = new Set(Object.keys(n.params || {}));
  if (n.type === "whale") ["scale","trail","breathe"].forEach(k => allowed.add(k));
  if (n.type === "blob") ["size","softness","noise","speed"].forEach(k => allowed.add(k));
  if (["shadow","threshold","bodyclone"].includes(n.type)) ["threshold","dx","dy","decay"].forEach(k => allowed.add(k));
  if (n.type === "ghost") ["decay","dx","dy"].forEach(k => allowed.add(k));
  if (n.type === "transform") ["scale","rotation","dx","dy"].forEach(k => allowed.add(k));
  const defs = common.filter(([key]) => allowed.has(key));
  if (n.type === "whale") defs.push(["breathe", "Respiration", 0, 0.12, 0.001]);
  return defs;
}

function exposeChannel(node, def) {
  if (!node || !def) return;
  project.channels ||= [];
  const [key, label, min, max, step] = def;
  const existing = project.channels.find(ch => ch.nodeId === node.id && ch.param === key);
  if (existing) {
    log(`Channel déjà exposé · ${existing.name}`);
    renderControlSurface();
    return;
  }
  project.channels.push({
    id: `ch-${node.id}-${key}-${Date.now().toString(36)}`,
    name: `${node.title} · ${label}`,
    nodeId: node.id,
    param: key,
    min, max, step
  });
  autosave();
  commitHistory();
  renderControlSurface();
  log(`Channel exposé · ${node.title} · ${label}`);
}

function selectNode(id, { additive = false } = {}) {
  if (!additive) {
    selection.clear();
    if (id) selection.add(id);
  } else if (id) {
    if (selection.has(id) && selection.size > 1) selection.delete(id);
    else selection.add(id);
  }
  selectedNode = id && selection.has(id) ? id : ([...selection][0] || null);
  qall(".node").forEach(n => n.classList.toggle("sel", selection.has(n.dataset.id)));
  const n = nodeById(id);
  if (!n) return;
  $("#inspectorType").textContent = n.title + (isExecutable(n.type) ? "" : " · indisponible");
  let extra = "";
  if (n.type === "shader") {
    extra += `<div class="field"><label>Intensité</label><input id="nInt" type="range" min="0" max="2" step=".01" value="${n.params.intensity ?? 1}"></div>`;
  }
  if (["camera", "phone-camera-front", "phone-camera-back"].includes(n.type)) {
    extra += `<div class="camera-actions"><button id="cameraStart" type="button">Activer la caméra</button><button id="cameraStop" class="stop" type="button">Couper caméra</button></div><p class="hint">La caméra ne démarre jamais automatiquement. L'action ci-dessus demande explicitement l'accès.</p>`;
  }
  if (n.type === "remote-camera") {
    const st = runtime.remoteCamera?.state || n.params?.status || "WAITING";
    const knownRoom = n.params?.room || loadRemoteCameraRoom() || "";
    extra += `<div class="camera-actions"><button id="rcHost" type="button">${knownRoom ? "Reprendre salon / QR" : "QR · démarrer hôte"}</button><button id="rcStop" class="stop" type="button">Couper / déconnecter</button></div>`;
    extra += `<p class="hint">Remote Camera · PeerJS (ART Intercom). LIVE seulement après FIRST_FRAME. État : <b id="rcState">${st}</b> · ${rcStateLabel(st)} · lien ${linkFromRemoteCamera(st)}</p>`;
    extra += `<div id="rcQrBox" class="hint">Companion : <code>npm run serve:companion</code>${knownRoom ? ` · salon connu <code>${knownRoom}</code> (pas de nouveau QR obligatoire)` : " puis scanne le QR."}</div>`;
    if (runtime.remoteCamera?.room) extra += `<p class="hint">Salon actif <code>${runtime.remoteCamera.room}</code></p>`;
  }
  if (n.type === "ndi-out") {
    extra += `<p class="hint">${ndiStatusMessage()}</p>`;
  }
  if (n.type === "whale") {
    extra += `<div class="field"><label>Échelle</label><input id="nScale" type="range" min=".35" max="2.2" step=".01" value="${n.params.scale ?? 1}"></div>`;
    extra += `<div class="field"><label>Traînée</label><input id="nTrailAmount" type="range" min="0" max=".7" step=".01" value="${n.params.trail ?? .18}"></div>`;
    extra += `<div class="field"><label>Respiration</label><input id="nBreathe" type="range" min="0" max=".12" step=".001" value="${n.params.breathe ?? .035}"></div>`;
  }
  if (n.type === "blob") {
    extra += `<div class="field"><label>Points</label><input id="nPoints" type="range" min="3" max="18" step="1" value="${n.params.points ?? 7}"></div>`;
    extra += `<div class="field"><label>Taille</label><input id="nSize" type="range" min=".03" max=".8" step=".01" value="${n.params.size ?? .22}"></div>`;
    extra += `<div class="field"><label>Souplesse</label><input id="nSoftness" type="range" min="0" max="1" step=".01" value="${n.params.softness ?? .65}"></div>`;
    extra += `<div class="field"><label>Mouvement organique</label><input id="nNoise" type="range" min="0" max=".65" step=".01" value="${n.params.noise ?? .18}"></div>`;
    extra += `<div class="field"><label>Vitesse</label><input id="nSpeed" type="range" min="0" max="3" step=".01" value="${n.params.speed ?? .6}"></div>`;
    extra += `<div class="field"><label>Afficher les points</label><select id="nShowPoints"><option value="false">Non</option><option value="true">Oui</option></select></div>`;
  }
  if (n.type === "osc" || OSC_BRIDGE_TYPES.has(n.type)) {
    extra += `<div class="field"><label>Host / cible</label><input id="nHost" value="${n.params.host || (n.type === "osc" ? "bridge" : "127.0.0.1")}"></div>`;
    extra += `<div class="field"><label>Adresse OSC</label><input id="nAddr" value="${n.params.address || "/nvd/value"}"></div>`;
    extra += `<div class="field"><label>Port UDP</label><input id="nPort" type="number" min="1" max="65535" value="${n.params.port || (n.type === "millumin" ? 5000 : n.type === "supercollider" ? 57120 : 9000)}"></div>`;
    if (OSC_BRIDGE_TYPES.has(n.type)) extra += `<div class="field"><label>Envoi auto</label><select id="nAutoExternal"><option value="false">Non · Trigger conseillé</option><option value="true">Oui · à chaque changement</option></select></div>`;
  }
  if (n.type === "arduino" || n.type === "esp") {
    extra += `<div class="field"><label>Commande Serial</label><input id="nCommand" value="${n.params.command || "PING"}"></div>`;
    extra += `<div class="field"><label>Envoi auto</label><select id="nAutoExternal"><option value="false">Non · Trigger conseillé</option><option value="true">Oui · au changement</option></select></div>`;
    extra += `<div class="camera-actions"><button id="serialConnectBtn" type="button">Connecter Serial</button><button id="serialReconnectBtn" type="button">Reconnecter</button></div>`;
    extra += `<p class="hint">Aucun ordre n'est envoyé à l'ajout du node. Le firmware reste à ta charge ; No-de transporte réellement les lignes Serial.</p>`;
  }
  if (n.type === "servo") {
    extra += `<div class="field"><label>Canal</label><input id="nChannel" type="number" min="0" value="${n.params.channel ?? 0}"></div>`;
    extra += `<div class="field"><label>Angle</label><input id="nAngle" type="number" min="0" max="180" value="${n.params.angle ?? 90}"></div>`;
    extra += `<div class="field"><label>Vitesse</label><input id="nServoSpeed" type="number" min="0" step=".1" value="${n.params.speed ?? 1}"></div>`;
    extra += `<div class="field"><label>Envoi auto</label><select id="nAutoExternal"><option value="false">Non · Trigger conseillé</option><option value="true">Oui · au changement</option></select></div>`;
    extra += `<div class="camera-actions"><button id="serialConnectBtn" type="button">Connecter Serial</button><button id="serialReconnectBtn" type="button">Reconnecter</button></div>`;
    extra += `<p class="hint">Commande par défaut : <code>SERVO canal angle vitesse</code>. Aucun mouvement n'est envoyé sans Trigger ou Envoi auto.</p>`;
  }
  if (n.type === "rfid") {
    extra += `<div class="field"><label>Préfixe attendu</label><input id="nRfidPrefix" value="${n.params.prefix ?? "RFID:"}"></div>`;
    extra += `<div class="camera-actions"><button id="serialConnectBtn" type="button">Connecter lecteur Serial</button><button id="serialReconnectBtn" type="button">Reconnecter</button></div>`;
  }
  if (n.type === "sensors") {
    const sensor = n.params.sensor || "gyro";
    extra += `<div class="field"><label>Capteur</label><select id="nSensor"><option value="gyro">Gyroscope</option><option value="accelerometer">Accéléromètre</option><option value="orientation">Orientation</option><option value="gps">GPS</option><option value="wifi">Wi-Fi</option><option value="touch">Touch</option></select></div>`;
    n.params.sensor = sensor;
  }
  if (n.type === "inputmapper") {
    extra += `<div class="field"><label>Entrée min</label><input id="nMapInMin" type="number" step=".01" value="${n.params.inMin ?? 0}"></div>`;
    extra += `<div class="field"><label>Entrée max</label><input id="nMapInMax" type="number" step=".01" value="${n.params.inMax ?? 1}"></div>`;
    extra += `<div class="field"><label>Sortie min</label><input id="nMapOutMin" type="number" step=".01" value="${n.params.outMin ?? 0}"></div>`;
    extra += `<div class="field"><label>Sortie max</label><input id="nMapOutMax" type="number" step=".01" value="${n.params.outMax ?? 1}"></div>`;
  }
  if (n.type === "automation") {
    extra += `<div class="field"><label>Vitesse</label><input id="nAutoSpeed" type="number" step=".01" value="${n.params.speed ?? .25}"></div>`;
    extra += `<div class="field"><label>Phase</label><input id="nAutoPhase" type="number" step=".01" value="${n.params.phase ?? 0}"></div>`;
    extra += `<div class="field"><label>Forme</label><select id="nAutoShape"><option value="sine">Sinus</option><option value="triangle">Triangle</option><option value="saw">Dent de scie</option><option value="square">Carré</option></select></div>`;
  }
  if (n.type === "datalab") {
    extra += `<div class="field"><label>Échelle</label><input id="nDataScale" type="number" step=".01" value="${n.params.scale ?? 1}"></div>`;
    extra += `<div class="field"><label>Offset</label><input id="nDataBias" type="number" step=".01" value="${n.params.bias ?? 0}"></div>`;
  }
  if (n.type === "surface") extra += `<p class="hint">Passage de valeur vers le Control Surface. Expose ensuite les paramètres utiles depuis l'inspecteur des nodes concernés.</p>`;
  if (n.type === "connectors") extra += `<p class="hint">Lien local typé pour organiser le patch sans conversion de valeur.</p>`;
  if (n.type === "p5" || n.type === "sketch") {
    const isP5 = n.type === "p5";
    const script = n.params.script || (isP5 ? DEFAULT_P5_SCRIPT : DEFAULT_SKETCH_SCRIPT);
    extra += `<div class="field"><label>Seed</label><input id="nGenSeed" type="number" step="1" value="${n.params.seed ?? 1}"></div>`;
    extra += `<div class="field"><label>Énergie</label><input id="nGenEnergy" type="range" min="0" max="1" step=".01" value="${n.params.energy ?? .6}"></div>`;
    extra += `<div class="field"><label>Script offline</label><textarea id="nSketchScript" rows="8" spellcheck="false">${script.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</textarea></div>`;
    extra += `<div class="camera-actions"><button id="resetSketchScript" type="button">Preset par défaut</button></div>`;
    extra += `<p class="hint">Sous-ensemble offline sûr : background(), fill(), circle(), rect(), line(), wave(). Variables : width, height, time, frameCount, mouseX, mouseY. Pas de JavaScript arbitraire.</p>`;
  }
  if (n.type === "dream") {
    extra += `<div class="field"><label>Seed</label><input id="nGenSeed" type="number" step="1" value="${n.params.seed ?? 1}"></div>`;
    extra += `<div class="field"><label>Intensité</label><input id="nDreamIntensity" type="range" min="0" max="1" step=".01" value="${n.params.intensity ?? .72}"></div>`;
    extra += `<p class="hint">Moteur visuel génératif local, déterministe par seed, sans réseau.</p>`;
  }
  if (n.type === "showimport") {
    const summary = n.params.manifest ? showManifestSummary(n.params.manifest) : { ok:true, count:0, name:"" };
    extra += `<div class="field"><label>Conduite JSON</label><input id="nShowFile" type="file" accept=".json,.cvd.json,application/json"></div>`;
    extra += `<div class="field"><label>Mode</label><select id="nShowMode"><option value="append">Ajouter aux cues existants</option><option value="replace">Remplacer les cues existants</option></select></div>`;
    extra += `<div class="camera-actions"><button id="applyShowImport" type="button">Importer la conduite</button></div>`;
    extra += `<p id="showImportStatus" class="hint">${summary.ok ? `${summary.count} cue(s) prêt(s) ${summary.name ? "· "+summary.name : ""}` : "Manifest invalide · "+summary.error}</p>`;
    extra += `<p class="hint">Formats : projet .cvd.json ou {"name":"Spectacle","cues":[{"label":"TOP","time":12.5,"actions":[]}]}.</p>`;
  }
  if (n.type === "midi") {
    extra += `<div class="field"><label>Fallback CC (0–1)</label><input id="nFb" type="range" min="0" max="1" step=".01" value="${n.params.fallback ?? 0}"></div>`;
    extra += `<p class="hint">Matériel MIDI : à vérifier sur périphérique réel. Test logiciel = bus interne.</p>`;
  }
  if (n.type === "audio" || n.type === "organicaudio") {
    extra += `<div class="field"><label>Fréquence</label><input id="nFreq" type="number" min="40" max="2000" value="${n.params.freq ?? 220}"></div>`;
    extra += `<div class="field"><label>Gain</label><input id="nGain" type="range" min="0" max="0.5" step=".01" value="${n.params.gain ?? 0.15}"></div>`;
    extra += `<p class="hint">Audio logiciel Web Audio. Micro réel : à vérifier (permissions).</p>`;
  }
  if (n.type === "soundmemo") {
    extra += `<p class="hint">Niveau micro opérationnel. Enregistrement fichier : pas encore disponible.</p>`;
  }
  if (n.type === "smooth") {
    extra += `<div class="field"><label>Lissage</label><input id="nSmooth" type="range" min="0" max="1" step=".01" value="${n.params.amount ?? 0.18}"></div>`;
  }
  if (n.type === "compare") {
    extra += `<div class="field"><label>Opérateur</label><select id="nOp"><option>&gt;</option><option>&lt;</option><option>==</option><option>&gt;=</option><option>&lt;=</option><option>!=</option></select></div>`;
  }
  if (n.type === "boolean") {
    extra += `<div class="field"><label>Valeur</label><select id="nBool"><option value="false">Faux</option><option value="true">Vrai</option></select></div>`;
  }
  if (n.type === "text") {
    extra += `<div class="field"><label>Texte</label><input id="nText" value="${n.params.text || ""}"></div>`;
  }
  if (n.type === "blackhole") {
    extra += `<div class="field"><label>Vitesse</label><input id="nSpeed" type="range" min="0" max="3" step=".01" value="${n.params.speed ?? 0.65}"></div>`;
    extra += `<div class="field"><label>Taille</label><input id="nSize" type="range" min="0.05" max="1" step=".01" value="${n.params.size ?? 0.58}"></div>`;
  }
  if (["transform", "mapping"].includes(n.type)) {
    extra += `<div class="field"><label>Échelle</label><input id="nScale" type="number" step=".01" value="${n.params.scale ?? 1}"></div>`;
    extra += `<div class="field"><label>Rotation (rad)</label><input id="nRot" type="number" step=".01" value="${n.params.rotation ?? 0}"></div>`;
    extra += `<div class="field"><label>Décalage X</label><input id="nDx" type="number" value="${n.params.dx ?? 0}"></div>`;
    extra += `<div class="field"><label>Décalage Y</label><input id="nDy" type="number" value="${n.params.dy ?? 0}"></div>`;
  }
  if (["anaglyph", "creativefx", "storm", "bending", "transmute"].includes(n.type)) {
    const label = n.type === "anaglyph" ? "Profondeur" : "Intensité";
    const key = n.type === "anaglyph" ? "depth" : "amount";
    const value = n.params?.[key] ?? (n.type === "anaglyph" ? 0.035 : 0.55);
    extra += `<div class="field"><label>${label}</label><input id="nFxAmount" type="range" min="0" max="1" step=".005" value="${value}"></div>`;
  }
  if (n.type === "composite") {
    extra += `<div class="field"><label>Blend</label><select id="nBlend"><option>normal</option><option>add</option><option>multiply</option><option>screen</option></select></div>`;
  }
  if (["shadow", "threshold", "bodyclone"].includes(n.type)) {
    extra += `<div class="field"><label>Seuil</label><input id="nThreshold" type="range" min="0" max="1" step=".01" value="${n.params.threshold ?? 0.45}"></div>`;
    extra += `<div class="field"><label>Inverser</label><select id="nInvert"><option value="false">Non</option><option value="true">Oui</option></select></div>`;
    if (n.type !== "threshold") {
      extra += `<div class="field"><label>Décalage X</label><input id="nDx" type="number" value="${n.params.dx ?? (n.type === "bodyclone" ? 64 : 12)}"></div>`;
      extra += `<div class="field"><label>Décalage Y</label><input id="nDy" type="number" value="${n.params.dy ?? 0}"></div>`;
    }
    if (n.type === "shadow") {
      extra += `<div class="field"><label>Trail</label><select id="nTrail"><option value="false">Non</option><option value="true">Oui</option></select></div>`;
      extra += `<div class="field"><label>Persistance</label><input id="nDecay" type="range" min="0" max=".98" step=".01" value="${n.params.decay ?? .85}"></div>`;
    }
  }
  if (n.type === "ghost") {
    extra += `<div class="field"><label>Persistance</label><input id="nDecay" type="range" min="0" max=".98" step=".01" value="${n.params.decay ?? .82}"></div>`;
    extra += `<div class="field"><label>Décalage X</label><input id="nDx" type="number" value="${n.params.dx ?? 8}"></div>`;
    extra += `<div class="field"><label>Décalage Y</label><input id="nDy" type="number" value="${n.params.dy ?? 0}"></div>`;
  }
  if (n.type === "mirror") {
    extra += `<div class="field"><label>Axe</label><select id="nAxis"><option value="x">Horizontal</option><option value="y">Vertical</option></select></div>`;
  }
  if (n.type === "videofile") {
    extra += `<div class="field"><label>Fichier</label><input id="nVideoFile" type="file" accept="video/*"></div>`;
    extra += `<div class="field"><label>Boucle</label><select id="nLoop"><option value="true">Oui</option><option value="false">Non</option></select></div>`;
    extra += `<div class="field"><label>Seek (s)</label><input id="nSeek" type="number" min="0" step="0.1" value="${n.params.seekTo ?? 0}"></div>`;
    extra += `<div class="field"><label>Marqueurs (s, virgules)</label><input id="nMarkers" value="${(n.params.markers || []).join(",")}"></div>`;
    extra += `<div class="field"><label>Sync group</label><input id="nSyncGroup" value="${n.params.syncGroup || ""}" placeholder="ex. A"></div>`;
    extra += `<p class="hint">${n.params?.srcName ? "Chargé : " + n.params.srcName : "Aucun fichier — le node restera en erreur jusqu'au chargement."}</p>`;
  }
  if (n.type === "subpatch") {
    extra += `<p class="hint">Double-clic pour éditer. Maj+clic pour sélectionner plusieurs nodes, puis « Boîte ».</p>`;
    extra += `<button id="addInPort" class="smallbtn">＋ entrée</button><button id="addOutPort" class="smallbtn">＋ sortie</button>`;
  }
  if (n.type === "presence") {
    extra += `<div class="field"><label>Interprète / présence</label><input id="nPerson" value="${n.params.person || ""}" placeholder="Maxime, Alexandra, Juliette…"></div>`;
    extra += `<div class="field"><label>Zone plateau</label><select id="nSourceZone"><option value="jardin">Jardin · gauche</option><option value="centre">Centre</option><option value="cour">Cour · droite</option></select></div>`;
    extra += `<div class="field"><label>Seuil silhouette</label><input id="nThreshold" type="range" min="0" max="1" step=".01" value="${n.params.threshold ?? .45}"></div>`;
    extra += `<p class="hint">Cette Présence porte l’identité scénique. La caméra reste une source technique séparée.</p>`;
  }
  if (n.type === "livingshadow") {
    extra += `<div class="field"><label>Interprète</label><input id="nPerson" value="${n.params.person || ""}" placeholder="Maxime"></div>`;
    extra += `<div class="field"><label>Interprète sur le plateau</label><select id="nSourceZone"><option value="jardin">Jardin · gauche</option><option value="centre">Centre</option><option value="cour">Cour · droite</option></select></div>`;
    extra += `<div class="field"><label>Ombre projetée</label><select id="nShadowZone"><option value="jardin">Jardin · gauche</option><option value="centre">Centre</option><option value="cour">Cour · droite</option></select></div>`;
    extra += `<div class="field"><label>Comportement</label><select id="nShadowMode"><option value="mirror">Danse miroir</option><option value="attached">Attachée</option><option value="autonomous">Autonome live</option></select></div>`;
    extra += `<div class="field"><label>Autonomie</label><input id="nShadowAutonomy" type="range" min="0" max="1" step=".01" value="${n.params.autonomy ?? .58}"></div>`;
    extra += `<div class="field"><label>Seuil silhouette</label><input id="nThreshold" type="range" min="0" max="1" step=".01" value="${n.params.threshold ?? .45}"></div>`;
    extra += `<div class="camera-actions"><button id="shadowMirrorBtn" type="button">Danse miroir</button><button id="shadowDetachBtn" type="button">Décrocher l’ombre</button><button id="shadowAttachBtn" type="button">Rattacher</button></div>`;
    extra += `<p class="hint">Décrocher mémorise la silhouette du moment. Elle peut ensuite vivre en autonomie dans sa zone.</p>`;
  }
  if (n.type === "stage-output") {
    extra += `<div class="field"><label>Surface / destination</label><input id="nSurfaceName" value="${n.params.surfaceName || ""}" placeholder="Rideau de fils, cyclo, écran fond…"></div>`;
    extra += `<p class="hint">Nom scénique de la destination. Le node reste une sortie vidéo locale et ne déclenche aucun matériel externe.</p>`;
  }

  const channelDefs = channelCandidatesForNode(n);
  if (channelDefs.length) {
    extra += `<div class="channel-expose"><select id="channelParam">${channelDefs.map(([key,label]) => `<option value="${key}">${label}</option>`).join("")}</select><button id="exposeChannelBtn" class="smallbtn" type="button">Exposer</button></div>`;
  }
  $("#inspectorBody").innerHTML = `
    <div class="field"><label>Nom du node</label><input id="nTitle" value="${n.title || ""}"></div>
    <div class="field"><label>Durée</label><input id="nDur" type="number" min=".1" step=".1" value="${n.params.duration}"></div>
    <div class="field"><label>Opacité</label><input id="nOpa" type="range" min="0" max="1" step=".01" value="${n.params.opacity}"></div>
    <div class="field"><label>Actif</label><select id="nEnabled"><option value="true">Oui</option><option value="false">Non</option></select></div>
    ${extra}
    <button id="toolBtn" class="smallbtn">${n.type === "subpatch" ? "Ouvrir sous-patch ↗" : "Ouvrir outil ↗"}</button>
    <button id="dupNodeBtn" class="smallbtn">Dupliquer</button>
    <button id="delNodeBtn" class="smallbtn danger">Supprimer</button>`;
  $("#nEnabled").value = String(n.params.enabled);
  $("#nTitle").onchange = e => {
    n.title = e.target.value.trim() || spec(n.type)[0];
    const head = document.querySelector(`.node[data-id="${n.id}"] .nh`);
    if (head) head.textContent = n.title;
    autosave(); commitHistory(); log(`Node renommé · ${n.title}`);
  };
  $("#nDur").onchange = e => { n.params.duration = +e.target.value; autosave(); commitHistory(); };
  $("#nOpa").oninput = e => { n.params.opacity = +e.target.value; runtime.render(); autosave(); };
  $("#nEnabled").onchange = e => {
    n.params.enabled = e.target.value === "true";
    if (!n.params.enabled && (n.type === "audio" || n.type === "organicaudio" || n.type === "soundmemo")) {
      sharedAudio.release(n.id);
    }
    if (["camera", "phone-camera-front", "phone-camera-back"].includes(n.type)) runtime.setProject(project);
    else runtime.render();
    autosave();
    commitHistory();
  };
  if ($("#nInt")) $("#nInt").oninput = e => { n.params.intensity = +e.target.value; runtime.render(); autosave(); };
  if ($("#nHost")) $("#nHost").onchange = e => { n.params.host = e.target.value; autosave(); commitHistory(); };
  if ($("#nAddr")) $("#nAddr").onchange = e => { n.params.address = e.target.value; autosave(); commitHistory(); };
  if ($("#nPort")) $("#nPort").onchange = e => { n.params.port = Math.max(1, Math.min(65535, +e.target.value || 9000)); autosave(); commitHistory(); };
  if ($("#nAutoExternal")) {
    $("#nAutoExternal").value = String(n.params.auto === true);
    $("#nAutoExternal").onchange = e => { n.params.auto = e.target.value === "true"; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nCommand")) $("#nCommand").onchange = e => { n.params.command = e.target.value; autosave(); commitHistory(); };
  if ($("#nChannel")) $("#nChannel").onchange = e => { n.params.channel = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nAngle")) $("#nAngle").onchange = e => { n.params.angle = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nServoSpeed")) $("#nServoSpeed").onchange = e => { n.params.speed = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nRfidPrefix")) $("#nRfidPrefix").onchange = e => { n.params.prefix = e.target.value; autosave(); commitHistory(); };
  if ($("#nSensor")) {
    $("#nSensor").value = n.params.sensor || "gyro";
    $("#nSensor").onchange = e => { n.params.sensor = e.target.value; runtime.render(); autosave(); commitHistory(); };
  }
  for (const [id,key] of [["nMapInMin","inMin"],["nMapInMax","inMax"],["nMapOutMin","outMin"],["nMapOutMax","outMax"],["nAutoSpeed","speed"],["nAutoPhase","phase"],["nDataScale","scale"],["nDataBias","bias"]]) {
    if ($("#"+id)) $("#"+id).onchange = e => { n.params[key] = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nAutoShape")) {
    $("#nAutoShape").value = n.params.shape || "sine";
    $("#nAutoShape").onchange = e => { n.params.shape = e.target.value; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#serialConnectBtn")) $("#serialConnectBtn").onclick = async () => {
    try { await devices.serial.connect(); log("SERIAL · connecté"); runtime.render(); }
    catch (e) { log("SERIAL · " + (e?.message || e)); }
  };
  if ($("#serialReconnectBtn")) $("#serialReconnectBtn").onclick = async () => {
    try { const port = await devices.serial.reconnect(); log(port ? "SERIAL · reconnecté" : "SERIAL · aucun port autorisé"); runtime.render(); }
    catch (e) { log("SERIAL · " + (e?.message || e)); }
  };
  if ($("#nGenSeed")) $("#nGenSeed").onchange = e => { n.params.seed = +e.target.value || 1; runtime.render(); autosave(); commitHistory(); };
  if ($("#nGenEnergy")) $("#nGenEnergy").oninput = e => { n.params.energy = +e.target.value; runtime.render(); autosave(); };
  if ($("#nDreamIntensity")) $("#nDreamIntensity").oninput = e => { n.params.intensity = +e.target.value; runtime.render(); autosave(); };
  if ($("#nSketchScript")) $("#nSketchScript").oninput = e => { n.params.script = e.target.value; runtime.render(); autosave(); };
  if ($("#resetSketchScript")) $("#resetSketchScript").onclick = () => {
    n.params.script = n.type === "p5" ? DEFAULT_P5_SCRIPT : DEFAULT_SKETCH_SCRIPT;
    renderInspector(n.id);
    runtime.render();
    autosave();
    commitHistory();
  };
  if ($("#nShowFile")) $("#nShowFile").onchange = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      n.params.manifest = await f.text();
      n.params.manifestName = f.name;
      const summary = showManifestSummary(n.params.manifest);
      const status = $("#showImportStatus");
      if (status) status.textContent = summary.ok ? `${summary.count} cue(s) prêt(s) · ${summary.name}` : `Manifest invalide · ${summary.error}`;
      runtime.render();
      autosave();
      commitHistory();
    } catch (err) {
      log(`Show Importer · ${err?.message || err}`);
    }
  };
  if ($("#applyShowImport")) $("#applyShowImport").onclick = () => {
    if (!n.params.manifest) return log("Show Importer · choisis d’abord un JSON");
    try {
      const replaceCues = $("#nShowMode")?.value === "replace";
      const { added, manifest } = applyShowManifest(project, n.params.manifest, { replaceCues });
      n.params.lastImportCount = added.length;
      redraw();
      runtime.render();
      autosave();
      commitHistory();
      log(`Show Importer · ${added.length} cue(s) importé(s) · ${manifest.name}`);
      renderInspector(n.id);
    } catch (err) {
      log(`Show Importer ÉCHEC · ${err?.message || err}`);
    }
  };
  if ($("#nFb")) $("#nFb").oninput = e => { n.params.fallback = +e.target.value; runtime.render(); autosave(); };
  if ($("#nFreq")) $("#nFreq").onchange = e => { n.params.freq = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nGain")) $("#nGain").oninput = e => { n.params.gain = +e.target.value; runtime.render(); autosave(); };
  if ($("#nSmooth")) $("#nSmooth").oninput = e => { n.params.amount = +e.target.value; runtime.render(); autosave(); };
  if ($("#nOp")) { $("#nOp").value = n.params.operator || ">"; $("#nOp").onchange = e => { n.params.operator = e.target.value; runtime.render(); autosave(); commitHistory(); }; }
  if ($("#nBool")) { $("#nBool").value = String(n.params.value === true || n.params.value === "true"); $("#nBool").onchange = e => { n.params.value = e.target.value === "true"; runtime.render(); autosave(); commitHistory(); }; }
  if ($("#nText")) $("#nText").onchange = e => { n.params.text = e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nSpeed")) $("#nSpeed").oninput = e => { n.params.speed = +e.target.value; runtime.render(); autosave(); };
  if ($("#nSize")) $("#nSize").oninput = e => { n.params.size = +e.target.value; runtime.render(); autosave(); };
  if ($("#nScale")) $("#nScale").onchange = e => { n.params.scale = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nRot")) $("#nRot").onchange = e => { n.params.rotation = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nFxAmount")) $("#nFxAmount").oninput = e => {
    const key = n.type === "anaglyph" ? "depth" : "amount";
    n.params[key] = +e.target.value;
    runtime.render();
    autosave();
  };
  if ($("#nBlend")) {
    $("#nBlend").value = n.params.blend || "normal";
    $("#nBlend").onchange = e => { n.params.blend = e.target.value; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nPerson")) $("#nPerson").onchange = e => {
    n.params.person = e.target.value.trim();
    if (n.params.person && ["Présence / Interprète","Ombre Vivante"].includes(n.title)) {
      n.title = n.type === "presence" ? `Présence · ${n.params.person}` : `Ombre Vivante · ${n.params.person}`;
      const head = document.querySelector(`.node[data-id="${n.id}"] .nh`);
      if (head) head.textContent = n.title;
    }
    runtime.render(); autosave(); commitHistory();
  };
  if ($("#nSourceZone")) {
    $("#nSourceZone").value = n.params.sourceZone || n.params.zone || "jardin";
    $("#nSourceZone").onchange = e => { n.params.sourceZone = e.target.value; n.params.zone = e.target.value; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nShadowZone")) {
    $("#nShadowZone").value = n.params.shadowZone || "cour";
    $("#nShadowZone").onchange = e => { n.params.shadowZone = e.target.value; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nShadowMode")) {
    $("#nShadowMode").value = n.params.mode || "mirror";
    $("#nShadowMode").onchange = e => { n.params.mode = e.target.value; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nShadowAutonomy")) $("#nShadowAutonomy").oninput = e => { n.params.autonomy = +e.target.value; runtime.render(); autosave(); };
  if ($("#shadowMirrorBtn")) $("#shadowMirrorBtn").onclick = () => {
    n.params.mode = "mirror"; n.params.attachNonce = Date.now(); renderInspector(n.id); runtime.render(); autosave(); commitHistory();
  };
  if ($("#shadowDetachBtn")) $("#shadowDetachBtn").onclick = () => {
    n.params.detachNonce = Date.now(); runtime.render(); autosave(); commitHistory(); log(`Ombre décrochée · ${n.params.person || n.title}`);
  };
  if ($("#shadowAttachBtn")) $("#shadowAttachBtn").onclick = () => {
    n.params.attachNonce = Date.now(); n.params.mode = "mirror"; runtime.render(); autosave(); commitHistory(); log(`Ombre rattachée · ${n.params.person || n.title}`);
  };
  if ($("#nSurfaceName")) $("#nSurfaceName").onchange = e => {
    n.params.surfaceName = e.target.value.trim() || "Sortie Scène";
    if (!n.title || n.title === "Sortie Scène") n.title = `Sortie · ${n.params.surfaceName}`;
    runtime.render(); autosave(); commitHistory();
  };
  if ($("#nThreshold")) $("#nThreshold").oninput = e => { n.params.threshold = +e.target.value; runtime.render(); autosave(); };
  if ($("#nDx")) $("#nDx").onchange = e => { n.params.dx = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nDy")) $("#nDy").onchange = e => { n.params.dy = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nTrailAmount")) $("#nTrailAmount").oninput = e => { n.params.trail = +e.target.value; runtime.render(); autosave(); };
  if ($("#nBreathe")) $("#nBreathe").oninput = e => { n.params.breathe = +e.target.value; runtime.render(); autosave(); };
  if ($("#nPoints")) $("#nPoints").oninput = e => { n.params.points = +e.target.value; runtime.render(); autosave(); };
  if ($("#nSoftness")) $("#nSoftness").oninput = e => { n.params.softness = +e.target.value; runtime.render(); autosave(); };
  if ($("#nNoise")) $("#nNoise").oninput = e => { n.params.noise = +e.target.value; runtime.render(); autosave(); };
  if ($("#nDecay")) $("#nDecay").oninput = e => { n.params.decay = +e.target.value; runtime.render(); autosave(); };
  if ($("#nInvert")) {
    $("#nInvert").value = String(!!n.params.invert);
    $("#nInvert").onchange = e => { n.params.invert = e.target.value === "true"; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nShowPoints")) {
    $("#nShowPoints").value = String(!!n.params.showPoints);
    $("#nShowPoints").onchange = e => { n.params.showPoints = e.target.value === "true"; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nAxis")) {
    $("#nAxis").value = n.params.axis || "x";
    $("#nAxis").onchange = e => { n.params.axis = e.target.value; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#cameraStart")) $("#cameraStart").onclick = async () => {
    const facingMode = n.type === "phone-camera-front" ? "user" : "environment";
    const ok = await runtime.syncCameraFromProject({ request: true, facingMode });
    log(ok ? "Caméra active · action utilisateur" : "Caméra non activée");
  };
  if ($("#cameraStop")) $("#cameraStop").onclick = () => runtime.stopCamera();
  if ($("#rcHost")) $("#rcHost").onclick = async () => {
    try {
      if (!window.Peer) throw new Error("PeerJS non chargé — recharge la page");
      rcSession?.stop();
      const known = (n.params?.room || loadRemoteCameraRoom() || "").toUpperCase();
      const room = known || makeRoomCode();
      n.params.room = room;
      n.params.status = "QR_OPEN";
      rcSession = createRemoteCameraSession({
        role: "host",
        room,
        videoEl: runtime.remoteVideo,
        onState: ({ state, error, metrics, room: r }) => {
          n.params.status = state;
          runtime.setRemoteCamera({
            state,
            live: state === "LIVE",
            videoEl: runtime.remoteVideo,
            metrics,
            room: r
          });
          const el = $("#rcState");
          if (el) el.textContent = state;
          if (state === "LIVE") log("Remote Camera · LIVE (FIRST_FRAME)");
          if (error) log(`Remote Camera · ${error}`);
        },
        onStream: (stream) => {
          runtime.setRemoteCamera({
            state: runtime.remoteCamera?.state || "PEER_CONNECTED",
            live: false,
            stream,
            videoEl: runtime.remoteVideo,
            room
          });
        },
        onLog: (msg) => log(msg)
      });
      await rcSession.startHost();
      const base = localStorage.getItem(COMPANION_BASE_KEY) || localStorage.getItem("nvd.companionBase") || "http://127.0.0.1:4177/";
      rememberRemoteCameraRoom(room, { companionBase: base, status: LINK_STATES.CONNECTING });
      const join = companionJoinUrl({ companionBase: base, room });
      const box = $("#rcQrBox");
      if (box) {
        box.innerHTML = `<p>Salon <code>${room}</code>${known ? " · reprise" : ""}</p><p><a href="${join}" target="_blank" rel="noopener">${join}</a></p><p class="hint">Ouvre ce lien sur le téléphone (HTTPS recommandé). HTTP LAN = PLATFORM-LIMITED pour getUserMedia.</p>`;
      }
      log(`Remote Camera · ${known ? "REPRISE" : "QR_OPEN"} · ${room}`);
      autosave();
    } catch (e) {
      log(`Remote Camera · ${e.message || e}`);
    }
  };
  if ($("#rcStop")) $("#rcStop").onclick = () => {
    rcSession?.stop();
    rcSession = null;
    runtime.stopRemoteCameraTracks();
    n.params.status = "DISCONNECTED";
    log("Remote Camera · coupé · tracks arrêtées");
    renderInspector(n.id);
  };
  if ($("#exposeChannelBtn")) $("#exposeChannelBtn").onclick = () => {
    const key = $("#channelParam")?.value;
    const def = channelDefs.find(([k]) => k === key);
    exposeChannel(n, def);
  };
  if ($("#nTrail")) {
    $("#nTrail").value = String(!!n.params.trail);
    $("#nTrail").onchange = e => { n.params.trail = e.target.value === "true"; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nLoop")) {
    $("#nLoop").value = String(n.params.loop !== false);
    $("#nLoop").onchange = e => { n.params.loop = e.target.value === "true"; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nSeek")) $("#nSeek").onchange = e => { n.params.seekTo = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nMarkers")) $("#nMarkers").onchange = e => {
    n.params.markers = String(e.target.value || "").split(",").map(s => Number(s.trim())).filter(Number.isFinite);
    autosave();
    commitHistory();
  };
  if ($("#nSyncGroup")) $("#nSyncGroup").onchange = e => { n.params.syncGroup = e.target.value.trim(); autosave(); commitHistory(); };
  if ($("#nVideoFile")) {
    $("#nVideoFile").onchange = async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await runtime.attachVideoFile(n.id, file, { loop: n.params.loop !== false });
        n.params.srcName = file.name;
        log(`Vidéo chargée · ${file.name}`);
        runtime.render();
        autosave();
        commitHistory();
      } catch (err) {
        log(`Vidéo : ${err.message || err}`);
      }
    };
  }
  if ($("#addInPort")) $("#addInPort").onclick = () => addSubpatchPort(n, "in");
  if ($("#addOutPort")) $("#addOutPort").onclick = () => addSubpatchPort(n, "out");
  $("#toolBtn").onclick = () => {
    if (n.type === "subpatch") enterSubpatch(n);
    else if (!isExecutable(n.type)) log(`Outil · ${n.title} indisponible (pas de moteur)`);
    else log(`Outil · ${n.title} — paramètres dans l'inspecteur`);
  };
  $("#dupNodeBtn").onclick = () => duplicateNode(n.id);
  $("#delNodeBtn").onclick = () => deleteNode(n.id);
}

function addSubpatchPort(node, direction) {
  const label = direction === "in" ? "Nom de l'entrée" : "Nom de la sortie";
  const name = prompt(label, direction === "in" ? "In" : "Out");
  if (!name) return;
  addBoxPort(node, direction, name, "any");
  redraw();
  selectNode(node.id);
  log(`Port ${direction === "in" ? "entrée" : "sortie"} · ${name}`);
  autosave();
  commitHistory();
}

function wrapSelection() {
  const ids = [...selection];
  if (!ids.length && selectedNode) ids.push(selectedNode);
  if (!ids.length) { log("Sélection vide"); return; }
  const g = activeGraph();
  let box;
  try { box = wrapNodesInSubpatch(g, ids, "Boîte"); }
  catch (e) { log(e.message || String(e)); return; }
  selection.clear();
  redraw();
  selectNode(box.id);
  log(`Sous-patch · ${box.title} · ${ids.length} node(s)`);
  autosave();
  commitHistory();
}

function duplicateNode(id) {
  const src = nodeById(id);
  if (!src) return;
  const n = addNode(src.type, src.x + 36, src.y + 36);
  n.params = { ...src.params };
  n.title = src.title;
  const el = document.querySelector(`.node[data-id="${n.id}"] .nh`);
  if (el) el.textContent = n.title + (isExecutable(n.type) ? "" : " · ○");
  selectNode(n.id);
  log(`Node dupliqué · ${n.title}`);
}

function deleteNode(id) {
  selection.delete(id);
  const g = activeGraph();
  sharedAudio.release(id);
  g.nodes = g.nodes.filter(n => n.id !== id);
  g.edges = (g.edges || []).filter(e => e.from.node !== id && e.to.node !== id);
  if (isRootGraph()) {
    project.nodes = g.nodes;
    project.edges = g.edges;
  }
  if (selectedNode === id) selectedNode = null;
  redraw();
  if (isRootGraph()) runtime.setProject(project);
  autosave();
  commitHistory();
  log("Node supprimé");
}

function addPoint(x, y) {
  pointSeq++;
  project.controls.push({ id: `p${pointSeq}`, type: "point2d", x, y });
  drawPoint(project.controls.at(-1), pointSeq);
  runtime.render();
  autosave();
}
function drawPoint(p, i) {
  const d = document.createElement("div");
  d.className = "point";
  d.style.left = (p.x * 100) + "%";
  d.style.top = (p.y * 100) + "%";
  d.textContent = i;
  $("#previewOverlay").appendChild(d);
}
function addClip(track, start, duration, label, kind = "effect") {
  clipSeq++;
  const c = { id: `c${clipSeq}`, track, start, duration, label, kind };
  project.timeline.push(c);
  drawClip(c);
  autosave();
  return c;
}
function drawClip(c) {
  const el = document.createElement("div");
  el.className = `clip ${c.kind}`;
  el.dataset.id = c.id;
  el.style.left = (c.start / 60 * 100) + "%";
  el.style.width = (c.duration / 60 * 100) + "%";
  el.innerHTML = `${c.label}<span class="resize"></span>`;
  const track = document.querySelector(`.track[data-track="${c.track}"]`);
  if (track) track.appendChild(el);
  clipDrag(el, c);
}
function clipDrag(el, c) {
  let m = null, sx = 0, s = 0, d = 0;
  el.onmousedown = e => {
    m = e.target.classList.contains("resize") ? "resize" : "move";
    sx = e.clientX; s = c.start; d = c.duration; e.preventDefault();
  };
  window.addEventListener("mousemove", e => {
    if (!m) return;
    const w = $(".tracks").getBoundingClientRect().width;
    const delta = (e.clientX - sx) / w * 60;
    if (m === "move") c.start = Math.max(0, Math.min(60 - c.duration, s + delta));
    else c.duration = Math.max(.25, Math.min(60 - c.start, d + delta));
    el.style.left = (c.start / 60 * 100) + "%";
    el.style.width = (c.duration / 60 * 100) + "%";
  });
  window.addEventListener("mouseup", () => {
    if (m) { log(`Timeline · ${c.label} ${c.start.toFixed(1)}s / ${c.duration.toFixed(1)}s`); m = null; autosave(); }
  });
}

function redraw() {
  ensureRouting(project);
  updateRouteButtons();
  $("#patchSpace").innerHTML = "";
  ensurePatchWorld();
  ensureWireLayer();
  $("#previewOverlay").innerHTML = "";
  qall(".track").forEach(t => t.innerHTML = "");
  nodeSeq = 0; clipSeq = 0; pointSeq = 0;
  const g = activeGraph();
  for (const n of g.nodes || []) {
    nodeSeq = Math.max(nodeSeq, +String(n.id).replace(/\D/g, "") || 0);
    drawNode(n);
  }
  if (isRootGraph()) {
    project.controls.forEach((p, i) => { pointSeq = i + 1; drawPoint(p, i + 1); });
    for (const c of project.timeline) {
      clipSeq = Math.max(clipSeq, +c.id.replace(/\D/g, "") || 0);
      drawClip(c);
    }
    runtime.setProject(project);
  }
  updateGraphBreadcrumb();
  requestAnimationFrame(renderWires);
}

function autosave() {
  try {
    const data = exportProject(project);
    localStorage.setItem("cvd.autosave", data);
    markCrashRecovery(data);
    markProjectMeta(project.name, {
      workspace: localStorage.getItem("cvd.workspace") || "bureau"
    });
  } catch (e) {
    console.error("AUTOSAVE_FAILED", e?.message || e);
  }
  try { publishHostState(); } catch { /* hôte distant optionnel */ }
}

$("#previewOverlay").addEventListener("pointermove", e => {
  const r = e.currentTarget.getBoundingClientRect();
  runtime.setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
});
$("#previewOverlay").onclick = e => {
  const r = e.currentTarget.getBoundingClientRect();
  addPoint((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  log("Point image ajouté");
};
$("#clearPoints").onclick = () => {
  project.controls = [];
  $("#previewOverlay").innerHTML = "";
  runtime.render();
  autosave();
  log("Points effacés");
};
$("#addCue").onclick = () => addClip(4, Math.random() * 45, 2, "Cue", "cue");
$("#addEffect").onclick = () => addClip(1, Math.random() * 40, 6, "Effet", "effect");

function videoOutputPort(node) {
  if (!node) return null;
  const labels = portLabels(node.type, node) || [];
  for (let i = labels.length - 1; i >= 0; i--) {
    if (portDirection(node.type, i, labels.length, node) === "out" && portDataType(node.type, i, node) === "video") return i;
  }
  return null;
}

function connectNodes(fromNode, fromPort, toNode, toPort = 0) {
  if (!fromNode || !toNode || fromPort == null) return false;
  const g = activeGraph();
  const from = { node: fromNode.id, port: fromPort };
  const to = { node: toNode.id, port: toPort };
  const validation = validateEdge({ nodes: g.nodes, edges: g.edges || [] }, from, to);
  if (!validation.ok) {
    log(`Magic FX · connexion impossible · ${validation.errors.join(" · ")}`);
    return false;
  }
  g.edges ||= [];
  g.edges = g.edges.filter(e => !(e.to.node === to.node && e.to.port === to.port));
  wireSeq += 1;
  g.edges.push({ id: `e${Date.now()}-${wireSeq}`, from, to });
  if (isRootGraph()) project.edges = g.edges;
  return true;
}

function applyMagicFx(type) {
  const source = selectedNode ? nodeById(selectedNode) : null;
  if (type === "blob") {
    const n = addNode("blob", source ? source.x + 220 : 340, source ? source.y + 40 : 160);
    n.params = { ...n.params, points: 7, size: .22, softness: .65, noise: .18, speed: .6, showPoints: true };
    redraw();
    selectNode(n.id);
    runtime.setProject(project);
    log("Magic FX · Blob organique créé · points éditables via l'inspecteur");
    $("#magicFxModal")?.classList.add("hidden");
    return;
  }
  if (!source) {
    log("Magic FX · sélectionne d'abord une source vidéo dans PATCH");
    return;
  }
  const outPort = videoOutputPort(source);
  if (outPort == null) {
    log(`Magic FX · « ${source.title} » ne fournit pas de vidéo`);
    return;
  }
  const n = addNode(type, source.x + 220, source.y + 20);
  const presets = {
    ghost: { decay: .82, dx: 8, dy: 0 },
    threshold: { threshold: .45, invert: false },
    mirror: { axis: "x" },
    shadow: { threshold: .45, mirror: true, dx: 18, dy: 0, trail: true, decay: .84 },
    bodyclone: { threshold: .45, dx: 72, dy: 0, invert: false },
    blackhole: { speed: .65, size: .58 }
  };
  n.params = { ...n.params, ...(presets[type] || {}) };
  const connected = type === "blackhole" ? true : connectNodes(source, outPort, n, 0);
  redraw();
  selectNode(n.id);
  runtime.setProject(project);
  autosave();
  commitHistory();
  log(`Magic FX · ${n.title}${connected ? "" : " · à connecter"}`);
  $("#magicFxModal")?.classList.add("hidden");
}

function renderControlSurface() {
  const host = $("#controlSurface");
  if (!host) return;
  project.channels ||= [];
  project.channels = project.channels.filter(ch => project.nodes.some(n => n.id === ch.nodeId));
  if (!project.channels.length) {
    host.innerHTML = '<p class="hint">Aucun Channel exposé. Sélectionne un node puis clique « Exposer » dans l’inspecteur.</p>';
    return;
  }
  host.innerHTML = project.channels.map(ch => {
    const node = project.nodes.find(n => n.id === ch.nodeId);
    const value = Number(node?.params?.[ch.param] ?? ch.min ?? 0);
    return `<div class="control-channel" data-channel="${ch.id}">
      <label title="${ch.name}">${ch.name}</label>
      <input type="range" min="${ch.min ?? 0}" max="${ch.max ?? 1}" step="${ch.step ?? .01}" value="${value}">
      <output>${Number.isFinite(value) ? value.toFixed((ch.step ?? .01) < .1 ? 2 : 0) : "—"}</output>
      <button type="button" title="Retirer du Control Surface">×</button>
    </div>`;
  }).join("");
  host.querySelectorAll(".control-channel").forEach(row => {
    const ch = project.channels.find(x => x.id === row.dataset.channel);
    const input = row.querySelector("input");
    const output = row.querySelector("output");
    const remove = row.querySelector("button");
    input.oninput = () => {
      const node = project.nodes.find(n => n.id === ch.nodeId);
      if (!node) return;
      node.params ||= {};
      node.params[ch.param] = Number(input.value);
      output.textContent = Number(input.value).toFixed((ch.step ?? .01) < .1 ? 2 : 0);
      runtime.render();
      autosave();
    };
    input.onchange = () => commitHistory();
    remove.onclick = () => {
      project.channels = project.channels.filter(x => x.id !== ch.id);
      autosave();
      commitHistory();
      renderControlSurface();
    };
  });
}

$("#magicFxBtn")?.addEventListener("click", () => $("#magicFxModal")?.classList.remove("hidden"));
$("#magicFxClose")?.addEventListener("click", () => $("#magicFxModal")?.classList.add("hidden"));
$("#magicFxModal")?.addEventListener("click", e => { if (e.target.id === "magicFxModal") e.currentTarget.classList.add("hidden"); });
qall("[data-magic-fx]").forEach(b => b.onclick = () => applyMagicFx(b.dataset.magicFx));

$("#controlsBtn")?.addEventListener("click", () => {
  renderControlSurface();
  $("#controlsModal")?.classList.remove("hidden");
});
$("#controlsClose")?.addEventListener("click", () => $("#controlsModal")?.classList.add("hidden"));
$("#controlsRefresh")?.addEventListener("click", renderControlSurface);
$("#controlsModal")?.addEventListener("click", e => { if (e.target.id === "controlsModal") e.currentTarget.classList.add("hidden"); });

function fireDesktopCue(cue) {
  if (!cue) {
    log("ERREUR · aucun cue");
    return;
  }
  const applied = applyCue(project, {
    id: cue.id,
    label: cue.label,
    time: cue.time ?? cue.start,
    actions: cue.actions || [{ type: "jump-time", value: cue.time ?? cue.start }]
  });
  project = applied.project;
  for (const effect of applied.effects) {
    if (effect.type === "jump-time" || effect.type === "go") {
      runtime.time = Number(effect.time ?? cue.time ?? cue.start) || 0;
      runtime.play();
      syncPlayButton();
    }
    if (effect.type === "error") log(`ERREUR cue · ${effect.error}`);
    if (effect.type === "osc") log(`Cue OSC déclaré · ${effect.address} (à transmettre)`);
    if (effect.type === "artnet") log(`Cue Art-Net déclaré · u${effect.universe} ch${effect.channel}=${effect.value}`);
    if (effect.type === "panic") log("PANIC · audio coupé dans le projet");
  }
  project.meta = project.meta || {};
  project.meta.transport = { action: "go", cueId: cue.id, start: cue.time ?? cue.start, label: cue.label };
  try { publishHostState(); } catch { /* */ }
  redraw();
  autosave();
  log(`GO · ${cue.label || cue.id}`);
}

$("#cueGo").onclick = () => {
  const cues = listCues(project);
  const current = project.meta?.transport?.cueId;
  const cue = cues.find(c => c.id === current) || cues[0];
  fireDesktopCue(cue);
};
$("#cueNext").onclick = () => {
  const cues = listCues(project);
  const cue = nextCue(cues, project.meta?.transport?.cueId);
  if (!cue) return log("ERREUR · pas de cue suivant");
  fireDesktopCue(cue);
};
$("#cuePrev").onclick = () => {
  const cues = listCues(project);
  const cue = previousCue(cues, project.meta?.transport?.cueId);
  if (!cue) return log("ERREUR · pas de cue précédent");
  fireDesktopCue(cue);
};
$("#cuePanic").onclick = () => {
  const applied = applyCue(project, null, { panic: true });
  project = applied.project;
  runtime.stop();
  syncPlayButton();
  redraw();
  autosave();
  log("PANIC");
};

function downloadText(content, fileName, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1200);
}

function runExport(kind) {
  const map = {
    max: () => ({ result: exportMax(project), name: `${project.name || "patch"}.maxpat`, mime: "application/json" }),
    td: () => ({ result: exportTouchDesigner(project), name: `${project.name || "patch"}_td.py`, mime: "text/x-python" }),
    pd: () => ({ result: exportPureData(project), name: `${project.name || "patch"}.pd`, mime: "text/plain" }),
    millumin: () => ({ result: exportMilluminOscMap(project), name: `${project.name || "patch"}-millumin-osc.txt`, mime: "text/plain" })
  };
  const run = map[kind];
  if (!run) return;
  const { result, name, mime } = run();
  downloadText(result.content, name, mime);
  const uns = result.unsupported?.length ? ` · sans map : ${result.unsupported.join(", ")}` : "";
  log(`Export ${kind}${uns}`);
}

$("#exportMaxBtn")?.addEventListener("click", () => runExport("max"));
$("#exportTdBtn")?.addEventListener("click", () => runExport("td"));
$("#exportPdBtn")?.addEventListener("click", () => runExport("pd"));
$("#exportMilluminBtn")?.addEventListener("click", () => runExport("millumin"));

function currentShowDiagnostic() {
  const experimental = (project.nodes || []).filter(n => !isExecutable(n.type)).map(n => n.type);
  return buildDiagnosticSnapshot({
    platform: window.nvdDesktop?.runtime || undefined,
    remote: { state: remoteSession?.online ? "CONNECTED" : "DISCONNECTED" },
    remoteCamera: runtime.remoteCamera || { state: "WAITING" },
    ws: { state: remoteSession?.online ? "CONNECTED" : "DISCONNECTED" },
    midi: { state: deviceBus.lastMidi ? "ACTIVE" : "IDLE" },
    serial: { state: deviceBus.serialState || "offline" },
    osc: { state: typeof window.nvdDesktop?.sendOscUdp === "function" ? "AVAILABLE" : "BRIDGE-ONLY" },
    artnet: { state: typeof window.nvdDesktop?.sendArtNetUdp === "function" ? "AVAILABLE" : "BRIDGE-ONLY" },
    recentErrors: runtime.lastGraph?.errors || [],
    session: {
      project: project.name || "Sans nom",
      nodes: project.nodes?.length || 0,
      edges: project.edges?.length || 0,
      experimentalNodes: [...new Set(experimental)],
      externalOutputAutoArmed: (project.nodes || []).filter(n => n.params?.auto === true && ["arduino","esp","servo",...OSC_BRIDGE_TYPES].includes(n.type)).map(n => n.title || n.type)
    }
  });
}

function showDiagnostic({ copy = false } = {}) {
  const snap = currentShowDiagnostic();
  const out = $("#diagnosticOut");
  if (out) {
    out.style.display = "block";
    out.textContent = formatDiagnosticText(snap);
  }
  if (copy) {
    copyDiagnostic(snap).then(() => log("Diagnostic spectacle copié")).catch(e => log("Diagnostic · " + (e?.message || e)));
  } else {
    const exp = snap.session?.experimentalNodes?.length || 0;
    log(`Diagnostic spectacle · ${snap.recentErrors?.length || 0} erreur(s) · ${exp} type(s) expérimental(aux) dans le projet`);
  }
  return snap;
}
$("#runDiagnosticBtn")?.addEventListener("click", () => showDiagnostic());
$("#copyDiagnosticBtn")?.addEventListener("click", () => showDiagnostic({ copy: true }));

$("#showHostCard")?.addEventListener("click", async () => {
  const out = $("#hostCardOut");
  if (!out) return;
  let card = null;
  try {
    if (window.nvdDesktop?.getHostCard) card = await window.nvdDesktop.getHostCard();
  } catch (e) {
    log(`Carte hôte Electron · ${e.message || e}`);
  }
  if (!card) {
    card = createHostCard({
      host: location.hostname || "127.0.0.1",
      port: window.nvdDesktop?.remotePort || REMOTE_PORT,
      httpPort: Number(location.port) || null,
      version: APP_VERSION
    });
  }
  const caps = discoveryCapabilities();
  const qr = hostCardToQrPayload(card);
  out.style.display = "block";
  out.textContent = [
    `WS ${card.wsUrl}`,
    card.httpUrl ? `HTTP ${card.httpUrl}` : "HTTP —",
    `Pair ${card.pairCode}`,
    `Discovery · LAN UDP oui · mDNS ${caps.mdnsStatus}`,
    "",
    "QR payload :",
    qr
  ].join("\n");
  log("Carte hôte affichée (QR = payload JSON)");
});

function syncPlayButton() {
  const b = $("#play");
  if (b) { b.textContent = runtime.playing ? "Ⅱ" : "▶"; b.title = runtime.playing ? "Pause (Espace)" : "Lecture (Espace)"; }
}
function togglePlay() {
  const playing = runtime.toggle();
  syncPlayButton();
  log(playing ? "Lecture" : "Pause");
}
$("#play").onclick = togglePlay;
$("#stop").onclick = () => { runtime.stop(); syncPlayButton(); log("Stop"); };
setInterval(() => {
  $("#timecode").textContent = `00:${String(runtime.time.toFixed(1)).padStart(4, "0")}`;
  $("#playhead").style.left = `calc(92px + ${(runtime.time / 60) * 100}% * .86)`;
}, 100);

async function applyVibeFromUi() {
  const text = $("#vibeText").value.trim();
  if (!text) { log("Vibe · texte vide"); return; }
  log("Vibe · analyse…");
  $("#applyVibe").disabled = true;
  try {
    const result = await runVibe(text, project);
    if (result.aiError) log(`Vibe · IA indisponible · ${result.aiError}`);
    if (result.aiUnavailable) log(`Vibe · ${result.note}`);
    else log(`Vibe · ${result.note || result.engine}`);

    if (!result.ops?.length) {
      log("Vibe · aucune opération générée (pas de réussite simulée)");
      pendingVibe = null;
      $("#vibePreview")?.classList.add("hidden");
      return;
    }

    pendingVibe = result;
    const box = $("#vibePreview");
    if (box) {
      box.classList.remove("hidden");
      box.innerHTML = `<div class="vibe-preview-head"><b>Aperçu Vibe</b> · ${result.engine} · ${result.ops.length} op(s)</div>
        <pre class="vibe-preview-ops">${result.ops.map(o => JSON.stringify(o)).join("\n")}</pre>
        <div class="vibe-preview-actions">
          <button type="button" id="vibeConfirm" class="smallbtn">Appliquer</button>
          <button type="button" id="vibeCancel" class="smallbtn">Annuler</button>
        </div>`;
      $("#vibeConfirm").onclick = () => confirmPendingVibe();
      $("#vibeCancel").onclick = () => {
        pendingVibe = null;
        box.classList.add("hidden");
        log("Vibe · aperçu annulé (aucune modification)");
      };
    } else {
      await confirmPendingVibe();
    }
  } catch (e) {
    log(`Vibe ÉCHEC · ${e.message || e}`);
  } finally {
    $("#applyVibe").disabled = false;
  }
}

async function confirmPendingVibe() {
  if (!pendingVibe?.ops?.length) return;
  commitHistory();
  const { applied, errors } = applyVibeOps(project, pendingVibe.ops, {
    addNode: (type, x, y) => {
      // force root graph for vibe
      const prev = graphPath;
      graphPath = [];
      const n = addNode(type, x, y);
      graphPath = prev;
      return n;
    },
    addClip, ensureEdges: () => { project.edges ||= []; return project.edges; },
    nodeById: id => project.nodes.find(n => n.id === id),
    log
  });
  pendingVibe = null;
  $("#vibePreview")?.classList.add("hidden");
  graphPath = [];
  redraw();
  runtime.play();
  syncPlayButton();
  autosave();
  commitHistory();
  log(`Vibe · ${applied.length} op(s) appliquée(s) — annulable via Undo`);
  for (const err of errors) log(`Vibe ERREUR · ${err}`);
}

$("#applyVibe").onclick = applyVibeFromUi;
$("#vibeText").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    applyVibeFromUi();
  }
});

function runtimeFacts() {
  return {
    electronRuntime: window.nvdDesktop?.runtime === "electron",
    hasNativeSave: typeof window.nvdDesktop?.saveProject === "function",
    hasNativeOpen: typeof window.nvdDesktop?.openProject === "function",
    userAgent: navigator.userAgent || ""
  };
}

async function loadProjectText(data, label) {
  project = validateProject(JSON.parse(data));
  graphPath = [];
  redraw();
  runtime.play();
  syncPlayButton();
  log("Projet chargé · " + (label || project.name));
}

$("#saveProject").onclick = async () => {
  const data = exportProject(project);
  const fileName = (project.name || "projet") + ".cvd.json";
  const facts = runtimeFacts();
  const plan = planManualSave({
    hasNativeSave: facts.hasNativeSave,
    userAgent: facts.userAgent,
    electronRuntime: facts.electronRuntime
  });
  if (plan.persistLocal) {
    try { localStorage.setItem(MANUAL_SAVE_KEY, data); }
    catch (e) { log(`Sauvegarde locale impossible · ${e.message || e}`); }
  }
  if (plan.mode === "native") {
    const r = await window.nvdDesktop.saveProject({ suggestedName: fileName, data });
    if (r && !r.canceled) log(saveStatusMessage(plan, r.path || fileName));
    autosave();
    return;
  }
  if (plan.download) {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1200);
  }
  log(saveStatusMessage(plan, fileName));
  autosave();
};
$("#loadProject").onclick = async () => {
  const facts = runtimeFacts();
  const saved = localStorage.getItem(MANUAL_SAVE_KEY);
  const plan = planManualOpen({ hasNativeOpen: facts.hasNativeOpen, hasLocalSave: !!saved });
  if (plan === "native") {
    const r = await window.nvdDesktop.openProject();
    if (r?.error) log(`Ouverture · ${r.error}`);
    if (r && !r.canceled && r.data) loadProjectText(r.data, r.path);
    return;
  }
  if (plan === "local-then-file" && saved && confirm("Rouvrir le dernier projet enregistré localement ?")) {
    loadProjectText(saved, "sauvegarde locale");
    return;
  }
  $("#projectFile").click();
};
$("#projectFile").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  project = validateProject(JSON.parse(await f.text()));
  redraw();
  runtime.play();
  syncPlayButton();
  log("Projet chargé · " + project.name);
};
window.addEventListener("beforeunload", () => autosave());

async function openOutput(destination = "main-output") {
  const w = window.open(`./output.html?route=${encodeURIComponent(destination)}`, `cvd-output-${destination}`, "popup=yes,width=960,height=540,resizable=yes");
  if (!w) { alert("Autorise les pop-ups pour OUTPUT."); return; }
  const send = () => { if (!w.closed) w.postMessage({ type: "cvd-project", project }, "*"); };
  setTimeout(send, 500);
  window._cvdOutputTimer = setInterval(() => {
    if (w.closed) return clearInterval(window._cvdOutputTimer);
    send();
  }, 250);
  log("OUTPUT ouvert");
}
$("#outputBtn").onclick = openOutput;

function setWorkspaceMode(mode) {
  document.body.dataset.workspace = mode;
  $("#modeBureau").classList.toggle("active", mode === "bureau");
  $("#modePlateau").classList.toggle("active", mode === "plateau");
  localStorage.setItem("cvd.workspace", mode);
  log(`Mode ${mode === "bureau" ? "Bureau" : "Plateau"}`);
}
$("#modeBureau").onclick = () => setWorkspaceMode("bureau");
$("#modePlateau").onclick = () => setWorkspaceMode("plateau");

function applyAppearance(a) {
  const r = document.documentElement;
  r.style.setProperty("--accent", a.accent || "#d7b86a");
  r.style.setProperty("--accent2", a.secondary || "#8fa79d");
  document.body.classList.toggle("gradient-off", a.gradient === "off");
  document.body.classList.toggle("gradient-strong", a.gradient === "strong");
  const intensity = Number(a.intensity ?? 35) / 100;
  r.style.setProperty("--gradient-alpha", String(intensity));
  localStorage.setItem("cvd.appearance", JSON.stringify(a));
}
function readAppearance() {
  try { return JSON.parse(localStorage.getItem("cvd.appearance")) || {}; } catch { return {}; }
}

function openPreferences(tab = "general") {
  $("#preferencesModal").classList.remove("hidden");
  qall("[data-pref-tab]").forEach(b => b.classList.toggle("active", b.dataset.prefTab === tab));
  qall("[data-pref-panel]").forEach(p => p.classList.toggle("hidden", p.dataset.prefPanel !== tab));
  const ai = readAiConfig();
  if ($("#aiLocalEnabled")) $("#aiLocalEnabled").checked = ai.localEnabled !== false;
  if ($("#aiLocalBase")) $("#aiLocalBase").value = ai.localBaseUrl || "http://127.0.0.1:11434";
  if ($("#aiLocalModel")) $("#aiLocalModel").value = ai.localModel || "qwen2.5-coder:7b";
  if ($("#aiEnabled")) $("#aiEnabled").checked = ai.enabled === true;
  if ($("#aiEndpoint")) $("#aiEndpoint").value = ai.endpoint || "";
  if ($("#aiKey")) $("#aiKey").value = ai.apiKey || "";
  if ($("#aiModel")) $("#aiModel").value = ai.model || "gpt-4o-mini";
  if ($("#versionInfo")) $("#versionInfo").textContent = BUILD_LABEL;
  try {
    const g = JSON.parse(localStorage.getItem("nvd.general") || "{}");
    if ($("#prefRestoreAutosave")) $("#prefRestoreAutosave").checked = g.restoreAutosave !== false;
    if ($("#prefLoadDemo")) $("#prefLoadDemo").checked = g.loadDemo !== false;
  } catch { /* */ }
  if ($("#prefDefaultZoom")) $("#prefDefaultZoom").value = String(Math.round(view.scale * 100));
}
$("#preferencesBtn").onclick = () => openPreferences("general");
$("#preferencesClose").onclick = () => $("#preferencesModal").classList.add("hidden");
qall("[data-pref-tab]").forEach(b => b.onclick = () => openPreferences(b.dataset.prefTab));

for (const id of ["accentColor", "secondaryColor", "gradientMode", "gradientIntensity"]) {
  const el = $("#" + id);
  if (el) el.oninput = () => applyAppearance({
    accent: $("#accentColor").value,
    secondary: $("#secondaryColor").value,
    gradient: $("#gradientMode").value,
    intensity: $("#gradientIntensity").value
  });
}
$("#appearanceReset").onclick = () => {
  $("#accentColor").value = "#d7b86a";
  $("#secondaryColor").value = "#8fa79d";
  $("#gradientMode").value = "subtle";
  $("#gradientIntensity").value = "35";
  applyAppearance({ accent: "#d7b86a", secondary: "#8fa79d", gradient: "subtle", intensity: 35 });
};

function collectAiConfig() {
  return {
    localEnabled: $("#aiLocalEnabled")?.checked !== false,
    localBaseUrl: $("#aiLocalBase")?.value?.trim() || "http://127.0.0.1:11434",
    localModel: $("#aiLocalModel")?.value?.trim() || "qwen2.5-coder:7b",
    enabled: $("#aiEnabled")?.checked === true,
    endpoint: $("#aiEndpoint")?.value?.trim() || "",
    apiKey: $("#aiKey")?.value?.trim() || "",
    model: $("#aiModel")?.value?.trim() || "gpt-4o-mini"
  };
}

$("#aiSave")?.addEventListener("click", () => {
  const cfg = collectAiConfig();
  const check = assertAiProviderAllowed(cfg);
  if (!check.ok) {
    log(`ERREUR · ${check.error}`);
    alert(check.error);
    return;
  }
  saveAiConfig(cfg);
  log(`Préférences IA enregistrées · local ${cfg.localEnabled ? cfg.localModel : "désactivé"}`);
});

$("#aiLocalProbe")?.addEventListener("click", async () => {
  const status = $("#aiLocalStatus");
  if (status) status.textContent = "Test…";
  const cfg = collectAiConfig();
  saveAiConfig(cfg);
  const result = await probeLocalAi(cfg, { fresh: true });
  if (result.ok && result.available) {
    const names = Array.isArray(result.models) ? result.models : [];
    const selected = result.model || cfg.localModel;
    if ($("#aiLocalModel") && selected) $("#aiLocalModel").value = selected;
    saveAiConfig({ ...cfg, localModel: selected });
    if (status) status.textContent = names.length
      ? `Prêt · ${selected} · ${names.length} modèle(s)`
      : "Ollama joignable · aucun modèle installé";
    log(names.length
      ? `Local AI Core · prêt · ${selected}`
      : "Local AI Core · Ollama OK mais aucun modèle installé");
  } else {
    if (status) status.textContent = `Indisponible · ${result.error || "Ollama non joignable"}`;
    log(`Local AI Core · indisponible · ${result.error || "Ollama non joignable"}`);
  }
});

$("#clearAutosave")?.addEventListener("click", () => {
  localStorage.removeItem("cvd.autosave");
  log("Autosave effacée");
});
$("#prefRestoreAutosave")?.addEventListener("change", () => {
  const g = { restoreAutosave: $("#prefRestoreAutosave").checked, loadDemo: $("#prefLoadDemo")?.checked !== false };
  localStorage.setItem("nvd.general", JSON.stringify(g));
});
$("#prefLoadDemo")?.addEventListener("change", () => {
  const g = { restoreAutosave: $("#prefRestoreAutosave")?.checked !== false, loadDemo: $("#prefLoadDemo").checked };
  localStorage.setItem("nvd.general", JSON.stringify(g));
});
$("#prefDefaultZoom")?.addEventListener("input", e => {
  view.scale = Math.max(0.4, Math.min(2.2, (+e.target.value || 100) / 100));
  applyViewTransform();
  renderWires();
});
const savedAppearance = readAppearance();
if (savedAppearance.accent) {
  $("#accentColor").value = savedAppearance.accent;
  $("#secondaryColor").value = savedAppearance.secondary || "#8fa79d";
  $("#gradientMode").value = savedAppearance.gradient || "subtle";
  $("#gradientIntensity").value = String(savedAppearance.intensity ?? 35);
  applyAppearance(savedAppearance);
}
setWorkspaceMode(localStorage.getItem("cvd.workspace") || "bureau");

function restoreWorkspaceLayout() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("nvd.workspace.layout") || "{}"); } catch { /* */ }
  const targets = {
    library: $(".library"),
    inspector: $(".inspector"),
    patch: $("#patchPanel"),
    timeline: $("#timelinePanel"),
    vibe: $(".vibe"),
    terminal: $(".terminal")
  };
  for (const [key, el] of Object.entries(targets)) {
    if (!el || !saved[key]) continue;
    if (saved[key].width) el.style.width = saved[key].width;
    if (saved[key].height) el.style.height = saved[key].height;
  }
  if (typeof ResizeObserver === "undefined") return;
  let timer = null;
  const observer = new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const layout = {};
      for (const [key, el] of Object.entries(targets)) {
        if (!el) continue;
        layout[key] = { width: el.style.width || "", height: el.style.height || "" };
      }
      localStorage.setItem("nvd.workspace.layout", JSON.stringify(layout));
    }, 180);
  });
  Object.values(targets).filter(Boolean).forEach(el => observer.observe(el));
}
restoreWorkspaceLayout();

document.addEventListener("keydown", e => {
  if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target, tag = t?.tagName?.toLowerCase?.();
  if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
  e.preventDefault();
  togglePlay();
});
document.addEventListener("keydown", e => {
  const tag = e.target?.tagName?.toLowerCase?.();
  const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable;
  if ((e.key === "Backspace" || e.key === "Delete") && selectedNode && !typing) {
    e.preventDefault();
    deleteNode(selectedNode);
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || typing) return;
  if (e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    const snap = history.undo();
    if (!snap) { log("Undo · rien à annuler"); return; }
    historySuspended = true;
    project = validateProject(snap);
    redraw();
    historySuspended = false;
    autosave();
    log("Undo");
  } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
    e.preventDefault();
    const snap = history.redo();
    if (!snap) { log("Redo · rien à rétablir"); return; }
    historySuspended = true;
    project = validateProject(snap);
    redraw();
    historySuspended = false;
    autosave();
    log("Redo");
  } else if (e.key === "d" && selectedNode) {
    e.preventDefault();
    duplicateNode(selectedNode);
  }
});

// Zoom / pan Patch Canvas
function setZoom(next) {
  view.scale = Math.max(0.4, Math.min(2.2, next));
  applyViewTransform();
  renderWires();
  if ($("#prefDefaultZoom")) $("#prefDefaultZoom").value = String(Math.round(view.scale * 100));
}
$("#zoomIn").onclick = () => setZoom(view.scale + 0.1);
$("#zoomOut").onclick = () => setZoom(view.scale - 0.1);
if ($("#wrapBtn")) $("#wrapBtn").onclick = () => wrapSelection();
$("#zoomReset").onclick = () => { view.x = 0; view.y = 0; setZoom(1); };
$("#patchSpace").addEventListener("wheel", e => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.08 : -0.08;
  setZoom(view.scale + delta);
}, { passive: false });
$("#patchSpace").addEventListener("pointerdown", e => {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    panDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    $("#patchSpace").setPointerCapture(e.pointerId);
    e.preventDefault();
  }
});
$("#patchSpace").addEventListener("pointermove", e => {
  if (!panDrag || e.pointerId !== panDrag.id) return;
  view.x = panDrag.vx + (e.clientX - panDrag.x);
  view.y = panDrag.vy + (e.clientY - panDrag.y);
  applyViewTransform();
  renderWires();
});
$("#patchSpace").addEventListener("pointerup", e => {
  if (panDrag && e.pointerId === panDrag.id) panDrag = null;
});

qall(".collapse").forEach(b => b.onclick = () => b.closest(".panel").classList.toggle("collapsed"));
$("#search").oninput = e => qall(".lib-item").forEach(x => {
  x.style.display = x.textContent.toLowerCase().includes(e.target.value.toLowerCase()) ? "flex" : "none";
});
const experimentalToggle = $("#showExperimental");
if (experimentalToggle) {
  experimentalToggle.checked = showExperimental;
  experimentalToggle.onchange = () => {
    showExperimental = experimentalToggle.checked;
    localStorage.setItem("nvd.showExperimental", showExperimental ? "1" : "0");
    buildLibrary();
    log(showExperimental ? "Library · expérimentaux visibles" : "Library · mode Production");
  };
}
$("#termSend").onclick = runCmd;
$("#termCmd").onkeydown = e => { if (e.key === "Enter") runCmd(); };

async function runCmd() {
  const i = $("#termCmd"), raw = i.value.trim(), v = raw.toLowerCase();
  if (!v) return;
  log("> " + raw);
  try {
    if (v === "output" || v === "output main") openOutput("main-output");
    else if (v === "output secondary") openOutput("local-window");
    else if (v === "demo" || v === "load demo") {
      project = createDemoProject();
      redraw();
      runtime.play();
      syncPlayButton();
      autosave();
      log("Demo P00 chargée");
    } else if (await devices.command(raw)) { /* handled */ }
    else {
      const types = ["camera", "tracking", "shader", "shadow", "osc", "midi", "dmx", "arduino", "esp", "servo"];
      const found = types.find(x => v.includes(x));
      if (found) addNode(found);
      else log("Commande reçue · aucune action reconnue");
    }
  } catch (e) {
    log("ERREUR · " + (e?.message || e));
  }
  i.value = "";
}

let routingTrack = 0;
function routeSummary(track) {
  const r = effectiveRoute(project, track);
  if (r.mode === "main") return "Principal";
  const labels = r.destinations.map(id => DESTINATIONS.find(d => d.id === id)?.label || id);
  if (r.mode === "only") return labels.length === 1 ? labels[0] : "Uniq. " + labels.length;
  return labels.length === 1 ? "Copie " + labels[0] : "Copie " + labels.length;
}
function updateRouteButtons() {
  document.querySelectorAll("[data-track-route]").forEach(b => {
    const t = +b.dataset.trackRoute;
    b.textContent = routeSummary(t);
    b.title = `Piste ${t + 1} · ${routeSummary(t)}`;
  });
}
function openRouteSheet(track) {
  routingTrack = track;
  ensureRouting(project);
  const r = effectiveRoute(project, track);
  $("#routeSheetTitle").textContent = `Routage piste ${track + 1}`;
  qall("[data-route-mode]").forEach(b => b.classList.toggle("active", b.dataset.routeMode === r.mode));
  $("#routeDestinations").innerHTML = DESTINATIONS.map(d => {
    const checked = r.destinations.includes(d.id) ? "checked" : "";
    const status = d.status === "adapter" ? "<span class='adapter'>adaptateur</span>" : d.status === "planned" ? "<small>passerelle</small>" : "<small>prêt</small>";
    return `<label class="route-dest"><input type="checkbox" data-route-dest="${d.id}" ${checked}><span>${d.label}</span>${status}</label>`;
  }).join("");
  $("#routeSheet").classList.remove("hidden");
}
document.querySelectorAll("[data-track-route]").forEach(b => b.onclick = () => openRouteSheet(+b.dataset.trackRoute));
$("#routeSheetClose").onclick = () => $("#routeSheet").classList.add("hidden");
qall("[data-route-mode]").forEach(b => b.onclick = () => {
  const r = effectiveRoute(project, routingTrack);
  r.mode = b.dataset.routeMode;
  if (r.mode === "main") r.destinations = ["main-output"];
  qall("[data-route-mode]").forEach(x => x.classList.toggle("active", x === b));
  updateRouteButtons();
});
$("#routeDestinations").addEventListener("change", () => {
  const ids = qall("#routeDestinations [data-route-dest]:checked").map(x => x.dataset.routeDest);
  const r = effectiveRoute(project, routingTrack);
  if (r.mode === "main") r.destinations = ["main-output"];
  else r.destinations = ids.length ? ids : ["main-output"];
  updateRouteButtons();
  autosave();
  log(`Routage piste ${routingTrack + 1} · ${ROUTE_MODES[r.mode]} · ${r.destinations.join(", ")}`);
});

// Version badge
const badge = document.querySelector(".badge");
if (badge) badge.textContent = `v${APP_VERSION}`;
document.title = `${APP_NAME} — ${APP_VERSION}`;

ensureRouting(project);
ensureEdges();
updateRouteButtons();
buildLibrary();

let generalPrefs = { restoreAutosave: true, loadDemo: true };
try { generalPrefs = { ...generalPrefs, ...JSON.parse(localStorage.getItem("nvd.general") || "{}") }; } catch { /* */ }

let recoveredFromCrash = false;
try {
  const crash = loadCrashRecovery();
  if (crash && generalPrefs.restoreAutosave !== false) {
    project = validateProject(crash);
    recoveredFromCrash = true;
    clearCrashRecovery();
    log("Recovery crash · projet restauré (cvd.crash-recovery)");
  }
} catch (e) {
  log(`Recovery crash · ${e.message || e}`);
}

const autosaved = localStorage.getItem("cvd.autosave");
if (!recoveredFromCrash && generalPrefs.restoreAutosave !== false && autosaved) {
  try {
    const opened = openProject(JSON.parse(autosaved));
    project = opened.project;
    log(opened.changed ? `Autosave restaurée · migration ${opened.migratedFrom}→${opened.migratedTo}` : "Autosave restaurée");
  } catch { /* */ }
}
try {
  const session = loadSession();
  if (session.lastProjectName) log(`Session · dernier projet « ${session.lastProjectName} »`);
  if (session.remoteCamera?.room) log(`Session · Remote Camera connu ${session.remoteCamera.room} · ${session.remoteCamera.lastStatus || LINK_STATES.KNOWN}`);
} catch { /* */ }
if (project.nodes.length === 0 && generalPrefs.loadDemo !== false) {
  project = createDemoProject();
  log("Démo Baleine interactive initialisée · aucune permission requise");
}
redraw();
history.clear();
commitHistory();
runtime.play();
syncPlayButton();
log(`${BUILD_LABEL} · moteur graphe actif`);
window.__nvdSelfTest = () => nestedBoxSelfTest();
let remoteRevision = 0;
let remoteSession = null;
let applyingRemote = false;
let companionLayout = null;
try { companionLayout = loadCompanionLayout() || ensureCompanionLayout(); } catch { companionLayout = null; }
let companionMonitorTimer = null;
let companionMonitorClientId = "";
let companionMonitorPeer = null;
let companionMonitorCall = null;
let companionMonitorStream = null;
const companionMonitorCanvas = document.createElement("canvas");

function publishHostState() {
  if (!remoteSession?.online || applyingRemote) return;
  remoteRevision += 1;
  remoteSession.pushState({ revision: remoteRevision, project });
}

function hideCompanionDetect() {
  $("#companionDetect")?.classList.add("hidden");
}

function sendCompanionLayout(clientId = "") {
  if (!remoteSession?.online || !companionLayout) return false;
  remoteSession.send({
    type: STUDIO_MSG.LAYOUT,
    layout: companionLayout,
    clientId: clientId || undefined,
    revision: Date.now(),
    t: Date.now()
  });
  return true;
}

function stopCompanionMonitor({ notify = true } = {}) {
  if (companionMonitorTimer) clearInterval(companionMonitorTimer);
  companionMonitorTimer = null;
  try { companionMonitorCall?.close?.(); } catch { /* */ }
  companionMonitorCall = null;
  try { companionMonitorPeer?.destroy?.(); } catch { /* */ }
  companionMonitorPeer = null;
  companionMonitorStream?.getTracks?.().forEach(track => {
    try { track.stop(); } catch { /* */ }
  });
  companionMonitorStream = null;
  const target = companionMonitorClientId;
  companionMonitorClientId = "";
  if (notify && target && remoteSession?.online) {
    remoteSession.send({ type: STUDIO_MSG.MONITOR_STOP, clientId: target, t: Date.now() });
  }
  if (target) log(`Companion Monitor · STOP · ${target}`);
}

function startCompanionMonitorJpeg(clientId, source) {
  remoteSession?.send?.({
    type: STUDIO_MSG.MONITOR_START,
    clientId,
    mode: "jpeg",
    width: 480,
    fps: 8,
    codec: "jpeg-dataurl",
    t: Date.now()
  });
  const push = () => {
    if (!remoteSession?.online || !companionMonitorClientId || document.hidden) return;
    try {
      const width = 480;
      const aspect = (source.height || 720) / Math.max(1, source.width || 1280);
      const height = Math.max(180, Math.round(width * aspect));
      if (companionMonitorCanvas.width !== width) companionMonitorCanvas.width = width;
      if (companionMonitorCanvas.height !== height) companionMonitorCanvas.height = height;
      const ctx = companionMonitorCanvas.getContext("2d", { alpha: false });
      ctx.drawImage(source, 0, 0, width, height);
      const frame = companionMonitorCanvas.toDataURL("image/jpeg", 0.52);
      remoteSession.send({
        type: STUDIO_MSG.MONITOR_FRAME,
        clientId: companionMonitorClientId,
        frame,
        width,
        height,
        sentAt: Date.now()
      });
    } catch (e) {
      log(`Companion Monitor · ${e?.message || e}`);
    }
  };
  push();
  companionMonitorTimer = setInterval(push, 125);
  log(`Companion Monitor · JPEG fallback · ${clientId} · 480p/8fps`);
}

function startCompanionMonitor(clientId = "", peerId = "") {
  if (!clientId) return log("Companion Monitor · client inconnu");
  stopCompanionMonitor({ notify: false });
  companionMonitorClientId = clientId;
  const source = $("#previewCanvas");
  if (!source) return log("Companion Monitor · preview absente");

  const canWebRtc = !!peerId && !!window.Peer && typeof source.captureStream === "function";
  if (canWebRtc) {
    try {
      companionMonitorStream = source.captureStream(30);
      companionMonitorStream.getVideoTracks().forEach(track => {
        try { track.contentHint = "motion"; } catch { /* */ }
      });
      companionMonitorPeer = new window.Peer();
      companionMonitorPeer.on("open", () => {
        companionMonitorCall = companionMonitorPeer.call(peerId, companionMonitorStream, {
          metadata: { nvdMonitor: "webrtc-direct", clientId }
        });
        companionMonitorCall.on("close", () => {
          if (companionMonitorClientId === clientId) {
            log("Companion Monitor · WebRTC fermé · fallback JPEG");
            startCompanionMonitorJpeg(clientId, source);
          }
        });
        companionMonitorCall.on("error", () => {
          if (companionMonitorClientId === clientId) {
            log("Companion Monitor · WebRTC erreur · fallback JPEG");
            startCompanionMonitorJpeg(clientId, source);
          }
        });
        remoteSession?.send?.({
          type: STUDIO_MSG.MONITOR_START,
          clientId,
          mode: "webrtc",
          peerId,
          fps: 30,
          t: Date.now()
        });
        log(`Companion Monitor · WebRTC direct · ${clientId} · 30fps cible`);
      });
      companionMonitorPeer.on("error", () => {
        if (companionMonitorClientId === clientId) startCompanionMonitorJpeg(clientId, source);
      });
      return;
    } catch (e) {
      log(`Companion Monitor · WebRTC indisponible · ${e?.message || e}`);
    }
  }
  startCompanionMonitorJpeg(clientId, source);
}

function showCompanionDetect(payload = {}) {
  const pref = loadDetectPref();
  if (pref === DETECT_ACTIONS.IGNORE) {
    log(`Companion · détecté (${payload.clientId || "?"}) · ignoré (préférence)`);
    return;
  }
  const banner = $("#companionDetect");
  const text = $("#companionDetectText");
  if (!banner || !text) {
    log(formatDetectBanner({ name: payload.clientId || "Companion" }));
    return;
  }
  text.textContent = formatDetectBanner({
    name: payload.clientId || "Companion Studio",
    transport: "LAN"
  });
  banner.dataset.clientId = payload.clientId || "";
  banner.classList.remove("hidden");
}

function handleCompanionStudioMessage(msg) {
  if (!msg?.type) return;
  if (msg.type === STUDIO_MSG.DETECT) {
    showCompanionDetect(msg);
    log(`Companion Studio · détecté · ${msg.clientId || "?"}`);
    if (companionLayout) sendCompanionLayout(msg.clientId || "");
    return;
  }
  if (msg.type === STUDIO_MSG.LAYOUT) {
    try {
      companionLayout = validateCompanionDocument(msg.layout);
      saveCompanionLayout(companionLayout);
      remoteSession?.send?.({
        type: STUDIO_MSG.LAYOUT_ACK,
        clientId: msg.clientId,
        revision: msg.revision || Date.now(),
        ok: true,
        t: Date.now()
      });
      log(`Companion · layout synchronisé · ${companionLayout.name}`);
    } catch (e) {
      remoteSession?.send?.({
        type: STUDIO_MSG.LAYOUT_ACK,
        clientId: msg.clientId,
        revision: msg.revision || Date.now(),
        ok: false,
        error: e?.message || String(e),
        t: Date.now()
      });
      log(`Companion · layout refusé · ${e?.message || e}`);
    }
    return;
  }
  if (msg.type === STUDIO_MSG.MONITOR_START) {
    startCompanionMonitor(msg.clientId || "", msg.peerId || "");
    return;
  }
  if (msg.type === STUDIO_MSG.MONITOR_STOP) {
    if (!msg.clientId || msg.clientId === companionMonitorClientId) stopCompanionMonitor({ notify: false });
    return;
  }
  if (msg.type === STUDIO_MSG.DISCONNECT) {
    log(`Companion · déconnecté · ${msg.clientId || "?"}`);
    if (msg.clientId && msg.clientId === companionMonitorClientId) stopCompanionMonitor({ notify: false });
    hideCompanionDetect();
    return;
  }
  if (msg.type === STUDIO_MSG.ACTION) {
    const layout = companionLayout || loadCompanionLayout() || ensureCompanionLayout();
    companionLayout = layout;
    const widget = findWidget(layout, msg.widgetId) || {
      id: msg.widgetId,
      binding: { kind: "action", action: msg.action === "press" ? "ping" : msg.action }
    };
    const feedback = applyCompanionBinding({
      widget,
      value: msg.value,
      project,
      runtime,
      applyCue,
      listCues,
      sendOsc: ({ host, port, address, args }) => {
        if (host !== "bridge" && typeof window.nvdDesktop?.sendOscUdp === "function") {
          return window.nvdDesktop.sendOscUdp({ host, port, address, args });
        }
        return devices.bridge.send({ type: "osc", target: host || "bridge", address, args });
      },
      sendArtNet: (message) => {
        if (typeof window.nvdDesktop?.sendArtNetUdp === "function") return window.nvdDesktop.sendArtNetUdp(message);
        return devices.bridge.send({ type: "artnet", ...message });
      },
      sendSacn: (message) => {
        if (typeof window.nvdDesktop?.sendSacnUdp === "function") return window.nvdDesktop.sendSacnUdp(message);
        return devices.bridge.send({ type: "sacn", ...message });
      },
      sendMidi: (outputId, data) => devices.midi.send(outputId, data),
      sendSerial: (text) => devices.serial.send(text),
      cameraControl: (action) => {
        if (action === "off" || action === "stop") runtime.stopCamera();
        else runtime.syncCameraFromProject({ request: true }).catch(e => log(`Caméra Companion · ${e?.message || e}`));
      },
      videoControl: (action) => {
        if (action === "play") runtime.play();
        else if (action === "pause") runtime.pause();
        else if (action === "stop") runtime.stop();
        else runtime.toggle();
        syncPlayButton();
      },
      onLog: (m) => log(m)
    });
    remoteSession?.send?.({ ...feedback, clientId: msg.clientId });
    if (feedback.ok) {
      autosave();
      redraw();
    }
  }
}

function startDesktopRemoteHost() {
  const params = new URLSearchParams(location.search);
  const query = params.get("remoteHost");
  const electron = window.nvdDesktop?.runtime === "electron";
  // Always allow ?companionHost=1 or electron; also enable with remoteHost
  if (!query && !electron && params.get("companionHost") !== "1") return;
  const url = query && query.startsWith("ws") ? query : `ws://127.0.0.1:${window.nvdDesktop?.remotePort || REMOTE_PORT}`;
  remoteSession = connectRemote({
    url,
    role: "host",
    clientId: "desktop",
    getState: () => ({ revision: remoteRevision, project }),
    setState: ({ revision, project: next }) => {
      applyingRemote = true;
      remoteRevision = revision ?? remoteRevision;
      try {
        historySuspended = true;
        project = validateProject(next);
        graphPath = [];
        redraw();
        const transport = project.meta?.transport;
        if (transport?.action === "go" && typeof transport.start === "number") {
          runtime.time = transport.start;
          runtime.play();
          syncPlayButton();
        }
      } finally {
        historySuspended = false;
        applyingRemote = false;
      }
    },
    onStatus: (s) => log(`Distant · ${s.state}${s.detail ? " · " + s.detail : ""}`),
    onLog: (m) => log(`Distant · ${m}`),
    onMessage: handleCompanionStudioMessage
  });
  log(`Companion host · écoute ${url}`);
}
startDesktopRemoteHost();

$("#companionDetect")?.querySelectorAll("[data-detect]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.detect;
    rememberDetectPref(action);
    const clientId = $("#companionDetect")?.dataset.clientId || "";
    if (action === DETECT_ACTIONS.OPEN_STUDIO) {
      window.open("http://127.0.0.1:4177/studio/", "_blank", "noopener");
      log("Companion · Open Studio");
    } else if (action === DETECT_ACTIONS.SYNC) {
      if (sendCompanionLayout(clientId)) log("Companion · Sync layout envoyé");
      else log("Companion · Sync · layout ou lien manquant");
    } else if (action === DETECT_ACTIONS.MONITOR) {
      startCompanionMonitor(clientId);
    } else if (action === DETECT_ACTIONS.CONTROLLER) {
      sendCompanionLayout(clientId);
      log("Companion · Controller · layout actif");
    } else {
      log("Companion · Ignore");
    }
    hideCompanionDetect();
  });
});

try {
  const self = window.__nvdSelfTest();
  log(self.ok
    ? `Auto-test boîtes imbriquées · PASS (${self.value})`
    : `Auto-test boîtes imbriquées · ÉCHEC · ${self.error || self.value}`);
} catch (e) {
  log(`Auto-test boîtes imbriquées · ÉCHEC · ${e.message || e}`);
}
