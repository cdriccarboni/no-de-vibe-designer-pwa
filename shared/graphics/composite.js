/**
 * Composition raster alpha / blend.
 * Modes : normal, add, multiply, screen.
 */

function sample(frame, x, y) {
  if (!frame?.pixels || x < 0 || y < 0 || x >= frame.width || y >= frame.height) {
    return [0, 0, 0, 0];
  }
  const i = (y * frame.width + x) * 4;
  return [frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2], frame.pixels[i + 3]];
}

function blendPixel(dst, src, mode) {
  const a = src[3] / 255;
  if (a <= 0) return dst;
  if (mode === "add") {
    return [
      Math.min(255, dst[0] + src[0] * a),
      Math.min(255, dst[1] + src[1] * a),
      Math.min(255, dst[2] + src[2] * a),
      Math.min(255, Math.max(dst[3], src[3]))
    ];
  }
  if (mode === "multiply") {
    return [
      Math.round((dst[0] * (src[0] / 255)) * a + dst[0] * (1 - a)),
      Math.round((dst[1] * (src[1] / 255)) * a + dst[1] * (1 - a)),
      Math.round((dst[2] * (src[2] / 255)) * a + dst[2] * (1 - a)),
      Math.min(255, Math.max(dst[3], src[3]))
    ];
  }
  if (mode === "screen") {
    return [
      Math.round((255 - (255 - dst[0]) * (255 - src[0]) / 255) * a + dst[0] * (1 - a)),
      Math.round((255 - (255 - dst[1]) * (255 - src[1]) / 255) * a + dst[1] * (1 - a)),
      Math.round((255 - (255 - dst[2]) * (255 - src[2]) / 255) * a + dst[2] * (1 - a)),
      Math.min(255, Math.max(dst[3], src[3]))
    ];
  }
  // normal
  return [
    Math.round(src[0] * a + dst[0] * (1 - a)),
    Math.round(src[1] * a + dst[1] * (1 - a)),
    Math.round(src[2] * a + dst[2] * (1 - a)),
    Math.min(255, Math.round(src[3] + dst[3] * (1 - a)))
  ];
}

export function compositeFrames(base, overlay, { blend = "normal", opacity = 1 } = {}) {
  if (!base?.pixels) throw new Error("Composite : calque de base absent");
  const width = base.width | 0;
  const height = base.height | 0;
  const out = new Uint8ClampedArray(base.pixels);
  if (!overlay?.pixels) {
    return { width, height, pixels: out, kind: "video", source: "composite" };
  }
  const alpha = Math.max(0, Math.min(1, Number(opacity)));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.floor(x * overlay.width / width);
      const sy = Math.floor(y * overlay.height / height);
      const dst = sample({ pixels: out, width, height }, x, y);
      const src = sample(overlay, sx, sy);
      src[3] = Math.round(src[3] * alpha);
      const mixed = blendPixel(dst, src, blend);
      const i = (y * width + x) * 4;
      out[i] = mixed[0];
      out[i + 1] = mixed[1];
      out[i + 2] = mixed[2];
      out[i + 3] = mixed[3];
    }
  }
  return { width, height, pixels: out, kind: "video", source: "composite" };
}
