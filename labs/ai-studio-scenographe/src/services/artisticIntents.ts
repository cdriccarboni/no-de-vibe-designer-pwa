import { ArtisticScene, ArtisticParameter } from '../types/artist';
import { EngineId } from '../types/engine';
import { ENGINE_ADAPTERS } from './adapters';

// Script Canvas 2D pour le « Chat de lumière »
// Silhouette féline agrandie, immédiatement reconnaissable en néon stylisé sur fond noir avec cinématique articulée,
// contrôle de taille et position, confinement dans le cadre, postures distinctes (assis, marche, course)
// et traînées lumineuses attachées au corps et à la queue
const LIGHT_CAT_CODE = `// No[co]de Vibe Designer — Scène : Chat de lumière (Mise en scène Haute Définition)
// Silhouette féline stylisée en néon dynamique avec traînées lumineuses attachées aux mouvements réels

let catInternalPos = { x: 0.5, y: 0.72 };
let stridePhase = 0;
let bodyTrails = []; // Traînées lumineuses rémanentes du corps et de la queue

function drawNeonLine(p1, p2, color, weight, blur) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.stroke();

  // Cœur blanc éclatant pour tube néon pur
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, weight * 0.35);
  ctx.shadowBlur = blur * 0.4;
  ctx.stroke();
  ctx.restore();
}

function drawNeonSpline(pts, color, weight, blur) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const xc = (pts[i - 1].x + pts[i].x) / 2;
    const yc = (pts[i - 1].y + pts[i].y) / 2;
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, weight * 0.3);
  ctx.stroke();
  ctx.restore();
}

function render(t) {
  const u = window.uniforms || {};
  const speed = (u['Vitesse'] !== undefined) ? u['Vitesse'] : 1.1;
  const posture = (u['Allure'] !== undefined) ? Math.round(u['Allure']) : 1; // 0: Assis, 1: Marche, 2: Course
  const bodyHue = (u['Couleur'] !== undefined) ? u['Couleur'] : 205; // 205: Bleu électrique
  const tailHue = (u['QueueCouleur'] !== undefined) ? u['QueueCouleur'] : 355; // 355: Rouge rubis
  const trailLen = (u['TraineeLongueur'] !== undefined) ? u['TraineeLongueur'] : 1.6;
  const glow = (u['Glow'] !== undefined) ? u['Glow'] * 14 : 20;

  // Nouveaux paramètres de mise en scène scénographique
  // Échelle du chat (1.0 = standard, 1.4 = agrandi scénique par défaut, 2.2 = gros plan)
  const userScale = (u['Taille'] !== undefined) ? u['Taille'] : 1.4;
  // Position X & Y normalisées (0.0 à 1.0)
  const normX = (u['PositionX'] !== undefined) ? u['PositionX'] : 0.5;
  const normY = (u['PositionY'] !== undefined) ? u['PositionY'] : 0.72;

  const baseScale = Math.min(width, height) / 540 * userScale;

  const bodyColor = \`hsla(\${bodyHue}, 90%, 65%, 0.95)\`;
  const bodyColorSoft = \`hsla(\${bodyHue}, 85%, 60%, 0.5)\`;
  const tailColor = \`hsla(\${tailHue}, 95%, 60%, 0.9)\`;

  // Rémanence scénique noire sur fond obscur
  ctx.fillStyle = 'rgba(9, 9, 11, 0.22)';
  ctx.fillRect(0, 0, width, height);

  // Positionnement du sol scénique relatif
  const groundY = height * normY;

  // Ligne de sol scénique lumineuse discrète
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, groundY + 10 * baseScale);
  ctx.lineTo(width, groundY + 10 * baseScale);
  ctx.strokeStyle = 'rgba(63, 63, 70, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // Marges dynamiques pour empêcher que le chat sorte involontairement du cadre
  const halfCatW = 120 * baseScale;
  const minX = halfCatW + 20;
  const maxX = width - halfCatW - 20;

  if (posture === 0) {
    // Posture Assis : Position stable centrée ou réglée sans fuite
    catInternalPos.x = width * normX;
    stridePhase *= 0.92;
  } else if (posture === 1) {
    // Posture Marche : Allure souple qui patrouille dans le cadre sans en sortir
    stridePhase += 0.08 * speed;
    const marchSpan = Math.max(80, (maxX - minX) * 0.85);
    const marchCenter = (minX + maxX) / 2 + (normX - 0.5) * (width * 0.3);
    catInternalPos.x = marchCenter + Math.sin(stridePhase * 0.5) * (marchSpan * 0.5);
  } else {
    // Posture Course : Foulée athlétique qui bondit et traverse de gauche à droite
    stridePhase += 0.16 * speed;
    const runSpan = Math.max(120, (maxX - minX));
    const runCenter = (minX + maxX) / 2;
    // Oscillation large de course mais rigoureusement contrainte dans les marges de l'écran
    const runProgress = (t * 0.8 * speed) % 2; // 0 à 2 (aller-retour fluide ou traversée cadrée)
    const runX = minX + (runProgress <= 1 ? runProgress : 2 - runProgress) * runSpan;
    catInternalPos.x = runX;
  }

  // Clamping strict pour garantir que le chat ne sorte jamais du cadre
  const clampedX = Math.max(minX, Math.min(maxX, catInternalPos.x));
  const clampedY = Math.max(120 * baseScale, Math.min(height - 40, groundY));

  const bx = clampedX;
  const by = clampedY;

  // CINÉMATIQUE SQUELETTIQUE ADAPTATIVE SELON POSTURE
  let shoulder, hip, head;
  let fl_leg, fr_leg, bl_leg, br_leg;
  let spineFlex = 0;

  if (posture === 0) {
    // === POSTURE 0 : ASSIS NOBLEMENT ===
    // Dos redressé, pattes avant droites, pattes arrière pliées, tête haute
    hip = { x: bx - 28 * baseScale, y: by - 36 * baseScale };
    shoulder = { x: bx + 16 * baseScale, y: by - 100 * baseScale };
    head = { x: bx + 36 * baseScale, y: by - 146 * baseScale + Math.sin(t * 1.8) * 3 };

    // Pattes avant verticales au sol
    fl_leg = [
      { x: shoulder.x - 4 * baseScale, y: shoulder.y },
      { x: shoulder.x - 3 * baseScale, y: by }
    ];
    fr_leg = [
      { x: shoulder.x + 10 * baseScale, y: shoulder.y },
      { x: shoulder.x + 11 * baseScale, y: by }
    ];

    // Pattes arrière repliées en arc contre le sol
    bl_leg = [
      { x: hip.x, y: hip.y },
      { x: hip.x - 20 * baseScale, y: by - 18 * baseScale },
      { x: hip.x + 12 * baseScale, y: by }
    ];
    br_leg = [
      { x: hip.x + 6 * baseScale, y: hip.y },
      { x: hip.x - 12 * baseScale, y: by - 18 * baseScale },
      { x: hip.x + 20 * baseScale, y: by }
    ];

  } else if (posture === 1) {
    // === POSTURE 1 : MARCHE SOUPLE ET NATURELLE ===
    const walkBob = Math.sin(stridePhase * 2) * 5 * baseScale;
    hip = { x: bx - 65 * baseScale, y: by - 70 * baseScale + walkBob };
    shoulder = { x: bx + 50 * baseScale, y: by - 74 * baseScale - walkBob };
    head = { x: shoulder.x + 40 * baseScale, y: shoulder.y - 42 * baseScale + Math.sin(stridePhase) * 4 };
    spineFlex = Math.sin(stridePhase) * 7 * baseScale;

    // Déphasage des 4 pattes de marche (quadrupède à 4 temps)
    const p1 = Math.sin(stridePhase);
    const p2 = Math.sin(stridePhase + Math.PI);
    const p3 = Math.sin(stridePhase + Math.PI * 0.5);
    const p4 = Math.sin(stridePhase + Math.PI * 1.5);

    // Patte avant gauche
    fl_leg = [
      shoulder,
      { x: shoulder.x + p1 * 26 * baseScale, y: shoulder.y + 36 * baseScale },
      { x: shoulder.x + p1 * 46 * baseScale, y: by - Math.max(0, -p1 * 20 * baseScale) }
    ];
    // Patte avant droite
    fr_leg = [
      { x: shoulder.x + 12 * baseScale, y: shoulder.y },
      { x: shoulder.x + 12 * baseScale + p2 * 26 * baseScale, y: shoulder.y + 36 * baseScale },
      { x: shoulder.x + 12 * baseScale + p2 * 46 * baseScale, y: by - Math.max(0, -p2 * 20 * baseScale) }
    ];
    // Patte arrière gauche (jarret articulé félin)
    bl_leg = [
      hip,
      { x: hip.x - 18 * baseScale + p3 * 30 * baseScale, y: hip.y + 32 * baseScale },
      { x: hip.x - 26 * baseScale + p3 * 50 * baseScale, y: by - Math.max(0, -p3 * 22 * baseScale) }
    ];
    // Patte arrière droite
    br_leg = [
      { x: hip.x + 8 * baseScale, y: hip.y },
      { x: hip.x - 10 * baseScale + p4 * 30 * baseScale, y: hip.y + 32 * baseScale },
      { x: hip.x - 18 * baseScale + p4 * 50 * baseScale, y: by - Math.max(0, -p4 * 22 * baseScale) }
    ];

  } else {
    // === POSTURE 2 : COURSE BONDISSANTE ATHLÉTIQUE ===
    // Extension et flexion vigoureuse de la colonne vertébrale
    const gallop = Math.sin(stridePhase);
    const suspension = -Math.max(0, Math.sin(stridePhase)) * 26 * baseScale;
    spineFlex = gallop * 18 * baseScale;

    hip = { x: bx - 85 * baseScale, y: by - 68 * baseScale + suspension + gallop * 12 * baseScale };
    shoulder = { x: bx + 65 * baseScale, y: by - 72 * baseScale + suspension - gallop * 10 * baseScale };
    head = { x: shoulder.x + 52 * baseScale, y: shoulder.y - 36 * baseScale + gallop * 8 * baseScale };

    // En course, extension des membres avant et propulsion arrière
    const frontReach = Math.cos(stridePhase) * 60 * baseScale;
    const backReach = -Math.cos(stridePhase) * 65 * baseScale;

    fl_leg = [
      shoulder,
      { x: shoulder.x + frontReach * 0.6, y: shoulder.y + 34 * baseScale },
      { x: shoulder.x + frontReach, y: by + suspension + Math.abs(gallop) * 10 * baseScale }
    ];
    fr_leg = [
      { x: shoulder.x + 14 * baseScale, y: shoulder.y },
      { x: shoulder.x + 14 * baseScale + frontReach * 0.7, y: shoulder.y + 34 * baseScale },
      { x: shoulder.x + 14 * baseScale + frontReach * 1.1, y: by + suspension + Math.abs(gallop) * 8 * baseScale }
    ];

    bl_leg = [
      hip,
      { x: hip.x + backReach * 0.5, y: hip.y + 32 * baseScale },
      { x: hip.x + backReach, y: by + suspension + Math.abs(gallop) * 12 * baseScale }
    ];
    br_leg = [
      { x: hip.x + 10 * baseScale, y: hip.y },
      { x: hip.x + 10 * baseScale + backReach * 0.6, y: hip.y + 32 * baseScale },
      { x: hip.x + 10 * baseScale + backReach * 1.1, y: by + suspension + Math.abs(gallop) * 10 * baseScale }
    ];
  }

  // 1. DESSIN DES PATTES EN ARRIÈRE-PLAN
  drawNeonSpline(bl_leg, bodyColorSoft, 3.2 * baseScale, glow * 0.7);
  drawNeonSpline(fl_leg, bodyColorSoft, 3.2 * baseScale, glow * 0.7);

  // 2. DESSIN DU CORPS & ÉCHINE FÉLINE SOUPLE
  const midSpine = {
    x: (hip.x + shoulder.x) / 2,
    y: (hip.y + shoulder.y) / 2 - 16 * baseScale + spineFlex
  };
  drawNeonSpline([hip, midSpine, shoulder], bodyColor, 4.2 * baseScale, glow);

  // Ligne de ventre / poitrail félin
  const bellyMid = { x: midSpine.x, y: midSpine.y + 34 * baseScale };
  drawNeonSpline([hip, bellyMid, shoulder], bodyColorSoft, 2.6 * baseScale, glow * 0.6);

  // 3. DESSIN DES PATTES AU PREMIER PLAN
  drawNeonSpline(br_leg, bodyColor, 3.8 * baseScale, glow);
  drawNeonSpline(fr_leg, bodyColor, 3.8 * baseScale, glow);

  // 4. DESSIN DE LA TÊTE, OREILLES POINTUES, YEUX EN AMANDE & MOUSTACHES
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(head.x, head.y, 22 * baseScale, 18 * baseScale, 0.08, 0, Math.PI * 2);
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 3.6 * baseScale;
  ctx.shadowColor = bodyColor;
  ctx.shadowBlur = glow;
  ctx.stroke();

  // Oreille gauche pointue
  const earL = [
    { x: head.x - 11 * baseScale, y: head.y - 10 * baseScale },
    { x: head.x - 18 * baseScale, y: head.y - 46 * baseScale },
    { x: head.x + 2 * baseScale, y: head.y - 16 * baseScale }
  ];
  drawNeonSpline(earL, bodyColor, 3.4 * baseScale, glow);

  // Oreille droite pointue
  const earR = [
    { x: head.x + 4 * baseScale, y: head.y - 16 * baseScale },
    { x: head.x + 22 * baseScale, y: head.y - 46 * baseScale },
    { x: head.x + 16 * baseScale, y: head.y - 8 * baseScale }
  ];
  drawNeonSpline(earR, bodyColor, 3.4 * baseScale, glow);

  // Yeux félins en amande dorée éclatante
  const eyeL = { x: head.x + 4 * baseScale, y: head.y - 2 * baseScale };
  const eyeR = { x: head.x + 15 * baseScale, y: head.y - 1 * baseScale };
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = '#fef08a';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(eyeL.x, eyeL.y, 4.5 * baseScale, 2.8 * baseScale, 0.2, 0, Math.PI * 2);
  ctx.ellipse(eyeR.x, eyeR.y, 4.5 * baseScale, 2.8 * baseScale, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Moustaches lumineuses caractéristiques
  const snout = { x: head.x + 18 * baseScale, y: head.y + 6 * baseScale };
  const whiskers = [
    [{ x: snout.x, y: snout.y - 3 * baseScale }, { x: snout.x + 24 * baseScale, y: snout.y - 10 * baseScale }],
    [{ x: snout.x, y: snout.y }, { x: snout.x + 28 * baseScale, y: snout.y + 1 * baseScale }],
    [{ x: snout.x, y: snout.y + 3 * baseScale }, { x: snout.x + 24 * baseScale, y: snout.y + 12 * baseScale }],
  ];
  for (const w of whiskers) {
    drawNeonLine(w[0], w[1], bodyColor, 1.4 * baseScale, glow * 0.5);
  }
  ctx.restore();

  // 5. DESSIN DE LA QUEUE ONDULANTE
  let tailPts = [];
  const numTailSegs = 8;
  const tailBase = { x: hip.x - 5 * baseScale, y: hip.y + 3 * baseScale };

  if (posture === 0) {
    // Queue enroulée au sol délicatement devant les pattes
    tailPts.push(tailBase);
    tailPts.push({ x: tailBase.x - 22 * baseScale, y: by - 16 * baseScale });
    tailPts.push({ x: tailBase.x - 16 * baseScale, y: by + 3 * baseScale });
    tailPts.push({ x: tailBase.x + 24 * baseScale, y: by + 6 * baseScale });
    tailPts.push({ x: tailBase.x + 50 * baseScale, y: by + Math.sin(t * 3) * 4 * baseScale });
  } else {
    // Queue sinusoïdale fouettant l'air selon la cadence
    const tailWave = stridePhase * (posture === 2 ? 1.5 : 1.0);
    for (let i = 0; i <= numTailSegs; i++) {
      const frac = i / numTailSegs;
      const tx = tailBase.x - (frac * 72 * baseScale) + (posture === 2 ? -frac * 28 * baseScale : 0);
      const ty = tailBase.y - Math.sin(frac * Math.PI) * 30 * baseScale + Math.sin(tailWave - frac * 3.6) * (18 * baseScale + frac * 16 * baseScale);
      tailPts.push({ x: tx, y: ty });
    }
  }

  drawNeonSpline(tailPts, bodyColor, 3.6 * baseScale, glow);

  // 6. TRAÎNÉES LUMINEUSES ATTACHÉES AUX MOUVEMENTS RÉELS DU CORPS
  const tailTip = tailPts[tailPts.length - 1];

  // A. Émission de sillage sur la queue (Teinte personnalisée rouge rubis ou choisie)
  if (posture > 0 && Math.random() < 0.9) {
    bodyTrails.push({
      x: tailTip.x,
      y: tailTip.y,
      vx: (Math.random() - 0.7) * 2 - (posture === 2 ? 5 : 2),
      vy: (Math.random() - 0.5) * 2,
      life: 1.0,
      decay: (0.016 / trailLen),
      hue: tailHue,
      size: (Math.random() * 5 + 3) * baseScale,
      type: 'tail'
    });
  }

  // B. Émission de traînée cinétique le long de la colonne et des membres en mouvement
  if (posture > 0 && Math.random() < 0.6) {
    // Échine
    bodyTrails.push({
      x: midSpine.x + (Math.random() - 0.5) * 10 * baseScale,
      y: midSpine.y + (Math.random() - 0.5) * 8 * baseScale,
      vx: -(posture === 2 ? 3.5 : 1.2),
      vy: (Math.random() - 0.5) * 1.5,
      life: 0.8,
      decay: (0.022 / trailLen),
      hue: bodyHue,
      size: (Math.random() * 4 + 2) * baseScale,
      type: 'body'
    });

    // Pattes d'appui
    bodyTrails.push({
      x: br_leg[2].x,
      y: br_leg[2].y,
      vx: -(posture === 2 ? 2.5 : 0.8),
      vy: -Math.random() * 2,
      life: 0.6,
      decay: (0.03 / trailLen),
      hue: bodyHue,
      size: (Math.random() * 3 + 2) * baseScale,
      type: 'paw'
    });
  }

  // C. Rendu et dissipation des particules de traînées
  for (let i = bodyTrails.length - 1; i >= 0; i--) {
    const p = bodyTrails[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    if (p.life <= 0) {
      bodyTrails.splice(i, 1);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      const col = \`hsla(\${p.hue}, 95%, 60%, \${p.life * 0.85})\`;
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14 * p.life * baseScale;
      ctx.fill();
      ctx.restore();
    }
  }
}

window.onFrame = render;`;

