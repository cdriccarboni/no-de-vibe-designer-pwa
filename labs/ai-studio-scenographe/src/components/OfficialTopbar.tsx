import React, { useState, useEffect } from 'react';
import {
  Radio,
  Sliders,
  Smartphone,
  Music,
  Waves,
  Palette,
  Wifi,
  WifiOff,
  Sparkles,
  Bot,
  Layers,
  HelpCircle,
  ExternalLink,
  Volume2,
  Play,
  Square,
  ShieldCheck,
  ChevronDown,
  Type,
  Download
} from 'lucide-react';
import { radioAudioEngine, RadioTelemetry } from '../services/radioAudioEngine';
import { companionBridge, CompanionState } from '../services/companionBridge';
import { localAiEngine, AiMode } from '../services/localAiEngine';
import { midiDeviceEngine } from '../services/midiDeviceEngine';

interface OfficialTopbarProps {
  onOpenRadioStudio: () => void;
  onOpenMappingStudio: () => void;
  onOpenCompanionModal: () => void;
  onOpenLiveFoleyModal: () => void;
  onOpenAbletonModal: () => void;
  onOpenMidiHub?: () => void;
  onOpenSurtitrage: () => void;
  onOpenInstallPage?: () => void;
  onOpenThemeModal: () => void;
  onOpenDocModal: () => void;
  onOpenAuditModal: () => void;
  activeWorkspaceMode: 'bureau' | 'plateau';
  onWorkspaceModeChange: (mode: 'bureau' | 'plateau') => void;
}

