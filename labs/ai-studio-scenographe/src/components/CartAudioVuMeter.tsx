// Visualiseur de Niveau Sonore (VU-mètre Stéréo & Crête) & Fader de Master Gain de Sortie Système
// Développé pour la Régie Spectacle Vivant du CueCartPanel (No[co]de Vibe Designer)
// Piloté directement par l'API Web Audio (AnalyserNode sur masterGain avant destination audio système)

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Activity, Volume2, VolumeX, Sliders } from 'lucide-react';
import { scenicAudio, CartAudioLevels } from '../services/scenicAudioEngine';
import { liveBridge } from '../services/livePerformanceBridge';

interface CartAudioVuMeterProps {
  className?: string;
  isCompact?: boolean;
  onGainChange?: (gain: number) => void;
}

const gainToDbString = (gain: number): string => {
  if (gain <= 0.001) return '-∞ dB';
  const db = 20 * Math.log10(gain);
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
};

export const CartAudioVuMeter: React.FC<CartAudioVuMeterProps> = ({
  className = '',
  isCompact = false,
  onGainChange
}) => {
  // Références directes DOM pour éviter les re-renders React à 60 FPS lors de la visualisation
  const barLRef = useRef<HTMLDivElement>(null);
  const barRRef = useRef<HTMLDivElement>(null);
  const peakLRef = useRef<HTMLDivElement>(null);
  const peakRRef = useRef<HTMLDivElement>(null);
  const clipLedRef = useRef<HTMLSpanElement>(null);
  const dbTextRef = useRef<HTMLSpanElement>(null);
  const signalDotRef = useRef<HTMLSpanElement>(null);

  // Valeurs internes avec balistique audio
  const animFrameId = useRef<number | null>(null);
  const currentL = useRef<number>(0);
  const currentR = useRef<number>(0);
  const peakHoldL = useRef<number>(0);
  const peakHoldR = useRef<number>(0);
  const peakHoldTimeL = useRef<number>(0);
  const peakHoldTimeR = useRef<number>(0);
  const clipTime = useRef<number>(0);

  // --------------------------------------------------------------------------
  // FADER DE GAIN DE SORTIE SYSTÈME FINAL (MASTER GAIN AVANT SORTIE CARTE SON)
  // --------------------------------------------------------------------------
  const [masterGain, setMasterGain] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('nocode_cue_cart_system_master_gain');
      if (stored !== null) return parseFloat(stored);
      return scenicAudio.getMasterVolume();
    } catch {
      return 0.85;
    }
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nocode_cue_cart_system_master_mute') === 'true';
    } catch {
      return false;
    }
  });

  const handleGainChange = useCallback((newGain: number) => {
    const clamped = Math.max(0, Math.min(1.0, newGain));
    setMasterGain(clamped);

    // Modulation en direct du gain master Web Audio avant ctx.destination
    scenicAudio.setMasterVolume(isMuted ? 0 : clamped);

    // Persistance dans le localStorage
    try {
      localStorage.setItem('nocode_cue_cart_system_master_gain', clamped.toString());
    } catch {}

    // Envoi OSC pour consoles et passerelles réseau
    liveBridge.sendOSC('/audio/master/gain', [clamped, gainToDbString(clamped)]);
    if (onGainChange) onGainChange(clamped);
  }, [isMuted, onGainChange]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      scenicAudio.setMasterMute(next);

      try {
        localStorage.setItem('nocode_cue_cart_system_master_mute', next.toString());
      } catch {}

      liveBridge.sendOSC('/audio/master/mute', [next ? 1 : 0]);
      return next;
    });
  }, []);

  // Initialisation du Master Gain au montage
  useEffect(() => {
    scenicAudio.setMasterVolume(masterGain);
    scenicAudio.setMasterMute(isMuted);
  }, [masterGain, isMuted]);

  // Boucle de rendu temps réel 60 FPS du VU-mètre
  useEffect(() => {
    let isRunning = true;

    const renderLoop = (timestamp: number) => {
      if (!isRunning) return;

      const levels: CartAudioLevels = scenicAudio.getCartLevels();

      // Balistique : Attaque instantanée, relâchement exponentiel (Decay)
      const attack = 0.92;
      const release = 0.82;

      // Canal Gauche (L)
      if (levels.left > currentL.current) {
        currentL.current = currentL.current * (1 - attack) + levels.left * attack;
      } else {
        currentL.current = currentL.current * release;
      }

      // Canal Droit (R)
      if (levels.right > currentR.current) {
        currentR.current = currentR.current * (1 - attack) + levels.right * attack;
      } else {
        currentR.current = currentR.current * release;
      }

      // Gestion du Peak Hold (Garde de crête avec descente après 750ms)
      if (currentL.current > peakHoldL.current) {
        peakHoldL.current = currentL.current;
        peakHoldTimeL.current = timestamp;
      } else if (timestamp - peakHoldTimeL.current > 750) {
        peakHoldL.current = Math.max(0, peakHoldL.current - 0.03);
      }

      if (currentR.current > peakHoldR.current) {
        peakHoldR.current = currentR.current;
        peakHoldTimeR.current = timestamp;
      } else if (timestamp - peakHoldTimeR.current > 750) {
        peakHoldR.current = Math.max(0, peakHoldR.current - 0.03);
      }

      // Détection de Clip
      if (levels.isClipping || levels.peakL > 0.96 || levels.peakR > 0.96) {
        clipTime.current = timestamp;
      }
      const isClipActive = timestamp - clipTime.current < 450;

      // Mise à jour directe du DOM (zéro coût React)
      const pctL = Math.max(0, Math.min(100, Math.round(currentL.current * 100)));
      const pctR = Math.max(0, Math.min(100, Math.round(currentR.current * 100)));
      const peakPctL = Math.max(0, Math.min(100, Math.round(peakHoldL.current * 100)));
      const peakPctR = Math.max(0, Math.min(100, Math.round(peakHoldR.current * 100)));

      if (barLRef.current) barLRef.current.style.width = `${pctL}%`;
      if (barRRef.current) barRRef.current.style.width = `${pctR}%`;
      if (peakLRef.current) peakLRef.current.style.left = `${peakPctL}%`;
      if (peakRRef.current) peakRRef.current.style.left = `${peakPctR}%`;

      if (clipLedRef.current) {
        if (isClipActive) {
          clipLedRef.current.className =
            'w-1.5 h-1.5 rounded-full bg-red-500 shadow-md shadow-red-500 animate-pulse';
        } else {
          clipLedRef.current.className = 'w-1.5 h-1.5 rounded-full bg-zinc-800 border border-zinc-700';
        }
      }

      if (signalDotRef.current) {
        if (levels.isActive && (currentL.current > 0.03 || currentR.current > 0.03)) {
          signalDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400';
        } else {
          signalDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-zinc-700';
        }
      }

      if (dbTextRef.current) {
        if (!levels.isActive || (currentL.current < 0.01 && currentR.current < 0.01)) {
          dbTextRef.current.innerText = '-∞ dB';
          dbTextRef.current.className = 'text-[9px] font-mono text-zinc-500';
        } else {
          dbTextRef.current.innerText = levels.dbString;
          dbTextRef.current.className = `text-[9px] font-mono font-bold ${
            isClipActive ? 'text-red-400 font-black' : levels.db > -6 ? 'text-amber-300' : 'text-emerald-400'
          }`;
        }
      }

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, []);

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-1 bg-[#07090c] border border-[#232b36] rounded-xl shadow-inner select-none ${className}`}
      title="VU-mètre Stéréo & Fader de Master Gain de sortie finale vers le système audio"
    >
      {/* 1. SECTION VOYANTS & MESURE DÉCIBELS */}
      <div className="flex flex-col justify-center gap-0.5 min-w-[56px]">
        <div className="flex items-center justify-between gap-1 text-[8px] font-mono leading-none">
          <span className="text-zinc-400 font-bold tracking-wider flex items-center gap-1">
            <Activity className="w-2.5 h-2.5 text-cyan-400" />
            <span>SORTIE</span>
          </span>
          {/* LED Signal actif */}
          <span
            ref={signalDotRef}
            className="w-1.5 h-1.5 rounded-full bg-zinc-700 transition-colors"
            title="Témoin de signal audio actif avant sortie système"
          />
        </div>

        {/* Valeur décibels instantanée */}
        <div className="flex items-center justify-between text-[9px] font-mono leading-none mt-0.5">
          <span ref={dbTextRef} className="text-zinc-500 font-bold">
            -∞ dB
          </span>
          <span className="flex items-center gap-0.5 text-[7px] text-zinc-500 font-bold">
            <span>CLIP</span>
            <span ref={clipLedRef} className="w-1.5 h-1.5 rounded-full bg-zinc-800 border border-zinc-700" />
          </span>
        </div>
      </div>

      {/* 2. BARRES STÉRÉO VU-MÈTRE L & R */}
      <div className="flex flex-col gap-1 w-16 sm:w-24 py-0.5">
        {/* Canal Gauche (L) */}
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-mono font-black text-zinc-400 w-2 leading-none">L</span>
          <div className="relative flex-1 h-1.5 bg-black/80 rounded-sm overflow-hidden border border-zinc-800/80">
            {/* Dégradé audio classique : Vert (-60 à -18) -> Jaune (-18 à -3) -> Rouge (0dB) */}
            <div
              ref={barLRef}
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-none"
              style={{ width: '0%' }}
            />
            {/* Marqueur Peak Hold */}
            <div
              ref={peakLRef}
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm shadow-white pointer-events-none transition-none"
              style={{ left: '0%' }}
            />
          </div>
        </div>

        {/* Canal Droit (R) */}
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-mono font-black text-zinc-400 w-2 leading-none">R</span>
          <div className="relative flex-1 h-1.5 bg-black/80 rounded-sm overflow-hidden border border-zinc-800/80">
            <div
              ref={barRRef}
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-none"
              style={{ width: '0%' }}
            />
            {/* Marqueur Peak Hold */}
            <div
              ref={peakRRef}
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm shadow-white pointer-events-none transition-none"
              style={{ left: '0%' }}
            />
          </div>
        </div>

        {/* Échelle de graduation dB sous les barres */}
        <div className="flex justify-between items-center text-[6px] font-mono text-zinc-500 px-3 -mt-0.5 leading-none">
          <span>-48</span>
          <span>-24</span>
          <span>-12</span>
          <span>-3</span>
          <span className="text-red-400/90 font-bold">0</span>
        </div>
      </div>

      {/* SÉPARATEUR ÉLÉGANT */}
      <div className="h-6 w-px bg-zinc-800" />

      {/* 3. FADER DE GAIN DE SORTIE (MASTER GAIN SYSTÈME FINAL) */}
      <div className="flex items-center gap-2">
        {/* Bouton Mute Sortie Système */}
        <button
          type="button"
          onClick={handleToggleMute}
          className={`p-1 rounded-md transition-all flex items-center justify-center border text-[8px] font-mono font-bold ${
            isMuted
              ? 'bg-red-600 text-white border-red-400 shadow-sm shadow-red-900 animate-pulse'
              : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
          }`}
          title={isMuted ? 'Rétablir le Master Gain de sortie système' : 'Couper la sortie audio système finale (Mute)'}
        >
          {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-cyan-400" />}
        </button>

        {/* Fader & Affichage dB du Master Gain */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[8px] font-mono leading-none gap-2">
            <span className="text-zinc-400 font-bold tracking-wider uppercase flex items-center gap-0.5">
              <span>MASTER GAIN</span>
            </span>
            <span className={`font-bold ${isMuted ? 'text-red-400' : masterGain > 0.95 ? 'text-cyan-300' : 'text-zinc-200'}`}>
              {isMuted ? '-∞ dB (MUTE)' : `${gainToDbString(masterGain)} · ${Math.round(masterGain * 100)}%`}
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : masterGain}
              onChange={(e) => handleGainChange(parseFloat(e.target.value))}
              className="w-16 sm:w-20 h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-400 bg-zinc-800"
              title={`Fader de Gain de Sortie Système Final : ${Math.round(masterGain * 100)}% (${gainToDbString(masterGain)})`}
            />
          </div>
        </div>

        {/* Presets rapides de gain (0 dB / Unity, -6 dB) */}
        <div className="hidden sm:flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleGainChange(1.0)}
            className={`px-1 py-0.5 rounded text-[7px] font-mono font-bold border transition-all ${
              !isMuted && masterGain === 1.0
                ? 'bg-cyan-500 text-black border-cyan-300 font-black'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
            title="Régler le Gain de Sortie Système à 0 dB (Unity Gain - 100%)"
          >
            0dB
          </button>
          <button
            type="button"
            onClick={() => handleGainChange(0.5)}
            className={`px-1 py-0.5 rounded text-[7px] font-mono font-bold border transition-all ${
              !isMuted && Math.abs(masterGain - 0.5) < 0.05
                ? 'bg-cyan-500 text-black border-cyan-300 font-black'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
            title="Atténuer le Gain de Sortie Système à -6 dB (50%)"
          >
            -6dB
          </button>
        </div>
      </div>
    </div>
  );
};
