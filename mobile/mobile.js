import { installSurfaceSwitcher } from "../shared/surface-switcher.js";
import { newProject, validateProject, exportProject, createDemoProject } from "../shared/ir.js";
import { NODE_GROUPS, spec } from "../shared/node-specs.js";
import { Runtime } from "../shared/runtime.js";
import { SensorBus } from "../shared/sensor-bus.js";
import { portDirection, portLabels, isExecutable } from "../shared/ports.js";
import { validateEdge } from "../shared/graph-engine.js";
import { createHistory } from "../shared/history.js";
import { runVibe, applyVibeOps, readAiConfig, saveAiConfig, assertAiProviderAllowed } from "../shared/vibe.js";
import { APP_NAME, APP_VERSION, BUILD_LABEL } from "../shared/version.js";
import { addBoxPort, ensureSubGraph, wrapNodesInSubpatch } from "../shared/subpatch.js";
import { planManualSave, saveStatusMessage } from "../shared/save-fallback.js";
import { exportMax, exportTouchDesigner, exportPureData, exportMilluminOscMap } from "../shared/exporters.js";
import { ensureRouting, effectiveRoute } from "../shared/routing.js";
import { DeviceManager } from "../shared/device-manager.js";
import { createBrowserProjectStore } from "../shared/project-store.js";
import { applyCue, listCues, nextCue, previousCue } from "../shared/stage/cues.js";
import { loadRememberedHost, rememberHost, createHostCard } from "../shared/discovery/host-card.js";
import { connectRemote } from "../shared/remote-client.js";
import { projectSignature } from "../shared/remote-protocol.js";
import { nestedBoxSelfTest } from "../shared/self-test.js";
import { shouldPromptForUpdate, shouldActivateWaitingWorker, shouldReloadAfterUpdate } from "../shared/pwa-update.js";
import { makeArtNetPacket } from "../shared/adapters/websocket-bridge.js";
import { analyzeImageFile, imageVibePrompt, imageVibeOps, imageVibeSummary } from "../shared/image-vibe.js";
import { createQuickMapSession, setQuickMapCorner, nudgeQuickMapCorner, applyQuickMapToProject, quickMapRemoteOperation } from "../shared/quick-map.js";

installSurfaceSwitcher({ current:"mobile" });

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let project = newProject();
let selected = null;
let graphPath = [];
let pan = { x: 0, y: 0, scale: 1 };
let wireDraft = null;
let armed = null;
let inspectorFor = null;
let pendingVibe = null;
let imageVibeState = { analysis:null, previewUrl:"" };
let syncedRevision = 0;
let pendingRemote = null;
let link = null;
let inflight = false;
let queuedProject = null;
let acceptUpdate = false;
const seenAlerts = new Set();
const history = createHistory(50);
let historySuspended = false;
const store = createBrowserProjectStore();
const deviceBus = { lastMidi: null, lastSerial: null };

const sensors = new SensorBus();
const runtime = new Runtime($("#stageCanvas"), {
  onGraphEvent: (ev) => {
    if (ev.type === "camera-error") pushAlert("error", `Caméra : ${ev.error}`);
  }
});
runtime.setDeviceBus(deviceBus);
runtime.setSensorBus(sensors);
const devices = new DeviceManager((e) => {
  if (e.type === "midi-in") deviceBus.lastMidi = e.message;
  if (e.type === "serial-line") deviceBus.lastSerial = e.line;
  if (e.type === "bridge-state") pushAlert(e.state === "online" ? "ok" : "error", `Passerelle · ${e.state}`);
  if (e.type === "midi-state") pushAlert("ok", `MIDI · ${e.inputs?.length || 0} entrée(s)`);
  if (e.type === "serial-state") pushAlert("ok", `Serial · ${e.state}`);
});
runtime.setBridgeSend((packet) => devices.bridge.send(packet));

$("#appVersion").textContent = `v${APP_VERSION}`;
$("#versionInfo").textContent = BUILD_LABEL;
document.title = `${APP_NAME} — ${APP_VERSION}`;

function pushAlert(level, text) {
  const msg = String(text || "").trim();
  if (!msg) return;
  const key = `${level}:${msg}`;
  if (seenAlerts.has(key)) return;
  seenAlerts.add(key);
  const el = document.createElement("div");
  el.className = `alert ${level === "ok" ? "ok" : "error"}`;
  el.textContent = msg;
  $("#alertStack").prepend(el);
  while ($("#alertStack").children.length > 6) $("#alertStack").lastElementChild.remove();
}

function screen(name) {
  $$(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === name));
  $$("[data-nav]").forEach((b) => b.classList.toggle("active", b.dataset.nav === name));
  const labels = { stage: "Plateau", patch: "Bureau", vibe: "Vibe", tools: "Outils", device: "Device" };
  $("#screenTitle").textContent = labels[name] || name;
}

function setMobileMode(mode) {
  document.body.dataset.mobileMode = mode;
  $("#mobileBureau").classList.toggle("active", mode === "bureau");
  $("#mobilePlateau").classList.toggle("active", mode === "plateau");
  localStorage.setItem("cvd.mobile.mode", mode);
  screen(mode === "plateau" ? "stage" : "patch");
}

function activeGraph() {
  let g = project;
  for (const step of graphPath) {
    const node = (g.nodes || []).find((n) => n.id === step.id);
    if (!node) break;
    g = ensureSubGraph(node);
  }
  return g;
}

function commitHistory() {
  if (!historySuspended) history.push(project);
}

function scheduleSync() {
  if (!link?.online) return;
  queuedProject = JSON.parse(JSON.stringify(project));
  flushSync();
}

function flushSync() {
  if (!link?.online || inflight || !queuedProject) return;
  const payload = queuedProject;
  queuedProject = null;
  inflight = true;
  link.sendOp({ kind: "replace-project", project: payload });
}