export const CURATED_ARTISTIC_SCENES: ArtisticScene[] = [
  // NOUVELLE SCÈNE PRIORITAIRE : CHAT DE LUMIÈRE
  {
    id: 'scene-light-cat',
    title: 'Chat de lumière',
    category: 'Danse & Chorégraphie',
    intentionText: 'Un véritable chat stylisé dessiné par des lignes lumineuses sur fond noir, animé par un mouvement félin naturel avec traînées lumineuses.',
    selectedEngineId: 'javascript',
    engineReasoning: 'Sélection automatique : Moteur JavaScript Canvas 2D pour une cinématique vectorielle fluide à 60 FPS avec traînées de particules.',
    visualMood: 'Félin néon cyan & bleu électrique, yeux dorés, traînée cinétique rouge',
    code: LIGHT_CAT_CODE,
    parameters: [
      {
        id: 'param-cat-speed',
        label: 'Vitesse de déplacement',
        description: 'Cadence de marche ou de course du chat sur la scène',
        value: 1.1,
        min: 0.1,
        max: 3.0,
        step: 0.05,
        mappedEngineParam: 'Vitesse'
      },
      {
        id: 'param-cat-posture',
        label: 'Allure féline (0: Assis, 1: Marche, 2: Course)',
        description: 'État postural du félin : assis replié, marche souple ou course bondissante',
        value: 1.0,
        min: 0.0,
        max: 2.0,
        step: 1.0,
        mappedEngineParam: 'Allure'
      },
      {
        id: 'param-cat-color',
        label: 'Lumière des contours (Teinte)',
        description: 'Couleur spectrale néon du corps félin (205 = Bleu électrique)',
        value: 205.0,
        min: 0.0,
        max: 360.0,
        step: 5.0,
        mappedEngineParam: 'Couleur'
      },
      {
        id: 'param-cat-tail-color',
        label: 'Lumière de la traînée (Queue)',
        description: 'Couleur des étincelles et du sillage de queue (355 = Rouge carmin)',
        value: 355.0,
        min: 0.0,
        max: 360.0,
        step: 5.0,
        mappedEngineParam: 'QueueCouleur'
      },
      {
        id: 'param-cat-trail-len',
        label: 'Persistance des traînées',
        description: 'Longueur et durée de vie du sillage lumineux',
        value: 1.6,
        min: 0.2,
        max: 3.0,
        step: 0.1,
        mappedEngineParam: 'TraineeLongueur'
      },
      {
        id: 'param-cat-glow',
        label: 'Luminescence néon (Glow)',
        description: 'Intensité du halo lumineux perçu sur le plateau obscur',
        value: 1.5,
        min: 0.5,
        max: 2.8,
        step: 0.05,
        mappedEngineParam: 'Glow'
      },
      {
        id: 'param-cat-scale',
        label: 'Taille du chat (Échelle)',
        description: 'Grossissement scénique pour une visibilité optimale sur scène',
        value: 1.4,
        min: 0.6,
        max: 2.4,
        step: 0.1,
        mappedEngineParam: 'Taille'
      },
      {
        id: 'param-cat-pos-x',
        label: 'Position horizontale (Axe X)',
        description: 'Cadrage scénique gauche/droite (reste confiné dans l\'écran)',
        value: 0.5,
        min: 0.1,
        max: 0.9,
        step: 0.02,
        mappedEngineParam: 'PositionX'
      },
      {
        id: 'param-cat-pos-y',
        label: 'Position verticale (Ligne de sol Y)',
        description: 'Hauteur d\'évolution du félin sur le plateau',
        value: 0.72,
        min: 0.35,
        max: 0.88,
        step: 0.02,
        mappedEngineParam: 'PositionY'
      }
    ]
  },
  // SCÈNE 2 : VORTEX POUR CHORÉGRAPHIE (Conservée intégralement)
  {
    id: 'scene-vortex-choreo',
    title: 'Vortex Luminescent pour Chorégraphie',
    category: 'Danse & Chorégraphie',
    intentionText: 'Un vortex fluide réagissant aux mouvements des danseurs avec une traînée optique chaude et des pulsations régulières.',
    selectedEngineId: 'hybrid-p5-glsl',
    engineReasoning: 'Sélection automatique : Pipeline Hybride p5.js ➔ GLSL pour combiner la géométrie procédurale temps réel avec un post-processing GPU de distorsion optique.',
    visualMood: 'Luminescence organique, distorsion de lentille, pulsation scénique',
    code: ENGINE_ADAPTERS.find(a => a.id === 'hybrid-p5-glsl')?.presets[0].code || '',
    secondaryCode: ENGINE_ADAPTERS.find(a => a.id === 'hybrid-p5-glsl')?.presets[0].secondaryCode || '',
    parameters: [
      {
        id: 'param-speed',
        label: 'Vitesse cinétique',
        description: 'Vitesse de rotation et d’expansion de la géométrie scénique',
        value: 1.2,
        min: 0.1,
        max: 3.0,
        step: 0.05,
        mappedEngineParam: 'Aberration'
      },
      {
        id: 'param-distortion',
        label: 'Distorsion optique (Lentille)',
        description: 'Effet de courbure cathodique et immersion visuelle',
        value: 1.3,
        min: 0.0,
        max: 2.5,
        step: 0.05,
        mappedEngineParam: 'Courbure'
      },
      {
        id: 'param-density',
        label: 'Texture scénique (Scanlines)',
        description: 'Grain de balayage apportant du relief sous projecteurs',
        value: 0.7,
        min: 0.0,
        max: 2.0,
        step: 0.05,
        mappedEngineParam: 'Scanlines'
      },
      {
        id: 'param-glow',
        label: 'Intensité lumineuse (Glow)',
        description: 'Luminescence perçue dans la pénombre du plateau',
        value: 1.4,
        min: 0.2,
        max: 2.5,
        step: 0.05,
        mappedEngineParam: 'Glow'
      }
    ]
  },
  // SCÈNE 3 : OCÉAN SPECTRAL GLSL (Conservée intégralement)
  {
    id: 'scene-liquid-plasma',
    title: 'Océan Spectral & Nappe Fluide',
    category: 'Installation Immersive',
    intentionText: 'Une surface liquide contemplative ondulante, aux teintes aurore boréale pour une installation en salle obscure.',
    selectedEngineId: 'glsl',
    engineReasoning: 'Sélection automatique : Moteur GLSL Shaders pour un rendu GPU 60 FPS fluide calculé pixel par pixel.',
    visualMood: 'Ondulations soyeuses, champ de bruit fbm, reflets émeraude et cyan',
    code: ENGINE_ADAPTERS.find(a => a.id === 'glsl')?.presets[0].code || '',
    parameters: [
      {
        id: 'param-wave-speed',
        label: 'Rythme des vagues',
        description: 'Vitesse de déplacement du fluide lumineux',
        value: 0.9,
        min: 0.1,
        max: 2.5,
        step: 0.05,
        mappedEngineParam: 'Vitesse'
      },
      {
        id: 'param-turbulence',
        label: 'Turbulence & Émulsion',
        description: 'Complexité des replis liquides dans l’espace',
        value: 1.4,
        min: 0.2,
        max: 2.8,
        step: 0.05,
        mappedEngineParam: 'Distorsion'
      },
      {
        id: 'param-scale',
        label: 'Échelle scénique',
        description: 'Zoom spatial de la texture projetée',
        value: 2.8,
        min: 1.0,
        max: 5.0,
        step: 0.1,
        mappedEngineParam: 'Échelle'
      },
      {
        id: 'param-luminescence',
        label: 'Éclat spectral',
        description: 'Contraste et brillance des crêtes d’ondes',
        value: 1.25,
        min: 0.4,
        max: 2.2,
        step: 0.05,
        mappedEngineParam: 'Luminescence'
      }
    ]
  },
  // SCÈNE 4 : ROSACE HYPNOTIQUE P5.JS (Conservée intégralement)
  {
    id: 'scene-mandala-theatre',
    title: 'Rosace Hypnotique & Géométrie Sacrée',
    category: 'Théâtre & Scénographie',
    intentionText: 'Des cercles concentriques et polygones sacrés qui s’ouvrent et se ferment au gré de la dramaturgie.',
    selectedEngineId: 'p5js',
    engineReasoning: 'Sélection automatique : Moteur p5.js pour un contrôle vectoriel précis des formes récursives.',
    visualMood: 'Polygones récursifs, harmoniques dorées, teintes HSB changeantes',
    code: ENGINE_ADAPTERS.find(a => a.id === 'p5js')?.presets[0].code || '',
    parameters: [
      {
        id: 'param-rings',
        label: 'Complexité des anneaux',
        description: 'Nombre de couches géométriques déployées',
        value: 1.2,
        min: 0.5,
        max: 2.5,
        step: 0.1,
        mappedEngineParam: 'Densité'
      },
      {
        id: 'param-pulse',
        label: 'Pulsation respiratoire',
        description: 'Amplitude du mouvement d’inspiration/expiration',
        value: 1.0,
        min: 0.2,
        max: 2.2,
        step: 0.05,
        mappedEngineParam: 'Vitesse'
      }
    ]
  },
  // SCÈNE 5 : KALÉIDOSCOPE ISF (Conservée intégralement)
  {
    id: 'scene-isf-kaleidoscope',
    title: 'Kaléidoscope Vidéo Rétro-Futuriste',
    category: 'Concert & Musique',
    intentionText: 'Un kaléidoscope dynamique à multiples facettes pour projections vidéo scéniques en direct.',
    selectedEngineId: 'isf',
    engineReasoning: 'Sélection automatique : Moteur ISF (Interactive Shader Format) standardisé pour régies vidéo et pupitres VJing.',
    visualMood: 'Symétries prismatiques, couleurs néon tranchées, réactivité instantanée',
    code: ENGINE_ADAPTERS.find(a => a.id === 'isf')?.presets[0].code || '',
    parameters: [
      {
        id: 'param-segments',
        label: 'Nombre de facettes',
        description: 'Symétrie du prisme kaléidoscopique (2 à 16 miroirs)',
        value: 8.0,
        min: 2.0,
        max: 16.0,
        step: 1.0,
        mappedEngineParam: 'segments'
      },
      {
        id: 'param-isf-speed',
        label: 'Cadence de mutation',
        description: 'Vitesse de défilement des motifs internes',
        value: 1.2,
        min: 0.1,
        max: 3.0,
        step: 0.05,
        mappedEngineParam: 'vitesse'
      },
      {
        id: 'param-isf-zoom',
        label: 'Profondeur de champ',
        description: 'Grossissement optique au cœur du prisme',
        value: 1.6,
        min: 0.5,
        max: 4.0,
        step: 0.1,
        mappedEngineParam: 'zoom'
      },
      {
        id: 'param-isf-glow',
        label: 'Luminescence scénique',
        description: 'Intensité lumineuse projetée sur les surfaces',
        value: 1.1,
        min: 0.2,
        max: 2.5,
        step: 0.05,
        mappedEngineParam: 'intensite'
      }
    ]
  },
  // SCÈNE 6 : PARTICULES JS (Conservée intégralement)
  {
    id: 'scene-kinetic-particles',
    title: 'Nuage de Particules Interactif',
    category: 'Danse & Chorégraphie',
    intentionText: 'Particules flottantes qui fuient ou gravitent autour de la position du corps ou de la souris.',
    selectedEngineId: 'javascript',
    engineReasoning: 'Sélection automatique : Moteur JavaScript Canvas 2D natif pour une latence minimale et une physique réactive.',
    visualMood: 'Constellations connectées, maillage dynamique, lueur cyan',
    code: ENGINE_ADAPTERS.find(a => a.id === 'javascript')?.presets[0].code || '',
    parameters: [
      {
        id: 'param-attraction',
        label: 'Réactivité aux gestes',
        description: 'Force de répulsion lors du passage des danseurs',
        value: 1.3,
        min: 0.2,
        max: 2.5,
        step: 0.05,
        mappedEngineParam: 'Répulsion'
      },
      {
        id: 'param-connection',
        label: 'Densité du maillage',
        description: 'Portée des liaisons lumineuses entre particules',
        value: 1.0,
        min: 0.3,
        max: 2.0,
        step: 0.05,
        mappedEngineParam: 'Distance'
      }
    ]
  }
];

