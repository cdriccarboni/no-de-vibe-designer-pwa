/**
 * Remote Camera session states — aligned with 2.2 DoD + ART intercom progress honesty.
 * LIVE is reserved for real FIRST_FRAME only.
 */
export const RC_STATES = Object.freeze({
  WAITING: "WAITING",
  QR_OPEN: "QR_OPEN",
  CAMERA_PERMISSION: "CAMERA_PERMISSION",
  CAMERA_READY: "CAMERA_READY",
  CONNECTING: "CONNECTING",
  PEER_CONNECTED: "PEER_CONNECTED",
  FIRST_FRAME: "FIRST_FRAME",
  LIVE: "LIVE",
  DISCONNECTED: "DISCONNECTED",
  RECONNECTING: "RECONNECTING",
  ERROR: "ERROR"
});

export function rcStateLabel(state) {
  const labels = {
    WAITING: "En attente",
    QR_OPEN: "QR prêt",
    CAMERA_PERMISSION: "Autorisation caméra…",
    CAMERA_READY: "Caméra prête",
    CONNECTING: "Connexion…",
    PEER_CONNECTED: "Pair connecté",
    FIRST_FRAME: "Première image",
    LIVE: "LIVE",
    DISCONNECTED: "Déconnecté",
    RECONNECTING: "Reconnexion…",
    ERROR: "Erreur"
  };
  return labels[state] || state;
}

/** Host peer id prefix — same idea as ART `art-comms-v08-${room}`. */
export function remoteCameraHostId(room) {
  const code = String(room || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  return `nvd-rc22-${code || "room"}`;
}

export function makeRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}