async function persist(manual = false) {
  try {
    await store.save(project);
    try { localStorage.setItem("cvd.autosave", exportProject(project)); } catch { /* miroir déjà tenté par le store */ }
    if (manual) {
      const plan = planManualSave({ userAgent: navigator.userAgent || "", electronRuntime: false, hasNativeSave: false });
      const fileName = `${project.name || "projet"}.cvd.json`;
      if (plan.download) {
        const blob = new Blob([exportProject(project)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.hidden = true;
        document.body.append(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1200);
      }
      const local = "Projet enregistré localement";
      pushAlert("ok", plan.download ? `${local} · fichier aussi proposé (${fileName})` : `${local}. ${saveStatusMessage(plan, fileName)}`);
    }
  } catch (e) {
    pushAlert("error", `Sauvegarde impossible · ${e.message || e}`);
  }
}

function changed() {
  commitHistory();
  persist(false);
  scheduleSync();
  refresh({ keepInspector: true });
}

function updateLiveValues() {
  const lines = [];
  const outputs = runtime.lastGraph?.outputs;
  const walk = (nodes, prefix = "") => {
    for (const n of nodes || []) {
      const bag = outputs?.get(n.id);
      if (bag) {
        for (const [port, val] of bag) {
          if (val?.kind === "number" && typeof val.value === "number") {
            lines.push(`${prefix}${n.title}.${port}=${val.value}`);
          }
        }
      }
    }
  };
  walk(project.nodes);
  const text = lines.join(" · ") || "Aucune valeur";
  $("#liveValues").textContent = text;
  $("#patchValues").textContent = text;
}

function updateGraphErrors() {
  const errors = runtime.lastGraph?.errors || [];
  const warnings = runtime.lastGraph?.warnings || [];
  const lines = [...errors.map((e) => `ERREUR · ${e}`), ...warnings.map((w) => `ATTENTION · ${w}`)];
  const box = $("#graphErrors");
  if (!lines.length) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  box.hidden = false;
  box.textContent = lines.join("\n");
}

function renderSensorReadout() {
  const snap = sensors.snapshot();
  const lines = Object.entries(snap).map(([key, reading]) => {
    if (!reading || reading.available === false) return `${key} — ${reading?.error || "indisponible"}`;
    if (reading.value == null) return `${key} — en attente d'une mesure réelle`;
    const extra = reading.detailError ? ` — ${reading.detailError}` : "";
    return `${key} — ${JSON.stringify(reading.value)}${extra}`;
  });
  $("#sensorReadout").textContent = lines.join("\n") || "Aucune lecture.";
  const live = Object.values(snap).filter((r) => r?.available !== false && r?.value != null);
  const denied = Object.values(snap).filter((r) => r && r.available === false);
  $("#sensorStatus").textContent = live.length ? `${live.length} mesure(s)` : denied.length ? `${denied.length} indisponible(s)` : "en attente";
}

let announcedMic = "";
sensors.subscribe(() => {
  renderSensorReadout();
  const mic = sensors.get("phone-mic");
  if (mic?.available === false && mic.error && mic.error !== announcedMic) {
    announcedMic = mic.error;
    pushAlert("error", mic.error);
  }
  if (mic?.available === true && announcedMic !== "live") {
    announcedMic = "live";
    screen("stage");
    runtime.play();
  }
  runtime.render();
  updateLiveValues();
  updateGraphErrors();
});
window.addEventListener("online", () => { sensors.refreshNetwork(); pushAlert("ok", "Réseau navigateur rétabli"); });
window.addEventListener("offline", () => { sensors.refreshNetwork(); pushAlert("error", "Perte réseau navigateur"); });

function applyTransform() {
  $("#patchWorld").style.transform = `translate(${pan.x}px,${pan.y}px) scale(${pan.scale})`;
}

function setZoom(next) {
  pan.scale = Math.max(0.35, Math.min(2.2, next));
  applyTransform();
}

function renderNodeList(filter = "") {
  const q = filter.toLowerCase();
  $("#nodeList").innerHTML = NODE_GROUPS.map(([group, items]) => {
    const buttons = items.filter(([name, type]) => `${name} ${type}`.toLowerCase().includes(q)).map(([name, type]) => {
      const ok = isExecutable(type);
      return `<button type="button" data-type="${type}">${name}${ok ? "" : " <small>· indisponible</small>"}</button>`;
    }).join("");
    return buttons ? `<h3>${group}</h3>${buttons}` : "";
  }).join("");
  $("#nodeList").querySelectorAll("[data-type]").forEach((b) => {
    b.onclick = () => {
      createNode(b.dataset.type);
      $("#nodeSheet").classList.add("hidden");
    };
  });
}

function insertNode(type, x, y) {
  const g = activeGraph();
  const seq = g.nodes.reduce((m, n) => Math.max(m, parseInt(String(n.id).replace(/\D/g, ""), 10) || 0), 0) + 1;
  const [title] = spec(type);
  const slot = g.nodes.length;
  const n = {
    id: `n${seq}`,
    type,
    title,
    x: x ?? 16 + (slot % 3) * 210,
    y: y ?? 16 + Math.floor(slot / 3) * 150,
    params: { enabled: true, duration: 5, opacity: 1, intensity: 1, value: type === "number" ? 1 : 0, freq: 220, gain: 0.15, mode: "tone", host: "bridge", address: "/nvd/value", fallback: 0 }
  };
  if (type === "subpatch") ensureSubGraph(n);
  g.nodes.push(n);
  selected = n.id;
  inspectorFor = null;
  if (!isExecutable(type)) pushAlert("error", `Node « ${title} » indisponible : pas encore câblé au moteur`);
  refresh();
  if (!graphPath.length && (type === "camera" || type === "phone-camera-front" || type === "phone-camera-back")) {
    const facing = type === "phone-camera-front" ? "user" : "environment";
    runtime.enableCamera(facing).catch((e) => pushAlert("error", `Caméra : ${e.message || e}`));
  }
  return n;
}

function createNode(type, x, y) {
  const n = insertNode(type, x, y);
  changed();
  return n;
}

function nodeById(id, g = activeGraph()) {
  return (g.nodes || []).find((n) => n.id === id);
}

function portCenter(dot) {
  const world = $("#patchWorld");
  const wr = world.getBoundingClientRect();
  const r = dot.getBoundingClientRect();
  const s = pan.scale || 1;
  return { x: (r.left - wr.left + r.width / 2) / s, y: (r.top - wr.top + r.height / 2) / s };
}

function edgePath(a, b) {
  const span = Math.max(48, Math.abs(b.x - a.x) * 0.45);
  const dir = b.x >= a.x ? 1 : -1;
  return `M ${a.x} ${a.y} C ${a.x + span * dir} ${a.y}, ${b.x - span * dir} ${b.y}, ${b.x} ${b.y}`;
}

function ensureWireLayer() {
  let svg = $("#wireLayer");
  if (svg) return svg;
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "wireLayer";
  svg.setAttribute("class", "patch-wires");
  svg.innerHTML = `<g id="wirePaths"></g><path id="wireDraftPath" class="wire draft" d=""></path>`;
  $("#patchWorld").prepend(svg);
  return svg;
}

function renderWires() {
  const g = activeGraph();
  g.edges ||= [];
  const svg = ensureWireLayer();
  svg.setAttribute("width", "1800");
  svg.setAttribute("height", "1200");
  const group = $("#wirePaths");
  group.innerHTML = "";
  for (const edge of g.edges) {
    const from = document.querySelector(`.port-dot[data-node="${edge.from.node}"][data-port-index="${edge.from.port}"][data-dir="out"]`);
    const to = document.querySelector(`.port-dot[data-node="${edge.to.node}"][data-port-index="${edge.to.port}"][data-dir="in"]`);
    if (!from || !to) continue;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("wire");
    const v = validateEdge({ nodes: g.nodes, edges: g.edges }, edge.from, edge.to);
    if (!v.ok) path.classList.add("invalid");
    path.setAttribute("d", edgePath(portCenter(from), portCenter(to)));
    group.appendChild(path);
  }
}

function connectPorts(from, to) {
  if (!from || !to || from.dir === to.dir) {
    pushAlert("error", "Connexion incomplète");
    return;
  }
  const a = from.dir === "out" ? from : to;
  const b = from.dir === "in" ? from : to;
  const src = { node: a.node, port: a.port };
  const dst = { node: b.node, port: b.port };
  if (src.node === dst.node) {
    pushAlert("error", "Impossible de connecter un node à lui-même");
    return;
  }
  const g = activeGraph();
  const v = validateEdge({ nodes: g.nodes, edges: g.edges || [] }, src, dst);
  if (!v.ok) {
    pushAlert("error", v.errors.join(" · "));
    return;
  }
  g.edges = (g.edges || []).filter((e) => !(e.to.node === dst.node && e.to.port === dst.port));
  g.edges.push({ id: `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from: src, to: dst });
  refresh();
  changed();
}

function armPort(dot) {
  const info = { node: dot.dataset.node, port: +dot.dataset.portIndex, dir: dot.dataset.dir, dot };
  if (!armed) {
    armed = info;
    dot.classList.add("armed");
    return;
  }
  const start = armed;
  clearArmed();
  if (start.node === info.node && start.port === info.port && start.dir === info.dir) return;
  connectPorts(start, info);
}

function clearArmed() {
  armed = null;
  $$(".port-dot.armed").forEach((d) => d.classList.remove("armed"));
}

function drawNode(n) {
  const el = document.createElement("div");
  el.className = `mnode${isExecutable(n.type) ? "" : " unavailable"}${n.id === selected ? " sel" : ""}`;
  el.dataset.id = n.id;
  el.style.left = `${n.x}px`;
  el.style.top = `${n.y}px`;
  const ports = portLabels(n.type, n) || spec(n.type)[1];
  el.innerHTML = `<h4>${n.title}${isExecutable(n.type) ? "" : " · ○"}</h4><div class="ports">${ports.map((p, i) => {
    const dir = portDirection(n.type, i, ports.length, n);
    const dot = `<span class="port-dot ${dir === "in" ? "input" : "output"}" data-node="${n.id}" data-port-index="${i}" data-dir="${dir}"></span>`;
    return `<div class="port port-${dir}">${dir === "in" ? dot : ""}<span>${p}</span>${dir === "out" ? dot : ""}</div>`;
  }).join("")}</div>`;
  $("#patchWorld").appendChild(el);
  const head = el.querySelector("h4");
  let drag = null;
  head.addEventListener("pointerdown", (e) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: n.x, oy: n.y, moved: false };
    head.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  head.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
    n.x = Math.max(0, drag.ox + (e.clientX - drag.x) / pan.scale);
    n.y = Math.max(0, drag.oy + (e.clientY - drag.y) / pan.scale);
    el.style.left = `${n.x}px`;
    el.style.top = `${n.y}px`;
    renderWires();
  });
  head.addEventListener("pointerup", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = drag.moved;
    drag = null;
    selected = n.id;
    $$(".mnode").forEach((node) => node.classList.toggle("sel", node.dataset.id === n.id));
    if (moved) changed();
    else {
      inspectorFor = null;
      renderInspector();
      $("#inspectorSheet").classList.remove("hidden");
    }
  });
  head.addEventListener("dblclick", () => { if (n.type === "subpatch") enterSubpatch(n); });
  el.querySelectorAll(".port-dot").forEach((dot) => {
    let start = null;
    dot.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      start = { x: e.clientX, y: e.clientY };
      wireDraft = { dot };
      const p = portCenter(dot);
      $("#wireDraftPath")?.setAttribute("d", edgePath(p, p));
    });
    dot.addEventListener("pointermove", (e) => {
      if (!wireDraft || wireDraft.dot !== dot) return;
      const world = $("#patchWorld").getBoundingClientRect();
      const a = portCenter(dot);
      const b = { x: (e.clientX - world.left) / pan.scale, y: (e.clientY - world.top) / pan.scale };
      $("#wireDraftPath")?.setAttribute("d", edgePath(a, b));
    });
    dot.addEventListener("pointerup", (e) => {
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8;
      start = null;
      wireDraft = null;
      $("#wireDraftPath")?.setAttribute("d", "");
      if (!moved) {
        armPort(dot);
        return;
      }
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const target = under?.closest?.(".port-dot");
      if (!target || target === dot) return;
      connectPorts(
        { node: dot.dataset.node, port: +dot.dataset.portIndex, dir: dot.dataset.dir },
        { node: target.dataset.node, port: +target.dataset.portIndex, dir: target.dataset.dir }
      );
    });
  });
}

function renderBreadcrumb() {
  const parts = [{ title: "Racine" }, ...graphPath];
  $("#graphPath").innerHTML = parts.map((p, i) => `<button type="button" data-crumb="${i}">${p.title || p.id}</button>`).join("<span>/</span>");
  $("#graphPath").querySelectorAll("[data-crumb]").forEach((b) => {
    b.onclick = () => {
      graphPath = graphPath.slice(0, Math.max(0, +b.dataset.crumb));
      selected = null;
      inspectorFor = null;
      refresh();
    };
  });
}

function enterSubpatch(node) {
  if (!node || node.type !== "subpatch") return;
  ensureSubGraph(node);
  graphPath.push({ id: node.id, title: node.title || "Sous-patch" });
  selected = null;
  inspectorFor = null;
  refresh();
}

function renderInspector() {
  const body = $("#inspectorBody");
  if (!selected) {
    $("#inspectorSheet").classList.add("hidden");
    inspectorFor = null;
    return;
  }
  if (inspectorFor === selected && body.contains(document.activeElement)) return;
  const n = nodeById(selected);
  if (!n) return;
  inspectorFor = selected;
  $("#inspectorTitle").textContent = `${n.title}${isExecutable(n.type) ? "" : " · indisponible"}`;
  const field = (label, id, value, type = "text") => `<label>${label}<input id="${id}" type="${type}" value="${value ?? ""}"></label>`;
  let extra = "";
  if (n.type === "number") extra += field("Valeur", "paramValue", n.params.value ?? 0, "number");
  if (n.type === "shader") extra += field("Intensité", "paramIntensity", n.params.intensity ?? 1, "number");
  if (n.type === "osc") {
    extra += field("Hôte", "paramHost", n.params.host || "bridge");
    extra += field("Adresse", "paramAddress", n.params.address || "/nvd/value");
  }
  if (n.type === "dmx") {
    extra += field("Univers", "paramUniverse", n.params.universe ?? 0, "number");
    extra += field("Canal", "paramChannel", n.params.address ?? 1, "number");
    extra += field("Valeur", "paramDmx", n.params.value ?? 0, "number");
  }
  if (n.type === "audio" || n.type === "organicaudio" || n.type === "phone-mic") {
    extra += `<label>Mode<select id="paramMode"><option value="tone">tone</option><option value="mic">micro</option></select></label>`;
    extra += field("Fréquence", "paramFreq", n.params.freq ?? 220, "number");
  }
  if (n.type === "boolean") extra += `<label>Valeur<select id="paramBool"><option value="false">Faux</option><option value="true">Vrai</option></select></label>`;
  if (n.type === "text") extra += field("Texte", "paramText", n.params.text || "");
  if (n.type === "compare") extra += `<label>Opérateur<select id="paramOp"><option>&gt;</option><option>&lt;</option><option>==</option><option>&gt;=</option><option>&lt;=</option><option>!=</option></select></label>`;
  if (n.type === "smooth") extra += field("Lissage", "paramSmooth", n.params.amount ?? 0.18, "number");
  if (n.type === "subpatch") {
    extra += `<button type="button" id="openSubpatch">Ouvrir le sous-patch</button>`;
    extra += `<button type="button" id="addInPort">＋ entrée</button><button type="button" id="addOutPort">＋ sortie</button>`;
  }
  extra += `<button type="button" id="wrapNode">Mettre dans une boîte</button>`;
  body.innerHTML = `
    ${field("Durée", "paramDuration", n.params.duration ?? 5, "number")}
    <label>Actif<select id="paramEnabled"><option value="true">Oui</option><option value="false">Non</option></select></label>
    ${extra}
    <p class="hint">${isExecutable(n.type) ? "Node câblé au moteur partagé." : "Ce node n’a pas de processeur : il ne produit rien."}</p>`;
  const enabled = $("#paramEnabled");
  enabled.value = String(n.params.enabled !== false);
  const bind = (id, key, numeric = false) => {
    const input = $(`#${id}`);
    if (!input) return;
    const apply = () => {
      n.params[key] = numeric ? Number(input.value) : input.value;
      runtime.render();
      updateLiveValues();
      updateGraphErrors();
      persist(false);
      scheduleSync();
    };
    input.oninput = apply;
    input.onchange = () => { apply(); commitHistory(); };
  };
  bind("paramDuration", "duration", true);
  bind("paramValue", "value", true);
  bind("paramIntensity", "intensity", true);
  bind("paramHost", "host", false);
  bind("paramAddress", "address", false);
  bind("paramUniverse", "universe", true);
  bind("paramChannel", "address", true);
  bind("paramDmx", "value", true);
  bind("paramFreq", "freq", true);
  enabled.onchange = () => {
    n.params.enabled = enabled.value === "true";
    runtime.render();
    updateGraphErrors();
    changed();
  };
  if ($("#paramMode")) {
    $("#paramMode").value = n.params.mode || "tone";
    $("#paramMode").onchange = () => { n.params.mode = $("#paramMode").value; changed(); };
  }
  if ($("#paramBool")) {
    $("#paramBool").value = String(n.params.value === true || n.params.value === "true");
    $("#paramBool").onchange = () => { n.params.value = $("#paramBool").value === "true"; changed(); };
  }
  if ($("#paramText")) $("#paramText").onchange = () => { n.params.text = $("#paramText").value; changed(); };
  if ($("#paramOp")) {
    $("#paramOp").value = n.params.operator || ">";
    $("#paramOp").onchange = () => { n.params.operator = $("#paramOp").value; changed(); };
  }
  bind("paramSmooth", "amount", true);
  if ($("#openSubpatch")) $("#openSubpatch").onclick = () => { $("#inspectorSheet").classList.add("hidden"); enterSubpatch(n); };
  const addPort = (direction) => {
    const name = prompt(direction === "in" ? "Nom de l'entrée" : "Nom de la sortie", direction === "in" ? "In" : "Out");
    if (!name) return;
    addBoxPort(n, direction, name, "any");
    inspectorFor = null;
    refresh();
    changed();
  };
  if ($("#addInPort")) $("#addInPort").onclick = () => addPort("in");
  if ($("#addOutPort")) $("#addOutPort").onclick = () => addPort("out");
  if ($("#wrapNode")) $("#wrapNode").onclick = () => {
    const g = activeGraph();
    const box = wrapNodesInSubpatch(g, [n.id], "Boîte");
    selected = box.id;
    inspectorFor = null;
    refresh();
    changed();
  };
  $("#inspectorSheet").classList.remove("hidden");
}

function renderTimeline() {
  const host = $("#timelineList");
  host.innerHTML = "";
  for (const clip of project.timeline || []) {
    const row = document.createElement("div");
    row.className = "clip-row";
    row.innerHTML = `<b>${clip.kind || "clip"}</b><span>${clip.label || clip.id} · ${clip.start}s / ${clip.duration}s</span><button type="button">GO</button>`;
    row.querySelector("button").onclick = () => fireCue(clip);
    host.appendChild(row);
  }
  if (!project.timeline?.length) host.innerHTML = `<p class="hint">Aucun clip. Ajoute un cue pour le plateau.</p>`;
}

function renderCues() {
  const cues = (project.timeline || []).filter((c) => c.kind === "cue");
  const host = $("#cueList");
  if (!cues.length) {
    host.innerHTML = `<p class="hint">Aucun cue. Ajoute-en un dans le bureau.</p>`;
    return;
  }
  host.innerHTML = "";
  cues.forEach((cue) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = cue.label || cue.id;
    b.onclick = () => fireCue(cue);
    host.appendChild(b);
  });
}

function fireCue(cue) {
  if (!cue) {
    pushAlert("error", "Aucun cue dans la timeline");
    return;
  }
  const result = applyCue(project, {
    id: cue.id,
    label: cue.label,
    time: cue.start,
    actions: cue.actions || [{ type: "jump-time", value: cue.start }]
  });
  project = result.project;
  for (const effect of result.effects) {
    if (effect.type === "error") pushAlert("error", effect.error);
    if (effect.type === "jump-time" || effect.type === "go") runtime.time = Number(effect.time ?? cue.start) || 0;
  }
  project.meta = project.meta || {};
  project.meta.transport = { action: "go", cueId: cue.id, start: cue.start, label: cue.label || cue.id };
  runtime.setProject(project);
  runtime.play();
  $("#runtimeStatus").textContent = `GO ${cue.label || cue.id}`;
  const haptic = sensors.vibrate(30);
  if (!haptic.ok) pushAlert("error", haptic.error);
  changed();
}

function fireNextCue() {
  const cues = listCues(project);
  const current = project.meta?.transport?.cueId;
  const cue = nextCue(cues, current);
  if (!cue) {
    pushAlert("error", "Pas de cue suivant");
    return;
  }
  fireCue({ id: cue.id, label: cue.label, start: cue.time, actions: cue.actions });
}

function firePrevCue() {
  const cues = listCues(project);
  const current = project.meta?.transport?.cueId;
  const cue = previousCue(cues, current);
  if (!cue) {
    pushAlert("error", "Pas de cue précédent");
    return;
  }
  fireCue({ id: cue.id, label: cue.label, start: cue.time, actions: cue.actions });
}

function renderBreadcrumbAndPatch() {
  const world = $("#patchWorld");
  const keep = world.querySelector("#wireLayer");
  world.innerHTML = "";
  if (keep) world.appendChild(keep);
  ensureWireLayer();
  for (const n of activeGraph().nodes || []) drawNode(n);
  renderBreadcrumb();
  applyTransform();
  requestAnimationFrame(renderWires);
}

function refresh() {
  ensureRouting(project);
  $("#projectName").value = project.name || "";
  renderBreadcrumbAndPatch();
  renderTimeline();
  renderCues();
  renderInspector();
  if (!graphPath.length) runtime.setProject(project);
  else runtime.render();
  updateLiveValues();
  updateGraphErrors();
}

function deleteSelected() {
  if (!selected) return;
  const g = activeGraph();
  g.nodes = g.nodes.filter((n) => n.id !== selected);
  g.edges = (g.edges || []).filter((e) => e.from.node !== selected && e.to.node !== selected);
  selected = null;
  inspectorFor = null;
  refresh();
  changed();
}

function duplicateSelected() {
  const src = nodeById(selected);
  if (!src) return;
  const copy = insertNode(src.type, src.x + 28, src.y + 28);
  copy.params = JSON.parse(JSON.stringify(src.params));
  copy.title = src.title;
  refresh();
  changed();
}

function undo() {
  const snap = history.undo();
  if (!snap) {
    pushAlert("error", "Undo · rien à annuler");
    return;
  }
  historySuspended = true;
  project = validateProject(snap);
  graphPath = [];
  selected = null;
  inspectorFor = null;
  refresh();
  historySuspended = false;
  persist(false);
  scheduleSync();
}

function redo() {
  const snap = history.redo();
  if (!snap) {
    pushAlert("error", "Redo · rien à rétablir");
    return;
  }
  historySuspended = true;
  project = validateProject(snap);
  graphPath = [];
  selected = null;
  inspectorFor = null;
  refresh();
  historySuspended = false;
  persist(false);
  scheduleSync();
}

function adoptRemote(next) {
  historySuspended = true;
  project = validateProject(JSON.parse(JSON.stringify(next)));
  graphPath = [];
  selected = null;
  inspectorFor = null;
  refresh();
  const transport = project.meta?.transport;
  if (transport?.action === "go" && typeof transport.start === "number") {
    runtime.time = transport.start;
    runtime.play();
    $("#runtimeStatus").textContent = `GO ${transport.label || ""}`;
  }
  historySuspended = false;
  commitHistory();
  persist(false);
}

function setRemoteStatus(state, detail) {
  const el = $("#remoteStatus");
  const dot = $("#netDot");
  dot.className = `net-dot ${state}`;
  const labels = {
    offline: "hors ligne",
    connecting: "connexion…",
    online: detail ? (/connecté/i.test(detail) ? detail : `connecté · ${detail}`) : "connecté",
    lost: detail || "perte réseau",
    error: detail || "erreur réseau",
    conflict: detail || "conflit"
  };
  el.textContent = labels[state] || detail || state;
}

function remoteLog(line) {
  const el = $("#remoteLog");
  el.textContent = `${el.textContent}\n${line}`.trim();
  el.scrollTop = el.scrollHeight;
}

function connectRemoteUi() {
  const url = $("#remoteUrl").value.trim();
  if (!url) {
    pushAlert("error", "URL WebSocket manquante");
    return;
  }
  try {
    const parsed = new URL(url);
    rememberHost(localStorage, createHostCard({
      host: parsed.hostname,
      port: Number(parsed.port || 4174),
      name: "No-de hôte"
    }));
  } catch {
    /* URL invalide : connectRemote échouera clairement */
  }
  link?.close();
  inflight = false;
  link = connectRemote({
    url,
    role: "remote",
    clientId: `mobile-${Date.now()}`,
    getState: () => ({ revision: syncedRevision, project }),
    setState: ({ revision, project: next, conflict }) => {
      syncedRevision = revision ?? syncedRevision;
      inflight = false;
      if (conflict) {
        adoptRemote(next);
        const detail = "Conflit de révision";
        setRemoteStatus("conflict", detail);
        return { holdStatus: true, state: "conflict", detail };
      }
      if (projectSignature(next) === projectSignature(project)) {
        setRemoteStatus("online", `connecté · révision ${syncedRevision}`);
        flushSync();
        return;
      }
      if ($("#remoteFollow").checked) {
        adoptRemote(next);
        setRemoteStatus("online", `connecté · révision ${syncedRevision}`);
        return;
      }
      pendingRemote = next;
      const detail = `Conflit : le projet distant diffère (révision ${syncedRevision})`;
      setRemoteStatus("conflict", detail);
      pushAlert("error", "Conflit : le projet distant diffère du projet local.");
      return { holdStatus: true, state: "conflict", detail };
    },
    onStatus: ({ state, detail }) => setRemoteStatus(state, detail),
    onLog: (line) => remoteLog(line),
    onConflict: (msg) => pushAlert("error", msg.error || "Conflit de révision")
  });
}

function hideVibeThumb() {
  const thumb = $("#vibeImageThumb");
  if (!thumb) return;
  thumb.onload = null;
  thumb.onerror = null;
  thumb.classList.remove("is-ready");
  thumb.alt = "";
  thumb.removeAttribute("src");
}

function showVibeThumb(url) {
  const thumb = $("#vibeImageThumb");
  if (!thumb || !url) return hideVibeThumb();
  thumb.classList.remove("is-ready");
  thumb.alt = "";
  thumb.onload = () => {
    if (!thumb.getAttribute("src")) return;
    thumb.classList.add("is-ready");
    thumb.alt = "Aperçu de la référence";
  };
  thumb.onerror = () => hideVibeThumb();
  thumb.src = url;
}

async function setImageVibeFile(file) {
  if (!file) return;
  try {
    if (imageVibeState.previewUrl) URL.revokeObjectURL(imageVibeState.previewUrl);
    const loaded = await analyzeImageFile(file);
    imageVibeState = loaded;
    showVibeThumb(loaded.previewUrl);
    $("#vibeImageClear")?.classList.remove("hidden");
    $("#vibeImageInfo").textContent = imageVibeSummary(loaded.analysis);
    pushAlert("ok", "Image Vibe · analyse locale prête");
  } catch (e) {
    hideVibeThumb();
    $("#vibeImageClear")?.classList.add("hidden");
    pushAlert("error", `Image Vibe · ${e?.message || e}`);
  }
}

function clearImageVibe() {
  if (imageVibeState.previewUrl) URL.revokeObjectURL(imageVibeState.previewUrl);
  imageVibeState = { analysis:null, previewUrl:"" };
  hideVibeThumb();
  $("#vibeImageClear")?.classList.add("hidden");
  if ($("#vibeImageInfo")) $("#vibeImageInfo").textContent = "Image optionnelle · analyse locale";
}

$("#vibeImageFile")?.addEventListener("change", e => setImageVibeFile(e.target.files?.[0]));
$("#vibeImageClear")?.addEventListener("click", () => {
  clearImageVibe();
  if ($("#vibeImageFile")) $("#vibeImageFile").value = "";
});

async function previewVibe() {
  const text = $("#vibeInput").value.trim();
  if (!text && !imageVibeState.analysis) {
    pushAlert("error", "Vibe · ajoute un texte ou une image");
    return;
  }
  $("#applyVibeBtn").disabled = true;
  try {
    const target = $("#vibeImageTarget")?.value || "auto";
    const promptText = imageVibeState.analysis ? imageVibePrompt(text, imageVibeState.analysis, target) : text;
    let result = await runVibe(promptText, project);
    if (imageVibeState.analysis) {
      const seedOps = imageVibeOps(imageVibeState.analysis, target, text);
      result = {
        ...result,
        engine: `image-vibe+${result.engine || "local"}`,
        ops: [...seedOps, ...(result.ops || [])],
        note: `Image → Vibe · ${target} · ${result.note || "analyse locale"}`
      };
    }
    if (!result.ops?.length) {
      pendingVibe = null;
      $("#vibePreview").classList.add("hidden");
      pushAlert("error", "Vibe · aucune opération générée");
      return;
    }
    pendingVibe = result;
    const box = $("#vibePreview");
    box.classList.remove("hidden");
    box.innerHTML = `<b>Aperçu · ${result.engine}</b><p class="hint">${result.note || ""}</p><pre></pre>
      <div class="toolbar"><button type="button" id="vibeConfirm">Appliquer</button><button type="button" id="vibeCancel">Annuler</button></div>`;
    box.querySelector("pre").textContent = result.ops.map((op) => JSON.stringify(op)).join("\n");
    $("#vibeConfirm").onclick = confirmVibe;
    $("#vibeCancel").onclick = () => {
      pendingVibe = null;
      box.classList.add("hidden");
      pushAlert("ok", "Vibe · aperçu annulé (aucune modification)");
    };
  } catch (e) {
    pushAlert("error", `Vibe · ${e.message || e}`);
  } finally {
    $("#applyVibeBtn").disabled = false;
  }
}

function confirmVibe() {
  if (!pendingVibe?.ops?.length) return;
  const before = project.nodes.length;
  const { applied, errors } = applyVibeOps(project, pendingVibe.ops, {
    addNode: (type, x, y) => {
      const prev = graphPath;
      graphPath = [];
      const n = insertNode(type, x, y);
      graphPath = prev;
      return n;
    },
    addClip: (track, start, duration, label, kind) => {
      const seq = project.timeline.reduce((m, c) => Math.max(m, parseInt(String(c.id).replace(/\D/g, ""), 10) || 0), 0) + 1;
      const clip = { id: `c${seq}`, track, start, duration, label, kind };
      project.timeline.push(clip);
      return clip;
    },
    ensureEdges: () => { project.edges ||= []; return project.edges; },
    nodeById: (id) => project.nodes.find((n) => n.id === id)
  });
  pendingVibe = null;
  $("#vibePreview").classList.add("hidden");
  graphPath = [];
  refresh();
  changed();
  pushAlert("ok", `Vibe · ${applied.length} opération(s) appliquée(s)`);
  if (project.nodes.length === before && !applied.some((a) => a.op === "addClip" || a.op === "connect")) {
    pushAlert("error", "Vibe · rien de nouveau n’a été ajouté");
  }
  for (const err of errors) pushAlert("error", `Vibe · ${err}`);
  screen("patch");
}

function showTool(name, html) {
  screen("tools");
  $("#toolView").innerHTML = html;
}

function exportView(kind) {
  const runners = {
    max: () => ({ result: exportMax(project), title: "Max/MSP" }),
    td: () => ({ result: exportTouchDesigner(project), title: "TouchDesigner" }),
    pd: () => ({ result: exportPureData(project), title: "Pure Data" }),
    millumin: () => ({ result: exportMilluminOscMap(project), title: "Millumin OSC" })
  };
  const run = runners[kind];
  if (!run) return;
  const { result, title } = run();
  showTool(kind, `<h3>Export ${title}</h3><p class="hint">${result.unsupported?.length ? `Sans correspondance : ${result.unsupported.join(", ")}` : "Les nodes exportés ont une correspondance."}</p><pre id="exportOut"></pre>`);
  $("#exportOut").textContent = result.content;
}

const patch = $("#mobilePatch");
const pointers = new Map();
patch.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".mnode")) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) patch.dataset.panX = String(pan.x), patch.dataset.panY = String(pan.y), patch.dataset.sx = String(e.clientX), patch.dataset.sy = String(e.clientY);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    patch.dataset.pinch = String(Math.hypot(a.x - b.x, a.y - b.y) || 1);
    patch.dataset.pinchScale = String(pan.scale);
  }
});
patch.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const start = Number(patch.dataset.pinch) || dist;
    setZoom((Number(patch.dataset.pinchScale) || 1) * (dist / start));
    return;
  }
  if (e.target.closest(".mnode")) return;
  pan.x = Number(patch.dataset.panX) + (e.clientX - Number(patch.dataset.sx));
  pan.y = Number(patch.dataset.panY) + (e.clientY - Number(patch.dataset.sy));
  applyTransform();
});
function endPointer(e) { pointers.delete(e.pointerId); }
patch.addEventListener("pointerup", endPointer);
patch.addEventListener("pointercancel", endPointer);
patch.addEventListener("wheel", (e) => {
  e.preventDefault();
  setZoom(pan.scale + (e.deltaY < 0 ? 0.08 : -0.08));
}, { passive: false });

