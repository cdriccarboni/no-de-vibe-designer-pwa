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

    // Emit at most ~15 Hz to avoid flooding
    const now = performance.now();
    if (!ctx._oscLast) ctx._oscLast = 0;
    if (ctx.bridgeSend && now - ctx._oscLast > 66) {
      ctx._oscLast = now;
      try {
        ctx.bridgeSend({ type: "osc", target: host, address, args: [value] });
        ctx.oscSent = { host, address, value, at: now };
      } catch (e) {
        ctx.oscError = e.message || String(e);
      }
    }
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

  fns.set("stageio", (node, inputs) => {
    const out = new Map();
    const v = inputs.get(0)?.value;
    if (v) out.set(2, v);
    return out;
  });

  return fns;
}
