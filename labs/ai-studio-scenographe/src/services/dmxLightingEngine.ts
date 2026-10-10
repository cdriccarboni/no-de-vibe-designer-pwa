// Moteur de Régie Lumière / DMX Professionnel
// No[co]de Vibe Designer — Pupitre Scénique, Protocoles (Art-Net, sACN, USB DMX) & Simulation 100% Hors-Ligne

import {
  DmxProtocol,
  DmxFixture,
  DmxSubmaster,
  DmxLightCue,
  DmxFxGenerator,
  DmxEngineState
} from '../types/dmxLighting';
import { livePerformanceBridge } from './livePerformanceBridge';
import { radioAudioEngine } from './radioAudioEngine';

// Configuration initiale des projecteurs du spectacle "Pirates Paillettes"
const INITIAL_FIXTURES: DmxFixture[] = [
  {
    id: 'fix-1',
    name: 'Face Cour (PC 1000W)',
    type: 'dimmer',
    universe: 1,
    startChannel: 1,
    channelCount: 1,
    color: '#fbbf24',
    tags: ['trad', 'face'],
    stagePosition: { x: 45, y: 75, z: 20, panAngle: -25, tiltAngle: -40, beamAngle: 30 },
    channels: [180],
  },
  {
    id: 'fix-2',
    name: 'Face Jardin (PC 1000W)',
    type: 'dimmer',
    universe: 1,
    startChannel: 2,
    channelCount: 1,
    color: '#fbbf24',
    tags: ['trad', 'face'],
    stagePosition: { x: -45, y: 75, z: 20, panAngle: 25, tiltAngle: -40, beamAngle: 30 },
    channels: [180],
  },
  {
    id: 'fix-3',
    name: 'Douche Soliste Maxime (Découpe Or)',
    type: 'dimmer',
    universe: 1,
    startChannel: 3,
    channelCount: 1,
    color: '#d7b86a',
    tags: ['soliste', 'douche'],
    stagePosition: { x: 0, y: 85, z: 50, panAngle: 0, tiltAngle: -85, beamAngle: 18 },
    channels: [220],
  },
  {
    id: 'fix-4',
    name: 'Contre Zénithal (Fresnel Warm)',
    type: 'dimmer',
    universe: 1,
    startChannel: 4,
    channelCount: 1,
    color: '#f97316',
    tags: ['trad', 'contre'],
    stagePosition: { x: 0, y: 80, z: 85, panAngle: 0, tiltAngle: -60, beamAngle: 45 },
    channels: [140],
  },
  {
    id: 'fix-5',
    name: 'Cyc LED Cour (Nuit & Mer)',
    type: 'rgbw_par',
    universe: 1,
    startChannel: 10,
    channelCount: 4, // R, G, B, W
    color: '#0284c7',
    tags: ['led', 'cyclorama'],
    stagePosition: { x: 60, y: 20, z: 95, panAngle: -10, tiltAngle: 45, beamAngle: 50 },
    channels: [10, 80, 240, 20],
  },
  {
    id: 'fix-6',
    name: 'Cyc LED Centre (Limbes Violet)',
    type: 'rgbw_par',
    universe: 1,
    startChannel: 14,
    channelCount: 4, // R, G, B, W
    color: '#9333ea',
    tags: ['led', 'cyclorama'],
    stagePosition: { x: 0, y: 20, z: 95, panAngle: 0, tiltAngle: 45, beamAngle: 50 },
    channels: [140, 10, 220, 10],
  },
  {
    id: 'fix-7',
    name: 'Cyc LED Jardin (Phosphorescence)',
    type: 'rgbw_par',
    universe: 1,
    startChannel: 18,
    channelCount: 4, // R, G, B, W
    color: '#06b6d4',
    tags: ['led', 'cyclorama'],
    stagePosition: { x: -60, y: 20, z: 95, panAngle: 10, tiltAngle: 45, beamAngle: 50 },
    channels: [0, 210, 255, 30],
  },
  {
    id: 'fix-8',
    name: 'Lyre Spot 1 Cour (Balayage & Poursuite)',
    type: 'moving_head',
    universe: 1,
    startChannel: 30,
    channelCount: 8, // Dimmer, Shutter, Pan, Tilt, R, G, B, Gobo
    color: '#38bdf8',
    tags: ['lyre', 'mouvement'],
    stagePosition: { x: 50, y: 80, z: 40, panAngle: -35, tiltAngle: -45, beamAngle: 15 },
    channels: [220, 255, 128, 90, 80, 180, 255, 0],
  },
  {
    id: 'fix-9',
    name: 'Lyre Spot 2 Jardin (Tempête & Éclairs)',
    type: 'moving_head',
    universe: 1,
    startChannel: 38,
    channelCount: 8,
    color: '#38bdf8',
    tags: ['lyre', 'mouvement'],
    stagePosition: { x: -50, y: 80, z: 40, panAngle: 35, tiltAngle: -45, beamAngle: 15 },
    channels: [220, 255, 128, 90, 80, 180, 255, 0],
  },
  {
    id: 'fix-10',
    name: 'Stroboscope Tempête Scénique',
    type: 'strobe',
    universe: 1,
    startChannel: 50,
    channelCount: 2, // Vitesse, Intensité
    color: '#ffffff',
    tags: ['effet', 'strobe'],
    stagePosition: { x: 0, y: 90, z: 30, panAngle: 0, tiltAngle: -70, beamAngle: 60 },
    channels: [0, 0],
  },
  {
    id: 'fix-11',
    name: 'Machine à Brouillard / Hazer',
    type: 'hazer',
    universe: 1,
    startChannel: 55,
    channelCount: 2, // Pompe (fumée), Ventilateur
    color: '#94a3b8',
    tags: ['effet', 'hazer'],
    stagePosition: { x: -70, y: 5, z: 80, panAngle: 45, tiltAngle: 10, beamAngle: 90 },
    channels: [90, 150],
  },
];

