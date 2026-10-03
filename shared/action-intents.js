/**
 * Couche d'actions unique pour l'application, le langage naturel et les intents natifs.
 * Chaque action appelle un moteur déjà présent. Aucun écran n'est inventé ici.
 */
import { openProject, addNode, nodeById, addTimelineClip } from "./ir.js";
import { applyCue, listCues } from "./stage/cues.js";
import { createRegiePreset } from "./companion-studio/regie-presets.js";
import { localVibeParse, applyVibeOps } from "./vibe.js";

export const ACTIONS = Object.freeze([
  { id: "open-project", label: "Ouvrir un projet" },
  { id: "cue", label: "Cue" },
  { id: "preset", label: "Preset" },
  { id: "patch-from-text", label: "Patch depuis le langage" }
]);

function cueMatches(cue, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return false;
  return cue.id === query || String(cue.number) === q || String(cue.label || "").toLowerCase() === q;
}

export function performAction(id, input = {}) {
  if (id === "open-project") {
    if (!input.raw || typeof input.raw !== "object") {
      return { ok: false, action: id, error: "projet brut absent" };
    }
    const opened = openProject(input.raw);
    return { ok: Boolean(opened?.project), action: id, project: opened.project, migration: opened };
  }

  if (id === "cue") {
    const project = input.project;
    if (!project) return { ok: false, action: id, error: "projet absent" };
    const cue = listCues(project).find(item => cueMatches(item, input.cue ?? input.id ?? input.label));
    if (!cue) return { ok: false, action: id, error: "cue introuvable" };
    const applied = applyCue(project, cue, { panic: input.panic === true });
    const failed = applied.effects.some(effect => effect.type === "error");
    return { ok: !failed, action: id, ...applied };
  }

  if (id === "preset") {
    try {
      return { ok: true, action: id, preset: createRegiePreset(input.id || input.preset) };
    } catch (err) {
      return { ok: false, action: id, error: err?.message || String(err) };
    }
  }

  if (id === "patch-from-text") {
    const project = input.project;
    const text = String(input.text || "").trim();
    if (!project) return { ok: false, action: id, error: "projet absent" };
    if (!text) return { ok: false, action: id, error: "texte absent" };
    const plan = localVibeParse(text, project);
    if (!plan?.ops?.length) return { ok: false, action: id, error: "aucune opération", plan };
    const result = applyVibeOps(project, plan.ops, {
      addNode: (type, x, y) => addNode(project, type, type, x, y),
      addClip: (track, start, duration, label, kind) => addTimelineClip(project, { track, start, duration, label, kind }),
      ensureEdges: () => {
        project.edges ||= [];
        return project.edges;
      },
      nodeById: (nodeId) => nodeById(project, nodeId)
    });
    return {
      ok: result.applied.some(op => !op.skipped),
      action: id,
      plan,
      ...result
    };
  }

  return { ok: false, action: id, error: "action inconnue" };
}
