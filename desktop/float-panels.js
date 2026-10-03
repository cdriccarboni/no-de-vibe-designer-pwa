/**
 * Panneaux Designer déplaçables.
 * Le bandeau sert de poignée. Un panneau ancré peut être sorti,
 * redimensionné, ramené dans l'écran, puis réancré.
 */

export const FLOAT_STORAGE_KEY = "nvd.float.panels.v1";

const DRAG_BLOCK = "button, a, input, select, textarea, label, .tools";

export function clampPanelRect(rect, viewport, options = {}) {
  const edge = options.edge ?? 8;
  const header = options.header ?? 38;
  const minVisible = options.minVisible ?? 96;
  const minWidth = options.minWidth ?? 260;
  const minHeight = options.minHeight ?? header;
  const maxWidth = Math.max(160, viewport.width - edge * 2);
  const maxHeight = Math.max(header, viewport.height - edge * 2);
  const width = Math.max(Math.min(minWidth, maxWidth), Math.min(rect.width, maxWidth));
  const height = Math.max(Math.min(minHeight, maxHeight), Math.min(rect.height, maxHeight));
  const visible = Math.min(minVisible, Math.max(48, Math.round(width * 0.25)));
  const x = Math.max(visible - width, Math.min(viewport.width - visible, rect.x));
  const y = Math.max(edge, Math.min(Math.max(edge, viewport.height - header - edge), rect.y));
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

export function installFloatPanels({ storage = globalThis.localStorage, key = FLOAT_STORAGE_KEY } = {}) {
  const panels = [...document.querySelectorAll(".floatable")];
  const homes = new Map();
  let z = 40;
  let saved = {};
  try { saved = JSON.parse(storage?.getItem(key) || "{}") || {}; } catch { saved = {}; }

  function viewport() {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  function persist() {
    const data = {};
    for (const panel of panels) {
      const id = panel.dataset.floatId;
      if (!id) continue;
      const floating = panel.classList.contains("is-floating");
      data[id] = {
        floating,
        x: floating ? parseFloat(panel.style.left) || 0 : null,
        y: floating ? parseFloat(panel.style.top) || 0 : null,
        w: floating ? panel.offsetWidth : null,
        h: panel.classList.contains("collapsed") ? Number(panel.dataset.floatH) || panel.offsetHeight : panel.offsetHeight,
        collapsed: panel.classList.contains("collapsed"),
        dockSize: panel.dataset.dockSize || ""
      };
    }
    try { storage?.setItem(key, JSON.stringify(data)); } catch { /* quota / private mode */ }
  }

  function applyGeom(panel, rect) {
    const minWidth = Number(panel.dataset.minW) || 280;
    const next = clampPanelRect(rect, viewport(), { minWidth, minHeight: 120, header: 38 });
    panel.style.left = `${next.x}px`;
    panel.style.top = `${next.y}px`;
    panel.style.width = `${next.width}px`;
    if (!panel.classList.contains("collapsed")) {
      panel.style.height = `${next.height}px`;
      panel.dataset.floatH = String(next.height);
    }
  }

  function syncDockTracks() {
    const center = document.querySelector(".center");
    const upper = document.querySelector(".upper");
    const vibe = document.getElementById("vibePanel");
    const timeline = document.getElementById("timelinePanel");
    const preview = document.getElementById("previewPanel");
    const row = (panel, name) => {
      if (!center || !panel) return;
      if (panel.classList.contains("is-floating")) center.style.setProperty(name, "0px");
      else if (panel.classList.contains("collapsed")) center.style.setProperty(name, "38px");
      else if (panel.dataset.dockSize) center.style.setProperty(name, panel.dataset.dockSize);
      else center.style.removeProperty(name);
    };
    row(vibe, "--vibe-row");
    row(timeline, "--timeline-row");
    if (upper && preview) {
      if (preview.classList.contains("is-floating")) upper.style.setProperty("--preview-col", "0px");
      else upper.style.removeProperty("--preview-col");
    }
  }

  function setChrome(panel, floating) {
    panel.querySelectorAll(".float-dock").forEach((button) => { button.hidden = !floating; });
  }

  function raise(panel) {
    z += 1;
    panel.style.zIndex = String(z);
  }

  function floatPanel(panel, rect) {
    if (!panel.classList.contains("is-floating")) {
      const current = panel.getBoundingClientRect();
      const slot = document.createElement("div");
      slot.className = "float-slot";
      slot.dataset.for = panel.dataset.floatId || "";
      panel.replaceWith(slot);
      homes.set(panel, slot);
      document.body.appendChild(panel);
      panel.classList.add("is-floating");
      rect = rect || { x: current.left, y: current.top, width: current.width, height: Math.max(current.height, 160) };
    }
    panel.style.position = "fixed";
    panel.style.margin = "0";
    applyGeom(panel, rect || {
      x: parseFloat(panel.style.left) || 48,
      y: parseFloat(panel.style.top) || 72,
      width: panel.offsetWidth || 420,
      height: Number(panel.dataset.floatH) || panel.offsetHeight || 220
    });
    setChrome(panel, true);
    raise(panel);
    syncDockTracks();
    persist();
  }

  function dockPanel(panel) {
    const slot = homes.get(panel);
    panel.classList.remove("is-floating");
    ["position", "left", "top", "width", "height", "margin", "maxWidth", "maxHeight", "zIndex"].forEach((prop) => {
      panel.style[prop] = "";
    });
    if (slot?.isConnected) slot.replaceWith(panel);
    homes.delete(panel);
    setChrome(panel, false);
    syncDockTracks();
    persist();
  }

  function toggleCollapse(panel) {
    panel.classList.toggle("collapsed");
    if (panel.classList.contains("is-floating") && !panel.classList.contains("collapsed")) {
      const height = Number(panel.dataset.floatH) || 220;
      applyGeom(panel, {
        x: parseFloat(panel.style.left) || 48,
        y: parseFloat(panel.style.top) || 72,
        width: panel.offsetWidth || 420,
        height
      });
    }
    syncDockTracks();
    persist();
  }

  function rememberDockSize(panel, height) {
    const center = document.querySelector(".center");
    const budget = Math.max(180, (center?.clientHeight || window.innerHeight) - 160);
    const limit = Math.max(120, Math.min(budget * 0.46, height));
    panel.dataset.dockSize = `${Math.round(limit)}px`;
    syncDockTracks();
  }

  for (const panel of panels) {
    const head = panel.querySelector(":scope > .panel-head");
    const grip = panel.querySelector(":scope > .float-resize");
    panel.querySelector(":scope > .panel-head .float-dock")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dockPanel(panel);
    });
    panel.addEventListener("pointerdown", () => {
      if (panel.classList.contains("is-floating")) raise(panel);
    });
    head?.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(DRAG_BLOCK)) return;
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = panel.getBoundingClientRect();
      let dragging = false;
      const move = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) < 5) return;
        dragging = true;
        if (!panel.classList.contains("is-floating")) {
          floatPanel(panel, { x: origin.left, y: origin.top, width: origin.width, height: Math.max(origin.height, 150) });
        }
        applyGeom(panel, {
          x: origin.left + dx,
          y: origin.top + dy,
          width: origin.width,
          height: panel.classList.contains("collapsed") ? 38 : Math.max(origin.height, Number(panel.dataset.floatH) || origin.height)
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (dragging) persist();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
    grip?.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = panel.getBoundingClientRect();
      const wasFloating = panel.classList.contains("is-floating");
      const move = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (wasFloating || panel.classList.contains("is-floating") || panel.dataset.dockAxis === "float") {
          if (!panel.classList.contains("is-floating")) {
            floatPanel(panel, { x: origin.left, y: origin.top, width: origin.width, height: origin.height });
          }
          applyGeom(panel, {
            x: parseFloat(panel.style.left) || origin.left,
            y: parseFloat(panel.style.top) || origin.top,
            width: Math.max(Number(panel.dataset.minW) || 280, origin.width + dx),
            height: Math.max(140, origin.height + dy)
          });
          return;
        }
        rememberDockSize(panel, origin.height + dy);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        persist();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });

    const state = saved[panel.dataset.floatId];
    if (state?.dockSize) panel.dataset.dockSize = state.dockSize;
    if (state?.collapsed) panel.classList.add("collapsed");
    if (state?.floating && Number.isFinite(state.x) && Number.isFinite(state.y)) {
      floatPanel(panel, {
        x: state.x,
        y: state.y,
        width: state.w || 420,
        height: state.h || 220
      });
    } else {
      setChrome(panel, false);
    }
  }

  syncDockTracks();
  window.addEventListener("resize", () => {
    for (const panel of panels) {
      if (!panel.classList.contains("is-floating")) continue;
      applyGeom(panel, {
        x: parseFloat(panel.style.left) || 0,
        y: parseFloat(panel.style.top) || 0,
        width: panel.offsetWidth,
        height: Number(panel.dataset.floatH) || panel.offsetHeight
      });
    }
    persist();
  });

  return { raise, dock: dockPanel, float: floatPanel, toggleCollapse, bringInside: (panel) => {
    if (!panel.classList.contains("is-floating")) return;
    applyGeom(panel, {
      x: parseFloat(panel.style.left) || 24,
      y: parseFloat(panel.style.top) || 64,
      width: panel.offsetWidth,
      height: Number(panel.dataset.floatH) || panel.offsetHeight
    });
    raise(panel);
    persist();
  } };
}
