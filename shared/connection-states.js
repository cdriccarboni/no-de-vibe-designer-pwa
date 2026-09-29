/**
 * Product-level link states for hosts / devices.
 * Never claim CONNECTED without a live link. KNOWN ≠ CONNECTED.
 */

export const LINK_STATES = Object.freeze({
  KNOWN: "KNOWN",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  UNAVAILABLE: "UNAVAILABLE"
});

export function linkStateLabel(state) {
  const labels = {
    KNOWN: "Connu",
    CONNECTING: "Connexion…",
    CONNECTED: "Connecté",
    DISCONNECTED: "Déconnecté",
    UNAVAILABLE: "Indisponible"
  };
  return labels[state] || state;
}

export function isLiveLink(state) {
  return state === LINK_STATES.CONNECTED;
}

/** Map Remote Camera session → product link without faking LIVE. */
export function linkFromRemoteCamera(rcState) {
  switch (rcState) {
    case "LIVE":
    case "FIRST_FRAME":
    case "PEER_CONNECTED":
      return LINK_STATES.CONNECTED;
    case "CONNECTING":
    case "CAMERA_PERMISSION":
    case "CAMERA_READY":
    case "RECONNECTING":
    case "QR_OPEN":
      return LINK_STATES.CONNECTING;
    case "WAITING":
      return LINK_STATES.KNOWN;
    case "ERROR":
      return LINK_STATES.UNAVAILABLE;
    case "DISCONNECTED":
    default:
      return LINK_STATES.DISCONNECTED;
  }
}
