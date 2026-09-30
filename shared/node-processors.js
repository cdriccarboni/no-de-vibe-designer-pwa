/**
 * Processeurs de nodes réellement exécutables.
 * Retourne Map<portIndex, value>.
 */
import { renderBlackhole } from "./graphics/blackhole.js";
import { transformRaster } from "./graphics/transform.js";
import { compositeFrames } from "./graphics/composite.js";
import { extractSilhouette, mirrorFrame, offsetFrame, shadowTrail } from "./graphics/shadow.js";
import { rasterizeVideoValue } from "./graphics/frame-utils.js";
import { renderWhale } from "./graphics/whale.js";
import { renderBlob } from "./graphics/blob.js";
import { ndiStatusMessage } from "./remote-camera/ndi.js";
import { anaglyphFrame, bendFrame, creativeFxFrame, stormFrame, transmuteFrame } from "./graphics/stage-fx.js";

function videoVal(el, opacity = 1) {
  return { kind: "video", el, opacity };
}

const SENSOR_LABEL = {
  gyro: "Gyroscope",
  accelerometer: "Accéléromètre",
  orientation: "Orientation",
  gps: "GPS",
  wifi: "Réseau / Wi-Fi",
  bluetooth: "Bluetooth",
  touch: "Tactile",
  multitouch: "Multitouch",
  haptics: "Haptique",
  "phone-mic": "Micro"
};

function requireReading(ctx, key) {
  const label = SENSOR_LABEL[key] || key;
  const bus = ctx.sensorBus;
  if (!bus || typeof bus.get !== "function") {
    throw new Error(`${label} : bus capteurs absent dans ce runtime`);
  }
  const reading = bus.get(key);
  if (!reading || reading.available === false) {
    throw new Error(reading?.error || `${label} indisponible sur cette plateforme`);
  }
  if (reading.value == null) {
    ctx.warnings?.push(`${label} : en attente d'une mesure réelle`);
    return null;
  }
  return reading.value;
}

function numOut(n) {
  return { kind: "number", value: Number.isFinite(n) ? n : 0 };
}

function readNum(slot) {
  const v = slot?.value !== undefined ? slot.value : slot;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v && typeof v.value === "number") return Number.isFinite(v.value) ? v.value : 0;
  if (v && typeof v.value === "boolean") return v.value ? 1 : 0;
  const n = Number(v?.value ?? v);
  return Number.isFinite(n) ? n : 0;
}

function nodeMemory(ctx) {
  if (!ctx.nodeState) ctx.nodeState = new Map();
  return ctx.nodeState;
}

