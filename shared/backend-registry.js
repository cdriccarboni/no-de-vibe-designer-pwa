/**
 * Lit le relevé prouvé sur cette machine. Le fichier de données se recharge
 * sans changer la logique. Rien n'est installé ici.
 */
import { BACKEND_STATUS as snapshot } from "./backend-status.js";

export const BACKEND_STATUSES = Object.freeze([
  "NON INSTALLÉ",
  "INSTALLÉ / NON TESTÉ",
  "DISPONIBLE",
  "DISPONIBLE AVEC LIMITATIONS",
  "INCOMPATIBLE",
  "ERREUR"
]);

let current = snapshot;

export function backendStatus() {
  return current;
}

export async function refreshBackendStatus() {
  const url = new URL("./backend-status.json", import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Registre illisible");
  current = await response.json();
  return current;
}

export function artistBackends(doc = current) {
  return (doc?.rows || []).filter(row => row.status === "DISPONIBLE");
}

export function technicalRows(doc = current) {
  return doc?.rows || [];
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;" }[ch]));
}

export function renderBackendReport(mode = "artist", doc = current) {
  if (mode !== "technical") {
    const names = artistBackends(doc).map(row => row.label);
    return `<p>Moteurs prêts : ${esc(names.join(", "))}.</p>`;
  }
  const lines = (doc?.rows || []).map(row => {
    const link = row.status === "NON INSTALLÉ" && row.installUrl
      ? ` <a href="${esc(row.installUrl)}" target="_blank" rel="noopener noreferrer">Installer maintenant</a>`
      : "";
    return `<li><b>${esc(row.label)}</b> · ${esc(row.status)}${row.version ? " · " + esc(row.version) : ""}${row.proof ? " · " + esc(row.proof) : ""}${link}</li>`;
  });
  return `<p>Relevé ${esc(doc?.probedAt || "")} · ${esc(doc?.os || "")} · <a href="../shared/backend-status.json" data-refresh-backends>Relire le relevé</a></p><ul>${lines.join("")}</ul>`;
}

const PREVIEW = new Set(["javascript", "webgl", "glsl"]);

export function proposeArchitectures(prompt, doc = current) {
  const text = String(prompt || "").toLowerCase();
  const complex = /shader|glsl|vidéo|video|audio|osc|gpu/.test(text);
  const ready = artistBackends(doc);
  const ranked = [];
  const push = id => {
    const row = ready.find(item => item.id === id);
    if (row && !ranked.some(item => item.id === id)) {
      ranked.push({ id: row.id, label: row.label, preview: PREVIEW.has(row.id), proof: row.proof });
    }
  };
  push("javascript");
  if (/shader|glsl|gpu|vidéo|video/.test(text)) push("webgl");
  if (/shader|glsl/.test(text)) push("glsl");
  const options = (complex ? ranked : ranked.slice(0, 1)).slice(0, 3);
  return { prompt: String(prompt || ""), complex, options, fusionRan: false };
}
