import React, { useState, useEffect, useRef } from 'react';
import {
  radioAudioEngine,
  AudioSourceType,
  RadioBroadcastState,
  RadioLevels,
  RadioTelemetry,
  RadioMixSettings,
  RadioAuthorizedProfile,
} from '../services/radioAudioEngine';
import {
  Radio,
  X,
  Mic,
  Music,
  Sliders,
  Play,
  Square,
  Volume2,
  VolumeX,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Sparkles,
  Disc,
} from 'lucide-react';

interface RadioBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStandalonePlayer?: (slug: string) => void;
}

export const RadioBroadcastModal: React.FC<RadioBroadcastModalProps> = ({
  isOpen,
  onClose,
  onOpenStandalonePlayer,
}) => {
  const [telemetry, setTelemetry] = useState<RadioTelemetry>(() => radioAudioEngine.getTelemetrySnapshot());
  const [levels, setLevels] = useState<RadioLevels>({
    leftPeak: 0,
    rightPeak: 0,
    rmsDb: -60,
    peakDb: -60,
    isClipping: false,
  });

  const [activeSource, setActiveSource] = useState<AudioSourceType>('test_tone');
  const [destinationSlug, setDestinationSlug] = useState('radio-paillettes');
  const [destinationName, setDestinationName] = useState('Radio Paillettes en grève');
  const [destinationStatus, setDestinationStatus] = useState<{ exists: boolean; isLive: boolean; error?: string }>({
    exists: true,
    isLive: false,
  });

  const [mix, setMix] = useState<RadioMixSettings>(() => radioAudioEngine.getMixSettings());
  const [isCopied, setIsCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [localMonitorAudioPlaying, setLocalMonitorAudioPlaying] = useState(false);
  const localMonitorRef = useRef<HTMLAudioElement | null>(null);

  // Saved access profiles
  const [savedProfiles, setSavedProfiles] = useState<RadioAuthorizedProfile[]>(() => {
    try {
      const stored = localStorage.getItem('nocode_radio_profiles');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [
      { id: '1', name: 'Radio Paillettes en grève', slug: 'radio-paillettes', lastUsed: Date.now() },
      { id: '2', name: 'Radio Pirate des Caraïbes', slug: 'radio-pirate', lastUsed: Date.now() - 3600000 },
      { id: '3', name: 'Radio Régie Directe', slug: 'radio', lastUsed: Date.now() - 7200000 },
    ];
  });

  // Subscribe to radio engine events
  useEffect(() => {
    if (!isOpen) return;

    const unsubTele = radioAudioEngine.onTelemetry((t) => {
      setTelemetry(t);
    });

    const unsubLev = radioAudioEngine.onLevels((l) => {
      setLevels(l);
    });

    return () => {
      unsubTele();
      unsubLev();
    };
  }, [isOpen]);

  // Check destination availability
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const check = async () => {
      const res = await radioAudioEngine.checkDestinationAvailability(destinationSlug);
      if (isMounted) {
        setDestinationStatus({
          exists: res.exists,
          isLive: res.isLive,
          error: res.error,
        });
      }
    };

    check();
    const interval = setInterval(check, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [destinationSlug, isOpen]);

  // Handle source switch
  const handleSelectSource = async (source: AudioSourceType) => {
    setActiveSource(source);
    try {
      await radioAudioEngine.setSource(source);
    } catch (err) {
      console.error('Failed to change source:', err);
    }
  };

  // Handle destination change
  const handleSelectDestination = (slug: string, name?: string) => {
    setDestinationSlug(slug);
    if (name) setDestinationName(name);
    radioAudioEngine.setDestination(slug, name);
  };

  // Mix adjustments
  const handleMixChange = (key: keyof RadioMixSettings, val: number) => {
    const updated = { ...mix, [key]: val };
    setMix(updated);
    radioAudioEngine.updateMixSettings({ [key]: val });
  };

  // Broadcast Actions
  const handleStartTest = async () => {
    try {
      await radioAudioEngine.startTest();
    } catch (err) {
      console.error('Test error:', err);
    }
  };

  const handleStartOnAir = async () => {
    try {
      await radioAudioEngine.startOnAir();
      // Save profile in list if new
      saveCurrentProfile();
    } catch (err) {
      console.error('ON AIR error:', err);
    }
  };

  const handleStop = async () => {
    await radioAudioEngine.stop();
    if (localMonitorRef.current) {
      localMonitorRef.current.pause();
      setLocalMonitorAudioPlaying(false);
    }
  };

  const saveCurrentProfile = () => {
    const existing = savedProfiles.find((p) => p.slug === destinationSlug);
    let updated: RadioAuthorizedProfile[];
    if (existing) {
      updated = savedProfiles.map((p) =>
        p.slug === destinationSlug ? { ...p, name: destinationName, lastUsed: Date.now() } : p
      );
    } else {
      updated = [
        {
          id: `prof-${Date.now()}`,
          name: destinationName,
          slug: destinationSlug,
          lastUsed: Date.now(),
        },
        ...savedProfiles,
      ];
    }
    setSavedProfiles(updated);
    try {
      localStorage.setItem('nocode_radio_profiles', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Share / Copy link
  const publicUrl = `${window.location.origin}/${destinationSlug}`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Toggle local live audio listener
  const toggleLocalMonitorAudio = () => {
    if (!localMonitorRef.current) return;
    if (localMonitorAudioPlaying) {
      localMonitorRef.current.pause();
      setLocalMonitorAudioPlaying(false);
    } else {
      localMonitorRef.current.src = `/api/radio/stream/${destinationSlug}?t=${Date.now()}`;
      localMonitorRef.current
        .play()
        .then(() => setLocalMonitorAudioPlaying(true))
        .catch(() => setLocalMonitorAudioPlaying(false));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 lg:p-6 select-none overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#0e1115] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Hidden monitor audio tag */}
        <audio
          ref={localMonitorRef}
          preload="none"
          onEnded={() => setLocalMonitorAudioPlaying(false)}
        />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#12161c] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                telemetry.state === 'on_air'
                  ? 'bg-rose-950/80 text-rose-400 border border-rose-700 animate-pulse'
                  : telemetry.state === 'testing'
                  ? 'bg-amber-950/80 text-amber-400 border border-amber-700'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white">
                  Studio Broadcast Radio Live
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800">
                  Version 3.3.9 Audio-Safe
                </span>
                {telemetry.state === 'on_air' && (
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-600 animate-pulse flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    DIFFUSION EN DIRECT
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Signal continu : AUDIO IN ➔ MIXAGE ➔ RADIO BUS ➔ RADIO OUT ➔ RELAIS STREAMING ➔ MOBILE
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

        {/* Studio Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Diagnostic & Error Banner */}
          {telemetry.errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{telemetry.errorMessage}</span>
            </div>
          )}

          {/* Grid Layout : Left (Sources & Destination) / Right (Mixer & Meters) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column Left (5 cols) : SOURCE & DESTINATION */}
            <div className="lg:col-span-5 space-y-5">
              {/* 1. SÉLECTION SOURCE AUDIO */}
              <div className="bg-[#13171d] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                    1. Source Audio Régie
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {activeSource}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleSelectSource('mic')}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                      activeSource === 'mic'
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200'
                        : 'bg-[#181d24] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold">Microphone</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">Micro régie ou comédien</span>
                  </button>

                  <button
                    onClick={() => handleSelectSource('scenography_bus')}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                      activeSource === 'scenography_bus'
                        ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                        : 'bg-[#181d24] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold">Scénographie</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">Synthétiseurs & mer pirate</span>
                  </button>

                  <button
                    onClick={() => handleSelectSource('test_tone')}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                      activeSource === 'test_tone'
                        ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                        : 'bg-[#181d24] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold">Mire / Test 440</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">Tonalité d'étalonnage</span>
                  </button>

                  <label
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      activeSource === 'audio_file'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                        : 'bg-[#181d24] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Disc className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold">Fichier Audio</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">Jingle, MP3, WAV</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setActiveSource('audio_file');
                          radioAudioEngine.setSource('audio_file', { audioFile: file });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* 2. PAGE DE DESTINATION ET CHEMIN PERSONNALISÉ */}
              <div className="bg-[#13171d] border border-zinc-800 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                    2. Page & Chemin de Destination
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        destinationStatus.exists ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                    />
                    <span className={destinationStatus.exists ? 'text-emerald-400' : 'text-rose-400'}>
                      {destinationStatus.exists ? 'Relais Prêt' : 'Non configuré'}
                    </span>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    onClick={() => handleSelectDestination('radio-paillettes', 'Radio Paillettes en grève')}
                    className={`px-2.5 py-1 rounded-md font-mono text-[11px] border transition-colors ${
                      destinationSlug === 'radio-paillettes'
                        ? 'bg-rose-950 text-rose-300 border-rose-600'
                        : 'bg-[#181d24] text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    /radio-paillettes
                  </button>

                  <button
                    onClick={() => handleSelectDestination('radio-pirate', 'Radio Pirate des Caraïbes')}
                    className={`px-2.5 py-1 rounded-md font-mono text-[11px] border transition-colors ${
                      destinationSlug === 'radio-pirate'
                        ? 'bg-amber-950 text-amber-300 border-amber-600'
                        : 'bg-[#181d24] text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    /radio-pirate
                  </button>

                  <button
                    onClick={() => handleSelectDestination('radio', 'Radio Live Régie')}
                    className={`px-2.5 py-1 rounded-md font-mono text-[11px] border transition-colors ${
                      destinationSlug === 'radio'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                        : 'bg-[#181d24] text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    /radio
                  </button>
                </div>

                {/* Slug Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400">
                    Chemin personnalisé (tapez n'importe quelle page) :
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-mono text-xs">/</span>
                    <input
                      type="text"
                      value={destinationSlug}
                      onChange={(e) => handleSelectDestination(e.target.value)}
                      placeholder="radio-mon-spectacle"
                      className="flex-1 px-3 py-1.5 text-xs font-mono bg-[#0c0e12] border border-zinc-850 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Nom public affiché */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400">
                    Nom d'antenne officiel :
                  </label>
                  <input
                    type="text"
                    value={destinationName}
                    onChange={(e) => {
                      setDestinationName(e.target.value);
                      radioAudioEngine.setDestination(destinationSlug, e.target.value);
                    }}
                    placeholder="Ex: Radio Direct Paillettes"
                    className="w-full px-3 py-1.5 text-xs bg-[#0c0e12] border border-zinc-850 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* URL Directe & Actions */}
                <div className="p-2.5 bg-[#0a0c0f] border border-zinc-850 rounded-lg flex items-center justify-between text-xs font-mono">
                  <div className="truncate mr-2 text-zinc-300">
                    {publicUrl}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Copier l'adresse de diffusion"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setShowQrModal(!showQrModal)}
                      className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Afficher le QR code pour téléphone"
                    >
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    {onOpenStandalonePlayer && (
                      <button
                        onClick={() => onOpenStandalonePlayer(destinationSlug)}
                        className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                        title="Ouvrir le lecteur web"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* QR Code expansion */}
                {showQrModal && (
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col items-center justify-center gap-2">
                    <div className="w-36 h-36 bg-white p-2 rounded-lg flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                          publicUrl
                        )}`}
                        alt="QR Code Radio"
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono text-center">
                      Scannez avec un téléphone pour écouter immédiatement en direct
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Column Right (7 cols) : CONSOLE DE MIXAGE & VU-MÈTRES */}
            <div className="lg:col-span-7 space-y-5">
              {/* MIXEUR AUDIO PRO */}
              <div className="bg-[#13171d] border border-zinc-800 rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                      Mixage & Bus Radio (Étalonnage dB)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-zinc-500">RMS: {levels.rmsDb} dB</span>
                    <span className="text-zinc-400">Peak: {levels.peakDb} dB</span>
                    {levels.isClipping && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-700 text-[10px] font-bold">
                        CLIP
                      </span>
                    )}
                  </div>
                </div>

                {/* STEREO VU-METER */}
                <div className="space-y-2 p-3 bg-[#0a0c0f] rounded-xl border border-zinc-850">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>-48 dB</span>
                    <span>-24 dB</span>
                    <span>-12 dB</span>
                    <span>-6 dB</span>
                    <span>0 dB</span>
                    <span className="text-rose-400">+3 dB</span>
                  </div>

                  {/* Canal Gauche */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 w-3">L</span>
                    <div className="flex-1 h-3.5 bg-zinc-900 rounded-full overflow-hidden p-0.5 flex">
                      <div
                        className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
                        style={{ width: `${Math.min(100, levels.leftPeak * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Canal Droit */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 w-3">R</span>
                    <div className="flex-1 h-3.5 bg-zinc-900 rounded-full overflow-hidden p-0.5 flex">
                      <div
                        className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
                        style={{ width: `${Math.min(100, levels.rightPeak * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Faders / Potentiomètres */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Gain Entrée */}
                  <div className="space-y-1.5 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Gain Entrée</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={mix.inputGain}
                      onChange={(e) => handleMixChange('inputGain', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-cyan-300">
                      {Math.round(mix.inputGain * 100)}%
                    </span>
                  </div>

                  {/* EQ Low */}
                  <div className="space-y-1.5 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Grave (120Hz)</span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={mix.eqLow}
                      onChange={(e) => handleMixChange('eqLow', parseFloat(e.target.value))}
                      className="w-full accent-purple-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-purple-300">
                      {mix.eqLow > 0 ? `+${mix.eqLow}` : mix.eqLow} dB
                    </span>
                  </div>

                  {/* EQ Mid */}
                  <div className="space-y-1.5 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Médium (1.2k)</span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={mix.eqMid}
                      onChange={(e) => handleMixChange('eqMid', parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-amber-300">
                      {mix.eqMid > 0 ? `+${mix.eqMid}` : mix.eqMid} dB
                    </span>
                  </div>

                  {/* Master Broadcast */}
                  <div className="space-y-1.5 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Master Bus</span>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={mix.masterGain}
                      onChange={(e) => handleMixChange('masterGain', parseFloat(e.target.value))}
                      className="w-full accent-rose-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-rose-300">
                      {Math.round(mix.masterGain * 100)}%
                    </span>
                  </div>
                </div>

                {/* ÉCOUTE LOCALE & CONTRÔLE RÉGIE */}
                <div className="p-3 bg-[#0a0c0f] rounded-xl border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleLocalMonitorAudio}
                      className={`p-2 rounded-lg border transition-all ${
                        localMonitorAudioPlaying
                          ? 'bg-amber-950 text-amber-300 border-amber-600'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                      title="Écouter le retour direct du relais"
                    >
                      {localMonitorAudioPlaying ? (
                        <Volume2 className="w-4 h-4 animate-pulse" />
                      ) : (
                        <VolumeX className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="font-semibold text-zinc-200">
                        {localMonitorAudioPlaying ? 'Écoute Retour Active' : 'Moniteur Casque Régie'}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Vérifie ce que les auditeurs entendent réellement
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-32">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={mix.monitorGain}
                      onChange={(e) => handleMixChange('monitorGain', parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-zinc-400">
                      {Math.round(mix.monitorGain * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* COMMANDES PRINCIPALES : TEST / ON AIR / STOP */}
              <div className="grid grid-cols-3 gap-3">
                {/* BOUTON TEST */}
                <button
                  onClick={handleStartTest}
                  disabled={telemetry.state === 'on_air'}
                  className={`py-3.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                    telemetry.state === 'testing'
                      ? 'bg-amber-500 text-black border-amber-400 shadow-amber-500/30'
                      : 'bg-amber-950/40 hover:bg-amber-950/60 text-amber-300 border-amber-800 hover:border-amber-600'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>5. TEST</span>
                </button>

                {/* BOUTON ON AIR */}
                <button
                  onClick={handleStartOnAir}
                  className={`py-3.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                    telemetry.state === 'on_air'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-rose-600/40 animate-pulse'
                      : 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border-rose-800 hover:border-rose-600'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>7. ON AIR</span>
                </button>

                {/* BOUTON STOP */}
                <button
                  onClick={handleStop}
                  className="py-3.5 px-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>8. STOP</span>
                </button>
              </div>

              {/* TÉLÉMÉTRIE EN DIRECT */}
              <div className="p-3 bg-[#0a0c0f] rounded-xl border border-zinc-850 flex items-center justify-between text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      telemetry.serverConnected ? 'bg-emerald-400' : 'bg-zinc-600'
                    }`}
                  />
                  <span>
                    {telemetry.serverConnected ? 'Relais Connecté' : 'Relais Déconnecté'}
                  </span>
                </div>

                <div>
                  Paquets : <strong className="text-zinc-200">{telemetry.packetsSent}</strong>
                </div>

                <div>
                  Débit : <strong className="text-cyan-400">{telemetry.transferRateKbps} kb/s</strong>
                </div>

                <div>
                  Auditeurs : <strong className="text-amber-400">{telemetry.listenersCount}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-[#12161c] flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Aucune clé secrète requise • 100% Hors-Ligne ou Réseau Local Régie</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Fermer le panneau
          </button>
        </div>
      </div>
    </div>
  );
};