$("#backBtn").onclick = () => {
  if (graphPath.length) {
    graphPath.pop();
    selected = null;
    inspectorFor = null;
    refresh();
    return;
  }
  setMobileMode("plateau");
};
$$("[data-nav]").forEach((b) => {
  b.onclick = () => {
    $("#inspectorSheet").classList.add("hidden");
    $("#nodeSheet").classList.add("hidden");
    screen(b.dataset.nav);
  };
});
$("#mobileBureau").onclick = () => setMobileMode("bureau");
$("#mobilePlateau").onclick = () => setMobileMode("plateau");
$("#mobilePrefs").onclick = () => $("#mobilePreferences").classList.remove("hidden");
$("#closeMobilePrefs").onclick = () => $("#mobilePreferences").classList.add("hidden");
$("#addNodeBtn").onclick = () => { renderNodeList($("#nodeSearch").value); $("#nodeSheet").classList.remove("hidden"); };
$("#closeNodeSheet").onclick = () => $("#nodeSheet").classList.add("hidden");
$("#closeInspector").onclick = () => $("#inspectorSheet").classList.add("hidden");
$("#nodeSearch").oninput = () => renderNodeList($("#nodeSearch").value);
$("#newProjectBtn").onclick = () => {
  project = newProject();
  graphPath = [];
  selected = null;
  inspectorFor = null;
  history.clear();
  refresh();
  changed();
  pushAlert("ok", "Nouveau projet");
};
$("#projectName").onchange = () => { project.name = $("#projectName").value; changed(); };
$("#undoBtn").onclick = undo;
$("#redoBtn").onclick = redo;
$("#dupBtn").onclick = duplicateSelected;
$("#delBtn").onclick = deleteSelected;
$("#zoomIn").onclick = () => setZoom(pan.scale + 0.1);
$("#zoomOut").onclick = () => setZoom(pan.scale - 0.1);
$("#fitBtn").onclick = () => { pan = { x: 0, y: 0, scale: 0.85 }; applyTransform(); };
$("#saveBtn").onclick = () => persist(true);
$("#playBtn").onclick = () => { runtime.play(); $("#runtimeStatus").textContent = "PLAY"; };
$("#stopBtn").onclick = () => { runtime.stop(); $("#runtimeStatus").textContent = "STOP"; };
$("#goBtn").onclick = () => {
  const cue = (project.timeline || []).find((c) => c.kind === "cue");
  if (!cue) pushAlert("error", "Aucun cue dans la timeline");
  else fireCue(cue);
};
$("#outputBtn").onclick = () => {
  const el = document.querySelector(".hero");
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) {
    pushAlert("error", "OUTPUT plein écran indisponible dans ce navigateur");
    return;
  }
  Promise.resolve(req.call(el)).then(() => { runtime.play(); $("#runtimeStatus").textContent = "OUTPUT"; }).catch((e) => {
    pushAlert("error", `OUTPUT : ${e.message || e}`);
  });
};
$("#addCueBtn").onclick = () => {
  const seq = project.timeline.reduce((m, c) => Math.max(m, parseInt(String(c.id).replace(/\D/g, ""), 10) || 0), 0) + 1;
  project.timeline.push({ id: `c${seq}`, track: 4, start: project.timeline.length, duration: 1.5, label: `TOP ${seq}`, kind: "cue" });
  refresh();
  changed();
};
$("#addEffectBtn").onclick = () => {
  const seq = project.timeline.reduce((m, c) => Math.max(m, parseInt(String(c.id).replace(/\D/g, ""), 10) || 0), 0) + 1;
  project.timeline.push({ id: `c${seq}`, track: 1, start: 0, duration: 5, label: "Effet", kind: "effect" });
  refresh();
  changed();
};
$("#applyVibeBtn").onclick = previewVibe;
$("#remoteConnect").onclick = connectRemoteUi;
$("#remoteDisconnect").onclick = () => { link?.close(); link = null; setRemoteStatus("offline", "Déconnecté"); };
$("#remotePing").onclick = () => {
  if (!link?.online) { pushAlert("error", "Erreur réseau WebSocket : canal fermé"); return; }
  link.ping();
};
$("#remotePush").onclick = () => {
  if (!link?.online) { pushAlert("error", "Erreur réseau WebSocket : canal fermé"); return; }
  inflight = true;
  link.sendOp({ kind: "replace-project", project });
};
$("#remotePull").onclick = () => {
  if (!pendingRemote) { pushAlert("error", "Aucun état distant en attente"); return; }
  adoptRemote(pendingRemote);
  pendingRemote = null;
  setRemoteStatus("online", `projet distant chargé · révision ${syncedRevision}`);
};

