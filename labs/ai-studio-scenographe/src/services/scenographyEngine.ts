// Moteur Procédural d'Articulations et Silhouette Féline / Humanoïde
// No[co]de Vibe Designer — Le Scénographe
// Calcul cinématique direct, extraction de silhouette de costume (chapeau tricorne, sabre, redingote)
// et interpolation douce (anti-jitter) pour le spectacle vivant 100% hors-ligne.

import { SkeletonPose, Keypoint2D, CostumeDetails, LiveSilhouetteObject } from '../types/scenography';

/**
 * Génère une pose référence du comédien pirate selon le temps et le comportement
 */
export function generateSyntheticPiratePose(
  t: number,
  mode: 'idle_jardin' | 'walk_to_center' | 'sword_duel' | 'pirate_dance',
  speedMultiplier: number = 1.0
): SkeletonPose {
  const phase = t * 2.2 * speedMultiplier;

  // Positionnement de base du comédien
  let hipX = 0.5;
  let hipY = 0.65;
  let armSwingL = Math.sin(phase);
  let armSwingR = -Math.sin(phase);
  let legSwingL = -Math.sin(phase);
  let legSwingR = Math.sin(phase);

  if (mode === 'idle_jardin') {
    hipX = 0.25;
    const breathe = Math.sin(t * 1.5) * 0.01;
    hipY = 0.65 + breathe;
    armSwingL = 0.2 + Math.sin(t * 1.2) * 0.05;
    armSwingR = -0.3 + Math.sin(t * 1.4) * 0.04;
    legSwingL = 0;
    legSwingR = 0;
  } else if (mode === 'walk_to_center') {
    hipX = 0.25 + (Math.sin(t * 0.5) * 0.5 + 0.5) * 0.25; // avance vers 0.50
    hipY = 0.65 + Math.abs(Math.sin(phase)) * 0.015;
  } else if (mode === 'pirate_dance') {
    hipX = 0.5 + Math.sin(t * 1.1) * 0.08;
    hipY = 0.64 + Math.abs(Math.sin(phase * 1.5)) * 0.03;
    armSwingL = Math.sin(phase) * 1.2;
    armSwingR = Math.cos(phase * 0.8) * 1.1;
  } else if (mode === 'sword_duel') {
    hipX = 0.5;
    hipY = 0.66;
    armSwingL = 0.6 + Math.sin(phase * 2) * 0.4;
    armSwingR = -0.5 + Math.sin(phase * 1.8) * 0.6; // Sabre en main
  }

  const shoulderY = hipY - 0.22;
  const shoulderSpan = 0.07;
  const hipSpan = 0.045;

  return {
    leftShoulder: { x: hipX - shoulderSpan, y: shoulderY, score: 0.98 },
    rightShoulder: { x: hipX + shoulderSpan, y: shoulderY, score: 0.98 },
    leftElbow: { x: hipX - shoulderSpan - 0.04 + armSwingL * 0.03, y: shoulderY + 0.1, score: 0.95 },
    rightElbow: { x: hipX + shoulderSpan + 0.04 + armSwingR * 0.03, y: shoulderY + 0.1, score: 0.95 },
    leftWrist: { x: hipX - shoulderSpan - 0.06 + armSwingL * 0.07, y: shoulderY + 0.18 + armSwingL * 0.04, score: 0.92 },
    rightWrist: { x: hipX + shoulderSpan + 0.06 + armSwingR * 0.07, y: shoulderY + 0.17 + armSwingR * 0.05, score: 0.92 },
    leftHip: { x: hipX - hipSpan, y: hipY, score: 0.98 },
    rightHip: { x: hipX + hipSpan, y: hipY, score: 0.98 },
    leftKnee: { x: hipX - hipSpan - 0.01 + legSwingL * 0.03, y: hipY + 0.13, score: 0.95 },
    rightKnee: { x: hipX + hipSpan + 0.01 + legSwingR * 0.03, y: hipY + 0.13, score: 0.95 },
    leftAnkle: { x: hipX - hipSpan - 0.02 + legSwingL * 0.06, y: hipY + 0.26 - Math.max(0, -legSwingL * 0.03), score: 0.94 },
    rightAnkle: { x: hipX + hipSpan + 0.02 + legSwingR * 0.06, y: hipY + 0.26 - Math.max(0, -legSwingR * 0.03), score: 0.94 }
  };
}

/**
 * Interpolation exponentielle douce entre deux poses squelettiques (filtre anti-jitter)
 */
