// Types du Moteur de Scénographie Vivante & Objets Animables
// No[co]de Vibe Designer — Le Scénographe

export type ShadowAnimationMode = 'mirror' | 'autonomous' | 'hybrid';

export interface Keypoint2D {
  x: number; // Normalisé 0..1
  y: number; // Normalisé 0..1
  score: number; // Confiance de détection 0..1
  name?: string;
}

export interface SkeletonPose {
  nose?: Keypoint2D;
  leftEye?: Keypoint2D;
  rightEye?: Keypoint2D;
  leftEar?: Keypoint2D;
  rightEar?: Keypoint2D;
  leftShoulder: Keypoint2D;
  rightShoulder: Keypoint2D;
  leftElbow: Keypoint2D;
  rightElbow: Keypoint2D;
  leftWrist: Keypoint2D;
  rightWrist: Keypoint2D;
  leftHip: Keypoint2D;
  rightHip: Keypoint2D;
  leftKnee: Keypoint2D;
  rightKnee: Keypoint2D;
  leftAnkle: Keypoint2D;
  rightAnkle: Keypoint2D;
}

export interface CostumeDetails {
  hatType: 'tricorn' | 'cap' | 'crown' | 'hood' | 'none';
  hasSashBelt: boolean;
  hasCutlassSabre: boolean;
  hasCoatFlaps: boolean;
  featherAngle: number;
}

export interface LiveSilhouetteObject {
  id: string;
  name: string;
  category: 'performer_shadow' | 'interactive_object' | 'scenic_prop';
  characterTitle: string; // ex: "L'Ombre du Pirate"
  capturedAt: string;
  sourceType: 'camera_live' | 'video_file' | 'curated_test_performer';
  thumbnailUrl?: string;

  // Caractéristiques spatiales & de projection (layer de projection type Millumin)
  transform: {
    x: number; // 0..1 (jardin = 0.2, centre = 0.5, cour = 0.8)
    y: number; // 0..1 (sol scénique)
    scale: number; // 0.2 .. 3.0
    rotationDeg: number; // -180 .. 180
    opacity: number; // 0..1
    flipHorizontal: boolean; // Effet miroir scénique
  };

  // Trajectoire scénique & animation
  animationMode: ShadowAnimationMode;
  autonomousMotion: {
    style: 'pirate_dance' | 'patrol_walk' | 'mystic_spin' | 'sneak_creep' | 'detached_leap';
    speed: number;
    spatialRadius: number; // Rayon d'éloignement du comédien
    phase: number;
    description: string;
  };
  hybridConfig: {
    delayFrames: number; // Léger retard poétique (ex: 12 frames)
    anticipation: number; // 0..1
    reactivityToActor: number; // 0..1
    danceTogetherBlend: number; // 0 (pure imitation) à 1 (pure danse autonome)
  };

  // Costume & morphologie extraite
  costume: CostumeDetails;

  // Déclencheurs de régie scénique (Thread curtain, OSC, Timeline)
  cues: {
    triggerType: 'thread_curtain' | 'osc_cue' | 'manual_button' | 'timeline';
    cueAddress?: string; // ex: "/thread/contact/zone_1" ou "/cue/shadow/appear"
    isTriggered: boolean;
    autoFadeInMs: number;
    timelineStartSec?: number;
  };

  // Qualité & diagnostic de suivi
  trackingQuality: {
    confidence: number; // 0..1
    isTrackingLost: boolean;
    lostFramesCounter: number;
    smoothingFactor: number; // 0.1 .. 0.9 (filtre passe-bas contre saccades)
    statusMessage: string;
  };
}

export interface ScenographyStageState {
  actorStagePosition: {
    stageZone: 'jardin' | 'centre' | 'cour';
    x: number; // 0..1
    y: number; // 0..1
    isLiveFeedActive: boolean;
    detectedPose: SkeletonPose | null;
  };
  threadCurtain: {
    touched: boolean;
    touchZone: number; // 1..5
    glowIntensity: number;
  };
  activeShadow: LiveSilhouetteObject;
  selectedObjectId: string;
  timelineSec: number;
  isTimelinePlaying: boolean;
}
