// Compositeur Scénographique Temps Réel Multi-layers
// No[co]de Vibe Designer — Rendu d'ensemble des pistes Timeline, personnages et post-FX

import { TimelineClip, TimelineTrack, ReusableScenicElement } from '../types/timeline';
import { generateSyntheticPiratePose, renderPirateShadowCanvas } from './scenographyEngine';
import { scenicAudio } from './scenicAudioEngine';
import { SkeletonPose } from '../types/scenography';

export interface ScenicCompositorState {
  lastFootstepTime: number;
  slitScanBuffer: HTMLCanvasElement | null;
  trailsBuffer: HTMLCanvasElement | null;
}

export const compositorState: ScenicCompositorState = {
  lastFootstepTime: 0,
  slitScanBuffer: null,
  trailsBuffer: null
};

export function renderScenicStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentTimeSec: number,
  clips: TimelineClip[],
  tracks: TimelineTrack[],
  library: ReusableScenicElement[],
  isPlaying: boolean
) {
  // 1. FOND SCÉNIQUE DU PLATEAU DE THÉÂTRE (Sombre #101214 avec repères de régie)
  ctx.save();
  ctx.fillStyle = '#0c0e11';
  ctx.fillRect(0, 0, width, height);

  // Gradient vertical d'ambiance scénique (projecteurs face doux)
  const stageGrad = ctx.createLinearGradient(0, 0, 0, height);
  stageGrad.addColorStop(0, 'rgba(18, 22, 28, 0.9)');
  stageGrad.addColorStop(0.65, 'rgba(12, 14, 18, 0.95)');
  stageGrad.addColorStop(1, 'rgba(6, 8, 10, 1.0)');
  ctx.fillStyle = stageGrad;
  ctx.fillRect(0, 0, width, height);

  // Ligne de sol scénique et repères de plateau (Jardin / Centre / Cour)
  const floorY = height * 0.72;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(width, floorY);
  ctx.stroke();

  // Repères discrets de plateau
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.font = '9px monospace';
  ctx.fillText('JARDIN [0.20]', width * 0.18, floorY + 16);
  ctx.fillText('CENTRE [0.50]', width * 0.47, floorY + 16);
  ctx.fillText('COUR [0.80]', width * 0.78, floorY + 16);

  ctx.restore();

  // Filtrer les clips actifs à l'instant T de la timeline
  const activeClips = clips.filter((clip) => {
    if (!clip.active) return false;
    const track = tracks.find((t) => t.id === clip.trackId);
    if (!track || track.isMuted) return false;
    return currentTimeSec >= clip.startTime && currentTimeSec <= clip.startTime + clip.duration;
  });

  // Trier par numéro de layer (Layer 1 au fond, Layer 4 au dessus)
  activeClips.sort((a, b) => {
    const trackA = tracks.find((t) => t.id === a.trackId);
    const trackB = tracks.find((t) => t.id === b.trackId);
    return (trackA?.layerNumber || 1) - (trackB?.layerNumber || 1);
  });

  // Détection de post-effets globaux à appliquer
  let hasSlitScan = false;
  let slitScanIntensity = 0.5;
  let hasRgbSplit = false;
  let rgbSplitIntensity = 0.5;
  let hasAnaglyph = false;

  // 2. RENDU DE CHAQUE CLIP ACTIF
  for (const clip of activeClips) {
    const element = library.find((e) => e.id === clip.elementId);
    const track = tracks.find((t) => t.id === clip.trackId);
    const layerOpacity = track ? track.opacity : 1.0;

    // Calcul de la progression relative dans le clip (0..1)
    const clipLocalTime = currentTimeSec - clip.startTime;

    // A. ÉLÉMENT OMBRE DU PIRATE OU PERSONNAGE SILHOUETTE
    if (!element || element.type === 'performer_shadow' || clip.elementId === 'elem-pirate-shadow' || clip.elementId === 'elem-compound-pirate-echo') {
      // Déterminer la cinématique selon l'instant du clip
      let poseMode: 'idle_jardin' | 'walk_to_center' | 'sword_duel' | 'pirate_dance' = 'idle_jardin';
      let currentX = clip.transform.x;

      if (clip.animationMode === 'mirror') {
        poseMode = 'walk_to_center';
        currentX = 0.32;
      } else if (clip.animationMode === 'autonomous') {
        poseMode = 'pirate_dance';
        // Traversée de scène si configurée
        const cycle = (clipLocalTime * clip.motionSpeed) % 8;
        currentX = 0.35 + Math.sin(cycle * 0.7) * 0.28;
      } else {
        // Mode Hybride : alterne miroir et danse
        const isMirrorPhase = (Math.floor(clipLocalTime / 4) % 2) === 0;
        poseMode = isMirrorPhase ? 'walk_to_center' : 'pirate_dance';
        currentX = isMirrorPhase ? 0.35 : 0.55 + Math.sin(clipLocalTime * 1.2) * 0.15;
      }

      // Synthèse de la pose avec cinématique directe
      const pose = generateSyntheticPiratePose(clipLocalTime, poseMode, clip.motionSpeed);

      // Détection des impacts de pas pour audio synchrone
      if (isPlaying && clip.audioConfig.enabled && clip.audioConfig.reactiveToSteps) {
        const leftAnkleY = pose.leftAnkle.y;
        const rightAnkleY = pose.rightAnkle.y;
        const isStepContact = leftAnkleY > 0.88 || rightAnkleY > 0.88;
        const nowMs = performance.now();
        if (isStepContact && nowMs - compositorState.lastFootstepTime > 260) {
          compositorState.lastFootstepTime = nowMs;
          scenicAudio.triggerFootstep(90, clip.audioConfig.volume);
        }
      }

      // Rendu de la silhouette sur le canvas avec ses attributs réels
      renderPirateShadowCanvas(
        ctx,
        pose,
        {
          ...clip.transform,
          x: currentX,
          opacity: clip.transform.opacity * layerOpacity
        },
        element?.costume || {
          hatType: 'tricorn',
          hasSashBelt: true,
          hasCutlassSabre: true,
          hasCoatFlaps: true,
          featherAngle: -25
        },
        width,
        height,
        {
          color: '#15191f',
          glowColor: 'rgba(215, 184, 106, 0.45)', // Lueur ambre No[co]de
          glowBlur: 16
        }
      );
    }

    // B. ÉLÉMENT CHAT DE LUMIÈRE
    else if (element?.type === 'light_creature' && clip.elementId === 'elem-light-cat') {
      renderScenicLightCat(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity,
        isPlaying
      );
    }

    // C. ÉLÉMENT BALEINE INTERACTIVE
    else if (element?.type === 'light_creature' && clip.elementId === 'elem-whale') {
      renderScenicWhale(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // D. DANSEUR SPECTRAL (PEPPER'S GHOST)
    else if (clip.elementId === 'elem-dancer-ghost' || clip.visualFx === 'peppers_ghost') {
      renderScenicDancerGhost(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // E. PANTIN DE FILS (MARIONNETTE VIRTUELLE)
    else if (clip.elementId === 'elem-wire-puppet' || clip.motionStyle === 'wire_marionette') {
      renderScenicWirePuppet(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // F. BANC DE MÉDUSES FLUORESCENTES
    else if (clip.elementId === 'elem-jellyfish-swarm' || element?.iconType === 'jellyfish') {
      renderScenicJellyfish(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // G. NUÉE D'OISEAUX BOIDS / PARTICULES LUMINEUSES
    else if (clip.elementId === 'elem-particle-boids' || clip.visualFx === 'particle_boids') {
      renderScenicBoids(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // H. BRASIER NUMÉRIQUE & BRAISES
    else if (clip.elementId === 'elem-fire-braziers' || element?.iconType === 'fire') {
      renderScenicFireBraziers(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // I. MIROIR D'EAU & ONDES RÉFRACTIVES
    else if (clip.elementId === 'elem-water-ripples' || clip.visualFx === 'water_ripples') {
      renderScenicWaterRipples(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // J. BRUME VOLUMÉTRIQUE DE PLATEAU
    else if (clip.elementId === 'elem-fog-volumetric' || clip.visualFx === 'fog_volumetric') {
      renderScenicVolumetricFog(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // K. GOLEM DE CRISTAL & VORONOÏ
    else if (clip.elementId === 'elem-crystal-golem' || clip.visualFx === 'voronoi_shatter') {
      renderScenicCrystalGolem(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // L. DRAGON STELLAIRE D'OR (CHAÎNE CINÉMATIQUE)
    else if (clip.elementId === 'elem-biolum-dragon' || element?.iconType === 'dragon') {
      renderScenicBiolumDragon(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // M. PAPILLON DU CHAOS (ATTRACTEUR DE LORENZ)
    else if (clip.elementId === 'elem-lorenz-butterfly') {
      renderScenicLorenzButterfly(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // N. ÉCHIQUIER CINÉTIQUE 3D & PISTONS
    else if (clip.elementId === 'elem-kinetic-chessboard' || clip.visualFx === 'kinetic_mesh') {
      renderScenicKineticChessboard(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // O. MANDALA DE SABLE & SOUFFLE ÉOLIEN
    else if (clip.elementId === 'elem-sand-mandala' || clip.visualFx === 'mandala_dispersion') {
      renderScenicSandMandala(
        ctx,
        width,
        height,
        clipLocalTime,
        clip,
        layerOpacity
      );
    }

    // DÉTECTION DES POST-EFFETS VISUELS GLOBAUX
    if (clip.visualFx === 'slit_scan' || element?.visualFx === 'slit_scan') {
      hasSlitScan = true;
      slitScanIntensity = clip.fxIntensity || 0.75;
    }
    if (clip.visualFx === 'rgb_split' || element?.visualFx === 'rgb_split') {
      hasRgbSplit = true;
      rgbSplitIntensity = clip.fxIntensity || 0.65;
    }
    if (clip.visualFx === 'anaglyph' || element?.visualFx === 'anaglyph') {
      hasAnaglyph = true;
    }
    if (clip.visualFx === 'hydra_feedback') {
      applyHydraFeedbackEffect(ctx, width, height, currentTimeSec, clip.fxIntensity || 0.8);
    }
    if (clip.visualFx === 'vortex_tunnel') {
      applyVortexTunnelEffect(ctx, width, height, currentTimeSec, clip.fxIntensity || 0.85);
    }
    if (clip.visualFx === 'stargate_lensing' || clip.elementId === 'elem-stargate-portal') {
      applyStargateLensingEffect(ctx, width, height, currentTimeSec, clip.fxIntensity || 0.85);
    }
    if (clip.visualFx === 'thermal_lut' || clip.elementId === 'elem-thermal-phantom') {
      applyThermalLutEffect(ctx, width, height, clip.fxIntensity || 0.85);
    }
    if (clip.visualFx === 'solar_corona' || clip.elementId === 'elem-solar-eclipse') {
      applySolarCoronaEffect(ctx, width, height, currentTimeSec, clip.fxIntensity || 0.9);
    }
    if (clip.visualFx === 'mercury_metaballs' || clip.elementId === 'elem-liquid-mercury') {
      applyMercuryMetaballsEffect(ctx, width, height, currentTimeSec, clip.fxIntensity || 0.85);
    }
    if (clip.visualFx === 'synaptic_pulse' || clip.elementId === 'elem-synaptic-neural') {
      applySynapticPulseEffect(ctx, width, height, currentTimeSec, clip.fxIntensity || 0.85);
    }
    if (clip.visualFx === 'aurora_borealis' || clip.elementId === 'elem-aurora-veil') {
      applyAuroraBorealisEffect(ctx, width, height, currentTimeSec, clip.fxIntensity || 0.85);
    }
  }

  // 3. POST-TRAITEMENT VISUEL (Slit-Scan, RGB Split, Anaglyphe)
  if (hasSlitScan) {
    applySlitScanEffect(ctx, width, height, currentTimeSec, slitScanIntensity);
  }
  if (hasRgbSplit || hasAnaglyph) {
    applyRgbSplitEffect(ctx, width, height, rgbSplitIntensity, hasAnaglyph);
  }
}

/**
 * Dessine le Chat de lumière stylisé avec cinématique féline et traînées néon
 */
function renderScenicLightCat(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number,
  isPlaying: boolean
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x;
  const cy = height * clip.transform.y;
  const s = clip.transform.scale * 0.9;

  ctx.translate(cx, cy);
  if (clip.transform.flipHorizontal) ctx.scale(-1, 1);

  // Cinématique 4 pattes
  const legFL = Math.sin(t * 3.5);
  const legFR = -Math.sin(t * 3.5);
  const legBL = -Math.sin(t * 3.5 + 0.4);
  const legBR = Math.sin(t * 3.5 + 0.4);

  // Détection audio de pas félin
  if (isPlaying && clip.audioConfig.enabled && clip.audioConfig.reactiveToSteps) {
    if (Math.abs(legFL) > 0.92) {
      scenicAudio.triggerSparkle(660 + Math.sin(t) * 120, clip.audioConfig.volume * 0.4);
    }
  }

  // Lueur néon
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = '#38bdf8';
  ctx.fillStyle = '#0284c7';
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Corps félin arqué
  ctx.beginPath();
  ctx.ellipse(0, 0, 48 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Tête et museau
  ctx.beginPath();
  ctx.arc(42 * s, -14 * s, 16 * s, 0, Math.PI * 2);
  ctx.stroke();

  // Oreilles triangulaires pointues
  ctx.beginPath();
  ctx.moveTo(34 * s, -26 * s);
  ctx.lineTo(40 * s, -42 * s);
  ctx.lineTo(46 * s, -28 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(46 * s, -28 * s);
  ctx.lineTo(54 * s, -42 * s);
  ctx.lineTo(58 * s, -24 * s);
  ctx.stroke();

  // Yeux félins lumineux
  ctx.fillStyle = '#d7b86a';
  ctx.shadowColor = '#d7b86a';
  ctx.beginPath();
  ctx.arc(46 * s, -16 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  // 3. Pattes articulées
  const drawLeg = (baseX: number, phaseVal: number) => {
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(baseX * s, 16 * s);
    const midX = (baseX + phaseVal * 8) * s;
    const footX = (baseX + phaseVal * 16) * s;
    ctx.lineTo(midX, 34 * s);
    ctx.lineTo(footX, 52 * s);
    ctx.stroke();
  };

  drawLeg(28, legFL);
  drawLeg(36, legFR);
  drawLeg(-32, legBL);
  drawLeg(-24, legBR);

  // 4. Queue sinueuse expressive
  ctx.beginPath();
  ctx.moveTo(-44 * s, 4 * s);
  const tailWave = Math.sin(t * 3) * 18 * s;
  ctx.bezierCurveTo(
    -70 * s, -12 * s + tailWave,
    -85 * s, 20 * s - tailWave,
    -100 * s, -20 * s + tailWave
  );
  ctx.stroke();

  // 5. Traînées de particules lumineuses dorées
  ctx.fillStyle = 'rgba(215, 184, 106, 0.6)';
  ctx.shadowColor = '#d7b86a';
  for (let i = 0; i < 6; i++) {
    const px = -60 * s - i * 18 * s + Math.sin(t * 4 + i) * 8 * s;
    const py = Math.cos(t * 3 + i) * 14 * s;
    ctx.beginPath();
    ctx.arc(px, py, (4 - i * 0.5) * s, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Dessine la Baleine bioluminescente ondulante
 */
function renderScenicWhale(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity;

  const t = localTime * clip.motionSpeed;
  const cx = width * (clip.transform.x + Math.sin(t * 0.5) * 0.08);
  const cy = height * (clip.transform.y + Math.cos(t * 0.4) * 0.04);
  const s = clip.transform.scale;

  ctx.translate(cx, cy);

  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 3.5 * s;

  // Corps de baleine stylisé fluide
  ctx.beginPath();
  ctx.moveTo(-90 * s, 0);
  ctx.bezierCurveTo(-50 * s, -38 * s, 60 * s, -34 * s, 90 * s, 0);
  ctx.bezierCurveTo(70 * s, 36 * s, -40 * s, 32 * s, -90 * s, 0);
  ctx.stroke();

  // Nageoire caudale ondulante
  const tailFluke = Math.sin(t * 2) * 14 * s;
  ctx.beginPath();
  ctx.moveTo(-90 * s, 0);
  ctx.lineTo(-125 * s, -26 * s + tailFluke);
  ctx.lineTo(-115 * s, 0);
  ctx.lineTo(-125 * s, 26 * s + tailFluke);
  ctx.closePath();
  ctx.stroke();

  // Nageoire pectorale
  ctx.beginPath();
  ctx.moveTo(10 * s, 12 * s);
  ctx.quadraticCurveTo(20 * s, 46 * s + Math.sin(t * 2) * 10 * s, 0, 48 * s);
  ctx.stroke();

  ctx.restore();
}

/**
 * Effet Slit-Scan temporel : découpage en bandes horizontales décalées
 */
function applySlitScanEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  intensity: number
) {
  const slices = 16;
  const sliceHeight = height / slices;
  const maxShift = width * 0.04 * intensity;

  for (let i = 0; i < slices; i++) {
    const shift = Math.sin(timeSec * 3 + i * 0.6) * maxShift;
    if (Math.abs(shift) > 2) {
      try {
        const sy = i * sliceHeight;
        ctx.drawImage(
          ctx.canvas,
          0, sy, width, sliceHeight,
          shift, sy, width, sliceHeight
        );
      } catch {
        // Safe canvas read/write
      }
    }
  }
}

/**
 * Effet RGB Split / Anaglyphe chromatique pour stéréoscopie scénique
 */
function applyRgbSplitEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  isAnaglyph: boolean
) {
  ctx.save();
  const shift = Math.round(width * 0.008 * intensity);

  // Superposition avec décalage rouge / cyan
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = isAnaglyph ? 0.6 : 0.35;

  ctx.drawImage(ctx.canvas, -shift, 0, width, height);
  ctx.drawImage(ctx.canvas, shift, 0, width, height);

  ctx.restore();
}

/**
 * Danseur Spectral & Pepper's Ghost : silhouette vaporeuse avec résonance optique
 */
function renderScenicDancerGhost(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity * 0.85;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x + Math.sin(t * 0.8) * width * 0.04;
  const cy = height * clip.transform.y;
  const s = clip.transform.scale;

  ctx.translate(cx, cy);
  ctx.shadowColor = 'rgba(226, 232, 240, 0.9)';
  ctx.shadowBlur = 28;

  // Lueur Pepper's Ghost
  ctx.fillStyle = 'rgba(248, 250, 252, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -60 * s, 35 * s, 80 * s, Math.sin(t) * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Silhouette fluide
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(0, -110 * s); // Tête
  ctx.arc(0, -120 * s, 12 * s, 0, Math.PI * 2);
  ctx.moveTo(0, -108 * s);
  ctx.lineTo(0, -50 * s); // Colonne
  // Bras en arabesque
  ctx.moveTo(0, -90 * s);
  ctx.quadraticCurveTo(-40 * s + Math.cos(t * 1.5) * 15 * s, -80 * s + Math.sin(t) * 20 * s, -65 * s, -110 * s);
  ctx.moveTo(0, -90 * s);
  ctx.quadraticCurveTo(45 * s + Math.sin(t * 1.5) * 15 * s, -70 * s, 60 * s, -40 * s);
  // Jambes
  ctx.moveTo(0, -50 * s);
  ctx.lineTo(-20 * s + Math.sin(t) * 15 * s, 0);
  ctx.moveTo(0, -50 * s);
  ctx.lineTo(25 * s - Math.sin(t) * 15 * s, 0);
  ctx.stroke();

  ctx.restore();
}

/**
 * Pantin de Fils Numérique : marionnette suspendue avec fils verticaux
 */
function renderScenicWirePuppet(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x;
  const cy = height * clip.transform.y;
  const s = clip.transform.scale;

  // Fils verticaux de suspension depuis le cintre
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1;
  [-30 * s, -10 * s, 10 * s, 30 * s].forEach((fx) => {
    ctx.beginPath();
    ctx.moveTo(cx + fx, 0);
    ctx.lineTo(cx + fx + Math.sin(t * 2) * 5 * s, cy - 60 * s);
    ctx.stroke();
  });

  ctx.translate(cx, cy);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5 * s;
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 12;

  // Tête
  ctx.beginPath();
  ctx.arc(0, -95 * s, 10 * s, 0, Math.PI * 2);
  ctx.stroke();

  // Croix de marionnette
  const swing = Math.sin(t * 2) * 0.15;
  ctx.rotate(swing);

  // Torse
  ctx.strokeRect(-12 * s, -80 * s, 24 * s, 40 * s);

  // Bras articulés
  ctx.beginPath();
  ctx.moveTo(-12 * s, -75 * s);
  ctx.lineTo(-35 * s, -55 * s + Math.sin(t * 3) * 10 * s);
  ctx.lineTo(-45 * s, -35 * s);
  ctx.moveTo(12 * s, -75 * s);
  ctx.lineTo(35 * s, -55 * s - Math.sin(t * 3) * 10 * s);
  ctx.lineTo(45 * s, -35 * s);
  // Jambes
  ctx.moveTo(-8 * s, -40 * s);
  ctx.lineTo(-14 * s, -15 * s + Math.cos(t * 2) * 8 * s);
  ctx.lineTo(-16 * s, 0);
  ctx.moveTo(8 * s, -40 * s);
  ctx.lineTo(14 * s, -15 * s - Math.cos(t * 2) * 8 * s);
  ctx.lineTo(16 * s, 0);
  ctx.stroke();

  ctx.restore();
}

/**
 * Banc de Méduses Fluorescentes
 */
function renderScenicJellyfish(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x + Math.sin(t * 0.5) * 30;
  const cy = height * clip.transform.y + Math.sin(t * 1.2) * 20;
  const s = clip.transform.scale;

  ctx.translate(cx, cy);
  ctx.shadowColor = '#2dd4bf';
  ctx.shadowBlur = 20;

  // Ombrelle contractile
  const pulse = 1 + Math.sin(t * 2.5) * 0.15;
  ctx.fillStyle = 'rgba(45, 212, 191, 0.35)';
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2 * s;

  ctx.beginPath();
  ctx.arc(0, -20 * s, 35 * s * pulse, Math.PI, 0, false);
  ctx.quadraticCurveTo(0, -10 * s, -35 * s * pulse, -20 * s);
  ctx.fill();
  ctx.stroke();

  // Tentacules ondulants
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
  ctx.lineWidth = 1.5 * s;
  for (let i = -3; i <= 3; i++) {
    const ox = i * 8 * s * pulse;
    ctx.beginPath();
    ctx.moveTo(ox, -15 * s);
    const wave1 = Math.sin(t * 3 + i) * 12 * s;
    const wave2 = Math.cos(t * 2 + i) * 18 * s;
    ctx.bezierCurveTo(ox + wave1, 20 * s, ox + wave2, 50 * s, ox + wave1, 85 * s);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Nuée d'Oiseaux Lumineux (Boids)
 */
function renderScenicBoids(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x;
  const cy = height * clip.transform.y;
  const count = 18;

  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 14;

  for (let i = 0; i < count; i++) {
    const angle = t * 1.5 + (i * Math.PI * 2) / count;
    const rad = 60 + Math.sin(t * 2 + i) * 35;
    const bx = cx + Math.cos(angle) * rad * clip.transform.scale;
    const by = cy + Math.sin(angle * 1.2) * (rad * 0.5) * clip.transform.scale;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);

    // Dessin d'un boid stylisé (chevron)
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Brasier Numérique & Braises Scéniques
 */
function renderScenicFireBraziers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x;
  const cy = height * clip.transform.y;
  const s = clip.transform.scale;

  ctx.translate(cx, cy);
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = 24;

  // Flammes stylisées superposées
  const colors = ['#ea580c', '#f97316', '#fde047'];
  colors.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-30 * s / (idx + 1), 0);
    const flick = Math.sin(t * 8 + idx * 2) * 10 * s;
    ctx.quadraticCurveTo(
      -25 * s / (idx + 1), -50 * s / (idx + 0.8),
      flick, -80 * s / (idx + 0.9)
    );
    ctx.quadraticCurveTo(
      25 * s / (idx + 1), -50 * s / (idx + 0.8),
      30 * s / (idx + 1), 0
    );
    ctx.closePath();
    ctx.fill();
  });

  // Braises montantes
  ctx.fillStyle = '#fef08a';
  for (let i = 0; i < 8; i++) {
    const pAge = (t * 2 + i * 0.4) % 1;
    const px = Math.sin(i * 12 + t * 4) * 25 * s;
    const py = -pAge * 110 * s;
    const pSize = (1 - pAge) * 3.5 * s;
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Miroir d'Eau & Ondes Réfractives
 */
function renderScenicWaterRipples(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity * 0.8;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x;
  const cy = height * clip.transform.y;
  const s = clip.transform.scale;

  ctx.translate(cx, cy);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.8 * s;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 16;

  // Ondes concentriques en ellipse au sol
  for (let i = 0; i < 4; i++) {
    const waveTime = (t * 0.8 + i * 0.25) % 1;
    const rx = waveTime * 120 * s;
    const ry = rx * 0.35; // Perspective de sol
    const alpha = (1 - waveTime) * 0.9;

    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Brume Volumétrique de Plateau
 */
function renderScenicVolumetricFog(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity * 0.65;

  const t = localTime * clip.motionSpeed;
  const cy = height * clip.transform.y;

  ctx.fillStyle = 'rgba(203, 213, 225, 0.12)';
  for (let i = 0; i < 5; i++) {
    const fx = ((t * 40 + i * (width / 4)) % (width + 200)) - 100;
    const rad = 70 + Math.sin(t + i) * 20;

    ctx.beginPath();
    ctx.ellipse(fx, cy, rad * 1.6, rad * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Effet Hydra Feedback Loop
 */
function applyHydraFeedbackEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  intensity: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.3 * intensity;

  ctx.translate(width / 2, height / 2);
  ctx.rotate(Math.sin(timeSec * 0.5) * 0.02 * intensity);
  ctx.scale(1.02, 1.02);
  ctx.translate(-width / 2, -height / 2);

  try {
    ctx.drawImage(ctx.canvas, 0, 0);
  } catch {}

  ctx.restore();
}

/**
 * Tunnel Infini & Vortex Volumétrique (TouchDesigner / ISF style)
 */
function applyVortexTunnelEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  intensity: number
) {
  ctx.save();
  ctx.globalAlpha = 0.4 * intensity;
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#8b5cf6';
  ctx.shadowBlur = 18;

  const cx = width / 2;
  const cy = height * 0.45;
  const rings = 7;

  for (let i = 0; i < rings; i++) {
    const progress = (timeSec * 0.6 + i / rings) % 1;
    const r = progress * (width * 0.45);
    ctx.strokeStyle = `rgba(139, 92, 246, ${(1 - progress) * 0.7})`;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Golem de Cristal (Voronoï) : Colosse minéral en facettes polygonales
 */
function renderScenicCrystalGolem(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity * 0.95;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x;
  const cy = height * clip.transform.y;
  const s = clip.transform.scale;

  ctx.translate(cx, cy);
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 22;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.8 * s;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';

  // Facettes de tête polygonale
  ctx.beginPath();
  ctx.moveTo(0, -115 * s);
  ctx.lineTo(16 * s, -95 * s);
  ctx.lineTo(8 * s, -75 * s);
  ctx.lineTo(-8 * s, -75 * s);
  ctx.lineTo(-16 * s, -95 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Torse facetté Voronoï
  const breath = Math.sin(t * 2) * 4 * s;
  const facets = [
    [[-18, -70], [0, -75], [0, -45], [-22, -40]],
    [[0, -75], [18, -70], [22, -40], [0, -45]],
    [[-22, -40], [0, -45], [0, -20], [-15, -15]],
    [[0, -45], [22, -40], [15, -15], [0, -20]]
  ];
  facets.forEach((poly) => {
    ctx.beginPath();
    ctx.moveTo(poly[0][0] * s, poly[0][1] * s + breath);
    poly.slice(1).forEach((pt) => ctx.lineTo(pt[0] * s, pt[1] * s + breath));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Bras angulaires
  ctx.beginPath();
  ctx.moveTo(-22 * s, -65 * s);
  ctx.lineTo(-45 * s + Math.sin(t * 1.5) * 8 * s, -40 * s);
  ctx.lineTo(-38 * s, -10 * s);
  ctx.moveTo(22 * s, -65 * s);
  ctx.lineTo(45 * s - Math.sin(t * 1.5) * 8 * s, -40 * s);
  ctx.lineTo(38 * s, -10 * s);
  // Jambes cristallines
  ctx.moveTo(-12 * s, -15 * s);
  ctx.lineTo(-18 * s + Math.sin(t * 2) * 6 * s, 0);
  ctx.moveTo(12 * s, -15 * s);
  ctx.lineTo(18 * s - Math.sin(t * 2) * 6 * s, 0);
  ctx.stroke();

  ctx.restore();
}

/**
 * Dragon Stellaire d'Or : chaîne cinématique en segments articulés
 */
function renderScenicBiolumDragon(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity * 0.95;

  const t = localTime * clip.motionSpeed;
  const s = clip.transform.scale;
  const numSegments = 20;

  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 24;

  for (let i = 0; i < numSegments; i++) {
    const lag = i * 0.12;
    const progress = (t * 0.4 - lag) % 1;
    const sx = width * 0.15 + (progress * width * 0.7);
    const sy = height * (clip.transform.y - 0.2) + Math.sin(t * 2.5 - i * 0.3) * 45 * s;
    const segRadius = (1 - i / numSegments) * 14 * s + 3 * s;

    ctx.fillStyle = i === 0 ? '#fef08a' : `rgba(251, 191, 36, ${1 - i / numSegments * 0.6})`;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(2, segRadius), 0, Math.PI * 2);
    ctx.fill();

    // Barbes et moustaches de dragon sur la tête
    if (i === 0) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 20 * s, sy - 15 * s, sx + 35 * s, sy - 5 * s);
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 20 * s, sy + 15 * s, sx + 35 * s, sy + 5 * s);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Papillon du Chaos (Attracteur de Lorenz)
 */
function renderScenicLorenzButterfly(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity * 0.9;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x;
  const cy = height * clip.transform.y;
  const s = clip.transform.scale * 2.2;

  ctx.translate(cx, cy);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4;
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 18;

  // Calcul itératif de l'orbite de Lorenz
  let lx = 0.1;
  let ly = 0;
  let lz = 0;
  const dt = 0.015;
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;

  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const dx = sigma * (ly - lx) * dt;
    const dy = (lx * (rho - lz) - ly) * dt;
    const dz = (lx * ly - beta * lz) * dt;
    lx += dx;
    ly += dy;
    lz += dz;

    const px = lx * s + Math.sin(t + i * 0.05) * 4;
    const py = (lz - 24) * s * 0.9;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Échiquier Cinétique 3D (Pistons pyramidaux de sol)
 */
function renderScenicKineticChessboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity * 0.85;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x;
  const cy = height * clip.transform.y;
  const s = clip.transform.scale;
  const cols = 8;
  const rows = 4;

  ctx.translate(cx, cy);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tileX = (c - cols / 2) * 40 * s;
      const tileY = r * 20 * s;
      const wave = Math.sin(t * 3 + c * 0.6 + r * 0.9);
      const elevation = wave * 16 * s;

      ctx.fillStyle = (c + r) % 2 === 0 ? 'rgba(203, 213, 225, 0.45)' : 'rgba(71, 85, 105, 0.35)';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;

      // Dessin de facette losange perspective
      ctx.beginPath();
      ctx.moveTo(tileX, tileY - elevation);
      ctx.lineTo(tileX + 20 * s, tileY + 10 * s - elevation);
      ctx.lineTo(tileX, tileY + 20 * s - elevation);
      ctx.lineTo(tileX - 20 * s, tileY + 10 * s - elevation);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Mandala de Sable & Souffle Éolien
 */
function renderScenicSandMandala(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  localTime: number,
  clip: TimelineClip,
  layerOpacity: number
) {
  ctx.save();
  ctx.globalAlpha = clip.transform.opacity * layerOpacity * 0.9;

  const t = localTime * clip.motionSpeed;
  const cx = width * clip.transform.x;
  const cy = height * clip.transform.y;
  const s = clip.transform.scale;
  const petals = 12;

  ctx.translate(cx, cy);
  ctx.rotate(t * 0.15);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4 * s;
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 14;

  for (let i = 0; i < petals; i++) {
    const angle = (i * Math.PI * 2) / petals;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -35 * s, 12 * s, 35 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Grains de sable en dispersion
  ctx.fillStyle = '#fde047';
  for (let i = 0; i < 20; i++) {
    const dist = (i * 12 + t * 40) % (140 * s);
    const ang = i * 1.6;
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist * 0.4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Portail des Étoiles & Lensing Gravitationnel (Stargate)
 */
function applyStargateLensingEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  intensity: number
) {
  ctx.save();
  ctx.globalAlpha = 0.5 * intensity;

  const cx = width / 2;
  const cy = height * 0.45;
  const radius = width * 0.18;

  // Anneau Stargate externe
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#6366f1';
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Chevrons rotatifs
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(timeSec * 0.4);
  ctx.strokeStyle = '#a5b4fc';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const angle = (i * Math.PI * 2) / 9;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 8, angle, angle + 0.15);
    ctx.stroke();
  }
  ctx.restore();

  // Horizon d'événement noir central
  ctx.fillStyle = 'rgba(10, 15, 25, 0.75)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Palette Thermique LUT en fausses couleurs
 */
function applyThermalLutEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'color-dodge';
  ctx.globalAlpha = 0.25 * intensity;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#3b82f6'); // Bleu froid
  grad.addColorStop(0.4, '#a855f7'); // Violet
  grad.addColorStop(0.7, '#f97316'); // Ambre chaud
  grad.addColorStop(1, '#ffffff'); // Blanc brûlé

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Éclipse Coronaire Scénique & Protubérances
 */
function applySolarCoronaEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  intensity: number
) {
  ctx.save();
  ctx.globalAlpha = 0.65 * intensity;

  const cx = width / 2;
  const cy = height * 0.35;
  const sunR = width * 0.12;

  // Rayons et éruptions
  ctx.strokeStyle = 'rgba(234, 88, 12, 0.5)';
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = 35;
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI * 2) / 24 + timeSec * 0.1;
    const len = sunR + 15 + Math.sin(timeSec * 4 + i * 2) * 28;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * sunR, cy + Math.sin(angle) * sunR);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Disque d'occultation noir
  ctx.fillStyle = '#05070a';
  ctx.beginPath();
  ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Mercure Liquide Réflectif (Metaballs chromées)
 */
function applyMercuryMetaballsEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  intensity: number
) {
  ctx.save();
  ctx.globalAlpha = 0.7 * intensity;

  const cy = height * 0.76;
  const numBalls = 5;

  ctx.fillStyle = '#cbd5e1';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#cbd5e1';
  ctx.shadowBlur = 18;

  for (let i = 0; i < numBalls; i++) {
    const bx = width * 0.35 + Math.sin(timeSec * 1.5 + i * 1.2) * (width * 0.25);
    const by = cy + Math.cos(timeSec * 2 + i) * 12;
    const br = 22 + Math.sin(timeSec + i) * 8;

    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Arborescence Synaptique & Axones de Lumière
 */
function applySynapticPulseEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  intensity: number
) {
  ctx.save();
  ctx.globalAlpha = 0.65 * intensity;
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 1.4;
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 18;

  const rootX = width / 2;
  const rootY = height * 0.9;

  function drawBranch(x: number, y: number, len: number, angle: number, depth: number) {
    if (depth > 4) return;
    const nx = x + Math.cos(angle) * len;
    const ny = y - Math.sin(angle) * len;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    // Impulsion de potentiel d'action
    if ((Math.sin(timeSec * 5 + depth) > 0.6)) {
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawBranch(nx, ny, len * 0.72, angle - 0.45, depth + 1);
    drawBranch(nx, ny, len * 0.72, angle + 0.45, depth + 1);
  }

  drawBranch(rootX, rootY, 70, Math.PI / 2, 0);

  ctx.restore();
}

/**
 * Voile d'Aurore Boréale Scénique
 */
function applyAuroraBorealisEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  intensity: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.5 * intensity;

  const grad = ctx.createLinearGradient(0, 0, width, height * 0.5);
  grad.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
  grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.35)');
  grad.addColorStop(1, 'rgba(236, 72, 153, 0.25)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 40);

  for (let x = 0; x <= width; x += 30) {
    const wave = Math.sin(timeSec * 1.2 + x * 0.008) * 35 + Math.cos(timeSec * 0.8 + x * 0.015) * 20;
    ctx.lineTo(x, 70 + wave);
  }

  ctx.lineTo(width, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}