const INITIAL_SUBMASTERS: DmxSubmaster[] = [
  { id: 'sub-1', name: 'Face Traditionnelle', value: 200, fixtureIds: ['fix-1', 'fix-2'], color: '#fbbf24' },
  { id: 'sub-2', name: 'Douche Maxime Soliste', value: 220, fixtureIds: ['fix-3'], color: '#d7b86a' },
  { id: 'sub-3', name: 'Cyclorama Couleurs', value: 240, fixtureIds: ['fix-5', 'fix-6', 'fix-7'], color: '#818cf8' },
  { id: 'sub-4', name: 'Lyres Motorisées', value: 210, fixtureIds: ['fix-8', 'fix-9'], color: '#38bdf8' },
  { id: 'sub-5', name: 'Effets Tempête & Brume', value: 120, fixtureIds: ['fix-10', 'fix-11'], color: '#cbd5e1' },
];

const INITIAL_CUES: DmxLightCue[] = [
  {
    id: 'cue-dmx-01',
    name: 'Q1 — Plein Feu Accueil Public',
    sceneTitle: 'Entrée des spectateurs & mise en place',
    fadeInSec: 3.5,
    fadeOutSec: 3.0,
    color: '#fbbf24',
    fixtureValues: {
      'fix-1': [220],
      'fix-2': [220],
      'fix-3': [100],
      'fix-4': [180],
      'fix-5': [200, 120, 40, 50],
      'fix-6': [200, 120, 40, 50],
      'fix-7': [200, 120, 40, 50],
      'fix-8': [0, 0, 128, 128, 0, 0, 0, 0],
      'fix-9': [0, 0, 128, 128, 0, 0, 0, 0],
      'fix-10': [0, 0],
      'fix-11': [30, 80],
    },
    notes: 'Lumière chaleureuse de bienvenue, salle éclairée.',
  },
  {
    id: 'cue-dmx-02',
    name: 'Q2 — Pénombre & Radio Pirate ON AIR',
    sceneTitle: 'Bascule dans l’univers radio clandestine',
    fadeInSec: 2.0,
    fadeOutSec: 2.0,
    color: '#ef4444',
    fixtureValues: {
      'fix-1': [30],
      'fix-2': [30],
      'fix-3': [190],
      'fix-4': [20],
      'fix-5': [180, 20, 40, 0],
      'fix-6': [140, 10, 80, 0],
      'fix-7': [180, 20, 40, 0],
      'fix-8': [160, 255, 110, 80, 255, 40, 20, 0],
      'fix-9': [160, 255, 146, 80, 255, 40, 20, 0],
      'fix-10': [0, 0],
      'fix-11': [80, 150],
    },
    notes: 'Atmosphère intimiste, voyant ON AIR rouge sur le plateau.',
  },
  {
    id: 'cue-dmx-03',
    name: 'Q3 — Douche Maxime & Tricorne Pirate',
    sceneTitle: 'Monologue du capitaine à Jardin',
    fadeInSec: 1.5,
    fadeOutSec: 2.0,
    color: '#d7b86a',
    fixtureValues: {
      'fix-1': [0],
      'fix-2': [0],
      'fix-3': [255],
      'fix-4': [30],
      'fix-5': [0, 0, 20, 0],
      'fix-6': [0, 0, 20, 0],
      'fix-7': [0, 0, 20, 0],
      'fix-8': [0, 0, 128, 128, 0, 0, 0, 0],
      'fix-9': [0, 0, 128, 128, 0, 0, 0, 0],
      'fix-10': [0, 0],
      'fix-11': [120, 160],
    },
    notes: 'Ombre découpée nette sur le comédien.',
  },
  {
    id: 'cue-dmx-04',
    name: 'Q4 — Les Limbes & Brume Violette',
    sceneTitle: 'Traversée du rideau de fils (p. 23)',
    fadeInSec: 4.0,
    fadeOutSec: 3.0,
    color: '#9333ea',
    fixtureValues: {
      'fix-1': [20],
      'fix-2': [20],
      'fix-3': [0],
      'fix-4': [60],
      'fix-5': [120, 0, 240, 10],
      'fix-6': [180, 10, 255, 0],
      'fix-7': [120, 0, 240, 10],
      'fix-8': [180, 255, 90, 70, 140, 0, 255, 1],
      'fix-9': [180, 255, 166, 70, 140, 0, 255, 1],
      'fix-10': [0, 0],
      'fix-11': [180, 220],
    },
    notes: 'Brouillard lourd et teinte pourpre hypnotique.',
  },
  {
    id: 'cue-dmx-05',
    name: 'Q5 — Tempête & Éclairs Stroboscopiques',
    sceneTitle: 'Naufrage du Hollow Bones (p. 31)',
    fadeInSec: 0.2,
    fadeOutSec: 1.0,
    color: '#38bdf8',
    fixtureValues: {
      'fix-1': [0],
      'fix-2': [0],
      'fix-3': [0],
      'fix-4': [0],
      'fix-5': [0, 20, 220, 0],
      'fix-6': [0, 10, 180, 0],
      'fix-7': [0, 20, 220, 0],
      'fix-8': [255, 255, 60, 40, 255, 255, 255, 0],
      'fix-9': [255, 255, 196, 40, 255, 255, 255, 0],
      'fix-10': [240, 255],
      'fix-11': [220, 255],
    },
    notes: 'Flashs violents et lyres balayant le public.',
  },
  {
    id: 'cue-dmx-06',
    name: 'Q6 — Nuit Marine Phosphorescente',
    sceneTitle: 'Apaisement & Houle bioluminescente (p. 35)',
    fadeInSec: 5.0,
    fadeOutSec: 4.0,
    color: '#06b6d4',
    fixtureValues: {
      'fix-1': [0],
      'fix-2': [0],
      'fix-3': [0],
      'fix-4': [40],
      'fix-5': [0, 220, 255, 20],
      'fix-6': [0, 180, 240, 40],
      'fix-7': [0, 240, 255, 20],
      'fix-8': [140, 255, 128, 50, 0, 240, 255, 2],
      'fix-9': [140, 255, 128, 50, 0, 240, 255, 2],
      'fix-10': [0, 0],
      'fix-11': [100, 120],
    },
    notes: 'Lumière sous-marine ondulante et calme.',
  },
  {
    id: 'cue-dmx-07',
    name: 'Q7 — Blackout de Sécurité Plateau',
    sceneTitle: 'Extinction totale d’urgence',
    fadeInSec: 0.1,
    fadeOutSec: 0.1,
    color: '#64748b',
    fixtureValues: {
      'fix-1': [0],
      'fix-2': [0],
      'fix-3': [0],
      'fix-4': [0],
      'fix-5': [0, 0, 0, 0],
      'fix-6': [0, 0, 0, 0],
      'fix-7': [0, 0, 0, 0],
      'fix-8': [0, 0, 128, 128, 0, 0, 0, 0],
      'fix-9': [0, 0, 128, 128, 0, 0, 0, 0],
      'fix-10': [0, 0],
      'fix-11': [0, 0],
    },
    notes: 'Arrêt de tous les faisceaux.',
  },
];