export const OfficialTopbar: React.FC<OfficialTopbarProps> = ({
  onOpenRadioStudio,
  onOpenMappingStudio,
  onOpenCompanionModal,
  onOpenLiveFoleyModal,
  onOpenAbletonModal,
  onOpenMidiHub,
  onOpenSurtitrage,
  onOpenInstallPage,
  onOpenThemeModal,
  onOpenDocModal,
  onOpenAuditModal,
  activeWorkspaceMode,
  onWorkspaceModeChange,
}) => {
  const [radioTelemetry, setRadioTelemetry] = useState<RadioTelemetry>(radioAudioEngine.getTelemetrySnapshot());
  const [audioRms, setAudioRms] = useState<number>(0);
  const [companionState, setCompanionState] = useState<CompanionState>(companionBridge.getState());
  const [aiMode, setAiMode] = useState<AiMode>(localAiEngine.getMode());
  const [midiDeviceCount, setMidiDeviceCount] = useState<number>(midiDeviceEngine.getConnectedInputsCount());
  const [midiMappingsCount, setMidiMappingsCount] = useState<number>(midiDeviceEngine.getMappings().length);
  const [pnpOpen, setPnpOpen] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);

  useEffect(() => {
    const unsubRadio = radioAudioEngine.onTelemetry((t) => setRadioTelemetry(t));
    const unsubLevels = radioAudioEngine.onLevels((l) => setAudioRms(l.leftPeak));
    const unsubComp = companionBridge.subscribe((s) => setCompanionState(s));
    const unsubAi = localAiEngine.subscribe(() => setAiMode(localAiEngine.getMode()));
    const unsubMidi = midiDeviceEngine.subscribe(() => {
      setMidiDeviceCount(midiDeviceEngine.getConnectedInputsCount());
      setMidiMappingsCount(midiDeviceEngine.getMappings().length);
    });
    return () => {
      unsubRadio();
      unsubLevels();
      unsubComp();
      unsubAi();
      unsubMidi();
    };
  }, []);

  const handleQuickTestRadio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (radioTelemetry.state === 'testing') {
      await radioAudioEngine.stop();
    } else {
      radioAudioEngine.setDestination('radio-paillettes');
      await radioAudioEngine.startTest();
    }
  };

  const handleQuickOnAirRadio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (radioTelemetry.state === 'on_air') {
      await radioAudioEngine.stop();
    } else {
      radioAudioEngine.setDestination('radio-paillettes');
      await radioAudioEngine.startOnAir();
    }
  };

  const handleQuickStopRadio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await radioAudioEngine.stop();
  };

  return (
    <header className="h-[50px] bg-[#171a1e] border-b border-[#2d333b] px-3 flex items-center justify-between gap-3 text-xs select-none sticky top-0 z-40">
      {/* Zone 1: Brand & Logo Officiel */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="flex items-center gap-2.5 text-zinc-100 hover:text-white transition-colors">
          <div className="w-8 h-8 rounded-lg bg-[#090b0d] border border-[#454d57] p-1 flex items-center justify-center shrink-0 shadow-md">
            <img src="/nocode-rings.svg" alt="No[co]de Rings" className="w-full h-full object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[13px] tracking-tight text-white flex items-center gap-0.5">
              <span>No</span>
              <span className="text-[#d7b86a] font-black">[co]</span>
              <span>de Vibe Designer</span>
            </div>
            <div className="text-[9px] text-[#9ba4ae] tracking-widest font-mono uppercase">
              VIBE · PATCH · STAGE
            </div>
          </div>
        </a>

        <span className="text-[9px] font-mono border border-[#2d333b] bg-[#1d2126] text-[#9ba4ae] px-2 py-0.5 rounded-full">
          v3.3.9
        </span>

        {/* P&P Auto Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPnpOpen(!pnpOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#8fa79d] text-[#8fa79d] font-semibold text-[10px] transition-all"
            title="Plug & Play · Détection automatique des surfaces, MIDI & capteurs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#8fa79d] animate-pulse"></span>
            <span>P&P · AUTO</span>
            <ChevronDown className="w-3 h-3 text-[#9ba4ae]" />
          </button>

          {pnpOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#171a1e] border border-[#454d57] rounded-lg shadow-2xl p-2 z-50 text-[11px] flex flex-col gap-1">
              <button
                onClick={() => { setPnpOpen(false); companionBridge.scanLocalLAN(); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#1d2126] text-zinc-200"
              >
                ↻ Détecter à nouveau les appareils
              </button>
              <button
                onClick={() => { setPnpOpen(false); if (onOpenMidiHub) onOpenMidiHub(); else onOpenAbletonModal(); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#1d2126] text-zinc-200 flex items-center justify-between"
              >
                <span>MIDI Hub Plug & Play & Learn</span>
                <span className="text-[9px] text-[#d7b86a] font-mono">{midiDeviceCount} entrée(s)</span>
              </button>
              <button
                onClick={() => { setPnpOpen(false); onOpenAbletonModal(); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#1d2126] text-zinc-200 flex items-center justify-between"
              >
                <span>Ableton Live & Ableton Link</span>
                <span className="text-[9px] text-[#8fa79d]">Sync Tempo</span>
              </button>
              <button
                onClick={() => { setPnpOpen(false); onOpenCompanionModal(); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#1d2126] text-zinc-200 flex items-center justify-between"
              >
                <span>Téléphone Companion</span>
                <span className="text-[9px] text-[#d7b86a]">PIN 7392</span>
              </button>
              <div className="border-t border-[#2d333b] pt-1 mt-1 text-[9px] text-[#9ba4ae] px-1">
                Les périphériques autorisés se reconnectent automatiquement.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone 2: ACTIONS PRIORITAIRES P00 & P0 DIRECTEMENT ACCESSIBLES */}
      <div className="hidden md:flex items-center gap-2">
        {/* ========================================================= */}
        {/* P00 : BROADCAST RADIO DIRECT (ON AIR ROUGE VIF CLIGNOTANT) */}
        {/* ========================================================= */}
        <div
          onClick={onOpenRadioStudio}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all cursor-pointer shadow-sm ${
            radioTelemetry.state === 'on_air'
              ? 'bg-red-950/70 border-red-500 text-red-200 ring-1 ring-red-500/50 animate-pulse'
              : radioTelemetry.state === 'testing'
              ? 'bg-amber-950/70 border-amber-500 text-amber-200 ring-1 ring-amber-500/40'
              : 'bg-[#1d2126] border-[#2d333b] hover:border-zinc-500 text-[#9ba4ae]'
          }`}
          title="Studio Broadcast Radio (P00) — Cliquer pour ouvrir le studio de mixage complet"
        >
          <Radio className={`w-3.5 h-3.5 ${
            radioTelemetry.state === 'on_air' ? 'text-red-400 animate-spin' : radioTelemetry.state === 'testing' ? 'text-amber-400' : 'text-[#9ba4ae]'
          }`} />

          <div className="flex items-center gap-1">
            <span className="font-bold text-[10px]">RADIO</span>
            <span className="text-[10px] text-zinc-400 font-mono">/radio-paillettes</span>
          </div>

          {/* Bouton TEST ambre */}
          <button
            type="button"
            onClick={handleQuickTestRadio}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
              radioTelemetry.state === 'testing'
                ? 'bg-amber-500 text-black shadow'
                : 'bg-zinc-800 text-amber-300 hover:bg-amber-500/30'
            }`}
            title="Tester la diffusion audio en boucle fermée"
          >
            TEST
          </button>

          {/* Bouton ON AIR rouge officiel */}
          <button
            type="button"
            onClick={handleQuickOnAirRadio}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${
              radioTelemetry.state === 'on_air'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse'
                : 'bg-zinc-800 text-red-400 hover:bg-red-600 hover:text-white'
            }`}
            title="Diffuser en direct publiquement sur la page web"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${radioTelemetry.state === 'on_air' ? 'bg-white' : 'bg-red-500'}`} />
            ON AIR
          </button>

          {/* Bouton STOP */}
          {(radioTelemetry.state === 'on_air' || radioTelemetry.state === 'testing') && (
            <button
              type="button"
              onClick={handleQuickStopRadio}
              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300 hover:bg-red-900 hover:text-white"
              title="Arrêter la diffusion"
            >
              STOP
            </button>
          )}

          {/* VU Meter rapide */}
          <div className="w-10 h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 flex items-center px-0.5">
            <div
              className={`h-1 rounded-full transition-all duration-75 ${
                radioTelemetry.state === 'on_air' ? 'bg-red-500' : 'bg-[#8fa79d]'
              }`}
              style={{ width: `${Math.min(100, Math.max(8, audioRms * 100))}%` }}
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* P0 : AUTO-MAPPING 3 SECONDES & COMPANION PHONE */}
        {/* ========================================================= */}
        <button
          type="button"
          onClick={onOpenMappingStudio}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1d2126] border border-[#2d333b] hover:border-[#8fa79d] text-zinc-200 transition-all font-semibold"
          title="Auto-Mapping 3 Secondes & Pinceau Magique pour objets physiques (Vases, décors)"
        >
          <Layers className="w-3.5 h-3.5 text-[#8fa79d]" />
          <span>Auto-Mapping 3s</span>
        </button>

        <button
          type="button"
          onClick={onOpenCompanionModal}
          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-all ${
            companionState.isPaired
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
              : 'bg-[#1d2126] border-[#2d333b] hover:border-zinc-500 text-[#9ba4ae]'
          }`}
          title="Connexion Companion Téléphone (Scanne QR code ou entre PIN 7392)"
        >
          <Smartphone className={`w-3.5 h-3.5 ${companionState.isPaired ? 'text-emerald-400' : 'text-[#9ba4ae]'}`} />
          <span>{companionState.isPaired ? 'Companion Connecté' : 'Companion PIN 7392'}</span>
        </button>

        {/* MIDI Hub Plug & Play & Learn */}
        <button
          type="button"
          onClick={onOpenMidiHub || onOpenAbletonModal}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-300 hover:text-white transition-all text-[11px]"
          title="MIDI Hub Plug & Play & MIDI Learn (1-clic pour associer n'importe quel bouton)"
        >
          <Sliders className="w-3.5 h-3.5 text-[#d7b86a]" />
          <span>MIDI {midiDeviceCount > 0 ? `(${midiDeviceCount})` : 'P&P'}</span>
        </button>

        {/* Ableton Live & Web MIDI */}
        <button
          type="button"
          onClick={onOpenAbletonModal}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-zinc-300 transition-all text-[11px]"
          title="Passerelle Ableton Live, Ableton Link & Web MIDI"
        >
          <Music className="w-3.5 h-3.5 text-[#d7b86a]" />
          <span>Ableton Link</span>
        </button>

        {/* Bruitage Vivant & Foley Pirates Paillettes */}
        <button
          type="button"
          onClick={onOpenLiveFoleyModal}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1d2126] border border-[#2d333b] hover:border-cyan-400 text-zinc-300 transition-all text-[11px]"
          title="Bruitage Vivant Pirates Paillettes (Micro scène, détection de TOPs)"
        >
          <Waves className="w-3.5 h-3.5 text-cyan-400" />
          <span>Bruitage Vivant</span>
        </button>

        {/* Surtitrage Professionnel & Karaoké (Inspiré de Glypheo) */}
        <button
          type="button"
          onClick={onOpenSurtitrage}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1d2126] border border-[#2d333b] hover:border-[#8fa79d] text-zinc-300 transition-all text-[11px]"
          title="Module Natif Surtitrage Professionnel & Karaoké (Inspiré de Glypheo)"
        >
          <Type className="w-3.5 h-3.5 text-[#8fa79d]" />
          <span>Surtitres Pro</span>
        </button>
      </div>

      {/* Zone 3: SÉLECTEUR DE MODE IA, THÈME & WORKSPACE */}
      <div className="flex items-center gap-2 shrink-0">
        {/* IA LIBRE ET LOCALE SÉLECTEUR */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setAiMenuOpen(!aiMenuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-[10px] font-mono text-zinc-200"
            title="Mode IA : Choix du moteur libre, local ou sans IA"
          >
            <Bot className="w-3 h-3 text-[#d7b86a]" />
            <span className="uppercase font-bold">
              {aiMode === 'auto' ? 'IA AUTO' : aiMode === 'local' ? 'IA LOCALE (Ollama)' : aiMode === 'connected' ? 'IA CONNECTÉE' : 'SANS IA'}
            </span>
            <ChevronDown className="w-2.5 h-2.5 text-[#9ba4ae]" />
          </button>

          {aiMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#171a1e] border border-[#454d57] rounded-lg shadow-2xl p-2 z-50 text-[11px] flex flex-col gap-1">
              <div className="text-[9px] uppercase tracking-wider text-[#9ba4ae] px-1 mb-1 font-semibold">
                Intelligence Artificielle Libre
              </div>
              <button
                onClick={() => { localAiEngine.setMode('auto'); setAiMenuOpen(false); }}
                className={`w-full text-left px-2 py-1 rounded text-zinc-200 flex items-center justify-between ${aiMode === 'auto' ? 'bg-[#1d2126] text-[#d7b86a] font-bold' : 'hover:bg-[#1d2126]'}`}
              >
                <span>AUTO</span>
                <span className="text-[9px] text-[#9ba4ae]">Meilleur moteur</span>
              </button>
              <button
                onClick={() => { localAiEngine.setMode('local'); setAiMenuOpen(false); }}
                className={`w-full text-left px-2 py-1 rounded text-zinc-200 flex items-center justify-between ${aiMode === 'local' ? 'bg-[#1d2126] text-[#8fa79d] font-bold' : 'hover:bg-[#1d2126]'}`}
              >
                <span>LOCAL (Sans Internet)</span>
                <span className="text-[9px] text-[#8fa79d]">Ollama / Mac 16Go</span>
              </button>
              <button
                onClick={() => { localAiEngine.setMode('sans_ia'); setAiMenuOpen(false); }}
                className={`w-full text-left px-2 py-1 rounded text-zinc-200 flex items-center justify-between ${aiMode === 'sans_ia' ? 'bg-[#1d2126] text-cyan-400 font-bold' : 'hover:bg-[#1d2126]'}`}
              >
                <span>SANS IA (Procédural)</span>
                <span className="text-[9px] text-cyan-400">100% Manuel</span>
              </button>
              <div className="border-t border-[#2d333b] pt-1 mt-1 text-[9px] text-[#9ba4ae] px-1">
                Aucune clé API requise pour créer.
              </div>
            </div>
          )}
        </div>

        {/* Bouton Thème & Palettes */}
        <button
          type="button"
          onClick={onOpenThemeModal}
          className="p-1.5 rounded bg-[#1d2126] border border-[#2d333b] hover:border-[#d7b86a] text-[#9ba4ae] hover:text-[#d7b86a] transition-all"
          title="Personnaliser les couleurs et palettes de l'interface"
        >
          <Palette className="w-3.5 h-3.5" />
        </button>

        {/* Bouton Installer / 2e Ordi */}
        {onOpenInstallPage && (
          <button
            type="button"
            onClick={onOpenInstallPage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1d2126] border border-[#d7b86a] hover:bg-[#d7b86a] hover:text-black text-[#d7b86a] font-bold text-[11px] transition-all"
            title="Installer No[co]de sur un 2e ordinateur ou smartphone"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Installer / 2e Ordi</span>
          </button>
        )}

        {/* Workspace Mode : Bureau / Plateau */}
        <div className="flex border border-[#2d333b] rounded-lg overflow-hidden bg-[#1d2126]">
          <button
            type="button"
            onClick={() => onWorkspaceModeChange('bureau')}
            className={`px-2.5 py-1 text-[11px] font-medium transition-all ${
              activeWorkspaceMode === 'bureau'
                ? 'bg-[#2d333b] text-white font-semibold'
                : 'text-[#9ba4ae] hover:text-white'
            }`}
          >
            Bureau
          </button>
          <button
            type="button"
            onClick={() => onWorkspaceModeChange('plateau')}
            className={`px-2.5 py-1 text-[11px] font-medium transition-all ${
              activeWorkspaceMode === 'plateau'
                ? 'bg-[#2d333b] text-white font-semibold'
                : 'text-[#9ba4ae] hover:text-white'
            }`}
          >
            Plateau
          </button>
        </div>

        {/* Aide & Documentation */}
        <button
          type="button"
          onClick={onOpenDocModal}
          className="p-1.5 rounded bg-[#1d2126] border border-[#2d333b] hover:border-zinc-500 text-[#9ba4ae] hover:text-white transition-all"
          title="Documentation & Architecture No[co]de Vibe Designer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
