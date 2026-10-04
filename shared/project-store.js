/**
 * Persistance du projet courant.
 * IndexedDB est la copie durable ; localStorage reste un miroir
 * compatible avec l'autosave desktop (`cvd.autosave`).
 */

import { MANUAL_SAVE_KEY } from "./save-fallback.js";
import { storageFailureMessage } from "./session-recovery.js";

export const PROJECT_STORE_DB = "nvd-projects";
export const PROJECT_STORE_KEY = "current";
export const AUTOSAVE_KEY = "cvd.autosave";

export function createMemoryProjectStore() {
  let raw = null;
  return {
    async save(project) {
      raw = JSON.stringify(project);
    },
    async load() {
      return raw ? JSON.parse(raw) : null;
    }
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(PROJECT_STORE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB indisponible"));
  });
}

function idbOp(db, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", mode);
    const store = tx.objectStore("kv");
    const req = run(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Lecture IndexedDB impossible"));
  });
}

export function createBrowserProjectStore() {
  return {
    async save(project) {
      const raw = JSON.stringify(project);
      let mirrorError = null;
      try {
        localStorage.setItem(AUTOSAVE_KEY, raw);
        localStorage.setItem(MANUAL_SAVE_KEY, raw);
      } catch (e) {
        /* quota : IndexedDB peut encore recevoir la copie ; l'échec reste visible */
        mirrorError = e;
        console.warn("localStorage", e);
      }
      let db;
      try {
        db = await openDb();
      } catch (e) {
        if (mirrorError) {
          throw new Error(`Sauvegarde impossible · IndexedDB et localStorage ont échoué · dernier état conservé · ${e.message || e}`);
        }
        throw e;
      }
      if (!db) {
        throw new Error(mirrorError
          ? `Sauvegarde impossible · IndexedDB indisponible et localStorage a échoué · dernier état conservé · ${mirrorError.message || mirrorError}`
          : "IndexedDB indisponible : la copie locale navigateur n'est pas durable");
      }
      try {
        await idbOp(db, "readwrite", store => store.put(raw, PROJECT_STORE_KEY));
      } catch (e) {
        try { db.close(); } catch { /* fermeture best-effort */ }
        if (mirrorError) {
          throw new Error(`Sauvegarde impossible · IndexedDB et localStorage ont échoué · dernier état conservé · ${e.message || e}`);
        }
        throw e;
      }
      db.close();
      if (mirrorError) throw new Error(storageFailureMessage(mirrorError, { kind: "mirror" }));
    },
    async load() {
      try {
        const db = await openDb();
        if (db) {
          const raw = await idbOp(db, "readonly", store => store.get(PROJECT_STORE_KEY));
          db.close();
          if (raw) return JSON.parse(raw);
        }
      } catch { /* repli localStorage */ }
      try {
        const raw = localStorage.getItem(PROJECT_STORE_KEY) || localStorage.getItem(AUTOSAVE_KEY) || localStorage.getItem(MANUAL_SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
  };
}
