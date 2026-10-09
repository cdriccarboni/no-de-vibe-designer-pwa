// Composant Scénographie Vivante — PIRATES PAILLETTES ! V2.1.26
// Conduite multipiste, Shaders textuels, Bruitages physiques, Dessin direct, Anaglyphe et Régie

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ScriptCueItem,
  ExecutionLogEntry,
  ParametricShaderConfig,
  AnaglyphConfig,
  DramaturgicalScenePreset,
  LiveDrawingObject,
  FoleySoundPresetId
} from '../types/livingScenography';
import {
  CANONICAL_PIRATES_SCENES,
  CANONICAL_DRAWINGS
} from '../services/piratesScriptCues';
import {
  PARAMETRIC_SHADERS_CATALOG,
  renderShader2DFallback
} from '../services/livingScenographyShaders';
import { livingAudio, FOLEY_CATALOG } from '../services/livingScenographyAudio';
import {
  Play,
  Pause,
  Square,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  Eye,
  Sliders,
  Sparkles,
  BookOpen,
  Camera,
  PenTool,
  Clock,
  Layers,
  Shield,
  Activity,
  CheckCircle2,
  CornerDownRight,
  Sun,
  Flame,
  ArrowRight,
  Maximize2
} from 'lucide-react';

interface LivingScenographyViewProps {
  onReturnToStudio: () => void;
  onOpenTechnicalLab: () => void;
}

