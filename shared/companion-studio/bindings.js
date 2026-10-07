/**
 * Action / Binding / Presentation — appearance never breaks the patch.
 * Host applies bindings; widgets only send actions + show feedback.
 */

import { makeStudioFeedback } from "./protocol.js";
import { dispatchPanicEffects, formatPanicResult } from "../stage/cues.js";

export const BINDING_KINDS = Object.freeze({
  action: "action",
  stage: "stage",
  channel: "channel",
  osc: "osc",
  artnet: "artnet",
  sacn: "sacn",
  midi: "midi",
  serial: "serial",
  video: "video",
  camera: "camera",
  audioplayer: "audioplayer",
  broadcast: "broadcast"
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
  sendOsc = null,
  sendArtNet = null,
  sendSacn = null,
  sendMidi = null,
  sendSerial = null,
  cameraControl = null,
  videoControl = null,
  audioPlayerControl = null,
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
          const applied = applyCue(project, next);
          if (applied?.project) {
            for (const key of Object.keys(project)) delete project[key];
            Object.assign(project, applied.project);
          }
          project.meta ||= {};
          project.meta.activeCueId = next.id;
          if (runtime && typeof next.time === "number") {
            runtime.time = Number(next.time) || 0;
            runtime.setProject?.(project);
            runtime.play?.();
          }
          onLog(`Companion · Stage ${action} · ${next.label || next.id}`);
          return makeStudioFeedback({
            widgetId: widget.id,
            value: next.id,
            ok: true,
            detail: next.label || next.id,
            rttMs: Date.now() - t0
          });
        }
        if (action === "panic") {
          const applied = applyCue(project, null, { panic: true });
          if (applied?.project) {
            for (const key of Object.keys(project)) delete project[key];
            Object.assign(project, applied.project);
          }
          runtime?.setProject?.(project);
          runtime?.stop?.();
          const canSend = applied.effects?.some(effect =>
            (effect.type === "artnet-blackout" && typeof sendArtNet === "function")
            || (effect.type === "osc-stop" && typeof sendOsc === "function")
          );
          const preview = (applied.effects || []).flatMap(effect => {
            if (effect.type === "artnet-blackout" && typeof sendArtNet !== "function") {
              return [{ kind: "artnet", sent: false, universe: effect.universe, reason: "bridge absent" }];
            }
            if (effect.type === "osc-stop" && typeof sendOsc !== "function") {
              return [{ kind: "osc", sent: false, address: effect.address, reason: "bridge absent" }];
            }
            return [];
          });
          if (canSend) {
            dispatchPanicEffects(applied.effects, { sendOsc, sendArtNet })
              .then(results => {
                for (const line of formatPanicResult(applied.effects, results)) onLog(`Companion · ${line}`);
              })
              .catch(error => onLog(`Companion · PANIC · envoi non abouti · ${error?.message || error}`));
          } else {
            for (const line of formatPanicResult(applied.effects, preview)) onLog(`Companion · ${line}`);
          }
          const detail = formatPanicResult(applied.effects, preview).join(" · ");
          return makeStudioFeedback({
            widgetId: widget.id,
            value: "panic",
            ok: true,
            detail,
            rttMs: Date.now() - t0
          });
        }
        if (action === "prev" && cues.length) {
          const cur = project.meta?.activeCueId || cues[0].id;
          const idx = Math.max(0, cues.findIndex((c) => c.id === cur) - 1);
          const applied = applyCue(project, cues[idx]);
          if (applied?.project) {
            for (const key of Object.keys(project)) delete project[key];
            Object.assign(project, applied.project);
          }
          project.meta ||= {};
          project.meta.activeCueId = cues[idx].id;
          if (runtime && typeof cues[idx].time === "number") {
            runtime.time = Number(cues[idx].time) || 0;
            runtime.setProject?.(project);
            runtime.play?.();
          }
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

    if (kind === "osc") {
      if (typeof sendOsc !== "function") throw new Error("Transport OSC hôte indisponible");
      const address = binding.oscAddress || "/nvd/companion";
      const host = binding.oscHost || "127.0.0.1";
      const port = Number(binding.oscPort) || 9000;
      sendOsc({ host, port, address, args: [value] });
      onLog(`Companion · OSC ${address} → ${host}:${port}`);
      return makeStudioFeedback({ widgetId: widget.id, value, ok: true, detail: `OSC ${address}`, rttMs: Date.now() - t0 });
    }

    if (kind === "artnet") {
      if (typeof sendArtNet !== "function") throw new Error("Transport Art-Net hôte indisponible");
      const host = binding.artnetHost || "255.255.255.255";
      const port = Number(binding.artnetPort) || 6454;
      const universe = Math.max(0, Number(binding.universe) || 0);
      const channel = Math.max(1, Math.min(512, Number(binding.channel) || 1));
      const dmx = Math.max(0, Math.min(255, Math.round((typeof value === "boolean" ? (value ? 1 : 0) : Number(value) || 0) * 255)));
      sendArtNet({ host, port, universe, channel, value: dmx });
      onLog(`Companion · Art-Net U${universe} CH${channel} = ${dmx}`);
      return makeStudioFeedback({ widgetId: widget.id, value: dmx, ok: true, detail: `Art-Net U${universe}/${channel}`, rttMs: Date.now() - t0 });
    }

    if (kind === "sacn") {
      if (typeof sendSacn !== "function") throw new Error("Transport sACN hôte indisponible");
      const host = binding.sacnHost || "";
      const port = Number(binding.sacnPort) || 5568;
      const universe = Math.max(1, Number(binding.universe) || 1);
      const channel = Math.max(1, Math.min(512, Number(binding.channel) || 1));
      const dmx = Math.max(0, Math.min(255, Math.round((typeof value === "boolean" ? (value ? 1 : 0) : Number(value) || 0) * 255)));
      sendSacn({ host, port, universe, channel, value: dmx, priority: binding.priority || 100 });
      onLog(`Companion · sACN U${universe} CH${channel} = ${dmx}`);
      return makeStudioFeedback({ widgetId: widget.id, value: dmx, ok: true, detail: `sACN U${universe}/${channel}`, rttMs: Date.now() - t0 });
    }

    if (kind === "serial") {
      if (typeof sendSerial !== "function") throw new Error("Transport Serial hôte indisponible");
      const template = binding.serialText || "COMPANION {value}";
      const text = String(template).replaceAll("{value}", String(value));
      sendSerial(text);
      onLog(`Companion · Serial ${text}`);
      return makeStudioFeedback({ widgetId: widget.id, value, ok: true, detail: "SERIAL", rttMs: Date.now() - t0 });
    }

    if (kind === "midi") {
      if (typeof sendMidi !== "function") throw new Error("Sortie MIDI hôte indisponible");
      const data = Array.isArray(binding.midiData) && binding.midiData.length
        ? binding.midiData.map((n, i) => i === 2 && n === -1 ? Math.max(0, Math.min(127, Math.round(Number(value) * 127))) : Number(n))
        : [0xB0, 0, Math.max(0, Math.min(127, Math.round(Number(value) * 127)))];
      sendMidi(binding.midiOutputId || null, data);
      onLog(`Companion · MIDI ${data.join(" ")}`);
      return makeStudioFeedback({ widgetId: widget.id, value, ok: true, detail: "MIDI", rttMs: Date.now() - t0 });
    }

    if (kind === "broadcast") {
      if (!project) throw new Error("Projet hôte absent");
      const action = binding.action || "toggle";
      if (action === "input-on" || action === "input-off" || action === "input-toggle") {
        const input = (project.nodes || []).find((n) => n.id === binding.nodeId && n.type === "audio-in")
          || (project.nodes || []).find((n) => n.type === "audio-in");
        if (!input) throw new Error("Audio In introuvable");
        input.params ||= {};
        input.params.enabled = action === "input-on"
          ? true
          : action === "input-off"
            ? false
            : !input.params.enabled;
        runtime?.render?.();
        const detail = input.params.enabled ? "AUDIO IN · ON" : "AUDIO IN · OFF";
        onLog(`Companion · ${detail}`);
        return makeStudioFeedback({ widgetId: widget.id, value: input.params.enabled, ok: true, detail, rttMs: Date.now() - t0 });
      }
      const radio = (project.nodes || []).find((n) => n.id === binding.nodeId && n.type === "radio-out")
        || (project.nodes || []).find((n) => n.type === "radio-out");
      if (!radio) throw new Error("Radio Out introuvable");
      radio.params ||= {};
      const next = action === "on"
        ? true
        : action === "off" || action === "stop"
          ? false
          : action === "toggle"
            ? !radio.params.onAir
            : !!value;
      radio.params.onAir = next;
      runtime?.render?.();
      const detail = next ? "RADIO · ON AIR ARMÉ" : "RADIO · STANDBY";
      onLog(`Companion · ${detail}`);
      return makeStudioFeedback({ widgetId: widget.id, value: next, ok: true, detail, rttMs: Date.now() - t0 });
    }

    if (kind === "audioplayer") {
      if (typeof audioPlayerControl !== "function") throw new Error("Contrôle lecteur audio hôte indisponible");
      const slot = Math.max(1, Math.min(12, Number(binding.playerSlot) || 1));
      const action = binding.action || "toggle";
      audioPlayerControl({ slot, action, value });
      onLog(`Companion · Player ${slot} · ${action}`);
      return makeStudioFeedback({ widgetId: widget.id, value: action, ok: true, detail: `PLAYER ${slot} · ${action}`, rttMs: Date.now() - t0 });
    }

    if (kind === "camera") {
      if (typeof cameraControl !== "function") throw new Error("Contrôle caméra hôte indisponible");
      const action = binding.cameraAction || binding.action || (value ? "on" : "off");
      cameraControl(action);
      return makeStudioFeedback({ widgetId: widget.id, value: action, ok: true, detail: `CAMERA ${action}`, rttMs: Date.now() - t0 });
    }

    if (kind === "video") {
      if (typeof videoControl !== "function") throw new Error("Contrôle vidéo hôte indisponible");
      const action = binding.videoAction || binding.action || "toggle";
      videoControl(action);
      return makeStudioFeedback({ widgetId: widget.id, value: action, ok: true, detail: `VIDEO ${action}`, rttMs: Date.now() - t0 });
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
