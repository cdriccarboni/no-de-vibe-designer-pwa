/**
 * Shadow Lab — extraction de silhouette par seuil de luminance.
 * Travail raster pur ; pas de cloud.
 */

function ensureFrame(frame, label) {
  if (!frame?.pixels || !frame.width || !frame.height) {
    throw new Error(`${label} : image absente`);
  }
  if (frame.pixels.length < frame.width * frame.height * 4) {
    throw new Error(`${label} : tampon incomplet`);
  }
}

export function extractSilhouette(frame, { threshold = 0.45, invert = false } = {}) {
  ensureFrame(frame, "Shadow Lab");
  const t = Math.max(0, Math.min(1, Number(threshold) || 0)) * 255;
  const out = new Uint8ClampedArray(frame.pixels.length);
  for (let i = 0; i < frame.pixels.length; i += 4) {
    const y = 0.2126 * frame.pixels[i] + 0.7152 * frame.pixels[i + 1] + 0.0722 * frame.pixels[i + 2];
    let on = y >= t;
    if (invert) on = !on;
    const v = on ? 255 : 0;
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
    out[i + 3] = on ? frame.pixels[i + 3] : 0;
  }
  return { width: frame.width, height: frame.height, pixels: out, kind: "video", source: "shadow-silhouette" };
}

export function mirrorFrame(frame, { axis = "x" } = {}) {
  ensureFrame(frame, "Shadow mirror");
  const { width, height, pixels } = frame;
  const out = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = axis === "y" ? x : width - 1 - x;
      const sy = axis === "y" ? height - 1 - y : y;
      const di = (y * width + x) * 4;
      const si = (sy * width + sx) * 4;
      out[di] = pixels[si];
      out[di + 1] = pixels[si + 1];
      out[di + 2] = pixels[si + 2];
      out[di + 3] = pixels[si + 3];
    }
  }
  return { width, height, pixels: out, kind: "video", source: "shadow-mirror" };
}

export function offsetFrame(frame, { dx = 8, dy = 0 } = {}) {
  ensureFrame(frame, "Shadow offset");
  const { width, height, pixels } = frame;
  const out = new Uint8ClampedArray(pixels.length);
  const ox = Math.round(Number(dx) || 0);
  const oy = Math.round(Number(dy) || 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x - ox;
      const sy = y - oy;
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
      const di = (y * width + x) * 4;
      const si = (sy * width + sx) * 4;
      out[di] = pixels[si];
      out[di + 1] = pixels[si + 1];
      out[di + 2] = pixels[si + 2];
      out[di + 3] = pixels[si + 3];
    }
  }
  return { width, height, pixels: out, kind: "video", source: "shadow-offset" };
}

export function shadowTrail(previous, current, { decay = 0.85 } = {}) {
  if (!current?.pixels) throw new Error("Shadow trail : frame courante absente");
  if (!previous?.pixels || previous.width !== current.width || previous.height !== current.height) {
    return { ...current, pixels: new Uint8ClampedArray(current.pixels), source: "shadow-trail" };
  }
  const d = Math.max(0, Math.min(0.99, Number(decay) || 0));
  const out = new Uint8ClampedArray(current.pixels.length);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = Math.min(255, current.pixels[i] + previous.pixels[i] * d);
    out[i + 1] = Math.min(255, current.pixels[i + 1] + previous.pixels[i + 1] * d);
    out[i + 2] = Math.min(255, current.pixels[i + 2] + previous.pixels[i + 2] * d);
    out[i + 3] = Math.min(255, Math.max(current.pixels[i + 3], previous.pixels[i + 3] * d));
  }
  return { width: current.width, height: current.height, pixels: out, kind: "video", source: "shadow-trail" };
}
