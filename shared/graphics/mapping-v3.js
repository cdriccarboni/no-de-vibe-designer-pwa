/**
 * No-de Vibe Designer V3 — moteur de mapping.
 *
 * Coordonnées de calibration normalisées (0..1), ordre :
 * haut-gauche, haut-droite, bas-droite, bas-gauche.
 * Le moteur conserve un fallback CPU déterministe afin que le mapping
 * fonctionne aussi sans WebGPU/WebGL.
 */

export const DEFAULT_QUAD = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: 0, y: 1 })
]);

function clamp01(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

export function normalizeQuad(points = DEFAULT_QUAD) {
  const src = Array.isArray(points) && points.length === 4 ? points : DEFAULT_QUAD;
  return src.map((p, i) => ({
    x: clamp01(p?.x ?? DEFAULT_QUAD[i].x),
    y: clamp01(p?.y ?? DEFAULT_QUAD[i].y)
  }));
}

export function quadArea(points = DEFAULT_QUAD) {
  const p = normalizeQuad(points);
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    const a = p[i];
    const b = p[(i + 1) % 4];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) * 0.5;
}

export function validateQuad(points) {
  const quad = normalizeQuad(points);
  const area = quadArea(quad);
  const errors = [];
  if (area < 0.002) errors.push("Surface de mapping trop petite ou aplatie");
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const signs = [];
  for (let i = 0; i < 4; i++) {
    const z = cross(quad[i], quad[(i + 1) % 4], quad[(i + 2) % 4]);
    if (Math.abs(z) > 1e-8) signs.push(Math.sign(z));
  }
  if (signs.length && signs.some(s => s !== signs[0])) errors.push("Les coins du mapping se croisent");
  return { ok: errors.length === 0, errors, quad, area };
}

function solveLinear(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row.map(Number), Number(vector[i])]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) throw new Error("Calibration de mapping dégénérée");
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const div = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      if (!factor) continue;
      for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map(row => row[n]);
}

export function homographyFromUnitSquare(points = DEFAULT_QUAD) {
  const check = validateQuad(points);
  if (!check.ok) throw new Error(check.errors.join(" · "));
  const src = DEFAULT_QUAD;
  const dst = check.quad;
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const x = src[i].x, y = src[i].y, u = dst[i].x, v = dst[i].y;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solveLinear(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function invertHomography(m) {
  const [a,b,c,d,e,f,g,h,i] = m.map(Number);
  const A = e*i - f*h, B = -(d*i - f*g), C = d*h - e*g;
  const D = -(b*i - c*h), E = a*i - c*g, F = -(a*h - b*g);
  const G = b*f - c*e, H = -(a*f - c*d), I = a*e - b*d;
  const det = a*A + b*B + c*C;
  if (Math.abs(det) < 1e-12) throw new Error("Homographie non inversible");
  return [A/det, D/det, G/det, B/det, E/det, H/det, C/det, F/det, I/det];
}

export function transformPoint(m, point) {
  const x = Number(point?.x) || 0;
  const y = Number(point?.y) || 0;
  const w = m[6] * x + m[7] * y + m[8];
  if (Math.abs(w) < 1e-12) return { x: 0, y: 0 };
  return {
    x: (m[0] * x + m[1] * y + m[2]) / w,
    y: (m[3] * x + m[4] * y + m[5]) / w
  };
}

export function createMappingGrid(cols = 2, rows = 2, quad = DEFAULT_QUAD) {
  cols = Math.max(2, Math.min(16, Math.round(cols)));
  rows = Math.max(2, Math.min(16, Math.round(rows)));
  const H = homographyFromUnitSquare(quad);
  const points = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      points.push(transformPoint(H, { x: x / (cols - 1), y: y / (rows - 1) }));
    }
  }
  return { cols, rows, points };
}

export function warpPerspectiveFrame(frame, points = DEFAULT_QUAD, {
  background = [0, 0, 0, 0]
} = {}) {
  if (!frame?.pixels || !frame.width || !frame.height) throw new Error("Frame raster manquante pour mapping");
  const check = validateQuad(points);
  if (!check.ok) throw new Error(check.errors.join(" · "));
  const width = frame.width | 0;
  const height = frame.height | 0;
  const out = new Uint8ClampedArray(width * height * 4);
  const Hinv = invertHomography(homographyFromUnitSquare(check.quad));
  const bg = [
    Number(background[0]) || 0,
    Number(background[1]) || 0,
    Number(background[2]) || 0,
    Number(background[3]) || 0
  ];

  for (let y = 0; y < height; y++) {
    const ny = height > 1 ? y / (height - 1) : 0;
    for (let x = 0; x < width; x++) {
      const nx = width > 1 ? x / (width - 1) : 0;
      const src = transformPoint(Hinv, { x: nx, y: ny });
      const di = (y * width + x) * 4;
      if (src.x < 0 || src.x > 1 || src.y < 0 || src.y > 1) {
        out[di] = bg[0]; out[di + 1] = bg[1]; out[di + 2] = bg[2]; out[di + 3] = bg[3];
        continue;
      }
      const sx = Math.min(width - 1, Math.max(0, Math.round(src.x * (width - 1))));
      const sy = Math.min(height - 1, Math.max(0, Math.round(src.y * (height - 1))));
      const si = (sy * width + sx) * 4;
      out[di] = frame.pixels[si];
      out[di + 1] = frame.pixels[si + 1];
      out[di + 2] = frame.pixels[si + 2];
      out[di + 3] = frame.pixels[si + 3];
    }
  }

  return {
    width,
    height,
    pixels: out,
    kind: "video",
    source: "mapping-v3",
    mapping: { quad: check.quad, area: check.area }
  };
}

export function mappingParams(points = DEFAULT_QUAD, {
  gridCols = 2,
  gridRows = 2,
  source = "designer"
} = {}) {
  const check = validateQuad(points);
  if (!check.ok) throw new Error(check.errors.join(" · "));
  return {
    mappingV3: true,
    corners: check.quad,
    grid: createMappingGrid(gridCols, gridRows, check.quad),
    calibrationSource: source,
    calibratedAt: new Date().toISOString()
  };
}