const INITIAL_FX_GENERATORS: DmxFxGenerator[] = [
  {
    id: 'fx-flame',
    name: 'Vacillement Flammes / Bougie',
    type: 'flame',
    enabled: false,
    speed: 1.2,
    intensity: 0.35,
    targetFixtureIds: ['fix-1', 'fix-2', 'fix-3'],
  },
  {
    id: 'fx-ocean',
    name: 'Respiration Océanique',
    type: 'ocean_breathe',
    enabled: false,
    speed: 0.8,
    intensity: 0.45,
    targetFixtureIds: ['fix-5', 'fix-6', 'fix-7'],
  },
  {
    id: 'fx-storm',
    name: 'Éclairs Aléatoires',
    type: 'lightning_storm',
    enabled: false,
    speed: 2.0,
    intensity: 0.8,
    targetFixtureIds: ['fix-10', 'fix-8', 'fix-9'],
  },
  {
    id: 'fx-audio',
    name: 'Impulsion Sonore (Audio-Réactif)',
    type: 'audio_reactive',
    enabled: false,
    speed: 1.0,
    intensity: 0.6,
    targetFixtureIds: ['fix-3', 'fix-6'],
  },
  {
    id: 'fx-chase',
    name: 'Chenillard Cyclorama',
    type: 'pixel_chase',
    enabled: false,
    speed: 1.5,
    intensity: 0.7,
    targetFixtureIds: ['fix-5', 'fix-6', 'fix-7'],
  },
];

