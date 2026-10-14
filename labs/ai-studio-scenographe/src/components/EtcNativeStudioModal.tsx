import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Sliders,
  Cpu,
  Layers,
  Zap,
  Terminal,
  Activity,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  Radio,
  Wifi,
  Eye,
  Crosshair,
  FileCode,
  Flame,
  Volume2
} from 'lucide-react';
import { etcEosEngine } from '../services/etcEosEngine';
import { nativeCodeEngine } from '../services/nativeCodeEngine';
import { dmxLightingEngine } from '../services/dmxLightingEngine';
import {
  EtcPalette,
  EtcDirectSelect,
  EtcResponseNode,
  RdmDevice,
  Augment3dEntity,
  NativeCppEngineState,
  NativeCsEngineState
} from '../types/etcAndNativeStage';

interface EtcNativeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EtcNativeStudioModal: React.FC<EtcNativeStudioModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'eos_console' | 'response_nodes' | 'augment3d' | 'cpp_engine' | 'cs_engine'>('eos_console');

  // État ETC Eos
  const [commandState, setCommandState] = useState(etcEosEngine.getCommandState());
  const [directSelects, setDirectSelects] = useState<EtcDirectSelect[]>(etcEosEngine.getDirectSelects());
  const [palettes, setPalettes] = useState<EtcPalette[]>(etcEosEngine.getPalettes());
  const [responseNodes, setResponseNodes] = useState<EtcResponseNode[]>(etcEosEngine.getResponseNodes());
  const [rdmDevices, setRdmDevices] = useState<RdmDevice[]>(etcEosEngine.getRdmDevices());
  const [augmentEntities, setAugmentEntities] = useState<Augment3dEntity[]>(etcEosEngine.getAugment3dEntities());

  // État C++ et C#
  const [cppState, setCppState] = useState<NativeCppEngineState>(nativeCodeEngine.getCppState());
  const [csState, setCsState] = useState<NativeCsEngineState>(nativeCodeEngine.getCsState());

  // Encodeurs IFCB
  const [panVal, setPanVal] = useState<number>(0);
  const [tiltVal, setTiltVal] = useState<number>(-60);
  const [intensityVal, setIntensityVal] = useState<number>(255);
  const [colorRed, setColorRed] = useState<number>(255);
  const [colorGreen, setColorGreen] = useState<number>(180);
  const [colorBlue, setColorBlue] = useState<number>(60);

  // Canvas Augment3d
  const augmentCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedActor, setSelectedActor] = useState<string>('aug-target-actor-1');

  // Souscription aux moteurs
  useEffect(() => {
    const unsubEos = etcEosEngine.subscribe(() => {
      setCommandState(etcEosEngine.getCommandState());
      setDirectSelects([...etcEosEngine.getDirectSelects()]);
      setPalettes([...etcEosEngine.getPalettes()]);
      setResponseNodes([...etcEosEngine.getResponseNodes()]);
      setRdmDevices([...etcEosEngine.getRdmDevices()]);
      setAugmentEntities([...etcEosEngine.getAugment3dEntities()]);
    });

    const unsubNative = nativeCodeEngine.subscribe(() => {
      setCppState(nativeCodeEngine.getCppState());
      setCsState(nativeCodeEngine.getCsState());
    });

    return () => {
      unsubEos();
      unsubNative();
    };
  }, []);

  // Rendu de la Scénographie Augment3d
  useEffect(() => {
    if (!isOpen || activeTab !== 'augment3d') return;
    const canvas = augmentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderAugment3d = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Cage de scène
      ctx.fillStyle = '#06080c';
      ctx.fillRect(0, 0, w, h);

      const centerX = w * 0.5;
      const centerY = h * 0.55;

      // Grille scénique métrique 3D (Projection axonométrique)
      ctx.strokeStyle = '#1b2330';
      ctx.lineWidth = 1;

      for (let i = -6; i <= 6; i++) {
        const xOffset = i * 28;
        ctx.beginPath();
        ctx.moveTo(centerX + xOffset - 150, centerY + 120);
        ctx.lineTo(centerX + xOffset * 0.5, centerY - 60);
        ctx.stroke();
      }

      for (let j = 0; j <= 8; j++) {
        const yOffset = j * 22;
        const widthAtDepth = 300 - j * 18;
        ctx.beginPath();
        ctx.moveTo(centerX - widthAtDepth, centerY + 120 - yOffset);
        ctx.lineTo(centerX + widthAtDepth, centerY + 120 - yOffset);
        ctx.stroke();
      }

      // Repère plateau
      ctx.fillStyle = '#475569';
      ctx.font = '9px monospace';
      ctx.fillText('LOINTAIN (Fond de scène)', centerX - 60, centerY - 75);
      ctx.fillText('FACE (Bord de scène)', centerX - 50, centerY + 135);
      ctx.fillText('JARDIN', centerX - 260, centerY + 30);
      ctx.fillText('COUR', centerX + 220, centerY + 30);

      // Entités Augment3d
      const actor = augmentEntities.find((e) => e.type === 'actor');

      // Dessin des faisceaux lumineux depuis les projecteurs vers la cible
      for (const ent of augmentEntities) {
        if (ent.type === 'fixture') {
          const fxScreenX = centerX + ent.x * 24;
          const fxScreenY = centerY - ent.y * 14 - ent.z * 6;

          // Cône de lumière vers l'acteur ou le sol
          const targetX = actor ? centerX + actor.x * 24 : centerX;
          const targetY = actor ? centerY + 90 - actor.z * 12 : centerY + 90;

          const grad = ctx.createLinearGradient(fxScreenX, fxScreenY, targetX, targetY);
          grad.addColorStop(0, ent.color || 'rgba(251, 191, 36, 0.85)');
          grad.addColorStop(1, 'rgba(251, 191, 36, 0.05)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(fxScreenX, fxScreenY);
          ctx.lineTo(targetX - 25, targetY);
          ctx.lineTo(targetX + 25, targetY);
          ctx.closePath();
          ctx.fill();

          // Tache de lumière au sol
          ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
          ctx.beginPath();
          ctx.ellipse(targetX, targetY, 28, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          // Symbole projecteur sur perche
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(fxScreenX, fxScreenY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = '8px monospace';
          ctx.fillText(ent.name, fxScreenX - 30, fxScreenY - 10);
        }
      }

      // Dessin de l'acteur sur scène
      if (actor) {
        const actorScreenX = centerX + actor.x * 24;
        const actorScreenY = centerY + 90 - actor.z * 12;

        // Ombre portée
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.ellipse(actorScreenX, actorScreenY, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Silhouette acteur (stick figure stylisée)
        ctx.strokeStyle = actor.color || '#e11d48';
        ctx.lineWidth = 2.5;
        // Corps
        ctx.beginPath();
        ctx.moveTo(actorScreenX, actorScreenY);
        ctx.lineTo(actorScreenX, actorScreenY - 32);
        ctx.stroke();
        // Tête
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(actorScreenX, actorScreenY - 38, 5, 0, Math.PI * 2);
        ctx.fill();

        // Bras
        ctx.beginPath();
        ctx.moveTo(actorScreenX - 10, actorScreenY - 22);
        ctx.lineTo(actorScreenX + 10, actorScreenY - 22);
        ctx.stroke();

        ctx.fillStyle = '#f87171';
        ctx.font = '9px monospace';
        ctx.fillText(`${actor.name} (${actor.x.toFixed(1)}m, ${actor.z.toFixed(1)}m)`, actorScreenX - 50, actorScreenY + 16);
      }

      animId = requestAnimationFrame(renderAugment3d);
    };

    renderAugment3d();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeTab, augmentEntities]);

  if (!isOpen) return null;

  // Téléchargement du projet C++
  const handleDownloadCppProject = () => {
    const proj = nativeCodeEngine.generateStandaloneCppProject();
    const blob = new Blob([proj.mainCpp], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nocode_stage_bridge.cpp';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Téléchargement du projet C#
  const handleDownloadCsProject = () => {
    const proj = nativeCodeEngine.generateStandaloneCsProject();
    const blob = new Blob([proj.programCs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Program.cs';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Boutons du pavé Eos
  const EOS_KEYS = [
    ['CHAN', 'THRU', 'GROUP', 'CUE'],
    ['AT', 'FULL', 'OUT', 'ENTER'],
    ['7', '8', '9', 'SNEAK'],
    ['4', '5', '6', 'REM DIM'],
    ['1', '2', '3', 'HIGHLIGHT'],
    ['0', '.', '/', 'CLEAR'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-6xl h-[90vh] bg-[#0c0f13] border border-[#2d3748] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* HEADER */}
        <div className="h-14 border-b border-[#1f2937] bg-[#11161d] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm tracking-wide text-white">ETC EOS FAMILY & RUNTIMES NATIFS C++ / C#</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Régie Pro
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  sACN 44Hz (9.8µs)
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Pupitre Eos Virtuel · Response Network Nodes · Augment3d Tracking · Moteurs de Scripting C++ & C# .NET 8
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVIGATION DES ONGLETS */}
        <div className="h-11 bg-[#141a22] border-b border-[#1f2937] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('eos_console')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'eos_console'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Faceplate ETC Eos (Ligne de Commande)</span>
            </button>

            <button
              onClick={() => setActiveTab('response_nodes')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'response_nodes'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>ETC Response Nodes & sACN Network</span>
            </button>

            <button
              onClick={() => setActiveTab('augment3d')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'augment3d'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
              <span>Augment3d (Tracking Spatial 3D)</span>
            </button>

            <button
              onClick={() => setActiveTab('cpp_engine')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cpp_engine'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Moteur C++ Haute Performance (Wasm)</span>
            </button>

            <button
              onClick={() => setActiveTab('cs_engine')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cs_engine'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Script C# .NET 8 (Show Automation)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>OSC Port 8000 / sACN 5568</span>
          </div>
        </div>

        {/* CORPS PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0a0d11]">
          {/* ========================================================================= */}
          {/* ONGLET 1 : FACEPLATE ETC EOS */}
          {/* ========================================================================= */}
          {activeTab === 'eos_console' && (
            <div className="grid grid-cols-12 gap-4 h-full">
              {/* Ligne de commande & Clavier Eos */}
              <div className="col-span-7 flex flex-col gap-3">
                {/* Écran d'affichage Ligne de Commande Eos */}
                <div className="bg-[#050709] border border-[#232b36] rounded-xl p-4 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mb-2">
                    <span>ETC EOS COMMAND LINE</span>
                    <span>ACTIVE CHANS : [{commandState.activeChannels.join(', ')}]</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#10141b] border border-amber-500/40 rounded-lg px-3 py-2.5 text-amber-300 font-mono text-base font-bold tracking-wider">
                    <span className="text-amber-500 select-none">LIVE :</span>
                    <span className="flex-1">
                      {commandState.commandBuffer || <span className="text-zinc-600 font-normal">Tapez une commande (ex: Chan 1 Thru 4 At Full Enter)...</span>}
                    </span>
                    <span className="w-2 h-5 bg-amber-400 animate-pulse"></span>
                  </div>
                  {commandState.lastError && (
                    <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 font-mono">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{commandState.lastError}</span>
                    </div>
                  )}

                  {/* Historique rapide */}
                  <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono text-zinc-400">
                    <span className="text-zinc-600">Historique :</span>
                    {commandState.history.slice(0, 4).map((h, i) => (
                      <button
                        key={i}
                        onClick={() => etcEosEngine.setCommandLine(h)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0 border border-zinc-700"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pavé de Touches Tactiles Eos */}
                <div className="grid grid-cols-4 gap-2 bg-[#10141a] border border-[#232b36] p-3 rounded-xl">
                  {EOS_KEYS.map((row, rIdx) =>
                    row.map((k, cIdx) => {
                      const isEnter = k === 'ENTER';
                      const isFull = k === 'FULL';
                      const isClear = k === 'CLEAR';
                      return (
                        <button
                          key={`${rIdx}-${cIdx}`}
                          onClick={() => etcEosEngine.appendKey(k)}
                          className={`h-11 rounded-lg font-mono font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center ${
                            isEnter
                              ? 'bg-amber-500 text-black hover:bg-amber-400'
                              : isFull
                              ? 'bg-rose-600 text-white hover:bg-rose-500'
                              : isClear
                              ? 'bg-zinc-800 text-rose-300 hover:bg-zinc-700'
                              : 'bg-[#18202a] text-zinc-200 border border-[#2b3542] hover:bg-[#222d3b] hover:text-white'
                          }`}
                        >
                          {k}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Direct Selects : Groupes & Palettes */}
                <div className="bg-[#10141a] border border-[#232b36] p-3 rounded-xl flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 mb-2">
                    <span>DIRECT SELECTS (ETC EOS)</span>
                    <span className="text-[10px] text-zinc-500">Sélection Instantanée 1-Clic</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {directSelects.map((ds) => (
                      <button
                        key={ds.id}
                        onClick={() => etcEosEngine.activateDirectSelect(ds.id)}
                        className={`p-2 rounded-lg text-left border text-xs font-mono transition-all flex flex-col justify-between h-14 ${
                          ds.active
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md'
                            : 'bg-[#151c24] border-[#252f3b] text-zinc-300 hover:border-zinc-500'
                        }`}
                      >
                        <div className="text-[9px] text-zinc-500 flex items-center justify-between">
                          <span>{ds.type.toUpperCase().replace('_', ' ')}</span>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ds.color || '#fbbf24' }}></span>
                        </div>
                        <div className="font-bold truncate text-[11px]">{ds.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Encodeurs IFCB (Intensity, Focus, Color, Beam) */}
              <div className="col-span-5 flex flex-col gap-3">
                <div className="bg-[#10141a] border border-[#232b36] p-4 rounded-xl flex flex-col gap-4">
                  <h3 className="text-xs font-bold tracking-wider text-amber-400 uppercase flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Encodeurs IFCB (Paramètres Projecteurs)</span>
                  </h3>

                  {/* INTENSITY */}
                  <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38]">
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-zinc-400 font-semibold">[I] INTENSITÉ (MASTER)</span>
                      <span className="text-amber-400 font-bold">{Math.round((intensityVal / 255) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={intensityVal}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setIntensityVal(v);
                        etcEosEngine.setIfcbParam('intensity', 'level', v);
                      }}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* FOCUS (Pan & Tilt) */}
                  <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38]">
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400 font-semibold">[F] FOCUS (PAN / TILT)</span>
                      <span className="text-cyan-400 font-bold">Pan: {panVal}° · Tilt: {tiltVal}°</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-zinc-500 mb-1">PAN (-180° à +180°)</div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={panVal}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setPanVal(v);
                            etcEosEngine.setIfcbParam('focus', 'pan', v);
                          }}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 mb-1">TILT (-90° à +90°)</div>
                        <input
                          type="range"
                          min="-90"
                          max="90"
                          value={tiltVal}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setTiltVal(v);
                            etcEosEngine.setIfcbParam('focus', 'tilt', v);
                          }}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COLOR (RGBW / Gels) */}
                  <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38]">
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400 font-semibold">[C] COULEUR (RGB SPECTRUM)</span>
                      <div
                        className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: `rgb(${colorRed}, ${colorGreen}, ${colorBlue})` }}
                      ></div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-[10px] font-mono text-red-400">R</span>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={colorRed}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setColorRed(v);
                            etcEosEngine.setIfcbParam('color', 'red', v);
                          }}
                          className="w-full accent-red-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-[10px] font-mono text-green-400">G</span>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={colorGreen}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setColorGreen(v);
                            etcEosEngine.setIfcbParam('color', 'green', v);
                          }}
                          className="w-full accent-green-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-[10px] font-mono text-blue-400">B</span>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={colorBlue}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setColorBlue(v);
                            etcEosEngine.setIfcbParam('color', 'blue', v);
                          }}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BEAM (Zoom & Iris) */}
                  <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38]">
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400 font-semibold">[B] BEAM (FAISCEAU & IRIS)</span>
                      <span className="text-purple-400 font-bold">Zoom: 25° · Iris: 100%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <button
                        onClick={() => {
                          dmxLightingEngine.fireNextCue();
                        }}
                        className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>GO (NEXT CUE)</span>
                      </button>
                      <button
                        onClick={() => {
                          dmxLightingEngine.toggleBlackout();
                        }}
                        className="py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-bold text-xs shadow-md transition-all"
                      >
                        BLACKOUT URGENCE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 2 : ETC RESPONSE NODES & SACN NETWORK */}
          {/* ========================================================================= */}
          {activeTab === 'response_nodes' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {responseNodes.map((node) => (
                  <div key={node.id} className="bg-[#10141b] border border-[#232b36] rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div>
                        <div className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                          <span>{node.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ONLINE
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          IP: {node.ipAddress} · MAC: {node.macAddress} · Firmware: {node.firmwareVersion}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-amber-400 font-semibold">{node.temperatureCelsius}°C</div>
                        <div className="text-[9px] text-zinc-500">Temp. CPU</div>
                      </div>
                    </div>

                    {/* Liste des ports DMX physiques */}
                    <div className="flex flex-col gap-2">
                      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Ports DMX / sACN</div>
                      <div className="grid grid-cols-2 gap-2">
                        {node.ports.map((port) => (
                          <div key={port.portNumber} className="bg-[#151c25] border border-zinc-800 rounded-lg p-2.5 flex flex-col gap-1.5 text-xs font-mono">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-cyan-300">Port {port.portNumber} ({port.direction.toUpperCase()})</span>
                              <span className="text-[10px] text-emerald-400">{port.packetRateFps} FPS</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span>Univers sACN :</span>
                              <select
                                value={port.universe}
                                onChange={(e) => etcEosEngine.setPortUniverse(node.id, port.portNumber, parseInt(e.target.value, 10))}
                                className="bg-[#0b0e13] border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200"
                              >
                                {[1, 2, 3, 4, 5, 6].map((u) => (
                                  <option key={u} value={u}>Univers {u}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span>Priorité sACN :</span>
                              <input
                                type="number"
                                min="1"
                                max="200"
                                value={port.sacnPriority}
                                onChange={(e) => etcEosEngine.setPortPriority(node.id, port.portNumber, parseInt(e.target.value, 10))}
                                className="w-14 bg-[#0b0e13] border border-zinc-700 rounded px-1.5 py-0.5 text-right text-zinc-200"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span>Fusion :</span>
                              <select
                                value={port.mergeMode}
                                onChange={(e) => etcEosEngine.setPortMergeMode(node.id, port.portNumber, e.target.value as any)}
                                className="bg-[#0b0e13] border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 text-[10px]"
                              >
                                <option value="htp">HTP (Highest)</option>
                                <option value="ltp">LTP (Latest)</option>
                                <option value="priority_only">Priority Only</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Périphériques RDM (Remote Device Management ANSI E1.20) */}
              <div className="bg-[#10141b] border border-[#232b36] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    <span>Périphériques RDM Détectés en Ligne (ANSI E1.20)</span>
                  </h3>
                  <span className="text-xs font-mono text-zinc-400">{rdmDevices.length} appareils interrogés</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#151c24] text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="p-2">UID RDM</th>
                        <th className="p-2">Modèle & Fabricant</th>
                        <th className="p-2">Univers / Adresse</th>
                        <th className="p-2">Empreinte</th>
                        <th className="p-2">Heures Lampe</th>
                        <th className="p-2">Température</th>
                        <th className="p-2">Personnalité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {rdmDevices.map((dev) => (
                        <tr key={dev.uid} className="hover:bg-zinc-800/30">
                          <td className="p-2 text-cyan-300 font-bold">{dev.uid}</td>
                          <td className="p-2 text-zinc-200">{dev.modelName} <span className="text-[10px] text-zinc-500">({dev.manufacturer})</span></td>
                          <td className="p-2 text-amber-300">U{dev.universe} · Ch {dev.dmxAddress}</td>
                          <td className="p-2 text-zinc-400">{dev.footprint} canaux</td>
                          <td className="p-2 text-zinc-400">{dev.lampHours} h</td>
                          <td className="p-2 text-emerald-400">{dev.temperatureCelsius}°C</td>
                          <td className="p-2 text-zinc-300">{dev.personality}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 3 : AUGMENT3D (TRACKING SPATIAL 3D) */}
          {/* ========================================================================= */}
          {activeTab === 'augment3d' && (
            <div className="grid grid-cols-12 gap-4 h-full">
              <div className="col-span-8 bg-[#050709] border border-[#232b36] rounded-xl overflow-hidden flex flex-col">
                <div className="p-3 border-b border-[#232b36] flex items-center justify-between text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-zinc-200">AUGMENT3D SPATIAL STAGE ENVIRONMENT</span>
                  </div>
                  <span>Tracking Automatique Pan & Tilt</span>
                </div>
                <div className="flex-1 relative flex items-center justify-center p-2">
                  <canvas
                    ref={augmentCanvasRef}
                    width={720}
                    height={460}
                    className="w-full h-full object-contain rounded-lg shadow-inner"
                  />
                </div>
              </div>

              {/* Contrôle de position des acteurs */}
              <div className="col-span-4 bg-[#10141a] border border-[#232b36] rounded-xl p-4 flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span>Positionnement Acteurs Plateau (Mètres)</span>
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Déplacez l’acteur sur le plateau : les lyres motorisées ETC (Halcyon & Source Four) calculent en direct leurs coordonnées trigonométriques pour maintenir la douche au zénith.
                </p>

                {augmentEntities.filter((e) => e.type === 'actor').map((actor) => (
                  <div key={actor.id} className="bg-[#141b24] p-3 rounded-lg border border-[#232c38] flex flex-col gap-3">
                    <div className="font-bold text-xs text-rose-300">{actor.name}</div>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
                        <span>Axe X (Cour / Jardin) :</span>
                        <span className="text-white font-bold">{actor.x.toFixed(1)} m</span>
                      </div>
                      <input
                        type="range"
                        min="-6"
                        max="6"
                        step="0.1"
                        value={actor.x}
                        onChange={(e) => etcEosEngine.updateActorPosition(actor.id, parseFloat(e.target.value), actor.z)}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
                        <span>Axe Z (Face / Lointain) :</span>
                        <span className="text-white font-bold">{actor.z.toFixed(1)} m</span>
                      </div>
                      <input
                        type="range"
                        min="-4"
                        max="6"
                        step="0.1"
                        value={actor.z}
                        onChange={(e) => etcEosEngine.updateActorPosition(actor.id, actor.x, parseFloat(e.target.value))}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-auto bg-[#0a0d12] p-3 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-400">
                  <div className="text-zinc-500 uppercase font-bold mb-1">Télémétrie Augment3d :</div>
                  <div>• Cible active : Maxime (Soliste)</div>
                  <div>• Angle Pan calculé : {panVal}°</div>
                  <div>• Angle Tilt calculé : {tiltVal}°</div>
                  <div>• Taux de rafraîchissement : 44.0 Hz</div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 4 : MOTEUR C++ HAUTE PERFORMANCE (WASM) */}
          {/* ========================================================================= */}
          {activeTab === 'cpp_engine' && (
            <div className="grid grid-cols-12 gap-4 h-full">
              <div className="col-span-8 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-zinc-200">Éditeur C++ / Clang WebAssembly (Calculateur de Trames DMX)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nativeCodeEngine.compileCppCode()}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Compiler & Exécuter (C++)</span>
                    </button>
                    <button
                      onClick={handleDownloadCppProject}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-zinc-700"
                      title="Télécharger les fichiers complets CMakeLists.txt et main.cpp pour Raspberry Pi ou serveur régie"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exporter Projet C++</span>
                    </button>
                  </div>
                </div>

                {/* Zone de code C++ */}
                <div className="flex-1 bg-[#050709] border border-[#232b36] rounded-xl p-3 font-mono text-xs text-zinc-300 flex flex-col">
                  <textarea
                    value={cppState.codeSnippet}
                    onChange={(e) => nativeCodeEngine.setCppCode(e.target.value)}
                    rows={18}
                    className="w-full flex-1 bg-transparent resize-none focus:outline-none font-mono text-[12px] leading-relaxed text-emerald-300"
                    spellCheck={false}
                  />
                </div>

                {cppState.compileErrors.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-600 text-rose-300 text-xs font-mono">
                    {cppState.compileErrors.join(' | ')}
                  </div>
                )}
              </div>

              {/* Métriques de performance C++ en temps réel */}
              <div className="col-span-4 bg-[#10141a] border border-[#232b36] rounded-xl p-4 flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Métriques d’Exécution Native C++</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38]">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Latence par Trame</div>
                    <div className="text-lg font-mono font-bold text-emerald-400">{cppState.microsecondLatency} µs</div>
                    <div className="text-[9px] text-zinc-400">Microsecondes</div>
                  </div>

                  <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38]">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Cadence Trame</div>
                    <div className="text-lg font-mono font-bold text-cyan-400">{cppState.frameRateFps} Hz</div>
                    <div className="text-[9px] text-zinc-400">Standard DMX512 / sACN</div>
                  </div>

                  <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38]">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Gigue (Peak Jitter)</div>
                    <div className="text-lg font-mono font-bold text-amber-400">{cppState.metrics.peakJitterMicroseconds} µs</div>
                    <div className="text-[9px] text-zinc-400">Tolérance zéro délai</div>
                  </div>

                  <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38]">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Trames Traitées</div>
                    <div className="text-lg font-mono font-bold text-purple-400">{cppState.packetCount.toLocaleString()}</div>
                    <div className="text-[9px] text-zinc-400">Paquets UDP diffusés</div>
                  </div>
                </div>

                <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38] text-xs font-mono text-zinc-400 flex flex-col gap-1.5">
                  <div className="text-zinc-200 font-bold">Architecture Déployée :</div>
                  <div>• C++20 Standard avec compilation SIMD</div>
                  <div>• Zéro allocation dynamique dans le render loop</div>
                  <div>• Compatible Clang / GCC / MSVC et Raspberry Pi 5</div>
                  <div>• Multicast sACN E1.31 (239.255.0.X) sans blocage</div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 5 : SCRIPT C# .NET 8 (SHOW AUTOMATION) */}
          {/* ========================================================================= */}
          {activeTab === 'cs_engine' && (
            <div className="grid grid-cols-12 gap-4 h-full">
              <div className="col-span-8 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-zinc-200">Script C# .NET 8 (Roslyn Scripting & Show Controller)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nativeCodeEngine.compileCsCode()}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Exécuter Script C#</span>
                    </button>
                    <button
                      onClick={handleDownloadCsProject}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-zinc-700"
                      title="Télécharger la solution C# .NET 8 complète prête à compiler avec 'dotnet run'"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Exporter Solution .NET 8</span>
                    </button>
                  </div>
                </div>

                {/* Zone de code C# */}
                <div className="flex-1 bg-[#050709] border border-[#232b36] rounded-xl p-3 font-mono text-xs text-zinc-300 flex flex-col">
                  <textarea
                    value={csState.codeSnippet}
                    onChange={(e) => nativeCodeEngine.setCsCode(e.target.value)}
                    rows={18}
                    className="w-full flex-1 bg-transparent resize-none focus:outline-none font-mono text-[12px] leading-relaxed text-indigo-300"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Journal d'exécution et triggers C# */}
              <div className="col-span-4 bg-[#10141a] border border-[#232b36] rounded-xl p-4 flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Journal de Bord C# .NET 8</span>
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => nativeCodeEngine.runCsTrigger('OnCueTrigger')}
                    className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono transition-all border border-zinc-700"
                  >
                    Simuler OnCue()
                  </button>
                  <button
                    onClick={() => nativeCodeEngine.runCsTrigger('OnMidiControl')}
                    className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono transition-all border border-zinc-700"
                  >
                    Simuler OnMidi()
                  </button>
                </div>

                <div className="flex-1 bg-[#050709] border border-[#232b36] rounded-lg p-3 font-mono text-[11px] text-zinc-400 overflow-y-auto flex flex-col gap-1.5">
                  <div className="text-zinc-500 font-bold uppercase text-[9px] border-b border-zinc-800 pb-1">
                    Console Output (StageContext) :
                  </div>
                  {csState.lastExecutionLog.map((log, i) => (
                    <div key={i} className="text-indigo-200 leading-tight">
                      {log}
                    </div>
                  ))}
                </div>

                <div className="bg-[#141b24] p-3 rounded-lg border border-[#222c38] text-[11px] font-mono text-zinc-400">
                  <div className="font-bold text-zinc-200 mb-1">Compatibilité Logicielle C# :</div>
                  <div>• Roslyn Compiler .NET 8.0 SDK</div>
                  <div>• Intégration Q-SYS & Companion Modules</div>
                  <div>• Passerelle Rug.Osc & sACN Multicast</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
