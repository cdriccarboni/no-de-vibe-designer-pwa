import { installSurfaceSwitcher } from "../shared/surface-switcher.js";
import { newProject, validateProject, exportProject, createDemoProject, openProject } from "../shared/ir.js";
import { Runtime } from "../shared/runtime.js";
import { DESTINATIONS, ROUTE_MODES, ensureRouting, effectiveRoute } from "../shared/routing.js";
import { DeviceManager } from "../shared/device-manager.js";
import { portDirection, portLabels, portDataType, isExecutable } from "../shared/ports.js";
import { validateEdge } from "../shared/graph-engine.js";
import { runVibe, applyVibeOps, readAiConfig, saveAiConfig, assertAiProviderAllowed, probeLocalAi } from "../shared/vibe.js";
import { directOllamaProbe } from "../shared/local-ai-core.js";
import { assessLocalModels, classifyLocalAiFailure, factsFromLocalAiError } from "../shared/local-ai-diagnostic.js";
import { renderBackendReport } from "../shared/backend-registry.js";
import { browserProbeRegistry } from "../shared/agent-registry.js";
import { APP_NAME, APP_VERSION, BUILD_LABEL } from "../shared/version.js";
import { NODE_GROUPS, spec as sharedSpec } from "../shared/node-specs.js";
import { createHistory } from "../shared/history.js";
import { addBoxPort, ensureSubGraph, wrapNodesInSubpatch } from "../shared/subpatch.js";
import { sharedAudio } from "../shared/audio-engine.js";
import { planManualSave, planManualOpen, saveStatusMessage, announceManualSave, MANUAL_SAVE_KEY } from "../shared/save-fallback.js";
import { nestedBoxSelfTest } from "../shared/self-test.js";
import { connectRemote } from "../shared/remote-client.js";
import { REMOTE_PORT } from "../shared/remote-protocol.js";
import { applyCue, listCues, nextCue, previousCue, dispatchPanicEffects, formatPanicResult } from "../shared/stage/cues.js";
import { exportMax, exportTouchDesigner, exportPureData, exportMilluminOscMap } from "../shared/exporters.js";
import { generateVibeOut, VIBE_OUT_TARGETS } from "../shared/vibe-out.js";
import { createHostCard, hostCardToQrPayload } from "../shared/discovery/host-card.js";
import { discoveryCapabilities } from "../shared/discovery/lan-beacon.js";
import { createRemoteCameraSession, makeRoomCode } from "../shared/remote-camera/session.js";
import { companionJoinUrl } from "../shared/remote-camera/url.js";
import { rcStateLabel } from "../shared/remote-camera/states.js";
import { ndiStatusMessage } from "../shared/remote-camera/ndi.js";
import { markCrashRecovery, clearCrashRecovery, loadCrashRecovery, pushRecentProject, commitAutosave, storageFailureMessage } from "../shared/session-recovery.js";
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
import { DEFAULT_FRAGMENT } from "../shared/adapters/shader-surface.js";
import { RUDIMENTS, rudimentMeta, createRudimentNode } from "../shared/rudiments.js";
import { DEFAULT_QUAD, normalizeQuad, mappingParams } from "../shared/graphics/mapping-v3.js";
import { superNodePreset, applySuperNodePreset } from "../shared/supernodes-v3.js";
import { analyzeImageFile, imageVibePrompt, imageVibeOps, imageVibeSummary } from "../shared/image-vibe.js";
import { installFloatPanels } from "./float-panels.js";
import { StageSafety } from "../src/core/StageSafety.js";
import { scanLocalAgents, selectLocalAgents, LOCAL_AGENT_ROLES, localAgentRegistrySummary } from "../shared/local-agent-registry.js";

installSurfaceSwitcher({ current:"designer" });

const $ = s => document.querySelector(s);
const qall = s => [...document.querySelectorAll(s)];
const htmlSafe = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));

if ("serviceWorker" in navigator && window.nvdDesktop?.runtime !== "electron") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(err => console.warn("PWA_SW", err?.message || err));
  });
}

let project = newProject();
let nodeSeq = 0, clipSeq = 0, pointSeq = 0, selectedNode = null;
let selectedTimelineLayerId = null;
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
let imageVibeState = { analysis:null, previewUrl:"" };
let agentAutoScanAttempted = false;
let rcSession = null;
const DEMO_DISMISSED_KEY = `nvd.demo.dismissed.${APP_VERSION}`;
let demoReturnProject = null;

function setDemoBanner(active) {
  const banner = $("#demoModeBanner");
  if (banner) banner.classList.toggle("hidden", !active);
  document.body.classList.toggle("demo-mode", Boolean(active));
}

function enterShowcaseDemo({ preserve = true } = {}) {
  if (refuseCanvasEdit("chargement d'exemple")) return;
  if (preserve && !demoReturnProject) {
    try { demoReturnProject = JSON.parse(JSON.stringify(project)); } catch { demoReturnProject = newProject(); }
  }
  project = createDemoProject();
  graphPath = [];
  selectedNode = null;
  selection.clear();
  redraw();
  runtime.play();
  syncPlayButton();
  setDemoBanner(true);
  log("EXEMPLE · Wow interactif chargé · déplace la souris dans le Preview");
}

function exitShowcaseDemo() {
  if (refuseCanvasEdit("sortie de l'exemple")) return;
  project = demoReturnProject ? validateProject(demoReturnProject) : newProject();
  demoReturnProject = null;
  graphPath = [];
  selectedNode = null;
  selection.clear();
  localStorage.setItem(DEMO_DISMISSED_KEY, "1");
  setDemoBanner(false);
  redraw();
  history.clear();
  commitHistory();
  autosave();
  log("EXEMPLE · EXIT · projet précédent restauré");
}

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

function paintShowLock(locked) {
  document.body.classList.toggle("show-locked", Boolean(locked));
  const badge = $("#showLockBadge");
  const banner = $("#showLockBanner");
  if (badge) badge.hidden = !locked;
  if (banner) banner.hidden = !locked;
  const space = $("#patchSpace");
  if (space) space.setAttribute("aria-disabled", locked ? "true" : "false");
}
const stageSafety = new StageSafety(runtime, { onLockChange: paintShowLock });
function canvasStructurallyLocked() {
  return stageSafety?.isLocked === true;
}
function refuseCanvasEdit(action) {
  if (!canvasStructurallyLocked()) return false;
  log(`Show Lock · ${action} bloqué · spectacle verrouillé`);
  return true;
}


let pnpState = null;
const devices = new DeviceManager(e => {
  if (e.type === "midi-in") {
    deviceBus.lastMidi = e.message;
    log(`MIDI ${e.message.type} ch${e.message.channel} #${e.message.number} ${e.message.value}`);
  } else if (e.type === "serial-line") {
    deviceBus.lastSerial = e.line;
    log(`SERIAL < ${e.line}`);
  } else if (e.type === "serial-state") {
    deviceBus.serialState = e.state || "offline";
    if (pnpState?.serial) pnpState.serial.connected = e.state === "online";
    renderPnpStatus();
    log(`SERIAL · ${e.state}`);
  } else if (e.type === "bridge-message") {
    log(`BRIDGE < ${typeof e.data === "string" ? e.data : JSON.stringify(e.data).slice(0, 160)}`);
  } else if (e.type === "bridge-state") log(`BRIDGE · ${e.state}`);
  else if (e.type === "midi-state") {
    pnpState ||= { midi:{}, serial:{} };
    pnpState.midi = { ...(pnpState.midi || {}), connected: e.inputs.length + e.outputs.length > 0 || !!devices.midi.access, inputs:e.inputs.length, outputs:e.outputs.length };
    renderPnpStatus();
    log(`MIDI · ${e.inputs.length} IN / ${e.outputs.length} OUT`);
  } else if (e.type === "pnp-probe") {
    pnpState = e.result;
    renderPnpStatus();
  }
});

function readGeneralPrefsNow() {
  try {
    return { restoreAutosave:true, loadDemo:true, plugAndPlay:true, technicalMode:false, ...JSON.parse(localStorage.getItem("nvd.general") || "{}") };
  } catch {
    return { restoreAutosave:true, loadDemo:true, plugAndPlay:true, technicalMode:false };
  }
}

let agentRegistryDoc = null;
function paintBackendReport() {
  const box = $("#backendReport");
  if (!box) return;
  box.textContent = "Sonde des agents…";
  const load = agentRegistryDoc
    ? Promise.resolve(agentRegistryDoc)
    : (globalThis.nvdDesktop?.agentRegistry
      ? globalThis.nvdDesktop.agentRegistry()
      : Promise.resolve(browserProbeRegistry(document.createElement("canvas").getContext("webgl2"))));
  load.then(doc => {
    agentRegistryDoc = doc;
    const technical = $("#prefTechnicalMode")?.checked === true;
    box.innerHTML = renderBackendReport(technical ? "technical" : "artist", doc);
  }).catch(error => {
    box.textContent = error?.message || String(error);
  });
}

function writeGeneralPrefsFromUi() {
  const previous = readGeneralPrefsNow();
  const next = {
    ...previous,
    restoreAutosave: $("#prefRestoreAutosave")?.checked !== false,
    loadDemo: $("#prefLoadDemo")?.checked !== false,
    plugAndPlay: $("#prefPlugAndPlay")?.checked !== false,
    technicalMode: $("#prefTechnicalMode")?.checked === true
  };
  localStorage.setItem("nvd.general", JSON.stringify(next));
  return next;
}

