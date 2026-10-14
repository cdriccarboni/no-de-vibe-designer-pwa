import React, { useMemo } from 'react';
import { Volume2, Sparkles, Timer } from 'lucide-react';

interface PadWaveformVisualizerProps {
  preset: string;
  durationSec: number;
  fadeTimeMs?: number;
  color: string;
  progress: number; // 0 à 100
  isPlaying: boolean;
  isStopping?: boolean;
  compact?: boolean; // true = dans la grille de pad (hauteur réduite), false = dans le tiroir d'inspection studio
  className?: string;
  onSeek?: (pct: number) => void;
}

// Descriptions et profils acoustiques des presets sonores scéniques
export const PRESET_AUDIO_PROFILES: Record<string, { label: string; type: string; desc: string }> = {
  crystal_resonance: {
    label: 'Cloche Cristalline & Gong',
    type: 'Percussion Harmonique',
    desc: 'Attaque franche, partiels aigus et résonance longue à décroissance exponentielle'
  },
  deep_sub_drone: {
    label: 'Sub Drone 40Hz',
    type: 'Basse Fréquence Continue',
    desc: 'Onde sinusoïdale dense 40Hz avec modulation lente et vibrations physiques de plateau'
  },
  metallic_pulse: {
    label: 'Impact Métallique',
    type: 'Transitoire Aigu',
    desc: 'Attaque impulsive carrée 320Hz avec résonance courte et transitoire nette'
  },
  water_droplet: {
    label: 'Goutte d’Eau Résonante',
    type: 'Pitch Sweep FM',
    desc: 'Glissando rapide de fréquence avec bulle d’air et résonance organique'
  },
  footstep_wood: {
    label: 'Pas de Bois / Sabre',
    type: 'Foley Percussif',
    desc: 'Transitoire feutrée de plancher théâtral avec réflexion courte d’acoustique de salle'
  },
  sparkle_pentatonic: {
    label: 'Scintillement Pentatonique',
    type: 'Arpège Étincelles',
    desc: 'Salve de 5 impulsions cristallines échelonnées avec brillance spectrale'
  },
  tibetan_bowl: {
    label: 'Bol Tibétain 432Hz',
    type: 'Harmonique Continue',
    desc: 'Montée progressive, résonance céleste stable et battements acoustiques chaleureux'
  },
  wind_texture: {
    label: 'Texture Vent / Houle',
    type: 'Bruit Rose Filtré',
    desc: 'Ondes amples et fluctuantes simulant les rafales d’air et les vagues scéniques'
  },
  bell_cue: {
    label: 'Signal TOP Régie Chime',
    type: 'Top Acoustique',
    desc: 'Impulsion claire et distincte pour tops comédiens ou synchronisation scénique'
  },
  sub_rumble: {
    label: 'Rumble Sismique',
    type: 'Infrabasses Rytmiques',
    desc: 'Pulsations graves continues à haute énergie acoustique simulant tremblements de scène'
  },
  shimmer_reverb: {
    label: 'Brise & Shimmer Astral',
    type: 'Nappe Aérienne',
    desc: 'Crescendo doux avec réverbe scintillante en octave supérieure'
  }
};

/**
 * Générateur déterministe de profil d'enveloppe et de crêtes d'amplitude (Waveform)
 * Calcule une suite d'amplitudes (0.05 à 1.0) correspondant au timbre du preset audio,
 * modulée par la durée et le temps de fondu d'attaque (Fade Time).
 */
