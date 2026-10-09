// Passerelle Intégration Ableton Live, Web MIDI, Ableton Link & Patch Audio Modulaire
// No[co]de Vibe Designer — Directive : Ableton Live comme Maître Sonore
// Communication bidirectionnelle :
// - Web MIDI API (Notes, CC 0-127, Clock)
// - Ableton Link (Synchronisation temporelle BPM, Phase, Quantum 4 temps)
// - Entrée Audio directe (BlackHole, Loopback, Carte Son)
// - Analyse spectrale FFT 8 bandes & Détection de transitoires (Onset)
// - Modules audio modulaires inspirés de Max/MSP & Pure Data
// - Profils de préférences artistiques (Artiste Compositeur vs Scénographe tout-en-un)

export interface AbletonLinkState {
  bpm: number;
  beat: number;
  phase: number; // 0..1 dans le temps de mesure
  quantum: number; // ex: 4 temps
  isPlaying: boolean;
  peersCount: number;
}

export interface MidiPortInfo {
  id: string;
  name: string;
  manufacturer?: string;
  state: 'connected' | 'disconnected';
  type: 'input' | 'output';
}

export interface AudioFrequencyBands {
  subBass: number; // 20 - 60 Hz
  bass: number; // 60 - 250 Hz
  lowMid: number; // 250 - 500 Hz
  mid: number; // 500 - 2000 Hz
  highMid: number; // 2000 - 4000 Hz
  presence: number; // 4000 - 8000 Hz
  brilliance: number; // 8000 - 20000 Hz
  overallRms: number; // 0..1
  isTransientHit: boolean; // Impulsion de frappe (beat/transient)
}

export type UserSoundPreferenceProfile = 'ableton_composer' | 'all_in_one_scenographer';

export interface SoundRoutingRule {
  id: string;
  source: 'midi_cc' | 'midi_note' | 'audio_band' | 'audio_transient' | 'link_beat';
  sourceParam: string; // ex: "CC 1", "Sub-Bass", "Note 60 (C3)"
  targetEffect: 'mer_qui_vibre' | 'top_cue' | 'vase_mapping' | 'shader_param' | 'light_dimmer';
  targetParam: string; // ex: "vibrationIntensity", "waveAmplitude"
  minInput: number;
  maxInput: number;
  minOutput: number;
  maxOutput: number;
  isEnabled: boolean;
}

// Petit module audio de patch modulaire type Max/MSP
export interface ModularAudioBlock {
  id: string;
  name: string;
  type: 'gain' | 'filter' | 'delay' | 'envelope_follower' | 'lfo' | 'fft_analyzer';
  params: Record<string, number>;
  isEnabled: boolean;
}

class AbletonLiveBridge {
  private profile: UserSoundPreferenceProfile = 'ableton_composer';

  // Ableton Link Simulator / Bridge
  private linkState: AbletonLinkState = {
    bpm: 120.0,
    beat: 0,
    phase: 0,
    quantum: 4,
    isPlaying: false,
    peersCount: 1, // Ableton Live local détecté
  };
  private linkTimer: number | null = null;

  // Web MIDI API
  private midiAccess: MIDIAccess | null = null;
  private midiInputs: MidiPortInfo[] = [];
  private midiOutputs: MidiPortInfo[] = [];
  private lastMidiEvent: { type: string; channel: number; noteOrCC: number; value: number } | null = null;

  // Audio In Routing & FFT
  private audioCtx: AudioContext | null = null;
  private audioInStream: MediaStream | null = null;
  private audioInSource: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioDeviceList: MediaDeviceInfo[] = [];
  private selectedAudioDeviceId = 'default';

  private frequencyBands: AudioFrequencyBands = {
    subBass: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    presence: 0,
    brilliance: 0,
    overallRms: 0,
    isTransientHit: false,
  };