export class DmxLightingEngine {
  private static instance: DmxLightingEngine;

  // Universes physiques (512 canaux par univers, 4 univers = 2048 canaux)
  private universes: Uint8Array[] = [
    new Uint8Array(512),
    new Uint8Array(512),
    new Uint8Array(512),
    new Uint8Array(512),
  ];

  // Tampon de travail pour le mode Silent / Blind Edition
  private blindUniverses: Uint8Array[] = [
    new Uint8Array(512),
    new Uint8Array(512),
    new Uint8Array(512),
    new Uint8Array(512),
  ];

  private fixtures: DmxFixture[] = [...INITIAL_FIXTURES];
  private submasters: DmxSubmaster[] = [...INITIAL_SUBMASTERS];
  private cues: DmxLightCue[] = [...INITIAL_CUES];
  private fxGenerators: DmxFxGenerator[] = [...INITIAL_FX_GENERATORS];

  private state: DmxEngineState = {
    protocol: 'simulation',
    universesCount: 4,
    activeUniverse: 1,
    grandMaster: 255,
    blackout: false,
    blindMode: false,
    connectedUsbDevice: null,
    artnetIp: '2.0.0.100',
    sacnPriority: 100,
    isTransmitting: true,
    fps: 44, // 44 Hz standard DMX512
    lastPacketTime: Date.now(),
  };

