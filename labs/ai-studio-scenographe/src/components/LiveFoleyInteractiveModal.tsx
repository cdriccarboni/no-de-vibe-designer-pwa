import React, { useState, useEffect, useRef } from 'react';
import {
  liveFoleyInteractiveEngine,
  FoleyScenicObject,
  VibratingSeaParameters,
} from '../services/liveFoleyInteractiveEngine';
import {
  Waves,
  X,
  Mic,
  MicOff,
  Sliders,
  Sparkles,
  Zap,
  Volume2,
  ShieldCheck,
  Disc,
  Play,
  Activity,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface LiveFoleyInteractiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveFoleyInteractiveModal: React.FC<LiveFoleyInteractiveModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [objects, setObjects] = useState<FoleyScenicObject[]>(() =>
    liveFoleyInteractiveEngine.getObjects()
  );
  const [activeObject, setActiveObject] = useState<FoleyScenicObject | undefined>(() =>
    liveFoleyInteractiveEngine.getActiveObject()
  );
  const [seaParams, setSeaParams] = useState<VibratingSeaParameters>(() =>
    liveFoleyInteractiveEngine.getSeaParameters()
  );
  const [isMicActive, setIsMicActive] = useState(() =>
    liveFoleyInteractiveEngine.isMicActive()
  );

  // Live telemetry (raw mic dB, envelope, sea vibration)
  const [telemetry, setTelemetry] = useState(() => liveFoleyInteractiveEngine.getTelemetry());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Engine synchronization
  useEffect(() => {
    if (!isOpen) return;

    const unsub = liveFoleyInteractiveEngine.subscribe(() => {
      setObjects(liveFoleyInteractiveEngine.getObjects());
      setActiveObject(liveFoleyInteractiveEngine.getActiveObject());
      setSeaParams(liveFoleyInteractiveEngine.getSeaParameters());
      setIsMicActive(liveFoleyInteractiveEngine.isMicActive());
    });

    return unsub;
  }, [isOpen]);

  // Telemetry polling loop
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTelemetry(liveFoleyInteractiveEngine.getTelemetry());
    }, 60);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Real-time canvas render loop for « La Mer qui Vibre » (60 FPS)
  useEffect(() => {
    if (!isOpen) return;

    const render = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      liveFoleyInteractiveEngine.renderVibratingSeaToCanvas(
        ctx,
        canvas.width,
        canvas.height,
        timestamp
      );

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen]);

  // Toggle Microphone
  const toggleMic = async () => {
    if (isMicActive) {
      liveFoleyInteractiveEngine.stopMicrophoneListener();
    } else {
      await liveFoleyInteractiveEngine.startMicrophoneListener();
    }
  };

  // Trigger test acoustic foley impact
  const handleSimulateImpact = (intensity = 0.8) => {
    liveFoleyInteractiveEngine.triggerSimulatedFoleyImpact(intensity);
  };

  // Update Sea Parameters
  const handleSeaParamChange = (key: keyof VibratingSeaParameters, value: number) => {
    const updated = { ...seaParams, [key]: value };
    setSeaParams(updated);
    liveFoleyInteractiveEngine.updateSeaParameters({ [key]: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 lg:p-6 select-none overflow-y-auto">
      <div className="w-full max-w-6xl bg-[#0e1115] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-[#12161c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 flex items-center justify-center">
              <Waves className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Bruitage Vivant & Scénographie Interactive
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                  Effet Phare : La Mer qui Vibre (p. 35)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Spectacle : Pirates Paillettes
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                A. Son Réel Comédien ➔ B. Détection Acoustique ➔ C. Effets Audio ➔ D. La Mer Réactive
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

        {/* Signal Separation Chain Bar (A ➔ B ➔ C ➔ D) */}
        <div className="px-6 py-2.5 bg-[#101318] border-b border-zinc-850 flex items-center justify-between gap-4 text-xs font-mono shrink-0 overflow-x-auto">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 font-semibold">[A] Son acoustique naturel</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-cyan-300 font-semibold">[B] Analyse enveloppe & seuil</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-purple-300 font-semibold">[C] Zéro altération du comédien</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-amber-300 font-bold">[D] La Mer Vibre en Direct</span>
          </div>

          <button
            onClick={toggleMic}
            className={`px-3 py-1 rounded-md text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors ${
              isMicActive
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
            }`}
          >
            {isMicActive ? <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{isMicActive ? 'Microphone Scène Actif' : 'Activer Micro Bruiteur'}</span>
          </button>
        </div>

        {/* Studio Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Main Display : « La Mer qui Vibre » Canvas (8 cols) */}
          <div className="lg:col-span-8 bg-[#040910] p-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-800 relative overflow-hidden">
            {/* Real-time reactive sea canvas */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 shadow-2xl bg-black">
              <canvas
                ref={canvasRef}
                width={960}
                height={540}
                className="w-full h-full block"
              />

              {/* Status Watermark */}
              <div className="absolute top-4 left-4 p-2.5 rounded-lg bg-black/70 backdrop-blur-md border border-cyan-500/40 text-xs font-mono space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      telemetry.vibration > 0.05 ? 'bg-cyan-400 animate-ping' : 'bg-zinc-600'
                    }`}
                  />
                  <strong className="text-white">
                    {telemetry.vibration > 0.05 ? 'LA MER VIBRE EN DIRECT' : 'CALME PLAT (REPOS)'}
                  </strong>
                </div>
                <div className="text-[10px] text-zinc-400">
                  Intensité vibration : <span className="text-cyan-300">{(telemetry.vibration * 50).toFixed(0)}%</span> •
                  Amplitude houle : <span className="text-amber-300">{seaParams.waveAmplitude.toFixed(2)}x</span>
                </div>
              </div>

              {/* Level indicator bottom right */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
                <span>Micro: {telemetry.rawMicDb.toFixed(0)} dB</span>
                <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, telemetry.envelope * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Demonstration Actions */}
            <div className="mt-3 p-3 bg-[#0a0f16] border border-zinc-850 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Test immédiat du bruitage :</span>
                <button
                  onClick={() => handleSimulateImpact(0.5)}
                  className="px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-300 font-mono transition-colors"
                >
                  Ressac Léger (0.5)
                </button>
                <button
                  onClick={() => handleSimulateImpact(1.0)}
                  className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800 text-amber-300 font-mono transition-colors"
                >
                  Secousse Forte (1.0)
                </button>
                <button
                  onClick={() => handleSimulateImpact(1.6)}
                  className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-rose-300 font-mono transition-colors"
                >
                  Tempête Tonnerre (1.6)
                </button>
              </div>

              <div className="text-[10px] text-zinc-500 font-mono">
                Amortissement automatique vers le calme plat
              </div>
            </div>
          </div>

          {/* Right Sidebar : Objets de Bruitage & Réglages Mer (4 cols) */}
          <div className="lg:col-span-4 bg-[#0e1116] p-5 space-y-5 overflow-y-auto">
            {/* 1. Sélection de l'Objet de Bruitage Réel (Didascalies) */}
            <div className="space-y-3 pb-4 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300 uppercase font-mono">
                1. Objet Scénique Utilisé par le Comédien
              </span>

              <div className="space-y-2">
                {objects.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => liveFoleyInteractiveEngine.selectObject(obj.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                      activeObject?.id === obj.id
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200'
                        : 'bg-[#12151b] border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">{obj.name}</span>
                      <span className="text-[9px] font-mono text-amber-400">{obj.comedianRole}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{obj.didascalieRef}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 line-clamp-1">
                      {obj.physicalDescription}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Réglages de la Mer qui Vibre */}
            <div className="space-y-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 uppercase font-mono">
                  2. Paramètres de Vibration Marine
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Temps réel</span>
              </div>

              {/* Fréquence de vibration */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Fréquence Vibration :</span>
                  <span className="font-mono text-cyan-300">{seaParams.vibrationFrequency} Hz</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={seaParams.vibrationFrequency}
                  onChange={(e) =>
                    handleSeaParamChange('vibrationFrequency', parseFloat(e.target.value))
                  }
                  className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Amplitude des vagues */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Amplitude Vagues :</span>
                  <span className="font-mono text-amber-300">{seaParams.waveAmplitude.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={seaParams.waveAmplitude}
                  onChange={(e) =>
                    handleSeaParamChange('waveAmplitude', parseFloat(e.target.value))
                  }
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Vitesse de défilement */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Vitesse Houle :</span>
                  <span className="font-mono text-purple-300">{seaParams.undulationSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={seaParams.undulationSpeed}
                  onChange={(e) =>
                    handleSeaParamChange('undulationSpeed', parseFloat(e.target.value))
                  }
                  className="w-full accent-purple-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Amortissement / Retour au calme */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Retour au Calme Plat :</span>
                  <span className="font-mono text-emerald-300">
                    {Math.round((1 - seaParams.propagationDecay) * 100)}% / tick
                  </span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="0.99"
                  step="0.01"
                  value={seaParams.propagationDecay}
                  onChange={(e) =>
                    handleSeaParamChange('propagationDecay', parseFloat(e.target.value))
                  }
                  className="w-full accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Sensibilité au son direct */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Sensibilité Bruitage :</span>
                  <span className="font-mono text-rose-300">
                    {seaParams.audioReactivityGain.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={seaParams.audioReactivityGain}
                  onChange={(e) =>
                    handleSeaParamChange('audioReactivityGain', parseFloat(e.target.value))
                  }
                  className="w-full accent-rose-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Note d'éthique théâtrale */}
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <div className="font-semibold text-zinc-300">Charte Scénique No[co]de :</div>
              <p>
                Le comédien produit le son sur scène. No[co]de écoute pour agir sur l’image, sans jamais
                diffuser une bande-son préenregistrée à la place de l’artiste.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="px-6 py-3 bg-[#12161c] border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sécurité régie : Déclenchement de secours par TOP toujours actif</span>
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