function renderPnpStatus() {
  const btn = $("#pnpBtn");
  if (!btn) return;
  const prefs = readGeneralPrefsNow();
  btn.classList.remove("live", "attention");
  if (prefs.plugAndPlay === false) {
    btn.textContent = "P&P · OFF";
    btn.title = "Plug & Play désactivé";
    return;
  }
  const midi = pnpState?.midi;
  const serial = pnpState?.serial;
  const media = pnpState?.media;
  const summary = $("#pnpSummary");
  if (summary) {
    const parts = [];
    if (media?.cameras) parts.push(String(media.cameras) + " caméra" + (media.cameras > 1 ? "s" : ""));
    if (midi?.connected) parts.push("MIDI " + (midi.inputs || 0) + " IN / " + (midi.outputs || 0) + " OUT");
    else if (midi?.permission === "granted") parts.push("MIDI autorisé");
    if (serial?.connected) parts.push("USB/Serial connecté");
    else if (serial?.authorized) parts.push(String(serial.authorized) + " USB/Serial autorisé" + (serial.authorized > 1 ? "s" : ""));
    summary.textContent = parts.length ? parts.join(" · ") : "Détection passive · aucune permission demandée automatiquement.";
  }
  const linked = Number(!!midi?.connected) + Number(!!serial?.connected);
  if (linked >= 2) {
    btn.textContent = "P&P · 2 LIÉS";
    btn.classList.add("live");
  } else if (serial?.connected) {
    btn.textContent = "P&P · USB ✓";
    btn.classList.add("live");
  } else if (midi?.connected) {
    btn.textContent = "P&P · MIDI ✓";
    btn.classList.add("live");
  } else if ((serial?.authorized || 0) > 0 || midi?.permission === "granted") {
    btn.textContent = "P&P · PRÊT";
    btn.classList.add("attention");
  } else {
    btn.textContent = "P&P · AUTO";
  }
  btn.title = "Plug & Play · détecter / connecter les périphériques";
}

async function runPlugAndPlayProbe({ silent=false } = {}) {
  const prefs = readGeneralPrefsNow();
  if (prefs.plugAndPlay === false) {
    renderPnpStatus();
    return null;
  }
  try {
    const result = await devices.probe({ autoReconnectSerial:true, autoConnectGrantedMidi:true });
    pnpState = result;
    renderPnpStatus();
    if (!silent) {
      const bits = [];
      if (result.media?.cameras) bits.push(String(result.media.cameras) + " caméra" + (result.media.cameras > 1 ? "s" : "") + " disponible" + (result.media.cameras > 1 ? "s" : ""));
      if (result.serial?.connected) bits.push("USB/Serial connecté");
      else if (result.serial?.authorized) bits.push(`${result.serial.authorized} USB/Serial autorisé(s)`);
      if (result.midi?.connected) bits.push(`MIDI ${result.midi.inputs || 0} IN / ${result.midi.outputs || 0} OUT`);
      log(`Plug & Play · ${bits.length ? bits.join(" · ") : "prêt · rien à autoriser pour l’instant"}`);
    }
    return result;
  } catch (error) {
    log(`Plug & Play · ${error?.message || error}`);
    return null;
  }
}

async function connectPnpMidi() {
  try {
    await devices.connectMidi();
    await runPlugAndPlayProbe({ silent:true });
    log("Plug & Play · MIDI connecté");
  } catch (error) {
    log(`MIDI · ${error?.message || error}`);
  }
}

async function connectPnpSerial() {
  try {
    await devices.connectSerial();
    await runPlugAndPlayProbe({ silent:true });
    log("Plug & Play · USB / Arduino / ESP connecté");
  } catch (error) {
    log(`SERIAL · ${error?.message || error}`);
  }
}

$("#pnpBtn")?.addEventListener("click", event => {
  event.stopPropagation();
  $("#pnpMenu")?.classList.toggle("hidden");
});
$("#pnpRefresh")?.addEventListener("click", async () => {
  $("#pnpMenu")?.classList.add("hidden");
  await runPlugAndPlayProbe();
});
$("#pnpMidi")?.addEventListener("click", async () => {
  $("#pnpMenu")?.classList.add("hidden");
  await connectPnpMidi();
});
$("#pnpSerial")?.addEventListener("click", async () => {
  $("#pnpMenu")?.classList.add("hidden");
  await connectPnpSerial();
});
document.addEventListener("click", event => {
  if (!event.target?.closest?.(".pnp-wrap")) $("#pnpMenu")?.classList.add("hidden");
});

runtime.setBridgeSend(packet => {
  try { devices.bridge.send(packet); }
  catch (err) { throw err; }
});
runtime.setSerialSend(text => devices.serial.send(text));

