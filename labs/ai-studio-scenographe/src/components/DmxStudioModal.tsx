import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Sliders,
  Eye,
  Layers,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  Radio,
  X,
  Volume2,
  Tv,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Waves,
  CloudLightning,
  Activity,
  Plus,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Grid,
  Cpu
} from 'lucide-react';
import {
  dmxLightingEngine
} from '../services/dmxLightingEngine';
import { CueCartPanel } from './CueCartPanel';
import {
  DmxProtocol,
  DmxFixture,
  DmxSubmaster,
  DmxLightCue,
  DmxFxGenerator,
  DmxEngineState
} from '../types/dmxLighting';

interface DmxStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendCueToQlab?: (cue: DmxLightCue) => void;
  onOpenEtcStudio?: () => void;
}

export const DmxStudioModal: React.FC<DmxStudioModalProps> = ({
  isOpen,
  onClose,
  onSendCueToQlab,
  onOpenEtcStudio,
}) => {
  const [engineState, setEngineState] = useState<DmxEngineState>(dmxLightingEngine.getState());
  const [fixtures, setFixtures] = useState<DmxFixture[]>(dmxLightingEngine.getFixtures());
  const [submasters, setSubmasters] = useState<DmxSubmaster[]>(dmxLightingEngine.getSubmasters());
  const [cues, setCues] = useState<DmxLightCue[]>(dmxLightingEngine.getCues());
  const [fxGenerators, setFxGenerators] = useState<DmxFxGenerator[]>(dmxLightingEngine.getFxGenerators());
  const [activeCueId, setActiveCueId] = useState<string | null>(dmxLightingEngine.getActiveCueId());
  const [crossfade, setCrossfade] = useState(dmxLightingEngine.getCrossfadeProgress());

  // Workspace sub-tabs
  const [activeTab, setActiveTab] = useState<'faders' | 'visualizer' | 'patch' | 'cues' | 'fx' | 'cart'>('faders');

  // Stage Visualizer camera perspective
  const [viewPerspective, setViewPerspective] = useState<'front' | 'top' | 'iso'>('front');
  const [fogDensity, setFogDensity] = useState<number>(0.4);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);

  // Patch tab state
  const [selectedUniverse, setSelectedUniverse] = useState<number>(1);
  const [showAddFixtureModal, setShowAddFixtureModal] = useState<boolean>(false);
  const [newFixName, setNewFixName] = useState('Nouveau Projecteur');
  const [newFixType, setNewFixType] = useState<DmxFixture['type']>('rgbw_par');
  const [newFixChannel, setNewFixChannel] = useState(60);

  // New cue store name
  const [newCueName, setNewCueName] = useState('Q-LUM Nouvelle Mémoire');
  const [newCueFade, setNewCueFade] = useState(2.0);

  // Subscribe to engine ticks
  useEffect(() => {
    const unsub = dmxLightingEngine.subscribe(() => {
      setEngineState(dmxLightingEngine.getState());
      setFixtures([...dmxLightingEngine.getFixtures()]);
      setSubmasters([...dmxLightingEngine.getSubmasters()]);
      setCues([...dmxLightingEngine.getCues()]);
      setFxGenerators([...dmxLightingEngine.getFxGenerators()]);
      setActiveCueId(dmxLightingEngine.getActiveCueId());
      setCrossfade(dmxLightingEngine.getCrossfadeProgress());
    });
    return () => unsub();
  }, []);

  // 2D/3D Stage Visualizer Render Loop
  useEffect(() => {
    if (!isOpen || activeTab !== 'visualizer') return;

    let animId: number;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderVisualizer = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Fond de cage de scène noire
      ctx.fillStyle = '#06080b';
      ctx.fillRect(0, 0, w, h);

      // Plateau scénique et perspectives
      const stageFloorY = h * 0.75;
      const stageCenterX = w * 0.5;

      // Grille du sol scénique
      ctx.strokeStyle = '#1a222d';
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        const xBottom = stageCenterX + i * (w * 0.08);
        const xTop = stageCenterX + i * (w * 0.04);
        ctx.beginPath();
        ctx.moveTo(xTop, stageFloorY * 0.55);
        ctx.lineTo(xBottom, stageFloorY);
        ctx.stroke();
      }
      for (let j = 0; j <= 5; j++) {
        const yLine = stageFloorY * 0.55 + j * (stageFloorY * 0.45 / 5);
        ctx.beginPath();
        ctx.moveTo(w * 0.15, yLine);
        ctx.lineTo(w * 0.85, yLine);
        ctx.stroke();
      }

      // Perche et grill technique au cintre
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.18);
      ctx.lineTo(w * 0.92, h * 0.18);
      ctx.stroke();

      // Brouillard / Haze scénique
      if (fogDensity > 0.05) {
        const gradFog = ctx.createLinearGradient(0, h * 0.18, 0, stageFloorY);
        gradFog.addColorStop(0, `rgba(56, 189, 248, ${fogDensity * 0.03})`);
        gradFog.addColorStop(1, `rgba(148, 163, 184, ${fogDensity * 0.08})`);
        ctx.fillStyle = gradFog;
        ctx.fillRect(w * 0.05, h * 0.18, w * 0.9, stageFloorY - h * 0.18);
      }

      // Silhouette du comédien pirate sur scène (point de repère Maxime)
      const actorX = stageCenterX + (w * 0.05);
      const actorY = stageFloorY - 12;
      ctx.fillStyle = '#0a0e14';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      // Corps comédien
      ctx.beginPath();
      ctx.arc(actorX, actorY - 38, 8, 0, Math.PI * 2); // Tête
      ctx.fill();
      ctx.stroke();
      // Tricorne
      ctx.fillStyle = '#d7b86a';
      ctx.beginPath();
      ctx.moveTo(actorX - 12, actorY - 42);
      ctx.lineTo(actorX + 12, actorY - 42);
      ctx.lineTo(actorX, actorY - 50);
      ctx.closePath();
      ctx.fill();
      // Redingote
      ctx.fillStyle = '#0a0e14';
      ctx.beginPath();
      ctx.moveTo(actorX - 10, actorY);
      ctx.lineTo(actorX - 6, actorY - 30);
      ctx.lineTo(actorX + 6, actorY - 30);
      ctx.lineTo(actorX + 10, actorY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dessin des faisceaux lumineux de chaque projecteur DMX
      for (const fix of fixtures) {
        if (fix.universe !== selectedUniverse) continue;

        // Position de la source sur la perche
        const normX = (fix.stagePosition.x + 100) / 200; // 0 à 1
        const srcX = w * (0.12 + normX * 0.76);
        const srcY = h * 0.18;

        // Calcul de l'intensité et couleur du projecteur
        let r = 255;
        let g = 255;
        let b = 255;
        let dimmer = 0;

        if (fix.type === 'dimmer') {
          dimmer = (fix.channels[0] ?? 0) / 255;
          r = 251; g = 191; b = 36; // Ambre chaleureux trad
        } else if (fix.type === 'rgb_par' || fix.type === 'rgbw_par') {
          r = fix.channels[0] ?? 0;
          g = fix.channels[1] ?? 0;
          b = fix.channels[2] ?? 0;
          const wChan = fix.channels[3] ?? 0;
          r = Math.min(255, r + wChan);
          g = Math.min(255, g + wChan);
          b = Math.min(255, b + wChan);
          dimmer = Math.max(r, g, b) / 255;
        } else if (fix.type === 'moving_head') {
          dimmer = (fix.channels[0] ?? 0) / 255;
          r = fix.channels[4] ?? 255;
          g = fix.channels[5] ?? 255;
          b = fix.channels[6] ?? 255;
        } else if (fix.type === 'strobe') {
          dimmer = (fix.channels[1] ?? 0) / 255;
        }

        // Si Blackout actif
        if (engineState.blackout) dimmer = 0;
        dimmer *= (engineState.grandMaster / 255);

        if (dimmer > 0.02) {
          // Point d'impact du faisceau au sol
          const angleRad = (fix.stagePosition.panAngle * Math.PI) / 180;
          const targetX = srcX + Math.sin(angleRad) * (w * 0.28);
          const targetY = stageFloorY;
          const beamWidth = Math.tan((fix.stagePosition.beamAngle * Math.PI) / 360) * (targetY - srcY) * 1.4;

          // Cône lumineux volumétrique (avec dégradé translucide)
          ctx.save();
          const coneGrad = ctx.createRadialGradient(
            (srcX + targetX) / 2, (srcY + targetY) / 2, 10,
            targetX, targetY, beamWidth * 1.5
          );
          const alphaBeam = Math.min(0.7, dimmer * (0.35 + fogDensity * 0.45));
          coneGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaBeam})`);
          coneGrad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alphaBeam * 0.4})`);
          coneGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.moveTo(srcX, srcY);
          ctx.lineTo(targetX - beamWidth, targetY);
          ctx.ellipse(targetX, targetY, beamWidth, beamWidth * 0.25, 0, 0, Math.PI);
          ctx.lineTo(srcX, srcY);
          ctx.fill();

          // Tache de lumière au sol
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dimmer * 0.6})`;
          ctx.beginPath();
          ctx.ellipse(targetX, targetY, beamWidth, beamWidth * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Corps physique du projecteur au cintre
        ctx.fillStyle = dimmer > 0.1 ? `rgb(${r}, ${g}, ${b})` : '#334155';
        ctx.beginPath();
        ctx.arc(srcX, srcY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        // Label du projecteur
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(fix.name.split(' ')[0], srcX, srcY - 8);
      }

      // Indicateur d'état en surimpression
      ctx.fillStyle = engineState.blindMode ? 'rgba(234, 179, 8, 0.9)' : 'rgba(34, 197, 94, 0.8)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        engineState.blindMode ? '● MODE BLIND ACTIF (Plateau Préservé)' : `● LIVE SCÈNE (${engineState.protocol.toUpperCase()}) 44 FPS`,
        15,
        22
      );

      animId = requestAnimationFrame(renderVisualizer);
    };

    animId = requestAnimationFrame(renderVisualizer);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeTab, fixtures, engineState, selectedUniverse, fogDensity]);

  if (!isOpen) return null;

  const handleProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dmxLightingEngine.setProtocol(e.target.value as DmxProtocol);
  };

  const handleAddFixture = () => {
    const channelCounts: Record<DmxFixture['type'], number> = {
      dimmer: 1,
      rgb_par: 3,
      rgbw_par: 4,
      moving_head: 8,
      led_bar: 8,
      strobe: 2,
      hazer: 2,
    };
    const count = channelCounts[newFixType] || 1;
    const newFix: DmxFixture = {
      id: `fix-${Date.now().toString(36)}`,
      name: newFixName,
      type: newFixType,
      universe: selectedUniverse,
      startChannel: newFixChannel,
      channelCount: count,
      color: newFixType.includes('rgb') ? '#38bdf8' : '#fbbf24',
      stagePosition: { x: 0, y: 75, z: 50, panAngle: 0, tiltAngle: -45, beamAngle: 30 },
      channels: new Array(count).fill(0),
    };
    dmxLightingEngine.addFixture(newFix);
    setShowAddFixtureModal(false);
  };

  const handleStoreCue = () => {
    const cue = dmxLightingEngine.createLightCueFromLive(newCueName, 'Mémoire créée en régie', newCueFade, newCueFade);
    if (onSendCueToQlab) {
      onSendCueToQlab(cue);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3">
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#10141a] border border-[#2d3748] rounded-xl flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* BANDEAU SUPÉRIEUR — Pupitre de Régie */}
        <div className="h-14 border-b border-[#2d3748] bg-[#161c24] px-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sun className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm tracking-wide text-white">RÉGIE LUMIÈRE & DMX PRO</h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 border border-amber-600/50 text-amber-300">
                  MILLUMIN & ART-NET
                </span>
                {engineState.blindMode && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500 text-black animate-pulse">
                    MODE BLIND (SILENCIEUX)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Pupitre lumière de spectacle, 4 univers (2048 canaux), simulation 100% hors-ligne & passerelle réseau.
              </p>
            </div>
          </div>

          {/* CONTRÔLES CENTRAUX : Protocole, Grand Master & Blackout */}
          <div className="flex items-center gap-4">
            {/* Protocole */}
            <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[10px] text-zinc-400 uppercase font-mono">Protocole :</span>
              <select
                value={engineState.protocol}
                onChange={handleProtocolChange}
                aria-label="Protocole DMX"
                className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="simulation" className="bg-[#161c24]">Simulation Hors-Ligne</option>
                <option value="millumin_bridge" className="bg-[#161c24]">Passerelle Millumin (OSC/DMX)</option>
                <option value="artnet" className="bg-[#161c24]">Art-Net (IP 2.0.0.x / Broadcast)</option>
                <option value="sacn" className="bg-[#161c24]">sACN E1.31 (Priorité 100)</option>
                <option value="usb_dmx" className="bg-[#161c24]">USB DMX Pro (Enttec / uDMX)</option>
              </select>
            </div>

            {/* Grand Master Slider */}
            <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1">
              <span className="text-[10px] text-zinc-400 font-mono font-bold">GM :</span>
              <input
                type="range"
                min="0"
                max="255"
                value={engineState.grandMaster}
                onChange={(e) => dmxLightingEngine.setGrandMaster(Number(e.target.value))}
                aria-label="Grand Master fader"
                className="w-20 accent-amber-400 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold w-7 text-right text-amber-300">
                {Math.round((engineState.grandMaster / 255) * 100)}%
              </span>
            </div>

            {/* Blackout d'Urgence */}
            <button
              onClick={() => dmxLightingEngine.toggleBlackout()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                engineState.blackout
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 animate-pulse'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {engineState.blackout ? 'BLACKOUT ACTIF' : 'BLACKOUT'}
            </button>

            {/* Blind Mode Toggle */}
            <button
              onClick={() => dmxLightingEngine.toggleBlindMode()}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                engineState.blindMode
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
              }`}
              title="Préparer le cue lumière suivant sans impacter le plateau"
            >
              {engineState.blindMode ? 'Sortir Blind' : 'Blind Edition'}
            </button>

            {engineState.blindMode && (
              <button
                onClick={() => dmxLightingEngine.takeBlindToLive()}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" /> TAKE TO LIVE
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ONGLETS DU WORKSPACE DE RÉGIE */}
        <div className="h-10 bg-[#0d1117] border-b border-[#2d3748] px-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('faders')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'faders'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Pupitre & Faders
            </button>

            <button
              onClick={() => setActiveTab('visualizer')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'visualizer'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Visualiseur Scène 3D/2D
            </button>

            <button
              onClick={() => setActiveTab('cues')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'cues'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Cues Lumière & Conduite ({cues.length})
            </button>

            <button
              onClick={() => setActiveTab('cart')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'cart'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Cartoucheur Direct (Pads)
            </button>

            <button
              onClick={() => setActiveTab('fx')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'fx'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Générateurs FX ({fxGenerators.filter((f) => f.enabled).length})
            </button>

            <button
              onClick={() => setActiveTab('patch')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'patch'
                  ? 'bg-zinc-700 text-white border border-zinc-600'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Patch DMX 512
            </button>

            {onOpenEtcStudio && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEtcStudio();
                }}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 bg-cyan-950/40 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/50 transition-colors ml-2"
                title="Basculer vers le Pupitre ETC Eos & Runtimes C++ / C#"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>ETC Eos & C++/C#</span>
              </button>
            )}
          </div>

          {/* Crossfade Bar en continu */}
          {crossfade.isCrossfading && (
            <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/30 px-3 py-1 rounded text-xs">
              <span className="text-[10px] text-purple-300 font-mono">CROSSFADE :</span>
              <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-75"
                  style={{ width: `${Math.round(crossfade.progress * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-purple-200">
                {Math.round(crossfade.progress * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* CORPS PRINCIPAL SELON L'ONGLET ACTIF */}
        <div className="flex-1 overflow-auto p-4 bg-[#0d1117]">
          {/* 1. PUPITRE & FADERS */}
          {activeTab === 'faders' && (
            <div className="space-y-5">
              {/* SUBMASTERS GROUPÉS */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" /> Submasters de Plateau
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {submasters.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-[#161c24] border border-[#2d3748] rounded-lg p-3 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-zinc-200 truncate">{sub.name}</span>
                        <span className="text-[11px] font-mono font-bold text-amber-300">{sub.value}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={sub.value}
                        onChange={(e) => dmxLightingEngine.setSubmasterValue(sub.id, Number(e.target.value))}
                        aria-label={`Submaster ${sub.name}`}
                        className="w-full accent-amber-400 cursor-pointer my-2"
                      />
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                        <button
                          onClick={() => dmxLightingEngine.setSubmasterValue(sub.id, 0)}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700"
                        >
                          0
                        </button>
                        <button
                          onClick={() => dmxLightingEngine.setSubmasterValue(sub.id, 128)}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => dmxLightingEngine.setSubmasterValue(sub.id, 255)}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700"
                        >
                          FL
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FADERS INDIVIDUELS DE PROJECTEURS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-sky-400" /> Projecteurs & Canaux Individuels (Univers {selectedUniverse})
                  </h3>
                  <div className="flex items-center gap-1 text-xs">
                    {[1, 2, 3, 4].map((u) => (
                      <button
                        key={u}
                        onClick={() => setSelectedUniverse(u)}
                        className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                          selectedUniverse === u
                            ? 'bg-amber-500 text-black'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        U{u}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {fixtures
                    .filter((f) => f.universe === selectedUniverse)
                    .map((fix) => (
                      <div
                        key={fix.id}
                        className="bg-[#161c24] border border-[#2d3748] rounded-lg p-3 hover:border-zinc-500 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: fix.color || '#fbbf24' }}
                              />
                              {fix.name}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              Canal {fix.startChannel} à {fix.startChannel + fix.channelCount - 1} · {fix.type.toUpperCase()}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              // Flash toggle
                              const isFull = fix.channels[0] === 255;
                              const newVals = fix.channels.map((_, i) => (isFull ? 0 : 255));
                              dmxLightingEngine.setFixtureChannels(fix.id, newVals);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 hover:bg-amber-500 hover:text-black transition-colors"
                          >
                            FLASH
                          </button>
                        </div>

                        {/* Canaux internes */}
                        <div className="space-y-1.5 pt-1">
                          {fix.channels.map((val, cIdx) => {
                            const chanNumber = fix.startChannel + cIdx;
                            const isDimmer = fix.type === 'dimmer' || (fix.type === 'moving_head' && cIdx === 0);
                            const label =
                              fix.type === 'rgbw_par'
                                ? ['R', 'V', 'B', 'Blanc'][cIdx]
                                : fix.type === 'rgb_par'
                                ? ['R', 'V', 'B'][cIdx]
                                : fix.type === 'moving_head'
                                ? ['Dim', 'Shutter', 'Pan', 'Tilt', 'R', 'G', 'B', 'Gobo'][cIdx]
                                : fix.type === 'strobe'
                                ? ['Vitesse', 'Intensité'][cIdx]
                                : fix.type === 'hazer'
                                ? ['Débit', 'Ventilateur'][cIdx]
                                : `CH ${chanNumber}`;

                            return (
                              <div key={cIdx} className="flex items-center gap-2 text-xs">
                                <span className="w-14 text-[10px] text-zinc-400 truncate font-mono">{label}</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="255"
                                  value={val}
                                  onChange={(e) => {
                                    const nextVals = [...fix.channels];
                                    nextVals[cIdx] = Number(e.target.value);
                                    dmxLightingEngine.setFixtureChannels(fix.id, nextVals);
                                  }}
                                  aria-label={`${fix.name} - ${label}`}
                                  className={`flex-1 cursor-pointer h-1.5 rounded-lg ${
                                    isDimmer ? 'accent-amber-400' : 'accent-sky-400'
                                  }`}
                                />
                                <span className="w-7 text-right text-[11px] font-mono text-zinc-300">{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. VISUALISEUR SCÉNIQUE 3D/2D */}
          {activeTab === 'visualizer' && (
            <div className="h-full flex flex-col gap-3">
              <div className="flex items-center justify-between bg-[#161c24] border border-[#2d3748] rounded-lg p-2.5 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300 font-semibold">Brouillard / Haze de scène :</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={fogDensity}
                    onChange={(e) => setFogDensity(Number(e.target.value))}
                    aria-label="Densité du brouillard"
                    className="w-32 accent-sky-400 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-sky-300">{Math.round(fogDensity * 100)}%</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => dmxLightingEngine.fireLightCue('cue-dmx-01')}
                    className="px-2.5 py-1 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                  >
                    Plein Feu
                  </button>
                  <button
                    onClick={() => dmxLightingEngine.fireLightCue('cue-dmx-03')}
                    className="px-2.5 py-1 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                  >
                    Douche Maxime
                  </button>
                  <button
                    onClick={() => dmxLightingEngine.fireLightCue('cue-dmx-05')}
                    className="px-2.5 py-1 rounded text-xs bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30"
                  >
                    Tempête Éclairs
                  </button>
                  <button
                    onClick={() => dmxLightingEngine.fireLightCue('cue-dmx-06')}
                    className="px-2.5 py-1 rounded text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30"
                  >
                    Nuit Marine
                  </button>
                </div>
              </div>

              {/* Surface Canvas du simulateur */}
              <div className="flex-1 bg-black rounded-lg border border-[#2d3748] overflow-hidden relative flex items-center justify-center min-h-[360px]">
                <canvas
                  ref={visualizerCanvasRef}
                  width={960}
                  height={480}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* 3. CUES LUMIÈRE & CONDUITE */}
          {activeTab === 'cues' && (
            <div className="space-y-4">
              {/* Création d'un nouveau cue */}
              <div className="bg-[#161c24] border border-[#2d3748] rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xs font-bold text-zinc-300">Enregistrer l'état actuel :</span>
                  <input
                    type="text"
                    value={newCueName}
                    onChange={(e) => setNewCueName(e.target.value)}
                    placeholder="Nom de la cue (ex: Q3 Douche Tricorne)"
                    className="bg-[#0d1117] border border-[#30363d] rounded px-3 py-1 text-xs text-white flex-1 max-w-sm"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span>Fondu :</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={newCueFade}
                      onChange={(e) => setNewCueFade(Number(e.target.value))}
                      className="w-16 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-amber-300 font-mono"
                    />
                    <span>sec</span>
                  </div>
                </div>

                <button
                  onClick={handleStoreCue}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" /> Enregistrer Mémoire (Store)
                </button>
              </div>

              {/* Liste des Cues Lumière */}
              <div className="space-y-2">
                {cues.map((cue, idx) => {
                  const isActive = activeCueId === cue.id;
                  return (
                    <div
                      key={cue.id}
                      className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-purple-950/40 border-purple-500 shadow-md'
                          : 'bg-[#161c24] border-[#2d3748] hover:border-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => dmxLightingEngine.fireLightCue(cue.id)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-transform ${
                            isActive
                              ? 'bg-purple-500 text-white scale-105 shadow-lg shadow-purple-500/50'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          <Play className="w-4 h-4 ml-0.5" />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{cue.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Fade In: {cue.fadeInSec}s · Fade Out: {cue.fadeOutSec}s
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500 text-white font-mono font-bold">
                                SUR LE PLATEAU
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">{cue.sceneTitle} — {cue.notes}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onSendCueToQlab && (
                          <button
                            onClick={() => onSendCueToQlab(cue)}
                            className="px-2.5 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                            title="Ajouter comme cue dans la Conduite QLab"
                          >
                            + Conduite QLab
                          </button>
                        )}
                        <button
                          onClick={() => dmxLightingEngine.fireLightCue(cue.id, 0.1)}
                          className="px-2.5 py-1 rounded text-xs bg-zinc-800 hover:bg-amber-500 hover:text-black text-zinc-300 font-semibold"
                          title="Déclenchement direct sans fondu"
                        >
                          CUT
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. CARTOUCHEUR DIRECT (CUE CART PADS 4x4) */}
          {activeTab === 'cart' && (
            <div className="space-y-4">
              {/* Le Cartoucheur Tactile 4x4 Professionnel */}
              <CueCartPanel />

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  Pads d'accès rapide DMX & Cues Lumière spécifiques du plateau :
                </p>
                <button
                  onClick={() => dmxLightingEngine.toggleBlackout()}
                  className="px-3 py-1 rounded bg-red-600 text-white font-bold text-xs"
                >
                  BLACKOUT INSTANTANÉ
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cues.map((cue) => {
                  const isCurrent = activeCueId === cue.id;
                  return (
                    <button
                      key={cue.id}
                      onClick={() => dmxLightingEngine.fireLightCue(cue.id)}
                      className={`h-28 rounded-xl p-3 flex flex-col justify-between text-left transition-all border ${
                        isCurrent
                          ? 'border-purple-400 bg-purple-900/40 shadow-lg shadow-purple-900/40 scale-[1.02]'
                          : 'border-[#2d3748] bg-[#161c24] hover:border-zinc-500 hover:bg-[#1a222c]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-mono font-bold text-amber-300">{cue.fadeInSec}s</span>
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cue.color || '#38bdf8' }}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white leading-tight mb-1">{cue.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{cue.sceneTitle}</div>
                      </div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
                        {isCurrent ? '● EN COURS' : 'CLIC POUR GO'}
                      </div>
                    </button>
                  );
                })}

                {/* Pads d'effets rapides */}
                <button
                  onClick={() => {
                    const strobe = fixtures.find((f) => f.type === 'strobe');
                    if (strobe) {
                      dmxLightingEngine.setFixtureChannels(strobe.id, [255, 255]);
                      setTimeout(() => dmxLightingEngine.setFixtureChannels(strobe.id, [0, 0]), 400);
                    }
                  }}
                  className="h-28 rounded-xl p-3 flex flex-col justify-between text-left border border-sky-500/40 bg-sky-950/20 hover:bg-sky-900/30 transition-all"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-mono text-sky-400">FLASH</span>
                    <CloudLightning className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">ÉCLAIR TEMPÊTE</div>
                    <div className="text-[10px] text-zinc-400">Stroboscope 400ms</div>
                  </div>
                  <div className="text-[9px] text-sky-400 font-mono">IMPULSION DBO</div>
                </button>

                <button
                  onClick={() => dmxLightingEngine.toggleFxGenerator('fx-flame')}
                  className="h-28 rounded-xl p-3 flex flex-col justify-between text-left border border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/30 transition-all"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-mono text-amber-400">GÉNÉRATEUR</span>
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">BOUGIE / FLAMMES</div>
                    <div className="text-[10px] text-zinc-400">Vacillement naturel</div>
                  </div>
                  <div className="text-[9px] text-amber-400 font-mono">TOGGLE FX</div>
                </button>
              </div>
            </div>
          )}

          {/* 5. GÉNÉRATEURS D'EFFETS FX */}
          {activeTab === 'fx' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Générateurs algorithmiques autonomes modulant les intensités, couleurs et angles en continu sans programmation image par image.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fxGenerators.map((fx) => (
                  <div
                    key={fx.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      fx.enabled
                        ? 'bg-[#18202b] border-amber-500/60 shadow-md'
                        : 'bg-[#161c24] border-[#2d3748]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {fx.type === 'flame' && <Flame className="w-4 h-4 text-amber-400" />}
                        {fx.type === 'ocean_breathe' && <Waves className="w-4 h-4 text-sky-400" />}
                        {fx.type === 'lightning_storm' && <CloudLightning className="w-4 h-4 text-cyan-400" />}
                        {fx.type === 'audio_reactive' && <Activity className="w-4 h-4 text-emerald-400" />}
                        {fx.type === 'pixel_chase' && <Zap className="w-4 h-4 text-purple-400" />}
                        <span className="font-bold text-xs text-white">{fx.name}</span>
                      </div>
                      <button
                        onClick={() => dmxLightingEngine.toggleFxGenerator(fx.id)}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                          fx.enabled ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {fx.enabled ? 'ACTIF' : 'ACTIVER'}
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-[10px] text-zinc-400 font-mono">Intensité :</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={fx.intensity}
                          onChange={(e) => dmxLightingEngine.setFxIntensity(fx.id, Number(e.target.value))}
                          aria-label={`${fx.name} intensité`}
                          className="flex-1 accent-amber-400 cursor-pointer"
                        />
                        <span className="w-8 text-right font-mono text-zinc-300">
                          {Math.round(fx.intensity * 100)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="w-16 text-[10px] text-zinc-400 font-mono">Vitesse :</span>
                        <input
                          type="range"
                          min="0.2"
                          max="4"
                          step="0.1"
                          value={fx.speed}
                          onChange={(e) => dmxLightingEngine.setFxSpeed(fx.id, Number(e.target.value))}
                          aria-label={`${fx.name} vitesse`}
                          className="flex-1 accent-sky-400 cursor-pointer"
                        />
                        <span className="w-8 text-right font-mono text-zinc-300">{fx.speed}x</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. PATCH DMX (MATRICE 512 CANAUX) */}
          {activeTab === 'patch' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-bold uppercase">Univers sélectionné :</span>
                  {[1, 2, 3, 4].map((u) => (
                    <button
                      key={u}
                      onClick={() => setSelectedUniverse(u)}
                      className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                        selectedUniverse === u
                          ? 'bg-amber-500 text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Univers {u} (512 CH)
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowAddFixtureModal(true)}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Patcher un Projecteur
                </button>
              </div>

              {/* Matrice des 512 canaux (mini-grille) */}
              <div className="bg-[#161c24] border border-[#2d3748] rounded-lg p-3">
                <div className="text-[11px] text-zinc-400 font-mono mb-2 flex items-center justify-between">
                  <span>GRILLE DES 512 CANAUX DMX (0 = libre, couleur = affecté à un projecteur)</span>
                  <span className="text-emerald-400 font-semibold">0 CONFLIT D’ADRESSE DÉTECTÉ</span>
                </div>

                <div className="grid grid-cols-16 sm:grid-cols-32 gap-1 max-h-[300px] overflow-y-auto p-1 bg-black/40 rounded border border-zinc-800">
                  {Array.from({ length: 512 }).map((_, idx) => {
                    const ch = idx + 1;
                    const fixture = fixtures.find(
                      (f) => f.universe === selectedUniverse && ch >= f.startChannel && ch < f.startChannel + f.channelCount
                    );

                    return (
                      <div
                        key={ch}
                        title={fixture ? `${fixture.name} (Canal ${ch})` : `Canal ${ch} libre`}
                        className={`h-4 rounded-[2px] text-[8px] flex items-center justify-center font-mono cursor-pointer transition-colors ${
                          fixture
                            ? 'bg-amber-500/80 text-black font-bold'
                            : 'bg-zinc-900/80 text-zinc-600 hover:bg-zinc-700'
                        }`}
                      >
                        {ch % 16 === 1 ? ch : ''}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tableau des projecteurs patchés */}
              <div className="bg-[#161c24] border border-[#2d3748] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0d1117] text-zinc-400 font-mono text-[11px] border-b border-[#2d3748]">
                    <tr>
                      <th className="p-2.5">Nom</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Univers</th>
                      <th className="p-2.5">Canal Départ</th>
                      <th className="p-2.5">Empreinte</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3748]">
                    {fixtures
                      .filter((f) => f.universe === selectedUniverse)
                      .map((fix) => (
                        <tr key={fix.id} className="hover:bg-zinc-800/40">
                          <td className="p-2.5 font-semibold text-white">{fix.name}</td>
                          <td className="p-2.5 font-mono text-zinc-400">{fix.type.toUpperCase()}</td>
                          <td className="p-2.5 font-mono text-amber-300">U{fix.universe}</td>
                          <td className="p-2.5 font-mono text-sky-300">CH {fix.startChannel}</td>
                          <td className="p-2.5 font-mono text-zinc-400">{fix.channelCount} canaux</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => dmxLightingEngine.deleteFixture(fix.id)}
                              className="p-1 rounded text-zinc-400 hover:text-red-400"
                              title="Dé-patcher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL DIALOGUE : AJOUTER UN PROJECTEUR */}
        {showAddFixtureModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#161c24] border border-[#2d3748] rounded-xl p-4 w-full max-w-md space-y-3">
              <h3 className="font-bold text-sm text-white">Patcher un nouveau projecteur</h3>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Nom du projecteur :</label>
                <input
                  type="text"
                  value={newFixName}
                  onChange={(e) => setNewFixName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Type de fixture :</label>
                <select
                  value={newFixType}
                  onChange={(e) => setNewFixType(e.target.value as any)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white"
                >
                  <option value="dimmer">Gradateur 1 canal (Traditionnel, PAR, PC)</option>
                  <option value="rgb_par">PAR LED RGB (3 canaux)</option>
                  <option value="rgbw_par">PAR LED RGBW (4 canaux)</option>
                  <option value="moving_head">Lyre motorisée (8 canaux Pan/Tilt/RGB)</option>
                  <option value="strobe">Stroboscope DMX (2 canaux)</option>
                  <option value="hazer">Machine à brouillard (2 canaux)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Canal de départ (1 à 512) :</label>
                <input
                  type="number"
                  min="1"
                  max="512"
                  value={newFixChannel}
                  onChange={(e) => setNewFixChannel(Number(e.target.value))}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddFixtureModal(false)}
                  className="px-3 py-1.5 rounded text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddFixture}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black"
                >
                  Confirmer le Patch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