export function generateWaveformSamples(
  preset: string,
  sampleCount: number,
  durationSec: number,
  fadeTimeMs: number = 0
): number[] {
  const samples: number[] = [];
  const fadeRatio = durationSec > 0 ? Math.min(1, (fadeTimeMs / 1000) / durationSec) : 0;

  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1); // 0.0 à 1.0
    let amplitude = 0.2;

    switch (preset) {
      case 'crystal_resonance': {
        // Attaque vive puis décroissance exponentielle avec harmoniques oscillantes
        const attack = Math.min(1, t / 0.06);
        const decay = Math.exp(-t * 3.5);
        const harmonics = 0.85 + 0.15 * Math.sin(t * 42) + 0.08 * Math.cos(t * 18);
        amplitude = attack * decay * harmonics;
        break;
      }

      case 'deep_sub_drone': {
        // Enveloppe large, forte énergie continue avec ondulation de sub
        const attack = Math.min(1, t / 0.12);
        const release = Math.min(1, (1 - t) / 0.15);
        const subPulse = 0.75 + 0.22 * Math.sin(t * 14) + 0.08 * Math.sin(t * 28);
        amplitude = attack * release * subPulse;
        break;
      }

      case 'metallic_pulse': {
        // Énorme impact initial (0 à 0.08) puis décroissance abrupte avec résonances métalliques
        if (t < 0.08) {
          amplitude = 0.4 + (t / 0.08) * 0.6;
        } else {
          const decay = Math.exp(-(t - 0.08) * 6.5);
          const ring = 0.2 * Math.sin(t * 60) * Math.exp(-(t - 0.08) * 3);
          amplitude = Math.max(0.08, decay * 0.95 + ring);
        }
        break;
      }

      case 'water_droplet': {
        // Petite amorce, pic de la bulle d'eau à 25%, puis ondelettes décroissantes
        const dropletPeak = Math.exp(-Math.pow((t - 0.25) / 0.12, 2));
        const tail = t > 0.3 ? Math.exp(-(t - 0.3) * 4) * 0.35 * (0.8 + 0.2 * Math.sin(t * 36)) : 0.1;
        amplitude = Math.max(0.1, dropletPeak * 0.95 + tail);
        break;
      }

      case 'footstep_wood': {
        // Claquement net à 10%, court corps de bois, atténuation rapide
        const clack = Math.exp(-Math.pow((t - 0.1) / 0.08, 2));
        const body = t > 0.1 ? Math.exp(-(t - 0.1) * 7) * 0.4 : 0.05;
        amplitude = Math.max(0.08, clack * 0.9 + body);
        break;
      }

      case 'sparkle_pentatonic': {
        // Répétition de 4-5 impulsions étincelantes sur la timeline
        const pulse1 = Math.exp(-Math.pow((t - 0.08) / 0.06, 2)) * 0.95;
        const pulse2 = Math.exp(-Math.pow((t - 0.28) / 0.06, 2)) * 0.85;
        const pulse3 = Math.exp(-Math.pow((t - 0.50) / 0.06, 2)) * 0.92;
        const pulse4 = Math.exp(-Math.pow((t - 0.72) / 0.06, 2)) * 0.78;
        const shimmerTail = Math.exp(-t * 2) * 0.25 * (0.7 + 0.3 * Math.sin(t * 50));
        amplitude = Math.max(0.12, Math.max(pulse1, pulse2, pulse3, pulse4) + shimmerTail);
        break;
      }

      case 'tibetan_bowl': {
        // Montée douce (swelling), pic vers 30%, tenue harmonique très longue avec battements
        const swell = Math.min(1, t / 0.3);
        const beat = 0.8 + 0.18 * Math.sin(t * 16) + 0.08 * Math.cos(t * 24);
        const decay = Math.exp(-t * 1.4);
        amplitude = swell * decay * beat;
        break;
      }

      case 'wind_texture': {
        // Ambiance organique fluctuante (rafales d'air et vagues)
        const gust1 = Math.sin(t * 9) * 0.3;
        const gust2 = Math.sin(t * 22) * 0.2;
        const gust3 = Math.cos(t * 4) * 0.25;
        const envelope = 0.55 + gust1 + gust2 + gust3;
        amplitude = Math.max(0.15, Math.min(0.95, envelope));
        break;
      }

      case 'bell_cue': {
        // Top de régie : impact net à 5%, double harmonique stable
        const strike = Math.exp(-Math.pow((t - 0.05) / 0.05, 2));
        const sustain = Math.exp(-t * 2.8) * 0.6 * (0.85 + 0.15 * Math.sin(t * 30));
        amplitude = Math.max(0.1, strike * 0.95 + sustain);
        break;
      }

      case 'sub_rumble': {
        // Oscillations graves de séisme
        const rumble = 0.5 + 0.35 * Math.sin(t * 12) + 0.15 * Math.sin(t * 32);
        const edge = Math.min(1, t / 0.1) * Math.min(1, (1 - t) / 0.1);
        amplitude = Math.max(0.18, rumble * edge);
        break;
      }

      case 'shimmer_reverb': {
        // Attaque veloutée puis halo diffus avec réverbe étincelante
        const attack = Math.min(1, t / 0.25);
        const cloud = Math.exp(-t * 1.8) * (0.8 + 0.2 * Math.sin(t * 38));
        amplitude = Math.max(0.12, attack * cloud);
        break;
      }

      default: {
        // Profil par défaut polyvalent : impact doux + décroissance
        const defAttack = Math.min(1, t / 0.08);
        const defDecay = Math.exp(-t * 2.5);
        const jitter = 0.85 + 0.15 * Math.sin(t * 25);
        amplitude = defAttack * defDecay * jitter;
        break;
      }
    }

    // Application de la rampe d'attaque du Fade Time (si configuré)
    if (fadeRatio > 0 && t < fadeRatio) {
      const ramp = Math.max(0.08, t / fadeRatio);
      amplitude *= ramp;
    }

    // Normalisation entre 0.08 et 1.0
    const clamped = Math.max(0.08, Math.min(1.0, amplitude));
    samples.push(clamped);
  }

  return samples;
}

