/**
 * Utilitaires communs pour les valeurs vidéo No-de.
 * Convertit une source live/canvas/draw/pixels vers un frame raster quand un FX l'exige.
 * Les canvases de travail sont réutilisés via scratchMap pour éviter les allocations par frame.
 */
function makeCanvas(width, height) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new Error("Canvas indisponible dans ce runtime");
}

function scratchCanvas(scratchMap, key, width, height) {
  let canvas = scratchMap?.get?.(key);
  if (!canvas) {
    canvas = makeCanvas(width, height);
    scratchMap?.set?.(key, canvas);
  }
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return canvas;
}

export function drawVideoLike(ctx, width, height, value) {
  if (!value) throw new Error("Image absente");
  if (typeof value.draw === "function") {
    value.draw(ctx, width, height);
    return;
  }
  if (value.el) {
    ctx.drawImage(value.el, 0, 0, width, height);
    return;
  }
  if (value.canvas) {
    ctx.drawImage(value.canvas, 0, 0, width, height);
    return;
  }
  if (value.pixels && value.width && value.height) {
    const temp = makeCanvas(value.width, value.height);
    const tctx = temp.getContext("2d", { willReadFrequently: true });
    const img = tctx.createImageData(value.width, value.height);
    img.data.set(value.pixels);
    tctx.putImageData(img, 0, 0);
    ctx.drawImage(temp, 0, 0, width, height);
    return;
  }
  throw new Error("Format vidéo non reconnu");
}

export function rasterizeVideoValue(value, {
  width = 640,
  height = 360,
  key = "frame",
  scratchMap = null
} = {}) {
  if (!value) throw new Error("Image absente");
  const w = Math.max(16, Math.round(width));
  const h = Math.max(16, Math.round(height));
  if (value.pixels && value.width === w && value.height === h) {
    return {
      width: w,
      height: h,
      pixels: new Uint8ClampedArray(value.pixels),
      kind: "video",
      source: value.source || "pixels"
    };
  }
  const canvas = scratchCanvas(scratchMap, key, w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, w, h);
  drawVideoLike(ctx, w, h, value);
  const img = ctx.getImageData(0, 0, w, h);
  return {
    width: w,
    height: h,
    pixels: new Uint8ClampedArray(img.data),
    kind: "video",
    source: value.source || "rasterized"
  };
}

export function drawableValue(draw, source = "generated", opacity = 1) {
  return { kind: "video", draw, source, opacity };
}
