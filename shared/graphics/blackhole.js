/**
 * Trou noir rasterisé en pur JS.
 * Produit des pixels réels, sans prétendre à un contexte WebGL.
 */

export function renderBlackhole({
  width = 32,
  height = 32,
  time = 0,
  speed = 0.65,
  size = 0.58,
  accretion = 0.72
} = {}) {
  const w = Math.max(1, width | 0);
  const h = Math.max(1, height | 0);
  const pixels = new Uint8ClampedArray(w * h * 4);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const radius = Math.min(w, h) * 0.5 * Math.max(0.05, Math.min(1, Number(size) || 0));
  const spin = Number(speed) || 0;
  const disk = Math.max(0, Math.min(1, Number(accretion) || 0));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx) + time * spin;
      const ring = Math.exp(-(((dist - radius) / (radius * 0.18 + 0.001)) ** 2));
      const swirl = 0.5 + 0.5 * Math.sin(ang * 6 + dist * 0.35);
      const body = dist < radius ? 1 - dist / radius : 0;
      const hole = dist < radius * 0.22 ? 0 : 1;
      const glow = (ring * swirl * disk + body * 0.15) * hole;
      const i = (y * w + x) * 4;
      pixels[i] = Math.round(Math.min(255, glow * 40));
      pixels[i + 1] = Math.round(Math.min(255, glow * 140));
      pixels[i + 2] = Math.round(Math.min(255, glow * 210));
      pixels[i + 3] = Math.round(Math.min(255, glow * 255));
    }
  }
  return { width: w, height: h, pixels, kind: "video", source: "blackhole" };
}