export const LivingScenographyView: React.FC<LivingScenographyViewProps> = ({
  onReturnToStudio,
  onOpenTechnicalLab
}) => {
  // 1. SCÈNE ACTIVE & CONDUCTEUR
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const currentScene: DramaturgicalScenePreset = CANONICAL_PIRATES_SCENES[activeSceneIndex];

  const [cues, setCues] = useState<ScriptCueItem[]>(currentScene.initialCues);
  const [activeCueId, setActiveCueId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);

  // Journal d'exécution horodaté
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([
    {
      id: 'log-init',
      timestamp: new Date().toLocaleTimeString(),
      cueId: 'init',
      cueLabel: 'Régie Scénographie Vivante initialisée',
      track: 'regie',
      action: 'Système en veille — Conducteur armé'
    }
  ]);

  // 2. ÉTATS DE RÉGIE & ÉCLAIRAGE
  const [onAir, setOnAir] = useState<boolean>(currentScene.onAirState);
  const [lightMode, setLightMode] = useState<'blackout' | 'shower_spot' | 'lightning_flash' | 'emergency_red' | 'full'>(
    currentScene.defaultLightMode
  );
  const [isDucked10dB, setIsDucked10dB] = useState<boolean>(false);
  const [isBinauralMode, setIsBinauralMode] = useState<boolean>(false);

  // 3. SHADERS PARAMÉTRIQUES & ANAGLYPHE
  const [activeShaderConfig, setActiveShaderConfig] = useState<ParametricShaderConfig>(() => {
    return (
      PARAMETRIC_SHADERS_CATALOG.find((s) => s.id === currentScene.defaultShader) ||
      PARAMETRIC_SHADERS_CATALOG[0]
    );
  });

  const [anaglyph, setAnaglyph] = useState<AnaglyphConfig>({
    enabled: currentScene.anaglyphActive,
    convergence: 7,
    intensity: 0.9,
    colorPair: 'red_cyan',
    visualComfortWarning: true,
    pure2DFallback: false
  });

  // 4. MODULE « DESSIN QUI DEVIENT MONDE »
  const [drawings, setDrawings] = useState<LiveDrawingObject[]>(CANONICAL_DRAWINGS);
  const [activeDrawingId, setActiveDrawingId] = useState<string>(
    currentScene.associatedDrawingId || CANONICAL_DRAWINGS[0].id
  );
  const activeDrawing = drawings.find((d) => d.id === activeDrawingId) || drawings[0];

  // 5. MODULE PRÉSENCE VIDÉO & FACE TRACKING (TOUCHDESIGNER)
  const [videoMode, setVideoMode] = useState<'neutral_silhouette' | 'demo_actor' | 'webcam_optin'>('neutral_silhouette');
  const [trackingPointsActive, setTrackingPointsActive] = useState<boolean>(true);

  // 6. ONGLETS DU VOLET DE CONTRÔLE DE DROITE
  const [activeTab, setActiveTab] = useState<'dramaturgy' | 'shaders' | 'drawing' | 'tracking' | 'foley'>('dramaturgy');

  // Mise à jour de la scène lors du changement de sélection
  const handleSelectScene = (index: number) => {
    setActiveSceneIndex(index);
    const scene = CANONICAL_PIRATES_SCENES[index];
    setCues(scene.initialCues);
    setActiveCueId(null);
    setCurrentTimeSec(0);
    setIsPlaying(false);
    setOnAir(scene.onAirState);
    setLightMode(scene.defaultLightMode);
    setAnaglyph((prev) => ({ ...prev, enabled: scene.anaglyphActive }));

    const matchingShader = PARAMETRIC_SHADERS_CATALOG.find((s) => s.id === scene.defaultShader);
    if (matchingShader) setActiveShaderConfig(matchingShader);
    if (scene.associatedDrawingId) setActiveDrawingId(scene.associatedDrawingId);

    // Bruitage par défaut de la scène
    livingAudio.triggerFoley(scene.defaultSoundPreset, 0.7);

    addLog('scene_switch', `Chargement Scène : ${scene.title}`, 'regie', 'Préréglage sécurisé restauré');
  };

  const addLog = useCallback((cueId: string, cueLabel: string, track: any, action: string) => {
    const entry: ExecutionLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      cueId,
      cueLabel,
      track,
      action
    };
    setExecutionLogs((prev) => [entry, ...prev.slice(0, 49)]);
  }, []);

  // 7. ACTIONS DE RÉGIE PRINCIPALES (GO, HOLD, STOP, BLACKOUT, REPRISE)
  const triggerCue = useCallback((cue: ScriptCueItem) => {
    setActiveCueId(cue.id);
    setCurrentTimeSec(cue.timeSec);

    // Exécution du payload
    if (cue.actionPayload) {
      if (cue.actionPayload.shaderId) {
        const targetShader = PARAMETRIC_SHADERS_CATALOG.find((s) => s.id === cue.actionPayload?.shaderId);
        if (targetShader) setActiveShaderConfig(targetShader);
      }
      if (cue.actionPayload.lightState) {
        setLightMode(cue.actionPayload.lightState);
      }
      if (cue.actionPayload.onAir !== undefined) {
        setOnAir(cue.actionPayload.onAir);
      }
      if (cue.actionPayload.soundPresetId) {
        livingAudio.triggerFoley(cue.actionPayload.soundPresetId as FoleySoundPresetId);
      }
      if (cue.actionPayload.anaglyphEnabled !== undefined) {
        setAnaglyph((prev) => ({ ...prev, enabled: cue.actionPayload!.anaglyphEnabled! }));
      }
      if (cue.actionPayload.volumeFadeDb !== undefined) {
        const duck = cue.actionPayload.volumeFadeDb <= -10;
        setIsDucked10dB(duck);
        livingAudio.setDucking10dB(duck);
      }
      if (cue.actionPayload.drawingId) {
        setActiveDrawingId(cue.actionPayload.drawingId);
      }
    }

    addLog(cue.id, cue.label, cue.track, `DÉCLENCHÉ [${cue.trackCode}] · p.${cue.pageNumber}`);
  }, [addLog]);

  const handleGo = () => {
    if (!cues.length) return;
    const currentIdx = cues.findIndex((c) => c.id === activeCueId);
    const nextCue = currentIdx >= 0 && currentIdx < cues.length - 1 ? cues[currentIdx + 1] : cues[0];
    triggerCue(nextCue);
    setIsPlaying(true);
  };

  const handleHold = () => {
    setIsPlaying(false);
    addLog(activeCueId || 'hold', 'PAUSE / HOLD', 'regie', 'Plateau figé en l’état');
  };

  const handleBlackout = () => {
    setLightMode('blackout');
    setOnAir(false);
    setIsPlaying(false);
    addLog('panic-blackout', 'BLACKOUT GÉNÉRAL D’URGENCE', 'light', 'Sécurité plateau active');
  };

  const handleReprise = () => {
    setIsPlaying(true);
    addLog(activeCueId || 'reprise', 'REPRISE DU CONDUCTEUR', 'regie', 'Horloge relancée');
  };

  const handleResetSafe = () => {
    setLightMode(currentScene.defaultLightMode);
    setOnAir(currentScene.onAirState);
    setIsPlaying(false);
    setCurrentTimeSec(0);
    setActiveCueId(null);
    setAnaglyph((prev) => ({ ...prev, pure2DFallback: false }));
    addLog('safe-reset', 'RETOUR AU PRESET SÛR', 'regie', currentScene.safeFallbackExplanation);
  };

  // 8. BOUCLE TEMPORELLE DE LECTURE (60 FPS)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        setCurrentTimeSec((prev) => prev + dt);
      }

      // Rendu du plateau composite sur Canvas 2D / WebGL Fallback
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
          }

          // 1. Rendu Shader de fond (Limbes, Tempête, Water Sim, Abysses, Wispy)
          renderShader2DFallback(
            ctx,
            canvas.width,
            canvas.height,
            currentTimeSec,
            activeShaderConfig,
            anaglyph,
            0.4
          );

          // 2. Rendu Éclairage Plateau & Douche de Maxime
          if (lightMode === 'shower_spot') {
            const showerGrad = ctx.createRadialGradient(
              canvas.width * 0.5,
              canvas.height * 0.65,
              15,
              canvas.width * 0.5,
              canvas.height * 0.65,
              canvas.height * 0.5
            );
            showerGrad.addColorStop(0, 'rgba(255, 245, 215, 0.35)');
            showerGrad.addColorStop(0.5, 'rgba(255, 230, 180, 0.12)');
            showerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = showerGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          } else if (lightMode === 'emergency_red') {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          } else if (lightMode === 'blackout') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          // 3. Rendu du Rideau de Fils en fond de scène (lignes verticales diaphanes)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          for (let x = 0; x < canvas.width; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }

          // 4. Rendu du Dessin en Direct (La porte d'Alexandra ou les 3 baleines)
          if (activeDrawing && activeDrawing.strokes.length > 0) {
            ctx.save();
            activeDrawing.strokes.forEach((stroke) => {
              if (stroke.points.length < 2) return;
              ctx.beginPath();
              ctx.strokeStyle = stroke.color;
              ctx.lineWidth = stroke.width;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';

              const maxPoints = Math.round(stroke.points.length * activeDrawing.revealProgress);
              for (let i = 0; i < maxPoints; i++) {
                const pt = stroke.points[i];
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              }
              ctx.stroke();
            });
            ctx.restore();
          }

          // 5. Rendu de l'Ombre du Capitaine Crunch (Silhouette au profil avec tricorne et flûte)
          if (activeSceneIndex === 2 || activeSceneIndex === 6 || activeSceneIndex === 3) {
            ctx.save();
            ctx.fillStyle = 'rgba(15, 17, 23, 0.92)';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 12;

            const px = canvas.width * 0.48;
            const py = canvas.height * 0.68;

            // Buste et redingote
            ctx.beginPath();
            ctx.ellipse(px, py - 40, 24, 45, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tête et tricorne
            ctx.beginPath();
            ctx.arc(px, py - 95, 16, 0, Math.PI * 2);
            ctx.fill();

            // Chapeau tricorne
            ctx.beginPath();
            ctx.moveTo(px - 32, py - 105);
            ctx.lineTo(px + 32, py - 105);
            ctx.lineTo(px, py - 128);
            ctx.closePath();
            ctx.fill();

            // Flûte traversière en main
            ctx.strokeStyle = '#d7b86a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(px + 10, py - 90);
            ctx.lineTo(px + 55, py - 95);
            ctx.stroke();

            ctx.restore();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentTimeSec, activeShaderConfig, anaglyph, lightMode, activeDrawing, activeSceneIndex]);

  return (
    <div className="flex flex-col h-[calc(100vh-53px)] bg-[#0d0f12] text-[#f2f3f4] overflow-hidden select-none font-sans">
      {/* 1. TOP BAR : SÉLECTEUR DES 8 SCÈNES CANONIQUES & COMMANDES RÉGIE */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[#121519] border-b border-[#282f38] shrink-0 text-xs">
        {/* Left : Titre de l'œuvre & Sélecteur de scène */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold tracking-wide uppercase text-amber-300 text-[11px] font-mono">
              Pirates Paillettes ! V2.1.26
            </span>
          </div>

          <span className="text-zinc-600">|</span>

          {/* Selecteur des 8 scènes canoniques */}
          <select
            value={activeSceneIndex}
            onChange={(e) => handleSelectScene(parseInt(e.target.value, 10))}
            className="bg-[#181c22] border border-[#353e4a] text-amber-200 font-medium rounded px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 cursor-pointer max-w-[280px] truncate"
          >
            {CANONICAL_PIRATES_SCENES.map((scene, idx) => (
              <option key={scene.id} value={idx}>
                {scene.title} ({scene.scriptPages})
              </option>
            ))}
          </select>
        </div>

        {/* Center : Indicateurs direct du manuscrit (ON AIR, Douche, -10 dB, Anaglyphe) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Voyant ON AIR */}
          <button
            onClick={() => setOnAir(!onAir)}
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 border ${
              onAir
                ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                : 'bg-[#181c22] text-zinc-500 border-zinc-700'
            }`}
            title="Didascalies p. 4, 13, 16 : Voyant ON AIR commuté en régie"
          >
            <Radio className="w-3 h-3" />
            <span>ON AIR</span>
          </button>

          {/* Témoin -10 dB */}
          <button
            onClick={() => {
              const next = !isDucked10dB;
              setIsDucked10dB(next);
              livingAudio.setDucking10dB(next);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
              isDucked10dB
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                : 'bg-[#181c22] text-zinc-500 border-zinc-700'
            }`}
            title="Didascalie p. 5 : La musique baisse de 10 dB"
          >
            <span>-10 dB</span>
          </button>

          {/* Anaglyphe switch */}
          <button
            onClick={() => setAnaglyph((prev) => ({ ...prev, pure2DFallback: !prev.pure2DFallback }))}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
              anaglyph.enabled && !anaglyph.pure2DFallback
                ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                : 'bg-[#181c22] text-zinc-400 border-zinc-700'
            }`}
            title="Bascule immédiate : Anaglyphe Stéréoscopique 3D vs Secours 2D sans lunettes"
          >
            <span>{anaglyph.pure2DFallback ? '2D Pure' : 'Anaglyphe 3D'}</span>
          </button>

          {/* Éclairage plateau */}
          <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 bg-[#181c22] border border-[#2b333e] rounded">
            Lumière : <strong className="text-amber-300 font-normal">{lightMode}</strong>
          </span>
        </div>

        {/* Right : Bouton retour Studio et Sous le Capot */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetSafe}
            className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-[#181c22] hover:bg-[#222730] border border-[#2d3540] rounded transition-colors flex items-center gap-1"
            title="Restaurer l'état sûr sans modifier les fichiers existants"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Preset Sûr</span>
          </button>

          <button
            onClick={onReturnToStudio}
            className="px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 bg-[#181c22] hover:bg-[#222730] border border-amber-800/80 rounded transition-colors flex items-center gap-1.5"
            title="Revenir au plateau studio et à la Timeline Millumin"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Studio Général</span>
          </button>

          <button
            onClick={onOpenTechnicalLab}
            className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-[#181c22] hover:bg-[#222730] border border-[#2d3540] rounded transition-colors flex items-center gap-1"
            title="Basculer vers l'éditeur de code et les consoles"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sous le capot</span>
          </button>
        </div>
      </div>

      {/* 2. CORPS PRINCIPAL : CONDUCTEUR & CANVAS (GAUCHE) + VOLET DE RÉGIE (DROITE) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Colonne Gauche / Centre : Canvas Plateau (Haut) + Table du Conducteur Multipiste (Bas) */}
        <div className="flex-1 flex flex-col bg-black overflow-hidden min-h-0">
          {/* Plateau Canvas de Scène (Rendu Shaders + Dessin + Rideau de Fils) */}
          <div className="flex-1 relative bg-[#06080b] flex items-center justify-center overflow-hidden min-h-[220px]">
            <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

            {/* Badges d'état en surimpression discrète */}
            <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
              <div className="bg-[#101317]/85 backdrop-blur-md border border-[#2a323d] rounded px-2.5 py-1 text-[11px] flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-amber-300">{currentScene.title}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-300 font-mono text-[10px]">{activeShaderConfig.name}</span>
              </div>
            </div>

            <div className="absolute top-3 right-3 pointer-events-none flex items-center gap-2">
              {anaglyph.enabled && (
                <div className="bg-rose-950/80 backdrop-blur-md border border-rose-800/80 rounded px-2 py-0.5 text-[10px] text-rose-300 font-mono">
                  {anaglyph.pure2DFallback ? 'Secours 2D' : `Anaglyphe (Conv. ${anaglyph.convergence}px)`}
                </div>
              )}
              {isDucked10dB && (
                <div className="bg-cyan-950/80 backdrop-blur-md border border-cyan-800/80 rounded px-2 py-0.5 text-[10px] text-cyan-300 font-mono">
                  Atténuation -10 dB active
                </div>
              )}
            </div>
          </div>

          {/* BARRE DE TRANSPORT DE RÉGIE (GO, HOLD, STOP, BLACKOUT, PAUSE, REPRISE) */}
          <div className="px-4 py-2 bg-[#121519] border-t border-[#282f38] flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2">
              {/* GO Principal */}
              <button
                onClick={handleGo}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow-md text-xs"
                title="Déclencher le TOP / Cue suivant dans le conducteur"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>GO</span>
              </button>

              {/* HOLD / PAUSE */}
              <button
                onClick={handleHold}
                className="px-3 py-1.5 bg-[#1e242c] hover:bg-[#28303a] text-amber-300 border border-[#353f4d] rounded font-medium transition-colors flex items-center gap-1"
                title="Mettre en pause l'horloge et figer le plateau"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>HOLD</span>
              </button>

              {/* REPRISE */}
              <button
                onClick={handleReprise}
                className="px-3 py-1.5 bg-[#1e242c] hover:bg-[#28303a] text-cyan-300 border border-[#353f4d] rounded font-medium transition-colors flex items-center gap-1"
                title="Reprendre l'avancement temporel"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>REPRISE</span>
              </button>

              {/* BLACKOUT D'URGENCE */}
              <button
                onClick={handleBlackout}
                className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded font-bold transition-colors flex items-center gap-1"
                title="Couper instantanément toute la lumière et les projections (sécurité)"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>BLACKOUT</span>
              </button>
            </div>

            {/* Horloge / Timecode */}
            <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
              <span>Chronomètre : <strong className="text-amber-300">{currentTimeSec.toFixed(1)}s</strong></span>
              <span>Cues : <strong className="text-zinc-200">{cues.length}</strong></span>
            </div>
          </div>

          {/* TABLE DU CONDUCTEUR MULTIPISTE */}
          <div className="h-48 overflow-y-auto bg-[#0d0f12] border-t border-[#232932] text-xs">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#14171c] text-[#a0a8b0] sticky top-0 border-b border-[#282f38] text-[10px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-2 px-3 w-16">Piste</th>
                  <th className="py-2 px-2 w-14">Page</th>
                  <th className="py-2 px-3">Intitulé & Didascalie</th>
                  <th className="py-2 px-3 w-28">Déclencheur</th>
                  <th className="py-2 px-3 w-24">Durée</th>
                  <th className="py-2 px-3 w-20 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e232a]">
                {cues.map((cue) => {
                  const isActive = cue.id === activeCueId;
                  const trackBadgeColor =
                    cue.track === 'video'
                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                      : cue.track === 'light'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : cue.track === 'sound'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : cue.track === 'stage'
                      ? 'bg-blue-950 text-blue-300 border-blue-800'
                      : 'bg-red-950 text-red-300 border-red-800';

                  return (
                    <tr
                      key={cue.id}
                      onClick={() => triggerCue(cue)}
                      className={`cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-amber-500/15 text-white'
                          : 'hover:bg-[#14181f] text-[#cbd5e1]'
                      }`}
                    >
                      <td className="py-2 px-3 font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${trackBadgeColor}`}>
                          {cue.trackCode}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono text-zinc-400 text-[11px]">
                        p.{cue.pageNumber}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-xs leading-snug">{cue.label}</div>
                        <div className="text-[10px] text-zinc-400 italic line-clamp-1 mt-0.5">
                          {cue.description}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-zinc-400">
                        {cue.triggerMode}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-zinc-400">
                        {cue.durationSec}s
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerCue(cue);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            isActive
                              ? 'bg-amber-400 text-black border-amber-400'
                              : 'bg-[#1c222a] hover:bg-[#252c36] text-zinc-300 border-[#323b47]'
                          }`}
                        >
                          {isActive ? 'ACTIF' : 'GO'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Volet Latéral Droit : Onglets Dédiés (Dramaturgie, Shaders, Dessin, Face Tracking, Bruitages) */}
        <div className="w-full lg:w-96 bg-[#13161a] border-t lg:border-t-0 lg:border-l border-[#282f38] flex flex-col justify-between overflow-hidden shrink-0">
          {/* Header des Onglets */}
          <div className="flex bg-[#0f1115] border-b border-[#282f38] p-1 gap-1 shrink-0 overflow-x-auto text-[11px]">
            <button
              onClick={() => setActiveTab('dramaturgy')}
              className={`flex-1 py-1.5 px-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                activeTab === 'dramaturgy'
                  ? 'bg-[#1b2027] text-amber-300 border border-[#353f4d]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Dramaturgie</span>
            </button>
            <button
              onClick={() => setActiveTab('shaders')}
              className={`flex-1 py-1.5 px-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                activeTab === 'shaders'
                  ? 'bg-[#1b2027] text-purple-300 border border-[#353f4d]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Shaders</span>
            </button>
            <button
              onClick={() => setActiveTab('drawing')}
              className={`flex-1 py-1.5 px-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                activeTab === 'drawing'
                  ? 'bg-[#1b2027] text-cyan-300 border border-[#353f4d]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Dessin</span>
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 py-1.5 px-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                activeTab === 'tracking'
                  ? 'bg-[#1b2027] text-emerald-300 border border-[#353f4d]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Tracking</span>
            </button>
            <button
              onClick={() => setActiveTab('foley')}
              className={`flex-1 py-1.5 px-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                activeTab === 'foley'
                  ? 'bg-[#1b2027] text-amber-200 border border-[#353f4d]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Bruitages</span>
            </button>
          </div>

          {/* Contenu de l'Onglet Actif */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. DRAMATURGIE & NOTES DE MISE EN SCÈNE */}
            {activeTab === 'dramaturgy' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-[#171b22] border border-[#2b333e] rounded-lg space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                    {currentScene.scriptPages}
                  </span>
                  <h3 className="font-bold text-sm text-white">{currentScene.title}</h3>
                  <p className="text-[#cbd5e1] leading-relaxed text-[11px]">{currentScene.summary}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[10px]">
                    Intentions Scéniques & Dramaturgie
                  </h4>
                  <p className="text-zinc-300 text-[11px] leading-relaxed p-2.5 bg-[#0e1014] border border-[#20252d] rounded">
                    {currentScene.dramaturgyIntent}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[10px]">
                    Éléments Concrets Attestés dans le Manuscrit
                  </h4>
                  <ul className="space-y-1.5">
                    {currentScene.keyElements.map((el, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-[#a0a8b0]">
                        <span className="text-amber-400 font-bold mt-0.5">›</span>
                        <span>{el}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-[#11171f] border border-[#1f2835] rounded-lg text-[10px] text-zinc-400 space-y-1">
                  <span className="font-semibold text-cyan-300 block">Protocole de test sans matériel réel :</span>
                  <p>{currentScene.testingWithoutHardwareGuide}</p>
                </div>
              </div>
            )}

            {/* 2. SHADERS PARAMÉTRIQUES & ANAGLYPHE RESPONSABLE */}
            {activeTab === 'shaders' && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Shader Vidéo Numérique Attesté
                  </label>
                  <select
                    value={activeShaderConfig.id}
                    onChange={(e) => {
                      const found = PARAMETRIC_SHADERS_CATALOG.find((s) => s.id === e.target.value);
                      if (found) setActiveShaderConfig(found);
                    }}
                    className="w-full bg-[#181c22] border border-[#353e4a] text-purple-200 font-semibold rounded p-2 text-xs focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    {PARAMETRIC_SHADERS_CATALOG.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (p. {s.didascaliePage})
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed italic p-2 bg-[#0e1014] border border-[#20252d] rounded">
                  {activeShaderConfig.description}
                </p>

                {/* Paramètres No-Code du Shader */}
                <div className="space-y-3 bg-[#171b22] p-3 rounded-lg border border-[#2b333e]">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-300">Intensité visuelle</span>
                    <span className="font-mono text-purple-300">{activeShaderConfig.intensity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.05}
                    value={activeShaderConfig.intensity}
                    onChange={(e) =>
                      setActiveShaderConfig({ ...activeShaderConfig, intensity: parseFloat(e.target.value) })
                    }
                    className="w-full h-1 bg-zinc-700 rounded accent-purple-400 cursor-pointer"
                  />

                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-zinc-300">Vitesse cinétique</span>
                    <span className="font-mono text-purple-300">{activeShaderConfig.speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={3.0}
                    step={0.05}
                    value={activeShaderConfig.speed}
                    onChange={(e) =>
                      setActiveShaderConfig({ ...activeShaderConfig, speed: parseFloat(e.target.value) })
                    }
                    className="w-full h-1 bg-zinc-700 rounded accent-purple-400 cursor-pointer"
                  />

                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-zinc-300">Teinte de palette</span>
                    <span className="font-mono text-purple-300">{activeShaderConfig.paletteHue}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={activeShaderConfig.paletteHue}
                    onChange={(e) =>
                      setActiveShaderConfig({ ...activeShaderConfig, paletteHue: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-1 bg-zinc-700 rounded accent-purple-400 cursor-pointer"
                  />
                </div>

                {/* Contrôles du Module Anaglyphe Responsable */}
                <div className="p-3 bg-[#18151b] border border-[#3b2b40] rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-300 text-xs flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Module Anaglyphe Responsable</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={anaglyph.enabled}
                      onChange={(e) => setAnaglyph({ ...anaglyph, enabled: e.target.checked })}
                      className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
                    />
                  </div>

                  {anaglyph.enabled && (
                    <div className="space-y-2 pt-1 text-[11px]">
                      <div className="flex justify-between text-zinc-400">
                        <span>Convergence stéréoscopique</span>
                        <span className="font-mono text-rose-300">{anaglyph.convergence}px</span>
                      </div>
                      <input
                        type="range"
                        min={-15}
                        max={15}
                        step={1}
                        value={anaglyph.convergence}
                        onChange={(e) =>
                          setAnaglyph({ ...anaglyph, convergence: parseInt(e.target.value, 10) })
                        }
                        className="w-full h-1 bg-zinc-700 rounded accent-rose-400 cursor-pointer"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-zinc-300">Bascule de secours 2D pure :</span>
                        <button
                          onClick={() => setAnaglyph({ ...anaglyph, pure2DFallback: !anaglyph.pure2DFallback })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            anaglyph.pure2DFallback
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {anaglyph.pure2DFallback ? '2D ACTIVÉE' : '3D ACTIVE'}
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 italic">
                        Aucune dépendance aux lunettes rouge/bleu : confort visuel garanti.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. MODULE « DESSIN QUI DEVIENT MONDE » */}
            {activeTab === 'drawing' && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Objet Scénographique Dessiné
                  </label>
                  <select
                    value={activeDrawingId}
                    onChange={(e) => setActiveDrawingId(e.target.value)}
                    className="w-full bg-[#181c22] border border-[#353e4a] text-cyan-200 font-semibold rounded p-2 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {drawings.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (p. {d.pageRef})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-[#121922] border border-[#223245] rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-300">Progression d'apparition (Tracé direct)</span>
                    <span className="font-mono text-cyan-300">
                      {Math.round(activeDrawing.revealProgress * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={activeDrawing.revealProgress}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setDrawings((prev) =>
                        prev.map((d) => (d.id === activeDrawingId ? { ...d, revealProgress: val } : d))
                      );
                    }}
                    className="w-full h-1 bg-zinc-700 rounded accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setDrawings((prev) =>
                          prev.map((d) => (d.id === activeDrawingId ? { ...d, revealProgress: 1.0 } : d))
                        );
                      }}
                      className="flex-1 py-1 bg-[#1a2533] hover:bg-[#223348] text-cyan-300 border border-[#2b415a] rounded text-[10px] font-medium"
                    >
                      Révéler à 100%
                    </button>
                    <button
                      onClick={() => {
                        setDrawings((prev) =>
                          prev.map((d) => (d.id === activeDrawingId ? { ...d, revealProgress: 0.1 } : d))
                        );
                      }}
                      className="py-1 px-3 bg-[#1a2533] hover:bg-[#223348] text-zinc-400 border border-[#2b415a] rounded text-[10px]"
                    >
                      Effacer
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#171b22] border border-[#2b333e] rounded-lg text-[11px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Masque traversable (porte franchissable) :</span>
                    <span className="font-mono text-amber-300">
                      {activeDrawing.isWalkableDoorMask ? 'ACTIF' : 'NON'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Permet aux comédiens de passer physiquement à travers la projection sur le rideau de fils sans éblouissement.
                  </p>
                </div>
              </div>
            )}

            {/* 4. MODULE PRÉSENCE VIDÉO & DATA FACE TRACKING */}
            {activeTab === 'tracking' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-[#121c17] border border-[#223d2f] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300 text-xs flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Apparition de Juliette (p. 15)</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono border border-emerald-500/30">
                      TouchDesigner Data
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    « Data Face Tracking - TouchDesigner » : Suivi de visage local en temps réel sans transmission réseau.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Source Vidéo & Dégradation Progressive
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-[#101317] p-1 rounded border border-[#28303a]">
                    <button
                      onClick={() => setVideoMode('neutral_silhouette')}
                      className={`py-1.5 rounded text-[10px] font-medium transition-colors ${
                        videoMode === 'neutral_silhouette'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Silhouette
                    </button>
                    <button
                      onClick={() => setVideoMode('demo_actor')}
                      className={`py-1.5 rounded text-[10px] font-medium transition-colors ${
                        videoMode === 'demo_actor'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Vidéo Démo
                    </button>
                    <button
                      onClick={() => setVideoMode('webcam_optin')}
                      className={`py-1.5 rounded text-[10px] font-medium transition-colors ${
                        videoMode === 'webcam_optin'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Caméra Live
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#171b22] border border-[#2b333e] rounded-lg text-[10px] text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Garantie de Confidentialité</span>
                  </div>
                  <p>
                    Le flux vidéo reste confiné dans la mémoire locale du navigateur. Aucun paquet n’est transmis vers l’extérieur sans autorisation de régie.
                  </p>
                </div>
              </div>
            )}

            {/* 5. STUDIO SONORE & BRUITAGES PHYSIQUES AUTHENTIQUES */}
            {activeTab === 'foley' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-[#242b34]">
                  <span className="font-semibold text-amber-200 text-xs">
                    Instruments du Manuscrit (16 Objets)
                  </span>
                  <button
                    onClick={() => {
                      const next = !isBinauralMode;
                      setIsBinauralMode(next);
                      livingAudio.setBinauralMode(next);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      isBinauralMode
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-[#181c22] text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {isBinauralMode ? 'Casque Binaural' : 'Stéréo Direct'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {FOLEY_CATALOG.map((foley) => (
                    <button
                      key={foley.id}
                      onClick={() => {
                        livingAudio.triggerFoley(foley.id);
                        addLog('foley', foley.name, 'sound', `Déclenché p.${foley.didascaliePage}`);
                      }}
                      className="p-2.5 rounded bg-[#171b22] hover:bg-[#222732] border border-[#2c3441] hover:border-amber-400/50 text-left transition-all group flex flex-col justify-between h-20"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mb-0.5">
                          <span>p.{foley.didascaliePage}</span>
                          <span className="uppercase text-amber-400/70">{foley.category}</span>
                        </div>
                        <div className="font-semibold text-[11px] text-[#f2f3f4] group-hover:text-amber-200 line-clamp-2 leading-snug">
                          {foley.name}
                        </div>
                      </div>
                      <div className="text-[9px] text-zinc-400 truncate mt-1">
                        {foley.objectDescription}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer du volet de droite : Journal d'Exécution Horodaté */}
          <div className="p-3 bg-[#0c0e11] border-t border-[#262c35] text-[10px] font-mono shrink-0">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="font-semibold text-zinc-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Journal Régie Horodaté</span>
              </span>
              <span>{executionLogs.length} entrées</span>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-zinc-400">
              {executionLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-zinc-600 shrink-0">{log.timestamp}</span>
                  <span className="text-amber-300 truncate font-semibold">{log.cueLabel}</span>
                  <span className="text-zinc-500 truncate">· {log.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
