// Moteur de Synchronisation Timecode Professionnel (SMPTE LTC / MTC / Art-Net)
// No[co]de Vibe Designer — Horloge Maître & Esclave, Verrouillage Trame & Jam Sync

import {
  TimecodeFps,
  TimecodeSource,
  TimecodeTime,
  TimecodeTriggerCue,
  TimecodeEngineState,
} from '../types/timecodeSync';
import { qlabCueEngine } from './qlabCueEngine';
import { dmxLightingEngine } from './dmxLightingEngine';
import { surtitrageEngine } from './surtitrageEngine';

export class TimecodeSyncEngine {
  private static instance: TimecodeSyncEngine;

  private state: TimecodeEngineState = {
    source: 'internal_master',
    fps: 25, // Standard EBU / Théâtre & Spectacle Vivant Europe
    isDropFrame: false,
    isPlaying: false,
    isLocked: true,
    isFreewheeling: false,
    freewheelFramesMax: 5,
    freewheelFramesCurrent: 0,
    currentTime: {
      hours: 0,
      minutes: 0,
      seconds: 0,
      frames: 0,
      subframes: 0,
      totalSeconds: 0,
      totalFrames: 0,
      formatted: '00:00:00:00',
    },
    offsetSeconds: 0,
    jamSyncEnabled: true,
    audioLtcVolume: 0.0,
  };

  private triggerCues: TimecodeTriggerCue[] = [
    {
      id: 'tc-trig-1',
      name: 'Ouverture du Rideau & Mer Phosphorescente',
      qNumber: 'Q-01',
      targetType: 'qlab_cue',
      targetId: 'cue-q1',
      triggerTimeFormatted: '00:00:05:00',
      triggerTotalFrames: 125, // 5s * 25 fps
      isFired: false,
      color: '#38bdf8',
    },
    {
      id: 'tc-trig-2',
      name: 'Plein Feu Ambré Scène (ETC Eos)',
      qNumber: 'Q-L1',
      targetType: 'dmx_cue',
      targetId: 'cue-dmx-01',
      triggerTimeFormatted: '00:00:15:12',
      triggerTotalFrames: 387,
      isFired: false,
      color: '#fbbf24',
    },
    {
      id: 'tc-trig-3',
      name: 'Entrée Soliste Maxime & Surtitre Français',
      qNumber: 'Q-03',
      targetType: 'surtitre',
      targetId: 'sur-1',
      triggerTimeFormatted: '00:01:10:00',
      triggerTotalFrames: 1750,
      isFired: false,
      color: '#8fa79d',
    },
    {
      id: 'tc-trig-4',
      name: 'Abordage Pirate & Éclairs Stroboscopiques',
      qNumber: 'Q-L3',
      targetType: 'dmx_cue',
      targetId: 'cue-dmx-03',
      triggerTimeFormatted: '00:02:30:00',
      triggerTotalFrames: 3750,
      isFired: false,
      color: '#ef4444',
    },
  ];

  private listeners: (() => void)[] = [];
  private clockTimer: any = null;
  private lastTickTimestamp: number = 0;

  // Générateur Audio LTC (Web Audio API)
  private audioContext: AudioContext | null = null;
  private ltcOscillator: OscillatorNode | null = null;
  private ltcGainNode: GainNode | null = null;

  private constructor() {
    this.updateFormattedTime();
  }

  public static getInstance(): TimecodeSyncEngine {
    if (!TimecodeSyncEngine.instance) {
      TimecodeSyncEngine.instance = new TimecodeSyncEngine();
    }
    return TimecodeSyncEngine.instance;
  }

  public getState(): TimecodeEngineState {
    return { ...this.state };
  }

  public getTriggerCues(): TimecodeTriggerCue[] {
    return this.triggerCues;
  }

  // =========================================================================
  // GESTION DU TEMPS ET CONVERSIONS (FRAMES <-> SECONDES <-> FORMAT)
  // =========================================================================

  private framesToTimecode(totalFrames: number, fps: TimecodeFps): TimecodeTime {
    const safeFrames = Math.max(0, Math.floor(totalFrames));
    const f = Math.floor(safeFrames % fps);
    const totalSec = Math.floor(safeFrames / fps);
    const s = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const m = totalMin % 60;
    const h = Math.floor(totalMin / 60) % 24;

    const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
    const totalSeconds = safeFrames / fps;

    return {
      hours: h,
      minutes: m,
      seconds: s,
      frames: f,
      subframes: 0,
      totalSeconds,
      totalFrames: safeFrames,
      formatted,
    };
  }

  private timecodeStringToFrames(tcStr: string, fps: TimecodeFps): number {
    const parts = tcStr.split(':').map((p) => parseInt(p, 10) || 0);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    const f = parts[3] || 0;
    return (h * 3600 + m * 60 + s) * fps + f;
  }

  private updateFormattedTime() {
    this.state.currentTime = this.framesToTimecode(this.state.currentTime.totalFrames, this.state.fps);
  }

  // =========================================================================
  // COMMANDES DE TRANSPORT (PLAY, PAUSE, STOP, JOG, SCRUB)
  // =========================================================================

  public play() {
    if (this.state.isPlaying) return;
    this.state.isPlaying = true;
    this.lastTickTimestamp = performance.now();

    const frameIntervalMs = 1000 / this.state.fps;
    this.clockTimer = setInterval(() => {
      this.tick();
    }, frameIntervalMs);

    this.notify();
  }

  public pause() {
    this.state.isPlaying = false;
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    this.notify();
  }

  public stop() {
    this.pause();
    this.seekFrames(0);
    // Réarmer toutes les cues timecode
    for (const cue of this.triggerCues) {
      cue.isFired = false;
    }
    this.notify();
  }

