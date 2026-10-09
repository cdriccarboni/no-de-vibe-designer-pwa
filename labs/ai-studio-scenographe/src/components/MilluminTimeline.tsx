// Composant Timeline Multi-pistes Inspiré de Millumin pour No[co]de Vibe Designer
// Gestion des Layers de projection, Clips temporels, Cues de régie (TOPs) et Transport synchrone

import React, { useRef } from 'react';
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
  EyeOff
} from 'lucide-react';

interface MilluminTimelineProps {
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
  onToggleTrackMute
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  // Prochain TOP dans la conduite
  const upcomingCue = cues
    .filter((c) => c.timeSec > currentTimeSec)
    .sort((a, b) => a.timeSec - b.timeSec)[0] || cues[0];

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * totalDurationSec);
  };

  return (
    <div className="flex flex-col bg-[#14171a] border-t border-[#303740] select-none text-xs text-[#f2f3f4] h-64 shrink-0 overflow-hidden">
      {/* 1. BARRE DE TRANSPORT ET CONDUITE DE SPECTACLE (TOPs / Cues) */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#101214] border-b border-[#303740] gap-4">
        {/* Transport Buttons */}
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
            <span>{isPlaying ? 'PAUSE' : 'LECTURE'}</span>
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
          <div className="font-mono bg-[#0c0e10] border border-[#303740] px-2.5 py-1 rounded text-cyan-400 text-xs tabular-nums ml-2">
            {formatTimecode(currentTimeSec)} / {formatTimecode(totalDurationSec)}
          </div>
        </div>

        {/* Section Régie : Bouton "GO (TOP)" et Prochain Cue */}
        <div className="flex items-center gap-2">
          {upcomingCue && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-[#171a1e] border border-[#303740] rounded text-[11px]">
              <span className="text-[#a0a8b0]">Prochain :</span>
              <span className="text-[#d7b86a] font-medium truncate max-w-[220px]">
                {upcomingCue.label}
              </span>
              <span className="text-zinc-500 font-mono">@{upcomingCue.timeSec.toFixed(1)}s</span>
            </div>
          )}

          <button
            onClick={() => upcomingCue && onTriggerCue(upcomingCue)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold rounded flex items-center gap-1.5 shadow-sm shadow-emerald-950/50 transition-colors uppercase tracking-wider text-xs"
            title="Déclencher le prochain TOP scénique (Régie GO)"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>GO (TOP)</span>
          </button>

          <button
            onClick={onAddCueAtCurrentTime}
            className="px-2 py-1.5 bg-[#171a1e] hover:bg-[#20242a] text-[#a0a8b0] hover:text-[#f2f3f4] border border-[#303740] rounded flex items-center gap-1 text-[11px]"
            title="Ajouter un marqueur de Cue à l'instant actuel"
          >
            <Flag className="w-3 h-3 text-[#d7b86a]" />
            <span>+ TOP</span>
          </button>
        </div>
      </div>

      {/* 2. REGLE DU TEMPS AVEC MARQUEURS DE CUES & TÊTE DE LECTURE */}
      <div className="flex bg-[#101214] border-b border-[#303740] h-6 items-center">
        {/* En-tête des pistes (colonne de gauche) */}
        <div className="w-64 px-3 text-[10px] text-[#a0a8b0] font-semibold uppercase tracking-wider border-r border-[#303740] flex items-center justify-between shrink-0">
          <span>Layers de Projection</span>
          <span className="text-[9px] text-zinc-600">Millumin Mode</span>
        </div>

        {/* Zone de la règle temporelle */}
        <div
          ref={rulerRef}
          onClick={handleRulerClick}
          className="flex-1 relative h-full cursor-pointer bg-[#14171a] overflow-hidden"
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
          {cues.map((cue) => {
            const pct = (cue.timeSec / totalDurationSec) * 100;
            return (
              <button
                key={cue.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onTriggerCue(cue);
                }}
                className="absolute top-0 bottom-0 z-10 flex items-center -translate-x-1/2 group"
                style={{ left: `${pct}%` }}
                title={`${cue.label} (@${cue.timeSec}s) — Cliquez pour déclencher`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#d7b86a] border border-[#101214] flex items-center justify-center shadow-sm group-hover:scale-125 transition-transform" />
                <span className="absolute top-4 left-1 bg-[#101214]/90 text-[#d7b86a] border border-[#303740] px-1 py-0.5 rounded text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                  {cue.label}
                </span>
              </button>
            );
          })}

          {/* Tête de lecture (Playhead) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            style={{ left: `${(currentTimeSec / totalDurationSec) * 100}%` }}
          >
            <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 -translate-x-[4px] -translate-y-1 shadow-sm" />
          </div>
        </div>
      </div>

      {/* 3. PISTES MULTI-LAYERS ET CLIPS SCÉNOGRAPHIQUES */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {tracks.map((track) => {
          const trackClips = clips.filter((c) => c.trackId === track.id);

          return (
            <div
              key={track.id}
              className="flex border-b border-[#303740]/60 hover:bg-[#1a1d22] transition-colors h-11"
            >
              {/* En-tête de piste (Gauche) */}
              <div className="w-64 px-3 flex items-center justify-between border-r border-[#303740] bg-[#121518] shrink-0">
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
                    className="absolute top-0 bottom-0 border-l border-[#20242a] pointer-events-none"
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
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400/80 pointer-events-none z-30"
                  style={{ left: `${(currentTimeSec / totalDurationSec) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
