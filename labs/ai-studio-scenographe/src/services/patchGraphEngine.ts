// Moteur de Graphe de Patch Visuel & Câblage Réel No[co]de Vibe Designer
// Conforme à la spécification officielle No[co]de :
// Nodes avec headers déplaçables, ports typés, câbles vectoriels Bézier,
// liaison temps réel avec les moteurs audio, GLSL, Radio Broadcast et Timeline.

export type NodeCategory =
  | 'audio'
  | 'generator'
  | 'shader'
  | 'output'
  | 'control'
  | 'mapping'
  | 'logic'
  | 'hardware'
  | 'gateway'
  | 'mobile'
  | 'ai';
export type PortDataType = 'audio' | 'signal' | 'video' | 'matrix' | 'cue';

export interface PatchPort {
  id: string;
  name: string;
  type: PortDataType;
  direction: 'input' | 'output';
  value?: any;
}

export interface PatchNodeParam {
  key: string;
  label: string;
  type: 'slider' | 'toggle' | 'select' | 'color';
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface PatchNode {
  id: string;
  type: string;
  name: string;
  category: NodeCategory;
  x: number;
  y: number;
  inputs: PatchPort[];
  outputs: PatchPort[];
  params: Record<string, PatchNodeParam>;
  isBypassed?: boolean;
  color?: string;
  engineId?: string;
}

export interface PatchWire {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  isActive?: boolean;
}

export interface PatchTab {
  id: string;
  title: string;
  nodes: PatchNode[];
  wires: PatchWire[];
  selectedNodeId: string | null;
  glslCode?: string;
  isTimelineTrack?: boolean;
  timelineTrackName?: string;
  createdAt: number;
}

export interface PatchProject {
  id: string;
  title: string;
  version: string;
  tabs: PatchTab[];
  activeTabId: string;
}

export const INITIAL_OFFICIAL_NODES: PatchNode[] = [
  {
    id: 'node-audio-in',
    type: 'audio-input',
    name: 'Audio In (Micro Scène)',
    category: 'audio',
    x: 40,
    y: 80,
    inputs: [],
    outputs: [
      { id: 'out-audio', name: 'Signal Audio', type: 'audio', direction: 'output' },
      { id: 'out-peak', name: 'Crête (dB)', type: 'signal', direction: 'output' },
    ],
    params: {
      gain: { key: 'gain', label: 'Gain Entrée', type: 'slider', value: 1.0, min: 0, max: 2, step: 0.05 },
      threshold: { key: 'threshold', label: 'Seuil Détection', type: 'slider', value: 0.15, min: 0, max: 1, step: 0.01 },
      micSource: { key: 'micSource', label: 'Source', type: 'select', value: 'Micro live régie', options: ['Micro live régie', 'Bruitage plateau', 'Ableton Link / Jack'] },
    },
    color: '#d7b86a',
  },
  {
    id: 'node-fft-analyzer',
    type: 'fft-analyzer',
    name: 'Analyseur FFT & Enveloppe',
    category: 'audio',
    x: 280,
    y: 80,
    inputs: [
      { id: 'in-audio', name: 'Audio In', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'out-bass', name: 'Basses', type: 'signal', direction: 'output' },
      { id: 'out-mid', name: 'Médiums', type: 'signal', direction: 'output' },
      { id: 'out-treble', name: 'Aigus', type: 'signal', direction: 'output' },
      { id: 'out-energy', name: 'Énergie Globale', type: 'signal', direction: 'output' },
    ],
    params: {
      smoothing: { key: 'smoothing', label: 'Lissage', type: 'slider', value: 0.75, min: 0, max: 0.99, step: 0.01 },
      reactivity: { key: 'reactivity', label: 'Sensibilité', type: 'slider', value: 1.5, min: 0.1, max: 4, step: 0.1 },
    },
    color: '#8fa79d',
  },
  {
    id: 'node-glsl-ocean',
    type: 'glsl-shader',
    name: 'Mer Phosphorescente (GLSL)',
    category: 'shader',
    x: 540,
    y: 80,
    inputs: [
      { id: 'in-mod-sound', name: 'Réactivité Son', type: 'signal', direction: 'input' },
      { id: 'in-tilt', name: 'Inclinaison Companion', type: 'signal', direction: 'input' },
    ],
    outputs: [
      { id: 'out-texture', name: 'Rendu Visuel', type: 'video', direction: 'output' },
    ],
    params: {
      speed: { key: 'speed', label: 'Vitesse des vagues', type: 'slider', value: 0.65, min: 0.1, max: 3.0, step: 0.05 },
      phosphorColor: { key: 'phosphorColor', label: 'Teinte bioluminescente', type: 'slider', value: 0.48, min: 0, max: 1, step: 0.01 },
      waveHeight: { key: 'waveHeight', label: 'Amplitude houle', type: 'slider', value: 0.8, min: 0.1, max: 2.5, step: 0.05 },
      glowIntensity: { key: 'glowIntensity', label: 'Intensité Glow', type: 'slider', value: 1.4, min: 0.2, max: 3.0, step: 0.1 },
    },
    color: '#38bdf8',
    engineId: 'glsl',
  },
  {
    id: 'node-vibe-stage',
    type: 'vibe-out',
    name: 'Vibe Out (Plateau / Mapping)',
    category: 'output',
    x: 820,
    y: 80,
    inputs: [
      { id: 'in-video', name: 'Texture Vidéo', type: 'video', direction: 'input' },
      { id: 'in-mapping', name: 'Matrice Homographie', type: 'matrix', direction: 'input' },
    ],
    outputs: [
      { id: 'out-monitor', name: 'Flux HDMI / NDI', type: 'video', direction: 'output' },
    ],
    params: {
      opacity: { key: 'opacity', label: 'Opacité Master', type: 'slider', value: 1.0, min: 0, max: 1, step: 0.05 },
      fpsLimit: { key: 'fpsLimit', label: 'Fréquence', type: 'select', value: '60 fps', options: ['30 fps', '60 fps', 'Illimité (V-Sync)'] },
      blendMode: { key: 'blendMode', label: 'Mélange', type: 'select', value: 'Normal', options: ['Normal', 'Additif', 'Screen', 'Overlay'] },
    },
    color: '#d7b86a',
  },
  {
    id: 'node-radio-bus',
    type: 'radio-broadcast',
    name: 'Radio Broadcast Bus (P00)',
    category: 'output',
    x: 280,
    y: 340,
    inputs: [
      { id: 'in-audio', name: 'Mix Audio', type: 'audio', direction: 'input' },
      { id: 'in-cue', name: 'TOP On Air', type: 'cue', direction: 'input' },
    ],
    outputs: [
      { id: 'out-stream', name: 'Flux Web Direct', type: 'signal', direction: 'output' },
    ],
    params: {
      slug: { key: 'slug', label: 'Chemin URL', type: 'select', value: 'radio-paillettes', options: ['radio-paillettes', 'radio-pirate', 'radio'] },
      bitrate: { key: 'bitrate', label: 'Débit Audio', type: 'select', value: '128 kbps (Opus)', options: ['64 kbps (Opus)', '128 kbps (Opus)', '256 kbps (HQ)'] },
      compression: { key: 'compression', label: 'Compresseur / Limiteur', type: 'toggle', value: true },
    },
    color: '#ef4444',
  },
  {
    id: 'node-companion-bridge',
    type: 'companion-control',
    name: 'Companion Phone & Mapping',
    category: 'control',
    x: 40,
    y: 340,
    inputs: [],
    outputs: [
      { id: 'out-sensors', name: 'Gyro / Tilt', type: 'signal', direction: 'output' },
      { id: 'out-homography', name: 'Pinceau de Mapping', type: 'matrix', direction: 'output' },
    ],
    params: {
      pin: { key: 'pin', label: 'Code PIN Associé', type: 'select', value: '7392', options: ['7392'] },
      hapticOnCue: { key: 'hapticOnCue', label: 'Vibrations TOP', type: 'toggle', value: true },
    },
    color: '#10b981',
  },
  {
    id: 'node-top-cues',
    type: 'cue-control',
    name: 'Conduite de Cues (Millumin)',
    category: 'control',
    x: 540,
    y: 340,
    inputs: [],
    outputs: [
      { id: 'out-cue-trigger', name: 'TOP Déclencheur', type: 'cue', direction: 'output' },
    ],
    params: {
      activeCue: { key: 'activeCue', label: 'Cue Active', type: 'select', value: 'Cue 1 · Radio Paillettes en grève', options: ['Cue 1 · Radio Paillettes en grève', 'Cue 2 · Mer phosphorescente & Tempête', 'Cue 3 · Épée lumineuse & Ombres'] },
      panicArm: { key: 'panicArm', label: 'Armement PANIC', type: 'toggle', value: false },
    },
    color: '#a855f7',
  },
];

export const INITIAL_OFFICIAL_WIRES: PatchWire[] = [
  {
    id: 'wire-1',
    sourceNodeId: 'node-audio-in',
    sourcePortId: 'out-audio',
    targetNodeId: 'node-fft-analyzer',
    targetPortId: 'in-audio',
    isActive: true,
  },
  {
    id: 'wire-2',
    sourceNodeId: 'node-fft-analyzer',
    sourcePortId: 'out-energy',
    targetNodeId: 'node-glsl-ocean',
    targetPortId: 'in-mod-sound',
    isActive: true,
  },
  {
    id: 'wire-3',
    sourceNodeId: 'node-glsl-ocean',
    sourcePortId: 'out-texture',
    targetNodeId: 'node-vibe-stage',
    targetPortId: 'in-video',
    isActive: true,
  },
  {
    id: 'wire-4',
    sourceNodeId: 'node-audio-in',
    sourcePortId: 'out-audio',
    targetNodeId: 'node-radio-bus',
    targetPortId: 'in-audio',
    isActive: true,
  },
  {
    id: 'wire-5',
    sourceNodeId: 'node-companion-bridge',
    sourcePortId: 'out-sensors',
    targetNodeId: 'node-glsl-ocean',
    targetPortId: 'in-tilt',
    isActive: true,
  },
  {
    id: 'wire-6',
    sourceNodeId: 'node-companion-bridge',
    sourcePortId: 'out-homography',
    targetNodeId: 'node-vibe-stage',
    targetPortId: 'in-mapping',
    isActive: true,
  },
  {
    id: 'wire-7',
    sourceNodeId: 'node-top-cues',
    sourcePortId: 'out-cue-trigger',
    targetNodeId: 'node-radio-bus',
    targetPortId: 'in-cue',
    isActive: true,
  },
];

export const INITIAL_TABS: PatchTab[] = [
  {
    id: 'tab-1',
    title: '1 · Mer Phosphorescente',
    nodes: [...INITIAL_OFFICIAL_NODES],
    wires: [...INITIAL_OFFICIAL_WIRES],
    selectedNodeId: 'node-radio-bus',
    isTimelineTrack: true,
    timelineTrackName: 'GLSL Ocean (Mer Bioluminescente)',
    createdAt: 1,
  },
  {
    id: 'tab-2',
    title: '2 · Ombres de Pirates',
    nodes: [
      {
        id: 'node-shadow-gen',
        type: 'shadow-generator',
        name: 'Générateur Ombres Pirates',
        category: 'generator',
        x: 60,
        y: 90,
        inputs: [
          { id: 'in-optional-cue', name: 'TOP Déclencheur (Optionnel)', type: 'cue', direction: 'input' },
        ],
        outputs: [
          { id: 'out-signal', name: 'Flux Silhouettes', type: 'signal', direction: 'output' },
        ],
        params: {
          shadowCount: { key: 'shadowCount', label: 'Nombre d’ombres', type: 'slider', value: 7, min: 1, max: 20, step: 1 },
          distanceFade: { key: 'distanceFade', label: 'Éloignement horizon', type: 'slider', value: 0.85, min: 0.1, max: 1.0, step: 0.05 },
        },
        color: '#8fa79d',
      },
      {
        id: 'node-fog-gen',
        type: 'fog-field',
        name: 'Brume & Brouillard Volumétrique',
        category: 'generator',
        x: 320,
        y: 90,
        inputs: [],
        outputs: [
          { id: 'out-signal', name: 'Densité Brume', type: 'signal', direction: 'output' },
        ],
        params: {
          fogDensity: { key: 'fogDensity', label: 'Densité brume', type: 'slider', value: 1.2, min: 0.2, max: 3.0, step: 0.1 },
        },
        color: '#8fa79d',
      },
      {
        id: 'node-ghost-shader',
        type: 'glsl-shader',
        name: 'Shader Ombres Fantomatiques (GLSL)',
        category: 'shader',
        x: 580,
        y: 90,
        inputs: [
          { id: 'in-signal', name: 'Silhouettes & Brume', type: 'signal', direction: 'input' },
          { id: 'in-optional-audio', name: 'Audio In (Optionnel)', type: 'signal', direction: 'input' },
        ],
        outputs: [
          { id: 'out-texture', name: 'Texture Rendu', type: 'video', direction: 'output' },
        ],
        params: {
          wanderSpeed: { key: 'wanderSpeed', label: 'Vitesse de marche', type: 'slider', value: 0.6, min: 0.1, max: 2.0, step: 0.05 },
          ghostGlow: { key: 'ghostGlow', label: 'Luminescence spectrale', type: 'slider', value: 1.1, min: 0.0, max: 2.5, step: 0.1 },
        },
        color: '#38bdf8',
        engineId: 'glsl',
      },
      {
        id: 'node-vibe-ghost-out',
        type: 'vibe-out',
        name: 'Vibe Out (Rendu Plateau / Mapping)',
        category: 'output',
        x: 860,
        y: 90,
        inputs: [
          { id: 'in-video', name: 'Texture Vidéo', type: 'video', direction: 'input' },
        ],
        outputs: [
          { id: 'out-monitor', name: 'Flux HDMI / NDI', type: 'video', direction: 'output' },
        ],
        params: {
          opacity: { key: 'opacity', label: 'Opacité Master', type: 'slider', value: 1.0, min: 0, max: 1, step: 0.05 },
        },
        color: '#d7b86a',
      },
    ],
    wires: [
      {
        id: 'wire-g1',
        sourceNodeId: 'node-shadow-gen',
        sourcePortId: 'out-signal',
        targetNodeId: 'node-ghost-shader',
        targetPortId: 'in-signal',
        isActive: true,
      },
      {
        id: 'wire-g2',
        sourceNodeId: 'node-ghost-shader',
        sourcePortId: 'out-texture',
        targetNodeId: 'node-vibe-ghost-out',
        targetPortId: 'in-video',
        isActive: true,
      },
    ],
    selectedNodeId: 'node-ghost-shader',
    isTimelineTrack: true,
    timelineTrackName: 'Ombres de Pirates & Brume',
    createdAt: 2,
  },
  {
    id: 'tab-3',
    title: '3 · Créature Lumineuse',
    nodes: [
      {
        id: 'node-creature-baleine',
        type: 'whale-sdf',
        name: 'Baleine Organique Interactive',
        category: 'generator',
        x: 60,
        y: 90,
        inputs: [],
        outputs: [
          { id: 'out-geometry', name: 'Géométrie Volumétrique', type: 'signal', direction: 'output' },
        ],
        params: {
          scale: { key: 'scale', label: 'Envergure Créature', type: 'slider', value: 1.2, min: 0.2, max: 3.0, step: 0.1 },
          undulation: { key: 'undulation', label: 'Fréquence Ondulation', type: 'slider', value: 0.8, min: 0.1, max: 2.0, step: 0.05 },
        },
        color: '#8fa79d',
      },
      {
        id: 'node-bloom-isf',
        type: 'bloom-shader',
        name: 'Bloom & Luminescence ISF',
        category: 'shader',
        x: 400,
        y: 90,
        inputs: [
          { id: 'in-signal', name: 'Texture Source', type: 'signal', direction: 'input' },
        ],
        outputs: [
          { id: 'out-texture', name: 'Luminescence Rayonnante', type: 'video', direction: 'output' },
        ],
        params: {
          intensity: { key: 'intensity', label: 'Rayonnement Halo', type: 'slider', value: 1.6, min: 0.1, max: 3.0, step: 0.1 },
        },
        color: '#38bdf8',
      },
      {
        id: 'node-vibe-creature-out',
        type: 'vibe-out',
        name: 'Vibe Out (Rendu Plateau / Mapping)',
        category: 'output',
        x: 740,
        y: 90,
        inputs: [
          { id: 'in-video', name: 'Texture Finale', type: 'video', direction: 'input' },
        ],
        outputs: [
          { id: 'out-monitor', name: 'Flux HDMI / NDI', type: 'video', direction: 'output' },
        ],
        params: {
          opacity: { key: 'opacity', label: 'Opacité Master', type: 'slider', value: 1.0, min: 0, max: 1, step: 0.05 },
        },
        color: '#d7b86a',
      },
    ],
    wires: [
      {
        id: 'wire-c1',
        sourceNodeId: 'node-creature-baleine',
        sourcePortId: 'out-geometry',
        targetNodeId: 'node-bloom-isf',
        targetPortId: 'in-signal',
        isActive: true,
      },
      {
        id: 'wire-c2',
        sourceNodeId: 'node-bloom-isf',
        sourcePortId: 'out-texture',
        targetNodeId: 'node-vibe-creature-out',
        targetPortId: 'in-video',
        isActive: true,
      },
    ],
    selectedNodeId: 'node-creature-baleine',
    isTimelineTrack: true,
    timelineTrackName: 'Créature Lumineuse Organique',
    createdAt: 3,
  },
  {
    id: 'tab-4',
    title: '4 · Bruitage & TOPs Scéniques',
    nodes: [
      {
        id: 'node-micro-foley',
        type: 'audio-input',
        name: 'Micro Scène & Plateau',
        category: 'audio',
        x: 60,
        y: 90,
        inputs: [],
        outputs: [
          { id: 'out-audio', name: 'Signal Micro', type: 'audio', direction: 'output' },
        ],
        params: {
          gain: { key: 'gain', label: 'Gain Micro', type: 'slider', value: 1.2, min: 0.1, max: 2.5, step: 0.1 },
        },
        color: '#d7b86a',
      },
      {
        id: 'node-foley-transient',
        type: 'fft-analyzer',
        name: 'Détecteur de Choc Acoustique',
        category: 'audio',
        x: 340,
        y: 90,
        inputs: [
          { id: 'in-audio', name: 'Signal Audio', type: 'audio', direction: 'input' },
        ],
        outputs: [
          { id: 'out-energy', name: 'Impulsion TOP', type: 'signal', direction: 'output' },
        ],
        params: {
          sensitivity: { key: 'sensitivity', label: 'Sensibilité Choc', type: 'slider', value: 1.8, min: 0.5, max: 4.0, step: 0.1 },
        },
        color: '#d7b86a',
      },
      {
        id: 'node-cues-millumin',
        type: 'cue-trigger',
        name: 'Conduite de Cues Millumin',
        category: 'control',
        x: 620,
        y: 90,
        inputs: [
          { id: 'in-trigger', name: 'Déclencheur Acoustique', type: 'signal', direction: 'input' },
        ],
        outputs: [
          { id: 'out-cue-trigger', name: 'TOP Scénique', type: 'cue', direction: 'output' },
        ],
        params: {
          activeCue: { key: 'activeCue', label: 'Cue Active', type: 'select', value: 'Cue 2 · Tempête Scénique', options: ['Cue 1 · Prologue', 'Cue 2 · Tempête Scénique', 'Cue 3 · Ombres Fantômes'] },
        },
        color: '#a855f7',
      },
      {
        id: 'node-radio-foley-bus',
        type: 'radio-broadcast',
        name: 'Radio Broadcast Bus (P00)',
        category: 'output',
        x: 900,
        y: 90,
        inputs: [
          { id: 'in-audio', name: 'Flux Mix', type: 'audio', direction: 'input' },
        ],
        outputs: [],
        params: {
          streamBitrate: { key: 'streamBitrate', label: 'Débit Opus', type: 'select', value: '192 kbps', options: ['96 kbps', '128 kbps', '192 kbps', '320 kbps'] },
        },
        color: '#ef4444',
      },
    ],
    wires: [
      {
        id: 'wire-f1',
        sourceNodeId: 'node-micro-foley',
        sourcePortId: 'out-audio',
        targetNodeId: 'node-foley-transient',
        targetPortId: 'in-audio',
        isActive: true,
      },
      {
        id: 'wire-f2',
        sourceNodeId: 'node-foley-transient',
        sourcePortId: 'out-energy',
        targetNodeId: 'node-cues-millumin',
        targetPortId: 'in-trigger',
        isActive: true,
      },
      {
        id: 'wire-f3',
        sourceNodeId: 'node-micro-foley',
        sourcePortId: 'out-audio',
        targetNodeId: 'node-radio-foley-bus',
        targetPortId: 'in-audio',
        isActive: true,
      },
    ],
    selectedNodeId: 'node-micro-foley',
    isTimelineTrack: true,
    timelineTrackName: 'Bruitage & TOPs Scéniques',
    createdAt: 4,
  },
];

class PatchGraphEngine {
  private tabs: PatchTab[] = [];
  private activeTabId: string = 'tab-1';
  private archivedTabs: PatchTab[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadState();
    if (typeof window !== 'undefined') {
      window.addEventListener('nocode_midi_control', (e: any) => {
        const { nodeId, paramKey, value } = e.detail || {};
        if (nodeId && paramKey !== undefined) {
          this.setParam(nodeId, paramKey, value);
        }
      });
    }
  }