  // Crossfade Transition State
  private isCrossfading = false;
  private crossfadeProgress = 1.0;
  private crossfadeDurationSec = 2.0;
  private crossfadeStartTime = 0;
  private crossfadeStartBuffer: Record<string, number[]> = {};
  private crossfadeTargetBuffer: Record<string, number[]> = {};
  private activeCueId: string | null = 'cue-dmx-01';

  // Listeners pour l'UI React
  private listeners: Array<() => void> = [];

  // Ticker pour l'animation DMX (44 Hz)
  private animationTimer: any = null;
  private fxPhase = 0;

  private constructor() {
    this.initFromLocalStorage();
    this.applyAllFixturesToUniverses();
    this.startDmxTicker();

    // Raccordement à la passerelle Millumin & OSC
    livePerformanceBridge.subscribe((telemetry, history) => {
      const lastIn = history[history.length - 1];
      if (lastIn && lastIn.direction === 'in') {
        if (lastIn.address.startsWith('/millumin/dmx/')) {
          this.handleMilluminInboundDmx(lastIn.address, lastIn.args);
        } else if (lastIn.address === '/millumin/cue/go') {
          this.fireNextCue();
        }
      }
    });

    // Raccordement à l'audio temps réel pour les effets audio-réactifs
    radioAudioEngine.onLevels((levels) => {
      if (this.fxGenerators.find((f) => f.type === 'audio_reactive' && f.enabled)) {
        this.applyAudioReactiveFx(levels.leftPeak);
      }
    });
  }

  public static getInstance(): DmxLightingEngine {
    if (!DmxLightingEngine.instance) {
      DmxLightingEngine.instance = new DmxLightingEngine();
    }
    return DmxLightingEngine.instance;
  }

  private initFromLocalStorage() {
    try {
      const savedFixtures = localStorage.getItem('nocode_dmx_fixtures');
      if (savedFixtures) this.fixtures = JSON.parse(savedFixtures);

      const savedSubmasters = localStorage.getItem('nocode_dmx_submasters');
      if (savedSubmasters) this.submasters = JSON.parse(savedSubmasters);

      const savedCues = localStorage.getItem('nocode_dmx_cues');
      if (savedCues) this.cues = JSON.parse(savedCues);
    } catch {
      // Keep defaults
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem('nocode_dmx_fixtures', JSON.stringify(this.fixtures));
      localStorage.setItem('nocode_dmx_submasters', JSON.stringify(this.submasters));
      localStorage.setItem('nocode_dmx_cues', JSON.stringify(this.cues));
    } catch {
      // quota
    }
  }

  private startDmxTicker() {
    if (this.animationTimer) clearInterval(this.animationTimer);
    this.animationTimer = setInterval(() => {
      this.tickDmxFrame();
    }, 23); // ~44 Hz (23ms per frame)
  }

  private tickDmxFrame() {
    this.fxPhase += 0.05;

    // Mise à jour du crossfade si en cours
    if (this.isCrossfading) {
      const elapsed = (Date.now() - this.crossfadeStartTime) / 1000;
      const progress = Math.min(1.0, elapsed / Math.max(0.05, this.crossfadeDurationSec));
      this.crossfadeProgress = progress;

      // Interpolation linéaire entre départ et cible
      for (const fix of this.fixtures) {
        const startVals = this.crossfadeStartBuffer[fix.id] || fix.channels;
        const targetVals = this.crossfadeTargetBuffer[fix.id] || fix.channels;
        const currentVals = fix.channels.map((_, idx) => {
          const s = startVals[idx] ?? 0;
          const t = targetVals[idx] ?? 0;
          return Math.round(s + (t - s) * progress);
        });
        fix.channels = currentVals;
      }

      if (progress >= 1.0) {
        this.isCrossfading = false;
      }
    }

    // Calcul des effets génératifs actifs
    this.applyFxGenerators();

    // Application dans les univers DMX
    this.applyAllFixturesToUniverses();

    // Transmission selon le protocole actif
    this.transmitDmxFrame();

    this.state.lastPacketTime = Date.now();
    this.notify();
  }