async function useCamera(facing) {
  const type = facing === "user" ? "phone-camera-front" : "phone-camera-back";
  createNode(type);
  try {
    await runtime.enableCamera(facing);
    screen("stage");
    runtime.play();
  } catch (e) {
    pushAlert("error", `Caméra : ${e.message || e}`);
  }
}
$("#frontCam").onclick = () => useCamera("user");
$("#backCam").onclick = () => useCamera("environment");
$("#micBtn").onclick = () => {
  const node = createNode("phone-mic");
  node.params.mode = "mic";
  runtime.render();
};
$("#motionBtn").onclick = async () => {
  try { await sensors.requestMotion(); } catch (e) { pushAlert("error", e.message || e); }
};
$("#orientBtn").onclick = async () => {
  try { await sensors.requestOrientation(); } catch (e) { pushAlert("error", e.message || e); }
};
$("#gpsBtn").onclick = () => {
  try { sensors.requestGPS(); } catch (e) { pushAlert("error", e.message || e); }
};
$("#vibrateBtn").onclick = () => {
  createNode("haptics");
  const result = sensors.vibrate([40, 40, 80]);
  if (!result.ok) pushAlert("error", result.error);
};
$("#bluetoothBtn").onclick = async () => {
  createNode("bluetooth");
  try { await sensors.requestBluetooth(); } catch (e) { pushAlert("error", e.message || e); }
};
$("#wifiBtn").onclick = () => {
  sensors.refreshNetwork();
  createNode("wifi");
  const reading = sensors.get("wifi");
  if (reading.available === false) pushAlert("error", reading.error);
  else if (reading.detailError) pushAlert("error", reading.detailError);
};
function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

