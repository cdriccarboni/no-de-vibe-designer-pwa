// Types & Modèles de données pour ETC (Electronic Theatre Controls), Response Nodes,
// et les Moteurs Natifs C++ / C# de Régie Technique No[co]de Vibe Designer

export type EtcProtocol = 'eos_osc' | 'sacn_e131' | 'net3' | 'artnet' | 'rdm';

// IFCB Categories (ETC Eos standard)
export type EtcIfcbCategory = 'intensity' | 'focus' | 'color' | 'beam';

export interface EtcPalette {
  id: string;
  number: number;
  name: string;
  category: EtcIfcbCategory;
  colorHex?: string;
  values: Record<string, number>; // fixtureId ou paramètre -> valeur (0-255 ou degrés)
}

export interface EtcDirectSelect {
  id: string;
  type: 'group' | 'intensity_palette' | 'focus_palette' | 'color_palette' | 'beam_palette' | 'macro' | 'cue';
  number: number;
  label: string;
  color?: string;
  active: boolean;
}

// ETC Response Gateway / DMX Node
export interface EtcResponsePort {
  portNumber: number; // 1, 2, 3, 4...
  direction: 'output' | 'input';
  universe: number; // 1 à 63999 (sACN)
  sacnPriority: number; // 1 à 200 (standard ETC Eos = 100)
  mergeMode: 'htp' | 'ltp' | 'priority_only';
  status: 'active' | 'standby' | 'error';
  packetRateFps: number; // ex: 44 Hz
  rdmEnabled: boolean;
}

export interface EtcResponseNode {
  id: string;
  name: string;
  model: 'Response 4-Port' | 'Response 2-Port' | 'Response 8-Port' | 'Response Opto-Splitter' | 'Mosaic MSC';
  ipAddress: string;
  macAddress: string;
  firmwareVersion: string;
  temperatureCelsius: number;
  ports: EtcResponsePort[];
  rdmDevicesCount: number;
  isOnline: boolean;
}

// RDM (Remote Device Management - ANSI E1.20)
export interface RdmDevice {
  uid: string; // ex: 4554:0012ABCD (ETC manufacturer ID = 0x4554)
  modelName: string;
  manufacturer: string;
  universe: number;
  dmxAddress: number;
  footprint: number;
  lampHours: number;
  temperatureCelsius: number;
  sensorAlerts: string[];
  personality: string;
}

// ETC Augment3d Spatial Entity
export interface Augment3dEntity {
  id: string;
  name: string;
  type: 'fixture' | 'actor' | 'scenic_prop' | 'focus_target';
  x: number; // mètres (-15 à +15m)
  y: number; // hauteur perche (0 à 12m)
  z: number; // profondeur plateau (-10 à +10m)
  rotationX: number; // deg
  rotationY: number; // deg
  rotationZ: number; // deg
  targetEntityId?: string; // Pointage automatique de la lyre vers un acteur ou cible
  color?: string;
}

// C++ WebAssembly / Real-Time DSP Engine
export interface NativeCppEngineState {
  isCompiled: boolean;
  isExecuting: boolean;
  executionMode: 'wasm_simulated' | 'native_bridge' | 'export_ready';
  lastCompileTimeMs: number;
  frameRateFps: number;
  microsecondLatency: number; // Microsecondes par trame de mixage DMX (ex: 8.4 µs)
  packetCount: number;
  codeSnippet: string;
  compileErrors: string[];
  metrics: {
    universesProcessed: number;
    channelsCalculated: number;
    peakJitterMicroseconds: number;
  };
}

// C# .NET 8 Show Controller Scripting
export interface NativeCsEngineState {
  isCompiled: boolean;
  isRunning: boolean;
  scriptClass: string;
  lastExecutionLog: string[];
  executionTimeMs: number;
  codeSnippet: string;
  compilerErrors: string[];
  activeTriggers: string[];
}
