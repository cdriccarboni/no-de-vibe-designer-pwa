import { STUDIO_MODES, normalizeWidget, validateCompanionDocument } from "/shared/companion-studio/schema.js";
import { ensureCompanionLayout, saveCompanionLayout } from "/shared/companion-studio/store.js";
import { createWsCompanionTransport } from "/shared/companion-studio/transport-ws.js";
import { STUDIO_MSG, makeStudioAction, makeStudioLayout } from "/shared/companion-studio/protocol.js";
import { findWidget } from "/shared/companion-studio/bindings.js";
import { loadRememberedHost } from "/shared/discovery/host-card.js";
import { CONSOLE_PROFILES, PROTOCOL_FAMILIES } from "/shared/companion-studio/console-profiles.js";
import { mergeRegieProfiles } from "/shared/companion-studio/layout-generator.js";

const $ = (id) => document.getElementById(id);
const logEl = $("log");
const grid = $("grid");
const netStatus = $("netStatus");

let mode = STUDIO_MODES.EDITION;
let doc = ensureCompanionLayout();
let pageIndex = 0;
let selectedId = doc.pages[0]?.widgets?.[0]?.id || null;
let transport = null;
let layoutRevision = 0;
let monitorLastAt = 0;
let swipeStart = null;
const clientId = `studio-${Math.random().toString(36).slice(2, 7)}`;

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.textContent = `${line}\n${logEl.textContent}`.slice(0, 4000);
  console.info(line);
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function currentPage() {
  if (!doc.pages?.length) doc = ensureCompanionLayout();
  pageIndex = Math.max(0, Math.min(doc.pages.length - 1, pageIndex));
  return doc.pages[pageIndex];
}

function setPage(index, { focus = false } = {}) {
  const next = Math.max(0, Math.min((doc.pages?.length || 1) - 1, Number(index) || 0));
  if (next === pageIndex && !focus) return;
  pageIndex = next;
  selectedId = currentPage()?.widgets?.[0]?.id || null;
  renderPageNav();
  renderGrid();
  if (focus) grid.focus?.();
}

function renderPageNav() {
  const tabs = $("pageTabs");
  tabs.innerHTML = (doc.pages || []).map((p, i) =>
    `<button type="button" class="page-tab ${i === pageIndex ? "active" : ""}" data-page="${i}">
      <span>${escapeHtml(p.icon || "")}</span><b>${escapeHtml(p.name || `Page ${i + 1}`)}</b>
    </button>`
  ).join("");
  tabs.querySelectorAll("[data-page]").forEach(btn => btn.onclick = () => setPage(+btn.dataset.page));
  $("pagePrev").disabled = pageIndex <= 0;
  $("pageNext").disabled = pageIndex >= (doc.pages?.length || 1) - 1;
}

function widgetHtml(w) {
  const label = escapeHtml(w.presentation?.label || w.type);
  const secondary = w.presentation?.secondary ? `<small>${escapeHtml(w.presentation.secondary)}</small>` : "";
  const feedback = w.state?.feedback != null ? `<small class="feedback">${escapeHtml(String(w.state.feedback))}</small>` : "";
  return `<span>${label}</span>${secondary}${feedback}`;
}

function applyWidgetPresentation(el, w) {
  el.style.background = w.presentation?.color || "#d7b86a";
  el.style.color = w.presentation?.textColor || "#0f1113";
  el.style.gridColumn = `span ${Math.max(1, w.presentation?.w || 1)}`;
  el.style.gridRow = `span ${Math.max(1, w.presentation?.h || 1)}`;
  el.dataset.id = w.id;
}