$("#midiBtn").onclick = async () => {
  createNode("midi");
  try { await withTimeout(devices.command("midi connect"), 4000, "Web MIDI sans réponse (permission ou périphérique absent)"); }
  catch (e) { pushAlert("error", `MIDI : ${e.message || e}`); }
};

const touchPad = $("#touchPad");
function touchesFrom(e) {
  const rect = touchPad.getBoundingClientRect();
  const list = e.touches ? [...e.touches] : [e];
  return list.map((t) => ({
    x: (t.clientX - rect.left) / Math.max(1, rect.width),
    y: (t.clientY - rect.top) / Math.max(1, rect.height),
    pressure: t.pressure || 0
  }));
}
function onTouch(e) {
  sensors.noteTouch(touchesFrom(e));
  if (!project.nodes.some((n) => n.type === "touch")) createNode("touch");
  runtime.render();
  updateLiveValues();
}
touchPad.addEventListener("pointerdown", onTouch);
touchPad.addEventListener("pointermove", (e) => { if (e.buttons || e.pressure) onTouch(e); });


function openQuickMapTool() {
  let mappingNode = (project.nodes || []).find(n => n.type === "mapping");
  if (!mappingNode) {
    mappingNode = createNode("mapping");
    mappingNode.title = "Mapping vidéo · Quick Map";
  }
  let session = createQuickMapSession({ nodeId: mappingNode.id, corners: mappingNode.params?.corners });
  const labels = ["HG","HD","BD","BG"];

  showTool("quick-map", `
    <div class="quick-map-shell">
      <div><h3>Quick Map</h3><p class="hint">Depuis la salle : place les quatre coins sur la surface projetée. Au relâchement, la calibration est appliquée et envoyée au Bureau distant s'il est connecté.</p></div>
      <div id="quickMapPad" class="quick-map-pad">
        ${session.corners.map((p,i)=>`<button type="button" class="quick-map-handle" data-qm="${i}" data-label="${labels[i]}" style="left:${p.x*100}%;top:${p.y*100}%"></button>`).join("")}
      </div>
      <div class="quick-map-actions">
        <button id="quickMapReset" type="button">Rectangle</button>
        <button id="quickMapSend" type="button">Envoyer</button>
        <button id="quickMapStage" type="button">Plateau</button>
      </div>
      <div class="quick-map-nudge">
        <span></span><button data-qm-nudge="0,-1">↑</button><span></span>
        <button data-qm-nudge="-1,0">←</button><button id="quickMapActive" type="button">HG</button><button data-qm-nudge="1,0">→</button>
        <span></span><button data-qm-nudge="0,1">↓</button><span></span>
      </div>
      <div id="quickMapStatus" class="quick-map-status"></div>
    </div>
  `);

  const pad = $("#quickMapPad");
  let active = session.activeCorner || 0;
  const status = (msg) => { const el=$("#quickMapStatus"); if(el) el.textContent=msg; };
  const redraw = () => {
    pad?.querySelectorAll("[data-qm]").forEach(el => {
      const i = Number(el.dataset.qm);
      const p = session.corners[i];
      el.style.left = (p.x * 100) + "%";
      el.style.top = (p.y * 100) + "%";
      el.classList.toggle("active", i === active);
    });
    const a=$("#quickMapActive"); if(a) a.textContent=labels[active];
  };
  const apply = (sendRemote = false) => {
    try {
      applyQuickMapToProject(project, session, { source: "phone" });
      runtime.setProject(project);
      persist(false);
      if (sendRemote) {
        if (link?.online) {
          link.sendOp(quickMapRemoteOperation(session));
          status("Calibration envoyée au Bureau distant");
        } else {
          status("Calibration locale · connecte Bureau distant pour l'envoyer");
        }
      } else status("Calibration locale mise à jour");
    } catch (e) {
      pushAlert("error", `Quick Map : ${e?.message || e}`);
    }
  };
  const move = (i, e) => {
    const r = pad.getBoundingClientRect();
    session = setQuickMapCorner(session, i, {
      x: (e.clientX - r.left) / Math.max(1, r.width),
      y: (e.clientY - r.top) / Math.max(1, r.height)
    });
    active = i;
    redraw();
    apply(false);
  };

  pad?.querySelectorAll("[data-qm]").forEach(handle => {
    handle.onpointerdown = e => {
      const i=Number(handle.dataset.qm);
      active=i; redraw();
      handle.setPointerCapture?.(e.pointerId);
      move(i,e);
    };
    handle.onpointermove = e => {
      if (!handle.hasPointerCapture?.(e.pointerId)) return;
      move(Number(handle.dataset.qm),e);
    };
    handle.onpointerup = e => {
      try { handle.releasePointerCapture?.(e.pointerId); } catch {}
      move(Number(handle.dataset.qm),e);
      apply(true);
    };
  });
  $("#quickMapReset").onclick = () => {
    session = createQuickMapSession({ nodeId: mappingNode.id });
    active=0; redraw(); apply(true);
  };
  $("#quickMapSend").onclick = () => apply(true);
  $("#quickMapStage").onclick = () => screen("stage");
  $("#quickMapActive").onclick = () => { active=(active+1)%4; redraw(); };
  $("#toolView").querySelectorAll("[data-qm-nudge]").forEach(btn => {
    btn.onclick = () => {
      const [dx,dy]=btn.dataset.qmNudge.split(",").map(Number);
      session=nudgeQuickMapCorner(session,active,dx*0.002,dy*0.002);
      redraw(); apply(true);
    };
  });
  redraw();
  apply(false);
}

