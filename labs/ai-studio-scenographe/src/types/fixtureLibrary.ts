// Types & Modèles de données pour la Bibliothèque de Projecteurs (GDTF & Open Fixture Library)
// No[co]de Vibe Designer — Compatibilité Pupitres Professionnels (ETC, MA Lighting, Robe, Martin)

export type FixtureCategory =
  | 'traditional'    // PC, Fresnel, Découpe halogène
  | 'led_static'     // PAR LED, Barres LED, Cycloramas
  | 'moving_head'    // Lyres Spot, Wash, Beam, Profile
  | 'strobe'         // Stroboscopes atomiques LED
  | 'atmospheric'    // Machines à fumée, brouillard, vent
  | 'pixel_matrix';  // Tubes LED, dalles matricielles

export interface FixtureChannelDef {
  offset: number;          // 0, 1, 2...
  name: string;            // 'Dimmer', 'Pan', 'Tilt', 'Red', 'Green'...
  type: 'dimmer' | 'pan' | 'tilt' | 'color' | 'shutter' | 'gobo' | 'prism' | 'zoom' | 'focus' | 'speed' | 'macro';
  defaultValue: number;    // 0 à 255
  homeValue: number;       // Valeur de repos
  min?: number;
  max?: number;
}

export interface FixturePersonalityMode {
  name: string;            // 'Standard 16ch', 'Extended 24ch', 'Basic 4ch'
  channelCount: number;
  channels: FixtureChannelDef[];
}

export interface FixtureProfile {
  id: string;
  manufacturer: string;    // 'ETC', 'Robe', 'Martin', 'Ayrton', 'Clay Paky', 'Cameo', 'Astera'
  model: string;           // 'Robin Pointe', 'Source Four LED Series 3', 'MAC Aura XB'...
  category: FixtureCategory;
  standardGdtf: boolean;
  powerWatts: number;
  beamAngleMin: number;
  beamAngleMax: number;
  hasPanTilt: boolean;
  colorMixing: 'rgb' | 'rgbw' | 'cmy' | 'lustr_x8' | 'single_color';
  modes: FixturePersonalityMode[];
  notes?: string;
}