  private applyFxGenerators() {
    for (const fx of this.fxGenerators) {
      if (!fx.enabled) continue;

      if (fx.type === 'flame') {
        const flicker = Math.sin(this.fxPhase * fx.speed * 8) * 0.4 + Math.cos(this.fxPhase * fx.speed * 13) * 0.6;
        const mod = (flicker * 0.5 + 0.5) * (fx.intensity * 60);
        for (const fixId of fx.targetFixtureIds) {
          const fix = this.fixtures.find((f) => f.id === fixId);
          if (fix && fix.channels.length > 0) {
            fix.channels[0] = Math.max(0, Math.min(255, Math.round(fix.channels[0] + (mod - 15))));
          }
        }
      } else if (fx.type === 'ocean_breathe') {
        const wave = (Math.sin(this.fxPhase * fx.speed) * 0.5 + 0.5) * fx.intensity;
        for (const fixId of fx.targetFixtureIds) {
          const fix = this.fixtures.find((f) => f.id === fixId);
          if (fix && fix.type === 'rgbw_par' && fix.channels.length >= 3) {
            fix.channels[1] = Math.round(180 + wave * 75); // Vert/Cyan
            fix.channels[2] = Math.round(200 + wave * 55); // Bleu
          }
        }
      } else if (fx.type === 'lightning_storm') {
        const isStrike = Math.random() < 0.04 * fx.speed;
        for (const fixId of fx.targetFixtureIds) {
          const fix = this.fixtures.find((f) => f.id === fixId);
          if (fix) {
            if (fix.type === 'strobe') {
              fix.channels[1] = isStrike ? Math.round(255 * fx.intensity) : 0;
            } else if (fix.channels.length > 0) {
              if (isStrike) fix.channels[0] = 255;
            }
          }
        }
      } else if (fx.type === 'pixel_chase') {
        const step = Math.floor((this.fxPhase * fx.speed * 3) % fx.targetFixtureIds.length);
        fx.targetFixtureIds.forEach((fixId, idx) => {
          const fix = this.fixtures.find((f) => f.id === fixId);
          if (fix && fix.channels.length > 0) {
            fix.channels[0] = idx === step ? Math.round(255 * fx.intensity) : 20;
          }
        });
      }
    }
  }

  private applyAudioReactiveFx(rms: number) {
    const fx = this.fxGenerators.find((f) => f.type === 'audio_reactive' && f.enabled);
    if (!fx) return;
    const bump = Math.round(rms * 255 * fx.intensity);
    for (const fixId of fx.targetFixtureIds) {
      const fix = this.fixtures.find((f) => f.id === fixId);
      if (fix && fix.channels.length > 0) {
        fix.channels[0] = Math.min(255, fix.channels[0] + bump);
      }
    }
  }

  private applyAllFixturesToUniverses() {
    const gmFactor = this.state.blackout ? 0 : this.state.grandMaster / 255;

    // Reset current active universe buffer
    for (let u = 0; u < this.state.universesCount; u++) {
      this.universes[u].fill(0);
    }

    for (const fix of this.fixtures) {
      const uIdx = Math.max(0, Math.min(this.state.universesCount - 1, fix.universe - 1));
      const targetUni = this.state.blindMode ? this.blindUniverses[uIdx] : this.universes[uIdx];

      for (let c = 0; c < fix.channelCount; c++) {
        const dmxChanIndex = fix.startChannel - 1 + c;
        if (dmxChanIndex >= 0 && dmxChanIndex < 512) {
          let rawVal = fix.channels[c] ?? 0;
          // Apply Grand Master on dimmer / intensity channels
          const isDimmerOrMaster =
            fix.type === 'dimmer' ||
            (fix.type === 'moving_head' && c === 0) ||
            (fix.type === 'strobe' && c === 1);

          if (isDimmerOrMaster) {
            rawVal = Math.round(rawVal * gmFactor);
          } else if (this.state.blackout) {
            rawVal = 0;
          }
          targetUni[dmxChanIndex] = rawVal;
        }
      }
    }
  }