// Moteur d'interprétation et de compilation d'intentions artistiques structurées
// Agit sur la scène courante SANS la remplacer par un effet arbitraire générique
export function interpretArtisticCommand(
  command: string,
  currentScene: ArtisticScene
): { updatedScene: ArtisticScene; explanation: string; appliedEngine?: EngineId } {
  const lower = command.toLowerCase().trim();
  const updated = JSON.parse(JSON.stringify(currentScene)) as ArtisticScene;

  // CAS 1 : Demande de création ou activation explicite du Chat de lumière
  if (
    lower.includes('chat') ||
    lower.includes('félin') ||
    lower.includes('cat') ||
    lower.includes('matou') ||
    lower.includes('animal')
  ) {
    const catScene = CURATED_ARTISTIC_SCENES.find(s => s.id === 'scene-light-cat')!;
    const catCopy = JSON.parse(JSON.stringify(catScene)) as ArtisticScene;

    // Analyse si la demande contient déjà une consigne spécifique (ex: "chat qui court en bleu")
    if (lower.includes('court') || lower.includes('course') || lower.includes('vite')) {
      const posture = catCopy.parameters.find(p => p.mappedEngineParam === 'Allure');
      if (posture) posture.value = 2; // Course
      const speed = catCopy.parameters.find(p => p.mappedEngineParam === 'Vitesse');
      if (speed) speed.value = 2.0;
    }
    if (lower.includes('bleu')) {
      const col = catCopy.parameters.find(p => p.mappedEngineParam === 'Couleur');
      if (col) col.value = 215; // Bleu électrique
    }
    if (lower.includes('rouge')) {
      const tailCol = catCopy.parameters.find(p => p.mappedEngineParam === 'QueueCouleur');
      if (tailCol) tailCol.value = 0; // Rouge rubis
    }

    return {
      updatedScene: catCopy,
      appliedEngine: 'javascript',
      explanation: 'Intention comprise : Chat de lumière matérialisé par des lignes lumineuses sur fond noir avec silhouette féline articulée (tête, oreilles pointues, 4 pattes, queue ondulante).'
    };
  }

  // CAS 2 : Modifications paramétriques sur la scène « Chat de lumière »
  if (currentScene.id === 'scene-light-cat') {
    // 2.A : "Fais courir le chat plus vite" / "Cours" / "Plus rapide"
    if (
      lower.includes('courir') ||
      lower.includes('cours') ||
      lower.includes('galop') ||
      lower.includes('accélèr') ||
      lower.includes('plus vite') ||
      lower.includes('course')
    ) {
      const posture = updated.parameters.find(p => p.mappedEngineParam === 'Allure');
      const speed = updated.parameters.find(p => p.mappedEngineParam === 'Vitesse');
      if (posture) posture.value = 2; // Course
      if (speed) speed.value = Math.min(3.0, (speed.value < 1.5 ? 2.2 : speed.value * 1.3));
      return {
        updatedScene: updated,
        explanation: 'Allure modifiée : Le chat s’élance en course rapide. Sa colonne vertébrale s’étire, sa cadence s’accélère et ses foulées s’allongent.'
      };
    }

    // 2.B : "Fais-le s'arrêter et s'asseoir" / "Assis" / "Arrête"
    if (
      lower.includes('ass') ||
      lower.includes('arrêt') ||
      lower.includes('stop') ||
      lower.includes('pause') ||
      lower.includes('calme') ||
      lower.includes('repose')
    ) {
      const posture = updated.parameters.find(p => p.mappedEngineParam === 'Allure');
      const speed = updated.parameters.find(p => p.mappedEngineParam === 'Vitesse');
      if (posture) posture.value = 0; // Assis
      if (speed) speed.value = 0;
      return {
        updatedScene: updated,
        explanation: 'Posture modifiée : Le chat ralentit, s’arrête, replie ses pattes arrière et s’assoit noblement au sol, sa queue enroulée devant lui.'
      };
    }

    // 2.C : "Fais-le marcher" / "Marche" / "Repart"
    if (
      lower.includes('march') ||
      lower.includes('repart') ||
      lower.includes('doucement')
    ) {
      const posture = updated.parameters.find(p => p.mappedEngineParam === 'Allure');
      const speed = updated.parameters.find(p => p.mappedEngineParam === 'Vitesse');
      if (posture) posture.value = 1; // Marche
      if (speed) speed.value = 1.1;
      return {
        updatedScene: updated,
        explanation: 'Allure modifiée : Le chat reprend sa marche féline avec un cycle souple et une cadence naturelle.'
      };
    }

    // 2.D : "Transforme ses contours en lumière bleue"
    if (
      lower.includes('bleu') ||
      lower.includes('cyan') ||
      lower.includes('azur')
    ) {
      const col = updated.parameters.find(p => p.mappedEngineParam === 'Couleur');
      if (col) col.value = 215; // Bleu électrique
      return {
        updatedScene: updated,
        explanation: 'Teinte modifiée : Les contours du chat s’illuminent désormais d’une lumière bleue électrique pure.'
      };
    }

    // 2.E : Couleurs alternatives (vert, or, violet)
    if (lower.includes('vert') || lower.includes('émeraude')) {
      const col = updated.parameters.find(p => p.mappedEngineParam === 'Couleur');
      if (col) col.value = 150;
      return {
        updatedScene: updated,
        explanation: 'Teinte modifiée : Les contours du chat brillent d’une lumière verte émeraude.'
      };
    }
    if (lower.includes('or') || lower.includes('jaune') || lower.includes('doré')) {
      const col = updated.parameters.find(p => p.mappedEngineParam === 'Couleur');
      if (col) col.value = 45;
      return {
        updatedScene: updated,
        explanation: 'Teinte modifiée : La silhouette féline adopte une luminescence dorée chaleureuse.'
      };
    }

    // 2.F : "Ajoute une traînée rouge derrière sa queue"
    if (
      (lower.includes('traînée') || lower.includes('trainee') || lower.includes('queue') || lower.includes('sillage')) &&
      (lower.includes('rouge') || lower.includes('carmin') || lower.includes('rubis') || lower.includes('pourpre'))
    ) {
      const tailCol = updated.parameters.find(p => p.mappedEngineParam === 'QueueCouleur');
      const trailLen = updated.parameters.find(p => p.mappedEngineParam === 'TraineeLongueur');
      if (tailCol) tailCol.value = 0; // Rouge pur 0°
      if (trailLen) trailLen.value = 2.4; // Persistance longue
      return {
        updatedScene: updated,
        explanation: 'Effet appliqué : Une vive traînée lumineuse rouge rubis s’étire désormais en comète derrière la queue du chat.'
      };
    }

    // 2.G : Luminescence / Éclat
    if (lower.includes('lumier') || lower.includes('brillant') || lower.includes('glow') || lower.includes('éclat')) {
      const glow = updated.parameters.find(p => p.mappedEngineParam === 'Glow');
      if (glow) glow.value = Math.min(2.8, glow.value * 1.35);
      return {
        updatedScene: updated,
        explanation: 'Intensité augmentée : Les tubes néon du chat rayonnent avec une luminescence accrue.'
      };
    }

    // 2.H : DEMANDE NON COMPRISE SUR LE CHAT -> Demande de précision (Pas de changement arbitraire)
    return {
      updatedScene: currentScene,
      explanation: 'Je n’ai pas bien saisi votre intention pour ce chat. Souhaitez-vous modifier sa vitesse (ex: « Fais courir le chat plus vite »), le faire s’asseoir (« Fais-le s’asseoir »), changer la couleur de ses contours (« Lumière bleue ») ou ajouter une traînée rouge à sa queue ?'
    };
  }

  // CAS 3 : Autres scènes du laboratoire (Vortex, Océan, Kaléidoscope...)
  // 3.A : Vitesse / Rythme
  if (lower.includes('accélér') || lower.includes('plus vite') || lower.includes('dynamique') || lower.includes('tempo')) {
    const speedParam = updated.parameters.find(p => p.id.includes('speed') || p.id.includes('rythme') || p.mappedEngineParam === 'Vitesse' || p.mappedEngineParam === 'vitesse');
    if (speedParam) speedParam.value = Math.min(speedParam.max, speedParam.value * 1.4);
    return {
      updatedScene: updated,
      explanation: 'Rythme scénique augmenté de 40% sur la scène active.'
    };
  }

  if (lower.includes('ralenti') || lower.includes('plus lent') || lower.includes('calme') || lower.includes('apais')) {
    const speedParam = updated.parameters.find(p => p.id.includes('speed') || p.id.includes('rythme') || p.mappedEngineParam === 'Vitesse' || p.mappedEngineParam === 'vitesse');
    if (speedParam) speedParam.value = Math.max(speedParam.min, speedParam.value * 0.7);
    return {
      updatedScene: updated,
      explanation: 'Cadence ralentie de 30% pour instaurer une atmosphère contemplative.'
    };
  }

  // 3.B : Demandes de basculement vers d'autres scènes explicites
  if (lower.includes('kaléidoscope') || lower.includes('kaleidoscope') || lower.includes('prisme')) {
    const isfScene = CURATED_ARTISTIC_SCENES.find(s => s.id === 'scene-isf-kaleidoscope')!;
    return {
      updatedScene: isfScene,
      appliedEngine: 'isf',
      explanation: 'Basculement sur l’ambiance Kaléidoscope (Moteur ISF sélectionné automatiquement).'
    };
  }

  if (lower.includes('fluide') || lower.includes('liquide') || lower.includes('océan') || lower.includes('eau')) {
    const liquidScene = CURATED_ARTISTIC_SCENES.find(s => s.id === 'scene-liquid-plasma')!;
    return {
      updatedScene: liquidScene,
      appliedEngine: 'glsl',
      explanation: 'Activation de l’Océan Spectral (Moteur GPU GLSL sélectionné).'
    };
  }

  if (lower.includes('vortex') || lower.includes('distorsion')) {
    const vortexScene = CURATED_ARTISTIC_SCENES.find(s => s.id === 'scene-vortex-choreo')!;
    return {
      updatedScene: vortexScene,
      appliedEngine: 'hybrid-p5-glsl',
      explanation: 'Activation du Vortex Luminescent (Pipeline Hybride p5.js ➔ GLSL sélectionné).'
    };
  }

  if (lower.includes('particule') || lower.includes('essaim') || lower.includes('étoile')) {
    const particleScene = CURATED_ARTISTIC_SCENES.find(s => s.id === 'scene-kinetic-particles')!;
    return {
      updatedScene: particleScene,
      appliedEngine: 'javascript',
      explanation: 'Activation du Nuage de Particules Réactif (Moteur Canvas 2D sélectionné).'
    };
  }

  // CAS 4 : DEMANDE GÉNÉRALE NON COMPRISE -> Précision demandée, pas d'effet arbitraire
  return {
    updatedScene: currentScene,
    explanation: `Je n’ai pas reconnu cette intention scénique ("${command}"). Pour vous orienter : vous pouvez demander « Un chat en lumières », « Océan liquide », « Kaléidoscope vidéo », ou moduler la vitesse et l’intensité lumineuse de la scène actuelle.`
  };
}