  private loadState() {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nocode_project_tabs_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
            this.tabs = parsed.tabs;
            this.activeTabId = parsed.activeTabId || parsed.tabs[0].id;
            return;
          }
        }
      }
    } catch {
      // ignore
    }
    this.tabs = JSON.parse(JSON.stringify(INITIAL_TABS));
    this.activeTabId = 'tab-1';
  }

  private saveState() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'nocode_project_tabs_v2',
          JSON.stringify({
            tabs: this.tabs,
            activeTabId: this.activeTabId,
            archived: this.archivedTabs,
          })
        );
      }
    } catch {
      // ignore
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.saveState();
    this.listeners.forEach((l) => l());
  }

  // -------------------------------------------------------------
  // GESTION DES ONGLETS / SOUS-PATCHES
  // -------------------------------------------------------------

  public getTabs(): PatchTab[] {
    return this.tabs;
  }

  public getActiveTabId(): string {
    return this.activeTabId;
  }

  public getActiveTab(): PatchTab {
    const tab = this.tabs.find((t) => t.id === this.activeTabId);
    return tab || this.tabs[0];
  }

  public setActiveTab(id: string) {
    if (this.tabs.some((t) => t.id === id)) {
      this.activeTabId = id;
      this.notify();
    }
  }

  public createTab(title?: string): PatchTab {
    const count = this.tabs.length + 1;
    const newTab: PatchTab = {
      id: `tab-${Date.now().toString(36)}`,
      title: title || `Onglet ${count} · Nouveau Patch`,
      nodes: [
        {
          id: `node-vibe-out-${Date.now().toString(36)}`,
          type: 'vibe-out',
          name: 'Vibe Out (Rendu Plateau / Mapping)',
          category: 'output',
          x: 640,
          y: 100,
          inputs: [
            { id: 'in-video', name: 'Texture Vidéo', type: 'video', direction: 'input' },
          ],
          outputs: [
            { id: 'out-monitor', name: 'Flux HDMI / NDI', type: 'video', direction: 'output' },
          ],
          params: {
            opacity: { key: 'opacity', label: 'Opacité Master', type: 'slider', value: 1.0, min: 0, max: 1, step: 0.05 },
          },
          color: '#d7b86a',
        },
      ],
      wires: [],
      selectedNodeId: null,
      isTimelineTrack: true,
      timelineTrackName: title || `Piste ${count}`,
      createdAt: Date.now(),
    };
    this.tabs.push(newTab);
    this.activeTabId = newTab.id;
    this.notify();
    return newTab;
  }

  public renameTab(tabId: string, title: string) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (tab && title.trim()) {
      tab.title = title.trim();
      tab.timelineTrackName = title.trim();
      this.notify();
    }
  }

  public duplicateTab(tabId: string): PatchTab {
    const src = this.tabs.find((t) => t.id === tabId) || this.getActiveTab();
    const clonedNodes: PatchNode[] = JSON.parse(JSON.stringify(src.nodes)).map((n: PatchNode) => ({
      ...n,
      id: `node-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    }));
    
    // Remap wire IDs to cloned node IDs
    const idMap: Record<string, string> = {};
    src.nodes.forEach((oldNode, idx) => {
      idMap[oldNode.id] = clonedNodes[idx].id;
    });

    const clonedWires: PatchWire[] = JSON.parse(JSON.stringify(src.wires)).map((w: PatchWire) => ({
      ...w,
      id: `wire-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      sourceNodeId: idMap[w.sourceNodeId] || w.sourceNodeId,
      targetNodeId: idMap[w.targetNodeId] || w.targetNodeId,
    }));

    const newTab: PatchTab = {
      id: `tab-${Date.now().toString(36)}`,
      title: `${src.title} (Copie)`,
      nodes: clonedNodes,
      wires: clonedWires,
      selectedNodeId: clonedNodes[0]?.id || null,
      glslCode: src.glslCode,
      isTimelineTrack: src.isTimelineTrack,
      timelineTrackName: `${src.title} (Copie)`,
      createdAt: Date.now(),
    };
    this.tabs.push(newTab);
    this.activeTabId = newTab.id;
    this.notify();
    return newTab;
  }

  public closeTab(tabId: string) {
    if (this.tabs.length <= 1) return; // Keep at least one active tab
    const idx = this.tabs.findIndex((t) => t.id === tabId);
    if (idx !== -1) {
      const removed = this.tabs.splice(idx, 1)[0];
      this.archivedTabs.push(removed); // Never permanently destroy work
      if (this.activeTabId === tabId) {
        this.activeTabId = this.tabs[Math.max(0, idx - 1)].id;
      }
      this.notify();
    }
  }

  public sendTabToTimeline(tabId: string) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.isTimelineTrack = !tab.isTimelineTrack;
      this.notify();
    }
  }

  public groupNodesToSubPatch(nodeIds: string[], subPatchTitle = 'Sous-Patch Regroupé'): PatchNode | null {
    const active = this.getActiveTab();
    const toGroup = active.nodes.filter((n) => nodeIds.includes(n.id));
    if (toGroup.length === 0) return null;

    // Create a new tab dedicated to this sub-patch
    const subTab = this.createTab(subPatchTitle);
    subTab.nodes = [...toGroup];
    subTab.wires = active.wires.filter(
      (w) => nodeIds.includes(w.sourceNodeId) && nodeIds.includes(w.targetNodeId)
    );

    // Replace the grouped nodes in the active tab with a single Sub-Patch node
    const avgX = Math.round(toGroup.reduce((sum, n) => sum + n.x, 0) / toGroup.length);
    const avgY = Math.round(toGroup.reduce((sum, n) => sum + n.y, 0) / toGroup.length);

    const subPatchNode: PatchNode = {
      id: `node-subpatch-${Date.now().toString(36)}`,
      type: 'subpatch-container',
      name: subPatchTitle,
      category: 'control',
      x: avgX,
      y: avgY,
      inputs: [
        { id: 'in-signal', name: 'Entrée Bus', type: 'signal', direction: 'input' },
      ],
      outputs: [
        { id: 'out-signal', name: 'Sortie Bus', type: 'signal', direction: 'output' },
      ],
      params: {
        active: { key: 'active', label: 'Actif', type: 'toggle', value: true },
      },
      color: '#a855f7',
    };

    active.nodes = active.nodes.filter((n) => !nodeIds.includes(n.id));
    active.wires = active.wires.filter(
      (w) => !nodeIds.includes(w.sourceNodeId) && !nodeIds.includes(w.targetNodeId)
    );
    active.nodes.push(subPatchNode);
    active.selectedNodeId = subPatchNode.id;

    // Return focus to active tab
    this.activeTabId = active.id;
    this.notify();
    return subPatchNode;
  }

  // Application réelle du résultat Vibe dans le Patch Canvas
  public applyVibeResult(result: any, inNewTab = false) {
    if (!result) return;
    
    let targetTab: PatchTab;
    if (inNewTab) {
      targetTab = this.createTab(result.title || 'Création Vibe');
    } else {
      targetTab = this.getActiveTab();
      targetTab.title = result.title || targetTab.title;
      targetTab.timelineTrackName = result.title || targetTab.timelineTrackName;
    }

    if (result.glslCode) {
      targetTab.glslCode = result.glslCode;
    }

    // Instancier les blocs s'ils sont spécifiés
    if (result.nodesToCreate && Array.isArray(result.nodesToCreate)) {
      const createdNodes: PatchNode[] = [];
      result.nodesToCreate.forEach((item: any, idx: number) => {
        const id = `node-${Date.now().toString(36)}-${idx}`;
        const newNode: PatchNode = {
          id,
          type: item.type || item.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: item.name,
          category: item.category,
          x: 60 + idx * 240,
          y: 90,
          inputs: [
            { id: 'in-signal', name: 'Entrée', type: 'signal', direction: 'input' },
          ],
          outputs: [
            { id: 'out-signal', name: 'Sortie', type: 'signal', direction: 'output' },
            { id: 'out-texture', name: 'Texture', type: 'video', direction: 'output' },
          ],
          params: item.params || {
            intensity: { key: 'intensity', label: 'Intensité', type: 'slider', value: 0.8, min: 0, max: 1, step: 0.05 },
            active: { key: 'active', label: 'Actif', type: 'toggle', value: true },
          },
          color: item.category === 'shader' ? '#38bdf8' : item.category === 'audio' ? '#d7b86a' : item.category === 'output' ? '#ef4444' : '#8fa79d',
        };
        createdNodes.push(newNode);
      });

      targetTab.nodes = createdNodes;
      targetTab.selectedNodeId = createdNodes[0]?.id || null;

      // Connecter les câbles réels
      if (result.wiresToCreate && Array.isArray(result.wiresToCreate)) {
        targetTab.wires = result.wiresToCreate.map((w: any, wireIdx: number) => ({
          id: `wire-vibe-${Date.now()}-${wireIdx}`,
          sourceNodeId: createdNodes[w.sourceIndex]?.id || createdNodes[0].id,
          sourcePortId: w.sourcePort || 'out-signal',
          targetNodeId: createdNodes[w.targetIndex]?.id || createdNodes[1].id,
          targetPortId: w.targetPort || 'in-signal',
          isActive: true,
        }));
      } else {
        // Câblage automatique séquentiel par défaut
        targetTab.wires = [];
        for (let i = 0; i < createdNodes.length - 1; i++) {
          targetTab.wires.push({
            id: `wire-auto-${Date.now()}-${i}`,
            sourceNodeId: createdNodes[i].id,
            sourcePortId: 'out-signal',
            targetNodeId: createdNodes[i + 1].id,
            targetPortId: 'in-signal',
            isActive: true,
          });
        }
      }
    }

    this.notify();
  }

  // -------------------------------------------------------------
  // ACCÈS AUX NODES ET WIRES DU TAB ACTIF
  // -------------------------------------------------------------

  public getNodes(): PatchNode[] {
    return this.getActiveTab().nodes;
  }

  public getWires(): PatchWire[] {
    return this.getActiveTab().wires;
  }

  public getSelectedNodeId(): string | null {
    return this.getActiveTab().selectedNodeId;
  }

  public setSelectedNodeId(id: string | null) {
    this.getActiveTab().selectedNodeId = id;
    this.notify();
  }

  public moveNode(id: string, x: number, y: number) {
    const tab = this.getActiveTab();
    const node = tab.nodes.find((n) => n.id === id);
    if (node) {
      node.x = Math.max(0, Math.round(x));
      node.y = Math.max(0, Math.round(y));
      this.notify();
    }
  }

  public setParam(nodeId: string, paramKey: string, value: any) {
    const tab = this.getActiveTab();
    const node = tab.nodes.find((n) => n.id === nodeId);
    if (node && node.params[paramKey]) {
      node.params[paramKey].value = value;
      this.notify();
    }
  }

  public toggleBypass(nodeId: string) {
    const tab = this.getActiveTab();
    const node = tab.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.isBypassed = !node.isBypassed;
      this.notify();
    }
  }

  public addWire(sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string) {
    if (sourceNodeId === targetNodeId) return;
    const tab = this.getActiveTab();
    const exists = tab.wires.some(
      (w) =>
        w.sourceNodeId === sourceNodeId &&
        w.sourcePortId === sourcePortId &&
        w.targetNodeId === targetNodeId &&
        w.targetPortId === targetPortId
    );
    if (exists) return;

    tab.wires.push({
      id: `wire-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId,
      isActive: true,
    });
    this.notify();
  }

  public removeWire(wireId: string) {
    const tab = this.getActiveTab();
    tab.wires = tab.wires.filter((w) => w.id !== wireId);
    this.notify();
  }

  public addNodeFromLibrary(item: { name: string; category: NodeCategory; type?: string }) {
    const tab = this.getActiveTab();
    const id = `node-${Date.now().toString(36)}`;
    const newNode: PatchNode = {
      id,
      type: item.type || item.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: item.name,
      category: item.category,
      x: 120 + Math.floor(Math.random() * 220),
      y: 100 + Math.floor(Math.random() * 180),
      inputs: [
        { id: 'in-signal', name: 'Entrée', type: 'signal', direction: 'input' },
      ],
      outputs: [
        { id: 'out-signal', name: 'Sortie', type: 'signal', direction: 'output' },
      ],
      params: {
        intensity: { key: 'intensity', label: 'Intensité', type: 'slider', value: 0.8, min: 0, max: 1, step: 0.05 },
        active: { key: 'active', label: 'Actif', type: 'toggle', value: true },
      },
      color: item.category === 'shader' ? '#38bdf8' : item.category === 'audio' ? '#d7b86a' : item.category === 'output' ? '#ef4444' : '#8fa79d',
    };
    tab.nodes.push(newNode);
    tab.selectedNodeId = id;
    this.notify();
    return newNode;
  }

  public removeNode(id: string) {
    const tab = this.getActiveTab();
    tab.nodes = tab.nodes.filter((n) => n.id !== id);
    tab.wires = tab.wires.filter((w) => w.sourceNodeId !== id && w.targetNodeId !== id);
    if (tab.selectedNodeId === id) {
      tab.selectedNodeId = tab.nodes[0]?.id || null;
    }
    this.notify();
  }

  public resetToDefault() {
    this.tabs = JSON.parse(JSON.stringify(INITIAL_TABS));
    this.activeTabId = 'tab-1';
    this.notify();
  }
}

export const patchGraphEngine = new PatchGraphEngine();
