/**
 * Media presence honesty — MEDIA_MISSING until a real source is attached.
 * Relocaliser = user picks a file again; never invent a path.
 */

export const MEDIA_STATUS = Object.freeze({
  OK: "OK",
  MEDIA_MISSING: "MEDIA_MISSING",
  LOADING: "LOADING",
  ERROR: "ERROR"
});

export function mediaStatusLabel(status) {
  const labels = {
    OK: "Média OK",
    MEDIA_MISSING: "MEDIA MISSING — relocaliser",
    LOADING: "Chargement…",
    ERROR: "Erreur média"
  };
  return labels[status] || status;
}

/** Inspect a node against runtime media registry. */
export function mediaStatusForNode(node, ctx = {}) {
  if (!node) return { status: MEDIA_STATUS.ERROR, message: "Node absent" };
  if (node.type !== "videofile") {
    return { status: MEDIA_STATUS.OK, message: null };
  }
  const media = ctx.mediaElements?.get?.(node.id);
  if (!media) {
    return {
      status: MEDIA_STATUS.MEDIA_MISSING,
      message: node.params?.srcName
        ? `MEDIA MISSING · ${node.params.srcName} — Relocaliser`
        : "MEDIA MISSING — choisir un fichier (Relocaliser)"
    };
  }
  if (media.error) {
    return { status: MEDIA_STATUS.ERROR, message: String(media.error) };
  }
  if (media.readyState < 2) {
    return { status: MEDIA_STATUS.LOADING, message: "Décodage en cours" };
  }
  return { status: MEDIA_STATUS.OK, message: node.params?.srcName || "OK" };
}

export function listMissingMedia(project, ctx = {}) {
  if (!project?.nodes) return [];
  return project.nodes
    .map((n) => ({ nodeId: n.id, title: n.title, type: n.type, ...mediaStatusForNode(n, ctx) }))
    .filter((m) => m.status === MEDIA_STATUS.MEDIA_MISSING || m.status === MEDIA_STATUS.ERROR);
}
