import { STUDIO_MODES, normalizeWidget } from "/shared/companion-studio/schema.js";
import { ensureCompanionLayout, saveCompanionLayout } from "/shared/companion-studio/store.js";
import { createWsCompanionTransport } from "/shared/companion-studio/transport-ws.js";
import { STUDIO_MSG, makeStudioAction } from "/shared/companion-studio/protocol.js";
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

function syncEditor() {
  const w = findWidget(doc, selectedId);
  if (!w) return;
  $("edLabel").value = w.presentation?.label || "";
  $("edSecondary").value = w.presentation?.secondary || "";
  $("edColor").value = w.presentation?.color || "#d7b86a";
  const bind = `${w.binding?.kind || "action"}:${w.binding?.action || "ping"}`;
  $("edBinding").value = [...$("edBinding").options].some((o) => o.value === bind) ? bind : "action:ping";
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
  const [kind, action] = String($("edBinding").value || "action:ping").split(":");
  w.binding.kind = kind;
  w.binding.action = action;
  saveCompanionLayout(doc);
  renderGrid();
  log("Widget mis à jour · layout local sauvé");
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
  renderGrid();
};

$("btnSave").onclick = () => {
  saveCompanionLayout(doc);
  log(`Layout sauvé · ${doc.name}`);
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

$("btnDisconnect").onclick = () => {
  transport?.disconnect();
  transport = null;
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
