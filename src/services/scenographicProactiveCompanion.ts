// Compagnon Scénographique Proactif & Moteur de Suggestions Contextuelles
// No[co]de Vibe Designer — Directive Permanente : Créativité et Enrichissement Autonome
// Analyse les éléments réellement présents (clips, pistes, cues, objets) et propose
// des idées scéniques pertinentes, originales et réalisables 100% hors-ligne.

import {
  TimelineClip,
  TimelineTrack,
  CueItem,
  ReusableScenicElement,
  VisualEffectType
} from '../types/timeline';
import { ShadowAnimationMode } from '../types/scenography';
import { ArtisticScene } from '../types/artist';

export type SuggestionCategory =
  | 'pirate_maritime'
  | 'choreography'
  | 'light_creature'
  | 'scenic_matter'
  | 'optical_magic'
  | 'cue_regie';

export interface ProactiveSuggestion {
  id: string;
  title: string;
  description: string;
  rationale: string;
  actionPrompt: string;
  category: SuggestionCategory;
  categoryLabel: string;
  iconEmoji: string;
  targetTrackId?: string;
  matchingLibraryElementId?: string;
  suggestedPreset?: {
    visualFx?: VisualEffectType;
    motionSpeed?: number;
    motionStyle?: string;
    synthPreset?: string;
    animationMode?: ShadowAnimationMode;
  };
}

export interface ScenographicContext {
  clips: TimelineClip[];
  tracks: TimelineTrack[];
  cues: CueItem[];
  selectedClip: TimelineClip | null;
  currentScene: ArtisticScene;
  library: ReusableScenicElement[];
}

export interface DetectedShowProfile {
  themeTitle: string;
  themeDescription: string;
  dominantMood: string;
  elementsSummary: string;
}

export function detectShowProfile(context: ScenographicContext): DetectedShowProfile {
  const { clips, tracks, cues, currentScene } = context;
  const allNames = clips.map((c) => c.name.toLowerCase()).join(' ') + ' ' + currentScene.title.toLowerCase();

  const hasPirate = allNames.includes('pirate') || allNames.includes('sabre') || allNames.includes('navire') || allNames.includes('ombre');
  const hasDance = allNames.includes('danse') || allNames.includes('chorégraph') || allNames.includes('corps') || allNames.includes('spectral');
  const hasCreature = allNames.includes('chat') || allNames.includes('baleine') || allNames.includes('dragon') || allNames.includes('méduse') || allNames.includes('papillon');

  if (hasPirate) {
    return {
      themeTitle: 'Épopée Maritime & Théâtre d’Ombres',
      themeDescription: 'Scène héroïque avec personnage armé, silhouette autonome et matières marines réactives.',
      dominantMood: 'Dramatique, nocturne & aventureux',
      elementsSummary: `${clips.length} clip(s) actif(s) · ${cues.length} TOP(s) de régie programmés`
    };
  } else if (hasDance) {
    return {
      themeTitle: 'Chorégraphie & Mémoire Corporelle',
      themeDescription: 'Travail sur le geste de danse, la chronophotographie et la résonance acoustique pure.',
      dominantMood: 'Éthéré, poétique & cinétique',
      elementsSummary: `${clips.length} clip(s) actif(s) · Résonance de plateau`
    };
  } else if (hasCreature) {
    return {
      themeTitle: 'Féerie Lumineuse & Vivarium Virtuel',
      themeDescription: 'Ménagerie générative en bioluminescence avec synchronisation des démarches quadrupedes et cétacés.',
      dominantMood: 'Féerique, cyan/ambre & hypnotique',
      elementsSummary: `${clips.length} créature(s) active(s) · Moteurs autonomes`
    };
  }

  return {
    themeTitle: 'Scénographie Visuelle & Shaders de Plateau',
    themeDescription: 'Architecture lumineuse, perspectives trompe-l’œil et interactions multi-couches.',
    dominantMood: currentScene.visualMood || 'Contemporain & dynamique',
    elementsSummary: `${clips.length} clip(s) · ${tracks.length} couches de projection`
  };
}

