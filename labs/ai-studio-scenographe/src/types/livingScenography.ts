// Types pour le domaine « Scénographie vivante » — PIRATES PAILLETTES ! V2.1.26
// Conduite de spectacle, Shaders attestés, Bruitages physiques, Anaglyphe et Dessin temps réel

export type CueTrackType = 'video' | 'light' | 'sound' | 'stage' | 'regie';

export interface ScriptCueItem {
  id: string;
  pageNumber: number;
  label: string;
  track: CueTrackType;
  trackCode: '[V]' | '[L]' | '[S]' | '[J]' | '[R]';
  description: string;
  timeSec: number;
  durationSec: number;
  triggerMode: 'manual_go' | 'auto_follow' | 'timecode' | 'audio_threshold';
  safeState: string;
  regieNotes: string;
  status: 'pending' | 'standby' | 'active' | 'completed' | 'hold';
  actionPayload?: {
    shaderId?: ParametricShaderId;
    lightState?: 'blackout' | 'shower_spot' | 'lightning_flash' | 'emergency_red' | 'full';
    soundPresetId?: string;
    onAir?: boolean;
    drawingId?: string;
    videoTracking?: boolean;
    anaglyphEnabled?: boolean;
    volumeFadeDb?: number;
  };
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  cueId: string;
  cueLabel: string;
  track: CueTrackType;
  action: string;
  operatorNotes?: string;
}

export type ParametricShaderId =
  | 'limbes'
  | 'tempete'
  | 'water_sim'
  | 'abysses'
  | 'abysses_2'
  | 'wispy_bg'
  | 'anaglyph_vortex';

export interface ParametricShaderConfig {
  id: ParametricShaderId;
  name: string;
  didascaliePage: number;
  description: string;
  intensity: number; // 0..2
  speed: number; // 0.1..3.0
  grain: number; // 0..1
  paletteHue: number; // 0..360
  seed: number;
  is2DFallback: boolean;
  uniforms: Record<string, number>;
}

export interface AnaglyphConfig {
  enabled: boolean;
  convergence: number; // -20..20 px
  intensity: number; // 0..1
  colorPair: 'red_cyan' | 'magenta_green' | 'amber_blue';
  visualComfortWarning: boolean;
  pure2DFallback: boolean;
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawingStroke {
  points: DrawingPoint[];
  color: string;
  width: number;
}

export interface LiveDrawingObject {
  id: string;
  name: string;
  pageRef: number;
  description: string;
  strokes: DrawingStroke[];
  revealProgress: number; // 0..1
  isWalkableDoorMask: boolean;
  projectionSurface: 'gauze_curtain' | 'backdrop_canvas' | 'radio_station';
  animated: boolean;
}

export type FoleySoundPresetId =
  | 'sachet_velours_vert'
  | 'bouteilles_frangees'
  | 'tambour_ocean_billes'
  | 'boite_tonnerre_etain'
  | 'sifflet_azteque'
  | 'flute_claquage'
  | 'piezo_jambe_bois'
  | 'bouteille_froissee'
  | 'cloches_bateau'
  | 'stompbox_belier'
  | 'ballon_chamoisine'
  | 'talkie_walkie_bips'
  | 'vinyle_lointain'
  | 'psalmodie_lune'
  | 'hijo_de_la_luna_bells'
  | 'my_heart_will_go_on_flute';

export interface FoleySoundDefinition {
  id: FoleySoundPresetId;
  name: string;
  objectDescription: string;
  didascaliePage: number;
  category: 'aerien' | 'aquatique' | 'impact' | 'mecanique' | 'signal';
  durationSec: number;
  loopable: boolean;
  gainDb: number;
}

export interface DramaturgicalScenePreset {
  id: string;
  title: string;
  subtitle: string;
  scriptPages: string;
  summary: string;
  dramaturgyIntent: string;
  keyElements: string[];
  initialCues: ScriptCueItem[];
  defaultShader: ParametricShaderId;
  anaglyphActive: boolean;
  defaultLightMode: 'blackout' | 'shower_spot' | 'lightning_flash' | 'emergency_red' | 'full';
  onAirState: boolean;
  defaultSoundPreset: FoleySoundPresetId;
  associatedDrawingId?: string;
  safeFallbackExplanation: string;
  testingWithoutHardwareGuide: string;
}
