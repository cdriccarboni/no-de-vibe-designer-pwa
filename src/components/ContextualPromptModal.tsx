// Modal de Dialogue Artistique Contextuel à la Demande
// No[co]de Vibe Designer — Permet de formuler une intention en langage naturel sur un élément précis SANS recréer tout le spectacle

import React, { useState } from 'react';
import { TimelineClip } from '../types/timeline';
import { executeContextualObjectPrompt } from '../services/scenographyPromptInterpreter';
import { LiveSilhouetteObject } from '../types/scenography';
import {
  Sparkles,
  X,
  Send,
  Check,
  RotateCcw,
  Sliders,
  Layers,
  Wand2
} from 'lucide-react';

interface ContextualPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: TimelineClip | null;
  onApplyModification: (updatedClip: TimelineClip, explanation: string) => void;
}

export const ContextualPromptModal: React.FC<ContextualPromptModalProps> = ({
  isOpen,
  onClose,
  clip,
  onApplyModification
}) => {
  const [inputText, setInputText] = useState('');
  const [lastResult, setLastResult] = useState<{
    explanation: string;
    proposedClip: TimelineClip;
  } | null>(null);

  if (!isOpen || !clip) return null;

  const handleExecutePrompt = (textToRun?: string) => {
    const prompt = (textToRun || inputText).trim();
    if (!prompt) return;

    // Convertir le clip en LiveSilhouetteObject pour l'interpréteur de commandes
    const tempObj: LiveSilhouetteObject = {
      id: clip.id,
      name: clip.name,
      category: 'performer_shadow',
      characterTitle: clip.name,
      capturedAt: '',
      sourceType: 'curated_test_performer',
      transform: { ...clip.transform },
      animationMode: clip.animationMode,
      autonomousMotion: {
        style: clip.motionStyle as any,
        speed: clip.motionSpeed,
        spatialRadius: 0.3,
        phase: 0,
        description: ''
      },
      hybridConfig: {
        delayFrames: 12,
        anticipation: 0.3,
        reactivityToActor: 0.8,
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
        triggerType: 'timeline',
        isTriggered: true,
        autoFadeInMs: 800
      },
      trackingQuality: {
        confidence: 0.95,
        isTrackingLost: false,
        lostFramesCounter: 0,
        smoothingFactor: 0.2,
        statusMessage: 'OK'
      }
    };

    // Exécution de l'interprétation d'intention
    const lower = prompt.toLowerCase();
    const result = executeContextualObjectPrompt(prompt, tempObj);

    // Détection d'effets visuels ou audio dans le prompt
    let newFx = clip.visualFx;
    let newFxIntensity = clip.fxIntensity;
    let newAudioEnabled = clip.audioConfig.enabled;
    let newAudioVol = clip.audioConfig.volume;

    if (lower.includes('slit-scan') || lower.includes('slit scan') || lower.includes('écho')) {
      newFx = 'slit_scan';
      newFxIntensity = 0.85;
    } else if (lower.includes('rgb') || lower.includes('prisme') || lower.includes('relief')) {
      newFx = 'rgb_split';
      newFxIntensity = 0.7;
    } else if (lower.includes('anaglyphe') || lower.includes('3d')) {
      newFx = 'anaglyph';
      newFxIntensity = 0.8;
    } else if (lower.includes('traînée') || lower.includes('doré') || lower.includes('lumière')) {
      newFx = 'trails';
      newFxIntensity = 0.85;
    } else if (lower.includes('feedback') || lower.includes('hydra') || lower.includes('rémanence')) {
      newFx = 'hydra_feedback';
      newFxIntensity = 0.85;
    } else if (lower.includes('tunnel') || lower.includes('vortex') || lower.includes('profondeur')) {
      newFx = 'vortex_tunnel';
      newFxIntensity = 0.85;
    } else if (lower.includes('brume') || lower.includes('fumée') || lower.includes('nappe')) {
      newFx = 'fog_volumetric';
      newFxIntensity = 0.8;
    } else if (lower.includes('eau') || lower.includes('onde') || lower.includes('goutte') || lower.includes('miroir d\'eau')) {
      newFx = 'water_ripples';
      newFxIntensity = 0.8;
    } else if (lower.includes('oiseaux') || lower.includes('boids') || lower.includes('nuée') || lower.includes('étincelle')) {
      newFx = 'particle_boids';
      newFxIntensity = 0.85;
    } else if (lower.includes('fantôme') || lower.includes('spectral') || lower.includes('pepper') || lower.includes('éthéré')) {
      newFx = 'peppers_ghost';
      newFxIntensity = 0.85;
    }

    if (lower.includes('son') || lower.includes('audio') || lower.includes('pas') || lower.includes('rythme')) {
      newAudioEnabled = true;
      newAudioVol = Math.min(1.0, newAudioVol + 0.2);
    }

    const proposed: TimelineClip = {
      ...clip,
      transform: { ...result.updatedObject.transform },
      animationMode: result.updatedObject.animationMode,
      motionSpeed: result.updatedObject.autonomousMotion.speed,
      motionStyle: result.updatedObject.autonomousMotion.style,
      visualFx: newFx,
      fxIntensity: newFxIntensity,
      audioConfig: {
        ...clip.audioConfig,
        enabled: newAudioEnabled,
        volume: newAudioVol
      }
    };

    setLastResult({
      explanation: result.explanation,
      proposedClip: proposed
    });
  };

  const handleConfirm = () => {
    if (lastResult) {
      onApplyModification(lastResult.proposedClip, lastResult.explanation);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#14171a] border border-[#303740] rounded-xl shadow-2xl flex flex-col text-xs text-[#f2f3f4] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#101214] border-b border-[#303740] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#d7b86a]/20 text-[#d7b86a]">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-semibold text-sm text-[#f2f3f4]">
                Dialogue Artistique : {clip.name}
              </h3>
              <p className="text-[10px] text-[#a0a8b0]">
                Modification ciblée en langage naturel sur cet élément uniquement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#a0a8b0] hover:text-[#f2f3f4] hover:bg-[#20242a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulaire de prompt */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#a0a8b0]">
              Quelle modification souhaitez-vous apporter à cet élément ?
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecutePrompt();
                  }
                }}
                placeholder="Ex : Ralentis sa cadence, passe-le à jardin et ajoute un écho slit-scan..."
                className="flex-1 px-3 py-2 bg-[#171a1e] border border-[#303740] rounded-lg text-xs text-[#f2f3f4] placeholder:text-zinc-600 focus:outline-none focus:border-[#d7b86a]"
              />
              <button
                onClick={() => handleExecutePrompt()}
                disabled={!inputText.trim()}
                className="px-3.5 py-2 bg-[#d7b86a] hover:bg-[#c4a457] text-[#101214] font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Interpréter</span>
              </button>
            </div>
          </div>

          {/* Suggestions scéniques rapides */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Intentions scéniques courantes :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'L’ombre se détache et danse seule',
                'Passe en mode miroir et recule à jardin',
                'Ralentis la cadence du mouvement',
                'Ajoute un effet Slit-Scan temporel',
                'Active les pas sonores en résonance',
                'Agrandis la silhouette à 1.8x'
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setInputText(chip);
                    handleExecutePrompt(chip);
                  }}
                  className="px-2.5 py-1 rounded bg-[#171a1e] hover:bg-[#20242a] border border-[#303740] text-[11px] text-[#a0a8b0] hover:text-[#f2f3f4] transition-colors text-left"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Résultat interprété & Aperçu des changements */}
          {lastResult && (
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/60 rounded-lg space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Check className="w-4 h-4" />
                <span>Proposition scénographique prête :</span>
              </div>
              <p className="text-[11px] text-zinc-200 leading-relaxed bg-[#101214]/60 p-2.5 rounded border border-[#303740]">
                {lastResult.explanation}
              </p>
              <div className="flex items-center justify-between text-[10px] text-[#a0a8b0] font-mono pt-1">
                <span>Mode : {lastResult.proposedClip.animationMode}</span>
                <span>Vitesse : {lastResult.proposedClip.motionSpeed.toFixed(2)}x</span>
                <span>FX : {lastResult.proposedClip.visualFx}</span>
                <span>Audio : {lastResult.proposedClip.audioConfig.enabled ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#101214] border-t border-[#303740] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#171a1e] hover:bg-[#20242a] text-[#a0a8b0] hover:text-[#f2f3f4] border border-[#303740]"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!lastResult}
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Appliquer sur l’élément</span>
          </button>
        </div>
      </div>
    </div>
  );
};
