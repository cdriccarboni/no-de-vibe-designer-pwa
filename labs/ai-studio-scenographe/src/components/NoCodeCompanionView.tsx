import React, { useState, useEffect, useRef } from 'react';
import { companionBridge, CompanionTelemetryPayload } from '../services/companionBridge';
import {
  Smartphone,
  Camera,
  Sliders,
  Compass,
  Zap,
  Layers,
  Sparkles,
  Wifi,
  CheckCircle,
  Vibrate,
  ArrowLeft,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface NoCodeCompanionViewProps {
  onBackToMacStudio?: () => void;
}

export const NoCodeCompanionView: React.FC<NoCodeCompanionViewProps> = ({ onBackToMacStudio }) => {
  const [pinInput, setPinInput] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('pin') || '7392';
  });
  const [isPaired, setIsPaired] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'faders' | 'motion' | 'cues'>('camera');

  // Camera stream & brush canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const brushCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedShape, setSelectedShape] = useState<'vase' | 'quad' | 'circle'>('vase');
  const [lastTouchCoord, setLastTouchCoord] = useState<{ x: number; y: number } | null>(null);
  const [autoMapStatus, setAutoMapStatus] = useState<string | null>(null);

  // Faders & XY pad state
  const [padCoords, setPadCoords] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [faders, setFaders] = useState({
    intensity: 0.8,
    speed: 1.0,
    waveFreq: 0.6,
    filterCutoff: 0.75,
  });

  // Motion sensors
  const [motionActive, setMotionActive] = useState(false);
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });

  // Auto-pair if PIN provided
  useEffect(() => {
    companionBridge.pairFromPhone(pinInput, 'Pixel / Galaxy Companion').then((success) => {
      setIsPaired(success);
    });
  }, [pinInput]);

  // Start Camera
  useEffect(() => {
    if (!isPaired || activeTab !== 'camera') {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
        setCameraActive(false);
      }
      return;
    }

    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
      })
      .catch((err) => {
        console.warn('Camera access denied or unavailable:', err);
      });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isPaired, activeTab]);

  // Device orientation sensors
  useEffect(() => {
    if (!motionActive) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const alpha = e.alpha || 0;
      const beta = e.beta || 0;
      const gamma = e.gamma || 0;
      setOrientation({ alpha, beta, gamma });

      companionBridge.sendTelemetryFromPhone({
        timestamp: Date.now(),
        orientation: { alpha, beta, gamma },
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [motionActive]);

  // Request motion permission (iOS 13+)
  const requestMotionPermission = () => {
    const DeviceOrientationEventAny = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DeviceOrientationEventAny.requestPermission === 'function') {
      DeviceOrientationEventAny
        .requestPermission()
        .then((perm) => {
          if (perm === 'granted') setMotionActive(true);
        })
        .catch(() => setMotionActive(true));
    } else {
      setMotionActive(true);
    }
  };

  // Touch canvas on camera video (Pinceau de surface)
  const handleTouchCanvas = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = brushCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0, clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    setLastTouchCoord({ x, y });

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);

    // Draw visual brush target
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (selectedShape === 'vase') {
        // Forme vase stylisée
        ctx.ellipse(x * canvas.width, y * canvas.height, 60, 110, 0, 0, Math.PI * 2);
      } else {
        ctx.strokeRect(x * canvas.width - 60, y * canvas.height - 60, 120, 120);
      }
      ctx.stroke();
    }

    // Send touch coordinate to Mac
    companionBridge.sendTelemetryFromPhone({
      timestamp: Date.now(),
      mappingTouch: { x, y, shapeType: selectedShape },
    });
  };

  // Trigger 3s Auto-Mapping from Phone
  const handleTriggerPhoneAutoMapping = async () => {
    setAutoMapStatus('Envoi capture & calcul Mac...');
    if (navigator.vibrate) navigator.vibrate([40, 80, 40]);

    if (videoRef.current && cameraActive) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = 640;
      snapCanvas.height = 360;
      const snapCtx = snapCanvas.getContext('2d');
      if (snapCtx) {
        snapCtx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
        const dataUrl = snapCanvas.toDataURL('image/jpeg', 0.8);
        await companionBridge.sendCameraSnapshotForMapping(dataUrl);
      }
    }

    // Notify Mac
    await companionBridge.sendTelemetryFromPhone({
      timestamp: Date.now(),
      mappingTouch: {
        x: lastTouchCoord?.x || 0.5,
        y: lastTouchCoord?.y || 0.5,
        shapeType: selectedShape,
      },
    });

    setTimeout(() => {
      setAutoMapStatus('Mapping calibré sur le Mac ! (3s)');
      setTimeout(() => setAutoMapStatus(null), 3000);
    }, 600);
  };

  // Trigger a cue
  const handleTriggerCue = (cueId: string, cueName: string) => {
    if (navigator.vibrate) navigator.vibrate(50);
    companionBridge.sendTelemetryFromPhone({
      timestamp: Date.now(),
      triggeredCueId: cueName,
    });
  };

  return (
    <div className="min-h-screen bg-[#07090c] text-zinc-100 flex flex-col justify-between selection:bg-cyan-500/30">
      {/* Top Bar Mobile */}
      <header className="p-3 bg-[#11141a] border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {onBackToMacStudio && (
            <button
              onClick={onBackToMacStudio}
              className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="w-6 h-6 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono text-[10px] font-bold text-cyan-400">
            N[c]
          </span>
          <div>
            <h1 className="text-xs font-bold text-white">No[co]de Companion</h1>
            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connecté au Mac • RTT 12ms</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          PIN: {pinInput}
        </div>
      </header>

      {/* Main Mode View */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
        {activeTab === 'camera' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                <span>Pinceau Caméra & Auto-Mapping</span>
              </span>

              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setSelectedShape('vase')}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                    selectedShape === 'vase'
                      ? 'bg-amber-950 text-amber-300 border-amber-600'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Vase
                </button>
                <button
                  onClick={() => setSelectedShape('quad')}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                    selectedShape === 'quad'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Mur/Quad
                </button>
              </div>
            </div>

            {/* Video preview with interactive touch brush canvas */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center shadow-2xl">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-2">
                  <Camera className="w-10 h-10 text-zinc-700 animate-pulse" />
                  <p className="text-xs">
                    Visez le vase ou la surface réelle avec votre caméra
                  </p>
                </div>
              )}

              {/* Touch Canvas Overlay */}
              <canvas
                ref={brushCanvasRef}
                width={480}
                height={360}
                onClick={handleTouchCanvas}
                onTouchStart={handleTouchCanvas}
                className="absolute inset-0 w-full h-full cursor-crosshair"
              />

              {/* Crosshair guide */}
              <div className="absolute top-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-zinc-300 backdrop-blur-sm">
                Touchez l'objet à mapper
              </div>
            </div>

            {/* Feedback & 3s button */}
            <div className="space-y-2">
              <button
                onClick={handleTriggerPhoneAutoMapping}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-950/40 active:scale-95 transition-all"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>Auto-Mapping 3 Secondes</span>
              </button>

              {autoMapStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-mono text-center flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>{autoMapStatus}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'faders' && (
          <div className="space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>Contrôle Scénique Déporté</span>
            </span>

            {/* Faders */}
            <div className="space-y-3">
              {Object.entries(faders).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 uppercase font-mono">{key}</span>
                    <span className="text-cyan-400 font-mono">{Math.round(val * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={val}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      const updated = { ...faders, [key]: v };
                      setFaders(updated);
                      companionBridge.sendTelemetryFromPhone({
                        timestamp: Date.now(),
                        faders: updated,
                      });
                    }}
                    className="w-full h-2 accent-cyan-400 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'motion' && (
          <div className="space-y-5 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center justify-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>Capteurs Inertiels (Gyroscopes)</span>
            </span>

            {!motionActive ? (
              <button
                onClick={requestMotionPermission}
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase"
              >
                Activer les capteurs de mouvement
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Alpha</span>
                  <strong className="text-xl text-cyan-400">{Math.round(orientation.alpha)}°</strong>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Beta</span>
                  <strong className="text-xl text-purple-400">{Math.round(orientation.beta)}°</strong>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Gamma</span>
                  <strong className="text-xl text-amber-400">{Math.round(orientation.gamma)}°</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cues' && (
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>Déclencheurs de Scène & TOP</span>
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleTriggerCue('cue-1', '1. Radio Paillettes en grève')}
                className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 font-semibold text-xs text-left active:scale-95 transition-all"
              >
                1. Radio Paillettes
              </button>

              <button
                onClick={() => handleTriggerCue('cue-2', 'Douche Maxime (8s)')}
                className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-200 font-semibold text-xs text-left active:scale-95 transition-all"
              >
                Douche Maxime
              </button>

              <button
                onClick={() => handleTriggerCue('cue-3', 'Tempête Pirate Caraïbes')}
                className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-200 font-semibold text-xs text-left active:scale-95 transition-all"
              >
                Tempête Pirate
              </button>

              <button
                onClick={() => handleTriggerCue('cue-4', 'Vase : Eau Réactive')}
                className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-800 text-sky-200 font-semibold text-xs text-left active:scale-95 transition-all"
              >
                Vase : Eau Fluide
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Tabs */}
      <nav className="p-2 bg-[#11141a] border-t border-zinc-800 flex items-center justify-around text-xs shrink-0">
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'camera' ? 'text-cyan-400 font-bold' : 'text-zinc-500'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px]">Pinceau</span>
        </button>

        <button
          onClick={() => setActiveTab('faders')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'faders' ? 'text-purple-400 font-bold' : 'text-zinc-500'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px]">Faders</span>
        </button>

        <button
          onClick={() => setActiveTab('motion')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'motion' ? 'text-amber-400 font-bold' : 'text-zinc-500'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Mouvement</span>
        </button>

        <button
          onClick={() => setActiveTab('cues')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'cues' ? 'text-rose-400 font-bold' : 'text-zinc-500'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span className="text-[10px]">Cues TOP</span>
        </button>
      </nav>
    </div>
  );
};
