/**
 * Quick Map — calibration téléphone/desktop.
 * Aucune donnée externe : les coordonnées sont normalisées et sérialisables
 * directement dans le node Mapping vidéo.
 */

import { DEFAULT_QUAD, normalizeQuad, validateQuad, mappingParams } from "./graphics/mapping-v3.js";

export const QUICK_MAP_CORNER_NAMES = Object.freeze(["HG", "HD", "BD", "BG"]);

export function createQuickMapSession({
  nodeId = null,
  corners = DEFAULT_QUAD,
  gridCols = 2,
  gridRows = 2
} = {}) {
  const quad = normalizeQuad(corners);
  return {
    version: 1,
    nodeId,
    corners: quad,
    gridCols: Math.max(2, Math.min(16, Math.round(gridCols))),
    gridRows: Math.max(2, Math.min(16, Math.round(gridRows))),
    activeCorner: 0,
    updatedAt: Date.now()
  };
}

export function setQuickMapCorner(session, index, point) {
  const next = createQuickMapSession(session || {});
  const i = Math.max(0, Math.min(3, Math.round(index)));
  next.corners[i] = {
    x: Math.max(0, Math.min(1, Number(point?.x) || 0)),
    y: Math.max(0, Math.min(1, Number(point?.y) || 0))
  };
  next.activeCorner = i;
  next.updatedAt = Date.now();
  return next;
}

export function nudgeQuickMapCorner(session, index, dx = 0, dy = 0) {
  const p = session?.corners?.[index] || DEFAULT_QUAD[index] || DEFAULT_QUAD[0];
  return setQuickMapCorner(session, index, {
    x: p.x + Number(dx || 0),
    y: p.y + Number(dy || 0)
  });
}

export function validateQuickMapSession(session) {
  const check = validateQuad(session?.corners);
  return {
    ...check,
    nodeId: session?.nodeId || null,
    gridCols: session?.gridCols || 2,
    gridRows: session?.gridRows || 2
  };
}

export function quickMapPatch(session, { source = "phone" } = {}) {
  const check = validateQuickMapSession(session);
  if (!check.ok) throw new Error(check.errors.join(" · "));
  return {
    nodeId: check.nodeId,
    params: mappingParams(check.quad, {
      gridCols: check.gridCols,
      gridRows: check.gridRows,
      source
    })
  };
}

export function applyQuickMapToProject(project, session, { source = "phone" } = {}) {
  const patch = quickMapPatch(session, { source });
  let node = null;
  if (patch.nodeId) node = (project?.nodes || []).find(n => n.id === patch.nodeId);
  if (!node) node = (project?.nodes || []).find(n => n.type === "mapping");
  if (!node) throw new Error("Ajoute un node Mapping vidéo avant Quick Map");
  node.params = { ...(node.params || {}), ...patch.params };
  return node;
}

export function quickMapRemoteOperation(session) {
  const patch = quickMapPatch(session, { source: "phone" });
  return {
    kind: "quick-map-set",
    nodeId: patch.nodeId,
    params: patch.params
  };
}
