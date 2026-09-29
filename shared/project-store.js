/**
 * Persistance du projet courant.
 * IndexedDB est la copie durable ; localStorage reste un miroir
 * compatible avec l'autosave desktop (`cvd.autosave`).
 */

import { MANUAL_SAVE_KEY } from "./save-fallback.js";

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
      try {
        localStorage.setItem(AUTOSAVE_KEY, raw);
        localStorage.setItem(MANUAL_SAVE_KEY, raw);
      } catch (e) {
        /* quota : IndexedDB peut encore réussir */
        console.warn("localStorage", e);
      }
      const db = await openDb();
      if (!db) throw new Error("IndexedDB indisponible : la copie locale navigateur n'est pas durable");
      await idbOp(db, "readwrite", store => store.put(raw, PROJECT_STORE_KEY));
      db.close();
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
