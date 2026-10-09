// Inspecteur de Droite Contextuel pour la Timeline & Le Scénographe
// No[co]de Vibe Designer — Modification directe des paramètres d'instance d'un clip ou d'un élément

import React from 'react';
import {
  TimelineClip,
  TimelineTrack,
  VisualEffectType,
  ScenicTransform
} from '../types/timeline';
import { ShadowAnimationMode } from '../types/scenography';
import {
  Sliders,
  Sparkles,
  Move,
  Maximize2,
  RotateCw,
  Sun,
  FlipHorizontal,
  Activity,
  Layers,
  Volume2,
  Trash2,
  BookmarkPlus,
  Radio,
  Clock,
  Wand2
} from 'lucide-react';

interface ScenicInspectorPanelProps {
  selectedClip: TimelineClip | null;
  tracks: TimelineTrack[];
  onUpdateClip: (updated: TimelineClip) => void;
  onOpenContextualPrompt: (clip: TimelineClip) => void;
  onSaveClipAsReusableElement: (clip: TimelineClip) => void;
  onDeleteClip: (clipId: string) => void;
  onOpenScenographyModal?: () => void;
}

export const ScenicInspectorPanel: React.FC<ScenicInspectorPanelProps> = ({
  selectedClip,
  tracks,
  onUpdateClip,
  onOpenContextualPrompt,
  onSaveClipAsReusableElement,
  onDeleteClip,
  onOpenScenographyModal
}) => {
  if (!selectedClip) {
    return (
      <div className="w-80 bg-[#171a1e] border-l border-[#303740] p-6 flex flex-col items-center justify-center text-center text-xs text-[#a0a8b0] select-none h-full">
        <Sliders className="w-8 h-8 text-zinc-600 mb-3" />
        <h3 className="font-semibold text-[#f2f3f4] mb-1">Inspecteur de Régie</h3>
        <p className="text-[11px] leading-relaxed">
          Sélectionnez un clip dans la Timeline ou dans la scène pour ajuster ses paramètres d’échelle, position, mode miroir, audio et effets en temps réel.
        </p>
      </div>
    );
  }

  const currentTrack = tracks.find((t) => t.id === selectedClip.trackId);

  const handleTransformChange = (key: keyof ScenicTransform, value: number | boolean) => {
    onUpdateClip({
      ...selectedClip,
      transform: {
        ...selectedClip.transform,
        [key]: value
      }
    });
  };

  return (
    <div className="w-80 bg-[#171a1e] border-l border-[#303740] flex flex-col text-xs text-[#f2f3f4] h-full overflow-hidden select-none">
      {/* Header : Titre du clip & actions rapides */}
      <div className="p-3.5 bg-[#121518] border-b border-[#303740] flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: selectedClip.color }}
          />
          <div className="truncate">
            <h3 className="font-semibold text-[#f2f3f4] truncate text-xs">{selectedClip.name}</h3>
            <span className="text-[10px] text-[#a0a8b0]">{currentTrack?.name || 'Layer'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onSaveClipAsReusableElement(selectedClip)}
            className="p-1.5 rounded text-[#a0a8b0] hover:text-[#d7b86a] hover:bg-[#20242a] transition-colors"
            title="Enregistrer comme nouvel élément réutilisable dans la Bibliothèque"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteClip(selectedClip.id)}
            className="p-1.5 rounded text-[#a0a8b0] hover:text-red-400 hover:bg-[#20242a] transition-colors"
            title="Supprimer ce clip de la timeline"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bouton Proéminent d'Invite Artistique Contextuelle à la Demande */}
      <div className="p-2.5 bg-[#101214] border-b border-[#303740]">
        <button
          onClick={() => onOpenContextualPrompt(selectedClip)}
          className="w-full py-2 px-3 bg-gradient-to-r from-amber-600/30 to-cyan-600/30 hover:from-amber-600/50 hover:to-cyan-600/50 border border-[#d7b86a]/60 rounded text-xs font-semibold text-[#d7b86a] flex items-center justify-center gap-2 transition-all shadow-sm"
          title="Ouvrir le dialogue artistique pour formuler une intention en langage naturel sur cet objet"
        >
          <Sparkles className="w-4 h-4 text-[#d7b86a]" />
          <span>✨ Prompt Artistique (Sur cet élément)</span>
        </button>
      </div>

      {/* Contenu Déroulant des Paramètres Réels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. TRANSFORMATION SPATIALE & PROJECTION */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[#a0a8b0] font-semibold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Move className="w-3 h-3 text-cyan-400" />
              <span>Placement Scénique</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Layer 2D</span>
          </div>

          {/* Position X (Jardin / Centre / Cour) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#a0a8b0]">Position X (Plateau)</span>
              <span className="font-mono text-cyan-400 tabular-nums">
                {selectedClip.transform.x < 0.35
                  ? 'Jardin (0.20)'
                  : selectedClip.transform.x > 0.65
                  ? 'Cour (0.80)'
                  : 'Centre (0.50)'}
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.95}
              step={0.01}
              value={selectedClip.transform.x}
              onChange={(e) => handleTransformChange('x', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#20242a] rounded accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
              <button
                type="button"
                onClick={() => handleTransformChange('x', 0.2)}
                className="hover:text-cyan-400"
              >
                Jardin
              </button>
              <button
                type="button"
                onClick={() => handleTransformChange('x', 0.5)}
                className="hover:text-cyan-400"
              >
                Centre
              </button>
              <button
                type="button"
                onClick={() => handleTransformChange('x', 0.8)}
                className="hover:text-cyan-400"
              >
                Cour
              </button>
            </div>
          </div>

          {/* Position Y (Sol) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#a0a8b0]">Position Y (Hauteur)</span>
              <span className="font-mono text-cyan-400 tabular-nums">
                {selectedClip.transform.y.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.01}
              value={selectedClip.transform.y}
              onChange={(e) => handleTransformChange('y', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#20242a] rounded accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Échelle / Taille */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#a0a8b0]">Échelle (Taille)</span>
              <span className="font-mono text-cyan-400 tabular-nums">
                {selectedClip.transform.scale.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.4}
              max={2.5}
              step={0.05}
              value={selectedClip.transform.scale}
              onChange={(e) => handleTransformChange('scale', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#20242a] rounded accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Opacité */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#a0a8b0]">Opacité (Transparence)</span>
              <span className="font-mono text-cyan-400 tabular-nums">
                {Math.round(selectedClip.transform.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.0}
              max={1.0}
              step={0.05}
              value={selectedClip.transform.opacity}
              onChange={(e) => handleTransformChange('opacity', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#20242a] rounded accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Miroir horizontal */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#a0a8b0] flex items-center gap-1.5">
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Inversion Miroir</span>
            </span>
            <input
              type="checkbox"
              checked={selectedClip.transform.flipHorizontal}
              onChange={(e) => handleTransformChange('flipHorizontal', e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[#d7b86a] cursor-pointer"
            />
          </div>
        </div>

        <div className="border-t border-[#303740]" />

        {/* 2. MODE D'ANIMATION & COMPORTEMENT */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[#a0a8b0] font-semibold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[#d7b86a]" />
              <span>Comportement & Cinématique</span>
            </span>
          </div>

          {/* Switcher Miroir / Autonome / Hybride */}
          <div className="grid grid-cols-3 gap-1 bg-[#101214] p-1 rounded border border-[#303740]">
            {(['mirror', 'autonomous', 'hybrid'] as ShadowAnimationMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onUpdateClip({ ...selectedClip, animationMode: mode })}
                className={`py-1 text-[10px] font-medium rounded transition-colors ${
                  selectedClip.animationMode === mode
                    ? 'bg-[#d7b86a] text-[#101214] font-bold'
                    : 'text-[#a0a8b0] hover:text-[#f2f3f4]'
                }`}
              >
                {mode === 'mirror' ? 'Miroir' : mode === 'autonomous' ? 'Autonome' : 'Hybride'}
              </button>
            ))}
          </div>

          {/* Vitesse d'animation */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#a0a8b0]">Cadence / Vitesse</span>
              <span className="font-mono text-[#d7b86a] tabular-nums">
                {selectedClip.motionSpeed.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.05}
              value={selectedClip.motionSpeed}
              onChange={(e) =>
                onUpdateClip({ ...selectedClip, motionSpeed: parseFloat(e.target.value) })
              }
              className="w-full h-1 bg-[#20242a] rounded accent-[#d7b86a] cursor-pointer"
            />
          </div>
        </div>

        <div className="border-t border-[#303740]" />

        {/* 3. EFFETS VISUELS & SHADERS (Post-FX) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[#a0a8b0] font-semibold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Wand2 className="w-3 h-3 text-purple-400" />
              <span>Effet Visuel Associé</span>
            </span>
          </div>

          <select
            value={selectedClip.visualFx}
            onChange={(e) =>
              onUpdateClip({
                ...selectedClip,
                visualFx: e.target.value as VisualEffectType
              })
            }
            className="w-full bg-[#101214] border border-[#303740] rounded px-2.5 py-1.5 text-xs text-[#f2f3f4] focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="none">Aucun effet additionnel</option>
            <option value="slit_scan">Écho Slit-Scan Temporel</option>
            <option value="rgb_split">Prisme & RGB Split 2.5D</option>
            <option value="anaglyph">Stéréoscopie Anaglyphe Cyan/Rouge</option>
            <option value="trails">Traînées & Rémanence</option>
            <option value="glow">Halo Lumineux / Bioluminescence</option>
            <option value="peppers_ghost">Illusion Pepper’s Ghost (Fantomatique)</option>
            <option value="hydra_feedback">Feedback Vidéo Hydra & Vortex</option>
            <option value="vortex_tunnel">Tunnel Infini & Perspective ISF</option>
            <option value="fog_volumetric">Brume Volumétrique Scénique</option>
            <option value="water_ripples">Miroir d’Eau & Ondes Réfractives</option>
            <option value="particle_boids">Nuée d’Oiseaux Lumineux (Boids)</option>
          </select>

          {selectedClip.visualFx !== 'none' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#a0a8b0]">Intensité de l’effet</span>
                <span className="font-mono text-purple-400 tabular-nums">
                  {Math.round(selectedClip.fxIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={selectedClip.fxIntensity}
                onChange={(e) =>
                  onUpdateClip({ ...selectedClip, fxIntensity: parseFloat(e.target.value) })
                }
                className="w-full h-1 bg-[#20242a] rounded accent-purple-400 cursor-pointer"
              />
            </div>
          )}
        </div>

        <div className="border-t border-[#303740]" />

        {/* 4. AUDIO SYNCHRONE DU PERSONNAGE */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[#a0a8b0] font-semibold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-emerald-400" />
              <span>Audio & Synthèse Synchrone</span>
            </span>
            <input
              type="checkbox"
              checked={selectedClip.audioConfig.enabled}
              onChange={(e) =>
                onUpdateClip({
                  ...selectedClip,
                  audioConfig: {
                    ...selectedClip.audioConfig,
                    enabled: e.target.checked
                  }
                })
              }
              className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
            />
          </div>

          {selectedClip.audioConfig.enabled && (
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#a0a8b0]">Volume Synthé</span>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {Math.round(selectedClip.audioConfig.volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={selectedClip.audioConfig.volume}
                  onChange={(e) =>
                    onUpdateClip({
                      ...selectedClip,
                      audioConfig: {
                        ...selectedClip.audioConfig,
                        volume: parseFloat(e.target.value)
                      }
                    })
                  }
                  className="w-full h-1 bg-[#20242a] rounded accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[#a0a8b0] text-[11px] block">Timbre & Synthétiseur</span>
                <select
                  value={selectedClip.audioConfig.synthPreset}
                  onChange={(e) =>
                    onUpdateClip({
                      ...selectedClip,
                      audioConfig: {
                        ...selectedClip.audioConfig,
                        synthPreset: e.target.value as any
                      }
                    })
                  }
                  className="w-full bg-[#101214] border border-[#303740] rounded px-2.5 py-1 text-xs text-[#f2f3f4] focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="footstep_wood">Impacts de pas sur bois (Parquet)</option>
                  <option value="sparkle_pentatonic">Scintillements pentatoniques (Félin)</option>
                  <option value="drone_dark">Nappe obscure continue (Baleine/Tunnel)</option>
                  <option value="sub_rumble">Sub-bass & Grondement sourd</option>
                  <option value="water_droplet">Goutte d’eau résonante (Miroir)</option>
                  <option value="tibetan_bowl">Bol tibétain & Ondes harmoniques (Danse)</option>
                  <option value="shimmer_reverb">Shimmer cristallin réverbéré (Nuée)</option>
                  <option value="wind_texture">Souffle de vent & Brume</option>
                  <option value="bell_cue">Carillon de régie (TOP)</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#a0a8b0]">Réactivité aux pas du personnage</span>
                <input
                  type="checkbox"
                  checked={selectedClip.audioConfig.reactiveToSteps}
                  onChange={(e) =>
                    onUpdateClip({
                      ...selectedClip,
                      audioConfig: {
                        ...selectedClip.audioConfig,
                        reactiveToSteps: e.target.checked
                      }
                    })
                  }
                  className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Lien direct vers le Scénographe pour capture comédien */}
        {onOpenScenographyModal && (
          <div className="pt-2">
            <button
              onClick={onOpenScenographyModal}
              className="w-full py-1.5 px-3 bg-[#101214] hover:bg-[#20242a] border border-[#303740] rounded text-[11px] text-[#a0a8b0] hover:text-[#f2f3f4] transition-colors"
            >
              Ouvrir Banc de Capture Silhouette (Webcam / Vidéo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
