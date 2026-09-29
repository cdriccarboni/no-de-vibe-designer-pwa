/**
 * Transform raster : scale, rotation, opacité.
 * Refuse une entrée sans pixels plutôt que d'annoncer une image.
 */

export function transformRaster(frame, { scale = 1, rotation = 0, opacity = 1 } = {}) {
  if (!frame?.pixels || !frame.width || !frame.height) {
    throw new Error("Transform : image absente");
  }
  const width = frame.width | 0;
  const height = frame.height | 0;
  const src = frame.pixels;
  if (src.length < width * height * 4) throw new Error("Transform : tampon image incomplet");
  const out = new Uint8ClampedArray(width * height * 4);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const s = Number(scale);
  const scaleSafe = Number.isFinite(s) && s !== 0 ? s : 1;
  const cos = Math.cos(Number(rotation) || 0);
  const sin = Math.sin(Number(rotation) || 0);
  const alpha = Math.max(0, Math.min(1, Number(opacity)));
  if (!Number.isFinite(alpha)) throw new Error("Transform : opacité invalide");

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / scaleSafe;
      const dy = (y - cy) / scaleSafe;
      const sx = Math.round(cx + dx * cos + dy * sin);
      const sy = Math.round(cy - dx * sin + dy * cos);
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
      const di = (y * width + x) * 4;
      const si = (sy * width + sx) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = Math.round(src[si + 3] * alpha);
    }
  }
  return { width, height, pixels: out, kind: "video", source: "transform" };
}