  public seek(seconds: number) {
    const targetFrames = Math.round(seconds * this.state.fps);
    this.seekFrames(targetFrames);
  }

  public seekFrames(frames: number) {
    this.state.currentTime.totalFrames = Math.max(0, frames);
    this.updateFormattedTime();

    // Mettre à jour l'état armé des cues par rapport au curseur
    for (const cue of this.triggerCues) {
      cue.isFired = cue.triggerTotalFrames <= this.state.currentTime.totalFrames;
    }

    this.notify();
  }

  public stepForward(framesCount: number = 1) {
    this.seekFrames(this.state.currentTime.totalFrames + framesCount);
  }

  public stepBackward(framesCount: number = 1) {
    this.seekFrames(this.state.currentTime.totalFrames - framesCount);
  }

  public setFps(fps: TimecodeFps) {
    const currentSec = this.state.currentTime.totalSeconds;
    this.state.fps = fps;
    this.seek(currentSec);

    // Recalculer les frames de déclenchement des cues
    for (const cue of this.triggerCues) {
      cue.triggerTotalFrames = this.timecodeStringToFrames(cue.triggerTimeFormatted, fps);
    }

    if (this.state.isPlaying) {
      this.pause();
      this.play();
    }
    this.notify();
  }

  public setSource(source: TimecodeSource) {
    this.state.source = source;
    if (source === 'internal_master') {
      this.state.isLocked = true;
      this.state.isFreewheeling = false;
    } else {
      // Simulation verrouillage signal entrant
      this.state.isLocked = true;
    }
    this.notify();
  }

  // =========================================================================
  // CADENCE HORLOGE & DÉCLENCHEMENT DES CUES EN TEMPS RÉEL
  // =========================================================================

  private tick() {
    const currentFrames = this.state.currentTime.totalFrames + 1;
    this.state.currentTime.totalFrames = currentFrames;
    this.updateFormattedTime();

    // Vérifier les déclencheurs de Cues associés
    for (const cue of this.triggerCues) {
      if (!cue.isFired && currentFrames >= cue.triggerTotalFrames) {
        cue.isFired = true;
        this.executeTriggerCue(cue);
      }
    }

    this.notify();
  }

  private executeTriggerCue(cue: TimecodeTriggerCue) {
    console.log(`[Timecode Sync] Déclenchement automatique de la cue ${cue.qNumber} @ ${cue.triggerTimeFormatted}`);

    if (cue.targetType === 'qlab_cue') {
      qlabCueEngine.fireGo();
    } else if (cue.targetType === 'dmx_cue') {
      dmxLightingEngine.fireLightCue(cue.targetId);
    } else if (cue.targetType === 'surtitre') {
      // Afficher surtitre actif
      surtitrageEngine.goNext();
    }

    // Émettre un événement global pour l'interface
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nocode_timecode_cue_fired', {
          detail: { cueId: cue.id, qNumber: cue.qNumber, formatted: cue.triggerTimeFormatted },
        })
      );
    }
  }

  // =========================================================================
  // GESTION DES CUES TIMECODE (AJOUT, SUPPRESSION, ÉDITION)
  // =========================================================================

  public addTriggerCue(name: string, qNumber: string, targetType: TimecodeTriggerCue['targetType'], timeStr: string, color: string = '#38bdf8') {
    const triggerTotalFrames = this.timecodeStringToFrames(timeStr, this.state.fps);
    const newCue: TimecodeTriggerCue = {
      id: `tc-${Date.now().toString(36)}`,
      name,
      qNumber,
      targetType,
      targetId: 'auto',
      triggerTimeFormatted: timeStr,
      triggerTotalFrames,
      isFired: this.state.currentTime.totalFrames >= triggerTotalFrames,
      color,
    };
    this.triggerCues.push(newCue);
    this.triggerCues.sort((a, b) => a.triggerTotalFrames - b.triggerTotalFrames);
    this.notify();
  }

  public deleteTriggerCue(cueId: string) {
    this.triggerCues = this.triggerCues.filter((c) => c.id !== cueId);
    this.notify();
  }

  // =========================================================================
  // GÉNÉRATEUR AUDIBLE DE TEST SMPTE LTC (Web Audio API)
  // =========================================================================

  public toggleAudioLtcGenerator() {
    if (this.state.audioLtcVolume > 0) {
      this.stopAudioLtc();
    } else {
      this.startAudioLtc();
    }
  }

  private startAudioLtc() {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.ltcOscillator = this.audioContext.createOscillator();
      this.ltcGainNode = this.audioContext.createGain();

      // Fréquence centrale biphase mark standard pour SMPTE (1200 Hz / 2400 Hz)
      this.ltcOscillator.type = 'square';
      this.ltcOscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);

      this.ltcGainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);

      this.ltcOscillator.connect(this.ltcGainNode);
      this.ltcGainNode.connect(this.audioContext.destination);

      this.ltcOscillator.start();
      this.state.audioLtcVolume = 0.15;
      this.notify();
    } catch {
      // Audio context error handling
    }
  }

  private stopAudioLtc() {
    if (this.ltcOscillator) {
      try {
        this.ltcOscillator.stop();
        this.ltcOscillator.disconnect();
      } catch {
        // ignore
      }
      this.ltcOscillator = null;
    }
    this.state.audioLtcVolume = 0;
    this.notify();
  }

  // =========================================================================
  // SOUSCRIPTION AUX TICKS TIMECODE
  // =========================================================================

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

export const timecodeSyncEngine = TimecodeSyncEngine.getInstance();
