// Types & Modèles de données pour la Régie Lumière / DMX
// No[co]de Vibe Designer — Pupitre Scénique & Simulation Professionnelle

export type DmxProtocol = 'simulation' | 'artnet' | 'sacn' | 'usb_dmx' | 'millumin_bridge';

export type FixtureType =
  | 'dimmer'         // 1 canal : Gradateur traditionnel, PAR, PC, Fresnel, Découpe
  | 'rgb_par'        // 3 canaux : Projecteur LED Rouge, Vert, Bleu
  | 'rgbw_par'       // 4 canaux : Projecteur LED Rouge, Vert, Bleu, Blanc
  | 'moving_head'    // 8-16 canaux : Lyre motorisée (Pan, Tilt, Dimmer, Shutter, Gobo, RGBW)
  | 'led_bar'        // 8-24 canaux : Barre LED multi-pixels
  | 'strobe'         // 2-4 canaux : Stroboscope DMX (Fréquence, Intensité)
  | 'hazer';         // 2 canaux : Machine à brouillard / fumée (Débit, Ventilateur)

export interface DmxFixture {
  id: string;
  name: string;
  type: FixtureType;
  universe: number;        // 1 à 4
  startChannel: number;    // 1 à 512
  channelCount: number;
  color?: string;          // Couleur par défaut ou affichage UI
  tags?: string[];
  // Position spatiale pour le simulateur de scène 3D/2D
  stagePosition: {
    x: number;             // -100 à 100 (Cour / Jardin)
    y: number;             // Hauteur perche (0 à 100)
    z: number;             // Lointain / Face (0 à 100)
    panAngle: number;      // -180 à +180 deg
    tiltAngle: number;     // -90 à +90 deg
    beamAngle: number;     // Angle d'ouverture du cône (10 à 60 deg)
  };
  // Valeurs actuelles des canaux internes
  channels: number[];      // 0 à 255
}

export interface DmxSubmaster {
  id: string;
  name: string;
  value: number;           // 0 à 255
  fixtureIds: string[];    // Projecteurs contrôlés
  channelOffset?: number;  // Si contrôle d'un paramètre spécifique (ex: Dimmer = 0)
  color?: string;
}

export interface DmxLightCue {
  id: string;
  name: string;
  sceneTitle: string;
  fadeInSec: number;
  fadeOutSec: number;
  // Snapshot des valeurs DMX par fixture
  fixtureValues: Record<string, number[]>; // fixtureId -> array de 0-255
  notes?: string;
  color?: string;
}

export interface DmxFxGenerator {
  id: string;
  name: string;
  type: 'flame' | 'ocean_breathe' | 'lightning_storm' | 'audio_reactive' | 'pixel_chase';
  enabled: boolean;
  speed: number;           // 0.1 à 5.0
  intensity: number;       // 0.0 à 1.0
  targetFixtureIds: string[];
}

export interface DmxEngineState {
  protocol: DmxProtocol;
  universesCount: number;
  activeUniverse: number;
  grandMaster: number;     // 0 à 255
  blackout: boolean;
  blindMode: boolean;      // Édition silencieuse en régie sans impacter le plateau
  connectedUsbDevice: string | null;
  artnetIp: string;
  sacnPriority: number;
  isTransmitting: boolean;
  fps: number;
  lastPacketTime: number;
}