function truthyTrigger(slot) {
  const v = slot?.value !== undefined ? slot.value : slot;
  if (!v) return false;
  if (v === true || v === 1) return true;
  if (typeof v === "object" && (v.value === 1 || v.value === true || v.kind === "trigger" && v.value)) return true;
  return false;
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

  fns.set("remote-camera", (node, _inputs, ctx) => {
    const out = new Map();
    const remote = ctx.remoteCamera;
    const el = remote?.videoEl || ctx.remoteVideoEl;
    const streamLive = remote?.state === "LIVE" || remote?.live === true;
    if (streamLive && el && (el.readyState >= 2 || el.videoWidth > 0)) {
      const v = videoVal(el, node.params?.opacity ?? 1);
      out.set(0, v);
      out.set(2, v);
    } else if (el?.srcObject && el.readyState >= 2) {
      // Frame present but state not yet LIVE — still not claim LIVE in status
      const v = videoVal(el, node.params?.opacity ?? 1);
      out.set(0, v);
      out.set(2, v);
    }
    const status = remote?.state || node.params?.status || "WAITING";
    out.set(1, { kind: "text", value: status });
    return out;
  });

  fns.set("ndi-out", (node, inputs, ctx) => {
    const hasVideo = !!inputs.get(0)?.value;
    const msg = ndiStatusMessage();
    ctx.warnings?.push?.(msg);
    ctx.honestFlags?.add?.("ndi-native-relay");
    if (!hasVideo) throw new Error(`${msg} · aucune vidéo en entrée`);
    return new Map([[1, { kind: "text", value: msg }]]);
  });

  fns.set("phone-camera-front", (node, inputs, ctx) => fns.get("camera")(node, inputs, ctx));
  fns.set("phone-camera-back", (node, inputs, ctx) => fns.get("camera")(node, inputs, ctx));

  fns.set("pointer", (_node, _inputs, ctx) => {
    const p = ctx.pointer || { x: 0.5, y: 0.5, speed: 0 };
    return new Map([
      [0, numOut(p.x)],
      [1, numOut(p.y)],
      [2, numOut(p.speed)]
    ]);
  });

  fns.set("whale", (node, inputs, ctx) => {
    const p = ctx.pointer || { x: 0.5, y: 0.52, speed: 0 };
    const x = inputs.get(0) ? readNum(inputs.get(0)) : p.x;
    const y = inputs.get(1) ? readNum(inputs.get(1)) : p.y;
    const speed = inputs.get(2) ? readNum(inputs.get(2)) : p.speed;
    const visual = renderWhale({
      x, y, speed,
      time: ctx.time,
      scale: Number(node.params?.scale ?? 1),
      trail: Number(node.params?.trail ?? 0.18),
      breathe: Number(node.params?.breathe ?? 0.035),
      motionSpeed: Number(node.params?.motionSpeed ?? 1)
    });
    return new Map([[3, visual]]);
  });

  fns.set("blob", (node, inputs, ctx) => {
    const p = ctx.pointer || { x: 0.5, y: 0.5 };
    const x = inputs.get(0) ? readNum(inputs.get(0)) : Number(node.params?.x ?? p.x);
    const y = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.y ?? p.y);
    const size = inputs.get(2) ? readNum(inputs.get(2)) : Number(node.params?.size ?? 0.22);
    const visual = renderBlob({
      x, y, size,
      points: Number(node.params?.points ?? 7),
      softness: Number(node.params?.softness ?? 0.65),
      noise: Number(node.params?.noise ?? 0.18),
      speed: Number(node.params?.speed ?? 0.6),
      time: ctx.time,
      controlPoints: node.params?.controlPoints,
      showPoints: !!node.params?.showPoints
    });
    return new Map([[3, visual]]);
  });

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
    const port = Number(node.params?.port ?? 9000);
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const useUdp = typeof ctx.oscUdpSend === "function" && host !== "bridge";

    if (!useUdp && !ctx.bridgeSend) {
      ctx.warnings?.push("OSC indisponible dans ce runtime : aucune passerelle ni UDP hôte");
      return out;
    }
    try {
      if (useUdp) {
        const result = ctx.oscUdpSend({ host, port, address, args: [value] });
        if (result && typeof result.then === "function") {
          result.catch(e => ctx.warnings?.push(`OSC UDP : ${e.message || e}`));
        }
      } else {
        ctx.bridgeSend({ type: "osc", target: host, address, args: [value] });
      }
      ctx.oscSent = { host, address, value, at: now, transport: useUdp ? "udp" : "websocket" };
    } catch (e) {
      ctx.oscError = e.message || String(e);
      ctx.warnings?.push(`OSC indisponible : ${ctx.oscError}`);
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
    const out = new Map();
    out.set(2, { kind: "number", value: readNum(inputs.get(0)) * readNum(inputs.get(1)) });
    return out;
  });

  fns.set("add", (_node, inputs) => {
    const out = new Map();
    out.set(2, numOut(readNum(inputs.get(0)) + readNum(inputs.get(1))));
    return out;
  });

  fns.set("smooth", (node, inputs, ctx) => {
    const memory = nodeMemory(ctx);
    const key = `smooth:${node.id}`;
    const input = readNum(inputs.get(0));
    const prev = memory.has(key) ? memory.get(key) : input;
    const amount = Math.max(0, Math.min(1, Number(node.params?.amount ?? 0.18)));
    const value = prev + (input - prev) * amount;
    memory.set(key, value);
    return new Map([[1, numOut(value)]]);
  });

  fns.set("compare", (node, inputs) => {
    const a = readNum(inputs.get(0));
    const b = readNum(inputs.get(1));
    const op = node.params?.operator || ">";
    const result = op === "<" ? a < b
      : op === "==" ? a === b
      : op === ">=" ? a >= b
      : op === "<=" ? a <= b
      : op === "!=" ? a !== b
      : a > b;
    return new Map([[2, { kind: "boolean", value: result }]]);
  });

  fns.set("boolean", node => {
    const raw = node.params?.value;
    const value = raw === true || raw === "true" || raw === 1;
    return new Map([[0, { kind: "boolean", value }]]);
  });

  fns.set("text", node => {
    const raw = node.params?.text ?? node.params?.value;
    const value = typeof raw === "string" ? raw : raw == null || typeof raw === "number" ? "" : String(raw);
    return new Map([[0, { kind: "text", value }]]);
  });

  fns.set("timer", (node, inputs, ctx) => {
    const memory = nodeMemory(ctx);
    const key = `timer:${node.id}`;
    const now = Number(ctx.time) || 0;
    const duration = Math.max(0.001, Number(node.params?.duration) || 1);
    let started = memory.get(key);
    if (truthyTrigger(inputs.get(0)) && started == null) started = now;
    const out = new Map();
    if (started == null) {
      out.set(1, numOut(0));
      out.set(2, { kind: "trigger", value: 0 });
      return out;
    }
    const elapsed = now - started;
    if (elapsed >= duration) {
      if (node.params?.loop) memory.set(key, now);
      else memory.delete(key);
      out.set(1, numOut(duration));
      out.set(2, { kind: "trigger", value: 1 });
      return out;
    }
    memory.set(key, started);
    out.set(1, numOut(elapsed));
    out.set(2, { kind: "trigger", value: 0 });
    return out;
  });

  fns.set("feedback", (node, inputs, ctx) => {
    const memory = nodeMemory(ctx);
    const key = `feedback:${node.id}`;
    const out = new Map();
    if (memory.has(key)) out.set(1, memory.get(key));
    const incoming = inputs.get(0)?.value;
    if (incoming !== undefined) memory.set(key, incoming);
    return out;
  });

  fns.set("blackhole", (node, inputs, ctx) => {
    const speed = inputs.get(0) ? readNum(inputs.get(0)) : Number(node.params?.speed ?? 0.65);
    const size = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.size ?? 0.58);
    const frame = renderBlackhole({
      width: ctx.width || 32,
      height: ctx.height || 32,
      time: Number(ctx.time) || 0,
      speed,
      size,
      accretion: Number(node.params?.accretion ?? 0.72)
    });
    return new Map([[2, frame]]);
  });

  function fxRaster(value, node, ctx, suffix = "fx") {
    const maxW = Math.max(160, Math.min(720, Number(node.params?.analysisWidth ?? 560)));
    const aspect = (ctx.height || 720) / Math.max(1, (ctx.width || 1280));
    const maxH = Math.max(90, Math.round(maxW * aspect));
    // Keep native pixel size when already rasterized and within analysis budget (Node tests + cheap frames).
    const nativeW = value?.pixels && value.width ? value.width : null;
    const nativeH = value?.pixels && value.height ? value.height : null;
    const width = nativeW && nativeH && nativeW <= maxW && nativeH <= maxH ? nativeW : maxW;
    const height = nativeW && nativeH && nativeW <= maxW && nativeH <= maxH ? nativeH : maxH;
    return rasterizeVideoValue(value, {
      width,
      height,
      key: `${suffix}:${node.id}`,
      scratchMap: ctx.frameScratch
    });
  }

  fns.set("transform", (node, inputs, ctx) => {
    const visual = inputs.get(0)?.value;
    const scale = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.scale ?? 1);
    const rotation = inputs.get(2) ? readNum(inputs.get(2)) : Number(node.params?.rotation ?? 0);
    const raster = fxRaster(visual, node, ctx, "transform");
    let frame = transformRaster(raster, { scale, rotation, opacity: Number(node.params?.opacity ?? 1) });
    const dx = Number(node.params?.dx ?? 0);
    const dy = Number(node.params?.dy ?? 0);
    if (dx || dy) frame = offsetFrame(frame, { dx, dy });
    return new Map([[3, frame]]);
  });

  fns.set("composite", (node, inputs, ctx) => {
    const base = fxRaster(inputs.get(0)?.value, node, ctx, "composite-base");
    const overlay = fxRaster(inputs.get(1)?.value, node, ctx, "composite-overlay");
    const frame = compositeFrames(base, overlay, {
      blend: node.params?.blend || "normal",
      opacity: node.params?.opacity ?? 1
    });
    return new Map([[2, frame]]);
  });

  function silhouetteFx(node, inputs, ctx, keyPrefix) {
    const video = inputs.get(0)?.value;
    const threshold = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.threshold ?? 0.45);
    const source = fxRaster(video, node, ctx, keyPrefix + "-source");
    let frame = extractSilhouette(source, { threshold, invert: !!node.params?.invert });
    if (node.params?.mirror) frame = mirrorFrame(frame, { axis: node.params?.axis || "x" });
    const dx = Number(node.params?.dx ?? 0);
    const dy = Number(node.params?.dy ?? 0);
    if (dx || dy) frame = offsetFrame(frame, { dx, dy });
    const memory = nodeMemory(ctx);
    const prev = memory.get(`${keyPrefix}:${node.id}`);
    if (node.params?.trail) {
      frame = shadowTrail(prev, frame, { decay: Number(node.params?.decay ?? 0.85) });
    }
    memory.set(`${keyPrefix}:${node.id}`, frame);
    return frame;
  }

  fns.set("threshold", (node, inputs, ctx) => {
    const frame = silhouetteFx({ ...node, params: { ...node.params, mirror: false, trail: false, dx: 0, dy: 0 } }, inputs, ctx, "threshold");
    return new Map([[2, frame]]);
  });

  fns.set("mirror", (node, inputs, ctx) => {
    const frame = fxRaster(inputs.get(0)?.value, node, ctx, "mirror");
    return new Map([[1, mirrorFrame(frame, { axis: node.params?.axis || "x" })]]);
  });

  fns.set("ghost", (node, inputs, ctx) => {
    let frame = fxRaster(inputs.get(0)?.value, node, ctx, "ghost-source");
    const memory = nodeMemory(ctx);
    const key = `ghost:${node.id}`;
    const prev = memory.get(key);
    const decay = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.decay ?? 0.82);
    frame = shadowTrail(prev, frame, { decay: Math.max(0, Math.min(0.98, decay)) });
    const dx = Number(node.params?.dx ?? 8);
    const dy = Number(node.params?.dy ?? 0);
    if (dx || dy) frame = offsetFrame(frame, { dx, dy });
    memory.set(key, frame);
    return new Map([[2, frame]]);
  });

  fns.set("shadow", (node, inputs, ctx) => {
    const shadowNode = { ...node, params: { mirror: true, dx: 12, ...node.params } };
    return new Map([[2, silhouetteFx(shadowNode, inputs, ctx, "shadow")]]);
  });

  fns.set("bodyclone", (node, inputs, ctx) => {
    const cloneNode = { ...node, params: { mirror: false, dx: 64, dy: 0, trail: false, ...node.params } };
    return new Map([[2, silhouetteFx(cloneNode, inputs, ctx, "bodyclone")]]);
  });


  fns.set("videoreturn", (_node, inputs) => {
    const source = inputs.get(0)?.value;
    const out = new Map();
    if (!source) {
      out.set(1, { kind: "text", value: "NO SIGNAL" });
      return out;
    }
    out.set(1, { kind: "text", value: "LIVE" });
    out.set(2, source);
    return out;
  });

  fns.set("mapping", (node, inputs, ctx) => {
    const visual = inputs.get(0)?.value;
    const scale = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.scale ?? 1);
    const raster = fxRaster(visual, node, ctx, "mapping");
    let frame = transformRaster(raster, {
      scale: Math.max(0.05, scale || 1),
      rotation: Number(node.params?.rotation ?? 0),
      opacity: Number(node.params?.opacity ?? 1)
    });
    const dx = Number(node.params?.dx ?? 0);
    const dy = Number(node.params?.dy ?? 0);
    if (dx || dy) frame = offsetFrame(frame, { dx, dy });
    frame.source = "mapping";
    return new Map([[2, frame]]);
  });

  fns.set("anaglyph", (node, inputs, ctx) => {
    const source = fxRaster(inputs.get(0)?.value, node, ctx, "anaglyph");
    const depth = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.depth ?? 0.035);
    return new Map([[2, anaglyphFrame(source, { depth })]]);
  });

  fns.set("creativefx", (node, inputs, ctx) => {
    const source = fxRaster(inputs.get(0)?.value, node, ctx, "creativefx");
    const amount = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.amount ?? 0.55);
    return new Map([[2, creativeFxFrame(source, { amount, time: Number(ctx.time) || 0 })]]);
  });

  fns.set("storm", (node, inputs, ctx) => {
    const source = fxRaster(inputs.get(0)?.value, node, ctx, "storm");
    const amount = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.amount ?? 0.6);
    return new Map([[2, stormFrame(source, { amount, time: Number(ctx.time) || 0 })]]);
  });

  fns.set("bending", (node, inputs, ctx) => {
    const source = fxRaster(inputs.get(0)?.value, node, ctx, "bending");
    const amount = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.amount ?? 0.18);
    return new Map([[2, bendFrame(source, { amount, time: Number(ctx.time) || 0 })]]);
  });

  fns.set("transmute", (node, inputs, ctx) => {
    const source = fxRaster(inputs.get(0)?.value, node, ctx, "transmute");
    const amount = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.amount ?? 0.5);
    return new Map([[2, transmuteFrame(source, { amount })]]);
  });

  fns.set("videofile", (node, _inputs, ctx) => {
    const out = new Map();
    const media = ctx.mediaElements?.get?.(node.id);
    if (!media) {
      const label = node.params?.srcName ? `MEDIA MISSING · ${node.params.srcName}` : "MEDIA MISSING";
      throw new Error(`${label} — Relocaliser (choisir un fichier dans l'inspecteur)`);
    }
    if (media.error) throw new Error(`Fichier vidéo : ${media.error}`);
    if (media.readyState < 2) {
      ctx.warnings?.push(`Vidéo « ${node.title || node.id} » : décodage en cours`);
      return out;
    }
    const seekIn = null;
    if (Number.isFinite(Number(node.params?.seekTo))) {
      const t = Number(node.params.seekTo);
      if (Math.abs((media.currentTime || 0) - t) > 0.05) {
        try { media.currentTime = t; } catch { /* */ }
      }
      delete node.params.seekTo;
    }
    const markers = Array.isArray(node.params?.markers) ? node.params.markers : [];
    if (markers.length && node.params?.jumpMarker != null) {
      const m = markers[Number(node.params.jumpMarker) | 0];
      if (m != null && Number.isFinite(Number(m))) {
        try { media.currentTime = Number(m); } catch { /* */ }
      }
      delete node.params.jumpMarker;
    }
    if (node.params?.playing === false) {
      try { media.pause(); } catch { /* ignore */ }
    } else if (ctx.playing !== false) {
      try { if (media.paused) media.play(); } catch { /* autoplay policy */ }
    }
    if (Number.isFinite(Number(node.params?.rate))) media.playbackRate = Number(node.params.rate);
    media.loop = node.params?.loop !== false;
    const group = node.params?.syncGroup;
    if (group != null && group !== "" && ctx.mediaElements) {
      let master = media;
      let masterId = node.id;
      for (const [id, el] of ctx.mediaElements) {
        const n = (ctx.project?.nodes || []).find(x => x.id === id);
        if (n?.params?.syncGroup === group && String(id) < String(masterId)) {
          master = el;
          masterId = id;
        }
      }
      if (master !== media && Number.isFinite(master.currentTime)) {
        if (Math.abs((media.currentTime || 0) - master.currentTime) > 0.08) {
          try { media.currentTime = master.currentTime; } catch { /* */ }
        }
      }
    }
    const v = videoVal(media, node.params?.opacity ?? 1);
    out.set(0, v);
    out.set(1, numOut(media.currentTime || 0));
    out.set(2, v);
    return out;
  });

  fns.set("box-in", (node, _inputs, ctx) => {
    const out = new Map();
    const index = node.params?.portIndex ?? 0;
    const value = ctx.subpatchInputs?.get(index)?.value ?? (index === 0 ? ctx.subpatchIn : undefined);
    if (value !== undefined) out.set(0, value);
    return out;
  });

  fns.set("box-out", (node, inputs, ctx) => {
    const value = inputs.get(0)?.value;
    if (value !== undefined && ctx.subpatchOutputs) ctx.subpatchOutputs.set(node.params?.portIndex ?? 0, value);
    return new Map();
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

  fns.set("audiofilter", (node, inputs, ctx) => {
    const out = new Map();
    const audio = ctx.audioEngine;
    if (!audio) throw new Error("Moteur audio indisponible");
    if (node.params?.enabled === false) {
      audio.release(node.id);
      out.set(2, numOut(0));
      return out;
    }
    const frequency = inputs.get(0) ? readNum(inputs.get(0)) : Number(node.params?.frequency ?? 800);
    const q = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.q ?? 1);
    const existing = audio.nodes.get(node.id);
    if (!existing || existing.type !== "filter") {
      audio.ensureFilter(node.id, { frequency, q, type: node.params?.filterType || "lowpass", gain: node.params?.gain ?? 0.2 })
        .catch(e => ctx.errors?.push(`Filtre audio : ${e.message || e}`));
    } else {
      audio.setFilterParams(node.id, { frequency, q });
    }
    out.set(2, numOut(audio.readLevel(node.id)));
    return out;
  });

  fns.set("audiodelay", (node, inputs, ctx) => {
    const out = new Map();
    const audio = ctx.audioEngine;
    if (!audio) throw new Error("Moteur audio indisponible");
    if (node.params?.enabled === false) {
      audio.release(node.id);
      out.set(2, numOut(0));
      return out;
    }
    const delayTime = inputs.get(0) ? readNum(inputs.get(0)) : Number(node.params?.delayTime ?? 0.25);
    const feedback = inputs.get(1) ? readNum(inputs.get(1)) : Number(node.params?.feedback ?? 0.3);
    const existing = audio.nodes.get(node.id);
    if (!existing || existing.type !== "delay") {
      audio.ensureDelay(node.id, { delayTime, feedback, gain: node.params?.gain ?? 0.4 })
        .catch(e => ctx.errors?.push(`Delay audio : ${e.message || e}`));
    } else if (existing.delay && existing.feedback) {
      existing.delay.delayTime.setTargetAtTime(Math.max(0, Math.min(2, delayTime)), audio.ctx.currentTime, 0.02);
      existing.feedback.gain.setTargetAtTime(Math.max(0, Math.min(0.95, feedback)), audio.ctx.currentTime, 0.02);
    }
    out.set(2, numOut(audio.readLevel(node.id)));
    return out;
  });

  fns.set("audiofft", (node, _inputs, ctx) => {
    const out = new Map();
    const audio = ctx.audioEngine;
    if (!audio) throw new Error("Moteur audio indisponible");
    if (node.params?.enabled === false) {
      audio.release(node.id);
      return new Map([[0, numOut(0)], [1, numOut(0)], [2, numOut(0)]]);
    }
    const existing = audio.nodes.get(node.id);
    if (!existing || existing.type !== "tone") {
      audio.ensureTone(node.id, {
        freq: Number(node.params?.freq ?? 220),
        gain: Number(node.params?.gain ?? 0.12)
      }).catch(e => ctx.errors?.push(`FFT audio : ${e.message || e}`));
    }
    const bins = audio.readFft(node.id);
    let peak = 0;
    let peakIdx = 0;
    for (let i = 0; i < bins.length; i++) {
      if (bins[i] > peak) { peak = bins[i]; peakIdx = i; }
    }
    const level = audio.readLevel(node.id);
    out.set(0, numOut(level));
    out.set(1, numOut(peak / 255));
    out.set(2, numOut(bins.length ? peakIdx / bins.length : 0));
    if (!ctx.nodeState) ctx.nodeState = new Map();
    ctx.nodeState.set(`fft:${node.id}`, bins);
    return out;
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

  fns.set("dmx", (node, inputs, ctx) => {
    const out = new Map();
    const read = (idx, fallback) => {
      const raw = inputs.get(idx)?.value;
      if (typeof raw?.value === "number") return raw.value;
      if (typeof raw === "number") return raw;
      return fallback;
    };
    const universe = read(0, Number(node.params?.universe ?? 0));
    const channel = read(1, Number(node.params?.address ?? 1));
    const value = read(2, Number(node.params?.value ?? 0));
    if (!ctx.bridgeSend && !ctx.artnetUdpSend) {
      ctx.warnings?.push("Art-Net indisponible : aucune passerelle ni UDP hôte");
      return out;
    }
    try {
      const packet = {
        type: "artnet",
        universe: Math.max(0, Math.min(32767, universe || 0)),
        channel: Math.max(1, Math.min(512, channel || 1)),
        value: Math.max(0, Math.min(255, value || 0)),
        host: node.params?.host || "127.0.0.1",
        port: Number(node.params?.port ?? 6454)
      };
      if (typeof ctx.artnetUdpSend === "function" && node.params?.transport !== "bridge") {
        const result = ctx.artnetUdpSend(packet);
        if (result && typeof result.then === "function") {
          result.catch(e => ctx.warnings?.push(`Art-Net UDP : ${e.message || e}`));
        }
      } else {
        ctx.bridgeSend(packet);
      }
      ctx.artnetSent = { universe, channel, value };
    } catch (e) {
      ctx.artnetError = e.message || String(e);
      ctx.warnings?.push(`Art-Net indisponible : ${ctx.artnetError}`);
    }
    return out;
  });

  fns.set("phone-mic", (node, _inputs, ctx) => {
    const bus = ctx.sensorBus;
    if (!bus || typeof bus.get !== "function") throw new Error("Micro : bus capteurs absent dans ce runtime");
    const reading = bus.get("phone-mic");
    if (reading && reading.available === false) {
      throw new Error(reading.error || "Micro indisponible sur cette plateforme");
    }
    const audio = ctx.audioEngine;
    if (!audio) throw new Error("Micro : moteur audio indisponible");
    if (node.params?.enabled === false) {
      audio.release(node.id);
      return new Map([[2, numOut(0)]]);
    }
    if (!audio.nodes.get(node.id)) {
      audio.ensureMic(node.id).then(
        () => bus.markMic?.({ available: true, value: { started: true } }),
        (e) => {
          const error = `Micro refusé : ${e?.message || e}`;
          bus.markMic?.({ available: false, error });
        }
      );
    }
    const level = audio.readLevel(node.id);
    const packet = numOut(level);
    return new Map([[0, packet], [1, packet], [2, packet]]);
  });

  function vector3(key, ctx, fields) {
    const value = requireReading(ctx, key);
    const out = new Map();
    if (!value) return out;
    fields.forEach((field, index) => {
      const n = value[field];
      if (typeof n === "number" && Number.isFinite(n)) out.set(index, numOut(n));
    });
    return out;
  }

  fns.set("gyro", (_node, _inputs, ctx) => vector3("gyro", ctx, ["alpha", "beta", "gamma"]));
  fns.set("accelerometer", (_node, _inputs, ctx) => vector3("accelerometer", ctx, ["x", "y", "z"]));

  fns.set("orientation", (_node, _inputs, ctx) => {
    const value = requireReading(ctx, "orientation");
    const out = new Map();
    if (!value) return out;
    out.set(0, numOut(value.portrait ? 1 : 0));
    out.set(1, numOut(value.landscape ? 1 : 0));
    if (typeof value.angle === "number") out.set(2, numOut(value.angle));
    return out;
  });

  fns.set("gps", (_node, _inputs, ctx) => {
    const value = requireReading(ctx, "gps");
    const out = new Map();
    if (!value) return out;
    out.set(0, numOut(value.lat));
    out.set(1, numOut(value.lon));
    out.set(2, numOut(value.accuracy));
    return out;
  });

  fns.set("touch", (_node, _inputs, ctx) => {
    const value = requireReading(ctx, "touch");
    const out = new Map();
    if (!value) return out;
    out.set(0, numOut(value.x));
    out.set(1, numOut(value.y));
    out.set(2, numOut(value.pressure ?? 0));
    return out;
  });

  fns.set("multitouch", (_node, _inputs, ctx) => {
    const value = requireReading(ctx, "multitouch");
    const out = new Map();
    if (!value) return out;
    out.set(0, numOut(value.count || 0));
    if (value.gesture) out.set(1, { kind: "text", value: String(value.gesture) });
    out.set(2, numOut(value.count || 0));
    return out;
  });

  fns.set("wifi", (_node, _inputs, ctx) => {
    const value = requireReading(ctx, "wifi");
    const out = new Map();
    if (!value) return out;
    const detail = ctx.sensorBus?.get?.("wifi")?.detailError;
    if (detail) ctx.warnings?.push(detail);
    out.set(0, numOut(value.online ? 1 : 0));
    if (value.type) out.set(1, { kind: "text", value: String(value.type) });
    if (typeof value.rtt === "number") out.set(2, numOut(value.rtt));
    return out;
  });

  fns.set("bluetooth", (_node, _inputs, ctx) => {
    const value = requireReading(ctx, "bluetooth");
    const out = new Map();
    if (!value) return out;
    if (value.device) out.set(0, { kind: "text", value: String(value.device) });
    if (value.service) out.set(1, { kind: "text", value: String(value.service) });
    if (value.characteristic) out.set(2, { kind: "text", value: String(value.characteristic) });
    return out;
  });

  fns.set("haptics", (node, inputs, ctx) => {
    const bus = ctx.sensorBus;
    if (!bus || typeof bus.get !== "function") throw new Error("Haptique : bus capteurs absent dans ce runtime");
    const reading = bus.get("haptics");
    if (!reading || reading.available === false) {
      throw new Error(reading?.error || "Vibration indisponible sur cette plateforme");
    }
    const trigger = inputs.get(2)?.value;
    const fired = trigger?.value === 1 || trigger === 1 || node.params?.trigger === true;
    if (fired && typeof bus.vibrate === "function") {
      const pattern = node.params?.pattern || inputs.get(1)?.value?.value || 40;
      const result = bus.vibrate(pattern);
      if (result && result.ok === false) throw new Error(result.error || "Vibration refusée");
    }
    return new Map();
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
    if (result.boxOutputs) {
      for (const [index, value] of result.boxOutputs) out.set(index, value);
    }
    return out;
  });

  return fns;
}
