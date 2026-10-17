// No[co]de · Présentation de conduite indépendante des IDs et actions de scène.
export const CARTOUCHE_VERSION = 1;
const FIELDS = ["label", "color", "page", "notes", "group", "favorite", "order"];
const COLOR = /^#[0-9a-fA-F]{6}$/;

function defaults(entry, index) {
  return {label: entry.label, color: "", page: String(entry.sourcePage ?? ""), notes: "", group: "", favorite: false, order: index};
}
function validPatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch) || Object.keys(patch).some(k => !FIELDS.includes(k))) throw new Error("Champs de cartouche invalides");
  for (const key of ["label", "page", "notes", "group"]) if (key in patch && (typeof patch[key] !== "string" || patch[key].length > 2000)) throw new Error(`Champ ${key} invalide`);
  if ("color" in patch && patch.color !== "" && (typeof patch.color !== "string" || !COLOR.test(patch.color))) throw new Error("Couleur invalide");
  if ("favorite" in patch && typeof patch.favorite !== "boolean") throw new Error("Favori invalide");
  if ("order" in patch && (!Number.isInteger(patch.order) || patch.order < 0)) throw new Error("Ordre invalide");
}
export function createCartoucheStore({profile, entries, storage}) {
  if (!profile || !Array.isArray(entries) || !storage) throw new Error("Profil, entrées et stockage requis");
  const ids = new Set(entries.map(e => e.id));
  if (ids.size !== entries.length || entries.some(e => typeof e.id !== "string" || !e.id)) throw new Error("IDs de conduite invalides ou dupliqués");
  const key = `node-cartouches-v1:${profile}`;
  const base = Object.fromEntries(entries.map((e, i) => [e.id, defaults(e, i)]));
  let current = structuredClone(base), past = [], future = [];
  function decode(raw) {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || value.version !== CARTOUCHE_VERSION || value.profile !== profile || !value.overrides || typeof value.overrides !== "object" || Array.isArray(value.overrides)) throw new Error("Sauvegarde incompatible avec cette conduite");
    if (Object.keys(value.overrides).some(id => !ids.has(id))) throw new Error("Cartouche inconnue dans la sauvegarde");
    const next = structuredClone(base);
    for (const [id, patch] of Object.entries(value.overrides)) {
      validPatch(patch);
      Object.assign(next[id], patch);
    }
    return next;
  }
  function encode(records) {
    const overrides = {};
    for (const id of ids) {
      const changed = Object.fromEntries(FIELDS.filter(field => records[id][field] !== base[id][field]).map(field => [field, records[id][field]]));
      if (Object.keys(changed).length) overrides[id] = changed;
    }
    return JSON.stringify({version: CARTOUCHE_VERSION, profile, overrides});
  }
  function commit(next) {
    storage.setItem(key, encode(next)); // Échec de quota : état courant intact.
    past.push(current); if (past.length > 100) past.shift();
    current = next; future = [];
  }
  const saved = storage.getItem(key);
  if (saved !== null) current = decode(saved); // Ne jamais effacer une sauvegarde invalide.
  return {
    key,
    get(id) { if (!ids.has(id)) throw new Error(`Cartouche inconnue : ${id}`); return {...current[id], id}; },
    list() { return entries.map(e => ({...e, ...current[e.id]})).sort((a,b) => a.order-b.order || entries.findIndex(e => e.id === a.id)-entries.findIndex(e => e.id === b.id)); },
    update(id, patch) {
      if (!ids.has(id)) throw new Error(`Cartouche inconnue : ${id}`);
      validPatch(patch);
      const next = structuredClone(current); Object.assign(next[id], patch); commit(next);
      return this.get(id);
    },
    reset(id) { if (!ids.has(id)) throw new Error(`Cartouche inconnue : ${id}`); const next = structuredClone(current); next[id] = {...base[id]}; commit(next); },
    undo() { if (!past.length) return false; const next = past.at(-1); storage.setItem(key, encode(next)); past.pop(); future.push(current); current = next; return true; },
    redo() { if (!future.length) return false; const next = future.at(-1); storage.setItem(key, encode(next)); future.pop(); past.push(current); current = next; return true; },
    export() { return encode(current); },
    import(raw) { commit(decode(raw)); }
  };
}
