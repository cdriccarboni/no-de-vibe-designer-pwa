/**
 * Crash recovery + recent projects — localStorage, no fake success.
 * Dirty snapshot stays until a clean exit clears it; relaunch restores it.
 */

export const CRASH_KEY = "cvd.crash-recovery";
export const RECENT_KEY = "nvd.recent-projects";
export const MAX_RECENT = 8;

export function markCrashRecovery(projectJson, storage = globalThis.localStorage) {
  if (!storage?.setItem) throw new Error("Stockage indisponible pour recovery");
  if (typeof projectJson !== "string" || !projectJson) throw new Error("Snapshot recovery vide");
  storage.setItem(CRASH_KEY, projectJson);
  return true;
}

export function clearCrashRecovery(storage = globalThis.localStorage) {
  if (!storage?.removeItem) return false;
  storage.removeItem(CRASH_KEY);
  return true;
}

export function loadCrashRecovery(storage = globalThis.localStorage) {
  if (!storage?.getItem) return null;
  const raw = storage.getItem(CRASH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Recovery crash illisible : ${e.message || e}`);
  }
}

export function hasCrashRecovery(storage = globalThis.localStorage) {
  return Boolean(storage?.getItem?.(CRASH_KEY));
}

export function listRecentProjects(storage = globalThis.localStorage) {
  if (!storage?.getItem) return [];
  try {
    const raw = storage.getItem(RECENT_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function pushRecentProject(entry, storage = globalThis.localStorage) {
  if (!storage?.setItem) throw new Error("Stockage indisponible pour récents");
  if (!entry?.name || !entry?.data) throw new Error("Entrée récente incomplète");
  const next = {
    id: entry.id || `r${Date.now()}`,
    name: String(entry.name),
    savedAt: entry.savedAt || new Date().toISOString(),
    data: entry.data
  };
  const list = listRecentProjects(storage).filter((r) => r.name !== next.name);
  list.unshift(next);
  storage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  return list.slice(0, MAX_RECENT);
}

export function storageFailureMessage(error, { kind = "autosave" } = {}) {
  const detail = error?.message || String(error || "échec inconnu");
  const quota = error?.name === "QuotaExceededError" || /quota/i.test(`${error?.name || ""} ${detail}`);
  if (kind === "mirror") {
    return quota
      ? `Sauvegarde partielle · localStorage plein · copie IndexedDB conservée · dernier miroir local conservé · ${detail}`
      : `Sauvegarde partielle · localStorage refusé · copie IndexedDB conservée · ${detail}`;
  }
  if (quota) return `AUTOSAVE ÉCHEC · stockage plein · dernier état conservé · ${detail}`;
  return `AUTOSAVE ÉCHEC · ${detail}`;
}

/** Écrit cvd.autosave. En cas d'échec, ne remplace pas la valeur précédente et renvoie un message UI. */
export function commitAutosave(storage, projectJson, afterWrite) {
  try {
    if (!storage?.setItem) throw new Error("Stockage indisponible");
    if (typeof projectJson !== "string" || !projectJson) throw new Error("Snapshot autosave vide");
    storage.setItem("cvd.autosave", projectJson);
    if (afterWrite) afterWrite();
    return { ok: true, message: null };
  } catch (e) {
    return { ok: false, message: storageFailureMessage(e) };
  }
}
