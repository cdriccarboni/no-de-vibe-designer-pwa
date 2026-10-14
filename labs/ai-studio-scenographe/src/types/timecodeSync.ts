// Types & Modèles de données pour le Moteur Timecode SMPTE / MTC / Art-Net
// No[co]de Vibe Designer — Synchronisation Professionnelle de Spectacle

export type TimecodeFps = 24 | 25 | 29.97 | 30;

export type TimecodeSource =
  | 'internal_master'    // Horloge interne maître No[co]de
  | 'ltc_audio'          // SMPTE LTC audio linéaire (Entrée micro/jack)
  | 'mtc_midi'           // MIDI Timecode (MTC via Web MIDI)
  | 'artnet_timecode'    // Art-Net Timecode UDP
  | 'millumin_slave';    // Esclave timeline Millumin V4

export interface TimecodeTime {
  hours: number;        // 00 - 23
  minutes: number;      // 00 - 59
  seconds: number;      // 00 - 59
  frames: number;       // 00 - (fps - 1)
  subframes: number;    // 00 - 99 (80 ou 100 divisions de frame)
  totalSeconds: number;
  totalFrames: number;
  formatted: string;    // "01:23:45:18"
}

export interface TimecodeTriggerCue {
  id: string;
  name: string;
  qNumber: string;
  targetType: 'qlab_cue' | 'dmx_cue' | 'eos_cmd' | 'surtitre' | 'csharp_script';
  targetId: string;
  triggerTimeFormatted: string; // "00:01:30:00"
  triggerTotalFrames: number;
  isFired: boolean;
  color?: string;
}

export interface TimecodeEngineState {
  source: TimecodeSource;
  fps: TimecodeFps;
  isDropFrame: boolean;
  isPlaying: boolean;
  isLocked: boolean;         // Verrouillé sur le signal externe
  isFreewheeling: boolean;   // En roue libre temporaire (perte de signal tolérée)
  freewheelFramesMax: number;// Ex: 5 trames tolérées sans perte de synchro
  freewheelFramesCurrent: number;
  currentTime: TimecodeTime;
  offsetSeconds: number;     // Décalage pré-roll / post-roll
  jamSyncEnabled: boolean;   // Poursuit la lecture si le câble LTC est débranché
  audioLtcVolume: number;    // Volume du générateur de mire LTC (0.0 à 1.0)
  detectedLtcFps?: number;
}
