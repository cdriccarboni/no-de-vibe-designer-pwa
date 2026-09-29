/** NDI / Spout / Syphon honesty — adapted from ART patcher-connectors `videoio`. */
export const NDI_CAPABILITY = Object.freeze({
  id: "ndi",
  label: "NDI / Spout / Syphon",
  status: "PLATFORM-LIMITED",
  route: "Relais natif local obligatoire",
  browserSend: false,
  note: "Le navigateur n'émet pas de NDI. Un host natif (Electron bridge / outil externe) est requis — comme dans ART PATCHER."
});

export function ndiStatusMessage() {
  return `${NDI_CAPABILITY.label} · ${NDI_CAPABILITY.status} · ${NDI_CAPABILITY.route}`;
}
