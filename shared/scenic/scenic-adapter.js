/** Adaptateur : bibliothèque Scénographe (Google AI Studio) → Éléments officiels No[co]de.
 *  Idempotent : ids stables `scenic-<id lab>`, aucun élément utilisateur n'est modifié. */
import { SCENIC_LIBRARY, SCENIC_TRACKS, SCENIC_CUES, SCENIC_PACK_VERSION } from "./scenic-pack.js";
import { listElements, saveElement } from "../show-elements.js";

export const SCENIC_ID_PREFIX = "scenic-";

const clone = value => JSON.parse(JSON.stringify(value ?? null));

export function scenicElementId(labId) {
  return `${SCENIC_ID_PREFIX}${String(labId || "").replace(/^elem-/, "")}`;
}

/** Convertit un élément du lab en entrée acceptée par normalizeElement(). */
export function toOfficialElement(lab) {
  if (!lab?.id) throw new Error("Élément Scénographe sans identifiant");
  const track = SCENIC_TRACKS.findIndex(t => t.id === lab.defaultTrackId);
  return {
    id: scenicElementId(lab.id),
    name: lab.name,
    type: `scenic:${lab.type}`,
    tags: ["scénographe", lab.category, lab.type].filter(Boolean),
    snapshot: {
      source: "google-ai-studio-scenographe",
      packVersion: SCENIC_PACK_VERSION,
      labId: lab.id,
      category: lab.category,
      characterTitle: lab.characterTitle,
      description: lab.description,
      iconType: lab.iconType,
      color: lab.color,
      defaultTrack: track >= 0 ? track : 0,
      defaultDuration: lab.defaultDuration,
      transform: clone(lab.defaultTransform),
      animationMode: lab.animationMode,
      motionStyle: lab.motionStyle,
      motionSpeed: lab.motionSpeed,
      visualFx: lab.visualFx,
      fxIntensity: lab.fxIntensity,
      audio: clone(lab.audioConfig)
    }
  };
}

export function scenicPackElements() {
  return SCENIC_LIBRARY.map(toOfficialElement);
}

/** Installe/met à jour le pack dans project.resources. Retourne { added, updated, unchanged }. */
export function installScenicPack(project) {
  if (!project || typeof project !== "object") throw new Error("Projet requis pour installer le pack Scénographe");
  const existing = new Map(listElements(project).map(e => [e.id, e]));
  const stats = { added: 0, updated: 0, unchanged: 0 };
  for (const raw of scenicPackElements()) {
    const before = existing.get(raw.id);
    if (!before) { saveElement(project, raw); stats.added++; continue; }
    if (before.snapshot?.packVersion === SCENIC_PACK_VERSION) { stats.unchanged++; continue; }
    saveElement(project, { ...raw, createdAt: before.createdAt });
    stats.updated++;
  }
  return stats;
}

/** Cues du lab, exprimées comme TOPs officiels (sans écrire dans le projet). */
export function scenicCueTemplates() {
  return SCENIC_CUES.map(c => ({
    label: c.label, timeSec: c.timeSec, action: c.action, oscAddress: c.oscAddress, description: c.description
  }));
}
