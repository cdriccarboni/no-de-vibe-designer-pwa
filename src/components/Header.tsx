import React from 'react';
import { EngineId } from '../types/engine';
import {
  Layers,
  HelpCircle,
  ShieldCheck,
  BookmarkPlus,
  Radio,
  User,
  Sparkles,
  Palette,
  Smartphone,
  Maximize2,
  Waves,
  Music,
} from 'lucide-react';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentEngineId: EngineId;
  onSelectEngine: (id: EngineId) => void;
  onOpenDoc: () => void;
  onOpenAudit: () => void;
  onOpenSavedScenes: () => void;
  onOpenInterop: () => void;
  onOpenScenography?: () => void;
  onOpenLivingScenography?: () => void;
  onOpenRadioBroadcast?: () => void;
  onOpenMagicMapping?: () => void;
  onOpenCompanionPairing?: () => void;
  onOpenThemeCustomizer?: () => void;
  onOpenLiveFoley?: () => void;
  onOpenAbletonLive?: () => void;
  isRadioLive?: boolean;
  isCompanionConnected?: boolean;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  isLocalNetwork: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentEngineId,
  onSelectEngine,
  onOpenDoc,
  onOpenAudit,
  onOpenSavedScenes,
  onOpenInterop,
  onOpenScenography,
  onOpenLivingScenography,
  onOpenRadioBroadcast,
  onOpenMagicMapping,
  onOpenCompanionPairing,
  onOpenThemeCustomizer,
  onOpenLiveFoley,
  onOpenAbletonLive,
  isRadioLive = false,
  isCompanionConnected = false,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  isLocalNetwork,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 lg:gap-8 px-6 py-2.5 bg-zinc-950 border-b border-zinc-800/80 sticky top-0 z-30 select-none">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2.5 whitespace-nowrap">
          <span className="w-7 h-7 rounded bg-zinc-900 border border-zinc-700/80 flex items-center justify-center font-mono text-xs font-bold text-cyan-400">
            N[c]
          </span>
          <span className="font-bold tracking-tight">No[co]de Vibe Designer</span>
        </a>
      </div>

      {/* Zone 2: Navigation Links / Engine Selectors */}
      <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-zinc-400">
        <button
          onClick={() => onSelectEngine('hybrid-p5-glsl')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentEngineId === 'hybrid-p5-glsl' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pipeline p5 ➔ GLSL</span>
        </button>

        <button
          onClick={() => onSelectEngine('glsl')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 ${
            currentEngineId === 'glsl' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          GLSL / WebGL
        </button>

        <button
          onClick={() => onSelectEngine('isf')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 ${
            currentEngineId === 'isf' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          ISF
        </button>

        <button
          onClick={() => onSelectEngine('p5js')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 ${
            currentEngineId === 'p5js' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          p5.js
        </button>

        <button
          onClick={() => onSelectEngine('javascript')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 ${
            currentEngineId === 'javascript' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          JavaScript
        </button>

        <button
          onClick={() => onSelectEngine('typescript')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 ${
            currentEngineId === 'typescript' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          TypeScript
        </button>

        <button
          onClick={() => onSelectEngine('pyodide')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 ${
            currentEngineId === 'pyodide' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Python (WASM)
        </button>

        <button
          onClick={() => onSelectEngine('webgpu')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 ${
            currentEngineId === 'webgpu' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          WebGPU
        </button>
      </nav>

      {/* Zone 3: Offline controls, PWA install, Modals */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Offline Indicator & Coupure Simulator */}
        <OfflineIndicator
          isOnline={isOnline}
          isSimulatedOffline={isSimulatedOffline}
          onToggleSimulatedOffline={onToggleSimulatedOffline}
          isLocalNetwork={isLocalNetwork}
        />

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* PRIORITÉ P00 : Broadcast Radio Direct */}
        {onOpenRadioBroadcast && (
          <button
            onClick={onOpenRadioBroadcast}
            title="Studio Broadcast Radio Live : Diffusion directe sur page web & mobile (/radio-paillettes, /radio-pirate)"
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-all whitespace-nowrap flex items-center gap-1.5 shadow-md ${
              isRadioLive
                ? 'bg-rose-950 text-rose-300 border border-rose-500 shadow-rose-950/60 animate-pulse'
                : 'bg-zinc-900 hover:bg-zinc-850 text-rose-400 border border-rose-900/60'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isRadioLive ? 'text-rose-400 animate-ping' : 'text-rose-400'}`} />
            <span>Radio Live</span>
            {isRadioLive && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-600 text-white font-bold">
                ON AIR
              </span>
            )}
          </button>
        )}

        {/* PRIORITÉ P0 : Pinceau Vidéo-Mapping & Auto-Mapping 3s */}
        {onOpenMagicMapping && (
          <button
            onClick={onOpenMagicMapping}
            title="Pinceau de Vidéo-Mapping & Auto-Mapping 3s (Corner pin, Vase courbé, Caméra hors-axe)"
            className="px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:text-cyan-100 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-700/70 rounded transition-all whitespace-nowrap flex items-center gap-1.5 shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Auto-Mapping 3s</span>
          </button>
        )}

        {/* PRIORITÉ P0 : Companion Mobile (Liaison Mac ↔ Téléphone) */}
        {onOpenCompanionPairing && (
          <button
            onClick={onOpenCompanionPairing}
            title="No[co]de Companion : Association QR code & capteurs téléphone (Gyroscopes, Faders, Pinceau)"
            className="px-2.5 py-1 text-xs font-medium text-emerald-300 hover:text-emerald-100 bg-zinc-900 hover:bg-zinc-850 border border-emerald-800/60 rounded transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Companion</span>
            {isCompanionConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        )}

        {/* PRIORITÉ ARTISTIQUE : Bruitage Vivant & La Mer qui Vibre (Didascalies p. 35) */}
        {onOpenLiveFoley && (
          <button
            onClick={onOpenLiveFoley}
            title="Bruitage Vivant & La Mer qui Vibre : Interaction acoustique directe (Tambour d'océan, Flûte Crunch, Tôle à tonnerre)"
            className="px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:text-white bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 border border-cyan-600/70 rounded transition-all whitespace-nowrap flex items-center gap-1.5 shadow-md shadow-cyan-950/50"
          >
            <Waves className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">Bruitage & Mer</span>
          </button>
        )}

        {/* Ableton Live & Patchs Audio Modulaires */}
        {onOpenAbletonLive && (
          <button
            onClick={onOpenAbletonLive}
            title="Ableton Live : Ableton maître sonore, Web MIDI, Link, analyse FFT et patchs audio"
            className="px-2.5 py-1 text-xs font-semibold text-amber-300 hover:text-amber-100 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/70 rounded transition-all whitespace-nowrap flex items-center gap-1.5 shadow-sm"
          >
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Ableton Live</span>
          </button>
        )}

        {/* Personnalisation Couleurs & Thème */}
        {onOpenThemeCustomizer && (
          <button
            onClick={onOpenThemeCustomizer}
            title="Personnalisation des couleurs, blocs, connexions et thème No[co]de"
            className="p-1.5 text-zinc-400 hover:text-purple-300 hover:bg-zinc-900 rounded transition-colors"
          >
            <Palette className="w-4 h-4 text-purple-400" />
          </button>
        )}

        {/* Domaine Optionnel : Scénographie Vivante (PIRATES PAILLETTES ! V2.1.26) */}
        {onOpenLivingScenography && (
          <button
            onClick={onOpenLivingScenography}
            title="Ouvrir le domaine Scénographie Vivante — Pirates Paillettes ! V2.1.26 (Conduite, Shaders, Bruitages, Anaglyphe)"
            className="px-2.5 py-1 text-xs font-semibold text-amber-200 hover:text-white bg-gradient-to-r from-amber-950/80 to-purple-950/80 hover:from-amber-900 hover:to-purple-900 border border-amber-600/70 rounded transition-all whitespace-nowrap flex items-center gap-1.5 shadow-md shadow-amber-950/50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Scénographie Vivante</span>
            <span className="text-[10px] font-mono text-amber-400 font-bold px-1 rounded bg-amber-500/20">V2.1</span>
          </button>
        )}

        {/* Le Scénographe — Ombres Vivantes & Objets Animables (L'Ombre du Pirate) */}
        {onOpenScenography && (
          <button
            onClick={onOpenScenography}
            title="Le Scénographe : Ombres Vivantes, Découpage de Comédien & Objets Animables"
            className="px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 bg-zinc-900 hover:bg-zinc-850 border border-amber-800/70 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm shadow-amber-950/40"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Le Scénographe</span>
          </button>
        )}

        {/* Interop Spectacle Vivant (TouchDesigner, Max/MSP, PureData, SuperCollider, Millumin, Chataigne) */}
        <button
          onClick={onOpenInterop}
          title="Passerelles Spectacle Vivant (TouchDesigner, Max/MSP, Pure Data, SuperCollider, Millumin, Chataigne)"
          className="px-2.5 py-1 text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-zinc-900 hover:bg-zinc-850 border border-cyan-800/60 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm shadow-cyan-950/40"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">Passerelles Régie</span>
        </button>

        {/* Audit Offline / Spectacle Vivant */}
        <button
          onClick={onOpenAudit}
          title="Audit de Déploiement Hors-Ligne & Spectacle Vivant (Electron, Android, PWA, LAN)"
          className="px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-zinc-900 hover:bg-zinc-850 border border-emerald-900/60 rounded transition-colors whitespace-nowrap flex items-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Audit Hors-Ligne</span>
        </button>

        {/* Saved Scenes Gallery */}
        <button
          onClick={onOpenSavedScenes}
          title="Bibliothèque de Scènes & Exportations Vibe Designer"
          className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded transition-colors whitespace-nowrap flex items-center gap-1.5"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Scènes</span>
        </button>

        {/* Architecture Doc */}
        <button
          onClick={onOpenDoc}
          title="Architecture technique Vibe Designer"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
