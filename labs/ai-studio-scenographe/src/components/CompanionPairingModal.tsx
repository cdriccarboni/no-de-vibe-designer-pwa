import React, { useState, useEffect } from 'react';
import { companionBridge, CompanionState, CompanionTelemetryPayload } from '../services/companionBridge';
import {
  Smartphone,
  X,
  QrCode,
  Wifi,
  Sliders,
  CheckCircle,
  Activity,
  Compass,
  Layers,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface CompanionPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCompanionView?: () => void;
}

export const CompanionPairingModal: React.FC<CompanionPairingModalProps> = ({
  isOpen,
  onClose,
  onOpenCompanionView,
}) => {
  const [companionState, setCompanionState] = useState<CompanionState>(() => companionBridge.getState());
  const [lastTelemetry, setLastTelemetry] = useState<CompanionTelemetryPayload | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubState = companionBridge.subscribe((s) => {
      setCompanionState(s);
    });

    const unsubTele = companionBridge.onTelemetry((t) => {
      setLastTelemetry(t);
    });

    return () => {
      unsubState();
      unsubTele();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const companionUrl = `${window.location.origin}/companion?pin=${companionState.pin}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 lg:p-6 select-none overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#0e1115] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#12161c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  No[co]de Companion — Association Mobile & Capteurs
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Réseau Local Zéro-Latence
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Pinceau de mapping caméra, gyroscopes, faders et déclencheurs de scène en temps réel
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status banner */}
          <div className="p-4 rounded-xl bg-[#13171d] border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  companionState.isPaired ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                }`}
              />
              <div>
                <div className="text-xs font-bold text-white">
                  {companionState.isPaired
                    ? `Téléphone Associé : ${companionState.phoneModel || 'Mobile Android'}`
                    : 'En attente de connexion du téléphone'}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  {companionState.isPaired
                    ? `Latence RTT mesurée : ${companionState.latencyMs} ms • Liaison bidirectionnelle active`
                    : 'Scannez le QR code ci-dessous depuis votre appareil mobile'}
                </div>
              </div>
            </div>

            {onOpenCompanionView && (
              <button
                onClick={onOpenCompanionView}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-400 hover:text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tester Companion</span>
              </button>
            )}
          </div>

          {/* Grid : QR Code Left (5 cols) & Live Telemetry Right (7 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* QR Code & PIN Area */}
            <div className="md:col-span-5 bg-[#12151b] border border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-44 h-44 bg-white p-2.5 rounded-xl flex items-center justify-center shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    companionUrl
                  )}`}
                  alt="QR Code Companion"
                  className="w-full h-full"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs text-zinc-400">Code PIN d'association :</div>
                <div className="text-2xl font-mono font-bold tracking-widest text-cyan-400">
                  {companionState.pin}
                </div>
              </div>

              <p className="text-[10px] text-zinc-500 font-mono max-w-xs">
                Ouvrez simplement l'appareil photo de votre smartphone pour vous connecter directement au Mac.
              </p>
            </div>

            {/* Live Telemetry Display */}
            <div className="md:col-span-7 bg-[#12151b] border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white font-mono uppercase">
                    Données Téléphone en Direct
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">60 Hz</span>
              </div>

              {/* Capteurs Mouvement / Gyro */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  <span>Inclinaison Gyroscope (Pitch / Roll / Yaw) :</span>
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-center">
                    <span className="text-[9px] text-zinc-500 block">Alpha</span>
                    <strong className="text-cyan-300">
                      {lastTelemetry?.orientation?.alpha ? Math.round(lastTelemetry.orientation.alpha) : 0}°
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-center">
                    <span className="text-[9px] text-zinc-500 block">Beta</span>
                    <strong className="text-purple-300">
                      {lastTelemetry?.orientation?.beta ? Math.round(lastTelemetry.orientation.beta) : 0}°
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-center">
                    <span className="text-[9px] text-zinc-500 block">Gamma</span>
                    <strong className="text-amber-300">
                      {lastTelemetry?.orientation?.gamma ? Math.round(lastTelemetry.orientation.gamma) : 0}°
                    </strong>
                  </div>
                </div>
              </div>

              {/* Touch Pad XY */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pad Tactile XY (Paramètres Scène Vibe) :</span>
                </span>
                <div className="p-3 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    X : <strong className="text-amber-400">{lastTelemetry?.padXY?.x?.toFixed(2) || '0.50'}</strong>
                  </div>
                  <div>
                    Y : <strong className="text-amber-400">{lastTelemetry?.padXY?.y?.toFixed(2) || '0.50'}</strong>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                </div>
              </div>

              {/* Dernier déclencheur / TOP */}
              <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Dernier Déclencheur TOP / Cue :</span>
                <strong className="text-emerald-400 font-mono">
                  {lastTelemetry?.triggeredCueId || 'Prêt pour déclenchement'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-[#12161c] flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Aucune connexion Internet requise pendant le spectacle</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