async function requestAiForNode(options = {}) {
  const cfg = readAiConfig();
  if (typeof window.nvdDesktop?.aiNodeRequest === "function") {
    return window.nvdDesktop.aiNodeRequest({
      ...options,
      apiKey: options.apiKey || cfg.apiKey || ""
    });
  }
  const protocol = String(options.protocol || "ollama").toLowerCase();
  const prompt = String(options.prompt || "");
  if (protocol === "apple") throw new Error("Apple Intelligence ne tourne pas dans la PWA : uniquement l'application macOS peut appeler le modèle local.");
  if (protocol === "ollama") {
    const base = String(options.baseUrl || cfg.localBaseUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
    const modelName = options.model || cfg.localModel || "qwen2.5-coder:7b";
    const probe = await directOllamaProbe(base, { model: modelName, pageProtocol: globalThis.location?.protocol || "" });
    const assessed = assessLocalModels(probe?.models || [], modelName);
    if (!probe?.ok || !assessed.ok || assessed.installed === false) {
      const failure = probe?.failure || assessed.failure;
      const error = new Error(probe?.error || assessed.error || assessed.notice || failure?.message || "Ollama inaccessible");
      error.failure = failure || null;
      error.responded = false;
      throw error;
    }
    let res;
    try {
      res = await fetch(base + "/api/chat", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          model: modelName,
          stream: false,
          messages: [
            { role:"system", content: options.system || "Tu es une IA créative reliée à No-de Vibe Designer." },
            { role:"user", content: prompt }
          ]
        })
      });
    } catch (error) {
      let targetProtocol = "http:";
      let loopback = true;
      try {
        const url = new URL(base);
        targetProtocol = url.protocol;
        loopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
      } catch { /* URL déjà refusée par le probe */ }
      const failure = classifyLocalAiFailure(factsFromLocalAiError(error, {
        pageProtocol: globalThis.location?.protocol || "",
        targetProtocol,
        loopback,
        model: modelName
      }));
      const wrapped = new Error(failure?.message || error?.message || "Ollama inaccessible");
      wrapped.failure = failure;
      wrapped.responded = false;
      throw wrapped;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const failure = classifyLocalAiFailure({
        status: res.status,
        message: ("Ollama HTTP " + res.status + " · " + body.slice(0, 180)).trim(),
        model: modelName,
        endpoint: "chat"
      });
      const error = new Error(failure?.message || ("Ollama HTTP " + res.status));
      error.failure = failure;
      error.responded = false;
      throw error;
    }
    const data = await res.json();
    const content = String(data?.message?.content || "");
    if (!content.trim()) {
      const error = new Error("IA locale : réponse vide");
      error.responded = false;
      throw error;
    }
    return { ok:true, content, model:data?.model || modelName, responded:true };
  }
  const endpoint = String(options.endpoint || cfg.endpoint || "").trim();
  if (!endpoint) throw new Error("Endpoint IA manquant");
  const headers = { "Content-Type":"application/json" };
  const key = options.apiKey || cfg.apiKey || "";
  if (key) headers.Authorization = "Bearer " + key;
  const body = protocol === "generic"
    ? { model: options.model || cfg.model || "", prompt, input: prompt }
    : {
        model: options.model || cfg.model || "gpt-4o-mini",
        messages: [
          { role:"system", content: options.system || "Tu es une IA créative reliée à No-de Vibe Designer." },
          { role:"user", content: prompt }
        ]
      };
  const res = await fetch(endpoint, { method:"POST", headers, body:JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error("Endpoint IA HTTP " + res.status + " · " + text.slice(0,160));
  let data = null;
  try { data = JSON.parse(text); } catch { /* texte brut accepté */ }
  return {
    ok:true,
    content:String(data?.choices?.[0]?.message?.content ?? data?.message?.content ?? data?.response ?? data?.text ?? text)
  };
}
runtime.setAiRequest(async options => {
  try { return await requestAiForNode(options); }
  finally { queueMicrotask(() => runtime.render()); }
});

async function requestAiAsset(options = {}) {
  const cfg = readAiConfig();
  const endpoint = String(options.endpoint || cfg.mediaEndpoint || cfg.endpoint || "").trim();
  if (!endpoint) throw new Error("Endpoint média IA manquant");
  if (typeof window.nvdDesktop?.aiAssetRequest === "function") {
    return window.nvdDesktop.aiAssetRequest({
      ...options,
      endpoint,
      apiKey: cfg.apiKey || ""
    });
  }
  const headers = { "Content-Type":"application/json" };
  if (cfg.apiKey) headers.Authorization = "Bearer " + cfg.apiKey;
  const res = await fetch(endpoint, {
    method:"POST",
    headers,
    body:JSON.stringify({
      kind:options.kind,
      model:options.model || "",
      prompt:options.prompt || "",
      input:options.prompt || "",
      referenceUrl:options.referenceUrl || "",
      ...(options.params || {})
    })
  });
  const text = await res.text();
  if (!res.ok) throw new Error("Endpoint média IA HTTP " + res.status + " · " + text.slice(0,160));
  let data = null;
  try { data = JSON.parse(text); } catch { /* URL brute acceptée */ }
  const url = String(data?.url ?? data?.output_url ?? data?.outputUrl ?? data?.data?.[0]?.url ?? (/^(https?:|data:)/.test(text.trim()) ? text.trim() : ""));
  if (!url) throw new Error("Endpoint média IA : aucune URL de sortie");
  return { ok:true, url, kind:options.kind, model:options.model || "" };
}
runtime.setAiAssetRequest(async options => {
  try { return await requestAiAsset(options); }
  finally { queueMicrotask(() => runtime.render()); }
});

async function installLocalModel(model) {
  const cfg = readAiConfig();
  if (typeof window.nvdDesktop?.installLocalAi !== "function") {
    throw new Error("Installation automatique disponible dans l’application ordinateur");
  }
  log(`Local AI · installation ${model}…`);
  const result = await window.nvdDesktop.installLocalAi({ baseUrl:cfg.localBaseUrl, model });
  log(`Local AI · ${model} · ${result?.status || "installé"}`);
  return result;
}

if (typeof window.nvdDesktop?.sendOscUdp === "function") {
  runtime.setOscUdpSend(msg => window.nvdDesktop.sendOscUdp(msg));
}
if (typeof window.nvdDesktop?.sendArtNetUdp === "function") {
  runtime.setArtNetUdpSend(msg => window.nvdDesktop.sendArtNetUdp(msg));
}

ensureRouting(project);

/** Catalogue UI — mêmes groupes ; marque visuelle des nodes exécutables. */
const LIB = [
  ["Rudiments / Modules", RUDIMENTS.map(r => [r.label, `rudiment:${r.id}`])],
  ...NODE_GROUPS.map(([title, items]) => [title, items])
];
const OSC_BRIDGE_TYPES = new Set(["twozero","td","isadora","chataigne","millumin","touchdesigner","isadorabridge","max","pd","supercollider"]);
const AI_NODE_TYPES = new Set(["ai","ai-image","ai-video","ai-audio","ai-3d"]);
const SERIAL_NODE_TYPES = new Set(["arduino","esp","servo","rfid"]);
let showExperimental = localStorage.getItem("nvd.showExperimental") === "1";
const LIBRARY_EXPANDED_KEY = "nvd.library.expandedGroups";
let expandedLibraryGroups = new Set();
try {
  const raw = localStorage.getItem(LIBRARY_EXPANDED_KEY);
  const stored = raw == null ? null : JSON.parse(raw);
  if (Array.isArray(stored) && stored.length) expandedLibraryGroups = new Set(stored.map(Number).filter(Number.isInteger));
  else expandedLibraryGroups = new Set(LIB.map((_, i) => i));
} catch {
  expandedLibraryGroups = new Set(LIB.map((_, i) => i));
}

function saveExpandedLibraryGroups() {
  localStorage.setItem(LIBRARY_EXPANDED_KEY, JSON.stringify([...expandedLibraryGroups].sort((a, b) => a - b)));
}

function spec(t) {
  if (String(t).startsWith("rudiment:")) {
    const meta = rudimentMeta(String(t).slice("rudiment:".length));
    return [meta?.label || "Rudiment", meta?.ports || ["in","params","out"]];
  }
  return sharedSpec(t);
}

function isLibraryExecutable(type) {
  return String(type).startsWith("rudiment:") || isExecutable(type);
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

const NODE_RUNTIME_REQUIREMENTS = new Map([
  ["ndi-out", "relais natif requis à l’usage"],
  ["midi", "périphérique MIDI requis à l’usage"],
  ["arduino", "périphérique série requis à l’usage"],
  ["esp", "ESP/Wemos + liaison série requis à l’usage"],
  ["servo", "servo + contrôleur série requis à l’usage"],
  ["rfid", "lecteur RFID/QR requis à l’usage"],
  ["sensors", "capteur compatible requis à l’usage"],
  ["td", "TouchDesigner + OSC requis à l’usage"],
  ["twozero", "TWOZERO / TouchDesigner + OSC requis à l’usage"],
  ["chataigne", "Chataigne + OSC requis à l’usage"],
  ["millumin", "Millumin + OSC requis à l’usage"],
  ["touchdesigner", "TouchDesigner + OSC requis à l’usage"],
  ["isadora", "Isadora + OSC requis à l’usage"],
  ["isadorabridge", "Isadora + OSC requis à l’usage"],
  ["max", "Max/MSP + OSC requis à l’usage"],
  ["pd", "Pure Data + OSC requis à l’usage"],
  ["supercollider", "SuperCollider + OSC requis à l’usage"],
  ["remote-camera", "caméra distante et réseau requis à l’usage"],
  ["videoreturn", "source vidéo distante requise à l’usage"],
  ["phone-camera-front", "permission caméra requise à l’usage"],
  ["phone-camera-back", "permission caméra requise à l’usage"],
  ["phone-mic", "permission micro requise à l’usage"],
  ["gyro", "capteur appareil requis à l’usage"],
  ["accelerometer", "capteur appareil requis à l’usage"],
  ["orientation", "capteur appareil requis à l’usage"],
  ["gps", "permission localisation requise à l’usage"],
  ["haptics", "haptique appareil requis à l’usage"],
  ["bluetooth", "Bluetooth appareil requis à l’usage"]
]);

function nodeReadiness(type) {
  if (String(type).startsWith("rudiment:")) return "Prêt · sous-patch ouvert et modifiable";
  if (!isExecutable(type)) return "Indisponible · moteur non câblé";
  const requirement = NODE_RUNTIME_REQUIREMENTS.get(type);
  return requirement ? `Prêt · ${requirement}` : "Prêt";
}

function buildLibrary() {
  const q = $("#search")?.value?.trim?.().toLowerCase?.() || "";
  $("#libraryList").innerHTML = LIB.map(([title, items], groupIndex) => {
    const visible = items.filter(([, t]) => showExperimental || isLibraryExecutable(t));
    if (!visible.length) return "";
    const expanded = Boolean(q) || expandedLibraryGroups.has(groupIndex);
    return `<div class="lib-section ${expanded ? "expanded" : "collapsed"}" data-lib-group="${groupIndex}">
      <button type="button" class="lib-title" data-lib-toggle="${groupIndex}" aria-expanded="${expanded ? "true" : "false"}" title="${expanded ? "Replier" : "Déplier"} · ${title}">
        <span>${title}</span><span class="lib-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="lib-items">${visible.map(([n, t]) => {
        const ok = isLibraryExecutable(t);
        const unstable = ["depthmask","opticalflow","ndi-out","remote-camera","phone-camera-back","phone-camera-front"].includes(t);
        const mark = (!ok || unstable) ? " · EXPÉRIMENTAL" : "";
        return `<div class="lib-item ${ok ? "executable" : "unavailable"}" data-add="${t}" title="${nodeReadiness(t)}"><span>${n}${mark}</span><span>${ok ? "＋" : "○"}</span></div>`;
      }).join("")}</div>
    </div>`;
  }).join("");
  qall("[data-lib-toggle]").forEach(toggle => {
    toggle.onclick = () => {
      const groupIndex = Number(toggle.dataset.libToggle);
      if (expandedLibraryGroups.has(groupIndex)) expandedLibraryGroups.delete(groupIndex);
      else expandedLibraryGroups.add(groupIndex);
      saveExpandedLibraryGroups();
      buildLibrary();
    };
  });
  qall("[data-add]").forEach(x => x.onclick = () => addNode(x.dataset.add));
  if (q) qall(".lib-item").forEach(x => {
    x.style.display = x.textContent.toLowerCase().includes(q) ? "flex" : "none";
  });
  const expCount = LIB.flatMap(([, items]) => items).filter(([, t]) => !isLibraryExecutable(t)).length;
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
  const parts = ["Patch", ...graphPath.map(p => p.title || p.id)];
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
      if (refuseCanvasEdit("suppression de câble")) return;
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
  if (refuseCanvasEdit("câblage")) return;
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
  if (canvasStructurallyLocked()) {
    wireDraft = null;
    $("#wireDraftPath")?.classList.remove("active");
    $("#wireDraftPath")?.setAttribute("d", "");
    log("Show Lock · câblage bloqué · spectacle verrouillé");
    return;
  }
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

let shaderDialogNodeId = null;
function openShaderLab(node) {
  if (!node || node.type !== "shader") return;
  shaderDialogNodeId = node.id;
  $("#shaderSource").value = node.params?.glsl || DEFAULT_FRAGMENT;
  $("#shaderStatus").textContent = node.params?.glsl ? "Shader personnalisé" : "Shader par défaut";
  const dialog = $("#shaderDialog");
  if (dialog?.showModal) dialog.showModal();
}
function applyShaderLab() {
  if (refuseCanvasEdit("modification de shader")) return;
  const node = nodeById(shaderDialogNodeId);
  if (!node) return;
  const source = $("#shaderSource").value.trim() || DEFAULT_FRAGMENT;
  try {
    runtime.shaderSurface.compile(source);
    node.params ||= {};
    node.params.glsl = source === DEFAULT_FRAGMENT ? "" : source;
    $("#shaderStatus").textContent = "GLSL valide · appliqué";
    autosave();
    commitHistory();
    runtime.render();
    log("Shader Lab · " + node.title + " · GLSL appliqué");
  } catch (error) {
    $("#shaderStatus").textContent = "Erreur · " + (error?.message || error);
    log("Shader Lab · GLSL invalide · " + (error?.message || error));
  }
}
$("#shaderApply")?.addEventListener("click", applyShaderLab);
$("#shaderReset")?.addEventListener("click", () => { $("#shaderSource").value = DEFAULT_FRAGMENT; $("#shaderStatus").textContent = "Shader par défaut prêt"; });
$("#shaderClose")?.addEventListener("click", () => $("#shaderDialog")?.close());
$("#shaderSource")?.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); applyShaderLab(); }
});

