// Moteur Audio Local Synchrone & Synthétiseur Modulaire pour le Spectacle Vivant
// No[co]de Vibe Designer — Phase 5 : Web Audio API 100% Hors-Ligne & Synchrone
// Synthèse de pas de danse, nappes de plateau, timbres réactifs aux mouvements et signaux TOP

export interface CartAudioLevels {
  left: number; // 0..1 (RMS canal gauche)
  right: number; // 0..1 (RMS canal droit)
  peakL: number; // 0..1 Crête gauche
  peakR: number; // 0..1 Crête droite
  db: number; // dB linéaire (-60 à +3)
  dbString: string; // ex: "-12.4 dB"
  isClipping: boolean;
  isActive: boolean;
}

class ScenicAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private cartBusGain: GainNode | null = null;
  private cartAnalyser: AnalyserNode | null = null;
  private analyserDataArray: Uint8Array | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.7;
  private cartVolume: number = 0.85;
  private isCartMuted: boolean = false;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private lastStepPlayTime: number = 0;
  private activePadGains: Map<string, GainNode> = new Map();

  constructor() {
    // Initialisation paresseuse au premier clic utilisateur (politique autoplay du navigateur)
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Bus de mixage dédié pour le Cartoucheur Cue Cart (permet le contrôle global en direct)
      this.cartBusGain = this.ctx.createGain();
      this.cartBusGain.gain.setValueAtTime(this.isCartMuted ? 0 : this.cartVolume, this.ctx.currentTime);
      this.cartBusGain.connect(this.masterGain);

      // AnalyserNode Web Audio pour le VU-mètre en direct (connecté sur masterGain pour refléter la sortie système finale)
      this.cartAnalyser = this.ctx.createAnalyser();
      this.cartAnalyser.fftSize = 256;
      this.cartAnalyser.smoothingTimeConstant = 0.25;
      this.masterGain.connect(this.cartAnalyser);
    } catch {
      // Audio non supporté
    }
  }

  public resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1.25, vol));
    this.resume();
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterMute(muted: boolean): boolean {
    this.isMuted = muted;
    this.resume();
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
    }
    return this.isMuted;
  }

  public toggleMute(): boolean {
    return this.setMasterMute(!this.isMuted);
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Modifie en temps réel le gain de sortie de tous les pads du Cartoucheur simultanément
   */
  public setCartMasterVolume(vol: number) {
    this.cartVolume = Math.max(0, Math.min(1, vol));
    this.resume();
    if (this.cartBusGain && this.ctx) {
      const target = this.isCartMuted ? 0 : this.cartVolume;
      this.cartBusGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.cartBusGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
    }
  }

  public setCartMute(muted: boolean): boolean {
    this.isCartMuted = muted;
    this.resume();
    if (this.cartBusGain && this.ctx) {
      const target = this.isCartMuted ? 0 : this.cartVolume;
      this.cartBusGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.cartBusGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
    }
    return this.isCartMuted;
  }

  public toggleCartMute(): boolean {
    return this.setCartMute(!this.isCartMuted);
  }

  public getCartMasterVolume(): number {
    return this.cartVolume;
  }

  public getIsCartMuted(): boolean {
    return this.isCartMuted;
  }

  public getCartBus(): GainNode | null {
    this.resume();
    return this.cartBusGain || this.masterGain;
  }

  /**
   * Retourne l'instance de l'AnalyserNode Web Audio dédié au Cartoucheur
   */
  public getCartAnalyser(): AnalyserNode | null {
    this.resume();
    return this.cartAnalyser;
  }

  /**
   * Calcule et retourne en temps réel les niveaux sonores crête et RMS du bus Cartoucheur
   * pour le visualiseur VU-mètre en direct
   */
  public getCartLevels(): CartAudioLevels {
    if (!this.cartAnalyser || !this.ctx || this.isCartMuted || this.cartVolume <= 0.001 || this.isMuted || this.masterVolume <= 0.001) {
      return {
        left: 0,
        right: 0,
        peakL: 0,
        peakR: 0,
        db: -100,
        dbString: '-∞ dB',
        isClipping: false,
        isActive: false
      };
    }

    const bufferLength = this.cartAnalyser.frequencyBinCount;
    if (!this.analyserDataArray || this.analyserDataArray.length !== bufferLength) {
      this.analyserDataArray = new Uint8Array(new ArrayBuffer(bufferLength));
    }
    this.cartAnalyser.getByteTimeDomainData(this.analyserDataArray as unknown as Uint8Array<ArrayBuffer>);

    let sumSquares = 0;
    let maxDeviation = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = (this.analyserDataArray[i] - 128) / 128; // -1.0 à +1.0
      sumSquares += val * val;
      const absVal = Math.abs(val);
      if (absVal > maxDeviation) maxDeviation = absVal;
    }

    const rawRms = Math.sqrt(sumSquares / bufferLength);
    // Bruit de fond minimal rejeté
    if (rawRms < 0.003 && maxDeviation < 0.008) {
      return {
        left: 0,
        right: 0,
        peakL: 0,
        peakR: 0,
        db: -100,
        dbString: '-∞ dB',
        isClipping: false,
        isActive: false
      };
    }

    // Calcul de l'échelle décibels relative au bus
    const dbVal = 20 * Math.log10(Math.max(0.0001, rawRms));
    const clampedDb = Math.max(-60, Math.min(3, Math.round(dbVal * 10) / 10));
    const dbString = `${clampedDb >= 0 ? '+' : ''}${clampedDb.toFixed(1)} dB`;

    // Échelle visuelle analogique / LED normalisée (0 à 1)
    const normL = Math.min(1.0, rawRms * 2.6);
    const normR = Math.min(1.0, rawRms * 2.45 + (maxDeviation * 0.15));
    const isClipping = maxDeviation >= 0.98;

    return {
      left: normL,
      right: normR,
      peakL: Math.min(1.0, maxDeviation),
      peakR: Math.min(1.0, maxDeviation * 0.98),
      db: clampedDb,
      dbString,
      isClipping,
      isActive: true
    };
  }

  /**
   * Joue un impact de pas scénique synchronisé avec la cinématique des jambes (pirate ou chat)
   */
  public triggerFootstep(pitchHz: number = 85, volume: number = 0.5, destNode?: GainNode | null) {
    const nowMs = performance.now();
    if (nowMs - this.lastStepPlayTime < 140) return; // Anti-mitraillage
    this.lastStepPlayTime = nowMs;

    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      // 1. Corps du pas (Membrane basse)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitchHz * 1.5, t);
      osc.frequency.exponentialRampToValueAtTime(pitchHz, t + 0.08);

      oscGain.gain.setValueAtTime(volume * 0.45, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      const out = destNode || this.masterGain;
      osc.connect(oscGain);
      oscGain.connect(out);

      osc.start(t);
      osc.stop(t + 0.13);

      // 2. Transitoire de choc (bruit filtré pour parquet de scène)
      const bufferSize = this.ctx.sampleRate * 0.04;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.25, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);

      noise.start(t);
      noise.stop(t + 0.05);
    } catch {
      // Ignore audio glitch
    }
  }

  /**
   * Joue une scintillation lumineuse (Chat de lumière ou particules néon)
   */
  public triggerSparkle(noteHz: number = 660, volume: number = 0.3) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteHz, t);
      osc.frequency.exponentialRampToValueAtTime(noteHz * 1.5, t + 0.18);

      gain.gain.setValueAtTime(volume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.23);
    } catch {
      // Ignore
    }
  }

  /**
   * Joue le signal sonore TOP de régie (chime clair pour confirmation de Cue)
   */
  public triggerCueBell(cueNumber: number, destNode?: GainNode | null) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const baseFreq = 523.25; // Do5
      const noteFreq = baseFreq * Math.pow(1.059463, (cueNumber % 12) * 2);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      const out = destNode || this.masterGain;
      osc.connect(gain);
      gain.connect(out);

      osc.start(t);
      osc.stop(t + 0.46);
    } catch {
      // Ignore
    }
  }

  /**
   * Déclenche ou module la nappe de fond scénique
   */
  public setStageDrone(active: boolean, intensity: number = 0.25) {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    try {
      if (active) {
        if (!this.droneOsc) {
          const t = this.ctx.currentTime;
          this.droneOsc = this.ctx.createOscillator();
          this.droneGain = this.ctx.createGain();

          this.droneOsc.type = 'sawtooth';
          this.droneOsc.frequency.setValueAtTime(55, t); // La1 grave 55Hz

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(140, t);

          this.droneGain.gain.setValueAtTime(0.001, t);
          this.droneGain.gain.exponentialRampToValueAtTime(Math.max(0.001, intensity * 0.2), t + 0.5);

          this.droneOsc.connect(filter);
          filter.connect(this.droneGain);
          this.droneGain.connect(this.masterGain);

          this.droneOsc.start();
        } else if (this.droneGain) {
          const t = this.ctx.currentTime;
          this.droneGain.gain.setTargetAtTime(Math.max(0.001, intensity * 0.2), t, 0.2);
        }
      } else {
        if (this.droneOsc && this.droneGain) {
          const t = this.ctx.currentTime;
          this.droneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          setTimeout(() => {
            try {
              this.droneOsc?.stop();
              this.droneOsc?.disconnect();
              this.droneOsc = null;
              this.droneGain = null;
            } catch {}
          }, 350);
        }
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Synthèse d'une goutte d'eau résonante (modulation rapide de fréquence sinusoïdale)
   */
  public triggerWaterDroplet(freqHz: number = 850, volume: number = 0.4, destNode?: GainNode | null) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqHz * 0.7, t);
      osc.frequency.exponentialRampToValueAtTime(freqHz * 1.6, t + 0.08);

      gain.gain.setValueAtTime(volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      const out = destNode || this.masterGain;
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.26);
    } catch {}
  }

  /**
   * Synthèse de bol tibétain avec harmoniques non-linéaires
   */
  public triggerTibetanBowl(fundamental: number = 216, volume: number = 0.5, destNode?: GainNode | null) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const harmonics = [1, 2.76, 5.4, 8.9];
      const out = destNode || this.masterGain;
      harmonics.forEach((mult, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(fundamental * mult, t);

        const decay = 2.0 / (idx + 1);
        gain.gain.setValueAtTime((volume / (idx + 1)) * 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      });
    } catch {}
  }

  /**
   * Synthèse de shimmer cristallin
   */
  public triggerShimmerReverb(volume: number = 0.35, destNode?: GainNode | null) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
      const out = destNode || this.masterGain;
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);

        gain.gain.setValueAtTime(0.001, t + idx * 0.04);
        gain.gain.linearRampToValueAtTime(volume * 0.2, t + idx * 0.04 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.7);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.72);
      });
    } catch {}
  }

  /**
   * Synthèse de résonance cristalline (FM non-harmonique de quartz)
   */
  public triggerCrystalResonance(fundamental: number = 1760, volume: number = 0.45, destNode?: GainNode | null) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const carrier = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const carrierGain = this.ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(fundamental, t);

      mod.type = 'triangle';
      mod.frequency.setValueAtTime(fundamental * 2.414, t); // Ratio argenté inharmonique

      modGain.gain.setValueAtTime(fundamental * 0.8, t);
      modGain.gain.exponentialRampToValueAtTime(1, t + 0.6);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      carrierGain.gain.setValueAtTime(volume * 0.4, t);
      carrierGain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

      const out = destNode || this.masterGain;
      carrier.connect(carrierGain);
      carrierGain.connect(out);

      mod.start(t);
      carrier.start(t);
      mod.stop(t + 0.86);
      carrier.stop(t + 0.86);
    } catch {}
  }

  /**
   * Synthèse d'impact métallique résonant (Piston / Échiquier)
   */
  public triggerMetallicPulse(volume: number = 0.5, destNode?: GainNode | null) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.1);

      gain.gain.setValueAtTime(volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      const out = destNode || this.masterGain;
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.36);
    } catch {}
  }

  /**
   * Joue un balayage harmonique doux pour la transition de fondu (Push to Stage)
   */
  public triggerStageCrossfade(fadeSec: number = 1.0) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(640, t + Math.min(fadeSec * 0.7, 1.2));

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(1800, t + Math.min(fadeSec * 0.5, 0.8));
      filter.frequency.exponentialRampToValueAtTime(300, t + Math.min(fadeSec, 1.5));

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + Math.min(fadeSec * 0.3, 0.4));
      gain.gain.exponentialRampToValueAtTime(0.001, t + Math.min(fadeSec, 1.5));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + Math.min(fadeSec, 1.5) + 0.05);
    } catch {}
  }

  /**
   * Déclenche un son selon le preset de la timeline ou du bus spécifié
   */
  public playPreset(preset: string, volume: number = 0.5, destNode?: GainNode | null) {
    const out = destNode || this.masterGain;
    switch (preset) {
      case 'water_droplet':
        this.triggerWaterDroplet(750 + Math.random() * 300, volume, out);
        break;
      case 'crystal_resonance':
        this.triggerCrystalResonance(1400 + Math.random() * 600, volume, out);
        break;
      case 'metallic_pulse':
        this.triggerMetallicPulse(volume, out);
        break;
      case 'deep_sub_drone':
      case 'sub_rumble':
        this.triggerFootstep(38, volume * 1.3, out);
        break;
      case 'shimmer_reverb':
      case 'sparkle_pentatonic':
        this.triggerShimmerReverb(volume, out);
        break;
      case 'tibetan_bowl':
        this.triggerTibetanBowl(220, volume, out);
        break;
      case 'footstep_wood':
        this.triggerFootstep(85 + Math.random() * 20, volume, out);
        break;
      case 'bell_cue':
        this.triggerCueBell(1, out);
        break;
      default:
        this.triggerFootstep(90, volume, out);
        break;
    }
  }

  /**
   * Déclenche un pad sonore du Cartoucheur routé directement à travers le bus Master Dédié (cartBusGain).
   * Le niveau de ce bus est modulé en temps réel pour tous les pads simultanément via le Master Fader.
   * Prend en compte un Fade Time (en ms) pour appliquer une rampe exponentielle d'attaque et des transitions douces.
   */
  public playCartSound(preset: string, volume: number = 0.8, fadeTimeMs: number = 0, padId?: string) {
    this.resume();
    const bus = this.getCartBus();
    if (!bus || !this.ctx) return;

    // Si une instance précédente tournait sur ce pad, on la fond en sortie pour éliminer les clics
    if (padId && this.activePadGains.has(padId)) {
      this.stopCartPad(padId, Math.max(40, Math.min(fadeTimeMs, 250)));
    }

    if (fadeTimeMs > 0) {
      const t = this.ctx.currentTime;
      const fadeSec = Math.max(0.015, fadeTimeMs / 1000);
      const padGain = this.ctx.createGain();

      // Enveloppe d'attaque progressive (Fade-in)
      padGain.gain.setValueAtTime(0.0001, t);
      padGain.gain.exponentialRampToValueAtTime(1.0, t + fadeSec);
      padGain.connect(bus);

      if (padId) {
        this.activePadGains.set(padId, padGain);
      }

      this.playPreset(preset, volume, padGain);
    } else {
      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      padGain.connect(bus);

      if (padId) {
        this.activePadGains.set(padId, padGain);
      }

      this.playPreset(preset, volume, padGain);
    }
  }

  /**
   * Arrête en douceur un pad audio spécifique avec une rampe de fade-out
   */
  public stopCartPad(padId: string, fadeTimeMs: number = 100) {
    if (!this.ctx) return;
    const padGain = this.activePadGains.get(padId);
    if (!padGain) return;

    try {
      const t = this.ctx.currentTime;
      const fadeSec = Math.max(0.02, fadeTimeMs / 1000);
      padGain.gain.cancelScheduledValues(t);
      padGain.gain.setValueAtTime(padGain.gain.value, t);
      padGain.gain.exponentialRampToValueAtTime(0.0001, t + fadeSec);

      setTimeout(() => {
        try {
          padGain.disconnect();
        } catch {}
      }, fadeSec * 1000 + 50);
    } catch {}

    this.activePadGains.delete(padId);
  }

  /**
   * Arrêt d'urgence de tous les sons de pads en cours (PANIC / STOP ALL)
   */
  public panicCartStop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.activePadGains.forEach((padGain) => {
      try {
        padGain.gain.cancelScheduledValues(t);
        padGain.gain.setValueAtTime(0.0001, t);
        padGain.disconnect();
      } catch {}
    });
    this.activePadGains.clear();
  }
}

export const scenicAudio = new ScenicAudioEngine();

