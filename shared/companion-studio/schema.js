/**
 * Companion Studio layout schema — versioned Local First.
 * File extension: .nodecompanion (JSON). Appearance never lives inside bindings.
 */

export const COMPANION_SCHEMA = "nvd.companion";
export const COMPANION_FORMAT = 1;
export const COMPANION_EXT = ".nodecompanion";

export const STUDIO_MODES = Object.freeze({
  EDITION: "EDITION",
  TEST: "TEST",
  PLATEAU: "PLATEAU"
});

export function newCompanionDocument({ name = "Companion" } = {}) {
  const now = new Date().toISOString();
  return {
    schema: COMPANION_SCHEMA,
    version: COMPANION_FORMAT,
    name,
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        cols: 4,
        rows: 6,
        widgets: []
      }
    ],
    meta: {
      created: now,
      updated: now,
      orientation: "portrait",
      grid: { snap: true, size: 8 },
      role: "plateau"
    }
  };
}

export function validateCompanionDocument(raw) {
  if (!raw || raw.schema !== COMPANION_SCHEMA) {
    throw new Error("Document Companion invalide (schema nvd.companion requis)");
  }
  const version = Number(raw.version) || 1;
  if (version > COMPANION_FORMAT) {
    throw new Error(`Companion version ${version} plus récente que ce moteur (${COMPANION_FORMAT})`);
  }
  const doc = JSON.parse(JSON.stringify(raw));
  doc.version = COMPANION_FORMAT;
  doc.name = String(doc.name || "Companion");
  doc.pages = Array.isArray(doc.pages) && doc.pages.length ? doc.pages : newCompanionDocument().pages;
  for (const page of doc.pages) {
    page.id ||= `page-${Math.random().toString(36).slice(2, 7)}`;
    page.name ||= "Page";
    page.role ||= "custom";
    page.icon ||= "";
    page.cols = Math.max(1, Number(page.cols) || 4);
    page.rows = Math.max(1, Number(page.rows) || 6);
    page.widgets = Array.isArray(page.widgets) ? page.widgets.map(normalizeWidget) : [];
  }
  doc.meta ||= {};
  doc.meta.updated = new Date().toISOString();
  return doc;
}

export function normalizeWidget(w = {}) {
  const id = w.id || `w${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    type: w.type || "button",
    presentation: {
      label: w.presentation?.label ?? w.label ?? "Bouton",
      secondary: w.presentation?.secondary ?? "",
      x: Number(w.presentation?.x ?? w.x ?? 0),
      y: Number(w.presentation?.y ?? w.y ?? 0),
      w: Number(w.presentation?.w ?? w.width ?? 1),
      h: Number(w.presentation?.h ?? w.height ?? 1),
      color: w.presentation?.color || "#d7b86a",
      textColor: w.presentation?.textColor || "#0f1113",
      icon: w.presentation?.icon || "",
      visible: w.presentation?.visible !== false,
      locked: !!w.presentation?.locked,
      active: w.presentation?.active !== false
    },
    binding: {
      kind: w.binding?.kind || "action",
      action: w.binding?.action || "ping",
      channelId: w.binding?.channelId || null,
      nodeId: w.binding?.nodeId || null,
      param: w.binding?.param || null,
      oscAddress: w.binding?.oscAddress || null,
      oscHost: w.binding?.oscHost || "127.0.0.1",
      oscPort: Number(w.binding?.oscPort) || 9000,
      artnetHost: w.binding?.artnetHost || "255.255.255.255",
      artnetPort: Number(w.binding?.artnetPort) || 6454,
      sacnHost: w.binding?.sacnHost || "",
      sacnPort: Number(w.binding?.sacnPort) || 5568,
      universe: Math.max(0, Number(w.binding?.universe) || 0),
      channel: Math.max(1, Math.min(512, Number(w.binding?.channel) || 1)),
      priority: Math.max(0, Math.min(200, Number(w.binding?.priority) || 100)),
      profileId: w.binding?.profileId || null,
      profileName: w.binding?.profileName || null,
      midiOutputId: w.binding?.midiOutputId || null,
      midiData: Array.isArray(w.binding?.midiData) ? w.binding.midiData.slice(0, 3).map(Number) : null,
      serialText: w.binding?.serialText || null,
      cameraAction: w.binding?.cameraAction || null,
      videoAction: w.binding?.videoAction || null,
      valueOn: w.binding?.valueOn ?? true,
      valueOff: w.binding?.valueOff ?? false,
      momentary: !!w.binding?.momentary
    },
    state: {
      value: w.state?.value ?? null,
      feedback: w.state?.feedback ?? null
    }
  };
}

export function exportCompanionDocument(doc) {
  const v = validateCompanionDocument(doc);
  v.meta.updated = new Date().toISOString();
  return JSON.stringify(v, null, 2);
}

export function parseCompanionFile(text) {
  return validateCompanionDocument(JSON.parse(text));
}