  private transmitDmxFrame() {
    if (!this.state.isTransmitting) return;

    if (this.state.protocol === 'millumin_bridge') {
      // Synchronisation vers Millumin via OSC
      const activeUni = this.universes[this.state.activeUniverse - 1];
      livePerformanceBridge.sendOSC('/millumin/dmx/universe', [
        this.state.activeUniverse,
        activeUni[0] || 0,
        activeUni[1] || 0,
        activeUni[2] || 0,
        this.state.grandMaster,
      ]);
    } else if (this.state.protocol === 'artnet') {
      // Simulation ArtDMX packet ou broadcast IP
      // En environnement web, relayé via loopback WebSocket sur port Art-Net
    }
  }

  private handleMilluminInboundDmx(address: string, args: any[]) {
    // Reçoit /millumin/dmx/dimmer channel value
    if (args && args.length >= 2) {
      const channel = Number(args[0]);
      const value = Number(args[1]);
      this.setChannel(1, channel, value);
    }
  }

  // --- API PUBLIQUE POUR L'INTERFACE ET LES MODULES ---

  public getState(): DmxEngineState {
    return { ...this.state };
  }

  public getFixtures(): DmxFixture[] {
    return this.fixtures;
  }

  public getSubmasters(): DmxSubmaster[] {
    return this.submasters;
  }

  public getCues(): DmxLightCue[] {
    return this.cues;
  }

  public getFxGenerators(): DmxFxGenerator[] {
    return this.fxGenerators;
  }

  public getActiveCueId(): string | null {
    return this.activeCueId;
  }

  public getCrossfadeProgress(): { isCrossfading: boolean; progress: number } {
    return {
      isCrossfading: this.isCrossfading,
      progress: this.crossfadeProgress,
    };
  }

  public getDmxUniverse(universeNumber: number = 1): Uint8Array {
    const idx = Math.max(0, Math.min(3, universeNumber - 1));
    return this.state.blindMode ? this.blindUniverses[idx] : this.universes[idx];
  }

  public setProtocol(protocol: DmxProtocol) {
    this.state.protocol = protocol;
    this.notify();
  }

  public setGrandMaster(value: number) {
    this.state.grandMaster = Math.max(0, Math.min(255, Math.round(value)));
    this.notify();
  }

  public toggleBlackout() {
    this.state.blackout = !this.state.blackout;
    this.notify();
  }

  public toggleBlindMode() {
    this.state.blindMode = !this.state.blindMode;
    if (this.state.blindMode) {
      // Cloner l'état actuel dans le tampon blind
      for (let u = 0; u < 4; u++) {
        this.blindUniverses[u].set(this.universes[u]);
      }
    }
    this.notify();
  }

  public takeBlindToLive() {
    // Transférer le travail de préparation silencieuse vers le plateau
    for (let u = 0; u < 4; u++) {
      this.universes[u].set(this.blindUniverses[u]);
    }
    this.state.blindMode = false;
    this.notify();
  }

  public setChannel(universe: number, channel: number, value: number, isBlind: boolean = false) {
    const uIdx = Math.max(0, Math.min(3, universe - 1));
    const chIdx = Math.max(0, Math.min(511, channel - 1));
    const val = Math.max(0, Math.min(255, Math.round(value)));

    if (isBlind || this.state.blindMode) {
      this.blindUniverses[uIdx][chIdx] = val;
    } else {
      this.universes[uIdx][chIdx] = val;
    }

    // Trouver le fixture correspondant pour garder l'état synchronisé
    const fix = this.fixtures.find(
      (f) => f.universe === universe && channel >= f.startChannel && channel < f.startChannel + f.channelCount
    );
    if (fix) {
      const offset = channel - fix.startChannel;
      fix.channels[offset] = val;
    }
    this.notify();
  }

  public setFixtureChannels(fixtureId: string, values: number[]) {
    const fix = this.fixtures.find((f) => f.id === fixtureId);
    if (fix) {
      fix.channels = values.map((v) => Math.max(0, Math.min(255, Math.round(v))));
      this.notify();
    }
  }

