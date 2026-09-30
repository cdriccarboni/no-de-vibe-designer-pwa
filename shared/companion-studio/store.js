/**
 * Local First persistence for Companion layouts (.nodecompanion JSON).
 */

import { exportCompanionDocument, parseCompanionFile, validateCompanionDocument, newCompanionDocument } from "./schema.js";

export const LAYOUT_KEY = "nvd.companion.layout";
export const LAYOUT_LIST_KEY = "nvd.companion.layouts";

export function saveCompanionLayout(doc, storage = globalThis.localStorage) {
  if (!storage?.setItem) throw new Error("Stockage Companion indisponible");
  const raw = exportCompanionDocument(doc);
  storage.setItem(LAYOUT_KEY, raw);
  try {
    const list = listCompanionLayouts(storage).filter((e) => e.name !== doc.name);
    list.unshift({ name: doc.name || "Companion", savedAt: new Date().toISOString(), data: JSON.parse(raw) });
    storage.setItem(LAYOUT_LIST_KEY, JSON.stringify(list.slice(0, 12)));
  } catch { /* liste optionnelle */ }
  return raw;
}

export function loadCompanionLayout(storage = globalThis.localStorage) {
  if (!storage?.getItem) return null;
  const raw = storage.getItem(LAYOUT_KEY);
  if (!raw) return null;
  return parseCompanionFile(raw);
}

export function listCompanionLayouts(storage = globalThis.localStorage) {
  if (!storage?.getItem) return [];
  try {
    const raw = storage.getItem(LAYOUT_LIST_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function ensureCompanionLayout(storage = globalThis.localStorage) {
  const existing = loadCompanionLayout(storage);
  if (existing) return existing;
  const doc = newCompanionDocument({ name: "Companion Studio" });
  // Seed first bidirectional button
  doc.pages[0].widgets.push({
    id: "w-go",
    type: "button",
    presentation: { label: "GO", secondary: "Stage", x: 0, y: 0, w: 2, h: 1, color: "#d7b86a" },
    binding: { kind: "stage", action: "go" },
    state: { value: null }
  });
  doc.pages[0].widgets.push({
    id: "w-ping",
    type: "button",
    presentation: { label: "PING", secondary: "Feedback", x: 2, y: 0, w: 2, h: 1, color: "#8fa79d" },
    binding: { kind: "action", action: "ping" },
    state: { value: null }
  });
  saveCompanionLayout(doc, storage);
  return validateCompanionDocument(doc);
}

export function downloadCompanionFile(doc, fileName) {
  const raw = exportCompanionDocument(doc);
  const name = fileName || `${(doc.name || "companion").replace(/\s+/g, "-")}.nodecompanion`;
  if (typeof document === "undefined") return { name, raw };
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { name, raw };
}
