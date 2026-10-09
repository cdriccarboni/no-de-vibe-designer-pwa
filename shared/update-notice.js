import { APP_VERSION } from "./version.js";

const STORAGE_KEY = "nvd.updateNotice.lastVersion";

/** Discreet, dismissible notice; never resets the user's project or offline storage. */
export function installUpdateNotice({ storage = globalThis.localStorage, doc = globalThis.document } = {}) {
  if (!doc?.body) return null;
  let previous = "";
  try {
    previous = storage?.getItem(STORAGE_KEY) || "";
    storage?.setItem(STORAGE_KEY, APP_VERSION);
  } catch { return null; }
  if (!previous || previous === APP_VERSION || doc.getElementById("nvdUpdateNotice")) return null;

  const box = doc.createElement("aside");
  box.id = "nvdUpdateNotice";
  box.setAttribute("role", "status");
  box.setAttribute("aria-label", "Nouvelle version de No[co]de");
  box.style.cssText = "position:fixed;right:1rem;bottom:1rem;z-index:9999;max-width:min(360px,calc(100vw - 2rem));padding:1rem;border:1px solid #4a5056;border-radius:12px;background:#15191d;color:#f3f3f3;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 30px #0008";
  const title = doc.createElement("strong");
  title.textContent = "MISE À JOUR NO[CO]DE";
  const detail = doc.createElement("p");
  detail.textContent = `Version ${APP_VERSION} disponible. Ton projet et tes sauvegardes restent inchangés.`;
  const link = doc.createElement("a");
  link.href = "../install/";
  link.textContent = "Voir la page Installer ↗";
  link.style.cssText = "color:#e3c781;display:inline-block;margin-right:1rem";
  const dismiss = doc.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = "Fermer";
  dismiss.style.cssText = "padding:.35rem .8rem;background:#30363c;color:white;border:1px solid #777;border-radius:6px;cursor:pointer";
  dismiss.addEventListener("click", () => box.remove());
  box.append(title, detail, link, dismiss);
  doc.body.append(box);
  return box;
}
