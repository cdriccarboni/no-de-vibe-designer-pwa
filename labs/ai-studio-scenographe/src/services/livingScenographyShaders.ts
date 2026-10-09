// Shaders Vidéo Numérique & Anaglyphe pour « Scénographie vivante »
// « PIRATES PAILLETTES ! V2.1.26 » — Shaders attestés dans le texte + Fallbacks 2D
// Shaders : Les limbes (p.23), La tempête (p.31), Water simulation (p.35),
// Les abysses (p.37), Les abysses II (p.43), Wispy background (p.54), Anaglyphe (p.22..54)

import { ParametricShaderConfig, AnaglyphConfig } from '../types/livingScenography';

export const PARAMETRIC_SHADERS_CATALOG: ParametricShaderConfig[] = [
  {
    id: 'limbes',
    name: 'Les limbes',
    didascaliePage: 23,
    description: 'Shaders vidéo numérique : Brume spectrale, profondeur sombre et silhouettes vaporeuses.',
    intensity: 1.1,
    speed: 0.8,
    grain: 0.35,
    paletteHue: 270, // Violet mystique / pourpre
    seed: 42,
    is2DFallback: false,
    uniforms: {
      u_fog_density: 1.2,
      u_spectral_drift: 0.75,
      u_noise_scale: 2.5
    }
  },
  {
    id: 'tempete',
    name: 'La tempête',
    didascaliePage: 31,
    description: 'Shaders vidéo numérique + Anaglyphe FX : Vagues déchaînées, éclairs fulgurants et pluie battante.',
    intensity: 1.6,
    speed: 1.7,
    grain: 0.6,
    paletteHue: 215, // Bleu nuit orageux & reflets blancs
    seed: 108,
    is2DFallback: false,
    uniforms: {
      u_turbulence: 1.8,
      u_lightning_freq: 0.4,
      u_rain_density: 1.5
    }
  },
  {
    id: 'water_sim',
    name: 'Water simulation (Réactive)',
    didascaliePage: 35,
    description: 'Shaders vidéo numérique : Houle marine dont les mouvements ondulent et s’amplifient avec la musique.',
    intensity: 1.0,
    speed: 1.0,
    grain: 0.25,
    paletteHue: 195, // Cyan caraïbe & aigue-marine
    seed: 88,
    is2DFallback: false,
    uniforms: {
      u_audio_reactivity: 1.2,
      u_wave_height: 1.0,
      u_water_clarity: 0.85
    }
  },
  {
    id: 'abysses',
    name: 'Les abysses',
    didascaliePage: 37,
    description: 'Shaders vidéo numérique + Anaglyphe FX : Immersion sous-marine, pleine lune qui s’efface, banc de cétacés.',
    intensity: 1.2,
    speed: 0.6,
    grain: 0.3,
    paletteHue: 230, // Bleu saphir abyssal & bioluminescence
    seed: 13,
    is2DFallback: false,
    uniforms: {
      u_depth_darkness: 1.4,
      u_biolum_glow: 1.3,
      u_caustic_warp: 0.9
    }
  },
  {
    id: 'abysses_2',
    name: 'Les abysses II (Le Kraken)',
    didascaliePage: 43,
    description: 'Shaders vidéo numérique : Gouffre marin hors de l’espace et du temps, courants contraires violents.',
    intensity: 1.5,
    speed: 1.3,
    grain: 0.5,
    paletteHue: 200, // Vert d’eau abyssal & ombres titanesques
    seed: 99,
    is2DFallback: false,
    uniforms: {
      u_vortex_force: 1.6,
      u_shadow_density: 1.5,
      u_kraken_aura: 1.1
    }
  },
  {
    id: 'wispy_bg',
    name: 'Wispy background',
    didascaliePage: 54,
    description: 'Shaders vidéo numérique : Volutes vaporeuses de fumée, flou de souvenirs, visages qui s’estompent.',
    intensity: 0.85,
    speed: 0.5,
    grain: 0.2,
    paletteHue: 35, // Ambre sépia doux & lin
    seed: 7,
    is2DFallback: false,
    uniforms: {
      u_wispy_smoke: 1.2,
      u_memory_blur: 1.4,
      u_dissolve_edge: 0.9
    }
  },
  {
    id: 'anaglyph_vortex',
    name: 'Tourbillon hypnotique anaglyphe',
    didascaliePage: 22,
    description: 'Spirale concentrique stéréoscopique rouge/cyan aspirant le regard à travers le rideau de fils.',
    intensity: 1.3,
    speed: 1.4,
    grain: 0.4,
    paletteHue: 0,
    seed: 55,
    is2DFallback: false,
    uniforms: {
      u_spiral_arms: 4.0,
      u_convergence: 8.0,
      u_chromatic_split: 1.0
    }
  }
];

