/**
 * Action / Binding / Presentation — appearance never breaks the patch.
 * Host applies bindings; widgets only send actions + show feedback.
 */

import { makeStudioFeedback } from "./protocol.js";

export const BINDING_KINDS = Object.freeze({
  action: "action",
  stage: "stage",
  channel: "channel",
  osc: "osc",
  midi: "midi",
  serial: "serial",
  video: "video",
  camera: "camera"
});

/**
 * Apply a companion action on the desktop/host side.
 * @returns feedback message
 */
export function applyCompanionBinding({
  widget,
  value,
  project,
  runtime = null,
  applyCue = null,
  listCues = null,
  onLog = () => {}
} = {}) {
  if (!widget?.id) throw new Error("Widget absent");
  const binding = widget.binding || {};
  const kind = binding.kind || "action";
  const t0 = Date.now();

  try {
    if (kind === "action" && (binding.action === "ping" || !binding.action)) {
      onLog(`Companion · ping · ${widget.id}`);
      return makeStudioFeedback({
        widgetId: widget.id,
        value: true,
        ok: true,
        detail: "pong",
        rttMs: Date.now() - t0
      });
    }

    if (kind === "stage") {
      const action = binding.action || "go";
      if (!project) throw new Error("Projet hôte absent");
      if (typeof listCues === "function" && typeof applyCue === "function") {
        const cues = listCues(project);
        if (action === "go" || action === "next") {
          const cur = project.meta?.activeCueId || null;
          const next = cues.find((c) => c.id === cur)
            ? cues[(cues.findIndex((c) => c.id === cur) + 1) % Math.max(cues.length, 1)]
            : cues[0];
          if (!next) throw new Error("Aucun cue Stage");
          applyCue(project, next);
          project.meta ||= {};
          project.meta.activeCueId = next.id;
          onLog(`Companion · Stage ${action} · ${next.label || next.id}`);
          return makeStudioFeedback({
            widgetId: widget.id,
            value: next.id,
            ok: true,
            detail: next.label || next.id,
            rttMs: Date.now() - t0
          });
        }
        if (action === "prev" && cues.length) {
          const cur = project.meta?.activeCueId || cues[0].id;
          const idx = Math.max(0, cues.findIndex((c) => c.id === cur) - 1);
          applyCue(project, cues[idx]);
          project.meta.activeCueId = cues[idx].id;
          return makeStudioFeedback({
            widgetId: widget.id,
            value: cues[idx].id,
            ok: true,
            detail: cues[idx].label || cues[idx].id,
            rttMs: Date.now() - t0
          });
        }
      }
      onLog(`Companion · Stage ${action} (sans moteur cue — ack seulement)`);
      return makeStudioFeedback({
        widgetId: widget.id,
        value: true,
        ok: true,
        detail: `stage:${action}`,
        rttMs: Date.now() - t0
      });
    }

    if (kind === "channel") {
      const ch = (project?.channels || []).find((c) => c.id === binding.channelId);
      if (!ch) throw new Error(`Channel Companion introuvable : ${binding.channelId || "?"}`);
      const node = (project.nodes || []).find((n) => n.id === ch.nodeId);
      if (!node) throw new Error(`Node channel absent : ${ch.nodeId}`);
      const key = ch.param || binding.param;
      if (!key) throw new Error("Param channel manquant");
      node.params = { ...(node.params || {}), [key]: value };
      runtime?.render?.();
      onLog(`Companion · channel ${ch.name || ch.id} = ${value}`);
      return makeStudioFeedback({
        widgetId: widget.id,
        value,
        ok: true,
        detail: String(value),
        rttMs: Date.now() - t0
      });
    }

    // Honest stubs — not fake success
    if (["osc", "midi", "serial", "video", "camera"].includes(kind)) {
      return makeStudioFeedback({
        widgetId: widget.id,
        value: null,
        ok: false,
        detail: `Binding ${kind} · pas encore câblé (PLATFORM-LIMITED / TODO)`,
        rttMs: Date.now() - t0
      });
    }

    throw new Error(`Binding inconnu : ${kind}`);
  } catch (e) {
    return makeStudioFeedback({
      widgetId: widget.id,
      value: null,
      ok: false,
      detail: e.message || String(e),
      rttMs: Date.now() - t0
    });
  }
}

export function findWidget(doc, widgetId) {
  for (const page of doc?.pages || []) {
    const w = (page.widgets || []).find((x) => x.id === widgetId);
    if (w) return w;
  }
  return null;
}
