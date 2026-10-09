import { validateCompanionDocument } from "./schema.js";

export function copyCompanionLayout(layout) {
  return validateCompanionDocument(JSON.parse(JSON.stringify(layout)));
}

export function getShowCompanionLayout(project = {}, fallback = null) {
  const stored = project?.meta?.companionLayout;
  if (stored) {
    try { return copyCompanionLayout(stored); } catch { /* old or invalid snapshot: use the personal fallback */ }
  }
  return fallback ? copyCompanionLayout(fallback) : null;
}

export function setShowCompanionLayout(project, layout) {
  if (!project || typeof project !== "object") throw new Error("Projet requis pour le layout Companion");
  project.meta ||= {};
  project.meta.companionLayout = copyCompanionLayout(layout);
  return project.meta.companionLayout;
}
