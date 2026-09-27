import { newProject, validateProject, exportProject, createDemoProject } from "../shared/ir.js";
import { Runtime } from "../shared/runtime.js";
import { DESTINATIONS, ROUTE_MODES, ensureRouting, effectiveRoute } from "../shared/routing.js";
import { DeviceManager } from "../shared/device-manager.js";
import { portDirection, isExecutable } from "../shared/ports.js";
import { validateEdge } from "../shared/graph-engine.js";
import { runVibe, applyVibeOps, readAiConfig, saveAiConfig, assertAiProviderAllowed } from "../shared/vibe.js";
import { APP_NAME, APP_VERSION, BUILD_LABEL } from "../shared/version.js";
import { NODE_GROUPS, spec as sharedSpec } from "../shared/node-specs.js";
import { createHistory } from "../shared/history.js";
import { ensureSubGraph } from "../shared/subpatch.js";
import { sharedAudio } from "../shared/audio-engine.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let project = newProject();
let nodeSeq = 0, clipSeq = 0, pointSeq = 0, selectedNode = null;
const deviceBus = { lastMidi: null, lastSerial: null };
let graphLogThrottle = 0;
const history = createHistory(40);
let historySuspended = false;
const view = { x: 0, y: 0, scale: 1 };
let panDrag = null;
/** Pile de navigation sous-patch : [{ id, title }] */
let graphPath = [];
let pendingVibe = null;

const runtime = new Runtime($("#previewCanvas"), {
  onGraphEvent: ev => {
    if (ev.type === "camera-error") log(`ERREUR · ${ev.error}`);
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
  } else if (e.type === "bridge-message") {
    log(`BRIDGE < ${typeof e.data === "string" ? e.data : JSON.stringify(e.data).slice(0, 160)}`);
  } else if (e.type === "bridge-state") log(`BRIDGE · ${e.state}`);
  else if (e.type === "serial-state") log(`SERIAL · ${e.state}`);
  else if (e.type === "midi-state") log(`MIDI · ${e.inputs.length} IN / ${e.outputs.length} OUT`);
});

runtime.setBridgeSend(packet => {
  try { devices.bridge.send(packet); }
  catch (err) { throw err; }
});

ensureRouting(project);