export function generateProactiveSuggestions(context: ScenographicContext): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const { clips, cues, selectedClip, currentScene, library } = context;

  // Analyse du contexte global
  const allNames = clips.map((c) => c.name.toLowerCase()).join(' ') + ' ' + currentScene.title.toLowerCase();
  const hasPirate = allNames.includes('pirate') || allNames.includes('sabre') || allNames.includes('ombre');
  const hasDance = allNames.includes('danse') || allNames.includes('chorégraph') || allNames.includes('corps') || allNames.includes('spectral');
  const hasCreature = allNames.includes('chat') || allNames.includes('baleine') || allNames.includes('dragon') || allNames.includes('méduse') || allNames.includes('oiseau');
  const hasCues = cues.length > 0;

  const selectedElement = selectedClip ? library.find((el) => el.id === selectedClip.elementId) : null;

  // 1. CONTEXTE PIRATE / MARITIME
  if (hasPirate || selectedClip?.name.toLowerCase().includes('pirate') || selectedElement?.category === 'Personnages & Ombres') {
    suggestions.push({
      id: 'sug-pirate-sea-reflection',
      title: 'Miroir d’Eau & Houle Sous-Marine',
      description: 'Projeter des ondes liquides réfractives sous les bottes du comédien simulant un ponton de navire ou une plage de nuit.',
      rationale: 'Contexte détecté : Scène de pirate avec comédien à jardin. Complément aquatique réaliste.',
      actionPrompt: 'Ajoute des ondes de miroir d’eau réactives aux pas sous le pirate',
      category: 'pirate_maritime',
      categoryLabel: 'Maritime & Ombres',
      iconEmoji: '🌊',
      targetTrackId: 'track-3-fx',
      matchingLibraryElementId: 'elem-water-ripples',
      suggestedPreset: { visualFx: 'water_ripples', synthPreset: 'water_droplet' }
    });

    suggestions.push({
      id: 'sug-pirate-storm-top',
      title: 'Tempête Éolienne au Prochain TOP',
      description: 'Lancer un coup de vent volumétrique dispersant la silhouette en braises au moment du détachement autonome.',
      rationale: 'Contexte détecté : TOP de détachement scénique. Amplification dramatique du mouvement.',
      actionPrompt: 'Déclenche une nappe de brume volumétrique et souffle de vent',
      category: 'pirate_maritime',
      categoryLabel: 'Maritime & Ombres',
      iconEmoji: '🌪️',
      targetTrackId: 'track-3-fx',
      matchingLibraryElementId: 'elem-fog-volumetric',
      suggestedPreset: { visualFx: 'fog_volumetric', synthPreset: 'wind_texture' }
    });

    suggestions.push({
      id: 'sug-pirate-ghost-duel',
      title: 'Duo avec l’Ombre au Sabre (Mode Hybride)',
      description: 'Faire passer l’ombre en mode Hybride avec traînées phosphorescentes pour un duel chorégraphié avec le comédien.',
      rationale: 'Contexte détecté : Silhouette armée d’un sabre d’abordage. Potentiel de combat scénique en miroir.',
      actionPrompt: 'Active le mode hybride duo et ajoute des traînées de sabre luminescentes',
      category: 'pirate_maritime',
      categoryLabel: 'Maritime & Ombres',
      iconEmoji: '⚔️',
      suggestedPreset: { animationMode: 'hybrid', visualFx: 'peppers_ghost' }
    });
  }

  // 2. CONTEXTE CHORÉGRAPHIE / DANSE CONTEMPORAINE
  if (hasDance || selectedClip?.motionStyle?.includes('spin') || selectedClip?.visualFx === 'peppers_ghost') {
    suggestions.push({
      id: 'sug-dance-chronophoto',
      title: 'Écho Temporel & Chronophotographie (3s)',
      description: 'Découper les sauts de danse en traînées temporelles persistantes créant une mémoire vivante du plateau.',
      rationale: 'Contexte détecté : Mouvements amples et gestes dansés. Sublimation de la trajectoire spatiale.',
      actionPrompt: 'Applique un écho slit-scan temporel avec décalage de 3 secondes',
      category: 'choreography',
      categoryLabel: 'Chorégraphie & Geste',
      iconEmoji: '⏳',
      suggestedPreset: { visualFx: 'slit_scan', motionSpeed: 0.9 }
    });

    suggestions.push({
      id: 'sug-dance-tibetan-resonance',
      title: 'Pulsation Harmonique au Bol Tibétain',
      description: 'Accompagner chaque arabesque d’un partiel inharmonique de bol tibétain vibrant dans le silence de scène.',
      rationale: 'Contexte détecté : Danse contemporaine fluide. Équilibre acoustique organique sans musique pré-enregistrée.',
      actionPrompt: 'Accompagne les mouvements de danse avec des harmoniques de bol tibétain',
      category: 'choreography',
      categoryLabel: 'Chorégraphie & Geste',
      iconEmoji: '🔔',
      suggestedPreset: { synthPreset: 'tibetan_bowl' }
    });

    suggestions.push({
      id: 'sug-dance-boids-aura',
      title: 'Nuée d’Oiseaux Lumineux Autour du Corps',
      description: 'Attacher un essaim de boids célestes qui s’enroule autour du danseur et s’envole vers le cintre lors d’un saut.',
      rationale: 'Contexte détecté : Déplacement central sur scène. Interaction d’essaim particulaire.',
      actionPrompt: 'Fais voler une nuée d’oiseaux lumineux boids autour du corps',
      category: 'choreography',
      categoryLabel: 'Chorégraphie & Geste',
      iconEmoji: '🕊️',
      targetTrackId: 'track-2-creatures',
      matchingLibraryElementId: 'elem-particle-boids',
      suggestedPreset: { visualFx: 'particle_boids', synthPreset: 'shimmer_reverb' }
    });
  }

  // 3. CONTEXTE CRÉATURES LUMINEUSES
  if (hasCreature || selectedElement?.category === 'Lumière & Créatures') {
    suggestions.push({
      id: 'sug-creature-biolum-step',
      title: 'Empreintes Luminescentes aux 4 Pattes',
      description: 'Laisser des étoiles dorées à chaque impact de patte sur le parquet avec carillon pentatonique synchrone.',
      rationale: 'Contexte détecté : Quadrupède néon agrandi. Renforcement du contact tactile avec le sol.',
      actionPrompt: 'Active la réactivité des pas avec étincelles dorées sous les pattes',
      category: 'light_creature',
      categoryLabel: 'Créatures de Lumière',
      iconEmoji: '🐾',
      suggestedPreset: { synthPreset: 'sparkle_pentatonic', visualFx: 'trails' }
    });

    suggestions.push({
      id: 'sug-creature-abyssal-glow',
      title: 'Pulsation Abyssale avec Banc de Méduses',
      description: 'Faire onduler la créature en harmonie avec un banc de méduses fluorescentes en arrière-plan sur le Layer 2.',
      rationale: 'Contexte détecté : Créature lumineuse volumétrique. Création d’une scénographie d’ensemble.',
      actionPrompt: 'Ajoute un halo bioluminescent ondulant avec banc de méduses',
      category: 'light_creature',
      categoryLabel: 'Créatures de Lumière',
      iconEmoji: '🪼',
      targetTrackId: 'track-2-creatures',
      matchingLibraryElementId: 'elem-jellyfish-swarm',
      suggestedPreset: { visualFx: 'glow', motionSpeed: 0.8 }
    });
  }

  // 4. CONTEXTE RÉGIE & TOPS DE SPECTACLE
  if (hasCues) {
    suggestions.push({
      id: 'sug-regie-osc-sound-cue',
      title: 'Carillon & Emission OSC sur les TOPs',
      description: 'Associer un retour de cloche FM doux et la diffusion d’un paquet OSC /cue/go sur chaque changement de tableau.',
      rationale: `Contexte détecté : ${cues.length} TOP(s) enregistrés dans la conduite. Sécurisation auditive de la régie.`,
      actionPrompt: 'Active le signal sonore de cloche sur chaque TOP de régie',
      category: 'cue_regie',
      categoryLabel: 'Régie & TOPs',
      iconEmoji: '🎯',
      suggestedPreset: { synthPreset: 'bell_cue' }
    });
  }

  // 5. CONTEXTE OPTIQUE & EFFETS DE SCÈNE GÉNÉRAUX
  if (suggestions.length < 5) {
    suggestions.push({
      id: 'sug-optics-hydra-vortex',
      title: 'Feedback Vidéo Récursif Analogique (Hydra)',
      description: 'Superposer une rétroaction vidéo rotative légère pour donner une profondeur psychédélique et hypnotique à la scène.',
      rationale: 'Contexte détecté : Scène scénique nécessitant de la profondeur sans surcharger le décor physique.',
      actionPrompt: 'Applique un feedback vidéo analogique récursif avec rotation lente',
      category: 'optical_magic',
      categoryLabel: 'Illusions & Optique',
      iconEmoji: '🌀',
      targetTrackId: 'track-3-fx',
      matchingLibraryElementId: 'elem-hydra-feedback',
      suggestedPreset: { visualFx: 'hydra_feedback' }
    });

    suggestions.push({
      id: 'sug-optics-tunnel-infinite',
      title: 'Tunnel Infini & Perspective Fuyante (ISF)',
      description: 'Ouvrir une perspective trompe-l’œil en fond de scène avec anneaux géométriques plongeant vers l’abîme.',
      rationale: 'Suggestion spatiale : Agrandir virtuellement la profondeur du plateau de théâtre.',
      actionPrompt: 'Projette un tunnel infini en perspective au fond du plateau',
      category: 'optical_magic',
      categoryLabel: 'Illusions & Optique',
      iconEmoji: '🕳️',
      targetTrackId: 'track-3-fx',
      matchingLibraryElementId: 'elem-vortex-tunnel',
      suggestedPreset: { visualFx: 'vortex_tunnel' }
    });
  }

  return suggestions.slice(0, 6);
}