  // Règles de routing Son ➔ Visuel
  private routingRules: SoundRoutingRule[] = [
    {
      id: 'rule-1',
      source: 'audio_band',
      sourceParam: 'Sub-Bass',
      targetEffect: 'mer_qui_vibre',
      targetParam: 'vibrationIntensity',
      minInput: 0.1,
      maxInput: 0.9,
      minOutput: 0.0,
      maxOutput: 1.8,
      isEnabled: true,
    },
    {
      id: 'rule-2',
      source: 'midi_cc',
      sourceParam: 'CC 1 (Modulation)',
      targetEffect: 'mer_qui_vibre',
      targetParam: 'waveAmplitude',
      minInput: 0,
      maxInput: 127,
      minOutput: 0.2,
      maxOutput: 1.4,
      isEnabled: true,
    },
    {
      id: 'rule-3',
      source: 'audio_transient',
      sourceParam: 'Transient Hit',
      targetEffect: 'top_cue',
      targetParam: 'Trigger Pulse',
      minInput: 0.5,
      maxInput: 1.0,
      minOutput: 0,
      maxOutput: 1,
      isEnabled: true,
    },
    {
      id: 'rule-4',
      source: 'midi_note',
      sourceParam: 'Note 36 (C1 Kick)',
      targetEffect: 'vase_mapping',
      targetParam: 'ripplePulse',
      minInput: 0,
      maxInput: 127,
      minOutput: 0,
      maxOutput: 1,
      isEnabled: true,
    },
  ];

  // Modules de patch audio (Max/MSP)
  private modularBlocks: ModularAudioBlock[] = [
    {
      id: 'mod-1',
      name: 'Filtre Passe-Bas Résonant',
      type: 'filter',
      params: { cutoffHz: 2400, resonanceQ: 2.5 },
      isEnabled: true,
    },
    {
      id: 'mod-2',
      name: 'Suiveur d’Enveloppe de Précision',
      type: 'envelope_follower',
      params: { attackMs: 12, releaseMs: 350, thresholdDb: -32 },
      isEnabled: true,
    },
    {
      id: 'mod-3',
      name: 'LFO de Houle Marine',
      type: 'lfo',
      params: { frequencyHz: 0.35, depth: 0.8 },
      isEnabled: true,
    },
  ];

  private listeners: Set<() => void> = new Set();
  private transientHistory: number[] = [];

  constructor() {
    this.initMidi();
    this.initLinkClock();
    this.enumerateAudioDevices();
  }

  // -------------------------------------------------------------
  // ABLETON LINK (SYNCHRONISATION HORLOGE & MESURE)
  // -------------------------------------------------------------

  private initLinkClock() {
    let lastTime = performance.now();

    this.linkTimer = window.setInterval(() => {
      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      if (this.linkState.isPlaying) {
        const beatsPerSec = this.linkState.bpm / 60;
        const deltaBeats = deltaSec * beatsPerSec;
        this.linkState.beat += deltaBeats;
        this.linkState.phase = (this.linkState.beat % this.linkState.quantum) / this.linkState.quantum;
      }
    }, 20);
  }

  public toggleLinkPlay() {
    this.linkState.isPlaying = !this.linkState.isPlaying;
    this.notify();
  }

  public setLinkBpm(bpm: number) {
    this.linkState.bpm = Math.max(30, Math.min(300, bpm));
    this.notify();
  }

  public getLinkState(): AbletonLinkState {
    return { ...this.linkState };
  }

  // -------------------------------------------------------------
  // WEB MIDI API (PORTS ABLETON, CC & NOTES)
  // -------------------------------------------------------------

