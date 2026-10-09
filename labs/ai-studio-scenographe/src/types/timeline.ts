// Types de la Conduite de Spectacle, Timeline Multi-pistes & Bibliothèque Réutilisable
// No[co]de Vibe Designer — Le Scénographe & Workflow Millumin

import { ShadowAnimationMode, CostumeDetails, LiveSilhouetteObject } from './scenography';

export type ScenicElementType =
  | 'performer_shadow'
  | 'light_creature'
  | 'visual_fx'
  | 'environment_matter'
  | 'audio_track'
  | 'compound_block';

export type ScenicCategory =
  | 'Personnages & Ombres'
  | 'Lumière & Créatures'
  | 'Effets Visuels & Shaders'
  | 'Matières & Environnements'
  | 'Audio Synchrone'
  | 'Bruitages Vivants & Objets Scéniques'
  | 'Blocs Composés';

export type VisualEffectType =
  | 'none'
  | 'slit_scan'
  | 'rgb_split'
  | 'anaglyph'
  | 'trails'
  | 'glow'
  | 'peppers_ghost'
  | 'hydra_feedback'
  | 'vortex_tunnel'
  | 'fog_volumetric'
  | 'water_ripples'
  | 'particle_boids'
  | 'liquid_mirror'
  | 'voronoi_shatter'
  | 'stargate_lensing'
  | 'thermal_lut'
  | 'mandala_dispersion'
  | 'solar_corona'
  | 'mercury_metaballs'
  | 'synaptic_pulse'
  | 'aurora_borealis'
  | 'kinetic_mesh';

export interface ScenicTransform {
  x: number; // 0..1 (Jardin = 0.20, Centre = 0.50, Cour = 0.80)
  y: number; // 0..1 (Sol = 0.70, Ciel = 0.20)
  scale: number; // 0.2 .. 3.0
  rotationDeg: number; // -180 .. 180
  opacity: number; // 0 .. 1
  flipHorizontal: boolean; // Effet miroir scénique
}

export interface ScenicAudioConfig {
  enabled: boolean;
  volume: number; // 0..1
  reactiveToSteps: boolean;
  synthPreset:
    | 'footstep_wood'
    | 'drone_dark'
    | 'sparkle_pentatonic'
    | 'sub_rumble'
    | 'bell_cue'
    | 'water_droplet'
    | 'shimmer_reverb'
    | 'wind_texture'
    | 'tibetan_bowl'
    | 'crystal_resonance'
    | 'metallic_pulse'
    | 'deep_sub_drone';
}

export interface ReusableScenicElement {
  id: string;
  name: string;
  category: ScenicCategory;
  type: ScenicElementType;
  characterTitle: string;
  description: string;
  iconType:
    | 'pirate'
    | 'cat'
    | 'whale'
    | 'slitscan'
    | 'prism'
    | 'audio'
    | 'compound'
    | 'particles'
    | 'feedback'
    | 'tunnel'
    | 'fog'
    | 'puppet'
    | 'jellyfish'
    | 'fire'
    | 'golem'
    | 'dragon'
    | 'portal'
    | 'mandala'
    | 'mercury'
    | 'synapse'
    | 'sun'
    | 'chessboard'
    | 'aurora';
  defaultTrackId: string;
  defaultDuration: number; // en secondes
  color: string;

  // Propriétés par défaut du prototype
  defaultTransform: ScenicTransform;
  animationMode: ShadowAnimationMode;
  motionStyle:
    | 'pirate_dance'
    | 'patrol_walk'
    | 'mystic_spin'
    | 'sneak_creep'
    | 'detached_leap'
    | 'quadruped_run'
    | 'oceanic_swim'
    | 'flocking_flight'
    | 'wire_marionette'
    | 'slow_drift'
    | 'vortex_spiral'
    | 'voronoi_shatter'
    | 'dragon_flight'
    | 'piston_pulse'
    | 'mercury_flow'
    | 'synaptic_burst'
    | 'mandala_spin';
  motionSpeed: number;
  costume?: CostumeDetails;
  visualFx: VisualEffectType;
  fxIntensity: number; // 0..1
  audioConfig: ScenicAudioConfig;

  // Pour les blocs composés (regroupement de plusieurs effets en un seul bloc)
  isCompound?: boolean;
  compoundSubElements?: {
    elementId: string;
    relativeStartTime: number;
    duration: number;
    opacity: number;
  }[];

  createdAt: string;
}

export interface TimelineClip {
  id: string;
  elementId: string; // Référence au prototype dans la bibliothèque
  trackId: string;
  name: string;
  color: string;
  startTime: number; // en secondes
  duration: number; // en secondes
  active: boolean;

  // Surcharges spécifiques à CETTE instance (ne modifie pas les autres instances)
  transform: ScenicTransform;
  animationMode: ShadowAnimationMode;
  motionSpeed: number;
  motionStyle: string;
  visualFx: VisualEffectType;
  fxIntensity: number;
  audioConfig: ScenicAudioConfig;

  // Déclencheur TOP
  triggerCueId?: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  layerNumber: number;
  color: string;
  isMuted: boolean;
  isSolo: boolean;
  opacity: number; // 0..1
  blendMode: 'normal' | 'screen' | 'add' | 'multiply';
}

export interface CueItem {
  id: string;
  cueNumber: number;
  label: string;
  timeSec: number;
  action: 'jump_and_play' | 'fire_osc' | 'fade_black' | 'switch_mode';
  oscAddress: string;
  description: string;
}

export interface ShowProjectState {
  version: string;
  title: string;
  totalDurationSec: number;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  cues: CueItem[];
  reusableLibrary: ReusableScenicElement[];
  loop: boolean;
  masterVolume: number;
}