$("[data-tool]").forEach((b) => {
  b.onclick = async () => {
    const tool = b.dataset.tool;
    if (tool === "quick-map") return openQuickMapTool();
    if (tool === "export-max") return exportView("max");
    if (tool === "export-td") return exportView("td");
    if (tool === "export-pd") return exportView("pd");
    if (tool === "export-millumin") return exportView("millumin");
    if (tool === "manual") { location.href = $("#manualLink").href; return; }
    if (tool === "demo") {
      project = createDemoProject();
      graphPath = [];
      refresh();
      changed();
      pushAlert("ok", "Démo P00 chargée");
      return;
    }
    if (tool === "midi") return $("#midiBtn").click();
    if (tool === "osc") {
      createNode("osc");
      runtime.render();
      updateGraphErrors();
      showTool("osc", `<h3>OSC</h3><p>Sans passerelle, le node n’annonce aucun envoi.</p>`);
      return;
    }
    if (tool === "artnet") {
      createNode("dmx");
      try { devices.bridge.send(makeArtNetPacket(0, 1, 0)); }
      catch (e) { pushAlert("error", `Art-Net : ${e.message || e}`); }
      runtime.render();
      updateGraphErrors();
      return;
    }
    if (tool === "serial") {
      if (!devices.serial.supported()) pushAlert("error", "Web Serial indisponible sur cette plateforme");
      else {
        try {
          const reopened = await withTimeout(devices.command("serial reconnect"), 2500, "reconnect timeout").catch(() => null);
          if (!reopened) await withTimeout(devices.command("serial connect"), 4000, "Web Serial sans réponse (aucun port choisi)");
        } catch (e) { pushAlert("error", `Serial : ${e.message || e}`); }
      }
      return;
    }
    if (tool === "routing") {
      ensureRouting(project);
      const rows = [0, 1, 2, 3, 4, 5].map((i) => {
        const route = effectiveRoute(project, i);
        return `<button type="button" data-route="${i}">${i + 1}. ${route.mode} · ${route.destinations.join(", ")}</button>`;
      }).join("");
      showTool("routing", `<h3>Routage</h3><div class="tool-cards">${rows}</div>`);
      $("#toolView").querySelectorAll("[data-route]").forEach((btn) => {
        btn.onclick = () => {
          const i = +btn.dataset.route;
          const route = effectiveRoute(project, i);
          route.mode = route.mode === "main" ? "copy" : route.mode === "copy" ? "only" : "main";
          route.destinations = route.mode === "main" ? ["main-output"] : ["local-window"];
          btn.textContent = `${i + 1}. ${route.mode} · ${route.destinations.join(", ")}`;
          changed();
        };
      });
    }
  };
});