/**
 * Applique directement les modifications d'une suggestion proactive sur un clip existant.
 */
export function applySuggestionToSelectedClip(
  suggestion: ProactiveSuggestion,
  clip: TimelineClip
): TimelineClip {
  const preset = suggestion.suggestedPreset;
  if (!preset) return clip;

  return {
    ...clip,
    visualFx: preset.visualFx || clip.visualFx,
    motionSpeed: preset.motionSpeed !== undefined ? preset.motionSpeed : clip.motionSpeed,
    motionStyle: preset.motionStyle || clip.motionStyle,
    animationMode: preset.animationMode || clip.animationMode,
    audioConfig: preset.synthPreset
      ? {
          ...clip.audioConfig,
          enabled: true,
          synthPreset: preset.synthPreset as any
        }
      : clip.audioConfig
  };
}

/**
 * Crée un nouveau clip Timeline prêt à l'emploi à partir d'une suggestion proactive.
 */
export function createClipFromSuggestion(
  suggestion: ProactiveSuggestion,
  library: ReusableScenicElement[],
  currentTimeSec: number
): { clip: TimelineClip; trackId: string } | null {
  const trackId = suggestion.targetTrackId || 'track-3-fx';
  let element = suggestion.matchingLibraryElementId
    ? library.find((e) => e.id === suggestion.matchingLibraryElementId)
    : null;

  if (!element) {
    element = library.find((e) => e.defaultTrackId === trackId) || library[0];
  }
  if (!element) return null;

  const newClip: TimelineClip = {
    id: `clip-sug-${Date.now()}`,
    elementId: element.id,
    trackId: trackId,
    name: suggestion.title,
    color: element.color,
    startTime: Math.max(0, currentTimeSec),
    duration: Math.min(element.defaultDuration, 14),
    active: true,
    transform: { ...element.defaultTransform },
    animationMode: suggestion.suggestedPreset?.animationMode || element.animationMode,
    motionSpeed: suggestion.suggestedPreset?.motionSpeed || element.motionSpeed,
    motionStyle: suggestion.suggestedPreset?.motionStyle || element.motionStyle,
    visualFx: suggestion.suggestedPreset?.visualFx || element.visualFx,
    fxIntensity: element.fxIntensity,
    audioConfig: suggestion.suggestedPreset?.synthPreset
      ? {
          enabled: true,
          volume: 0.6,
          reactiveToSteps: element.audioConfig.reactiveToSteps,
          synthPreset: suggestion.suggestedPreset.synthPreset as any
        }
      : { ...element.audioConfig }
  };

  return { clip: newClip, trackId };
}