/** Catalogue UI — mêmes groupes ; marque visuelle des nodes exécutables. */
const LIB = NODE_GROUPS.filter(([title]) => title !== "Mobile / device").map(([title, items]) => [title, items]);

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
  $("#libraryList").innerHTML = LIB.map(([title, items]) =>
    `<div class="lib-section"><div class="lib-title">${title}</div>${items.map(([n, t]) => {
      const ok = isExecutable(t);
      return `<div class="lib-item ${ok ? "executable" : "unavailable"}" data-add="${t}" title="${ok ? "Exécutable" : "Indisponible — représentation seule"}"><span>${n}${ok ? "" : " · indisponible"}</span><span>${ok ? "＋" : "○"}</span></div>`;
    }).join("")}</div>`
  ).join("");
  $$("[data-add]").forEach(x => x.onclick = () => addNode(x.dataset.add));
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
  if (isRootGraph() && (type === "camera" || type === "phone-camera-front" || type === "phone-camera-back")) {
    runtime.enableCamera(type === "phone-camera-front" ? "user" : "environment")
      .then(() => log("Caméra active"))
      .catch(e => log("Caméra : " + e.message));
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
  const ports = spec(n.type)[1];
  el.innerHTML = `<div class="nh">${n.title}${isExecutable(n.type) ? "" : " · ○"}</div><div class="nb">${ports.map((p, i) => {
    const dir = portDirection(n.type, i, ports.length);
    return `<div class="port port-${dir}">${dir === "in" ? `<span class="port-dot input" data-node="${n.id}" data-port-index="${i}" data-dir="in" title="Entrée ${p}"></span>` : ""}<span class="port-label">${p}</span>${dir === "out" ? `<span class="port-dot output" data-node="${n.id}" data-port-index="${i}" data-dir="out" title="Sortie ${p}"></span>` : ""}</div>`;
  }).join("")}</div>`;
  $("#patchWorld").appendChild(el);
  el.onmousedown = () => selectNode(n.id);
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

function selectNode(id) {
  selectedNode = id;
  $$(".node").forEach(n => n.classList.toggle("sel", n.dataset.id === id));
  const n = nodeById(id);
  if (!n) return;
  $("#inspectorType").textContent = n.title + (isExecutable(n.type) ? "" : " · indisponible");
  let extra = "";
  if (n.type === "shader") {
    extra += `<div class="field"><label>Intensité</label><input id="nInt" type="range" min="0" max="2" step=".01" value="${n.params.intensity ?? 1}"></div>`;
  }
  if (n.type === "osc") {
    extra += `<div class="field"><label>Host / cible</label><input id="nHost" value="${n.params.host || "bridge"}"></div>`;
    extra += `<div class="field"><label>Adresse OSC</label><input id="nAddr" value="${n.params.address || "/nvd/value"}"></div>`;
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
  if (n.type === "subpatch") {
    extra += `<p class="hint">Double-clic ou « Ouvrir sous-patch » pour éditer le graphe interne.</p>`;
  }
  $("#inspectorBody").innerHTML = `
    <div class="field"><label>Durée</label><input id="nDur" type="number" min=".1" step=".1" value="${n.params.duration}"></div>
    <div class="field"><label>Opacité</label><input id="nOpa" type="range" min="0" max="1" step=".01" value="${n.params.opacity}"></div>
    <div class="field"><label>Actif</label><select id="nEnabled"><option value="true">Oui</option><option value="false">Non</option></select></div>
    ${extra}
    <button id="toolBtn" class="smallbtn">${n.type === "subpatch" ? "Ouvrir sous-patch ↗" : "Ouvrir outil ↗"}</button>
    <button id="dupNodeBtn" class="smallbtn">Dupliquer</button>
    <button id="delNodeBtn" class="smallbtn danger">Supprimer</button>`;
  $("#nEnabled").value = String(n.params.enabled);
  $("#nDur").onchange = e => { n.params.duration = +e.target.value; autosave(); commitHistory(); };
  $("#nOpa").oninput = e => { n.params.opacity = +e.target.value; runtime.render(); autosave(); };
  $("#nEnabled").onchange = e => {
    n.params.enabled = e.target.value === "true";
    if (!n.params.enabled && (n.type === "audio" || n.type === "organicaudio" || n.type === "soundmemo")) {
      sharedAudio.release(n.id);
    }
    runtime.render();
    autosave();
    commitHistory();
  };
  if ($("#nInt")) $("#nInt").oninput = e => { n.params.intensity = +e.target.value; runtime.render(); autosave(); };
  if ($("#nHost")) $("#nHost").onchange = e => { n.params.host = e.target.value; autosave(); commitHistory(); };
  if ($("#nAddr")) $("#nAddr").onchange = e => { n.params.address = e.target.value; autosave(); commitHistory(); };
  if ($("#nFb")) $("#nFb").oninput = e => { n.params.fallback = +e.target.value; runtime.render(); autosave(); };
  if ($("#nFreq")) $("#nFreq").onchange = e => { n.params.freq = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if ($("#nGain")) $("#nGain").oninput = e => { n.params.gain = +e.target.value; runtime.render(); autosave(); };
  $("#toolBtn").onclick = () => {
    if (n.type === "subpatch") enterSubpatch(n);
    else if (!isExecutable(n.type)) log(`Outil · ${n.title} indisponible (pas de moteur)`);
    else log(`Outil · ${n.title} — paramètres dans l'inspecteur`);
  };
  $("#dupNodeBtn").onclick = () => duplicateNode(n.id);
  $("#delNodeBtn").onclick = () => deleteNode(n.id);
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
  $$(".track").forEach(t => t.innerHTML = "");
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
  try { localStorage.setItem("cvd.autosave", exportProject(project)); } catch { /* */ }
}

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

$("#saveProject").onclick = () => {
  const blob = new Blob([exportProject(project)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (project.name || "projet") + ".cvd.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  autosave();
  log("Projet enregistré");
};
$("#loadProject").onclick = () => $("#projectFile").click();
$("#projectFile").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  project = validateProject(JSON.parse(await f.text()));
  redraw();
  await runtime.syncCameraFromProject();
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
  $$("[data-pref-tab]").forEach(b => b.classList.toggle("active", b.dataset.prefTab === tab));
  $$("[data-pref-panel]").forEach(p => p.classList.toggle("hidden", p.dataset.prefPanel !== tab));
  const ai = readAiConfig();
  if ($("#aiEnabled")) $("#aiEnabled").checked = ai.enabled !== false;
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
$$("[data-pref-tab]").forEach(b => b.onclick = () => openPreferences(b.dataset.prefTab));

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

$("#aiSave")?.addEventListener("click", () => {
  const cfg = {
    enabled: $("#aiEnabled").checked,
    endpoint: $("#aiEndpoint").value.trim(),
    apiKey: $("#aiKey").value.trim(),
    model: $("#aiModel").value.trim() || "gpt-4o-mini"
  };
  const check = assertAiProviderAllowed(cfg);
  if (!check.ok) {
    log(`ERREUR · ${check.error}`);
    alert(check.error);
    return;
  }
  saveAiConfig(cfg);
  log("Préférences IA enregistrées");
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

$$(".collapse").forEach(b => b.onclick = () => b.closest(".panel").classList.toggle("collapsed"));
$("#search").oninput = e => $$(".lib-item").forEach(x => {
  x.style.display = x.textContent.toLowerCase().includes(e.target.value.toLowerCase()) ? "flex" : "none";
});
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
      await runtime.syncCameraFromProject();
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
  $$("[data-route-mode]").forEach(b => b.classList.toggle("active", b.dataset.routeMode === r.mode));
  $("#routeDestinations").innerHTML = DESTINATIONS.map(d => {
    const checked = r.destinations.includes(d.id) ? "checked" : "";
    const status = d.status === "adapter" ? "<span class='adapter'>adaptateur</span>" : d.status === "planned" ? "<small>passerelle</small>" : "<small>prêt</small>";
    return `<label class="route-dest"><input type="checkbox" data-route-dest="${d.id}" ${checked}><span>${d.label}</span>${status}</label>`;
  }).join("");
  $("#routeSheet").classList.remove("hidden");
}
document.querySelectorAll("[data-track-route]").forEach(b => b.onclick = () => openRouteSheet(+b.dataset.trackRoute));
$("#routeSheetClose").onclick = () => $("#routeSheet").classList.add("hidden");
$$("[data-route-mode]").forEach(b => b.onclick = () => {
  const r = effectiveRoute(project, routingTrack);
  r.mode = b.dataset.routeMode;
  if (r.mode === "main") r.destinations = ["main-output"];
  $$("[data-route-mode]").forEach(x => x.classList.toggle("active", x === b));
  updateRouteButtons();
});
$("#routeDestinations").addEventListener("change", () => {
  const ids = $$("#routeDestinations [data-route-dest]:checked").map(x => x.dataset.routeDest);
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

const autosaved = localStorage.getItem("cvd.autosave");
if (generalPrefs.restoreAutosave !== false && autosaved) {
  try {
    project = validateProject(JSON.parse(autosaved));
    log("Autosave restaurée");
  } catch { /* */ }
}
if (project.nodes.length === 0 && generalPrefs.loadDemo !== false) {
  project = createDemoProject();
  log("Demo P00 initialisée (caméra → shader)");
}
redraw();
history.clear();
commitHistory();
runtime.syncCameraFromProject().then(ok => {
  if (ok) log("Caméra synchronisée");
  runtime.play();
  syncPlayButton();
});
log(`${BUILD_LABEL} · moteur graphe actif`);
