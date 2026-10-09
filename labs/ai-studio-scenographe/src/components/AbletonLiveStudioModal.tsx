import React, { useState, useEffect } from 'react';
import {
  abletonLiveBridge,
  AbletonLinkState,
  AudioFrequencyBands,
  SoundRoutingRule,
  ModularAudioBlock,
} from '../services/abletonLiveBridge';
import {
  Music,
  X,
  Play,
  Pause,
  Sliders,
  Activity,
  Layers,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Radio,
  RefreshCw,
  Waves,
  Disc,
} from 'lucide-react';

interface AbletonLiveStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLiveFoley?: () => void;
}

export const AbletonLiveStudioModal: React.FC<AbletonLiveStudioModalProps> = ({
  isOpen,
  onClose,
  onOpenLiveFoley,
}) => {
  const [linkState, setLinkState] = useState<AbletonLinkState>(() => abletonLiveBridge.getLinkState());
  const [midiPorts, setMidiPorts] = useState(() => abletonLiveBridge.getMidiPorts());
  const [lastMidi, setLastMidi] = useState(() => abletonLiveBridge.getLastMidiEvent());
  const [fftBands, setFftBands] = useState<AudioFrequencyBands>(() => abletonLiveBridge.getFrequencyBands());
  const [audioDevices, setAudioDevices] = useState(() => abletonLiveBridge.getAudioDevices());
  const [selectedDevice, setSelectedDevice] = useState(() => abletonLiveBridge.getSelectedAudioDeviceId());
  const [routingRules, setRoutingRules] = useState<SoundRoutingRule[]>(() => abletonLiveBridge.getRoutingRules());
  const [modularBlocks, setModularBlocks] = useState<ModularAudioBlock[]>(() => abletonLiveBridge.getModularBlocks());
  const [profile, setProfile] = useState(() => abletonLiveBridge.getProfile());
  const [isAudioInActive, setIsAudioInActive] = useState(false);

  // Sync loop
  useEffect(() => {
    if (!isOpen) return;

    const unsub = abletonLiveBridge.subscribe(() => {
      setLinkState(abletonLiveBridge.getLinkState());
      setMidiPorts(abletonLiveBridge.getMidiPorts());
      setLastMidi(abletonLiveBridge.getLastMidiEvent());
      setRoutingRules(abletonLiveBridge.getRoutingRules());
      setProfile(abletonLiveBridge.getProfile());
      setAudioDevices(abletonLiveBridge.getAudioDevices());
    });

    return unsub;
  }, [isOpen]);

  // Telemetry loop for FFT
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setFftBands(abletonLiveBridge.getFrequencyBands());
      setLinkState(abletonLiveBridge.getLinkState());
    }, 40);
    return () => clearInterval(interval);
  }, [isOpen]);

  const toggleAudioIn = async () => {
    if (isAudioInActive) {
      abletonLiveBridge.stopAudioIn();
      setIsAudioInActive(false);
    } else {
      await abletonLiveBridge.startAudioIn();
      setIsAudioInActive(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 lg:p-6 select-none overflow-y-auto">
      <div className="w-full max-w-6xl bg-[#0e1115] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-[#12161c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Passerelle Ableton Live & Patchs Audio Modulaires
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                  Ableton Maître Sonore
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Link & Web MIDI
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Vos compositions guident l'image • Aucun son imposé • Analyse FFT 7 bandes & interactions scéniques
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar : Ableton Link Clock */}
        <div className="px-6 py-2.5 bg-[#101318] border-b border-zinc-850 flex flex-wrap items-center justify-between gap-4 text-xs font-mono shrink-0">
          {/* Ableton Link Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => abletonLiveBridge.toggleLinkPlay()}
                className={`p-1.5 rounded-lg border transition-colors ${
                  linkState.isPlaying
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
                title={linkState.isPlaying ? 'Arrêter l’horloge Link' : 'Démarrer l’horloge Link'}
              >
                {linkState.isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span>Ableton Link :</span>
                <span className="text-cyan-400">{linkState.bpm.toFixed(1)} BPM</span>
              </div>
            </div>

            {/* Beat phase indicator (Quantum 4 beats) */}
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((b) => {
                const currentBeat = Math.floor(linkState.beat) % 4;
                const isCurrent = linkState.isPlaying && currentBeat === b;
                return (
                  <div
                    key={b}
                    className={`w-2.5 h-2.5 rounded-full border transition-all ${
                      isCurrent
                        ? 'bg-amber-400 border-amber-300 shadow-md shadow-amber-500/50 scale-110'
                        : 'bg-zinc-800 border-zinc-700'
                    }`}
                  />
                );
              })}
            </div>

            <span className="text-zinc-500 text-[10px]">
              {linkState.peersCount} pairs détectés sur le Mac
            </span>
          </div>

          {/* Audio In Toggle */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDevice}
              onChange={(e) => {
                setSelectedDevice(e.target.value);
                abletonLiveBridge.selectAudioInputDevice(e.target.value);
              }}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-300 focus:outline-none"
            >
              <option value="default">Entrée Audio Standard / Carte Son</option>
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Entrée ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>

            <button
              onClick={toggleAudioIn}
              className={`px-3 py-1 rounded text-[11px] font-sans font-semibold transition-colors flex items-center gap-1.5 ${
                isAudioInActive
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isAudioInActive ? 'Écoute Ableton Active' : 'Activer Entrée Audio'}</span>
            </button>
          </div>
        </div>

        {/* Studio Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column (6 cols) : Spectre FFT 7 bandes & MIDI Live */}
          <div className="lg:col-span-6 bg-[#0a0d12] p-5 space-y-5 border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-y-auto">
            {/* 1. Spectre Audio 7 Bandes (BlackHole / Loopback) */}
            <div className="bg-[#12161c] p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white font-mono uppercase">
                  Analyse Spectrale FFT 7 Bandes (Flux Ableton)
                </span>
                {fftBands.isTransientHit && (
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 text-[10px] font-mono font-bold animate-ping">
                    TRANSIENT HIT
                  </span>
                )}
              </div>

              {/* 7 Band Graphic Equalizer Visualizer */}
              <div className="grid grid-cols-7 gap-2 h-28 items-end p-2 bg-[#090b0e] rounded-lg border border-zinc-850">
                {[
                  { label: 'Sub', val: fftBands.subBass, color: 'from-purple-600 to-indigo-500' },
                  { label: 'Bass', val: fftBands.bass, color: 'from-indigo-600 to-cyan-500' },
                  { label: 'L-Mid', val: fftBands.lowMid, color: 'from-cyan-600 to-teal-500' },
                  { label: 'Mid', val: fftBands.mid, color: 'from-teal-600 to-emerald-500' },
                  { label: 'H-Mid', val: fftBands.highMid, color: 'from-emerald-600 to-amber-500' },
                  { label: 'Pres', val: fftBands.presence, color: 'from-amber-600 to-orange-500' },
                  { label: 'Brill', val: fftBands.brilliance, color: 'from-orange-600 to-rose-500' },
                ].map((b) => (
                  <div key={b.label} className="h-full flex flex-col justify-end items-center gap-1">
                    <div className="w-full flex-1 bg-zinc-900 rounded-t overflow-hidden flex flex-col justify-end p-0.5">
                      <div
                        className={`w-full rounded-t bg-gradient-to-t ${b.color} transition-all duration-75`}
                        style={{ height: `${Math.min(100, b.val * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Web MIDI Ports & Last Received Message */}
            <div className="bg-[#12161c] p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white font-mono uppercase">
                  Contrôles MIDI Entrants (Ableton IAC / Clavier)
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {midiPorts.inputs.length} port(s) détecté(s)
                </span>
              </div>

              {lastMidi ? (
                <div className="p-3 bg-[#090b0e] rounded-lg border border-zinc-850 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="text-zinc-300">
                      Type : <strong className="text-white">{lastMidi.type}</strong> • Ch {lastMidi.channel}
                    </span>
                  </div>
                  <div>
                    {lastMidi.type === 'CC' ? `CC #${lastMidi.noteOrCC}` : `Note ${lastMidi.noteOrCC}`} :{' '}
                    <strong className="text-cyan-400">{lastMidi.value}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#090b0e] rounded-lg border border-zinc-850 text-xs font-mono text-zinc-500 text-center">
                  En attente de messages MIDI d’Ableton Live...
                </div>
              )}
            </div>

            {/* 3. Modules de Patch Audio (Max/MSP & Pure Data) */}
            <div className="bg-[#12161c] p-4 rounded-xl border border-zinc-800 space-y-3">
              <span className="text-xs font-semibold text-white font-mono uppercase">
                Sous-Patchs Audio Personnalisables (Esprit Max/MSP)
              </span>

              <div className="space-y-2">
                {modularBlocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="p-3 rounded-lg bg-[#090b0e] border border-zinc-850 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-zinc-200">{blk.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {Object.entries(blk.params)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' • ')}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Actif
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (6 cols) : Matrice de Routing Son ➔ Image */}
          <div className="lg:col-span-6 bg-[#0e1116] p-5 space-y-5 overflow-y-auto">
            {/* Profil Utilisateur Artistique */}
            <div className="bg-[#12161c] p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 uppercase font-mono">
                  Préférences de Création Artistique
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Profil Utilisateur</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => abletonLiveBridge.setProfile('ableton_composer')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    profile === 'ableton_composer'
                      ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Disc className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ableton Compositeur</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug">
                    Ableton crée tous les sons. Zéro composition automatique imposée. No[co]de se concentre sur l’interactivité.
                  </div>
                </button>

                <button
                  onClick={() => abletonLiveBridge.setProfile('all_in_one_scenographer')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    profile === 'all_in_one_scenographer'
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scénographe Intégré</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug">
                    Synthèse générative No[co]de active pour les artistes sans logiciel externe.
                  </div>
                </button>
              </div>
            </div>

            {/* Matrice de Routing Son ➔ Visuel */}
            <div className="bg-[#12161c] p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white font-mono uppercase">
                  Matrice de Pilotage : Ableton ➔ Scénographie
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {routingRules.filter((r) => r.isEnabled).length} règles actives
                </span>
              </div>

              <div className="space-y-2.5">
                {routingRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-lg bg-[#090b0e] border border-zinc-850 flex items-center justify-between text-xs space-y-1"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300 font-mono">{rule.sourceParam}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-500" />
                        <span className="font-bold text-amber-300 font-mono">
                          {rule.targetEffect} ({rule.targetParam})
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Plage : [{rule.minInput}..{rule.maxInput}] ➔ [{rule.minOutput}..{rule.maxOutput}]
                      </div>
                    </div>

                    <button
                      onClick={() => abletonLiveBridge.toggleRule(rule.id)}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                        rule.isEnabled
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {rule.isEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action directe : La Mer qui Vibre */}
            {onOpenLiveFoley && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-700/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>Vérifier l’Effet « La Mer qui Vibre »</span>
                  </div>
                  <div className="text-[11px] text-cyan-300/80">
                    Testez la réaction de la houle marine pilotée par vos sons Ableton
                  </div>
                </div>

                <button
                  onClick={onOpenLiveFoley}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors shrink-0"
                >
                  Ouvrir la Mer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#12161c] border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Aucune modification imposée à vos projets Ableton • 100% Hors-Ligne</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Fermer le studio
          </button>
        </div>
      </div>
    </div>
  );
};