export function smoothPose(current: SkeletonPose, target: SkeletonPose, factor: number): SkeletonPose {
  const lerp = (a: Keypoint2D, b: Keypoint2D): Keypoint2D => ({
    x: a.x + (b.x - a.x) * factor,
    y: a.y + (b.y - a.y) * factor,
    score: (a.score + b.score) / 2
  });

  return {
    leftShoulder: lerp(current.leftShoulder, target.leftShoulder),
    rightShoulder: lerp(current.rightShoulder, target.rightShoulder),
    leftElbow: lerp(current.leftElbow, target.leftElbow),
    rightElbow: lerp(current.rightElbow, target.rightElbow),
    leftWrist: lerp(current.leftWrist, target.leftWrist),
    rightWrist: lerp(current.rightWrist, target.rightWrist),
    leftHip: lerp(current.leftHip, target.leftHip),
    rightHip: lerp(current.rightHip, target.rightHip),
    leftKnee: lerp(current.leftKnee, target.leftKnee),
    rightKnee: lerp(current.rightKnee, target.rightKnee),
    leftAnkle: lerp(current.leftAnkle, target.leftAnkle),
    rightAnkle: lerp(current.rightAnkle, target.rightAnkle)
  };
}

/**
 * Dessine la silhouette projetée de l'Ombre du Pirate sur un contexte Canvas 2D
 * avec son costume distinctif : chapeau tricorne à plumes, pan de redingote, ceinture et sabre.
 */