function openCompanionEditor(clientId = "") {
  const dialog = $("#companionEditorDialog");
  const frame = $("#companionEditorFrame");
  if (!dialog?.showModal || !frame) {
    window.open("../studio/?surface=regie", "_blank", "noopener");
    return;
  }
  const query = new URLSearchParams({ surface:"regie", embedded:"1" });
  if (clientId) query.set("client", clientId);
  frame.src = "../studio/?" + query.toString();
  $("#companionEditorStatus").textContent = clientId ? ("Companion " + clientId + " · édition live") : "Layout Local First · synchronisation live via l’hôte No-de";
  dialog.showModal();
}
$("#companionEditorClose")?.addEventListener("click", () => $("#companionEditorDialog")?.close());
$("#companionEditorDialog")?.addEventListener("close", () => { const frame=$("#companionEditorFrame"); if(frame) frame.removeAttribute("src"); });

function addNode(type, x = 50 + (nodeSeq % 4) * 180, y = 60 + Math.floor(nodeSeq / 4) * 110) {
  if (refuseCanvasEdit("ajout de node")) return null;
  const g = activeGraph();
  if (String(type).startsWith("rudiment:")) {
    const rid = String(type).slice("rudiment:".length);
    const seq = (g.nodes.reduce((m, n) => Math.max(m, parseInt(String(n.id).replace(/\D/g, "")) || 0), 0) + 1);
    nodeSeq = Math.max(nodeSeq, seq);
    const n = createRudimentNode(rid, { nodeId:`n${seq}`, x, y });
    g.nodes.push(n);
    if (isRootGraph()) project.nodes = g.nodes;
    drawNode(n);
    selectNode(n.id);
    if (isRootGraph()) runtime.setProject(project);
    autosave();
    commitHistory();
    log(`Rudiment ajouté · ${n.title} · double-clic pour ouvrir`);
    return n;
  }
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
  el.title = nodeReadiness(n.type);
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
  el.ondblclick = () => {
    if (n.type === "subpatch") enterSubpatch(n);
    else if (n.type === "shader") openShaderLab(n);
  };
  attachPortInteractions(el);
  makeDraggable(el, n);
  requestAnimationFrame(renderWires);
}