function applyAppearance() {
  const accent = $("#mobileAccent").value;
  const secondary = $("#mobileSecondary").value;
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent2", secondary);
  localStorage.setItem("cvd.mobile.appearance", JSON.stringify({ a: accent, b: secondary }));
}
$("#mobileAccent").oninput = applyAppearance;
$("#mobileSecondary").oninput = applyAppearance;
$("#mobileResetAppearance").onclick = () => {
  $("#mobileAccent").value = "#d7b86a";
  $("#mobileSecondary").value = "#8fa79d";
  applyAppearance();
};
$("#aiSave").onclick = () => {
  const cfg = {
    enabled: $("#aiEnabled").checked,
    endpoint: $("#aiEndpoint").value.trim(),
    apiKey: $("#aiKey").value.trim(),
    model: $("#aiModel").value.trim() || "gpt-4o-mini"
  };
  const check = assertAiProviderAllowed(cfg);
  if (!check.ok) { pushAlert("error", check.error); return; }
  saveAiConfig(cfg);
  pushAlert("ok", "Préférences IA enregistrées");
};

document.addEventListener("keydown", (e) => {
  const tag = e.target?.tagName?.toLowerCase?.();
  const typing = tag === "input" || tag === "textarea" || tag === "select";
  if ((e.key === "Backspace" || e.key === "Delete") && selected && !typing) {
    e.preventDefault();
    deleteSelected();
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || typing) return;
  if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
  else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
  else if (e.key === "d" && selected) { e.preventDefault(); duplicateSelected(); }
});