function renderGrid() {
  const page = currentPage();
  grid.style.gridTemplateColumns = `repeat(${page.cols || 4}, 1fr)`;
  grid.innerHTML = "";

  for (const w of page.widgets || []) {
    if (w.presentation?.visible === false) continue;

    if (w.type === "fader") {
      const wrap = document.createElement("div");
      wrap.className = "cs-widget cs-fader" + (w.id === selectedId ? " sel" : "");
      applyWidgetPresentation(wrap, w);
      const value = Number.isFinite(Number(w.state?.value)) ? Number(w.state.value) : 0;
      wrap.innerHTML = `<span>${escapeHtml(w.presentation?.label || "Fader")}</span>
        ${w.presentation?.secondary ? `<small>${escapeHtml(w.presentation.secondary)}</small>` : ""}
        <input class="fader-input" type="range" min="0" max="1" step="0.005" value="${Math.max(0, Math.min(1, value))}">
        <small class="fader-value">${Math.round(Math.max(0, Math.min(1, value)) * 100)}%</small>`;
      wrap.onclick = (e) => {
        if (e.target.matches("input")) return;
        if (mode === STUDIO_MODES.EDITION) {
          selectedId = w.id;
          renderGrid();
        }
      };
      const input = wrap.querySelector("input");
      input.disabled = mode === STUDIO_MODES.EDITION;
      input.oninput = () => {
        const v = +input.value;
        w.state = { ...(w.state || {}), value: v };
        wrap.querySelector(".fader-value").textContent = `${Math.round(v * 100)}%`;
        if (mode !== STUDIO_MODES.EDITION) fireAction(w, v);
      };
      grid.appendChild(wrap);
      continue;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cs-widget" + (w.id === selectedId ? " sel" : "") + (w.type === "toggle" ? " cs-toggle" : "");
    applyWidgetPresentation(btn, w);
    btn.innerHTML = widgetHtml(w);

    if (w.type === "momentary") {
      btn.onpointerdown = (e) => {
        if (mode === STUDIO_MODES.EDITION) return;
        e.preventDefault();
        fireAction(w, true);
      };
      const release = () => {
        if (mode !== STUDIO_MODES.EDITION) fireAction(w, false);
      };
      btn.onpointerup = release;
      btn.onpointercancel = release;
      btn.onpointerleave = (e) => { if (e.buttons) release(); };
      btn.onclick = () => {
        if (mode === STUDIO_MODES.EDITION) {
          selectedId = w.id;
          renderGrid();
        }
      };
    } else {
      btn.onclick = () => onWidgetClick(w.id);
    }
    grid.appendChild(btn);
  }
  syncEditor();
}

function targetForWidget(w) {
  const b = w?.binding || {};
  if (b.kind === "osc") return `${b.oscAddress || "/nvd/companion"}@${b.oscHost || "127.0.0.1"}:${b.oscPort || 9000}`;
  if (b.kind === "artnet") return `U${b.universe ?? 0}/CH${b.channel || 1}@${b.artnetHost || "255.255.255.255"}:${b.artnetPort || 6454}`;
  if (b.kind === "sacn") return `U${Math.max(1, b.universe || 1)}/CH${b.channel || 1}@${b.sacnHost || "multicast"}:${b.sacnPort || 5568}`;
  if (b.kind === "serial") return b.serialText || "COMPANION {value}";
  if (b.kind === "midi") return (b.midiData || [176,0,-1]).join(",");
  if (b.kind === "camera") return b.cameraAction || b.action || "toggle";
  if (b.kind === "video") return b.videoAction || b.action || "toggle";
  return "";
}

function syncEditor() {
  const w = findWidget(doc, selectedId);
  if (!w) {
    $("editor").classList.toggle("no-selection", true);
    return;
  }
  $("editor").classList.toggle("no-selection", false);
  $("edLabel").value = w.presentation?.label || "";
  $("edSecondary").value = w.presentation?.secondary || "";
  $("edColor").value = w.presentation?.color || "#d7b86a";
  $("edW").value = Math.max(1, Math.min(4, Number(w.presentation?.w) || 1));
  $("edH").value = Math.max(1, Math.min(6, Number(w.presentation?.h) || 1));
  const bind = `${w.binding?.kind || "action"}:${w.binding?.action || "ping"}`;
  $("edBinding").value = [...$("edBinding").options].some((o) => o.value === bind) ? bind : "action:ping";
  $("edTarget").value = targetForWidget(w);
  const needsTarget = ["osc","artnet","sacn","serial","midi","camera","video"].includes(w.binding?.kind);
  $("edTargetWrap").style.display = needsTarget ? "grid" : "none";
}

function onWidgetClick(id) {
  selectedId = id;
  const w = findWidget(doc, id);
  if (mode === STUDIO_MODES.EDITION) {
    renderGrid();
    return;
  }
  if (w?.type === "toggle") {
    const next = !(w.state?.value === true);
    w.state = { ...(w.state || {}), value: next };
    fireAction(w, next);
  } else {
    fireAction(w);
  }
  renderGrid();
}

function fireAction(w, explicitValue) {
  if (!w) return;
  const value = explicitValue !== undefined
    ? explicitValue
    : (w.binding?.momentary || w.type === "momentary" ? true : (w.binding?.valueOn ?? true));
  const msg = makeStudioAction({
    widgetId: w.id,
    action: w.binding?.action || "press",
    value,
    clientId
  });
  if (!transport || transport.state !== "CONNECTED") {
    log("Pas de lien — action locale seulement (layout conservé)");
    w.state = { ...(w.state || {}), value, feedback: "offline" };
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

function parseDmxTarget(value, kind, w) {
  const m = String(value || "").trim().match(/^U(\d+)\/CH(\d+)(?:@([^:]+)?(?::(\d+))?)?$/i);
  if (!m) return;
  w.binding.universe = kind === "sacn" ? Math.max(1, Number(m[1]) || 1) : Math.max(0, Number(m[1]) || 0);
  w.binding.channel = Math.max(1, Math.min(512, Number(m[2]) || 1));
  const host = m[3] || "";
  const port = Number(m[4]) || (kind === "sacn" ? 5568 : 6454);
  if (kind === "sacn") {
    w.binding.sacnHost = host.toLowerCase() === "multicast" ? "" : host;
    w.binding.sacnPort = port;
  } else {
    w.binding.artnetHost = host || "255.255.255.255";
    w.binding.artnetPort = port;
  }
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
  } else if (kind === "artnet" || kind === "sacn") {
    parseDmxTarget(value, kind, w);
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
  renderGrid();
  log(`Mode · ${mode}`);
}

function profileCategoryLabel(cat) {
  return ({lighting:"Lumière",sound:"Son",video:"Vidéo",utility:"Outils"})[cat] || cat;
}

function renderRegieProfiles() {
  const selected = new Set(doc.meta?.profileIds || []);
  const groups = ["lighting","sound","video","utility"];
  $("profileList").innerHTML = groups.map(cat => {
    const list = CONSOLE_PROFILES.filter(p => p.category === cat);
    if (!list.length) return "";
    return `<section class="profile-group"><h3>${profileCategoryLabel(cat)}</h3>${list.map(p => {
      const protocols = p.protocols.map(id => PROTOCOL_FAMILIES[id]?.label || id);
      return `<label class="profile-card">
        <input type="checkbox" value="${p.id}" ${selected.has(p.id) ? "checked" : ""}>
        <span class="profile-copy"><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.maker)} · ${escapeHtml(protocols.join(" · "))}</small><em>${escapeHtml(p.note || "")}</em></span>
      </label>`;
    }).join("")}</section>`;
  }).join("");
}

function openRegieDialog() {
  renderRegieProfiles();
  $("regieDialog").showModal();
}

function generateRegie() {
  const ids = [...$("profileList").querySelectorAll('input[type="checkbox"]:checked')].map(x => x.value);
  doc = mergeRegieProfiles(doc, ids);
  pageIndex = 0;
  selectedId = currentPage()?.widgets?.[0]?.id || null;
  saveCompanionLayout(doc);
  syncLayoutToHost();
  renderPageNav();
  renderGrid();
  $("regieDialog").close();
  log(`Régie universelle · ${ids.length} profil(s) · ${doc.pages.length} page(s)`);
}

document.querySelectorAll("[data-mode]").forEach((b) => {
  b.onclick = () => setMode(b.dataset.mode);
});

$("pagePrev").onclick = () => setPage(pageIndex - 1, { focus: true });
$("pageNext").onclick = () => setPage(pageIndex + 1, { focus: true });

grid.addEventListener("pointerdown", (e) => {
  if (e.target.closest("input")) return;
  swipeStart = { x:e.clientX, y:e.clientY, t:Date.now() };
});
grid.addEventListener("pointerup", (e) => {
  if (!swipeStart) return;
  const dx = e.clientX - swipeStart.x;
  const dy = e.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
    setPage(pageIndex + (dx < 0 ? 1 : -1), { focus: true });
  }
});

