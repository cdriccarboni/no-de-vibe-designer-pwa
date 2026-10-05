/**
 * Sauvegarde manuelle hors dialogue natif.
 * WebKit autonome ignore souvent le téléchargement programmé (<a download>)
 * tout en laissant croire que le fichier est écrit. Dans ce cas la copie
 * localStorage est l'enregistrement réel.
 */

export const MANUAL_SAVE_KEY = "nvd.manual-save";

export function isStandaloneWebKit(userAgent = "") {
  const ua = String(userAgent || "");
  return /AppleWebKit/i.test(ua) && !/Chrome|Chromium|Edg\//i.test(ua);
}

/**
 * @returns {{ mode: "native"|"local"|"download", persistLocal: boolean, download: boolean, honest: "native"|"local"|"file" }}
 */
export function planManualSave({ hasNativeSave = false, userAgent = "", electronRuntime = false } = {}) {
  if (hasNativeSave) {
    return { mode: "native", persistLocal: true, download: false, honest: "native" };
  }
  if (!electronRuntime && isStandaloneWebKit(userAgent)) {
    return { mode: "local", persistLocal: true, download: false, honest: "local" };
  }
  return { mode: "download", persistLocal: true, download: true, honest: "file" };
}

/**
 * @returns {"native"|"local-then-file"|"file"}
 */
export function planManualOpen({ hasNativeOpen = false, hasLocalSave = false } = {}) {
  if (hasNativeOpen) return "native";
  if (hasLocalSave) return "local-then-file";
  return "file";
}

export function saveStatusMessage(plan, fileName = "projet.cvd.json") {
  if (plan?.honest === "native") return `Projet enregistré · ${fileName}`;
  if (plan?.honest === "local") return "Projet enregistré localement dans No-de Vibe Designer.";
  return `Projet exporté · ${fileName}`;
}

/** Ne pas annoncer un enregistrement réussi si la seule copie réelle (local) a échoué. */
export function announceManualSave(plan, localFailed) {
  if (!localFailed) return true;
  if (plan?.honest === "local") return false;
  if (plan?.mode === "native") return true;
  return plan?.download === true;
}
