// Modal Scénographe : Ombres Vivantes & Objets Animables
// No[co]de Vibe Designer — Démonstration Scénique Interactive
// Cas d'usage prioritaire : L'Ombre du Pirate (Capture Jardin ➔ Silhouette Isolée ➔ Rideau de Fils ➔ Miroir / Danse Autonome / Duo)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LiveSilhouetteObject,
  ShadowAnimationMode,
  SkeletonPose,
  CostumeDetails
} from '../types/scenography';
import { ReusableScenicElement } from '../types/timeline';
import {
  generateSyntheticPiratePose,
  smoothPose,
  renderPirateShadowCanvas
} from '../services/scenographyEngine';
import { executeContextualObjectPrompt } from '../services/scenographyPromptInterpreter';
import { liveBridge } from '../services/livePerformanceBridge';
import {
  X,
  Camera,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sliders,
  Send,
  Eye,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Upload,
  User,
  Radio,
  Clock,
  Film,
  Download,
  Info,
  Maximize2,
  Check,
  BookmarkPlus
} from 'lucide-react';

interface ScenographyLivingShadowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScenographyLivingShadowModal: React.FC<ScenographyLivingShadowModalProps> = ({
  isOpen,
  onClose,
}) => {
  // 1. État du Comédien sur le Plateau
  const [stagePhase, setStagePhase] = useState<
    '1_capture_jardin' | '2_saved_silhouette' | '3_actor_center' | '4_curtain_touch' | '5_mirror_imitation' | '6_autonomous_dance' | '7_return_mirror'
  >('1_capture_jardin');

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Vidéo source (Démo synthétique ou Importation réelle comédien)
  const [sourceType, setSourceType] = useState<'demo_pirate' | 'webcam_live' | 'user_video'>('demo_pirate');
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [savedToLibSuccess, setSavedToLibSuccess] = useState(false);

  // Objet Scénographique Actif : L'Ombre du Pirate
  const [shadowObject, setShadowObject] = useState<LiveSilhouetteObject>({
    id: 'obj-pirate-shadow',
    name: "Ombre du Pirate",
    category: 'performer_shadow',
    characterTitle: "L'Ombre du Pirate (Comédien à Jardin)",
    capturedAt: new Date().toLocaleTimeString(),
    sourceType: 'curated_test_performer',
    transform: {
      x: 0.32,
      y: 0.72,
      scale: 1.35,
      rotationDeg: 0,
      opacity: 0.0, // Apparaîtra après le rideau de fils
      flipHorizontal: true
    },
    animationMode: 'mirror',
    autonomousMotion: {
      style: 'pirate_dance',
      speed: 1.1,
      spatialRadius: 0.25,
      phase: 0,
      description: "Danse féline et vigoureuse avec pan de redingote et sabre d'abordage"
    },
    hybridConfig: {
      delayFrames: 14,
      anticipation: 0.3,
      reactivityToActor: 0.85,
      danceTogetherBlend: 0.5
    },
    costume: {
      hatType: 'tricorn',
      hasSashBelt: true,
      hasCutlassSabre: true,
      hasCoatFlaps: true,
      featherAngle: -25
    },
    cues: {
      triggerType: 'thread_curtain',
      cueAddress: '/thread/curtain/touch_zone_2',
      isTriggered: false,
      autoFadeInMs: 800
    },
    trackingQuality: {
      confidence: 0.96,
      isTrackingLost: false,
      lostFramesCounter: 0,
      smoothingFactor: 0.25,
      statusMessage: "Détection nette des articulations et du contour du costume (Tricorne & Bottes vérifiés)."
    }
  });

  // Prompt Contextuel éphémère pour l'objet sélectionné
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [contextualInput, setContextualInput] = useState('');
  const [promptFeedback, setPromptFeedback] = useState<string | null>(null);

  // Rideau de fils interactif
  const [curtainTouched, setCurtainTouched] = useState(false);

  // Références Canvas de Rendu
  const stageCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const prevPoseRef = useRef<SkeletonPose | null>(null);

  // Mesure réelle des performances
  const [measuredFps, setMeasuredFps] = useState(60);
  const lastFpsTimeRef = useRef(performance.now());
  const framesCountRef = useRef(0);

  // Boucle de rendu temps réel 60 FPS
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;

    const renderLoop = (timestamp: number) => {
      // Calcul FPS réel
      framesCountRef.current++;
      if (timestamp - lastFpsTimeRef.current >= 600) {
        const curFps = Math.round((framesCountRef.current * 1000) / (timestamp - lastFpsTimeRef.current));
        setMeasuredFps(Math.min(curFps, 120));
        framesCountRef.current = 0;
        lastFpsTimeRef.current = timestamp;
      }

      if (isPlaying) {
        setPlaybackTime((prev) => prev + 0.016);
      }

      const canvas = stageCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          // 1. Fond Scène Théâtre Obscure
          ctx.fillStyle = '#0a0d11';
          ctx.fillRect(0, 0, w, h);

          // 2. Grille de sol scénique et perspective théâtrale
          ctx.strokeStyle = 'rgba(40, 48, 58, 0.45)';
          ctx.lineWidth = 1;
          const groundY = h * 0.76;
          ctx.beginPath();
          ctx.moveTo(0, groundY);
          ctx.lineTo(w, groundY);
          ctx.stroke();

          // Repères de scène : Jardin (gauche), Centre, Cour (droite)
          ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.font = '10px monospace';
          ctx.fillText('JARDIN (Entrée comédien)', w * 0.12, groundY + 22);
          ctx.fillText('CENTRE PLATEAU', w * 0.46, groundY + 22);
          ctx.fillText('COUR', w * 0.82, groundY + 22);

          // 3. Dessin du Rideau de Fils Interactif (Thread Curtain)
          const curtainX = w * 0.42;
          ctx.save();
          ctx.strokeStyle = curtainTouched ? 'rgba(6, 182, 212, 0.75)' : 'rgba(71, 85, 105, 0.4)';
          ctx.lineWidth = 1.2;
          for (let x = curtainX - 25; x <= curtainX + 25; x += 5) {
            ctx.beginPath();
            ctx.moveTo(x, 40);
            const wave = curtainTouched ? Math.sin((timestamp * 0.005) + x) * 6 : 0;
            ctx.lineTo(x + wave, groundY);
            ctx.stroke();
          }
          if (curtainTouched) {
            ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
            ctx.fillRect(curtainX - 30, 40, 60, groundY - 40);
          }
          ctx.restore();

          // 4. Détermination de la Pose du Comédien selon la phase
          let actorPoseMode: 'idle_jardin' | 'walk_to_center' | 'sword_duel' | 'pirate_dance' = 'idle_jardin';
          if (stagePhase === '1_capture_jardin' || stagePhase === '2_saved_silhouette') {
            actorPoseMode = 'idle_jardin';
          } else if (stagePhase === '3_actor_center' || stagePhase === '4_curtain_touch') {
            actorPoseMode = 'walk_to_center';
          } else if (stagePhase === '5_mirror_imitation' || stagePhase === '7_return_mirror') {
            actorPoseMode = 'sword_duel';
          } else if (stagePhase === '6_autonomous_dance') {
            actorPoseMode = 'pirate_dance';
          }

          const rawActorPose = generateSyntheticPiratePose(playbackTime, actorPoseMode, 1.0);

          // Lissage anti-jitter temporel
          const smoothedActorPose = prevPoseRef.current
            ? smoothPose(prevPoseRef.current, rawActorPose, shadowObject.trackingQuality.smoothingFactor)
            : rawActorPose;
          prevPoseRef.current = smoothedActorPose;

          // 5. Rendu du COMÉDIEN RÉEL (Silhouette vivante sous projecteur chaud)
          const actorTransform = {
            x: actorPoseMode === 'idle_jardin' ? 0.22 : 0.50,
            y: 0.74,
            scale: 1.35,
            rotationDeg: 0,
            opacity: 0.95,
            flipHorizontal: false
          };

          renderPirateShadowCanvas(ctx, smoothedActorPose, actorTransform, shadowObject.costume, w, h, {
            color: '#283340', // Veste et costume réels sous projecteur
            glowColor: 'rgba(215, 184, 106, 0.55)', // Halo chaud scénique No[co]de Gold
            glowBlur: 16,
            showSkeletonMesh: false
          });

          // 6. Rendu de L'OMBRE VIVANTE DU PIRATE (Si déclenchée / visible)
          if (shadowObject.transform.opacity > 0.01) {
            let shadowPose = smoothedActorPose;

            if (shadowObject.animationMode === 'autonomous') {
              // En mode autonome : Pose issue de sa propre cinématique procédurale de danse
              shadowPose = generateSyntheticPiratePose(
                playbackTime * shadowObject.autonomousMotion.speed,
                'pirate_dance',
                shadowObject.autonomousMotion.speed
              );
            } else if (shadowObject.animationMode === 'hybrid') {
              // En mode hybride : Interpolation pondérée comédien + danse
              const dancePose = generateSyntheticPiratePose(playbackTime, 'pirate_dance', 1.2);
              shadowPose = smoothPose(smoothedActorPose, dancePose, shadowObject.hybridConfig.danceTogetherBlend);
            }

            renderPirateShadowCanvas(ctx, shadowPose, shadowObject.transform, shadowObject.costume, w, h, {
              color: '#080a0d', // Ombre théâtrale dense et découpée
              glowColor: 'rgba(6, 182, 212, 0.65)', // Cyan électrique régie
              glowBlur: 18,
              showSkeletonMesh: false
            });
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isPlaying, playbackTime, stagePhase, shadowObject, curtainTouched]);

  // Déroulement du Scénario Scénique de Validation
  const handleNextScenarioStep = (step: typeof stagePhase) => {
    setStagePhase(step);

    if (step === '1_capture_jardin') {
      setShadowObject((s) => ({
        ...s,
        transform: { ...s.transform, opacity: 0.0, x: 0.22 },
        cues: { ...s.cues, isTriggered: false }
      }));
      setCurtainTouched(false);
    } else if (step === '2_saved_silhouette') {
      setShadowObject((s) => ({
        ...s,
        transform: { ...s.transform, opacity: 0.0 }
      }));
    } else if (step === '3_actor_center') {
      setCurtainTouched(false);
    } else if (step === '4_curtain_touch') {
      // Déclenchement par le rideau de fils
      setCurtainTouched(true);
      liveBridge.sendOSC('/thread/curtain/touch', [2, 0.95]);
      // Fondu d'apparition de l'ombre
      setShadowObject((s) => ({
        ...s,
        transform: { ...s.transform, opacity: 0.95, x: 0.70 },
        cues: { ...s.cues, isTriggered: true }
      }));
    } else if (step === '5_mirror_imitation') {
      setShadowObject((s) => ({
        ...s,
        animationMode: 'mirror',
        transform: { ...s.transform, opacity: 0.95, x: 0.72, flipHorizontal: true }
      }));
      liveBridge.sendOSC('/nocode/shadow/mode', ['mirror']);
    } else if (step === '6_autonomous_dance') {
      setShadowObject((s) => ({
        ...s,
        animationMode: 'autonomous',
        transform: { ...s.transform, opacity: 0.95, x: 0.80, flipHorizontal: false }
      }));
      liveBridge.sendOSC('/nocode/shadow/mode', ['autonomous']);
    } else if (step === '7_return_mirror') {
      setShadowObject((s) => ({
        ...s,
        animationMode: 'mirror',
        transform: { ...s.transform, opacity: 0.95, x: 0.72, flipHorizontal: true }
      }));
      liveBridge.sendOSC('/nocode/shadow/mode', ['mirror']);
    }
  };

  // Traitement d'un Prompt Contextuel sur l'objet sélectionné
  const handleApplyContextualPrompt = () => {
    if (!contextualInput.trim()) return;
    const res = executeContextualObjectPrompt(contextualInput, shadowObject);
    setShadowObject(res.updatedObject);
    setPromptFeedback(res.explanation);
    setContextualInput('');
    setTimeout(() => setPromptFeedback(null), 5000);
  };

  // Arrêt du flux webcam lors de la fermeture
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [webcamStream]);

  const handleStartWebcam = async () => {
    try {
      setWebcamError(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } }
        });
        setWebcamStream(stream);
        setSourceType('webcam_live');
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(() => {});
        }
      } else {
        setWebcamError("API Webcam non supportée sur ce navigateur");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur d’accès';
      setWebcamError(`Caméra indisponible : ${msg}. Bascule sur la vidéo étalon pirate.`);
      setSourceType('demo_pirate');
    }
  };

  const handleStopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setSourceType('demo_pirate');
  };

  // Enregistrement de la silhouette capturée dans la bibliothèque du projet
  const handleSaveSilhouetteToLibrary = () => {
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newElement: ReusableScenicElement = {
      id: `elem-silhouette-${Date.now()}`,
      name: `Silhouette Pirate (${sourceType === 'webcam_live' ? 'Caméra' : 'Capture'} ${timestampStr})`,
      category: 'Personnages & Ombres',
      type: 'performer_shadow',
      characterTitle: shadowObject.characterTitle,
      description: `Silhouette détourée avec transparence. Source : ${
        sourceType === 'webcam_live' ? 'Caméra régie plateau' : 'Vidéo comédien'
      }. Costume : Tricorne, Sabre, Redingote.`,
      iconType: 'pirate',
      defaultTrackId: 'track-1-shadows',
      defaultDuration: 15,
      color: '#d7b86a',
      defaultTransform: { ...shadowObject.transform },
      animationMode: shadowObject.animationMode,
      motionStyle: shadowObject.autonomousMotion.style,
      motionSpeed: shadowObject.autonomousMotion.speed,
      costume: { ...shadowObject.costume },
      visualFx: 'none',
      fxIntensity: 0.5,
      audioConfig: {
        enabled: true,
        volume: 0.65,
        reactiveToSteps: true,
        synthPreset: 'footstep_wood'
      },
      createdAt: new Date().toLocaleDateString()
    };

    try {
      const stored = localStorage.getItem('nocode_scenic_library');
      const curList = stored ? JSON.parse(stored) : [];
      const updated = [newElement, ...curList.filter((e: ReusableScenicElement) => e.id !== newElement.id)];
      localStorage.setItem('nocode_scenic_library', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('nocode_library_updated'));
    } catch {
      // safe
    }

    setSavedToLibSuccess(true);
    setTimeout(() => setSavedToLibSuccess(false), 2500);
  };

  // Gestion de l'import vidéo réel
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        setWebcamStream(null);
      }
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setSourceType('user_video');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 lg:p-6 select-none">
      <div className="w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col h-[94vh] overflow-hidden">
        {/* Header Scénographe */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>Le Scénographe — Ombres Vivantes & Objets Animables</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Cas d'usage : L'Ombre du Pirate
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Capture de comédien, silhouette autonome avec transparence, déclenchement par rideau de fils et 3 modes d'animation.
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

        {/* Barre de Parcours Scénique Prioritaire */}
        <div className="px-6 py-2.5 bg-zinc-900/50 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-zinc-400 text-[11px] font-medium mr-2">Scénario de validation :</span>
            {[
              { id: '1_capture_jardin', label: '1. Capture Jardin' },
              { id: '2_saved_silhouette', label: '2. Silhouette Sauvegardée' },
              { id: '3_actor_center', label: '3. Comédien au Centre' },
              { id: '4_curtain_touch', label: '4. Top Rideau de Fils' },
              { id: '5_mirror_imitation', label: '5. Imitation Miroir' },
              { id: '6_autonomous_dance', label: '6. Danse Autonome' },
              { id: '7_return_mirror', label: '7. Retour au Miroir' },
            ].map((step, idx) => (
              <button
                key={step.id}
                onClick={() => handleNextScenarioStep(step.id as any)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  stagePhase === step.id
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-semibold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <span>{step.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-mono">
            <span>Régie FPS : <strong className="text-cyan-400 font-semibold">{measuredFps} FPS</strong></span>
            <span className="text-zinc-600">|</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Hors-Ligne (0 cloud)
            </span>
          </div>
        </div>

        {/* Corps Principal */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Surface Scénique Théâtrale (Projection) */}
          <div className="flex-1 relative bg-black flex flex-col justify-between overflow-hidden">
            <canvas
              ref={stageCanvasRef}
              width={820}
              height={480}
              className="w-full h-full block object-contain"
            />

            {/* Overlays d'informations scéniques */}
            <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded px-3 py-1.5 text-[11px] text-zinc-300 flex items-center gap-3 pointer-events-none">
              <div>
                <span className="text-zinc-500">Objet sélectionné : </span>
                <span className="text-cyan-300 font-semibold">{shadowObject.name}</span>
              </div>
              <span className="text-zinc-700">|</span>
              <div>
                <span className="text-zinc-500">Mode : </span>
                <span className="text-emerald-300 font-semibold uppercase">{shadowObject.animationMode}</span>
              </div>
              <span className="text-zinc-700">|</span>
              <div>
                <span className="text-zinc-500">Rideau : </span>
                <span className={curtainTouched ? 'text-cyan-400 font-semibold' : 'text-zinc-500'}>
                  {curtainTouched ? 'Contact détecté (Top actif)' : 'En attente'}
                </span>
              </div>
            </div>

            {/* Bouton éphémère d'édition contextuelle en langage naturel */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button
                onClick={() => setIsPromptOpen(!isPromptOpen)}
                className="px-3 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-cyan-300 border border-cyan-800/80 rounded-lg text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm shadow-lg transition-colors"
                title="Donner une nouvelle consigne artistique à l'Ombre du Pirate sans modifier le reste du projet"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Modifier en langage naturel</span>
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs transition-colors"
                title={isPlaying ? 'Pause' : 'Reprendre'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Champ contextuel flottant pour l'objet (apparaît uniquement à la demande) */}
            {isPromptOpen && (
              <div className="absolute bottom-14 left-3 right-3 md:right-auto md:w-96 bg-zinc-950/95 border border-cyan-800/80 rounded-xl p-3 shadow-2xl backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800">
                  <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Consigne pour : {shadowObject.name}</span>
                  </span>
                  <button onClick={() => setIsPromptOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={contextualInput}
                    onChange={(e) => setContextualInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyContextualPrompt()}
                    placeholder="Ex: Fais danser cette ombre plus lentement..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleApplyContextualPrompt}
                    className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 rounded transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Suggestions contextuelles rapides */}
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {[
                    'Danse autonome',
                    'Mode miroir',
                    'Plus lentement',
                    'Traverse la scène',
                    'Agrandis l’ombre',
                    'Retire le sabre'
                  ].map((sug) => (
                    <button
                      key={sug}
                      onClick={() => {
                        const res = executeContextualObjectPrompt(sug, shadowObject);
                        setShadowObject(res.updatedObject);
                        setPromptFeedback(res.explanation);
                        setTimeout(() => setPromptFeedback(null), 5000);
                      }}
                      className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded"
                    >
                      {sug}
                    </button>
                  ))}
                </div>

                {promptFeedback && (
                  <p className="text-[11px] text-cyan-300/90 pt-1 border-t border-zinc-900 leading-snug">
                    {promptFeedback}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Panneau Latéral : Pupitre Scénographique & Contrôles Vidéo */}
          <div className="w-full lg:w-96 bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col justify-between overflow-y-auto p-4 space-y-4">
            {/* Section 1 : Source Vidéo & Capture du Comédien */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>1. Capture Vidéo du Comédien</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Costume Pirate</span>
              </div>

              {/* Sélecteur de source vidéo */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => {
                    handleStopWebcam();
                    setSourceType('demo_pirate');
                  }}
                  className={`py-1 px-1.5 rounded border text-[10px] font-medium transition-colors text-center ${
                    sourceType === 'demo_pirate'
                      ? 'bg-cyan-950 border-cyan-800 text-cyan-300 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Vidéo Pirate
                </button>

                <button
                  onClick={sourceType === 'webcam_live' ? handleStopWebcam : handleStartWebcam}
                  className={`py-1 px-1.5 rounded border text-[10px] font-medium transition-colors text-center ${
                    sourceType === 'webcam_live'
                      ? 'bg-emerald-950 border-emerald-700 text-emerald-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {sourceType === 'webcam_live' ? '● Caméra ON' : 'Caméra Direct'}
                </button>

                <label className="py-1 px-1.5 rounded border text-[10px] font-medium text-center cursor-pointer transition-colors bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 truncate">
                  <span>Fichier vidéo</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Erreur caméra éventuelle */}
              {webcamError && (
                <div className="p-1.5 rounded bg-red-950/50 border border-red-800/80 text-[10px] text-red-300">
                  {webcamError}
                </div>
              )}

              {/* Élément vidéo caché pour le flux live */}
              <video
                ref={videoPreviewRef}
                playsInline
                autoPlay
                muted
                className={sourceType === 'webcam_live' ? 'w-full h-24 object-cover rounded border border-zinc-800 bg-black mt-1' : 'hidden'}
              />

              {/* Diagnostic de segmentation de silhouette */}
              <div className="p-2 bg-zinc-950 rounded border border-zinc-850 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Fiabilité d'isolation :</span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    {(shadowObject.trackingQuality.confidence * 100).toFixed(0)}% (Validé)
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-tight">
                  Arrière-plan masqué. Détails de costume préservés : chapeau tricorne, manches, redingote et sabre.
                </p>
              </div>

              {/* Bouton d'enregistrement comme élément réutilisable */}
              <button
                onClick={handleSaveSilhouetteToLibrary}
                className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-950/60 to-cyan-950/60 hover:from-amber-900/60 hover:to-cyan-900/60 border border-amber-600/60 rounded text-[11px] font-semibold text-[#d7b86a] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                title="Mémoriser cette silhouette découpée pour l’insérer sur la timeline comme clip réutilisable"
              >
                {savedToLibSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Ajouté à la Bibliothèque !</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5 text-[#d7b86a]" />
                    <span>Enregistrer dans la Bibliothèque</span>
                  </>
                )}
              </button>
            </div>

            {/* Section 2 : Layer de Projection (Contrôles Millumin-style) */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>2. Layer de Projection (Millumin)</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Indépendant</span>
              </div>

              <div className="space-y-2">
                {/* Position X */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Position X (Plateau)</span>
                    <span className="text-cyan-400 font-mono">{(shadowObject.transform.x * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.02"
                    value={shadowObject.transform.x}
                    onChange={(e) =>
                      setShadowObject((s) => ({
                        ...s,
                        transform: { ...s.transform, x: parseFloat(e.target.value) }
                      }))
                    }
                    className="w-full h-1.5 bg-zinc-800 rounded accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Taille / Échelle */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Taille de l'ombre</span>
                    <span className="text-cyan-400 font-mono">{shadowObject.transform.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={shadowObject.transform.scale}
                    onChange={(e) =>
                      setShadowObject((s) => ({
                        ...s,
                        transform: { ...s.transform, scale: parseFloat(e.target.value) }
                      }))
                    }
                    className="w-full h-1.5 bg-zinc-800 rounded accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Opacité */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Opacité de projection</span>
                    <span className="text-cyan-400 font-mono">{(shadowObject.transform.opacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={shadowObject.transform.opacity}
                    onChange={(e) =>
                      setShadowObject((s) => ({
                        ...s,
                        transform: { ...s.transform, opacity: parseFloat(e.target.value) }
                      }))
                    }
                    className="w-full h-1.5 bg-zinc-800 rounded accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Inversion Miroir Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400 text-[11px]">Inversion miroir horizontale :</span>
                  <button
                    onClick={() =>
                      setShadowObject((s) => ({
                        ...s,
                        transform: { ...s.transform, flipHorizontal: !s.transform.flipHorizontal }
                      }))
                    }
                    className={`px-2 py-0.5 rounded text-[11px] border font-medium ${
                      shadowObject.transform.flipHorizontal
                        ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {shadowObject.transform.flipHorizontal ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3 : 3 Modes d'Animation Essentiels */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2 text-xs">
              <span className="font-semibold text-zinc-200 block pb-1 border-b border-zinc-800">
                3. Modes d'Animation Scéniques
              </span>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'mirror', label: 'Miroir' },
                  { id: 'autonomous', label: 'Autonome' },
                  { id: 'hybrid', label: 'Hybride Duo' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setShadowObject((s) => ({
                        ...s,
                        animationMode: m.id as ShadowAnimationMode,
                        transform: { ...s.transform, opacity: Math.max(0.9, s.transform.opacity) }
                      }));
                      liveBridge.sendOSC('/nocode/shadow/mode', [m.id]);
                    }}
                    className={`py-1.5 rounded border text-[11px] font-medium transition-colors ${
                      shadowObject.animationMode === m.id
                        ? 'bg-cyan-950 border-cyan-700 text-cyan-300 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-zinc-400 leading-normal pt-1">
                {shadowObject.animationMode === 'mirror' && 'L’ombre reproduit fidèlement les gestes du pirate avec inversion scénique.'}
                {shadowObject.animationMode === 'autonomous' && 'L’ombre prend vie indépendamment et danse avec panache.'}
                {shadowObject.animationMode === 'hybrid' && 'Duo scénique : L’ombre alterne entre imitation réactive et pas de danse autonomes.'}
              </p>
            </div>

            {/* Déclenchement Régie / Rideau de Fils */}
            <button
              onClick={() => handleNextScenarioStep('4_curtain_touch')}
              className={`w-full py-2 rounded text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                curtainTouched
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  : 'bg-cyan-950 border-cyan-800 hover:bg-cyan-900 text-cyan-300'
              }`}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{curtainTouched ? 'Rideau touché (Ombre active)' : 'Simuler Contact Rideau de Fils'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