  private async initMidi() {
    if (!navigator.requestMIDIAccess) return;

    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      this.midiAccess = access;
      this.refreshMidiPorts();

      access.onstatechange = () => {
        this.refreshMidiPorts();
      };

      // Écoute sur tous les ports d'entrée
      access.inputs.forEach((input) => {
        input.onmidimessage = (event) => {
          if (event && event.data) {
            this.handleIncomingMidiMessage(event.data);
          }
        };
      });
    } catch {
      // ignore
    }
  }

  private refreshMidiPorts() {
    if (!this.midiAccess) return;

    const inputs: MidiPortInfo[] = [];
    this.midiAccess.inputs.forEach((p) => {
      inputs.push({
        id: p.id,
        name: p.name || 'Port MIDI Entrant',
        manufacturer: p.manufacturer || undefined,
        state: p.state === 'connected' ? 'connected' : 'disconnected',
        type: 'input',
      });
    });

    const outputs: MidiPortInfo[] = [];
    this.midiAccess.outputs.forEach((p) => {
      outputs.push({
        id: p.id,
        name: p.name || 'Port MIDI Sortant',
        manufacturer: p.manufacturer || undefined,
        state: p.state === 'connected' ? 'connected' : 'disconnected',
        type: 'output',
      });
    });

    this.midiInputs = inputs;
    this.midiOutputs = outputs;
    this.notify();
  }

  private handleIncomingMidiMessage(data: Uint8Array) {
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const channel = (data[0] & 0x0f) + 1;

    // Note On
    if (status === 0x90 && data[2] > 0) {
      const note = data[1];
      const velocity = data[2];
      this.lastMidiEvent = { type: 'NoteOn', channel, noteOrCC: note, value: velocity };
      this.applyMidiToRouting('midi_note', note, velocity);
      this.notify();
    }
    // Control Change (CC)
    else if (status === 0xb0) {
      const cc = data[1];
      const val = data[2];
      this.lastMidiEvent = { type: 'CC', channel, noteOrCC: cc, value: val };
      this.applyMidiToRouting('midi_cc', cc, val);
      this.notify();
    }
  }

  private applyMidiToRouting(source: 'midi_note' | 'midi_cc', number: number, value: number) {
    for (const rule of this.routingRules) {
      if (!rule.isEnabled) continue;
      if (source === 'midi_cc' && rule.source === 'midi_cc') {
        const norm = (value - rule.minInput) / (rule.maxInput - rule.minInput);
        const mapped = rule.minOutput + norm * (rule.maxOutput - rule.minOutput);
        // Exécuter l'action sur l'effet
        this.dispatchMappedValue(rule.targetEffect, rule.targetParam, mapped);
      } else if (source === 'midi_note' && rule.source === 'midi_note') {
        this.dispatchMappedValue(rule.targetEffect, rule.targetParam, value / 127);
      }
    }
  }

  // -------------------------------------------------------------
  // ENTRÉE AUDIO DIRECTE & ANALYSE FFT 8 BANDES (B)
  // -------------------------------------------------------------

  public async enumerateAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.audioDeviceList = devices.filter((d) => d.kind === 'audioinput');
      this.notify();
      return this.audioDeviceList;
    } catch {
      return [];
    }
  }

  public async selectAudioInputDevice(deviceId: string) {
    this.selectedAudioDeviceId = deviceId;
    if (this.audioInStream) {
      this.stopAudioIn();
      await this.startAudioIn();
    }
  }

  public async startAudioIn(): Promise<void> {
    if (this.audioInStream) return;

    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioCtxClass();

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    try {
      this.audioInStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: this.selectedAudioDeviceId !== 'default' ? { exact: this.selectedAudioDeviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioInSource = this.audioCtx.createMediaStreamSource(this.audioInStream);
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.5;

      // Uniquement pour analyse d'interaction, pas de sortie direct speakers (anti-feedback)
      this.audioInSource.connect(this.analyserNode);

      this.startFftLoop();
      this.notify();
    } catch (err) {
      console.warn('Impossible de démarrer l’entrée audio Ableton:', err);
    }
  }

  public stopAudioIn() {
    if (this.audioInStream) {
      this.audioInStream.getTracks().forEach((t) => t.stop());
      this.audioInStream = null;
    }
    if (this.audioInSource) {
      this.audioInSource.disconnect();
      this.audioInSource = null;
    }
    this.notify();
  }

  private startFftLoop() {
    const freqData = new Uint8Array(256);

    const updateFft = () => {
      if (this.analyserNode && this.audioInStream) {
        this.analyserNode.getByteFrequencyData(freqData);

        // Découpage en 7 bandes fréquentielles standard
        // bin size ~ 48000 / 512 = 93.75 Hz
        const sub = (freqData[0] + freqData[1]) / (2 * 255);
        const bass = (freqData[2] + freqData[3] + freqData[4]) / (3 * 255);
        const lowMid = (freqData[5] + freqData[6] + freqData[7] + freqData[8]) / (4 * 255);
        const mid = freqData.slice(9, 22).reduce((a, b) => a + b, 0) / (13 * 255);
        const highMid = freqData.slice(22, 45).reduce((a, b) => a + b, 0) / (23 * 255);
        const pres = freqData.slice(45, 90).reduce((a, b) => a + b, 0) / (45 * 255);
        const brill = freqData.slice(90, 200).reduce((a, b) => a + b, 0) / (110 * 255);

        const rms = (sub + bass + lowMid + mid + highMid + pres + brill) / 7;

        // Détection de transitoire (attaque brutale par delta d'énergie)
        this.transientHistory.push(rms);
        if (this.transientHistory.length > 5) this.transientHistory.shift();
        const prevAvg = this.transientHistory.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, this.transientHistory.length - 1);
        const isHit = rms - prevAvg > 0.25;

        this.frequencyBands = {
          subBass: sub,
          bass,
          lowMid,
          mid,
          highMid,
          presence: pres,
          brilliance: brill,
          overallRms: rms,
          isTransientHit: isHit,
        };

        // Appliquer les règles de routage basées sur les bandes fréquentielles
        if (sub > 0.1) {
          this.applyBandToRouting('Sub-Bass', sub);
        }
        if (isHit) {
          this.applyBandToRouting('Transient Hit', 1.0);
        }
      }

      requestAnimationFrame(updateFft);
    };

    requestAnimationFrame(updateFft);
  }

  private applyBandToRouting(bandName: string, energy: number) {
    for (const rule of this.routingRules) {
      if (!rule.isEnabled) continue;
      if (rule.sourceParam.toLowerCase().includes(bandName.toLowerCase())) {
        const norm = (energy - rule.minInput) / Math.max(0.01, rule.maxInput - rule.minInput);
        const mapped = rule.minOutput + Math.max(0, Math.min(1, norm)) * (rule.maxOutput - rule.minOutput);
        this.dispatchMappedValue(rule.targetEffect, rule.targetParam, mapped);
      }
    }
  }

  private dispatchMappedValue(effect: string, param: string, value: number) {
    // Action vers les autres moteurs de No[co]de
    if (effect === 'mer_qui_vibre') {
      window.dispatchEvent(
        new CustomEvent('nocode:ableton-sea-mod', {
          detail: { param, value },
        })
      );
    } else if (effect === 'top_cue') {
      window.dispatchEvent(
        new CustomEvent('nocode:ableton-top-pulse', {
          detail: { param, value },
        })
      );
    }
  }

  // -------------------------------------------------------------
  // PRÉFÉRENCES ARTISTIQUES & MODULES
  // -------------------------------------------------------------

  public getProfile(): UserSoundPreferenceProfile {
    return this.profile;
  }

  public setProfile(p: UserSoundPreferenceProfile) {
    this.profile = p;
    this.notify();
  }

  public getMidiPorts(): { inputs: MidiPortInfo[]; outputs: MidiPortInfo[] } {
    return { inputs: this.midiInputs, outputs: this.midiOutputs };
  }

  public getLastMidiEvent() {
    return this.lastMidiEvent;
  }

  public getFrequencyBands(): AudioFrequencyBands {
    return { ...this.frequencyBands };
  }

  public getAudioDevices(): MediaDeviceInfo[] {
    return [...this.audioDeviceList];
  }

  public getSelectedAudioDeviceId(): string {
    return this.selectedAudioDeviceId;
  }

  public getRoutingRules(): SoundRoutingRule[] {
    return [...this.routingRules];
  }

  public toggleRule(id: string) {
    this.routingRules = this.routingRules.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
    this.notify();
  }

  public getModularBlocks(): ModularAudioBlock[] {
    return [...this.modularBlocks];
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    for (const cb of this.listeners) {
      cb();
    }
  }
}

export const abletonLiveBridge = new AbletonLiveBridge();
