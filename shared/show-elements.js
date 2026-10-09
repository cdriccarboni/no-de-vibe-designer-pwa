/** Éléments de spectacle réutilisables, stockés sans casser les resources historiques. */

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function clean(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function stableId(raw = {}) {
  const seed = clean(raw.id || raw.name || raw.label || raw.title || raw.type || "element").toLowerCase();
  let hash = 5381;
  for (const char of seed) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  const slug = seed.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "element";
  return `element-${slug}-${hash.toString(36)}`;
}

export function normalizeElement(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const snapshot = clone(source.snapshot ?? source.content ?? source.data ?? {});
  const name = clean(source.name || source.label || source.title, "Élément sans titre").slice(0, 160);
  return {
    kind: "element",
    id: clean(source.id) || stableId({ ...source, name }),
    name,
    type: clean(source.type || source.elementType, "patch").slice(0, 48),
    snapshot,
    tags: [...new Set((Array.isArray(source.tags) ? source.tags : []).map(tag => clean(tag)).filter(Boolean))].slice(0, 16),
    createdAt: clean(source.createdAt),
    updatedAt: clean(source.updatedAt)
  };
}

export function listElements(project = {}) {
  return (Array.isArray(project.resources) ? project.resources : [])
    .filter(resource => resource?.kind === "element")
    .map(normalizeElement);
}

export function saveElement(project, element) {
  if (!project || typeof project !== "object") throw new Error("Projet requis pour enregistrer un Élément");
  project.resources = Array.isArray(project.resources) ? project.resources : [];
  const normalized = normalizeElement(element);
  const index = project.resources.findIndex(resource => resource?.kind === "element" && resource.id === normalized.id);
  if (index >= 0) project.resources[index] = normalized;
  else project.resources.push(normalized);
  return normalized;
}

export function instantiateElement(project = {}, elementId, options = {}) {
  const element = listElements(project).find(item => item.id === String(elementId || ""));
  if (!element) throw new Error("Élément introuvable");
  const instances = [ ...(project.timeline || []), ...(project.cues || []) ]
    .filter(item => item?.elementId === element.id).length;
  return {
    id: clean(options.id) || `instance-${element.id}-${instances + 1}`,
    kind: "element-instance",
    elementId: element.id,
    label: clean(options.label, element.name).slice(0, 160),
    track: Math.max(0, Number(options.track) || 0),
    start: Math.max(0, Number(options.start) || 0),
    duration: Math.max(.05, Number(options.duration) || 1),
    snapshot: clone(element.snapshot),
    type: element.type
  };
}