function makeDraggable(el, n) {
  const h = el.querySelector(".nh");
  let d = false, sx = 0, sy = 0, ox = 0, oy = 0;
  h.onmousedown = e => {
    if (refuseCanvasEdit("déplacement")) return;
    d = true; sx = e.clientX; sy = e.clientY; ox = n.x; oy = n.y; e.preventDefault();
  };
  window.addEventListener("mousemove", e => {
    if (!d) return;
    if (canvasStructurallyLocked()) { d = false; return; }
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
  if (AI_NODE_TYPES.has(n.type)) {
    const cfg = readAiConfig();
    const media = n.type !== "ai";
    const defaultProtocol = media ? "generic" : "ollama";
    const protocol = n.params.protocol || defaultProtocol;
    const endpoint = n.params.endpoint || (media ? (cfg.mediaEndpoint || cfg.endpoint || "") : (cfg.endpoint || ""));
    const baseUrl = n.params.baseUrl || cfg.localBaseUrl || "http://127.0.0.1:11434";
    const model = n.params.model || (n.type === "ai" ? (cfg.localModel || "qwen2.5-coder:7b") : "");
    const appleChoice = typeof window.nvdDesktop?.aiNodeRequest === "function" ? `<option value="apple">Apple Intelligence</option>` : "";
    extra += `<div class="field"><label>Mode IA</label><select id="nAiProtocol"><option value="ollama">Ollama local / LAN</option>${appleChoice}<option value="openai">OpenAI-compatible</option><option value="generic">HTTP générique</option></select></div>`;
    extra += `<div class="field"><label>Adresse Ollama</label><input id="nAiBase" value="${htmlSafe(baseUrl)}" placeholder="http://192.168.1.20:11434"></div>`;
    extra += `<div class="field"><label>Endpoint externe</label><input id="nAiEndpoint" value="${htmlSafe(endpoint)}" placeholder="https://…"></div>`;
    extra += `<div class="field"><label>Modèle</label><input id="nAiModel" value="${htmlSafe(model)}" placeholder="${media ? "nom du modèle média" : "qwen2.5-coder:7b"}"></div>`;
    extra += `<div class="field"><label>Prompt</label><textarea id="nAiPrompt" rows="5" spellcheck="false">${htmlSafe(n.params.prompt || "")}</textarea></div>`;
    if (n.type === "ai") {
      extra += `<div class="field"><label>Rôle / système</label><textarea id="nAiSystem" rows="3" spellcheck="false">${htmlSafe(n.params.system || "Tu es une IA créative connectée à No-de Vibe Designer.")}</textarea></div>`;
    }
    extra += `<div class="field"><label>Auto au changement</label><select id="nAiAuto"><option value="false">Non · Run/Trigger</option><option value="true">Oui</option></select></div>`;
    extra += `<div class="camera-actions"><button id="nAiRun" type="button">Run IA</button></div>`;
    extra += `<p class="hint">${media ? "Sortie typée câblable comme un node classique. Le backend doit renvoyer une URL de média exploitable." : "La réponse texte sort du port response. Trigger ou Run évite les appels à chaque frame."}</p>`;
    n.params.protocol = protocol;
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
    extra += `<div class="field"><label>Taille</label><input id="nTextSize" type="number" min="1" max="8" value="${n.params.size ?? 2}"></div>`;
    extra += `<div class="field"><label>Gras</label><select id="nTextBold"><option value="false">Non</option><option value="true">Oui</option></select></div>`;
    extra += `<div class="field"><label>Couleur</label><input id="nTextColor" value="${n.params.color || "#f4f1e8"}"></div>`;
    extra += `<div class="field"><label>Opacité</label><input id="nTextOpacity" type="number" min="0" max="1" step="0.01" value="${n.params.opacity ?? 1}"></div>`;
    extra += `<div class="field"><label>Position X</label><input id="nTextX" type="number" value="${n.params.x ?? 8}"></div>`;
    extra += `<div class="field"><label>Position Y</label><input id="nTextY" type="number" value="${n.params.y ?? 8}"></div>`;
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
    extra += `<div class="field"><label>Blend · EXPÉRIMENTAL</label><select id="nBlend"><option>normal</option><option>add</option><option>multiply</option><option>screen</option></select></div>`;
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
    extra += `<p class="hint">Double-clic pour éditer. Maj+clic pour sélectionner plusieurs blocs, puis « Bloc ».</p>`;
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
  if (n.type === "mapping") {
    const q = normalizeQuad(n.params?.corners || DEFAULT_QUAD);
    extra += `<div class="field"><label>Quick Map</label><span class="hint">HG · HD · BD · BG</span></div>`;
    q.forEach((p, i) => {
      const labels = ["HG","HD","BD","BG"];
      extra += `<div class="field mapping-corner"><label>${labels[i]}</label><input id="nMapC${i}x" type="number" min="0" max="1" step=".001" value="${p.x.toFixed(4)}"><input id="nMapC${i}y" type="number" min="0" max="1" step=".001" value="${p.y.toFixed(4)}"></div>`;
    });
    extra += `<div class="camera-actions"><button id="mappingResetBtn" type="button">Rectangle</button></div>`;
    extra += `<p class="hint">Téléphone : Mobile → Outils → Quick Map. Connecté au Bureau distant, les quatre coins sont envoyés au node Mapping en une calibration.</p>`;
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
  if ($("#nAiProtocol")) {
    $("#nAiProtocol").value = n.params.protocol || (n.type === "ai" ? "ollama" : "generic");
    $("#nAiProtocol").onchange = e => { n.params.protocol = e.target.value; autosave(); commitHistory(); };
  }
  if ($("#nAiBase")) $("#nAiBase").onchange = e => { n.params.baseUrl = e.target.value.trim(); autosave(); commitHistory(); };
  if ($("#nAiEndpoint")) $("#nAiEndpoint").onchange = e => { n.params.endpoint = e.target.value.trim(); autosave(); commitHistory(); };
  if ($("#nAiModel")) $("#nAiModel").onchange = e => { n.params.model = e.target.value.trim(); autosave(); commitHistory(); };
  if ($("#nAiPrompt")) $("#nAiPrompt").oninput = e => { n.params.prompt = e.target.value; autosave(); };
  if ($("#nAiSystem")) $("#nAiSystem").oninput = e => { n.params.system = e.target.value; autosave(); };
  if ($("#nAiAuto")) {
    $("#nAiAuto").value = String(n.params.auto === true);
    $("#nAiAuto").onchange = e => { n.params.auto = e.target.value === "true"; autosave(); commitHistory(); runtime.render(); };
  }
  if ($("#nAiRun")) $("#nAiRun").onclick = () => {
    n.params.manualRunNonce = Date.now();
    runtime.render();
    autosave();
    log(`IA · Run · ${n.title || n.type}`);
  };
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
  if ($("#nTextBold")) { $("#nTextBold").value = String(n.params.bold === true); $("#nTextBold").onchange = e => { n.params.bold = e.target.value === "true"; runtime.render(); autosave(); commitHistory(); }; }
  for (const [id, key, numeric] of [["nTextSize","size",true],["nTextColor","color",false],["nTextOpacity","opacity",true],["nTextX","x",true],["nTextY","y",true]]) {
    if (!$(id)) continue;
    $(id).onchange = e => { n.params[key] = numeric ? +e.target.value : e.target.value; runtime.render(); autosave(); commitHistory(); };
  }
  if ($("#nSpeed")) $("#nSpeed").oninput = e => { n.params.speed = +e.target.value; runtime.render(); autosave(); };
  if ($("#nSize")) $("#nSize").oninput = e => { n.params.size = +e.target.value; runtime.render(); autosave(); };
  if ($("#nScale")) $("#nScale").onchange = e => { n.params.scale = +e.target.value; runtime.render(); autosave(); commitHistory(); };
  if (n.type === "mapping") {
    const applyMappingCorners = (source = "designer") => {
      const current = normalizeQuad(n.params?.corners || DEFAULT_QUAD);
      const next = current.map((p, i) => ({
        x: Number($("#nMapC"+i+"x")?.value ?? p.x),
        y: Number($("#nMapC"+i+"y")?.value ?? p.y)
      }));
      try {
        n.params = { ...(n.params || {}), ...mappingParams(next, { source }) };
        runtime.render(); autosave();
      } catch (e) {
        log(`Quick Map · ${e?.message || e}`);
      }
    };
    for (let i = 0; i < 4; i++) {
      ["x","y"].forEach(axis => {
        const el = $("#nMapC"+i+axis);
        if (!el) return;
        el.oninput = () => applyMappingCorners("designer");
        el.onchange = () => { applyMappingCorners("designer"); commitHistory(); };
      });
    }
    if ($("#mappingResetBtn")) $("#mappingResetBtn").onclick = () => {
      n.params = { ...(n.params || {}), ...mappingParams(DEFAULT_QUAD, { source: "designer-reset" }) };
      renderInspector(n.id); runtime.render(); autosave(); commitHistory();
    };
  }

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
      if (!window.Peer) await window.__nvdLoadPeer?.();
      if (!window.Peer) throw new Error("PeerJS non chargé — connexion distante indisponible hors-ligne");
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
  if (refuseCanvasEdit("ajout de port")) return;
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
  if (refuseCanvasEdit("regroupement")) return;
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
  if (refuseCanvasEdit("duplication")) return;
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
  if (refuseCanvasEdit("suppression")) return;
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
  const layer = (project.layers || [])[track] || (project.layers || []).find(l => l.type === kind) || (project.layers || [])[0];
  const c = { id: `c${clipSeq}`, track, layerId: layer?.id || null, start, duration, label, kind };
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
  const track = document.querySelector(`.timeline-track[data-track="${c.track}"]`);
  if (track) track.appendChild(el);
  clipDrag(el, c);
}
function clipDrag(el, c) {
  let m = null, sx = 0, s = 0, d = 0;
  el.onmousedown = e => {
    const layer = (project.layers || []).find(item => item.id === c.layerId) || (project.layers || [])[c.track];
    if (layer?.locked) { log(`Calque verrouillé · ${layer.name}`); return; }
    m = e.target.classList.contains("resize") ? "resize" : "move";
    sx = e.clientX; s = c.start; d = c.duration; e.preventDefault();
  };
  window.addEventListener("mousemove", e => {
    if (!m) return;
    const w = el.closest(".timeline-track")?.getBoundingClientRect().width || $(".timeline-body")?.getBoundingClientRect().width || 1;
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
  renderTimelineLayers();
  ensureWireLayer();
  $("#previewOverlay").innerHTML = "";
  qall(".timeline-track").forEach(t => t.innerHTML = "");
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
  let data = "";
  try {
    data = exportProject(project);
  } catch (e) {
    const message = storageFailureMessage(e);
    console.error("AUTOSAVE_FAILED", message);
    log(message);
    try { publishHostState(); } catch { /* hôte distant optionnel */ }
    return;
  }
  const saved = commitAutosave(localStorage, data, () => {
    markCrashRecovery(data);
    markProjectMeta(project.name, {
      workspace: localStorage.getItem("cvd.workspace") || "bureau"
    });
  });
  if (!saved.ok) {
    console.error("AUTOSAVE_FAILED", saved.message);
    log(saved.message);
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
function layerTypeMeta(type) {
  return ({
    video: { label:"Vidéo", kind:"video", description:"Sources et séquences vidéo." },
    effect: { label:"Effet", kind:"effect", description:"Effets de traitement et transformations vidéo." },
    shader: { label:"Shader", kind:"shader", description:"Rendu GLSL programmable, pour créer ou transformer des pixels." },
    shadow: { label:"Ombre", kind:"shadow", description:"Silhouette, ombre portée ou duplication visuelle d’une source." },
    cue: { label:"Cue", kind:"cue", description:"Déclencheurs et repères de conduite." },
    bridge: { label:"Liaison", kind:"bridge", description:"Liaisons vers des moteurs, périphériques ou contrôleurs." }
  }[type] || { label:"Layer", kind:"effect", description:"Calque timeline." });
}
function renderTimelineLayers() {
  const host = $("#timelineRows");
  if (!host) return;
  project.layers ||= [];
  host.innerHTML = project.layers.map((layer, index) => {
    const meta = layerTypeMeta(layer.type);
    const height = Math.max(24, Math.min(96, Number(layer.height) || 30));
    const selected = selectedTimelineLayerId === layer.id ? " selected" : "";
    return `<div class="timeline-layer-row${selected}" data-layer-id="${htmlSafe(layer.id)}" data-track="${index}" style="--layer-height:${height}px" role="row">
      <div class="timeline-track-label" role="gridcell"><span class="layer-type-dot layer-${htmlSafe(meta.kind)}"></span><span class="layer-name">${htmlSafe(layer.name || meta.label)}</span><span class="layer-index">${index + 1}</span></div>
      <div class="timeline-track" data-track="${index}" role="gridcell"></div>
      <div class="timeline-route" role="gridcell"><button class="route-btn" data-track-route="${index}">Principal</button></div>
      <div class="layer-row-resize" title="Redimensionner le layer"></div>
    </div>`;
  }).join("");
  for (const clip of project.timeline || []) drawClip(clip);
  updateRouteButtons();
  installTimelineLayerEvents();
}
function selectTimelineLayer(layerId) {
  const layer = (project.layers || []).find(l => l.id === layerId);
  if (!layer) return;
  selectedTimelineLayerId = layer.id;
  qall(".timeline-layer-row").forEach(row => row.classList.toggle("selected", row.dataset.layerId === layer.id));
  const meta = layerTypeMeta(layer.type);
  $("#inspectorType").textContent = `${layer.name} · ${meta.label}`;
  $("#inspectorBody").innerHTML = `<div class="layer-inspector"><b>${htmlSafe(layer.name)}</b><p class="hint">${htmlSafe(meta.description)}</p><p class="hint">${(project.timeline || []).filter(c => c.track === (project.layers || []).indexOf(layer)).length} clip(s) sur ce layer.</p></div>`;
}
function addTimelineLayer(type) {
  project.layers ||= [];
  const meta = layerTypeMeta(type);
  const count = project.layers.filter(l => l.type === type).length + 1;
  const layer = { id:`layer-${type}-${Date.now().toString(36)}`, type, name: count > 1 ? `${meta.label} ${count}` : meta.label, height:30 };
  project.layers.push(layer);
  selectedTimelineLayerId = layer.id;
  renderTimelineLayers();
  autosave();
  commitHistory();
  log(`Timeline · layer ${layer.name} ajouté`);
}
function installTimelineLayerEvents() {
  const host = $("#timelineRows");
  if (!host || host.dataset.bound === "1") return;
  host.dataset.bound = "1";
  let resize = null;
  host.addEventListener("click", event => {
    const route = event.target.closest("[data-track-route]");
    if (route) { openRouteSheet(Number(route.dataset.trackRoute)); return; }
    const row = event.target.closest(".timeline-layer-row");
    if (row) selectTimelineLayer(row.dataset.layerId);
  });
  host.addEventListener("mousedown", event => {
    const handle = event.target.closest(".layer-row-resize");
    if (!handle) return;
    const row = handle.closest(".timeline-layer-row");
    const index = Number(row?.dataset.track);
    if (!Number.isInteger(index) || !project.layers?.[index]) return;
    resize = { index, startY:event.clientY, start:Number(project.layers[index].height) || 30 };
    event.preventDefault();
    event.stopPropagation();
  });
  window.addEventListener("mousemove", event => {
    if (!resize) return;
    const layer = project.layers[resize.index];
    layer.height = Math.max(24, Math.min(96, resize.start + event.clientY - resize.startY));
    const row = host.querySelector(`.timeline-layer-row[data-track="${resize.index}"]`);
    if (row) row.style.setProperty("--layer-height", `${layer.height}px`);
  });
  window.addEventListener("mouseup", () => {
    if (!resize) return;
    resize = null; autosave(); commitHistory();
  });
}
$("#addLayer")?.addEventListener("click", event => { event.stopPropagation(); $("#layerAddMenu")?.classList.toggle("hidden"); });
qall("[data-add-layer]").forEach(button => button.addEventListener("click", () => { $("#layerAddMenu")?.classList.add("hidden"); addTimelineLayer(button.dataset.addLayer); }));
document.addEventListener("click", event => { if (!event.target.closest(".layer-add-wrap")) $("#layerAddMenu")?.classList.add("hidden"); });

function videoOutputPort(node) {
  if (!node) return null;
  const labels = portLabels(node.type, node) || [];
  for (let i = labels.length - 1; i >= 0; i--) {
    if (portDirection(node.type, i, labels.length, node) === "out" && portDataType(node.type, i, node) === "video") return i;
  }
  return null;
}

function connectNodes(fromNode, fromPort, toNode, toPort = 0) {
  if (refuseCanvasEdit("câblage")) return false;
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
  if (refuseCanvasEdit("Magic FX")) return;
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

function applySuperNodeV3(id) {
  if (refuseCanvasEdit("SuperNode")) return;
  const preset = superNodePreset(id);
  if (!preset) return log(`SuperNode inconnu · ${id}`);
  const source = selectedNode ? nodeById(selectedNode) : null;
  const n = addNode(preset.engine, source ? source.x + 220 : 340, source ? source.y + 20 : 160);
  applySuperNodePreset(n, id);

  if (source) {
    const outPort = videoOutputPort(source);
    const labels = portLabels(n.type, n) || [];
    const firstIsVideoInput = labels.length
      && portDirection(n.type, 0, labels.length, n) === "in"
      && portDataType(n.type, 0, n) === "video";
    if (outPort != null && firstIsVideoInput) connectNodes(source, outPort, n, 0);
  }

  redraw();
  selectNode(n.id);
  runtime.setProject(project);
  autosave();
  commitHistory();
  log(`SuperNode V3 · ${n.title}`);
  $("#magicFxModal")?.classList.add("hidden");
}
qall("[data-supernode]").forEach(b => b.onclick = () => applySuperNodeV3(b.dataset.supernode));

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
  performPanic();
};

async function performPanic() {
  const applied = applyCue(project, null, { panic: true, layout: companionLayout });
  project = applied.project;
  if (isRootGraph()) runtime.setProject(project);
  runtime.stop();
  syncPlayButton();
  redraw();
  autosave();
  let results = [];
  try {
    results = await dispatchPanicEffects(applied.effects, {
      sendOsc: runtime.oscUdpSend,
      sendArtNet: runtime.artnetUdpSend
    });
  } catch (error) {
    results = [{ kind: "osc", sent: false, reason: error?.message || String(error) }];
  }
  for (const line of formatPanicResult(applied.effects, results)) log(line);
}

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

let lastVibeOut = null;

async function askVibeOutAi(prompt, provider = "auto", target = "") {
  const cfg = readAiConfig();
  const task = /glsl|isf/i.test(String(target || "")) ? "shader" : "code";
  const routed = selectLocalAgents(cfg.localAgents || [], { task, limit:1 })[0];
  const localModel = routed?.model || cfg.localModel || "qwen2.5-coder:7b";
  const localBaseUrl = routed?.baseUrl || cfg.localBaseUrl || "http://127.0.0.1:11434";
  const local = () => requestAiForNode({
    protocol:"ollama",
    baseUrl:localBaseUrl,
    model:localModel,
    system:prompt.system,
    prompt:prompt.user,
    temperature:.12
  }).then(r => ({ ...r, provider:"local", agent:routed?.id || "", model:r.model || localModel }));
  const external = () => {
    if (!cfg.enabled || !cfg.endpoint) throw new Error("Endpoint externe non configuré");
    return requestAiForNode({
      protocol:"openai",
      endpoint:cfg.endpoint,
      model:cfg.model || "gpt-4o-mini",
      apiKey:cfg.apiKey || "",
      system:prompt.system,
      prompt:prompt.user,
      temperature:.12
    }).then(r => ({ ...r, provider:"external" }));
  };
  if (provider === "local") return local();
  if (provider === "external") return external();
  try { return await local(); }
  catch (e) {
    if (cfg.enabled && cfg.endpoint) return external();
    throw e;
  }
}
function vibeOutFallback(target) {
  if (target === "maxpat") return exportMax(project);
  if (target === "touchdesigner") return exportTouchDesigner(project);
  if (target === "puredata") return exportPureData(project);
  throw new Error("Pas de fallback structurel pour cette cible");
}

function vibeOutFileName(target, ext) {
  const base = String(project.name || "patch").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${base}-vibe-out.${ext || VIBE_OUT_TARGETS[target]?.extension || "txt"}`;
}

$("#vibeOutGenerate")?.addEventListener("click", async () => {
  const btn = $("#vibeOutGenerate");
  const copy = $("#vibeOutCopy");
  const dl = $("#vibeOutDownload");
  const status = $("#vibeOutStatus");
  const resultBox = $("#vibeOutResult");
  const target = $("#vibeOutTarget")?.value || "max";
  const provider = $("#vibeOutProvider")?.value || "auto";
  const instruction = $("#vibeOutInstruction")?.value?.trim() || "";
  const spec = VIBE_OUT_TARGETS[target];
  if (!spec) return;
  btn.disabled = true;
  copy.disabled = true;
  dl.disabled = true;
  status.textContent = "Génération…";
  resultBox.value = "";
  try {
    const fallback = ["maxpat","touchdesigner","puredata"].includes(target)
      ? () => vibeOutFallback(target)
      : null;
    const result = await generateVibeOut({
      target,
      project,
      instruction,
      askAi: prompt => askVibeOutAi(prompt, provider, target),
      fallback
    });
    lastVibeOut = { ...result, target, fileName:vibeOutFileName(target, result.extension) };
    resultBox.value = result.content || "";
    copy.disabled = !result.content;
    dl.disabled = !result.content;
    status.textContent = result.source === "ai"
      ? `Prêt · ${spec.label} · ${result.model || result.provider || "IA"}`
      : `Prêt · export structurel de secours${result.warning ? " · " + result.warning : ""}`;
    log(`Vibe Out · ${spec.label} · ${result.source}`);
  } catch (e) {
    lastVibeOut = null;
    status.textContent = "Échec · " + (e?.message || e);
    log("Vibe Out · ÉCHEC · " + (e?.message || e));
  } finally {
    btn.disabled = false;
  }
});

$("#vibeOutCopy")?.addEventListener("click", async () => {
  const content = lastVibeOut?.content || $("#vibeOutResult")?.value || "";
  if (!content) return;
  try {
    await navigator.clipboard.writeText(content);
    $("#vibeOutStatus").textContent = "Code copié · prêt à coller dans le logiciel cible";
  } catch {
    $("#vibeOutResult")?.select?.();
    document.execCommand?.("copy");
    $("#vibeOutStatus").textContent = "Code sélectionné/copier";
  }
});

$("#vibeOutDownload")?.addEventListener("click", () => {
  if (!lastVibeOut?.content) return;
  downloadText(lastVibeOut.content, lastVibeOut.fileName, lastVibeOut.mime || "text/plain");
});

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

function hideVibeThumb() {
  const thumb = $("#vibeImageThumb");
  if (!thumb) return;
  thumb.onload = null;
  thumb.onerror = null;
  thumb.classList.remove("is-ready");
  thumb.hidden = true;
  thumb.alt = "";
  thumb.removeAttribute("src");
}

function showVibeThumb(url) {
  const thumb = $("#vibeImageThumb");
  if (!thumb || !url) return hideVibeThumb();
  thumb.classList.remove("is-ready");
  thumb.hidden = true;
  thumb.alt = "";
  thumb.onload = () => {
    if (!thumb.getAttribute("src")) return;
    thumb.hidden = false;
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
    if ($("#vibeImageClear")) $("#vibeImageClear").hidden = false;
    $("#vibeImageInfo").textContent = imageVibeSummary(loaded.analysis);
    log(`Image Vibe · ${loaded.analysis.fileName || "image"} · analyse locale prête`);
  } catch (e) {
    hideVibeThumb();
    if ($("#vibeImageClear")) $("#vibeImageClear").hidden = true;
    log(`Image Vibe ÉCHEC · ${e?.message || e}`);
  }
}

function clearImageVibe() {
  if (imageVibeState.previewUrl) URL.revokeObjectURL(imageVibeState.previewUrl);
  imageVibeState = { analysis:null, previewUrl:"" };
  hideVibeThumb();
  if ($("#vibeImageClear")) $("#vibeImageClear").hidden = true;
  if ($("#vibeImageInfo")) $("#vibeImageInfo").textContent = "Image optionnelle";
}

$("#vibeImageFile")?.addEventListener("change", e => setImageVibeFile(e.target.files?.[0]));
$("#vibeImageClear")?.addEventListener("click", () => {
  clearImageVibe();
  if ($("#vibeImageFile")) $("#vibeImageFile").value = "";
});

async function applyVibeFromUi() {
  const text = $("#vibeText").value.trim();
  if (!text && !imageVibeState.analysis) { log("Vibe · texte ou image requis"); return; }
  log(imageVibeState.analysis ? "Image Vibe · analyse + génération…" : "Vibe · analyse…");
  $("#applyVibe").disabled = true;
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
  if (refuseCanvasEdit("application Vibe")) return;
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
  if (refuseCanvasEdit("ouverture de projet")) return;
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
  let localFailed = false;
  if (plan.persistLocal) {
    try { localStorage.setItem(MANUAL_SAVE_KEY, data); }
    catch (e) {
      localFailed = true;
      log(`Sauvegarde locale impossible · ${e.message || e}`);
    }
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
  if (announceManualSave(plan, localFailed)) log(saveStatusMessage(plan, fileName));
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
  if (refuseCanvasEdit("ouverture de projet")) { e.target.value = ""; return; }
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
  $("#modeBureau")?.classList.toggle("active", mode === "bureau");
  $("#modePlateau")?.classList.toggle("active", mode === "plateau");
  localStorage.setItem("cvd.workspace", mode);
  log(`Mode ${mode === "bureau" ? "Bureau" : "Plateau"}`);
}
if ($("#modeBureau")) $("#modeBureau").onclick = () => setWorkspaceMode("bureau");
if ($("#modePlateau")) $("#modePlateau").onclick = () => setWorkspaceMode("plateau");

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

function agentRoleOptions(agent) {
  const selected = agent?.roleOverride ? agent.role : "auto";
  return LOCAL_AGENT_ROLES.map(role => {
    const isSelected = role.id === selected ? " selected" : "";
    const label = role.id === "auto" ? `Auto · ${agent?.autoRole || "chat"}` : role.label;
    return `<option value="${htmlSafe(role.id)}"${isSelected}>${htmlSafe(label)}</option>`;
  }).join("");
}

function renderLocalAgentRegistry(agents = []) {
  const list = $("#aiAgentsList");
  const summary = $("#aiAgentsSummary");
  if (!list) return;
  const rows = Array.isArray(agents) ? agents : [];
  const stats = localAgentRegistrySummary(rows);
  if (summary) summary.textContent = rows.length
    ? `${stats.active}/${stats.total} actif(s)`
    : "Non détectés";
  if (!rows.length) {
    list.innerHTML = '<p class="hint">Détecte automatiquement les modèles Ollama disponibles, comme CX hub, puis choisis leur rôle.</p>';
    return;
  }
  list.innerHTML = rows.map((agent, index) => {
    const caps = Array.isArray(agent.capabilities) && agent.capabilities.length ? agent.capabilities.join(", ") : agent.reason || "capacité déduite du nom";
    const detail = [agent.parameterSize, agent.quantization, caps].filter(Boolean).join(" · ");
    const disabled = agent.generative === false ? " disabled" : "";
    const checked = agent.enabled !== false && agent.generative !== false ? " checked" : "";
    return `<div class="local-agent-row${agent.generative === false ? " unavailable" : ""}" data-agent-index="${index}">
      <input type="checkbox" data-agent-enabled aria-label="Activer ${htmlSafe(agent.model)}"${checked}${disabled}>
      <div class="local-agent-info"><b>${htmlSafe(agent.label || agent.model)}</b><small>${htmlSafe(detail)}</small></div>
      <select data-agent-role aria-label="Rôle de ${htmlSafe(agent.model)}"${disabled}>${agentRoleOptions(agent)}</select>
    </div>`;
  }).join("");
}

function routedAgentConfig(cfg, agents) {
  const selected = selectLocalAgents(agents, { task:"patch", limit:2 });
  return {
    ...cfg,
    localAgents:agents,
    localModel:selected[0]?.model || cfg.localModel || "qwen2.5-coder:7b",
    localSecondaryModel:selected[1]?.model || cfg.localSecondaryModel || "gemma3:1b"
  };
}

function persistAgentRegistryFromUi() {
  const current = readAiConfig();
  const agents = Array.isArray(current.localAgents) ? current.localAgents.map(a => ({ ...a })) : [];
  qall("#aiAgentsList [data-agent-index]").forEach(row => {
    const index = Number(row.dataset.agentIndex);
    const agent = agents[index];
    if (!agent) return;
    const enabled = row.querySelector("[data-agent-enabled]");
    const role = row.querySelector("[data-agent-role]")?.value || "auto";
    agent.enabled = agent.generative !== false && enabled?.checked !== false;
    if (role === "auto") {
      agent.role = agent.autoRole || agent.role || "chat";
      agent.roleOverride = "";
    } else {
      agent.role = role;
      agent.roleOverride = role;
    }
  });
  const next = routedAgentConfig(current, agents);
  saveAiConfig(next);
  if ($("#aiLocalModel")) $("#aiLocalModel").value = next.localModel;
  if ($("#aiLocalSecondaryModel")) $("#aiLocalSecondaryModel").value = next.localSecondaryModel;
  renderLocalAgentRegistry(agents);
  return next;
}

function openPreferences(tab = "general") {
  $("#preferencesModal").classList.remove("hidden");
  qall("[data-pref-tab]").forEach(b => b.classList.toggle("active", b.dataset.prefTab === tab));
  qall("[data-pref-panel]").forEach(p => p.classList.toggle("hidden", p.dataset.prefPanel !== tab));
  const ai = readAiConfig();
  if ($("#aiLocalEnabled")) $("#aiLocalEnabled").checked = ai.localEnabled !== false;
  if ($("#aiLocalBase")) $("#aiLocalBase").value = ai.localBaseUrl || "http://127.0.0.1:11434";
  if ($("#aiLocalModel")) $("#aiLocalModel").value = ai.localModel || "qwen2.5-coder:7b";
  if ($("#aiLocalSecondaryModel")) $("#aiLocalSecondaryModel").value = ai.localSecondaryModel || "gemma3:1b";
  if ($("#aiLocalParallel")) $("#aiLocalParallel").checked = ai.localParallel !== false;
  if ($("#aiEnabled")) $("#aiEnabled").checked = ai.enabled === true;
  if ($("#aiEndpoint")) $("#aiEndpoint").value = ai.endpoint || "";
  if ($("#aiKey")) $("#aiKey").value = ai.apiKey || "";
  if ($("#aiModel")) $("#aiModel").value = ai.model || "gpt-4o-mini";
  renderLocalAgentRegistry(ai.localAgents || []);
  if (tab === "ai" && ai.localEnabled !== false && !(ai.localAgents || []).length && !agentAutoScanAttempted) {
    agentAutoScanAttempted = true;
    queueMicrotask(() => $("#aiAgentsScan")?.click());
  }
  if ($("#versionInfo")) $("#versionInfo").textContent = BUILD_LABEL;
  try {
    const g = JSON.parse(localStorage.getItem("nvd.general") || "{}");
    if ($("#prefRestoreAutosave")) $("#prefRestoreAutosave").checked = g.restoreAutosave !== false;
    if ($("#prefPlugAndPlay")) $("#prefPlugAndPlay").checked = g.plugAndPlay !== false;
    if ($("#prefLoadDemo")) $("#prefLoadDemo").checked = g.loadDemo !== false;
    if ($("#prefTechnicalMode")) $("#prefTechnicalMode").checked = g.technicalMode === true;
    paintBackendReport();
  } catch { /* */ }
  if ($("#prefDefaultZoom")) $("#prefDefaultZoom").value = String(Math.round(view.scale * 100));
}
$("#preferencesBtn").onclick = () => openPreferences("general");
$("#preferencesClose").onclick = () => $("#preferencesModal").classList.add("hidden");
qall("[data-pref-tab]").forEach(b => b.onclick = () => openPreferences(b.dataset.prefTab));
qall("a.credit-link").forEach(anchor => {
  anchor.addEventListener("click", async event => {
    const open = window.nvdDesktop?.openExternal;
    if (typeof open !== "function") return;
    event.preventDefault();
    try {
      await open(anchor.href);
    } catch {
      window.open(anchor.href, "_blank", "noopener,noreferrer");
    }
  });
});

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
    localSecondaryModel: $("#aiLocalSecondaryModel")?.value?.trim() || "gemma3:1b",
    localParallel: $("#aiLocalParallel")?.checked !== false,
    localAgents: Array.isArray(readAiConfig().localAgents) ? readAiConfig().localAgents : [],
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

$("#aiInstallQwen")?.addEventListener("click", async () => {
  const status = $("#aiLocalStatus");
  try {
    if (status) status.textContent = "Installation Qwen…";
    await installLocalModel("qwen2.5-coder:7b");
    if (status) status.textContent = "Qwen installé · teste la connexion";
  } catch (e) {
    if (status) status.textContent = "Échec Qwen · " + (e?.message || e);
  }
});

$("#aiInstallGemma")?.addEventListener("click", async () => {
  const status = $("#aiLocalStatus");
  try {
    if (status) status.textContent = "Installation Gemma…";
    await installLocalModel("gemma3:1b");
    if (status) status.textContent = "Gemma installé · teste la connexion";
  } catch (e) {
    if (status) status.textContent = "Échec Gemma · " + (e?.message || e);
  }
});

$("#aiAgentsList")?.addEventListener("change", event => {
  if (!event.target.closest("[data-agent-enabled],[data-agent-role]")) return;
  const next = persistAgentRegistryFromUi();
  const stats = localAgentRegistrySummary(next.localAgents || []);
  log(`Agents locaux · ${stats.active}/${stats.total} actif(s)`);
});

$("#aiAgentsScan")?.addEventListener("click", async () => {
  const summary = $("#aiAgentsSummary");
  const button = $("#aiAgentsScan");
  const base = $("#aiLocalBase")?.value?.trim() || "http://127.0.0.1:11434";
  const current = { ...readAiConfig(), ...collectAiConfig(), localBaseUrl:base };
  if (summary) summary.textContent = "Détection…";
  if (button) button.disabled = true;
  try {
    const agents = await scanLocalAgents({ baseUrl:base, saved:current.localAgents || [] });
    const next = routedAgentConfig(current, agents);
    saveAiConfig(next);
    if ($("#aiLocalModel")) $("#aiLocalModel").value = next.localModel;
    if ($("#aiLocalSecondaryModel")) $("#aiLocalSecondaryModel").value = next.localSecondaryModel;
    renderLocalAgentRegistry(agents);
    const stats = localAgentRegistrySummary(agents);
    log(`Agents locaux · ${stats.total} détecté(s) · ${stats.active} actif(s) · principal ${next.localModel}`);
  } catch (e) {
    if (summary) summary.textContent = "Détection impossible";
    log(`Agents locaux · ${e?.message || e}`);
  } finally {
    if (button) button.disabled = false;
  }
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
    const selectedModels = Array.isArray(result.localModels) ? result.localModels : [selected].filter(Boolean);
    if ($("#aiLocalModel") && selected) $("#aiLocalModel").value = selected;
    const second = selectedModels.find(m => m !== selected) || cfg.localSecondaryModel;
    if ($("#aiLocalSecondaryModel") && second) $("#aiLocalSecondaryModel").value = second;
    saveAiConfig({ ...cfg, localModel:selected, localSecondaryModel:second });
    if (result.notice) {
      const present = names.length ? ` · modèles présents : ${names.join(", ")}` : "";
      if (status) status.textContent = result.notice + present;
      log(`Local AI Core · ${result.notice}`);
    } else if (status) {
      status.textContent = `Prêt · ${selectedModels.join(" + ") || selected} · ${names.length} modèle(s)`;
      log(`Local AI Core · prêt · ${selectedModels.join(" + ") || selected}`);
    }
  } else {
    const message = result.error || result.failure?.message || "Ollama inaccessible";
    if (status) status.textContent = message;
    log(`Local AI Core · ${message}`);
  }
});

$("#clearAutosave")?.addEventListener("click", () => {
  localStorage.removeItem("cvd.autosave");
  log("Autosave effacée");
});
$("#prefRestoreAutosave")?.addEventListener("change", () => { writeGeneralPrefsFromUi(); });
$("#prefLoadDemo")?.addEventListener("change", () => { writeGeneralPrefsFromUi(); });
$("#prefTechnicalMode")?.addEventListener("change", () => { writeGeneralPrefsFromUi(); paintBackendReport(); });
$("#backendReport")?.addEventListener("click", event => {
  const link = event.target?.closest?.("[data-refresh-backends]");
  if (!link) return;
  event.preventDefault();
  agentRegistryDoc = null;
  if (globalThis.nvdDesktop?.agentRegistry) {
    globalThis.nvdDesktop.agentRegistry({ refresh: true }).then(doc => { agentRegistryDoc = doc; paintBackendReport(); }).catch(err => log(`Registre · ${err?.message || err}`));
  } else {
    agentRegistryDoc = browserProbeRegistry(document.createElement("canvas").getContext("webgl2"));
    paintBackendReport();
  }
});
$("#prefPlugAndPlay")?.addEventListener("change", async () => {
  const next = writeGeneralPrefsFromUi();
  renderPnpStatus();
  if (next.plugAndPlay !== false) await runPlugAndPlayProbe();
  else log("Plug & Play · désactivé");
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
    if (refuseCanvasEdit("annulation")) return;
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
    if (refuseCanvasEdit("rétablissement")) return;
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
  const percent = `${Math.round(view.scale * 100)} %`;
  if ($("#zoomReset")) {
    $("#zoomReset").textContent = percent;
    $("#zoomReset").title = view.scale === 1 ? "Centrer la vue" : `Centrer · revenir à 100 % (actuellement ${percent})`;
  }
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

const floatPanels = installFloatPanels();
qall(".collapse").forEach(b => b.onclick = () => {
  const panel = b.closest(".panel");
  if (panel?.classList.contains("floatable")) floatPanels.toggleCollapse(panel);
  else panel?.classList.toggle("collapsed");
});
$("#search").oninput = () => buildLibrary();
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
    else if (v === "ai agents") {
      const cfg = readAiConfig();
      const agents = await scanLocalAgents({ baseUrl:cfg.localBaseUrl, saved:cfg.localAgents || [] });
      const next = routedAgentConfig(cfg, agents);
      saveAiConfig(next);
      renderLocalAgentRegistry(agents);
      log(`Agents locaux · ${agents.length} détecté(s) · principal ${next.localModel}`);
    }
    else if (v === "output secondary") openOutput("local-window");
    else if (v === "demo" || v === "load demo") {
      enterShowcaseDemo({ preserve: true });
    } else if (v === "exit" || v === "exit demo") {
      exitShowcaseDemo();
    } else if (v === "ai probe") {
      const result = await probeLocalAi(readAiConfig(), { fresh:true });
      log(result.ok
        ? `AI · ${(result.localModels || [result.model]).filter(Boolean).join(" + ") || "Ollama"}${result.notice ? " · " + result.notice : ""}`
        : `AI · ${result.error || "Ollama inaccessible"}`);
    } else if (v === "ai install qwen") {
      await installLocalModel("qwen2.5-coder:7b");
    } else if (v === "ai install gemma") {
      await installLocalModel("gemma3:1b");
    } else if (v.startsWith("ai host ")) {
      const host = raw.slice(8).trim();
      if (!/^https?:\/\//i.test(host)) throw new Error("Exemple : ai host http://192.168.1.20:11434");
      const cfg = { ...readAiConfig(), localBaseUrl:host };
      saveAiConfig(cfg);
      log(`AI · hôte local/LAN = ${host}`);
    } else if (v.startsWith("ai model ")) {
      const model = raw.slice(9).trim();
      if (!model) throw new Error("Nom de modèle requis");
      const cfg = { ...readAiConfig(), localModel:model };
      saveAiConfig(cfg);
      log(`AI · modèle principal = ${model}`);
    } else if (v.startsWith("ai endpoint ")) {
      const endpoint = raw.slice(12).trim();
      if (!/^https?:\/\//i.test(endpoint)) throw new Error("Endpoint HTTP/HTTPS requis");
      const cfg = { ...readAiConfig(), enabled:true, endpoint };
      const allowed = assertAiProviderAllowed(cfg);
      if (!allowed.ok) throw new Error(allowed.error);
      saveAiConfig(cfg);
      log(`AI · endpoint externe = ${endpoint}`);
    } else if (v === "ai add" || v === "node ai") {
      addNode("ai");
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

let generalPrefs = { restoreAutosave: true, loadDemo: true, plugAndPlay: true };
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
if (project.nodes.length === 0 && generalPrefs.loadDemo !== false && localStorage.getItem(DEMO_DISMISSED_KEY) !== "1") {
  try { demoReturnProject = JSON.parse(JSON.stringify(project)); } catch { demoReturnProject = newProject(); }
  project = createDemoProject();
  setDemoBanner(true);
  log("EXEMPLE · Wow interactif initialisé · aucune permission requise");
} else {
  setDemoBanner(false);
}
$("#demoExitBtn")?.addEventListener("click", exitShowcaseDemo);
$("#loadExampleBtn")?.addEventListener("click", () => enterShowcaseDemo());
renderPnpStatus();
if (generalPrefs.plugAndPlay !== false) {
  queueMicrotask(() => runPlugAndPlayProbe({ silent:true }));
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
  const explicitCompanion = params.get("companionHost") === "1";
  // Le desktop autonome ne tente jamais une connexion distante implicite.
  // Une session WS n'est activée que par un paramètre explicite.
  if (!query && !explicitCompanion) return;
  const url = query && /^wss?:/i.test(query) ? query : `ws://127.0.0.1:${window.nvdDesktop?.remotePort || REMOTE_PORT}`;
  remoteSession = connectRemote({
    url,
    role: "host",
    clientId: "desktop",
    getState: () => ({ revision: remoteRevision, project }),
    setState: ({ revision, project: next }) => {
      if (refuseCanvasEdit("synchro distante du patch")) return;
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
      openCompanionEditor(clientId);
      log("Companion · Éditeur ouvert");
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