  public setSubmasterValue(submasterId: string, value: number) {
    const sub = this.submasters.find((s) => s.id === submasterId);
    if (!sub) return;
    sub.value = Math.max(0, Math.min(255, Math.round(value)));

    // Appliquer proportionnellement aux projecteurs cibles
    for (const fixId of sub.fixtureIds) {
      const fix = this.fixtures.find((f) => f.id === fixId);
      if (fix && fix.channels.length > 0) {
        fix.channels[0] = sub.value;
      }
    }
    this.notify();
  }

  public fireLightCue(cueId: string, fadeOverrideSec?: number): boolean {
    const cue = this.cues.find((c) => c.id === cueId);
    if (!cue) return false;

    this.activeCueId = cue.id;
    this.isCrossfading = true;
    this.crossfadeProgress = 0.0;
    this.crossfadeDurationSec = fadeOverrideSec ?? cue.fadeInSec;
    this.crossfadeStartTime = Date.now();

    // Enregistrer le départ
    this.crossfadeStartBuffer = {};
    for (const fix of this.fixtures) {
      this.crossfadeStartBuffer[fix.id] = [...fix.channels];
    }

    // Définir la cible
    this.crossfadeTargetBuffer = { ...cue.fixtureValues };

    this.notify();
    return true;
  }

  public fireNextCue(): boolean {
    const currentIndex = this.cues.findIndex((c) => c.id === this.activeCueId);
    const nextIndex = (currentIndex + 1) % this.cues.length;
    return this.fireLightCue(this.cues[nextIndex].id);
  }

  public firePrevCue(): boolean {
    const currentIndex = this.cues.findIndex((c) => c.id === this.activeCueId);
    const prevIndex = (currentIndex - 1 + this.cues.length) % this.cues.length;
    return this.fireLightCue(this.cues[prevIndex].id);
  }

  public createLightCueFromLive(name: string, sceneTitle: string, fadeInSec: number = 2.0, fadeOutSec: number = 2.0): DmxLightCue {
    const snapshot: Record<string, number[]> = {};
    for (const fix of this.fixtures) {
      snapshot[fix.id] = [...fix.channels];
    }

    const newCue: DmxLightCue = {
      id: `cue-dmx-${Date.now()}`,
      name,
      sceneTitle,
      fadeInSec,
      fadeOutSec,
      fixtureValues: snapshot,
      color: '#38bdf8',
    };

    this.cues.push(newCue);
    this.saveToLocalStorage();
    this.notify();
    return newCue;
  }

  public addFixture(fixture: DmxFixture) {
    this.fixtures.push(fixture);
    this.saveToLocalStorage();
    this.notify();
  }

  public deleteFixture(fixtureId: string) {
    this.fixtures = this.fixtures.filter((f) => f.id !== fixtureId);
    this.saveToLocalStorage();
    this.notify();
  }

  public toggleFxGenerator(fxId: string) {
    const fx = this.fxGenerators.find((f) => f.id === fxId);
    if (fx) {
      fx.enabled = !fx.enabled;
      this.notify();
    }
  }

  public setFxIntensity(fxId: string, intensity: number) {
    const fx = this.fxGenerators.find((f) => f.id === fxId);
    if (fx) {
      fx.intensity = Math.max(0, Math.min(1, intensity));
      this.notify();
    }
  }

  public setFxSpeed(fxId: string, speed: number) {
    const fx = this.fxGenerators.find((f) => f.id === fxId);
    if (fx) {
      fx.speed = Math.max(0.1, Math.min(5.0, speed));
      this.notify();
    }
  }

  public connectUsbDmx(deviceName: string = 'Enttec DMX USB Pro') {
    this.state.connectedUsbDevice = deviceName;
    this.state.protocol = 'usb_dmx';
    this.notify();
  }

  public disconnectUsbDmx() {
    this.state.connectedUsbDevice = null;
    this.state.protocol = 'simulation';
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        // ignore
      }
    }
  }
}

export const dmxLightingEngine = DmxLightingEngine.getInstance();