export const PadWaveformVisualizer: React.FC<PadWaveformVisualizerProps> = ({
  preset,
  durationSec,
  fadeTimeMs = 0,
  color,
  progress,
  isPlaying,
  isStopping = false,
  compact = true,
  className = '',
  onSeek
}) => {
  // Détermine le nombre d'échantillons selon le mode compact ou studio
  const barCount = compact ? 32 : 64;

  const samples = useMemo(() => {
    return generateWaveformSamples(preset, barCount, durationSec, fadeTimeMs);
  }, [preset, barCount, durationSec, fadeTimeMs]);

  // Index de la tête de lecture (playhead)
  const activeBarIndex = Math.floor((progress / 100) * barCount);

  // Pourcentage du temps de fondu sur la largeur totale
  const fadeWidthPct = durationSec > 0 ? Math.min(100, ((fadeTimeMs / 1000) / durationSec) * 100) : 0;

  const profile = PRESET_AUDIO_PROFILES[preset] || {
    label: preset,
    type: 'Signal Audio',
    desc: 'Échantillon audio scénique chargé'
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    onSeek(pct);
  };

  // -------------------------------------------------------------
  // RENDU 1 : MODE COMPACT (DANS LE SLOT DU PAD DE LA GRILLE 4x4)
  // -------------------------------------------------------------
  if (compact) {
    return (
      <div
        className={`relative w-full h-7 rounded bg-black/45 border border-white/5 overflow-hidden flex items-center px-1 group/wf select-none cursor-pointer ${className}`}
        onClick={handleContainerClick}
        title={`Forme d'onde : ${profile.label} (${durationSec}s)${fadeTimeMs > 0 ? ` · Fondu ${fadeTimeMs}ms` : ''}`}
      >
        {/* Zone de fondu (Fade-in overlay si configuré) */}
        {fadeWidthPct > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-cyan-400/10 border-r border-dashed border-cyan-400/40 pointer-events-none z-0"
            style={{ width: `${fadeWidthPct}%` }}
          />
        )}

        {/* Ligne médiane de repère audio */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/[0.04] pointer-events-none z-0" />

        {/* Barres de la Forme d'Onde */}
        <div className="relative z-10 w-full h-full flex items-center justify-between gap-[1px]">
          {samples.map((amp, idx) => {
            const isPlayed = isPlaying && idx <= activeBarIndex;
            const isCurrent = isPlaying && idx === activeBarIndex;
            const barHeightPct = Math.round(amp * 88);

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-center items-center h-full"
              >
                <div
                  className={`w-full rounded-full transition-all duration-75 ${
                    isCurrent
                      ? 'scale-y-125'
                      : ''
                  }`}
                  style={{
                    height: `${barHeightPct}%`,
                    backgroundColor: isStopping
                      ? '#f59e0bcc'
                      : isPlayed
                      ? color
                      : isPlaying
                      ? `${color}50`
                      : `${color}35`,
                    boxShadow: isStopping ? '0 0 6px #f59e0b90' : isPlayed ? `0 0 4px ${color}80` : undefined
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Tête de lecture (Playhead) dynamique avec halo lumineux */}
        {isPlaying && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-20 flex flex-col items-center transition-all duration-75"
            style={{ left: `${Math.min(99, progress)}%` }}
          >
            <div className="w-1 h-1 rounded-full bg-white shadow-[0_0_6px_#fff]" />
            <div className="w-[1.5px] flex-1 bg-white shadow-[0_0_8px_#ffffff]" />
            <div className="w-1 h-1 rounded-full bg-white shadow-[0_0_6px_#fff]" />
          </div>
        )}

        {/* Badge miniature du preset en survol */}
        <div className="absolute right-1 bottom-0.5 pointer-events-none z-20 opacity-0 group-hover/wf:opacity-100 transition-opacity">
          <span className="text-[7px] font-mono text-zinc-400 bg-black/80 px-1 py-0.2 rounded border border-white/10">
            {durationSec}s
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDU 2 : MODE STUDIO ÉTENDU (DANS LE TIROIR D'INSPECTION DE PAD)
  // -------------------------------------------------------------
  return (
    <div className={`space-y-2 ${className}`}>
      {/* En-tête de la forme d'onde avec badge de profil acoustique */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-cyan-200">
            VISUALISATION FORME D'ONDE (WAVEFORM STUDIO)
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-mono">
            {profile.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <span>{profile.type}</span>
          <span>·</span>
          <span className="text-white font-bold">{durationSec.toFixed(1)}s</span>
        </div>
      </div>

      {/* Boîtier principal d'affichage de la Forme d'Onde Studio */}
      <div
        className="relative w-full h-24 rounded-xl bg-[#090c10] border border-cyan-500/30 overflow-hidden select-none p-2 cursor-pointer group shadow-inner"
        onClick={handleContainerClick}
        title="Cliquez sur la forme d'onde pour caler la lecture ou inspecter l'enveloppe"
      >
        {/* Grille de fond studio (Graduations de niveau dB) */}
        <div className="absolute inset-0 pointer-events-none z-0 flex flex-col justify-between p-1.5 opacity-20">
          <div className="border-b border-dashed border-cyan-400 w-full" />
          <div className="border-b border-dashed border-cyan-400 w-full" />
          <div className="border-b border-cyan-400 w-full" />
          <div className="border-b border-dashed border-cyan-400 w-full" />
          <div className="border-b border-dashed border-cyan-400 w-full" />
        </div>

        {/* Zone de fondu (Fade-in ramp visualizer) */}
        {fadeWidthPct > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500/25 to-transparent border-r-2 border-dashed border-cyan-400 pointer-events-none z-10 flex flex-col justify-between p-1"
            style={{ width: `${fadeWidthPct}%` }}
          >
            <span className="text-[8px] font-mono font-bold text-cyan-300 bg-black/60 px-1 py-0.2 rounded self-start border border-cyan-500/40">
              Fade In {fadeTimeMs}ms
            </span>
            <div className="flex items-center gap-0.5 text-[8px] text-cyan-300 font-mono">
              <Timer className="w-2.5 h-2.5" />
              <span>Rampe</span>
            </div>
          </div>
        )}

        {/* Barres symétriques de la forme d'onde */}
        <div className="relative z-10 w-full h-full flex items-center justify-between gap-[1.5px]">
          {samples.map((amp, idx) => {
            const isPlayed = isPlaying && idx <= activeBarIndex;
            const isCurrent = isPlaying && idx === activeBarIndex;
            const barHeightPct = Math.round(amp * 92);

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-center items-center h-full"
              >
                {/* Demi-onde supérieure */}
                <div
                  className="w-full rounded-t transition-all duration-75"
                  style={{
                    height: `${barHeightPct / 2}%`,
                    backgroundColor: isPlayed
                      ? color
                      : isPlaying
                      ? `${color}60`
                      : `${color}40`,
                    boxShadow: isPlayed ? `0 0 6px ${color}80` : undefined
                  }}
                />
                {/* Ligne médiane fine */}
                <div className="w-full h-[1px] bg-black/40" />
                {/* Demi-onde inférieure symétrique (effet miroir studio) */}
                <div
                  className="w-full rounded-b transition-all duration-75"
                  style={{
                    height: `${(barHeightPct / 2) * 0.75}%`,
                    backgroundColor: isPlayed
                      ? `${color}cc`
                      : isPlaying
                      ? `${color}45`
                      : `${color}25`
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Tête de lecture (Playhead studio avec repère temporel) */}
        {isPlaying && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center transition-all duration-75"
            style={{ left: `${Math.min(99.5, progress)}%` }}
          >
            <div className="px-1 py-0.2 bg-white text-black font-mono font-black text-[8px] rounded shadow-lg -translate-y-1">
              {((progress / 100) * durationSec).toFixed(2)}s
            </div>
            <div className="w-[2px] flex-1 bg-white shadow-[0_0_10px_#ffffff]" />
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
          </div>
        )}
      </div>

      {/* Règle temporelle sous la forme d'onde (Timecode Ruler) */}
      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 px-1">
        <span>0.0s</span>
        <span>{(durationSec * 0.25).toFixed(1)}s</span>
        <span className="text-zinc-400 font-bold">{(durationSec * 0.5).toFixed(1)}s (Centre)</span>
        <span>{(durationSec * 0.75).toFixed(1)}s</span>
        <span className="text-zinc-300 font-bold">{durationSec.toFixed(1)}s (Fin)</span>
      </div>

      {/* Description acoustique du preset audio */}
      <div className="flex items-center gap-2 p-2 bg-[#121620] border border-[#232936] rounded-lg text-[10px] text-zinc-400">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="leading-tight">
          <strong className="text-zinc-200">Signature Sonore :</strong> {profile.desc}.
        </span>
      </div>
    </div>
  );
};
