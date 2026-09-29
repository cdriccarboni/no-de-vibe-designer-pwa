import { drawableValue } from "./frame-utils.js";

/**
 * Blob organique paramétrable — points pré-posés, déformation locale, rendu local.
 */
export function renderBlob({
  x = 0.5,
  y = 0.5,
  size = 0.22,
  points = 7,
  softness = 0.65,
  noise = 0.18,
  speed = 0.6,
  time = 0,
  controlPoints = null,
  showPoints = false
} = {}) {
  const count = Math.max(3, Math.min(24, Math.round(Number(points) || 7)));
  const t = (Number(time) || 0) * Math.max(0, Number(speed) || 0);
  const soft = Math.max(0, Math.min(1, Number(softness) || 0));
  const wobble = Math.max(0, Math.min(0.65, Number(noise) || 0));

  return drawableValue((g, width, height) => {
    const cx = Math.max(0, Math.min(1, Number(x) || 0.5)) * width;
    const cy = Math.max(0, Math.min(1, Number(y) || 0.5)) * height;
    const radius = Math.max(20, Math.min(width, height) * Math.max(0.03, Number(size) || 0.22));
    const pts = [];

    for (let i = 0; i < count; i++) {
      const preset = Array.isArray(controlPoints) ? controlPoints[i] : null;
      if (preset && Number.isFinite(preset.x) && Number.isFinite(preset.y)) {
        pts.push({ x: preset.x * width, y: preset.y * height });
        continue;
      }
      const a = (Math.PI * 2 * i) / count;
      const mod = 1 + Math.sin(t * 1.7 + i * 1.93) * wobble * 0.22 + Math.cos(t * 0.73 - i) * wobble * 0.10;
      pts.push({
        x: cx + Math.cos(a) * radius * mod,
        y: cy + Math.sin(a) * radius * mod
      });
    }

    g.save();
    const grad = g.createRadialGradient(cx - radius * .2, cy - radius * .25, radius * .05, cx, cy, radius * 1.25);
    grad.addColorStop(0, "rgba(210,225,232,.92)");
    grad.addColorStop(0.45, "rgba(104,139,151,.82)");
    grad.addColorStop(1, "rgba(27,41,49,.42)");
    g.fillStyle = grad;
    g.strokeStyle = "rgba(213,231,237,.35)";
    g.lineWidth = Math.max(1, radius * 0.012);

    const tension = 0.15 + soft * 0.35;
    g.beginPath();
    const first = pts[0];
    g.moveTo(first.x, first.y);
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      const pm = pts[(i - 1 + pts.length) % pts.length];
      const p2 = pts[(i + 2) % pts.length];
      const c1x = p0.x + (p1.x - pm.x) * tension;
      const c1y = p0.y + (p1.y - pm.y) * tension;
      const c2x = p1.x - (p2.x - p0.x) * tension;
      const c2y = p1.y - (p2.y - p0.y) * tension;
      g.bezierCurveTo(c1x, c1y, c2x, c2y, p1.x, p1.y);
    }
    g.closePath();
    g.fill();
    g.stroke();

    if (showPoints) {
      g.fillStyle = "rgba(255,255,255,.95)";
      g.strokeStyle = "rgba(0,0,0,.7)";
      for (const p of pts) {
        g.beginPath();
        g.arc(p.x, p.y, 5, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
    }
    g.restore();
  }, "blob");
}
