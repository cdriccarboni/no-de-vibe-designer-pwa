// Atelier Scénographique & Timeline Inspiré de Millumin
// No[co]de Vibe Designer — Le Scénographe V2
// Intégration de la Timeline Multi-layers, Conduite de Spectacle (TOPs), Inspecteur de Régie,
// Bibliothèque d'Éléments Réutilisables, Dialogue Artistique Contextuel et Rendu Composite Temps Réel

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ArtisticScene, ConversationTurn } from '../types/artist';
import { CURATED_ARTISTIC_SCENES, interpretArtisticCommand } from '../services/artisticIntents';
import {
  TimelineClip,
  TimelineTrack,
  CueItem,
  ReusableScenicElement,
  ShowProjectState
} from '../types/timeline';
import {
  INITIAL_TIMELINE_TRACKS,
  INITIAL_TIMELINE_CLIPS,
  INITIAL_CUE_LIST,
  INITIAL_REUSABLE_LIBRARY,
  createClipFromLibraryElement,
  saveClipAsLibraryElement
} from '../services/timelineEngine';
import { renderScenicStage } from '../services/scenicCompositor';
import { scenicAudio } from '../services/scenicAudioEngine';
import { liveBridge } from '../services/livePerformanceBridge';
import {
  generateProactiveSuggestions,
  detectShowProfile,
  applySuggestionToSelectedClip,
  createClipFromSuggestion,
  ProactiveSuggestion
} from '../services/scenographicProactiveCompanion';
import { MilluminTimeline } from './MilluminTimeline';
import { ScenicInspectorPanel } from './ScenicInspectorPanel';
import { ScenicLibraryDrawer } from './ScenicLibraryDrawer';
import { ContextualPromptModal } from './ContextualPromptModal';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Sliders,
  BookmarkPlus,
  Code2,
  Check,
  Compass,
  Radio,
  User,
  Layers,
  Bookmark,
  Monitor,
  Maximize2,
  Film,
  Download,
  Upload,
  RotateCcw,
  Lightbulb,
  Wand2,
  Plus,
  Play
} from 'lucide-react';

interface ArtisticStudioViewProps {
  currentScene: ArtisticScene;
  onSceneChange: (scene: ArtisticScene) => void;
  onToggleTechnicalMode: () => void;
  onParameterChange: (paramId: string, value: number) => void;
  onSaveScene: () => void;
  onOpenInterop?: () => void;
  onOpenScenography?: () => void;
  onOpenLivingScenography?: () => void;
  renderSurface: React.ReactNode;
  fps: number;
  engineName: string;
}

