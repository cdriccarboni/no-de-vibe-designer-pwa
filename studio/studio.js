import { STUDIO_MODES, normalizeWidget, validateCompanionDocument } from "/shared/companion-studio/schema.js";
import { ensureCompanionLayout, saveCompanionLayout } from "/shared/companion-studio/store.js";
import { createWsCompanionTransport } from "/shared/companion-studio/transport-ws.js";
import { STUDIO_MSG, makeStudioAction, makeStudioLayout } from "/shared/companion-studio/protocol.js";
import { findWidget } from "/shared/companion-studio/bindings.js";
import { loadRememberedHost } from "/shared/discovery/host-card.js";

const $ = (id) => document.getElementById(id);
const logEl = $("log");
const grid = $("grid");
const netStatus = $("netStatus");

let mode = STUDIO_MODES.EDITION;
let doc = ensureCompanionLayout();
let selectedId = doc.pages[0]?.widgets?.[0]?.id || null;
let transport = null;
let layoutRevision = 0;
let monitorLastAt = 0;
const clientId = `studio-${Math.random().toString(36).slice(2, 7)}`;

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.textContent = `${line}\n${logEl.textContent}`.slice(0, 4000);
  console.info(line);
}

function currentPage() {
  return doc.pages[0];
}

function renderGrid() {
  const page = currentPage();
  grid.style.gridTemplateColumns = `repeat(${page.cols || 4}, 1fr)`;
  grid.innerHTML = "";
  for (const w of page.widgets || []) {
    if (w.presentation?.visible === false) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cs-widget" + (w.id === selectedId ? " sel" : "");
    btn.style.background = w.presentation?.color || "#d7b86a";
    btn.style.color = w.presentation?.textColor || "#0f1113";
    btn.style.gridColumn = `span ${Math.max(1, w.presentation?.w || 1)}`;
    btn.style.gridRow = `span ${Math.max(1, w.presentation?.h || 1)}`;
    btn.dataset.id = w.id;
    btn.innerHTML = `<span>${escapeHtml(w.presentation?.label || w.type)}</span>${
      w.presentation?.secondary ? `<small>${escapeHtml(w.presentation.secondary)}</small>` : ""
    }${w.state?.feedback != null ? `<small>${escapeHtml(String(w.state.feedback))}</small>` : ""}`;
    btn.onclick = () => onWidgetClick(w.id);
    grid.appendChild(btn);
  }
  syncEditor();
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function targetForWidget(w) {
  const b = w?.binding || {};
  if (b.kind === "osc") return `${b.oscAddress || "/nvd/companion"}@${b.oscHost || "127.0.0.1"}:${b.oscPort || 9000}`;
  if (b.kind === "serial") return b.serialText || "COMPANION {value}";
  if (b.kind === "midi") return (b.midiData || [176,0,-1]).join(",");
  if (b.kind === "camera") return b.cameraAction || b.action || "toggle";
  if (b.kind === "video") return b.videoAction || b.action || "toggle";
  return "";
}

function syncEditor() {
  const w = findWidget(doc, selectedId);
  if (!w) return;
  $("edLabel").value = w.presentation?.label || "";
  $("edSecondary").value = w.presentation?.secondary || "";
  $("edColor").value = w.presentation?.color || "#d7b86a";
  $("edW").value = Math.max(1, Math.min(4, Number(w.presentation?.w) || 1));
  $("edH").value = Math.max(1, Math.min(6, Number(w.presentation?.h) || 1));
  const bind = `${w.binding?.kind || "action"}:${w.binding?.action || "ping"}`;
  $("edBinding").value = [...$("edBinding").options].some((o) => o.value === bind) ? bind : "action:ping";
  $("edTarget").value = targetForWidget(w);
  const needsTarget = ["osc","serial","midi","camera","video"].includes(w.binding?.kind);
  $("edTargetWrap").style.display = needsTarget ? "grid" : "none";
}

function onWidgetClick(id) {
  selectedId = id;
  const w = findWidget(doc, id);
  if (mode === STUDIO_MODES.EDITION) {
    renderGrid();
    return;
  }
  // TEST or PLATEAU — fire real action
  fireAction(w);
  renderGrid();
}

function fireAction(w) {
  if (!w) return;
  const value = w.binding?.momentary || w.type === "momentary" ? true : (w.binding?.valueOn ?? true);
  const msg = makeStudioAction({
    widgetId: w.id,
    action: w.binding?.action || "press",
    value,
    clientId
  });
  if (!transport || transport.state !== "CONNECTED") {
    log("Pas de lien — action locale seulement (sauve layout OK)");
    w.state = { ...(w.state || {}), feedback: "offline" };
    flash(w.id, false);
    return;
  }
  try {
    transport.send(msg);
    log(`Action → ${w.id} · ${w.binding?.kind}/${w.binding?.action}`);
  } catch (e) {
    log(e.message || String(e));
  }
}

function flash(id, ok) {
  const el = grid.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.classList.add(ok ? "flash" : "err");
  setTimeout(() => el.classList.remove("flash", "err"), 280);
}

function syncLayoutToHost() {
  if (!transport || transport.state !== "CONNECTED") return false;
  layoutRevision += 1;
  try {
    transport.send({ ...makeStudioLayout(doc, { revision: layoutRevision }), clientId });
    return true;
  } catch (e) {
    log(`Sync layout · ${e.message || e}`);
    return false;
  }
}

function hideMonitor() {
  $("monitorPanel").hidden = true;
  $("monitorFrame").removeAttribute("src");
  $("monitorInfo").textContent = "—";
  monitorLastAt = 0;
}

function parseBindingTarget(w, kind, action, raw) {
  const value = String(raw || "").trim();
  w.binding.kind = kind;
  w.binding.action = action;
  if (kind === "osc") {
    const at = value.lastIndexOf("@");
    const address = at >= 0 ? value.slice(0, at) : value;
    const hostPort = at >= 0 ? value.slice(at + 1) : "127.0.0.1:9000";
    const colon = hostPort.lastIndexOf(":");
    w.binding.oscAddress = address.startsWith("/") ? address : "/nvd/companion";
    w.binding.oscHost = colon >= 0 ? hostPort.slice(0, colon) || "127.0.0.1" : hostPort || "127.0.0.1";
    w.binding.oscPort = colon >= 0 ? Math.max(1, Math.min(65535, Number(hostPort.slice(colon + 1)) || 9000)) : 9000;
  } else if (kind === "serial") {
    w.binding.serialText = value || "COMPANION {value}";
  } else if (kind === "midi") {
    const data = value.split(",").map(v => Number(v.trim())).filter(Number.isFinite).slice(0, 3);
    w.binding.midiData = data.length ? data : [176, 0, -1];
  } else if (kind === "camera") {
    w.binding.cameraAction = value || action || "toggle";
  } else if (kind === "video") {
    w.binding.videoAction = value || action || "toggle";
  }
}

function setMode(next) {
  mode = next;
  document.body.className = `mode-${mode}`;
  document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  log(`Mode · ${mode}`);
}

document.querySelectorAll("[data-mode]").forEach((b) => {
  b.onclick = () => setMode(b.dataset.mode);
});

$("edApply").onclick = () => {
  if (mode === STUDIO_MODES.PLATEAU) return;
  const w = findWidget(doc, selectedId);
  if (!w) return;
  w.presentation.label = $("edLabel").value.trim() || w.presentation.label;
  w.presentation.secondary = $("edSecondary").value.trim();
  w.presentation.color = $("edColor").value;
  w.presentation.w = Math.max(1, Math.min(4, Number($("edW").value) || 1));
  w.presentation.h = Math.max(1, Math.min(6, Number($("edH").value) || 1));
  const [kind, action] = String($("edBinding").value || "action:ping").split(":");
  parseBindingTarget(w, kind, action, $("edTarget").value);
  saveCompanionLayout(doc);
  syncLayoutToHost();
  renderGrid();
  log("Widget mis à jour · layout sauvé + synchronisé");
};

$("edAdd").onclick = () => {
  if (mode === STUDIO_MODES.PLATEAU) return;
  const page = currentPage();
  const w = normalizeWidget({
    type: "button",
    presentation: { label: `B${(page.widgets?.length || 0) + 1}`, x: 0, y: 0, w: 2, h: 1, color: "#d7b86a" },
    binding: { kind: "action", action: "ping" }
  });
  page.widgets.push(w);
  selectedId = w.id;
  saveCompanionLayout(doc);
  syncLayoutToHost();
  renderGrid();
};

$("edDelete").onclick = () => {
  if (mode === STUDIO_MODES.PLATEAU) return;
  const page = currentPage();
  page.widgets = (page.widgets || []).filter(w => w.id !== selectedId);
  selectedId = page.widgets[0]?.id || null;
  saveCompanionLayout(doc);
  syncLayoutToHost();
  renderGrid();
  log("Widget supprimé");
};

$("edBinding").onchange = () => {
  const kind = String($("edBinding").value || "action:ping").split(":")[0];
  $("edTargetWrap").style.display = ["osc","serial","midi","camera","video"].includes(kind) ? "grid" : "none";
};

$("btnSave").onclick = () => {
  saveCompanionLayout(doc);
  syncLayoutToHost();
  log(`Layout sauvé + synchronisé · ${doc.name}`);
};

$("btnConnect").onclick = async () => {
  try {
    transport?.disconnect();
    const url = ($("wsUrl").value || "").trim();
    if (!url) throw new Error("URL WS requise (ex. ws://127.0.0.1:4174)");
    transport = createWsCompanionTransport({
      url,
      clientId,
      pairCode: ($("pairCode").value || "").trim(),
      onMessage: (msg) => {
        if (msg.type === STUDIO_MSG.LAYOUT && msg.layout) {
          try {
            doc = validateCompanionDocument(msg.layout);
            saveCompanionLayout(doc);
            selectedId = doc.pages[0]?.widgets?.[0]?.id || null;
            layoutRevision = Math.max(layoutRevision, Number(msg.revision) || 0);
            renderGrid();
            transport?.send({
              type: STUDIO_MSG.LAYOUT_ACK,
              clientId,
              revision: msg.revision || layoutRevision,
              ok: true,
              t: Date.now()
            });
            log(`Layout ← hôte · ${doc.name}`);
          } catch (e) {
            log(`Layout invalide ← hôte · ${e.message || e}`);
          }
          return;
        }
        if (msg.type === STUDIO_MSG.LAYOUT_ACK) {
          log(msg.ok === false ? `Layout refusé · ${msg.error || "?"}` : `Layout ACK · rev ${msg.revision || "?"}`);
          return;
        }
        if (msg.type === STUDIO_MSG.MONITOR_START) {
          $("monitorPanel").hidden = false;
          $("monitorInfo").textContent = `${msg.width || 480}px · ${msg.fps || 8} fps cible`;
          log("Monitor ← hôte · démarré");
          return;
        }
        if (msg.type === STUDIO_MSG.MONITOR_FRAME && typeof msg.frame === "string") {
          $("monitorPanel").hidden = false;
          $("monitorFrame").src = msg.frame;
          monitorLastAt = Date.now();
          const age = typeof msg.sentAt === "number" ? Math.max(0, Date.now() - msg.sentAt) : null;
          $("monitorInfo").textContent = age == null ? "LIVE" : `frame ${age} ms`;
          return;
        }
        if (msg.type === STUDIO_MSG.MONITOR_STOP) {
          hideMonitor();
          log("Monitor ← hôte · coupé");
          return;
        }
        if (msg.type === STUDIO_MSG.FEEDBACK) {
          const w = findWidget(doc, msg.widgetId);
          if (w) {
            w.state = { value: msg.value, feedback: msg.detail || (msg.ok ? "OK" : "ERR") };
            flash(w.id, !!msg.ok);
            renderGrid();
          }
          const rtt = typeof msg.rttMs === "number" ? ` · host ${Math.round(msg.rttMs)} ms` : "";
          log(`Feedback ← ${msg.widgetId}${rtt} · ${msg.ok ? "OK" : msg.detail || "ERR"}`);
          return;
        }
        if (msg.type === STUDIO_MSG.HELLO_ACK || msg.type === "hello-ack") {
          log("Studio hello-ack");
        }
        if (msg.type === STUDIO_MSG.DETECT) {
          log(`Detect ← hôte · ${msg.detail || "Companion vu"}`);
        }
      },
      onLog: log
    });
    transport.onStatus(({ state }) => {
      netStatus.textContent = transport.statusLine();
      if (state) log(`Transport · ${state}`);
    });
    await transport.connect();
    localStorage.setItem("nvd.companion.ws", url);
    netStatus.textContent = transport.statusLine();
    log("Connecté");
  } catch (e) {
    netStatus.textContent = `ERROR · ${e.message || e}`;
    log(e.message || String(e));
  }
};

$("btnRequestMonitor").onclick = () => {
  if (!transport || transport.state !== "CONNECTED") return log("Monitor · connecte d'abord le Studio");
  transport.send({ type: STUDIO_MSG.MONITOR_START, clientId, t: Date.now() });
  log("Monitor · demande envoyée");
};

$("btnStopMonitor").onclick = () => {
  try { transport?.send({ type: STUDIO_MSG.MONITOR_STOP, clientId, t: Date.now() }); } catch { /* */ }
  hideMonitor();
  log("Monitor · stop demandé");
};

$("btnDisconnect").onclick = () => {
  try { transport?.send({ type: STUDIO_MSG.MONITOR_STOP, clientId, t: Date.now() }); } catch { /* */ }
  transport?.disconnect();
  transport = null;
  hideMonitor();
  netStatus.textContent = "DISCONNECTED";
  log("Déconnecté");
};

// Boot: remember host / last WS
try {
  const remembered = loadRememberedHost(localStorage);
  const saved = localStorage.getItem("nvd.companion.ws");
  $("wsUrl").value = saved || remembered?.wsUrl || "ws://127.0.0.1:4174";
} catch {
  $("wsUrl").value = "ws://127.0.0.1:4174";
}

setMode(STUDIO_MODES.EDITION);
renderGrid();
log("Companion Studio prêt · Local First · connecte le pont pour feedback bidirectionnel");
