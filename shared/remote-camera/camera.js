/**
 * Local camera helpers — adapted from ART `patcher-regie-video-return.tsx`.
 * Explicit permission only; STOP always ends tracks. Direct MediaStream, no reencode.
 */

export async function listVideoInputs() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    throw new Error("enumerateDevices indisponible");
  }
  // Probe once so labels appear (ART regie pattern), then stop immediately.
  if (navigator.mediaDevices.getUserMedia) {
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      probe.getTracks().forEach((t) => t.stop());
    } catch {
      /* labels may stay empty — honest */
    }
  }
  const list = await navigator.mediaDevices.enumerateDevices();
  return list.filter((d) => d.kind === "videoinput");
}

export async function openCamera({ deviceId = "", facingMode = "environment" } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Caméra indisponible dans ce navigateur");
  }
  if (!window.isSecureContext) {
    throw new Error("Caméra bloquée hors contexte sécurisé (HTTPS / localhost) — PLATFORM-LIMITED");
  }
  const video = deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 60 } }
    : { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 60 } };
  return navigator.mediaDevices.getUserMedia({ video, audio: false });
}

export function stopStream(stream) {
  stream?.getTracks?.().forEach((t) => {
    try { t.stop(); } catch { /* ignore */ }
  });
}
