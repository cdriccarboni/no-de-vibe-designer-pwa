/**
 * Vue du registre d'agents. Le fichier backend-status n'active rien.
 * Le chat ne choisit que des agents rendus VALIDÉ par une sonde.
 */
import {
  AGENT_STATUSES,
  consultAgents,
  defaultRegistry,
  disponibleRows,
  renderAgentTable,
  selectAgentsForRequest
} from "./agent-registry.js";

export const BACKEND_STATUSES = AGENT_STATUSES;

let current = defaultRegistry();

export function backendStatus() {
  return current;
}

export function rememberRegistry(doc) {
  if (doc?.rows) current = doc;
  return current;
}

export async function refreshBackendStatus() {
  return current;
}

export function artistBackends(doc = current) {
  return disponibleRows(doc);
}

export function technicalRows(doc = current) {
  return doc?.rows || [];
}

export function renderBackendReport(mode = "artist", doc = current) {
  if (mode !== "technical") {
    const names = artistBackends(doc).map(row => row.agent);
    if (!doc?.probed) return "<p>Aucun agent actif. Le statut vient d'une sonde, pas d'un fichier de configuration.</p>";
    return `<p>Agents VALIDÉ : ${names.length ? names.join(", ") : "aucun"}.</p>`;
  }
  return renderAgentTable(doc);
}

export function proposeArchitectures(prompt, doc = current) {
  const options = selectAgentsForRequest(prompt, doc).map(row => ({
    id: row.id,
    label: row.agent,
    preview: row.id === "javascript" || row.id === "webgl" || row.id === "glsl",
    proof: row.lastTest
  }));
  return {
    prompt: String(prompt || ""),
    complex: options.length > 1,
    options,
    fusionRan: false
  };
}

export { consultAgents, selectAgentsForRequest };
