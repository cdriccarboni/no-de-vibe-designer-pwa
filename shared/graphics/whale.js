import { drawableValue } from "./frame-utils.js";

/**
 * Baleine vectorielle signature No-de.
 * Aucune permission, aucune image externe : le rendu est génératif et local.
 */
export function renderWhale({
  x = 0.5,
  y = 0.52,
  speed = 0,
  time = 0,
  scale = 1,
  trail = 0.18,
  breathe = 0.035,
  motionSpeed = 1
} = {}) {
  const nx = Math.max(0.05, Math.min(0.95, Number(x) || 0.5));
  const ny = Math.max(0.08, Math.min(0.92, Number(y) || 0.52));
  const velocity = Math.max(0, Math.min(2, Math.abs(Number(speed) || 0)));
  const t = (Number(time) || 0) * Math.max(0.08, Math.min(4, Number(motionSpeed) || 1));
  const s = Math.max(0.25, Math.min(2.5, Number(scale) || 1));
  const tr = Math.max(0, Math.min(0.7, Number(trail) || 0));
  const br = Math.max(0, Math.min(0.12, Number(breathe) || 0));

  function whalePath(g, alpha, ox = 0, oy = 0, phase = 0) {
    const bodyW = 330 * s;
    const bodyH = 122 * s * (1 + Math.sin(t * 1.2 + phase) * br);
    const px = nx * g.canvas.width + ox;
    const py = ny * g.canvas.height + oy + Math.sin(t * 0.7 + phase) * 7 * s;
    const angle = (nx - 0.5) * 0.26 + Math.sin(t * 0.43 + phase) * 0.035;

    g.save();
    g.translate(px, py);
    g.rotate(angle);
    g.globalAlpha = alpha;

    const grad = g.createLinearGradient(-bodyW * 0.45, -bodyH * 0.3, bodyW * 0.45, bodyH * 0.3);
    grad.addColorStop(0, "#111821");
    grad.addColorStop(0.5, "#283746");
    grad.addColorStop(1, "#0b1017");

    g.fillStyle = grad;
    g.strokeStyle = "rgba(184,205,219,.32)";
    g.lineWidth = Math.max(1.2, 2.4 * s);

    g.beginPath();
    g.moveTo(-bodyW * 0.47, 0);
    g.bezierCurveTo(-bodyW * 0.34, -bodyH * 0.58, bodyW * 0.17, -bodyH * 0.56, bodyW * 0.43, -bodyH * 0.08);
    g.bezierCurveTo(bodyW * 0.51, bodyH * 0.06, bodyW * 0.36, bodyH * 0.5, bodyW * 0.03, bodyH * 0.52);
    g.bezierCurveTo(-bodyW * 0.25, bodyH * 0.52, -bodyW * 0.42, bodyH * 0.28, -bodyW * 0.47, 0);
    g.closePath();
    g.fill();
    g.stroke();

    // Rostre / tête
    g.beginPath();
    g.moveTo(bodyW * 0.40, -bodyH * 0.08);
    g.quadraticCurveTo(bodyW * 0.57, -bodyH * 0.05, bodyW * 0.62, bodyH * 0.06);
    g.quadraticCurveTo(bodyW * 0.50, bodyH * 0.17, bodyW * 0.36, bodyH * 0.13);
    g.closePath();
    g.fill();

    // Queue souple
    const wag = Math.sin(t * (1.6 + velocity * 0.7) + phase) * bodyH * 0.16;
    g.beginPath();
    g.moveTo(-bodyW * 0.45, 0);
    g.quadraticCurveTo(-bodyW * 0.57, wag, -bodyW * 0.64, wag * 1.4);
    g.quadraticCurveTo(-bodyW * 0.73, -bodyH * 0.25 + wag, -bodyW * 0.80, -bodyH * 0.12 + wag);
    g.quadraticCurveTo(-bodyW * 0.70, bodyH * 0.02 + wag, -bodyW * 0.64, wag * 1.4);
    g.quadraticCurveTo(-bodyW * 0.72, bodyH * 0.28 + wag, -bodyW * 0.80, bodyH * 0.15 + wag);
    g.quadraticCurveTo(-bodyW * 0.70, -bodyH * 0.01 + wag, -bodyW * 0.45, 0);
    g.fill();

    // Nageoire
    g.fillStyle = "rgba(31,48,62,.9)";
    g.beginPath();
    g.moveTo(bodyW * 0.02, bodyH * 0.30);
    g.quadraticCurveTo(bodyW * 0.14, bodyH * 0.72, bodyW * 0.31, bodyH * 0.60);
    g.quadraticCurveTo(bodyW * 0.19, bodyH * 0.34, bodyW * 0.02, bodyH * 0.30);
    g.fill();

    // Oeil discret
    g.fillStyle = "rgba(220,235,242,.85)";
    g.beginPath();
    g.arc(bodyW * 0.38, -bodyH * 0.13, Math.max(1.5, 2.7 * s), 0, Math.PI * 2);
    g.fill();

    g.restore();
  }

  return drawableValue((g, width, height) => {
    const oldW = g.canvas?.width;
    const oldH = g.canvas?.height;
    // Le canvas de destination possède normalement ces dimensions ; les valeurs
    // width/height restent utilisées par le runtime lors du scaling.
    if (g.canvas && (!oldW || !oldH)) {
      g.canvas.width = width;
      g.canvas.height = height;
    }

    if (tr > 0) {
      whalePath(g, tr * 0.18, -34 * s, 5 * s, -0.55);
      whalePath(g, tr * 0.28, -20 * s, 3 * s, -0.32);
      whalePath(g, tr * 0.42, -9 * s, 1 * s, -0.15);
    }
    whalePath(g, 0.98, 0, 0, 0);
  }, "whale");
}
