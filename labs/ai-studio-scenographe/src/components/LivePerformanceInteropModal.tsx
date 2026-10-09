import React, { useState, useEffect } from 'react';
import {
  InteropSoftwareId,
  OSCMessage,
  BridgeTelemetry,
  InteropSoftwareSpec
} from '../types/interop';
import { INTEROP_SOFTWARE_SPECS, STANDALONE_LOCAL_BRIDGE_CODE } from '../services/interopSpecs';
import { liveBridge } from '../services/livePerformanceBridge';
import {
  X,
  Radio,
  Sliders,
  Terminal,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Volume2,
  Film,
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  ArrowRight,
  ArrowLeft,
  FileCode,
  ShieldCheck
} from 'lucide-react';

interface LivePerformanceInteropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LivePerformanceInteropModal: React.FC<LivePerformanceInteropModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<InteropSoftwareId | 'transports'>('touchdesigner');
  const [telemetry, setTelemetry] = useState<BridgeTelemetry>(liveBridge.getTelemetry());
  const [history, setHistory] = useState<OSCMessage[]>([]);
  const [wsInputUrl, setWsInputUrl] = useState('ws://127.0.0.1:9000');

  // Interactive controls state
  const [catSpeed, setCatSpeed] = useState(1.5);
  const [catHue, setCatHue] = useState(215);
  const [catPosture, setCatPosture] = useState(1);
  const [audioFreq, setAudioFreq] = useState(440);
  const [audioGain, setAudioGain] = useState(0.25);
  const [milluminCue, setMilluminCue] = useState('Cue 1');
  const [milluminOpacity, setMilluminOpacity] = useState(0.85);

  const [simulateDrops, setSimulateDrops] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = liveBridge.subscribe((t, h) => {
      setTelemetry(t);
      setHistory(h);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSpec =
    activeTab !== 'transports'
      ? INTEROP_SOFTWARE_SPECS.find((s) => s.id === activeTab)
      : null;

  const handleSelectTab = (tab: InteropSoftwareId | 'transports') => {
    setActiveTab(tab);
    if (tab !== 'transports') {
      liveBridge.setActiveTarget(tab);
    }
  };

  const handleSendPing = () => {
    liveBridge.sendOSC('/nocode/ping', [Date.now()]);
  };

  const handleSendTouchDesigner = () => {
    liveBridge.sendOSC('/nocode/cat/speed', [catSpeed]);
    liveBridge.sendOSC('/nocode/cat/color', [catHue]);
    liveBridge.sendOSC('/nocode/cat/posture', [catPosture]);
  };

  const handleSendMaxMSP = (freq: number) => {
    setAudioFreq(freq);
    liveBridge.sendOSC('/nocode/audio/freq', [freq]);
    liveBridge.sendOSC('/nocode/audio/gain', [audioGain]);
  };

  const handleSendMillumin = (cue: string) => {
    setMilluminCue(cue);
    liveBridge.sendOSC('/millumin/action/launchCue', [cue]);
    liveBridge.sendOSC('/millumin/layer:1/opacity', [milluminOpacity]);
  };

  const handleToggleDrops = () => {
    const nextVal = !simulateDrops;
    setSimulateDrops(nextVal);
    liveBridge.setSimulateDropRate(nextVal ? 0.35 : 0);
  };

  const handleDownloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 lg:p-6 select-none">
      <div className="w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>Passerelles Spectacle Vivant — Interopérabilité Régie</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  OSC / UDP & WebSocket
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Protocole bidirectionnel avec accusé de réception (ACK), mesure de latence RTT et zéro dépendance Internet.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Network & Telemetry Bar */}
        <div className="px-6 py-2.5 bg-zinc-900/50 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono shrink-0">
          {/* Status & Mode */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  telemetry.status === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : telemetry.status === 'connecting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-red-500'
                }`}
              />
              <span className="font-semibold text-zinc-200">
                {telemetry.status === 'connected'
                  ? 'LIAISON ACTIVE'
                  : telemetry.status === 'connecting'
                  ? 'CONNEXION...'
                  : 'DÉCONNECTÉ'}
              </span>
            </div>

            <span className="text-zinc-600">|</span>

            {/* Mode selector */}
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
              <button
                onClick={() => liveBridge.setMode('local-loopback')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  telemetry.mode === 'local-loopback'
                    ? 'bg-cyan-950 text-cyan-300 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Boucle Locale Matérielle (Test)
              </button>
              <button
                onClick={() => liveBridge.setMode('real-websocket', wsInputUrl)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  telemetry.mode === 'real-websocket'
                    ? 'bg-cyan-950 text-cyan-300 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Passerelle Réelle (ws://)
              </button>
            </div>
          </div>

          {/* Telemetry Numbers */}
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-zinc-400">RTT :</span>
              <span className="text-cyan-300 font-semibold tabular-nums">
                {telemetry.lastRttMs.toFixed(2)} ms
              </span>
              <span className="text-zinc-500 text-[10px]">
                (Moy: {telemetry.averageRttMs.toFixed(2)} ms, Gigue: {telemetry.jitterMs.toFixed(2)} ms)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Paquets :</span>
              <span className="text-zinc-200 font-semibold">{telemetry.packetsSent} env.</span>
              <span className="text-emerald-400 font-semibold">{telemetry.packetsAcked} ACK ✓</span>
              {telemetry.packetsDropped > 0 && (
                <span className="text-red-400 font-semibold">({telemetry.packetsDropped} perdus)</span>
              )}
            </div>

            {/* Test drops toggle */}
            <button
              onClick={handleToggleDrops}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                simulateDrops
                  ? 'bg-amber-950 border-amber-700 text-amber-300 font-bold animate-pulse'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Vérifie qu'un message non acquitté est correctement signalé comme non reçu"
            >
              {simulateDrops ? 'Perte active (35%)' : 'Simuler perte paquet'}
            </button>

            <button
              onClick={handleSendPing}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors text-[11px] flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              <span>Ping RTT</span>
            </button>
          </div>
        </div>

        {/* Software Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-zinc-950 border-b border-zinc-800 overflow-x-auto text-xs font-medium shrink-0">
          {INTEROP_SOFTWARE_SPECS.map((spec) => (
            <button
              key={spec.id}
              onClick={() => handleSelectTab(spec.id)}
              className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === spec.id
                  ? 'border-cyan-400 text-cyan-300 font-semibold bg-zinc-900/60 rounded-t'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {spec.id === 'touchdesigner' && <Layers className="w-3.5 h-3.5 text-cyan-400" />}
              {(spec.id === 'maxmsp' || spec.id === 'puredata' || spec.id === 'supercollider') && (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              {spec.id === 'millumin' && <Film className="w-3.5 h-3.5 text-amber-400" />}
              {spec.id === 'chataigne' && <Cpu className="w-3.5 h-3.5 text-purple-400" />}
              <span>{spec.name}</span>
              {/* Validation Status Indicator */}
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  spec.validationStatus === 'tested_local_loopback'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                    : spec.validationStatus === 'simulated_external'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                    : 'bg-zinc-850 text-zinc-400 border border-zinc-700'
                }`}
                title={spec.validationDetails}
              >
                {spec.validationStatus === 'tested_local_loopback'
                  ? 'Testé ✓'
                  : spec.validationStatus === 'simulated_external'
                  ? 'Simulé'
                  : 'En attente'}
              </span>
            </button>
          ))}

          <button
            onClick={() => handleSelectTab('transports')}
            className={`px-3.5 py-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ml-auto ${
              activeTab === 'transports'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-zinc-900/60 rounded-t'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Transports, Tunnels & Bridge CJS</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Column: Interactive Controls & Architecture */}
          <div className="w-full lg:w-7/12 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-y-auto p-5 space-y-5">
            {activeTab !== 'transports' && currentSpec && (
              <>
                {/* Software Summary Card */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-100">{currentSpec.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-cyan-300">
                        {currentSpec.category}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">
                      Port In : {currentSpec.defaultPortIn} | Out : {currentSpec.defaultPortOut}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{currentSpec.summary}</p>

                  {/* Clarification : Testé vs Simulé vs Non encore validé */}
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-850 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-300">Statut de validation :</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                          currentSpec.validationStatus === 'tested_local_loopback'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : currentSpec.validationStatus === 'simulated_external'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {currentSpec.validationStatus === 'tested_local_loopback'
                          ? 'TESTÉ EN BOUCLE LOCALE (ACK REÇU)'
                          : currentSpec.validationStatus === 'simulated_external'
                          ? 'SIMULATION CONFORME (INSTANCE EXTERNE EN ATTENTE)'
                          : 'NON ENCORE VALIDÉ SUR MATÉRIEL'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">{currentSpec.validationDetails}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{currentSpec.hardwareTestScope}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 text-[11px] text-zinc-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{currentSpec.aiSeparationPolicy}</span>
                  </div>
                </div>

                {/* Interactive Controller per Software */}
                <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Console de Pilotage en Direct</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Acquittement vérifié requis pour validation
                    </span>
                  </div>

                  {/* CASE 1: TOUCHDESIGNER */}
                  {currentSpec.id === 'touchdesigner' && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-300">Vitesse du chat (/nocode/cat/speed)</span>
                          <span className="text-cyan-400 font-mono">{catSpeed.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="3.0"
                          step="0.05"
                          value={catSpeed}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCatSpeed(val);
                            liveBridge.sendOSC('/nocode/cat/speed', [val]);
                          }}
                          className="w-full h-1.5 bg-zinc-800 rounded accent-cyan-400 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-300">Teinte néon (/nocode/cat/color)</span>
                          <span className="text-cyan-400 font-mono">{catHue}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="5"
                          value={catHue}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCatHue(val);
                            liveBridge.sendOSC('/nocode/cat/color', [val]);
                          }}
                          className="w-full h-1.5 bg-zinc-800 rounded accent-cyan-400 cursor-pointer"
                        />
                      </div>

                      <div>
                        <span className="text-xs text-zinc-300 block mb-1.5">Allure (/nocode/cat/posture)</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '0. Assis', val: 0 },
                            { label: '1. Marche', val: 1 },
                            { label: '2. Course', val: 2 },
                          ].map((p) => (
                            <button
                              key={p.val}
                              onClick={() => {
                                setCatPosture(p.val);
                                liveBridge.sendOSC('/nocode/cat/posture', [p.val]);
                              }}
                              className={`py-1.5 text-xs rounded border transition-colors ${
                                catPosture === p.val
                                  ? 'bg-cyan-950 border-cyan-700 text-cyan-300 font-semibold'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleSendTouchDesigner}
                        className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold rounded text-xs transition-colors"
                      >
                        Envoyer le groupe d'ordres vers TouchDesigner
                      </button>
                    </div>
                  )}

                  {/* CASE 2: MAX/MSP */}
                  {currentSpec.id === 'maxmsp' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-300">Fréquence du son (/nocode/audio/freq)</span>
                          <span className="text-emerald-400 font-mono font-semibold">{audioFreq} Hz</span>
                        </div>
                        <input
                          type="range"
                          min="55"
                          max="1760"
                          step="1"
                          value={audioFreq}
                          onChange={(e) => handleSendMaxMSP(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded accent-emerald-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                          <span>La 1 (55 Hz)</span>
                          <span>La 3 (440 Hz)</span>
                          <span>La 5 (1760 Hz)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {[110, 220, 440, 880].map((f) => (
                          <button
                            key={f}
                            onClick={() => handleSendMaxMSP(f)}
                            className={`py-1 text-xs rounded border transition-colors ${
                              audioFreq === f
                                ? 'bg-emerald-950 border-emerald-700 text-emerald-300 font-bold'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {f} Hz
                          </button>
                        ))}
                      </div>

                      <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs space-y-1">
                        <span className="text-zinc-400 font-semibold block">Vérification de boucle fermée :</span>
                        <p className="text-zinc-400 text-[11px]">
                          Lorsque No[co]de transmet {audioFreq} Hz, Max/MSP applique la fréquence à son oscillateur,
                          calcule son niveau RMS et renvoie immédiatement <span className="font-mono text-emerald-400">/max/ack {audioFreq} [rms] [msg_id]</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CASE 3: PURE DATA */}
                  {currentSpec.id === 'puredata' && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-300">Fréquence oscillateur Pure Data</span>
                          <span className="text-emerald-400 font-mono">{audioFreq} Hz</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="1200"
                          value={audioFreq}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setAudioFreq(val);
                            liveBridge.sendOSC('/nocode/audio/freq', [val]);
                          }}
                          className="w-full h-1.5 bg-zinc-800 rounded accent-emerald-400 cursor-pointer"
                        />
                      </div>
                      <button
                        onClick={() => liveBridge.sendOSC('/nocode/audio/freq', [audioFreq])}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold rounded text-xs"
                      >
                        Transmettre vers [netreceive 9000] Pure Data
                      </button>
                    </div>
                  )}

                  {/* CASE 4: SUPERCOLLIDER */}
                  {currentSpec.id === 'supercollider' && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-300">Fréquence de synthèse scsynth</span>
                          <span className="text-emerald-400 font-mono">{audioFreq} Hz</span>
                        </div>
                        <input
                          type="range"
                          min="60"
                          max="800"
                          value={audioFreq}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setAudioFreq(val);
                            liveBridge.sendOSC('/nocode/audio/freq', [val]);
                          }}
                          className="w-full h-1.5 bg-zinc-800 rounded accent-emerald-400 cursor-pointer"
                        />
                      </div>
                      <button
                        onClick={() => liveBridge.sendOSC('/nocode/audio/freq', [audioFreq])}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold rounded text-xs"
                      >
                        Transmettre vers OSCdef SuperCollider (Port 57120)
                      </button>
                    </div>
                  )}

                  {/* CASE 5: MILLUMIN */}
                  {currentSpec.id === 'millumin' && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-zinc-300 block mb-1">Top scénique (/millumin/action/launchCue)</span>
                        <div className="grid grid-cols-4 gap-2">
                          {['Cue 1', 'Cue 2', 'Cue 3', 'Noir Scène'].map((c) => (
                            <button
                              key={c}
                              onClick={() => handleSendMillumin(c)}
                              className={`py-1.5 text-xs rounded border transition-colors ${
                                milluminCue === c
                                  ? 'bg-amber-950 border-amber-700 text-amber-300 font-bold'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-300">Opacité Calque 1 (/millumin/layer:1/opacity)</span>
                          <span className="text-amber-400 font-mono">{(milluminOpacity * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={milluminOpacity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setMilluminOpacity(val);
                            liveBridge.sendOSC('/millumin/layer:1/opacity', [val]);
                          }}
                          className="w-full h-1.5 bg-zinc-800 rounded accent-amber-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* CASE 6: CHATAIGNE */}
                  {currentSpec.id === 'chataigne' && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-300">
                        Chataigne assure la conversion du flux OSC No[co]de vers vos univers DMX / Art-Net, projecteurs scéniques et interfaces MIDI.
                      </p>
                      <button
                        onClick={() => liveBridge.sendOSC('/nocode/vibe/dimmer', [0.85])}
                        className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-zinc-950 font-semibold rounded text-xs"
                      >
                        Envoyer Gradateur Lumière DMX via Chataigne (/nocode/vibe/dimmer)
                      </button>
                    </div>
                  )}
                </div>

                {/* Downloadable files section */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Fichiers de démonstration prêts à l'emploi :</span>
                  </span>

                  <div className="space-y-2">
                    {currentSpec.exampleFiles.map((file) => (
                      <div
                        key={file.filename}
                        className="p-3 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono text-cyan-300 font-semibold block">{file.filename}</span>
                          <span className="text-[11px] text-zinc-400">{file.description}</span>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(file.filename, file.content, file.mimeType)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3 h-3 text-cyan-400" />
                          <span>Télécharger</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* CASE TRANSPORTS: Tunnels & Transports Overview */}
            {activeTab === 'transports' && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Architecture des Transports en Spectacle Vivant (Mission 5)</span>
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Sur un plateau de théâtre ou de concert, <strong>aucun tunnel Internet ne doit être requis</strong>.
                    Les communications reposent sur des transports locaux certifiés pour le temps réel.
                  </p>
                </div>

                {/* Transports Comparison Table */}
                <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px]">
                      <tr>
                        <th className="p-2.5">Protocole</th>
                        <th className="p-2.5">Type de flux</th>
                        <th className="p-2.5">Latence locale</th>
                        <th className="p-2.5">Dépendance Internet</th>
                        <th className="p-2.5">Usage Recommandé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 text-zinc-300 text-[11px]">
                      <tr className="bg-zinc-950">
                        <td className="p-2.5 text-cyan-400 font-bold">OSC / UDP</td>
                        <td className="p-2.5">Contrôle / Événements</td>
                        <td className="p-2.5 text-emerald-400">&lt; 1 ms</td>
                        <td className="p-2.5 text-emerald-400">AUCUNE (LAN)</td>
                        <td className="p-2.5">Standard régie (Max, TD, Chataigne)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-cyan-400 font-bold">WebSocket</td>
                        <td className="p-2.5">Bidirectionnel No[co]de</td>
                        <td className="p-2.5 text-emerald-400">1 à 3 ms</td>
                        <td className="p-2.5 text-emerald-400">AUCUNE (127.0.0.1)</td>
                        <td className="p-2.5">Interface No[co]de vers pont local</td>
                      </tr>
                      <tr className="bg-zinc-950">
                        <td className="p-2.5 text-zinc-300 font-bold">Spout / Syphon</td>
                        <td className="p-2.5">Vidéo GPU mémoire partagée</td>
                        <td className="p-2.5 text-emerald-400">&lt; 0.2 ms</td>
                        <td className="p-2.5 text-emerald-400">AUCUNE (GPU local)</td>
                        <td className="p-2.5">Partage textures TD ➔ No[co]de</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-zinc-300 font-bold">NDI (IP Video)</td>
                        <td className="p-2.5">Flux vidéo compressé LAN</td>
                        <td className="p-2.5 text-amber-400">16 à 33 ms</td>
                        <td className="p-2.5 text-emerald-400">AUCUNE (Câble RJ45)</td>
                        <td className="p-2.5">Diffusion vidéo multi-écrans régie</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Standalone CJS script preview & download */}
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-cyan-300 font-semibold block text-xs">
                        nocode-osc-bridge.cjs
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Passerelle autonome Node.js sans dépendances externes (zéro npm install requis)
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleDownloadFile('nocode-osc-bridge.cjs', STANDALONE_LOCAL_BRIDGE_CODE, 'application/javascript')
                      }
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold rounded text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger le pont CJS</span>
                    </button>
                  </div>

                  <pre className="p-3 bg-zinc-950 rounded border border-zinc-800 text-[10px] font-mono text-zinc-400 overflow-x-auto max-h-48">
                    {STANDALONE_LOCAL_BRIDGE_CODE}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Bidirectional Packet Monitor & Terminal */}
          <div className="w-full lg:w-5/12 flex flex-col bg-zinc-950 overflow-hidden">
            <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Moniteur Bidirectionnel (Télémétrie & ACK)</span>
              </span>
              <span className="text-[10px] text-zinc-500">{history.length} paquets</span>
            </div>

            {/* Packet List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px]">
              {history.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs font-sans">
                  Aucun paquet transmis. Déplacez un curseur ou cliquez sur "Ping RTT" pour initier le flux.
                </div>
              ) : (
                history.map((msg) => {
                  const isOut = msg.direction === 'out';
                  return (
                    <div
                      key={msg.id}
                      className={`p-2 rounded border transition-all ${
                        isOut
                          ? 'bg-zinc-900/60 border-zinc-800 text-zinc-200'
                          : 'bg-cyan-950/30 border-cyan-900/50 text-cyan-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="flex items-center gap-1.5 font-bold">
                          {isOut ? (
                            <>
                              <ArrowRight className="w-3 h-3 text-cyan-400" />
                              <span className="text-zinc-400">SORTANT (No[co]de ➔ {msg.targetSoftware})</span>
                            </>
                          ) : (
                            <>
                              <ArrowLeft className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">ENTRANT ({msg.targetSoftware} ➔ No[co]de)</span>
                            </>
                          )}
                        </span>
                        <span className="text-zinc-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-cyan-300 font-semibold">{msg.address}</span>
                        <span className="text-zinc-400 text-[10px] truncate max-w-[140px]">
                          {JSON.stringify(msg.args)}
                        </span>
                      </div>

                      {/* ACK Status verification */}
                      {isOut && (
                        <div className="mt-1 pt-1 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                          {msg.acknowledged ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ACK Reçu (RTT {msg.rttMs?.toFixed(2)} ms)</span>
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              <span>En attente d'acquittement...</span>
                            </span>
                          )}
                          <span className="text-zinc-600 font-mono text-[9px]">{msg.id}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer Notice */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Principe régie : Un message envoyé n'est réputé reçu qu'après son paquet ACK.</span>
              <button
                onClick={() => setHistory([])}
                className="text-zinc-500 hover:text-zinc-300 underline"
              >
                Effacer l'historique
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
