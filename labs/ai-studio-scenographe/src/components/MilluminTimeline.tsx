// Composant Timeline Multi-pistes Inspiré de Millumin pour No[co]de Vibe Designer
// Gestion des Layers de projection, Clips temporels, Cues de régie (TOPs) et Transport synchrone
// Fonctionnalités Régie Professionnelle : Commutateur 'LIVE' vs 'SILENT EDITION' (Édition Aveugle) & 'PUSH TO STAGE' avec fondu

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  TimelineClip,
  TimelineTrack,
  CueItem,
  ReusableScenicElement
} from '../types/timeline';
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Volume2,
  VolumeX,
  Plus,
  Flag,
  Radio,
  Sliders,
  Layers,
  Sparkles,
  ChevronRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Send,
  Check,
  X,
  Edit3,
  Trash2,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  SlidersHorizontal,
  Copy,
  Zap,
  Info
} from 'lucide-react';
import { scenicAudio } from '../services/scenicAudioEngine';
import { liveBridge } from '../services/livePerformanceBridge';

export type TimelineMode = 'LIVE' | 'SILENT_EDITION';

export interface MilluminTimelineProps {
  currentTimeSec: number;
  totalDurationSec: number;
  isPlaying: boolean;
  loop: boolean;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  cues: CueItem[];
  selectedClipId: string | null;
  isAudioMuted: boolean;
  onPlayPause: () => void;
  onSeek: (timeSec: number) => void;
  onReset: () => void;
  onToggleLoop: () => void;
  onToggleAudioMute: () => void;
  onSelectClip: (clipId: string) => void;
  onDoubleClickClip: (clip: TimelineClip) => void;
  onTriggerCue: (cue: CueItem) => void;
  onAddCueAtCurrentTime: () => void;
  onAddClipToTrack: (trackId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  // Nouvelles fonctionnalités régie
  onPushToStage?: (cues: CueItem[], fadeDurationSec: number) => void;
  onUpdateCues?: (cues: CueItem[]) => void;
  initialMode?: TimelineMode;
  onModeChange?: (mode: TimelineMode) => void;
}

export const MilluminTimeline: React.FC<MilluminTimelineProps> = ({
  currentTimeSec,
  totalDurationSec,
  isPlaying,
  loop,
  tracks,
  clips,
  cues,
  selectedClipId,
  isAudioMuted,
  onPlayPause,
  onSeek,
  onReset,
  onToggleLoop,
  onToggleAudioMute,
  onSelectClip,
  onDoubleClickClip,
  onTriggerCue,
  onAddCueAtCurrentTime,
  onAddClipToTrack,
  onToggleTrackMute,
  onPushToStage,
  onUpdateCues,
  initialMode = 'LIVE',
  onModeChange
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  // 1. COMMUTATEUR LIVE VS SILENT EDITION
  const [mode, setMode] = useState<TimelineMode>(initialMode);

  // 2. ÉTAT DU BUFFER D'ÉDITION AVEUGLE (STAGING)
  const [stagedCues, setStagedCues] = useState<CueItem[]>(() => cues);
  const [modifiedCueIds, setModifiedCueIds] = useState<Set<string>>(new Set());
  const [selectedBlindCueId, setSelectedBlindCueId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // 3. PARAMÈTRES DU FONDU & PUSH TO STAGE
  const [fadeDurationSec, setFadeDurationSec] = useState<number>(1.0);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushProgress, setPushProgress] = useState<number>(0);
  const [pushToast, setPushToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Synchronisation des cues publiques vers stagedCues lorsqu'aucune modification locale n'est en attente
  useEffect(() => {
    if (modifiedCueIds.size === 0) {
      setStagedCues(cues);
    }
  }, [cues, modifiedCueIds.size]);

  // Nombre de modifications en attente de validation scénique
  const pendingChangesCount = modifiedCueIds.size;

  // Cues actives selon le mode (stagedCues en SILENT EDITION pour l'affichage et l'édition aveugle, cues en LIVE)
  const displayCues = mode === 'SILENT_EDITION' ? stagedCues : cues;

  // Cue sélectionnée pour l'édition aveugle
  const editingCue = useMemo(() => {
    if (!selectedBlindCueId) return null;
    return stagedCues.find((c) => c.id === selectedBlindCueId) || null;
  }, [selectedBlindCueId, stagedCues]);

  // Prochain TOP dans la conduite publique
  const upcomingCue = displayCues
    .filter((c) => c.timeSec > currentTimeSec)
    .sort((a, b) => a.timeSec - b.timeSec)[0] || displayCues[0];

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleModeSwitch = (newMode: TimelineMode) => {
    setMode(newMode);
    if (onModeChange) onModeChange(newMode);

    if (newMode === 'SILENT_EDITION') {
      setPushToast({
        message: 'Mode Édition Aveugle activé : modifiez la conduite sans perturber la sortie publique.',
        type: 'info'
      });
      setTimeout(() => setPushToast(null), 3500);
    } else {
      setIsInspectorOpen(false);
    }
  };

  // Clic sur la règle de temps
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * totalDurationSec);
  };

  // Gestion du clic sur un marqueur de Cue (Différencié LIVE vs SILENT EDITION)
  const handleCueClick = (cue: CueItem, e: React.MouseEvent) => {
    e.stopPropagation();

    if (mode === 'LIVE') {
      // En mode LIVE : Déclenchement direct du TOP scénique public
      onTriggerCue(cue);
    } else {
      // En mode SILENT EDITION : Édition aveugle SANS impacter la sortie publique
      setSelectedBlindCueId(cue.id);
      setIsInspectorOpen(true);
    }
  };

  // Ajout d'une Cue en mode SILENT EDITION
  const handleAddSilentCue = () => {
    const newNum = stagedCues.length + 1;
    const targetTime = parseFloat(currentTimeSec.toFixed(1));
    const newCue: CueItem = {
      id: `blind-cue-${Date.now()}`,
      cueNumber: newNum,
      label: `TOP ${newNum} [Blind] — à ${targetTime}s`,
      timeSec: targetTime,
      action: 'jump_and_play',
      oscAddress: `/cue/${newNum}`,
      description: `Cue préparée en édition aveugle à ${targetTime}s.`
    };

    setStagedCues((prev) => [...prev, newCue]);
    setModifiedCueIds((prev) => new Set(prev).add(newCue.id));
    setSelectedBlindCueId(newCue.id);
    setIsInspectorOpen(true);

    setPushToast({
      message: `TOP ${newNum} ajouté en Blind (non actif sur scène). Cliquez sur PUSH TO STAGE pour appliquer.`,
      type: 'info'
    });
    setTimeout(() => setPushToast(null), 3000);
  };

  // Mise à jour d'une propriété de la Cue sélectionnée en aveugle
  const handleUpdateBlindCue = (updatedFields: Partial<CueItem>) => {
    if (!editingCue) return;

    setStagedCues((prev) =>
      prev.map((c) => (c.id === editingCue.id ? { ...c, ...updatedFields } : c))
    );
    setModifiedCueIds((prev) => new Set(prev).add(editingCue.id));
  };

  // Suppression d'une Cue en aveugle
  const handleDeleteBlindCue = (cueId: string) => {
    setStagedCues((prev) => prev.filter((c) => c.id !== cueId));
    setModifiedCueIds((prev) => new Set(prev).add(`deleted-${cueId}`));
    if (selectedBlindCueId === cueId) {
      setSelectedBlindCueId(null);
      setIsInspectorOpen(false);
    }
  };

  // Duplication d'une Cue en aveugle
  const handleDuplicateBlindCue = (sourceCue: CueItem) => {
    const newNum = stagedCues.length + 1;
    const duplicatedTime = Math.min(totalDurationSec, sourceCue.timeSec + 1.0);
    const newCue: CueItem = {
      ...sourceCue,
      id: `blind-cue-dup-${Date.now()}`,
      cueNumber: newNum,
      label: `${sourceCue.label} (Copie)`,
      timeSec: parseFloat(duplicatedTime.toFixed(1)),
      oscAddress: `/cue/${newNum}`
    };

    setStagedCues((prev) => [...prev, newCue]);
    setModifiedCueIds((prev) => new Set(prev).add(newCue.id));
    setSelectedBlindCueId(newCue.id);
  };

  // Annulation des modifications aveugles (Revert to Stage)
  const handleRevertChanges = () => {
    setStagedCues(cues);
    setModifiedCueIds(new Set());
    setSelectedBlindCueId(null);
    setIsInspectorOpen(false);

    setPushToast({
      message: 'Modifications aveugles annulées. La conduite est synchronisée avec la scène publique.',
      type: 'info'
    });
    setTimeout(() => setPushToast(null), 3000);
  };

  // APPLICATION DES CHANGEMENTS SUR SCÈNE AVEC FONDU : PUSH TO STAGE
  const handlePushToStage = () => {
    if (isPushing) return;

    setIsPushing(true);
    setPushProgress(0);

    // 1. Retour acoustique doux de régie (balayage harmonique de fondu)
    scenicAudio.triggerStageCrossfade(fadeDurationSec);

    // 2. Envoi OSC de synchronisation de transition
    liveBridge.sendOSC('/stage/crossfade', [fadeDurationSec, stagedCues.length]);
    liveBridge.sendOSC('/cue/push', [stagedCues.length, fadeDurationSec]);

    // 3. Animation de la progression du fondu
    const totalMs = Math.max(400, fadeDurationSec * 1000);
    const startTime = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setPushProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setIsPushing(false);

        // 4. Transmission des cues validées au parent
        if (onPushToStage) {
          onPushToStage(stagedCues, fadeDurationSec);
        }
        if (onUpdateCues) {
          onUpdateCues(stagedCues);
        }

        // Réinitialisation de l'état de modification
        setModifiedCueIds(new Set());

        setPushToast({
          message: `Conduite appliquée sur scène avec succès (fondu de ${fadeDurationSec}s) !`,
          type: 'success'
        });
        setTimeout(() => setPushToast(null), 3500);
      }
    }, 25);
  };

  return (
    <div
      className={`flex flex-col select-none text-xs text-[#f2f3f4] h-72 shrink-0 overflow-hidden relative transition-colors duration-300 ${
        mode === 'SILENT_EDITION'
          ? 'bg-[#151310] border-t-2 border-amber-500/80'
          : 'bg-[#14171a] border-t border-[#303740]'
      }`}
    >
      {/* OVERLAY D'ANIMATION DE FONDU SCÉNIQUE LORS DU PUSH TO STAGE */}
      {isPushing && (
        <div className="absolute inset-0 z-50 bg-[#101214]/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm tracking-wider uppercase animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Fondu Scénique en Cours (Push to Stage)...</span>
          </div>

          <div className="w-80 h-3 bg-zinc-900 border border-amber-500/50 rounded-full overflow-hidden p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-emerald-400 rounded-full transition-all duration-75"
              style={{ width: `${pushProgress}%` }}
            />
          </div>

          <div className="mt-2 text-[11px] text-zinc-400 font-mono">
            Transition fluide : {Math.round(pushProgress)}% ({fadeDurationSec}s) — Application des Cues au plateau
          </div>
        </div>
      )}

      {/* TOAST DE NOTIFICATION RÉGIE */}
      {pushToast && (
        <div
          className={`absolute top-10 right-4 z-40 px-3 py-1.5 rounded shadow-lg border text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            pushToast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300'
              : 'bg-amber-950/90 border-amber-500/80 text-amber-300'
          }`}
        >
          {pushToast.type === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Info className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{pushToast.message}</span>
        </div>
      )}

      {/* 1. BARRE DE TRANSPORT, COMMUTATEUR LIVE / SILENT & PUSH TO STAGE */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b gap-3 transition-colors duration-300 ${
          mode === 'SILENT_EDITION'
            ? 'bg-[#1a1612] border-amber-500/40'
            : 'bg-[#101214] border-[#303740]'
        }`}
      >
        {/* Section Gauche : Transport & Timecode */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="p-1.5 rounded bg-[#171a1e] hover:bg-[#20242a] text-[#a0a8b0] hover:text-[#f2f3f4] border border-[#303740] transition-colors"
            title="Retour au début (00:00:00)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onPlayPause}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold'
                : 'bg-[#d7b86a] hover:bg-[#c4a457] text-[#101214] font-semibold'
            }`}
            title="Lecture / Pause (Espace)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="text-[11px] font-bold">{isPlaying ? 'PAUSE' : 'LECTURE'}</span>
          </button>

          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded border transition-colors ${
              loop
                ? 'bg-[#d7b86a]/20 border-[#d7b86a] text-[#d7b86a]'
                : 'bg-[#171a1e] border-[#303740] text-[#a0a8b0] hover:text-[#f2f3f4]'
            }`}
            title={loop ? 'Boucle activée' : 'Boucle désactivée'}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleAudioMute}
            className={`p-1.5 rounded border transition-colors ${
              isAudioMuted
                ? 'bg-red-950/40 border-red-800 text-red-400'
                : 'bg-[#171a1e] border-[#303740] text-[#a0a8b0] hover:text-emerald-400'
            }`}
            title={isAudioMuted ? 'Audio coupé (Mute)' : 'Audio synchrone actif'}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Timecode Display */}
          <div className="font-mono bg-[#0c0e10] border border-[#303740] px-2 py-1 rounded text-cyan-400 text-[11px] tabular-nums ml-1">
            {formatTimecode(currentTimeSec)} / {formatTimecode(totalDurationSec)}
          </div>
        </div>

        {/* Section Centre : COMMUTATEUR 'LIVE' VS 'SILENT EDITION' */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0c0e10] p-0.5 rounded-lg border border-[#303740] shadow-inner">
            <button
              onClick={() => handleModeSwitch('LIVE')}
              className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                mode === 'LIVE'
                  ? 'bg-emerald-600 text-zinc-950 shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Mode LIVE : Vos déclenchements impactent directement le plateau scénique en direct"
            >
              <span className={`w-2 h-2 rounded-full ${mode === 'LIVE' ? 'bg-zinc-950 animate-ping' : 'bg-zinc-600'}`} />
              <span>LIVE</span>
            </button>

            <button
              onClick={() => handleModeSwitch('SILENT_EDITION')}
              className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all relative ${
                mode === 'SILENT_EDITION'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 ring-1 ring-amber-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Mode SILENT EDITION (Édition Aveugle / Blind) : Modifiez, réordonnez et préparez les TOPs sans impacter la sortie publique"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SILENT EDITION</span>
              {pendingChangesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-zinc-950 text-amber-300 font-mono font-bold">
                  {pendingChangesCount}
                </span>
              )}
            </button>
          </div>

          {/* Badge indicateur de sécurité en Silent Edition */}
          {mode === 'SILENT_EDITION' && (
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>SORTIE PUBLIQUE ISOLÉE</span>
            </div>
          )}
        </div>

        {/* Section Droite : PUSH TO STAGE & BOUTONS CONDUITE */}
        <div className="flex items-center gap-2">
          {/* SÉLECTEUR DE DURÉE DU FONDU */}
          <div className="flex items-center gap-1 px-2 py-1 bg-[#121417] border border-[#303740] rounded text-[10px]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-zinc-400">Fondu :</span>
            <select
              value={fadeDurationSec}
              onChange={(e) => setFadeDurationSec(parseFloat(e.target.value))}
              className="bg-[#0c0e10] border border-[#2d333b] rounded px-1 py-0.5 text-amber-300 font-mono text-[10px] focus:outline-none cursor-pointer"
              title="Durée du fondu enchaîné appliqué lors du Push to Stage"
            >
              <option value={0.5}>0.5s (Cut doux)</option>
              <option value={1.0}>1.0s (Normal)</option>
              <option value={2.0}>2.0s (Théâtre)</option>
              <option value={3.0}>3.0s (Ambiance)</option>
              <option value={5.0}>5.0s (Lent)</option>
            </select>
          </div>

          {/* BOUTON 'PUSH TO STAGE' */}
          <button
            onClick={handlePushToStage}
            disabled={isPushing}
            className={`px-3 py-1.5 rounded font-bold flex items-center gap-1.5 transition-all text-xs uppercase tracking-wider shadow-md ${
              isPushing
                ? 'bg-amber-600/50 text-zinc-300 cursor-wait'
                : pendingChangesCount > 0
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-zinc-950 shadow-amber-500/30 ring-1 ring-amber-300 animate-pulse'
                : mode === 'SILENT_EDITION'
                ? 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50'
                : 'bg-[#1c2026] hover:bg-[#252b33] text-zinc-300 border border-[#303740]'
            }`}
            title="Appliquer immédiatement les modifications préparées en mode aveugle vers le plateau public avec le fondu sélectionné"
          >
            <Send className="w-3.5 h-3.5" />
            <span>PUSH TO STAGE</span>
            {pendingChangesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-zinc-950 text-amber-300 font-mono font-bold">
                {pendingChangesCount}
              </span>
            )}
          </button>

          {/* Prochain TOP & GO (TOP) en LIVE */}
          {mode === 'LIVE' ? (
            <>
              {upcomingCue && (
                <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-[#171a1e] border border-[#303740] rounded text-[10px]">
                  <span className="text-[#a0a8b0]">Prochain :</span>
                  <span className="text-[#d7b86a] font-medium truncate max-w-[120px]">
                    {upcomingCue.label}
                  </span>
                  <span className="text-zinc-500 font-mono">@{upcomingCue.timeSec.toFixed(1)}s</span>
                </div>
              )}

              <button
                onClick={() => upcomingCue && onTriggerCue(upcomingCue)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold rounded flex items-center gap-1.5 shadow-sm shadow-emerald-950/50 transition-colors uppercase tracking-wider text-xs"
                title="Déclencher le prochain TOP scénique en direct (Régie GO)"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>GO (TOP)</span>
              </button>

              <button
                onClick={onAddCueAtCurrentTime}
                className="px-2 py-1.5 bg-[#171a1e] hover:bg-[#20242a] text-[#a0a8b0] hover:text-[#f2f3f4] border border-[#303740] rounded flex items-center gap-1 text-[11px]"
                title="Ajouter un marqueur de Cue en direct à l'instant actuel"
              >
                <Flag className="w-3 h-3 text-[#d7b86a]" />
                <span>+ TOP</span>
              </button>
            </>
          ) : (
            /* CONTRÔLES SPÉCIFIQUES SILENT EDITION */
            <>
              <button
                onClick={handleAddSilentCue}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded flex items-center gap-1.5 text-xs transition-colors shadow-sm"
                title="Ajouter un TOP en aveugle sans l'exécuter sur le plateau public"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ TOP AVEUGLE</span>
              </button>

              {pendingChangesCount > 0 && (
                <button
                  onClick={handleRevertChanges}
                  className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-700 rounded text-[11px] transition-colors"
                  title="Annuler toutes les modifications aveugles et revenir à la conduite publique"
                >
                  Annuler
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* BANDEAU INFORMATIF SILENT EDITION */}
      {mode === 'SILENT_EDITION' && (
        <div className="bg-amber-950/40 border-b border-amber-500/30 px-3 py-1 flex items-center justify-between text-[11px] text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300">Édition Aveugle active :</span>
            <span className="text-amber-200/90">
              Cliquez sur n'importe quel TOP pour ajuster son timecode, label ou OSC. Le public ne verra que les changements une fois validés via « PUSH TO STAGE ».
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>TOPs Staged : {stagedCues.length}</span>
            <span className="text-amber-400">En attente de Push : {pendingChangesCount}</span>
          </div>
        </div>
      )}

      {/* 2. REGLE DU TEMPS AVEC MARQUEURS DE CUES & TÊTE DE LECTURE */}
      <div
        className={`flex border-b h-6 items-center transition-colors duration-200 ${
          mode === 'SILENT_EDITION'
            ? 'bg-[#17130e] border-amber-500/30'
            : 'bg-[#101214] border-[#303740]'
        }`}
      >
        {/* En-tête des pistes (colonne de gauche) */}
        <div className="w-64 px-3 text-[10px] text-[#a0a8b0] font-semibold uppercase tracking-wider border-r border-[#303740] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#d7b86a]" />
            <span>Layers de Projection</span>
          </div>
          <span className={`text-[9px] px-1 rounded font-mono ${
            mode === 'SILENT_EDITION' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-500'
          }`}>
            {mode === 'SILENT_EDITION' ? 'BLIND MODE' : 'MILLUMIN LIVE'}
          </span>
        </div>

        {/* Zone de la règle temporelle */}
        <div
          ref={rulerRef}
          onClick={handleRulerClick}
          className={`flex-1 relative h-full cursor-pointer overflow-hidden ${
            mode === 'SILENT_EDITION' ? 'bg-[#1a1612]' : 'bg-[#14171a]'
          }`}
        >
          {/* Graduations de secondes */}
          {Array.from({ length: Math.ceil(totalDurationSec / 2) + 1 }).map((_, i) => {
            const sec = i * 2;
            const pct = (sec / totalDurationSec) * 100;
            return (
              <div
                key={sec}
                className="absolute top-0 bottom-0 border-l border-zinc-800 text-[9px] text-[#a0a8b0] pl-1 pt-0.5 pointer-events-none"
                style={{ left: `${pct}%` }}
              >
                {sec}s
              </div>
            );
          })}

          {/* Marqueurs Cues (Drapeaux TOPs de régie) */}
          {displayCues.map((cue) => {
            const pct = (cue.timeSec / totalDurationSec) * 100;
            const isModifiedInStaging = modifiedCueIds.has(cue.id);
            const isSelectedBlind = selectedBlindCueId === cue.id;

            return (
              <button
                key={cue.id}
                onClick={(e) => handleCueClick(cue, e)}
                className="absolute top-0 bottom-0 z-10 flex items-center -translate-x-1/2 group"
                style={{ left: `${pct}%` }}
                title={
                  mode === 'SILENT_EDITION'
                    ? `[SILENT EDITION] ${cue.label} (@${cue.timeSec}s)\nCliquez pour éditer sans déclencher sur scène !`
                    : `${cue.label} (@${cue.timeSec}s) — Cliquez pour déclencher sur scène`
                }
              >
                <div
                  className={`w-3 h-3 rounded-full flex items-center justify-center shadow-sm transition-all ${
                    mode === 'SILENT_EDITION'
                      ? isModifiedInStaging
                        ? 'bg-amber-400 border-2 border-amber-200 ring-2 ring-amber-500/60 scale-110 animate-pulse'
                        : isSelectedBlind
                        ? 'bg-amber-300 border border-zinc-950 ring-2 ring-amber-400 scale-125'
                        : 'bg-amber-600/80 border border-amber-900 group-hover:scale-125'
                      : 'bg-[#d7b86a] border border-[#101214] group-hover:scale-125'
                  }`}
                >
                  {isModifiedInStaging && mode === 'SILENT_EDITION' && (
                    <span className="w-1 h-1 rounded-full bg-zinc-950" />
                  )}
                </div>

                {/* Bulle d'information au survol */}
                <span
                  className={`absolute top-4 left-1 px-1.5 py-0.5 rounded text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none border shadow-md ${
                    mode === 'SILENT_EDITION'
                      ? 'bg-amber-950 text-amber-200 border-amber-600 font-mono'
                      : 'bg-[#101214]/90 text-[#d7b86a] border-[#303740]'
                  }`}
                >
                  {mode === 'SILENT_EDITION' ? `[BLIND] ${cue.label}` : cue.label}
                  {isModifiedInStaging && ' ★ (Staged)'}
                </span>
              </button>
            );
          })}

          {/* Tête de lecture (Playhead) */}
          <div
            className={`absolute top-0 bottom-0 w-0.5 z-30 pointer-events-none ${
              mode === 'SILENT_EDITION'
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
            }`}
            style={{ left: `${(currentTimeSec / totalDurationSec) * 100}%` }}
          >
            <div
              className={`w-2.5 h-2.5 rotate-45 -translate-x-[4px] -translate-y-1 shadow-sm ${
                mode === 'SILENT_EDITION' ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 3. PISTES MULTI-LAYERS ET CLIPS SCÉNOGRAPHIQUES */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {tracks.map((track) => {
          const trackClips = clips.filter((c) => c.trackId === track.id);

          return (
            <div
              key={track.id}
              className={`flex border-b transition-colors h-10 ${
                mode === 'SILENT_EDITION'
                  ? 'border-amber-500/10 hover:bg-[#1f1b16]'
                  : 'border-[#303740]/60 hover:bg-[#1a1d22]'
              }`}
            >
              {/* En-tête de piste (Gauche) */}
              <div
                className={`w-64 px-3 flex items-center justify-between border-r shrink-0 ${
                  mode === 'SILENT_EDITION'
                    ? 'bg-[#14120e] border-amber-500/20'
                    : 'bg-[#121518] border-[#303740]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: track.color }}
                  />
                  <span className="text-[11px] font-medium truncate text-[#f2f3f4]">
                    {track.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onToggleTrackMute(track.id)}
                    className={`p-1 rounded ${
                      track.isMuted ? 'text-red-400 bg-red-950/40' : 'text-[#a0a8b0] hover:text-[#f2f3f4]'
                    }`}
                    title={track.isMuted ? 'Activer le layer' : 'Muter le layer'}
                  >
                    {track.isMuted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>

                  <button
                    onClick={() => onAddClipToTrack(track.id)}
                    className="p-1 rounded text-[#a0a8b0] hover:text-[#d7b86a] hover:bg-[#20242a]"
                    title="Ajouter un élément depuis la bibliothèque sur ce layer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Ligne temporelle du layer (Droite) avec clips */}
              <div
                onClick={handleRulerClick}
                className="flex-1 relative h-full bg-[#171a1e]/40 overflow-hidden cursor-pointer"
              >
                {/* Lignes verticales de fond de grille */}
                {Array.from({ length: Math.ceil(totalDurationSec / 2) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-[#20242a]/80 pointer-events-none"
                    style={{ left: `${(i * 2 / totalDurationSec) * 100}%` }}
                  />
                ))}

                {/* Clips placés sur ce layer */}
                {trackClips.map((clip) => {
                  const leftPct = (clip.startTime / totalDurationSec) * 100;
                  const widthPct = (clip.duration / totalDurationSec) * 100;
                  const isSelected = selectedClipId === clip.id;
                  const isCurrentlyActive =
                    currentTimeSec >= clip.startTime &&
                    currentTimeSec <= clip.startTime + clip.duration;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onDoubleClickClip(clip);
                      }}
                      className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-[11px] font-medium cursor-pointer transition-all shadow-sm ${
                        isSelected
                          ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-[#101214] z-20'
                          : 'z-10 hover:brightness-110'
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: `${clip.color}33`,
                        border: `1px solid ${clip.color}`
                      }}
                      title={`${clip.name} (${clip.startTime}s - ${clip.startTime + clip.duration}s)\nSimple clic : Inspecteur\nDouble-clic : Sous-patch & Prompt`}
                    >
                      {/* Clip label */}
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrentlyActive ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-500'
                          }`}
                        />
                        <span className="truncate text-zinc-100 font-semibold">{clip.name}</span>
                      </div>

                      {/* Badges FX & Audio */}
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {clip.visualFx !== 'none' && (
                          <span className="px-1 py-0.2 rounded bg-purple-900/60 border border-purple-700/60 text-purple-300 text-[9px] font-mono">
                            {clip.visualFx}
                          </span>
                        )}
                        {clip.animationMode !== 'mirror' && (
                          <span className="px-1 py-0.2 rounded bg-amber-900/50 border border-amber-700/60 text-amber-300 text-[9px] font-mono">
                            {clip.animationMode}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Repère de tête de lecture sur chaque piste */}
                <div
                  className={`absolute top-0 bottom-0 w-0.5 pointer-events-none z-30 ${
                    mode === 'SILENT_EDITION' ? 'bg-amber-400/80' : 'bg-cyan-400/80'
                  }`}
                  style={{ left: `${(currentTimeSec / totalDurationSec) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. TIROIR D'INSPECTION & ÉDITION AVEUGLE (BLIND CUE INSPECTOR) */}
      {isInspectorOpen && editingCue && mode === 'SILENT_EDITION' && (
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#12100d]/95 backdrop-blur-md border-t-2 border-amber-500 p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Inspecteur Aveugle (Blind Cue #{editingCue.cueNumber})</span>
            </div>

            {/* Label Input */}
            <div className="flex items-center gap-1 bg-[#1c1813] border border-amber-500/40 rounded px-2 py-1">
              <span className="text-zinc-400 text-[10px]">Titre :</span>
              <input
                type="text"
                value={editingCue.label}
                onChange={(e) => handleUpdateBlindCue({ label: e.target.value })}
                className="bg-transparent text-amber-200 font-medium text-xs focus:outline-none w-48"
                placeholder="Nom du TOP"
              />
            </div>

            {/* Timecode Input with +/- steps */}
            <div className="flex items-center gap-1 bg-[#1c1813] border border-amber-500/40 rounded px-2 py-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-400 text-[10px]">Temps :</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max={totalDurationSec}
                value={editingCue.timeSec}
                onChange={(e) => handleUpdateBlindCue({ timeSec: parseFloat(e.target.value) || 0 })}
                className="bg-transparent text-amber-200 font-mono text-xs w-16 focus:outline-none"
              />
              <span className="text-zinc-500">s</span>

              {/* Boutons rapides de réglage fin */}
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  onClick={() => handleUpdateBlindCue({ timeSec: Math.max(0, parseFloat((editingCue.timeSec - 0.5).toFixed(1))) })}
                  className="px-1 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[9px] font-mono"
                  title="Reculer de 0.5 seconde"
                >
                  -0.5s
                </button>
                <button
                  onClick={() => handleUpdateBlindCue({ timeSec: Math.min(totalDurationSec, parseFloat((editingCue.timeSec + 0.5).toFixed(1))) })}
                  className="px-1 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[9px] font-mono"
                  title="Avancer de 0.5 seconde"
                >
                  +0.5s
                </button>
              </div>
            </div>

            {/* OSC Address */}
            <div className="flex items-center gap-1 bg-[#1c1813] border border-amber-500/40 rounded px-2 py-1">
              <span className="text-zinc-400 text-[10px]">OSC :</span>
              <input
                type="text"
                value={editingCue.oscAddress}
                onChange={(e) => handleUpdateBlindCue({ oscAddress: e.target.value })}
                className="bg-transparent text-cyan-300 font-mono text-xs focus:outline-none w-28"
                placeholder="/cue/1"
              />
            </div>

            {/* Action selector */}
            <div className="flex items-center gap-1 bg-[#1c1813] border border-amber-500/40 rounded px-2 py-1">
              <span className="text-zinc-400 text-[10px]">Action :</span>
              <select
                value={editingCue.action}
                onChange={(e) => handleUpdateBlindCue({ action: e.target.value as CueItem['action'] })}
                className="bg-transparent text-amber-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="jump_and_play" className="bg-zinc-900 text-zinc-100">Saut & Lecture</option>
                <option value="fire_osc" className="bg-zinc-900 text-zinc-100">Envoi OSC pur</option>
                <option value="fade_black" className="bg-zinc-900 text-zinc-100">Fondu au Noir</option>
                <option value="switch_mode" className="bg-zinc-900 text-zinc-100">Changer de mode</option>
              </select>
            </div>
          </div>

          {/* Boutons d'action : Dupliquer, Supprimer, Pousser, Fermer */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleDuplicateBlindCue(editingCue)}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded flex items-center gap-1 text-[11px] transition-colors"
              title="Dupliquer ce TOP"
            >
              <Copy className="w-3 h-3" />
              <span>Dupliquer</span>
            </button>

            <button
              onClick={() => handleDeleteBlindCue(editingCue.id)}
              className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded flex items-center gap-1 text-[11px] transition-colors"
              title="Supprimer ce TOP du buffer aveugle"
            >
              <Trash2 className="w-3 h-3" />
              <span>Supprimer</span>
            </button>

            <button
              onClick={handlePushToStage}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded flex items-center gap-1.5 text-xs shadow-md transition-colors"
              title="Appliquer immédiatement ce TOP et toutes les modifications en fondu sur scène"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Push Direct</span>
            </button>

            <button
              onClick={() => setIsInspectorOpen(false)}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 ml-1"
              title="Fermer l'inspecteur aveugle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