function bindServiceWorker() {
  const built = document.querySelector('meta[name="nvd-pwa"]')?.content === "build";
  if (!built || !("serviceWorker" in navigator)) return;
  let waiting = null;
  navigator.serviceWorker.register("../sw.js", { scope: "../" }).then((reg) => {
    const watch = (worker) => {
      if (!worker) return;
      const decide = () => {
        if (worker.state !== "installed") return;
        const hasController = !!navigator.serviceWorker.controller;
        if (shouldPromptForUpdate({ hasController, workerState: worker.state })) {
          waiting = worker;
          $("#updateBanner").classList.remove("hidden");
          return;
        }
        if (shouldActivateWaitingWorker({ hasController, workerState: worker.state })) {
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      };
      decide();
      worker.addEventListener("statechange", decide);
    };
    watch(reg.installing);
    watch(reg.waiting);
    reg.addEventListener("updatefound", () => watch(reg.installing));
  }).catch((e) => pushAlert("error", `Service worker : ${e.message || e}`));
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (shouldReloadAfterUpdate({ userConfirmed: acceptUpdate, controllerChanged: true })) location.reload();
  });
  $("#updateApply").onclick = () => {
    acceptUpdate = true;
    (waiting || navigator.serviceWorker.controller)?.postMessage?.({ type: "SKIP_WAITING" });
    waiting?.postMessage({ type: "SKIP_WAITING" });
  };
}

async function boot() {
  renderNodeList();
  renderSensorReadout();
  try {
    const appearance = JSON.parse(localStorage.getItem("cvd.mobile.appearance") || "null");
    if (appearance?.a) {
      $("#mobileAccent").value = appearance.a;
      $("#mobileSecondary").value = appearance.b || "#8fa79d";
      applyAppearance();
    }
  } catch { /* apparence illisible */ }
  const ai = readAiConfig();
  $("#aiEnabled").checked = ai.enabled !== false;
  $("#aiEndpoint").value = ai.endpoint || "";
  $("#aiModel").value = ai.model || "gpt-4o-mini";
  try {
    const saved = await store.load();
    if (saved) {
      project = validateProject(saved);
      pushAlert("ok", "Projet restauré");
    }
  } catch (e) {
    pushAlert("error", `Restauration impossible · ${e.message || e}`);
  }
  ensureRouting(project);
  history.clear();
  refresh();
  commitHistory();
  const self = nestedBoxSelfTest();
  $("#bootLog").textContent = self.ok
    ? `Auto-test boîtes imbriquées · ${self.value}`
    : `Auto-test boîtes imbriquées · ÉCHEC`;
  if (!self.ok) pushAlert("error", `Auto-test boîtes imbriquées · ÉCHEC · ${self.error || self.value}`);
  setMobileMode(localStorage.getItem("cvd.mobile.mode") || "plateau");
  bindServiceWorker();
  const params = new URLSearchParams(location.search);
  if (params.get("bridge")) $("#remoteUrl").value = params.get("bridge");
  else {
    const remembered = loadRememberedHost(localStorage);
    if (remembered?.wsUrl && !$("#remoteUrl").value) $("#remoteUrl").value = remembered.wsUrl;
  }
}

window.addEventListener("error", (e) => pushAlert("error", e.message || "Erreur"));
window.addEventListener("unhandledrejection", (e) => pushAlert("error", e.reason?.message || String(e.reason || "Promesse rejetée")));
boot();