$("btnRegie").onclick = openRegieDialog;
$("btnGenerateRegie").onclick = generateRegie;

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
  $("edTargetWrap").style.display = ["osc","artnet","sacn","serial","midi","camera","video"].includes(kind) ? "grid" : "none";
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
            pageIndex = Math.max(0, Math.min(pageIndex, doc.pages.length - 1));
            selectedId = currentPage()?.widgets?.[0]?.id || null;
            layoutRevision = Math.max(layoutRevision, Number(msg.revision) || 0);
            renderPageNav();
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
            w.state = { ...(w.state || {}), value: msg.value, feedback: msg.detail || (msg.ok ? "OK" : "ERR") };
            flash(w.id, !!msg.ok);
            renderGrid();
          }
          const rtt = typeof msg.rttMs === "number" ? ` · host ${Math.round(msg.rttMs)} ms` : "";
          log(`Feedback ← ${msg.widgetId}${rtt} · ${msg.ok ? "OK" : msg.detail || "ERR"}`);
          return;
        }
        if (msg.type === STUDIO_MSG.HELLO_ACK || msg.type === "hello-ack") log("Studio hello-ack");
        if (msg.type === STUDIO_MSG.DETECT) log(`Detect ← hôte · ${msg.detail || "Companion vu"}`);
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
  try { transport?.send({ type: STUDIO_MSG.MONITOR_STOP, clientId, t: Date.now() }); } catch {}
  hideMonitor();
  log("Monitor · stop demandé");
};

$("btnDisconnect").onclick = () => {
  try { transport?.send({ type: STUDIO_MSG.MONITOR_STOP, clientId, t: Date.now() }); } catch {}
  transport?.disconnect();
  transport = null;
  hideMonitor();
  netStatus.textContent = "DISCONNECTED";
  log("Déconnecté");
};

try {
  const remembered = loadRememberedHost(localStorage);
  const saved = localStorage.getItem("nvd.companion.ws");
  $("wsUrl").value = saved || remembered?.wsUrl || "ws://127.0.0.1:4174";
} catch {
  $("wsUrl").value = "ws://127.0.0.1:4174";
}

setMode(STUDIO_MODES.EDITION);
renderPageNav();
renderGrid();
log("Companion Studio prêt · Régie universelle · swipe horizontal entre pages");