// Rendu 2D Canvas de secours haute performance (progressif et garanti 100% sans WebGL)
export function renderShader2DFallback(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  shader: ParametricShaderConfig,
  anaglyph: AnaglyphConfig,
  audioRms: number = 0
) {
  ctx.save();
  const t = timeSec * shader.speed;

  switch (shader.id) {
    case 'limbes': {
      // Fond brumeux violet/noir avec volutes de fumée
      const grad = ctx.createRadialGradient(
        width * 0.5 + Math.sin(t * 0.5) * 60,
        height * 0.5 + Math.cos(t * 0.4) * 40,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, `hsla(${shader.paletteHue}, 65%, 22%, 0.85)`);
      grad.addColorStop(0.5, `hsla(${shader.paletteHue + 20}, 80%, 10%, 0.95)`);
      grad.addColorStop(1, '#050308');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Nappes de brume ondulantes
      ctx.fillStyle = `hsla(${shader.paletteHue - 15}, 60%, 45%, 0.12)`;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const yOff = height * (0.3 + i * 0.18) + Math.sin(t + i) * 25;
        ctx.moveTo(0, yOff);
        for (let x = 0; x <= width; x += 30) {
          const wave = Math.sin((x / width) * 4 + t * 0.8 + i) * 35;
          ctx.lineTo(x, yOff + wave);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'tempete': {
      // Fond sombre d'orage
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // Éclair stroboscopique occasionnel
      const isLightning = Math.sin(t * 7.5) > 0.94 && Math.sin(t * 1.3) > 0.5;
      if (isLightning) {
        ctx.fillStyle = 'rgba(235, 245, 255, 0.45)';
        ctx.fillRect(0, 0, width, height);
      }

      // Houle tumultueuse
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `hsla(${shader.paletteHue + i * 8}, 75%, ${15 + i * 5}%, ${0.55 - i * 0.08})`;
        ctx.beginPath();
        const baseY = height * (0.55 + i * 0.09);
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= width; x += 20) {
          const wave = Math.sin((x / width) * 8 + t * 3.5 + i * 1.5) * (40 - i * 5)
            + Math.cos((x / width) * 14 - t * 2.0) * 15;
          ctx.lineTo(x, baseY + wave);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
      }

      // Traînées obliques de pluie battante
      ctx.strokeStyle = 'rgba(180, 215, 255, 0.25)';
      ctx.lineWidth = 1.2;
      for (let r = 0; r < 40; r++) {
        const rx = ((r * 47 + t * 800) % (width + 100)) - 50;
        const ry = (r * 23 + t * 1200) % height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 15, ry + 35);
        ctx.stroke();
      }
      break;
    }

    case 'water_sim': {
      // Eau réactive à la musique
      const audioBoost = Math.min(1.5, 1.0 + audioRms * 2.5);
      const gradWater = ctx.createLinearGradient(0, 0, 0, height);
      gradWater.addColorStop(0, '#041624');
      gradWater.addColorStop(0.4, '#082f49');
      gradWater.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = gradWater;
      ctx.fillRect(0, 0, width, height);

      // Rides et houle en couches superposées
      for (let w = 0; w < 4; w++) {
        ctx.fillStyle = `hsla(${shader.paletteHue + w * 10}, 85%, ${30 + w * 8}%, 0.45)`;
        ctx.beginPath();
        const yBase = height * (0.45 + w * 0.12);
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= width; x += 15) {
          const amp = (25 + w * 8) * audioBoost;
          const y = yBase + Math.sin((x / 140) + t * (1.2 + w * 0.4)) * amp;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'abysses':
    case 'abysses_2': {
      // Abysses marines profondes & particules bioluminescentes
      const gradAbyss = ctx.createRadialGradient(
        width * 0.5,
        height * 0.2,
        30,
        width * 0.5,
        height * 0.7,
        height * 0.9
      );
      gradAbyss.addColorStop(0, '#0f172a');
      gradAbyss.addColorStop(0.4, '#070f1e');
      gradAbyss.addColorStop(1, '#020408');
      ctx.fillStyle = gradAbyss;
      ctx.fillRect(0, 0, width, height);

      // Particules bioluminescentes dérivantes
      for (let p = 0; p < 25; p++) {
        const px = ((p * 73 + Math.sin(t * 0.5 + p) * 80) % width + width) % width;
        const py = ((p * 41 + t * 30 + Math.cos(t * 0.3 + p) * 40) % height + height) % height;
        const rad = 2.5 + Math.sin(t * 2 + p) * 1.5;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fillStyle = p % 2 === 0 ? 'rgba(56, 189, 248, 0.65)' : 'rgba(45, 212, 191, 0.6)';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      break;
    }

    case 'wispy_bg': {
      // Wispy Background : Volutes de fumée éthérées
      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 3; i++) {
        const grad = ctx.createRadialGradient(
          width * (0.35 + i * 0.2) + Math.sin(t * 0.4 + i) * 50,
          height * (0.4 + i * 0.15) + Math.cos(t * 0.3 + i) * 40,
          20,
          width * 0.5,
          height * 0.5,
          width * 0.55
        );
        grad.addColorStop(0, 'rgba(215, 184, 106, 0.22)');
        grad.addColorStop(0.6, 'rgba(120, 113, 108, 0.12)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
      break;
    }

    case 'anaglyph_vortex':
    default: {
      // Tourbillon hypnotique concentrique
      ctx.fillStyle = '#08080a';
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const maxR = Math.hypot(cx, cy);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.8);

      for (let r = 20; r < maxR; r += 22) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 1.5);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = r % 44 === 0
          ? 'rgba(244, 63, 94, 0.55)' // Rouge
          : 'rgba(6, 182, 212, 0.55)'; // Cyan
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
  }

  // Application de l'effet anaglyphe stéréoscopique si activé et non désactivé en 2D pure
  if (anaglyph.enabled && !anaglyph.pure2DFallback) {
    applyAnaglyphPostFilter(ctx, width, height, anaglyph.convergence);
  }

  ctx.restore();
}

/**
 * Filtre anaglyphe stéréoscopique rouge/cyan avec décalage de convergence
 */
function applyAnaglyphPostFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  convergencePx: number
) {
  if (convergencePx === 0) return;
  const shift = Math.round(convergencePx);

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const leftX = Math.max(0, x - shift);
        const rightX = Math.min(width - 1, x + shift);

        const leftIdx = (y * width + leftX) * 4;
        const rightIdx = (y * width + rightX) * 4;

        // Oeil gauche : canal ROUGE
        data[idx] = copy[leftIdx];
        // Oeil droit : canaux VERT et BLEU (Cyan)
        data[idx + 1] = copy[rightIdx + 1];
        data[idx + 2] = copy[rightIdx + 2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Canvas security or context limit safe fallback
  }
}