export const ArtisticStudioView: React.FC<ArtisticStudioViewProps> = ({
  currentScene,
  onSceneChange,
  onToggleTechnicalMode,
  onParameterChange,
  onSaveScene,
  onOpenInterop,
  onOpenScenography,
  onOpenLivingScenography,
  renderSurface,
  fps,
  engineName,
}) => {
  // 1. ÉTAT DU MODE D'AFFICHAGE DU PREVIEW : PLATEAU COMPOSITE MULTI-LAYERS OU SHADER UNITAIRE
  const [viewportMode, setViewportMode] = useState<'scenic_stage' | 'isolated_shader'>('scenic_stage');

  // 2. ÉTAT DU WORKFLOW MILLUMIN : TRACKS, CLIPS, CUES, BIBLIOTHÈQUE
  const [tracks, setTracks] = useState<TimelineTrack[]>(() => {
    try {
      const stored = localStorage.getItem('nocode_timeline_tracks');
      return stored ? JSON.parse(stored) : INITIAL_TIMELINE_TRACKS;
    } catch {
      return INITIAL_TIMELINE_TRACKS;
    }
  });

  const [clips, setClips] = useState<TimelineClip[]>(() => {
    try {
      const stored = localStorage.getItem('nocode_timeline_clips');
      return stored ? JSON.parse(stored) : INITIAL_TIMELINE_CLIPS;
    } catch {
      return INITIAL_TIMELINE_CLIPS;
    }
  });

  const [cues, setCues] = useState<CueItem[]>(() => {
    try {
      const stored = localStorage.getItem('nocode_timeline_cues');
      return stored ? JSON.parse(stored) : INITIAL_CUE_LIST;
    } catch {
      return INITIAL_CUE_LIST;
    }
  });

  const [library, setLibrary] = useState<ReusableScenicElement[]>(() => {
    try {
      const stored = localStorage.getItem('nocode_scenic_library');
      return stored ? JSON.parse(stored) : INITIAL_REUSABLE_LIBRARY;
    } catch {
      return INITIAL_REUSABLE_LIBRARY;
    }
  });

  // 3. TRANSPORT & LECTURE TEMPORELLE
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [totalDurationSec] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip-1');

  // Onglet du volet de droite : Inspecteur Régie (par défaut), Compagnon Proactif ou Dialogue Vibe
  const [sidebarTab, setSidebarTab] = useState<'inspector' | 'proactive' | 'dialogue'>('inspector');

  // Modals
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isContextualPromptOpen, setIsContextualPromptOpen] = useState(false);
  const [clipForPrompt, setClipForPrompt] = useState<TimelineClip | null>(null);

  // Sauvegarde notification
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Écoute des mises à jour de bibliothèque depuis Le Scénographe
  useEffect(() => {
    const handleLibUpdate = () => {
      try {
        const stored = localStorage.getItem('nocode_scenic_library');
        if (stored) setLibrary(JSON.parse(stored));
      } catch {
        // safe
      }
    };
    window.addEventListener('nocode_library_updated', handleLibUpdate);
    return () => window.removeEventListener('nocode_library_updated', handleLibUpdate);
  }, []);

  // Export de la conduite de spectacle (.vibe-show.json pour sauvegarde/régie 100% hors-ligne)
  const handleExportShowProject = useCallback(() => {
    const showState: ShowProjectState = {
      version: '2.0.0',
      title: currentScene.title,
      totalDurationSec,
      tracks,
      clips,
      cues,
      reusableLibrary: library,
      loop: isLooping,
      masterVolume: 1.0
    };
    const blob = new Blob([JSON.stringify(showState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spectacle-${currentScene.id || 'scenographie'}.vibe-show.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentScene, totalDurationSec, tracks, clips, cues, library, isLooping]);

  // Importation d'une conduite de spectacle sauvegardée
  const handleImportShowProject = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.tracks) setTracks(parsed.tracks);
          if (parsed.clips) setClips(parsed.clips);
          if (parsed.cues) setCues(parsed.cues);
          if (parsed.reusableLibrary) setLibrary(parsed.reusableLibrary);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2000);
        } catch {
          // safe
        }
      };
      reader.readAsText(file);
    }
  }, []);

  // Réinitialisation du spectacle aux préréglages d'usine
  const handleResetShowProject = useCallback(() => {
    if (window.confirm("Réinitialiser la timeline aux 3 clips initiaux du spectacle de démonstration ?")) {
      setTracks(INITIAL_TIMELINE_TRACKS);
      setClips(INITIAL_TIMELINE_CLIPS);
      setCues(INITIAL_CUE_LIST);
      setLibrary(INITIAL_REUSABLE_LIBRARY);
      setCurrentTimeSec(0);
      setIsPlaying(false);
    }
  }, []);

  // Sauvegarde automatique locale de l'état scénique
  useEffect(() => {
    try {
      localStorage.setItem('nocode_timeline_tracks', JSON.stringify(tracks));
      localStorage.setItem('nocode_timeline_clips', JSON.stringify(clips));
      localStorage.setItem('nocode_timeline_cues', JSON.stringify(cues));
      localStorage.setItem('nocode_scenic_library', JSON.stringify(library));
    } catch {
      // Storage safe
    }
  }, [tracks, clips, cues, library]);

  // Références Canvas pour le rendu scénique multi-layers à 60 FPS
  const stageCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // 4. BOUCLE D'ANIMATION DU PLATEAU SCÉNOGRAPHIQUE (60 FPS)
  useEffect(() => {
    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Avancement de la tête de lecture si en lecture
      if (isPlaying) {
        setCurrentTimeSec((prev) => {
          const next = prev + dt;
          if (next >= totalDurationSec) {
            return isLooping ? 0 : totalDurationSec;
          }
          return next;
        });
      }

      // Rendu du canvas composite si affiché
      if (stageCanvasRef.current && viewportMode === 'scenic_stage') {
        const canvas = stageCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
          }
          renderScenicStage(
            ctx,
            canvas.width,
            canvas.height,
            currentTimeSec,
            clips,
            tracks,
            library,
            isPlaying
          );
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isLooping, totalDurationSec, viewportMode, currentTimeSec, clips, tracks, library]);

  // 5. GESTION DES CLIPS & INSPECTEUR
  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  const handleUpdateClip = useCallback((updatedClip: TimelineClip) => {
    setClips((prev) => prev.map((c) => (c.id === updatedClip.id ? updatedClip : c)));
  }, []);

  const handleDeleteClip = useCallback((clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    setSelectedClipId(null);
  }, []);

  const handleSaveClipAsReusable = useCallback((clip: TimelineClip) => {
    const newElement = saveClipAsLibraryElement(clip);
    setLibrary((prev) => [newElement, ...prev]);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  }, []);

  // 6. GESTION DES CUES (TOPs DE RÉGIE SCÉNIQUE)
  const handleTriggerCue = useCallback((cue: CueItem) => {
    scenicAudio.triggerCueBell(cue.cueNumber);
    // Envoi du message OSC localement
    liveBridge.sendOSC(cue.oscAddress, [cue.cueNumber, cue.label]);
    liveBridge.sendOSC('/cue/go', [cue.cueNumber]);

    setCurrentTimeSec(cue.timeSec);
    if (!isPlaying) setIsPlaying(true);
  }, [isPlaying]);

  const handleAddCueAtCurrentTime = useCallback(() => {
    const newNum = cues.length + 1;
    const newCue: CueItem = {
      id: `cue-${Date.now()}`,
      cueNumber: newNum,
      label: `TOP ${newNum} — Marqueur à ${currentTimeSec.toFixed(1)}s`,
      timeSec: parseFloat(currentTimeSec.toFixed(1)),
      action: 'jump_and_play',
      oscAddress: `/cue/${newNum}`,
      description: `Déclencheur régie créé à ${currentTimeSec.toFixed(1)}s.`
    };
    setCues((prev) => [...prev, newCue]);
  }, [cues.length, currentTimeSec]);

  // 7. INSERTION D'UN ÉLÉMENT DEPUIS LA BIBLIOTHÈQUE
  const handleInsertFromLibrary = useCallback((element: ReusableScenicElement, trackId: string) => {
    const newClip = createClipFromLibraryElement(element, trackId, currentTimeSec);
    setClips((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  }, [currentTimeSec]);

  // 8. CRÉATION D'UN BLOC COMPOSÉ
  const handleCreateCompoundBlock = useCallback((name: string, selectedElementIds: string[]) => {
    const elementsToGroup = library.filter((e) => selectedElementIds.includes(e.id));
    const first = elementsToGroup[0] || library[0];

    const compoundElement: ReusableScenicElement = {
      id: `elem-compound-${Date.now()}`,
      name,
      category: 'Blocs Composés',
      type: 'compound_block',
      characterTitle: name,
      description: `Ensemble combinant : ${elementsToGroup.map((e) => e.name).join(', ')}.`,
      iconType: 'compound',
      defaultTrackId: first.defaultTrackId,
      defaultDuration: Math.max(...elementsToGroup.map((e) => e.defaultDuration)),
      color: '#eab308',
      defaultTransform: { ...first.defaultTransform },
      animationMode: first.animationMode,
      motionStyle: first.motionStyle,
      motionSpeed: first.motionSpeed,
      visualFx: first.visualFx,
      fxIntensity: first.fxIntensity,
      audioConfig: { ...first.audioConfig },
      isCompound: true,
      compoundSubElements: elementsToGroup.map((e, idx) => ({
        elementId: e.id,
        relativeStartTime: idx * 1.5,
        duration: e.defaultDuration,
        opacity: 0.9
      })),
      createdAt: new Date().toLocaleDateString()
    };

    setLibrary((prev) => [compoundElement, ...prev]);
  }, [library]);

  // 9. COMPAGNON SCÉNOGRAPHIQUE PROACTIF (Directives 7 & 8 : Suggestions Spontanées & Actions Directes)
  const proactiveContext = useMemo(() => ({
    clips,
    tracks,
    cues,
    selectedClip,
    currentScene,
    library
  }), [clips, tracks, cues, selectedClip, currentScene, library]);

  const showProfile = useMemo(() => detectShowProfile(proactiveContext), [proactiveContext]);
  const proactiveSuggestions = useMemo(() => generateProactiveSuggestions(proactiveContext), [proactiveContext]);

  const handleApplySuggestionToClip = useCallback((suggestion: ProactiveSuggestion) => {
    if (!selectedClip) return;
    const updated = applySuggestionToSelectedClip(suggestion, selectedClip);
    handleUpdateClip(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  }, [selectedClip, handleUpdateClip]);

  const handleInsertSuggestionClip = useCallback((suggestion: ProactiveSuggestion) => {
    const result = createClipFromSuggestion(suggestion, library, currentTimeSec);
    if (result) {
      setClips((prev) => [...prev, result.clip]);
      setSelectedClipId(result.clip.id);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  }, [library, currentTimeSec]);

  // 10. DIALOGUE ARTISTIQUE CONVERSATIONNEL (HISTORIQUE VIBE INTÉGRÉ)
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [conversation, setConversation] = useState<ConversationTurn[]>([
    {
      id: 'init-turn',
      sender: 'nocode',
      text: `Atelier Scénographique prêt. Le Scénographe et la Timeline multi-pistes sont synchronisés avec les moteurs (${engineName}). Vous pouvez décrire une scène en langage naturel, manipuler les clips ou envoyer un TOP de régie.`,
      timestamp: 'Prêt'
    }
  ]);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSendIntent(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any).stop();
      setIsListening(false);
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recognitionRef.current as any).start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSendIntent = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userTurn: ConversationTurn = {
      id: `user-${Date.now()}`,
      sender: 'artist',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const result = interpretArtisticCommand(text, currentScene);

    const systemTurn: ConversationTurn = {
      id: `sys-${Date.now()}`,
      sender: 'nocode',
      text: result.explanation,
      appliedAction: result.appliedEngine ? `Moteur : ${result.appliedEngine}` : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversation((prev) => [...prev, userTurn, systemTurn]);
    setInputText('');
    onSceneChange(result.updatedScene);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-53px)] bg-[#101214] text-[#f2f3f4] overflow-hidden select-none">
      {/* Top Scenography Bar */}
      <div className="flex items-center justify-between gap-4 px-5 py-2 bg-[#121518] border-b border-[#303740] text-xs shrink-0">
        {/* Left: Active Scene & Viewport Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d7b86a] animate-pulse" />
            <h1 className="text-sm font-semibold text-[#f2f3f4]">{currentScene.title}</h1>
          </div>

          <span className="text-[#303740]">|</span>

          {/* Viewport Mode Switcher */}
          <div className="flex items-center bg-[#171a1e] border border-[#303740] rounded p-0.5">
            <button
              onClick={() => setViewportMode('scenic_stage')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                viewportMode === 'scenic_stage'
                  ? 'bg-[#d7b86a] text-[#101214] font-bold'
                  : 'text-[#a0a8b0] hover:text-[#f2f3f4]'
              }`}
              title="Afficher la scène composite avec tous les layers de projection et la timeline"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Plateau Composite (Timeline)</span>
            </button>
            <button
              onClick={() => setViewportMode('isolated_shader')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                viewportMode === 'isolated_shader'
                  ? 'bg-cyan-500 text-[#101214] font-bold'
                  : 'text-[#a0a8b0] hover:text-[#f2f3f4]'
              }`}
              title="Afficher le moteur / shader unitaire en plein cadre"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Shader Unitaire</span>
            </button>
          </div>

          <span className="text-zinc-500 font-mono tabular-nums whitespace-nowrap ml-1">
            {fps > 0 ? `${fps} FPS` : '60 FPS'}
          </span>
        </div>

        {/* Right Actions: Bibliothèque, Scénographe, Passerelles, Preset Switcher, Code */}
        <div className="flex items-center gap-2">
          {/* Preset Scene Switcher */}
          <select
            value={currentScene.id}
            onChange={(e) => {
              const found = CURATED_ARTISTIC_SCENES.find((s) => s.id === e.target.value);
              if (found) onSceneChange(found);
            }}
            className="bg-[#171a1e] text-[#f2f3f4] border border-[#303740] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[#d7b86a] cursor-pointer"
          >
            {CURATED_ARTISTIC_SCENES.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.title}
              </option>
            ))}
          </select>

          {/* Bibliothèque Button */}
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-100 bg-[#171a1e] hover:bg-[#20242a] border border-amber-800/80 rounded transition-colors flex items-center gap-1.5"
            title="Ouvrir la Bibliothèque d'éléments scénographiques réutilisables"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#d7b86a]" />
            <span className="hidden sm:inline">Bibliothèque ({library.length})</span>
          </button>

          {/* Le Scénographe (Capture Silhouette) */}
          {onOpenScenography && (
            <button
              onClick={onOpenScenography}
              className="px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-100 bg-[#171a1e] hover:bg-[#20242a] border border-amber-800/80 rounded transition-colors flex items-center gap-1.5"
              title="Ouvrir Le Scénographe : Ombres Vivantes, Découpage Comédien Pirate & Rideau de Fils"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Le Scénographe</span>
            </button>
          )}

          {/* Domaine Scénographie Vivante (PIRATES PAILLETTES ! V2.1.26) */}
          {onOpenLivingScenography && (
            <button
              onClick={onOpenLivingScenography}
              className="px-2.5 py-1 text-xs font-semibold text-amber-200 hover:text-white bg-gradient-to-r from-amber-950/80 to-purple-950/80 hover:from-amber-900 hover:to-purple-900 border border-amber-600/70 rounded transition-all flex items-center gap-1.5 shadow-sm shadow-amber-950/50"
              title="Ouvrir le conducteur scénique complet « Pirates Paillettes ! V2.1.26 »"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Scénographie Vivante</span>
              <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/20 px-1 rounded">V2.1</span>
            </button>
          )}

          {/* Passerelles Régie */}
          {onOpenInterop && (
            <button
              onClick={onOpenInterop}
              className="px-2.5 py-1 text-xs font-medium text-cyan-300 hover:text-cyan-100 bg-[#171a1e] hover:bg-[#20242a] border border-cyan-800/70 rounded transition-colors flex items-center gap-1.5"
              title="Ouvrir les passerelles OSC/WebSocket régie (TouchDesigner, Max/MSP, Millumin...)"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Passerelles Régie</span>
            </button>
          )}

          {/* Exporter le Spectacle (.vibe-show.json) */}
          <button
            onClick={handleExportShowProject}
            className="px-2 py-1 text-xs font-medium text-[#a0a8b0] hover:text-[#f2f3f4] bg-[#171a1e] hover:bg-[#20242a] border border-[#303740] rounded transition-colors flex items-center gap-1"
            title="Exporter l'ensemble de la timeline, des pistes et des cues en fichier .vibe-show.json hors-ligne"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Exporter</span>
          </button>

          {/* Importer un Spectacle */}
          <label
            className="px-2 py-1 text-xs font-medium text-[#a0a8b0] hover:text-[#f2f3f4] bg-[#171a1e] hover:bg-[#20242a] border border-[#303740] rounded transition-colors flex items-center gap-1 cursor-pointer"
            title="Importer une conduite de spectacle .vibe-show.json"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Importer</span>
            <input
              type="file"
              accept=".json,.vibe-show.json"
              onChange={handleImportShowProject}
              className="hidden"
            />
          </label>

          {/* Réinitialiser aux préréglages */}
          <button
            onClick={handleResetShowProject}
            className="p-1 text-[#a0a8b0] hover:text-[#f2f3f4] bg-[#171a1e] hover:bg-[#20242a] border border-[#303740] rounded transition-colors"
            title="Réinitialiser la conduite aux 3 clips initiaux de démonstration"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Sauvegarder */}
          <button
            onClick={() => {
              onSaveScene();
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 2000);
            }}
            className="px-3 py-1 text-xs font-medium text-[#f2f3f4] bg-[#171a1e] hover:bg-[#20242a] border border-[#303740] rounded transition-colors flex items-center gap-1.5"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <BookmarkPlus className="w-3.5 h-3.5 text-[#d7b86a]" />}
            <span>{savedSuccess ? 'Sauvegardé' : 'Sauvegarder'}</span>
          </button>

          {/* Toggle Code & Moteurs pour techniciens */}
          <button
            onClick={onToggleTechnicalMode}
            className="px-3 py-1 text-xs font-medium text-[#a0a8b0] hover:text-[#f2f3f4] bg-[#171a1e] hover:bg-[#20242a] border border-[#303740] rounded transition-colors flex items-center gap-1.5 ml-1"
            title="Afficher les entrailles du code, la console et les tests pour techniciens"
          >
            <Code2 className="w-3.5 h-3.5 text-[#a0a8b0]" />
            <span className="hidden md:inline">Sous le capot</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body : Live Stage + Right Inspector & Director */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left / Center Area : Stage Preview (Top) + Millumin Timeline (Bottom) */}
        <div className="flex-1 flex flex-col bg-black overflow-hidden min-h-0">
          {/* Main Visual Viewport */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
            {viewportMode === 'scenic_stage' ? (
              <div className="w-full h-full relative flex items-center justify-center bg-[#0c0e11]">
                <canvas
                  ref={stageCanvasRef}
                  className="w-full h-full block cursor-crosshair"
                />

                {/* Overlays scéniques discrets */}
                <div className="absolute top-3 left-4 pointer-events-none flex items-center gap-2">
                  <div className="bg-[#101214]/85 backdrop-blur-md border border-[#303740] rounded px-3 py-1 text-[11px] text-[#f2f3f4] flex items-center gap-2 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold">Plateau Scénique</span>
                    <span className="text-[#a0a8b0]">·</span>
                    <span className="text-[#d7b86a] font-mono">
                      {selectedClip ? `${selectedClip.name} [Actif]` : 'Vue Générale'}
                    </span>
                  </div>
                </div>

                <div className="absolute top-3 right-4 pointer-events-none">
                  <div className="bg-[#101214]/85 backdrop-blur-md border border-[#303740] rounded px-2.5 py-1 text-[10px] text-[#a0a8b0] font-mono">
                    Conduite : {cues.find((c) => Math.abs(c.timeSec - currentTimeSec) < 1.0)?.label || 'Plateau en cours'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative flex items-center justify-center">
                {renderSurface}
                <div className="absolute top-4 left-4 pointer-events-none bg-[#101214]/80 backdrop-blur-md border border-[#303740] rounded px-3 py-1.5 text-[11px] text-[#f2f3f4]">
                  <span>Ambiance : </span>
                  <span className="text-cyan-300 font-medium">{currentScene.visualMood}</span>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Multi-pistes Inspirée de Millumin */}
          <MilluminTimeline
            currentTimeSec={currentTimeSec}
            totalDurationSec={totalDurationSec}
            isPlaying={isPlaying}
            loop={isLooping}
            tracks={tracks}
            clips={clips}
            cues={cues}
            selectedClipId={selectedClipId}
            isAudioMuted={isAudioMuted}
            onPlayPause={() => {
              scenicAudio.resume();
              setIsPlaying(!isPlaying);
            }}
            onSeek={(t) => setCurrentTimeSec(t)}
            onReset={() => {
              setCurrentTimeSec(0);
              setIsPlaying(false);
            }}
            onToggleLoop={() => setIsLooping(!isLooping)}
            onToggleAudioMute={() => {
              const muted = scenicAudio.toggleMute();
              setIsAudioMuted(muted);
            }}
            onSelectClip={(id) => {
              setSelectedClipId(id);
              setSidebarTab('inspector');
            }}
            onDoubleClickClip={(clip) => {
              setSelectedClipId(clip.id);
              setClipForPrompt(clip);
              setIsContextualPromptOpen(true);
            }}
            onTriggerCue={handleTriggerCue}
            onAddCueAtCurrentTime={handleAddCueAtCurrentTime}
            onAddClipToTrack={(trackId) => {
              const matching = library.find((e) => e.defaultTrackId === trackId) || library[0];
              if (matching) handleInsertFromLibrary(matching, trackId);
            }}
            onToggleTrackMute={(trackId) => {
              setTracks((prev) =>
                prev.map((t) => (t.id === trackId ? { ...t, isMuted: !t.isMuted } : t))
              );
            }}
          />
        </div>

        {/* Right Sidebar : Tabbed (Inspecteur Régie / Compagnon Proactif / Dialogue Vibe) */}
        <div className="w-full lg:w-84 bg-[#14171a] border-t lg:border-t-0 lg:border-l border-[#303740] flex flex-col justify-between overflow-hidden shrink-0">
          {/* Sidebar Tab Header */}
          <div className="flex bg-[#101214] border-b border-[#303740] p-1 gap-1 shrink-0">
            <button
              onClick={() => setSidebarTab('inspector')}
              className={`flex-1 py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                sidebarTab === 'inspector'
                  ? 'bg-[#171a1e] text-[#d7b86a] border border-[#303740]'
                  : 'text-[#a0a8b0] hover:text-[#f2f3f4]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Inspecteur</span>
            </button>
            <button
              onClick={() => setSidebarTab('proactive')}
              className={`flex-1 py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors relative ${
                sidebarTab === 'proactive'
                  ? 'bg-[#171a1e] text-amber-300 border border-[#303740]'
                  : 'text-[#a0a8b0] hover:text-[#f2f3f4]'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Compagnon</span>
              {proactiveSuggestions.length > 0 && (
                <span className="px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono">
                  {proactiveSuggestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSidebarTab('dialogue')}
              className={`flex-1 py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                sidebarTab === 'dialogue'
                  ? 'bg-[#171a1e] text-cyan-400 border border-[#303740]'
                  : 'text-[#a0a8b0] hover:text-[#f2f3f4]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dialogue</span>
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {sidebarTab === 'inspector' ? (
              <ScenicInspectorPanel
                selectedClip={selectedClip}
                tracks={tracks}
                onUpdateClip={handleUpdateClip}
                onOpenContextualPrompt={(c) => {
                  setClipForPrompt(c);
                  setIsContextualPromptOpen(true);
                }}
                onSaveClipAsReusableElement={handleSaveClipAsReusable}
                onDeleteClip={handleDeleteClip}
                onOpenScenographyModal={onOpenScenography}
              />
            ) : sidebarTab === 'proactive' ? (
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#121417]">
                {/* Header Profile Context */}
                <div className="p-3 bg-gradient-to-b from-[#181a1f] to-[#121417] border-b border-[#303740] shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span className="text-[10px] font-mono tracking-wider uppercase text-amber-400 font-bold">
                        Compagnon Créatif
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono">100% Hors-Ligne</span>
                  </div>
                  <h3 className="text-xs font-semibold text-[#f2f3f4] leading-snug">{showProfile.themeTitle}</h3>
                  <p className="text-[11px] text-[#a0a8b0] mt-0.5 leading-relaxed">{showProfile.themeDescription}</p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#262c33] text-[10px] text-zinc-400 font-mono">
                    <span className="truncate mr-2">Ambiance : <strong className="text-cyan-300 font-normal">{showProfile.dominantMood}</strong></span>
                    <span className="shrink-0 text-amber-300">{showProfile.elementsSummary}</span>
                  </div>
                </div>

                {/* Suggestions List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[#a0a8b0] mb-1">
                    <span className="font-medium text-[#f2f3f4]">Suggestions Spontanées</span>
                    <span className="text-[10px] text-amber-400 font-mono">{proactiveSuggestions.length} idées actives</span>
                  </div>

                  {proactiveSuggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className="p-3 rounded-lg bg-[#14171b] hover:bg-[#181c22] border border-[#262c33] hover:border-amber-500/40 transition-all space-y-2 shadow-sm text-xs"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base select-none">{sug.iconEmoji}</span>
                          <div>
                            <h4 className="text-xs font-semibold text-[#f2f3f4] leading-tight">{sug.title}</h4>
                            <span className="inline-block mt-0.5 text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {sug.categoryLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#cbd5e1] leading-relaxed">
                        {sug.description}
                      </p>

                      <div className="p-2 rounded bg-[#0b0d10] border border-[#1e232a] text-[10px] space-y-1">
                        <div className="text-zinc-400 flex items-center gap-1 font-mono">
                          <span className="text-amber-400">💡</span>
                          <span>{sug.rationale}</span>
                        </div>
                        {sug.suggestedPreset && (
                          <div className="text-zinc-500 font-mono text-[9px] pt-1 border-t border-[#171b20] flex flex-wrap gap-x-2">
                            {sug.suggestedPreset.visualFx && <span>Fx: <strong className="text-purple-300">{sug.suggestedPreset.visualFx}</strong></span>}
                            {sug.suggestedPreset.animationMode && <span>Mode: <strong className="text-amber-300">{sug.suggestedPreset.animationMode}</strong></span>}
                            {sug.suggestedPreset.synthPreset && <span>Audio: <strong className="text-emerald-300">{sug.suggestedPreset.synthPreset}</strong></span>}
                            {sug.suggestedPreset.motionSpeed && <span>Vitesse: <strong className="text-cyan-300">{sug.suggestedPreset.motionSpeed}x</strong></span>}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {selectedClip && (
                          <button
                            onClick={() => handleApplySuggestionToClip(sug)}
                            className="px-2 py-1 text-[10px] font-medium rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors flex items-center gap-1"
                            title={`Appliquer ces préréglages directement sur le clip sélectionné "${selectedClip.name}"`}
                          >
                            <Wand2 className="w-3 h-3 text-amber-400" />
                            <span>Sur clip</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleInsertSuggestionClip(sug)}
                          className="px-2 py-1 text-[10px] font-medium rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors flex items-center gap-1"
                          title="Créer un nouveau clip sur la piste adaptée à la tête de lecture"
                        >
                          <Plus className="w-3 h-3 text-cyan-400" />
                          <span>Timeline (+Clip)</span>
                        </button>

                        <button
                          onClick={() => {
                            handleSendIntent(sug.actionPrompt);
                            setSidebarTab('dialogue');
                          }}
                          className="px-2 py-1 text-[10px] font-medium rounded bg-[#1c2128] hover:bg-[#252c36] text-[#a0a8b0] hover:text-[#f2f3f4] border border-[#303740] transition-colors flex items-center gap-1 ml-auto"
                          title="Transmettre l'instruction au dialogue artistique"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Prompt</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Quick-Bar */}
                <div className="p-2.5 bg-[#0e1013] border-t border-[#262c33] flex items-center justify-between text-[11px] shrink-0">
                  <span className="text-zinc-500 font-mono text-[10px]">Contextuel temps réel</span>
                  <button
                    onClick={() => setSidebarTab('inspector')}
                    className="text-amber-400 hover:text-amber-300 font-semibold text-[10px] flex items-center gap-1"
                  >
                    <span>Inspecter la scène</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                {/* Traditional Scene Sliders */}
                <div className="p-4 border-b border-[#303740] overflow-y-auto max-h-[38vh]">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#20242a]">
                    <span className="text-[#f2f3f4] font-semibold text-xs">
                      Paramètres du Moteur Actif
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Modulation directe</span>
                  </div>

                  <div className="space-y-3">
                    {currentScene.parameters.map((param) => (
                      <div key={param.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#a0a8b0]">{param.label}</span>
                          <span className="text-[#d7b86a] font-mono font-semibold tabular-nums">
                            {param.value.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={param.value}
                          onChange={(e) => onParameterChange(param.id, parseFloat(e.target.value))}
                          className="w-full h-1 bg-[#20242a] rounded accent-[#d7b86a] cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Suggestions scéniques */}
                  <div className="mt-4 pt-3 border-t border-[#20242a]">
                    <span className="text-[11px] text-[#a0a8b0] mb-2 block font-medium">
                      Suggestions rapides :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Ralentir la cadence',
                        'Ambiance plus sombre',
                        'Plus d’éclat et traînées',
                        'Fluide et hypnotique',
                        'Kaléidoscope rétro'
                      ].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => handleSendIntent(chip)}
                          className="px-2 py-1 text-[11px] text-[#a0a8b0] hover:text-[#f2f3f4] bg-[#101214] hover:bg-[#20242a] border border-[#303740] rounded transition-colors text-left"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Conversational Intention Dialogue */}
                <div className="flex-1 flex flex-col min-h-0 bg-[#121518] p-4">
                  <div className="flex items-center gap-1.5 text-[#f2f3f4] font-medium text-xs mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dialogue Artistique avec No[co]de</span>
                  </div>

                  {/* Chat History */}
                  <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 text-xs">
                    {conversation.map((turn) => {
                      const isArtist = turn.sender === 'artist';
                      return (
                        <div
                          key={turn.id}
                          className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                            isArtist
                              ? 'bg-[#171a1e] text-[#f2f3f4] border border-[#303740] self-end'
                              : 'bg-[#101214] text-[#a0a8b0] border border-[#20242a]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                            <span className="font-semibold text-zinc-400">
                              {isArtist ? 'Vous (Artiste / Metteur en scène)' : 'No[co]de Assistant'}
                            </span>
                            <span>{turn.timestamp}</span>
                          </div>
                          <p>{turn.text}</p>
                          {turn.appliedAction && (
                            <span className="inline-block mt-1 text-[10px] text-[#d7b86a] font-mono">
                              ✓ {turn.appliedAction}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendIntent();
                    }}
                    className="flex items-center gap-2 pt-2 border-t border-[#303740]"
                  >
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-2 rounded border transition-colors ${
                          isListening
                            ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                            : 'bg-[#171a1e] border-[#303740] text-[#a0a8b0] hover:text-[#f2f3f4]'
                        }`}
                        title={isListening ? 'Arrêter dictée' : 'Parler à No[co]de'}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    )}

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Ex : Rendre l'effet plus hypnotique et lent..."
                      className="flex-1 px-3 py-1.5 bg-[#171a1e] border border-[#303740] rounded text-xs text-[#f2f3f4] placeholder:text-zinc-600 focus:outline-none focus:border-[#d7b86a]"
                    />

                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-2 bg-[#d7b86a] hover:bg-[#c4a457] text-[#101214] font-semibold rounded transition-colors disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals : Bibliothèque d'Éléments & Prompt Artistique Contextuel */}
      <ScenicLibraryDrawer
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        library={library}
        tracks={tracks}
        currentTimeSec={currentTimeSec}
        onInsertElementToTimeline={handleInsertFromLibrary}
        onCreateCompoundBlock={handleCreateCompoundBlock}
      />

      <ContextualPromptModal
        isOpen={isContextualPromptOpen}
        onClose={() => {
          setIsContextualPromptOpen(false);
          setClipForPrompt(null);
        }}
        clip={clipForPrompt}
        onApplyModification={(updated, explanation) => {
          handleUpdateClip(updated);
          setConversation((prev) => [
            ...prev,
            {
              id: `user-${Date.now()}`,
              sender: 'artist',
              text: `Modification ciblée sur ${updated.name}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            {
              id: `sys-${Date.now()}`,
              sender: 'nocode',
              text: explanation,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }}
      />
    </div>
  );
};