export function renderPirateShadowCanvas(
  ctx: CanvasRenderingContext2D,
  pose: SkeletonPose,
  transform: LiveSilhouetteObject['transform'],
  costume: CostumeDetails,
  width: number,
  height: number,
  opts: {
    color?: string;
    glowColor?: string;
    glowBlur?: number;
    showSkeletonMesh?: boolean;
    opacity?: number;
  } = {}
) {
  const {
    color = '#121519',
    glowColor = 'rgba(6, 182, 212, 0.4)',
    glowBlur = 14,
    showSkeletonMesh = false,
    opacity = 1.0
  } = opts;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, transform.opacity * opacity));

  // Transformation d'objet scénographique (Layer projection)
  const originX = width * transform.x;
  const originY = height * transform.y;

  ctx.translate(originX, originY);
  ctx.rotate((transform.rotationDeg * Math.PI) / 180);
  ctx.scale(
    (transform.flipHorizontal ? -1 : 1) * transform.scale,
    transform.scale
  );

  // Conversion en coordonnées locales centrées
  const baseHipX = (pose.leftHip.x + pose.rightHip.x) / 2;
  const baseHipY = (pose.leftHip.y + pose.rightHip.y) / 2;

  const toLocal = (pt: Keypoint2D) => ({
    x: (pt.x - baseHipX) * width,
    y: (pt.y - baseHipY) * height
  });

  const ls = toLocal(pose.leftShoulder);
  const rs = toLocal(pose.rightShoulder);
  const le = toLocal(pose.leftElbow);
  const re = toLocal(pose.rightElbow);
  const lw = toLocal(pose.leftWrist);
  const rw = toLocal(pose.rightWrist);
  const lh = toLocal(pose.leftHip);
  const rh = toLocal(pose.rightHip);
  const lk = toLocal(pose.leftKnee);
  const rk = toLocal(pose.rightKnee);
  const la = toLocal(pose.leftAnkle);
  const ra = toLocal(pose.rightAnkle);

  const neck = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 - 10 };
  const head = { x: neck.x, y: neck.y - 42 };

  // 1. OMBRE PORTÉE & HALO SCÉNIQUE
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = glowBlur;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  // Helper pour dessiner un membre volumique organique (capsule de silhouette)
  const drawLimb = (p1: { x: number; y: number }, p2: { x: number; y: number }, r1: number, r2: number) => {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const pA1 = { x: p1.x + Math.cos(angle + Math.PI / 2) * r1, y: p1.y + Math.sin(angle + Math.PI / 2) * r1 };
    const pA2 = { x: p1.x + Math.cos(angle - Math.PI / 2) * r1, y: p1.y + Math.sin(angle - Math.PI / 2) * r1 };
    const pB1 = { x: p2.x + Math.cos(angle + Math.PI / 2) * r2, y: p2.y + Math.sin(angle + Math.PI / 2) * r2 };
    const pB2 = { x: p2.x + Math.cos(angle - Math.PI / 2) * r2, y: p2.y + Math.sin(angle - Math.PI / 2) * r2 };

    ctx.beginPath();
    ctx.moveTo(pA1.x, pA1.y);
    ctx.lineTo(pB1.x, pB1.y);
    ctx.arc(p2.x, p2.y, r2, angle + Math.PI / 2, angle - Math.PI / 2, true);
    ctx.lineTo(pA2.x, pA2.y);
    ctx.arc(p1.x, p1.y, r1, angle - Math.PI / 2, angle + Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();
  };

  // Jambes (Bottes de pirate larges)
  drawLimb(lh, lk, 14, 11);
  drawLimb(lk, la, 11, 15); // Revers de botte haut
  drawLimb(rh, rk, 14, 11);
  drawLimb(rk, ra, 11, 15);

  // Pieds / Talons de botte
  ctx.beginPath();
  ctx.ellipse(la.x - 4, la.y + 4, 14, 7, -0.1, 0, Math.PI * 2);
  ctx.ellipse(ra.x + 4, ra.y + 4, 14, 7, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Torse & Veste de pirate
  ctx.beginPath();
  ctx.moveTo(ls.x - 6, ls.y);
  ctx.lineTo(rs.x + 6, rs.y);
  ctx.lineTo(rh.x + 12, rh.y);
  ctx.lineTo(lh.x - 12, lh.y);
  ctx.closePath();
  ctx.fill();

  // Redingote : pans de manteau qui flottent vers le bas
  if (costume.hasCoatFlaps) {
    ctx.beginPath();
    ctx.moveTo(lh.x - 12, lh.y);
    ctx.lineTo(rh.x + 12, rh.y);
    ctx.quadraticCurveTo(rh.x + 24, rh.y + 45, rh.x + 16, rh.y + 65);
    ctx.lineTo(lh.x - 16, lh.y + 65);
    ctx.quadraticCurveTo(lh.x - 24, lh.y + 45, lh.x - 12, lh.y);
    ctx.closePath();
    ctx.fill();
  }

  // Ceinture large / Baudrier
  if (costume.hasSashBelt) {
    ctx.save();
    ctx.fillStyle = '#1c222b';
    ctx.beginPath();
    ctx.rect(lh.x - 10, (lh.y + rh.y) / 2 - 6, (rh.x - lh.x) + 20, 14);
    ctx.fill();
    ctx.restore();
  }

  // Bras (Manches bouffantes)
  drawLimb(ls, le, 12, 10);
  drawLimb(le, lw, 10, 8);
  drawLimb(rs, re, 12, 10);
  drawLimb(re, rw, 10, 8);

  // Mains
  ctx.beginPath();
  ctx.arc(lw.x, lw.y, 7, 0, Math.PI * 2);
  ctx.arc(rw.x, rw.y, 7, 0, Math.PI * 2);
  ctx.fill();

  // Sabre / Rapière à la ceinture ou en main droite
  if (costume.hasCutlassSabre) {
    ctx.save();
    ctx.strokeStyle = '#2b333e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    // Lame courbe de sabre d'abordage
    ctx.moveTo(rh.x + 4, rh.y + 6);
    ctx.quadraticCurveTo(rh.x + 35, rh.y + 45, rh.x + 50, rh.y + 80);
    ctx.stroke();
    // Garde du sabre
    ctx.fillStyle = '#3a4452';
    ctx.beginPath();
    ctx.arc(rh.x + 8, rh.y + 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Tête
  ctx.beginPath();
  ctx.arc(head.x, head.y, 16, 0, Math.PI * 2);
  ctx.fill();

  // CHAPEAU TRICORNE DU PIRATE CARACTÉRISTIQUE
  if (costume.hatType === 'tricorn') {
    ctx.save();
    ctx.beginPath();
    // Calotte et bord retroussé en trois pointes
    const hatBaseY = head.y - 6;
    ctx.moveTo(head.x - 38, hatBaseY + 4);
    ctx.lineTo(head.x - 22, hatBaseY - 26);
    ctx.lineTo(head.x, hatBaseY - 14);
    ctx.lineTo(head.x + 22, hatBaseY - 26);
    ctx.lineTo(head.x + 38, hatBaseY + 4);
    ctx.quadraticCurveTo(head.x, hatBaseY + 12, head.x - 38, hatBaseY + 4);
    ctx.closePath();
    ctx.fill();

    // Panache de plume au vent
    ctx.beginPath();
    ctx.moveTo(head.x - 14, hatBaseY - 18);
    ctx.quadraticCurveTo(head.x - 34, hatBaseY - 42, head.x - 44, hatBaseY - 32);
    ctx.quadraticCurveTo(head.x - 30, hatBaseY - 22, head.x - 14, hatBaseY - 14);
    ctx.fill();
    ctx.restore();
  }

  // AFFICHAGE OPTIONNEL DU MAILLAGE SQUELETTIQUE EN SUPERPOSITION
  if (showSkeletonMesh) {
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const bones = [
      [ls, rs], [ls, le], [le, lw],
      [rs, re], [re, rw],
      [ls, lh], [rs, rh], [lh, rh],
      [lh, lk], [lk, la],
      [rh, rk], [rk, ra],
      [neck, head]
    ];
    for (const [p1, p2] of bones) {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    for (const pt of [ls, rs, le, re, lw, rw, lh, rh, lk, rk, la, ra, head]) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}
