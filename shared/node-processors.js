/**
 * Processeurs de nodes réellement exécutables (P00).
 * Retourne Map<portIndex, value>.
 */

function videoVal(el, opacity = 1) {
  return { kind: "video", el, opacity };
}

export function createNodeProcessors() {
  const fns = new Map();

  fns.set("camera", (node, _inputs, ctx) => {
    const out = new Map();
    const el = ctx.videoEl;
    if (el && el.readyState >= 2) {
      const v = videoVal(el, node.params?.opacity ?? 1);
      out.set(0, v);
      out.set(2, v);
    }
    out.set(1, { kind: "number", value: ctx.time || 0 });
    return out;
  });

  fns.set("phone-camera-front", (node, inputs, ctx) => fns.get("camera")(node, inputs, ctx));
  fns.set("phone-camera-back", (node, inputs, ctx) => fns.get("camera")(node, inputs, ctx));

  fns.set("shader", (node, inputs, ctx) => {
    const out = new Map();
    const tex = inputs.get(0)?.value;
    const uniform = inputs.get(1)?.value;
    const uBoost = typeof uniform?.value === "number" ? uniform.value
      : typeof uniform === "number" ? uniform
      : (node.params?.intensity ?? 1);

    const surface = ctx.shaderSurface;
    if (!surface) throw new Error("ShaderSurface indisponible");

    const w = ctx.width || 1280;
    const h = ctx.height || 720;
    const time = (ctx.time || 0) * (0.5 + Number(uBoost) || 1);

    // Draw video into offscreen if provided, then composite with shader overlay
    const base = ctx.offscreen;
    if (base) {
      const bctx = base.getContext("2d");
      base.width = w;
      base.height = h;
      bctx.fillStyle = ctx.background || "#090b0d";
      bctx.fillRect(0, 0, w, h);
      if (tex?.el && (tex.el.readyState >= 2 || tex.el.width)) {
        try { bctx.drawImage(tex.el, 0, 0, w, h); } catch { /* frame skip */ }
      }
    }

    let shaderCanvas;
    try {
      shaderCanvas = surface.render(w, h, time, { intensity: Number(uBoost) || 1 });
    } catch (e) {
      throw new Error(`GLSL : ${e.message || e}`);
    }

    // Composite onto result canvas
    const result = ctx.resultCanvas;
    if (result) {
      result.width = w;
      result.height = h;
      const rctx = result.getContext("2d");
      rctx.fillStyle = ctx.background || "#090b0d";
      rctx.fillRect(0, 0, w, h);
      if (base) rctx.drawImage(base, 0, 0, w, h);
      rctx.save();
      rctx.globalCompositeOperation = "screen";
      rctx.globalAlpha = Math.min(1, Math.max(0, node.params?.opacity ?? 0.85));
      rctx.drawImage(shaderCanvas, 0, 0, w, h);
      rctx.restore();
      out.set(2, videoVal(result, node.params?.opacity ?? 1));
    } else {
      out.set(2, videoVal(shaderCanvas, node.params?.opacity ?? 1));
    }
    return out;
  });

  fns.set("midi", (node, _inputs, ctx) => {
    const out = new Map();
    const bus = ctx.deviceBus || {};
    const last = bus.lastMidi || null;
    out.set(0, { kind: "midi", value: last });
    const cc = last && (last.type === "CC" || last.type === "NOTE ON")
      ? (last.value ?? 0) / (last.type === "CC" ? 127 : 127)
      : (node.params?.fallback ?? 0);
    out.set(1, { kind: "number", value: Number(cc) || 0 });
    out.set(2, { kind: "trigger", value: last?.type === "NOTE ON" ? 1 : 0 });
    return out;
  });

  fns.set("osc", (node, inputs, ctx) => {
    const out = new Map();
    const hostIn = inputs.get(0)?.value;
    const addrIn = inputs.get(1)?.value;
    const valIn = inputs.get(2)?.value;
    const host = (typeof hostIn?.value === "string" ? hostIn.value : null)
      || node.params?.host || "bridge";
    const address = (typeof addrIn?.value === "string" ? addrIn.value : null)
      || node.params?.address || "/nvd/value";
    const value = typeof valIn?.value === "number" ? valIn.value
      : typeof valIn === "number" ? valIn
      : Number(node.params?.value ?? 0);

    // Pas de réussite simulée : sans passerelle, l'envoi n'a pas lieu.
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const flag = key => {
      const flags = ctx.honestFlags;
      if (!flags) return false;
      const id = `osc:${node.id}:${key}`;
      if (flags.has(id)) return true;
      flags.add(id);
      return false;
    };
    if (!ctx.bridgeSend) {
      if (!flag("missing")) {
        ctx.warnings?.push("OSC indisponible dans ce runtime : aucune passerelle n'est chargée");
      }
      return out;
    }
    if (!ctx._oscLast) ctx._oscLast = 0;
    if (now - ctx._oscLast > 66) {
      ctx._oscLast = now;
      try {
        ctx.bridgeSend({ type: "osc", target: host, address, args: [value] });
        ctx.oscSent = { host, address, value, at: now };
      } catch (e) {
        ctx.oscError = e.message || String(e);
        if (!flag("send")) {
          ctx.warnings?.push(`OSC indisponible : ${ctx.oscError}`);
        }
      }
    }
    return out;
  });

  fns.set("number", node => {
    const out = new Map();
    const n = Number(node.params?.value);
    out.set(0, { kind: "number", value: Number.isFinite(n) ? n : 0 });
    return out;
  });

  fns.set("multiply", (_node, inputs) => {
    const read = v => {
      if (typeof v === "number") return v;
      if (v && typeof v.value === "number") return v.value;
      const n = Number(v?.value ?? v);
      return Number.isFinite(n) ? n : 0;
    };
    const out = new Map();
    out.set(2, { kind: "number", value: read(inputs.get(0)?.value) * read(inputs.get(1)?.value) });
    return out;
  });

  fns.set("tracking", (node, _inputs, ctx) => {
    const out = new Map();
    const pts = ctx.controls || [];
    const n = pts.length;
    out.set(0, { kind: "number", value: n });
    out.set(1, { kind: "number", value: n ? (pts[0].x || 0) : 0 });
    out.set(2, { kind: "number", value: n });
    return out;
  });

  fns.set("stageio", (node, inputs, ctx) => {
    const out = new Map();
    const v = inputs.get(0)?.value ?? ctx.subpatchIn;
    if (v) out.set(2, v);
    else if (ctx.subpatchIn) out.set(2, ctx.subpatchIn);
    return out;
  });

  fns.set("audio", (node, inputs, ctx) => {
    const out = new Map();
    const audio = ctx.audioEngine;
    if (!audio) throw new Error("Moteur audio indisponible");
    if (node.params?.enabled === false) {
      audio.release(node.id);
      out.set(2, { kind: "number", value: 0 });
      return out;
    }
    const freqIn = inputs.get(0)?.value;
    const gainIn = inputs.get(1)?.value;
    const freq = typeof freqIn?.value === "number" ? 80 + freqIn.value * 880
      : Number(node.params?.freq ?? 220);
    const gain = typeof gainIn?.value === "number" ? Math.min(0.5, Math.max(0, gainIn.value))
      : Number(node.params?.gain ?? 0.15);
    const mode = node.params?.mode || "tone";

    // Sync async start without blocking frame — schedule if missing
    const existing = audio.nodes.get(node.id);
    if (!existing) {
      if (mode === "mic") {
        audio.ensureMic(node.id).catch(e => { ctx.errors?.push?.(`Audio micro : ${e.message || e}`); });
      } else {
        audio.ensureTone(node.id, { freq, gain }).catch(e => { ctx.errors?.push?.(`Audio : ${e.message || e}`); });
      }
    } else if (existing.type === "tone") {
      audio.setToneParams(node.id, { freq, gain });
    }
    const level = audio.readLevel(node.id);
    out.set(2, { kind: "number", value: level });
    return out;
  });

  fns.set("organicaudio", (node, inputs, ctx) => {
    node.params = { ...node.params, mode: "tone", freq: 110 + (inputs.get(1)?.value?.value || 0) * 400 };
    return fns.get("audio")(node, inputs, ctx);
  });

  fns.set("soundmemo", (node, inputs, ctx) => {
    // Niveau micro mémorisé (pas d'enregistrement fichier — signalé)
    node.params = { ...node.params, mode: "mic" };
    const out = fns.get("audio")(node, inputs, ctx);
    if (ctx.warnings && !(node.params._memoWarned)) {
      ctx.warnings.push("Mémo sonore : niveau micro actif ; enregistrement fichier pas encore disponible");
      node.params._memoWarned = true;
    }
    return out;
  });

  fns.set("subpatch", (node, inputs, ctx) => {
    const out = new Map();
    const graph = node.params?.graph || { nodes: [], edges: [] };
    if (!graph.nodes?.length) {
      // Pass-through si vide
      const v = inputs.get(0)?.value;
      if (v) out.set(2, v);
      return out;
    }
    const { evaluateSubGraph } = ctx._subpatchApi || {};
    if (!evaluateSubGraph) throw new Error("API sous-patch manquante");
    const prev = ctx._subPrev?.get(node.id) || new Map();
    const result = evaluateSubGraph(graph, fns, ctx, inputs, prev);
    ctx._subPrev = ctx._subPrev || new Map();
    ctx._subPrev.set(node.id, result.outputs);
    if (result.errors?.length) ctx.errors?.push?.(...result.errors.map(e => `Sous-patch « ${node.title} » : ${e}`));
    if (result.outVal) out.set(2, result.outVal);
    return out;
  });

  return fns;
}
