// Moteur Audio Local Synchrone & Synthétiseur Modulaire pour le Spectacle Vivant
// No[co]de Vibe Designer — Phase 5 : Web Audio API 100% Hors-Ligne & Synchrone
// Synthèse de pas de danse, nappes de plateau, timbres réactifs aux mouvements et signaux TOP

class ScenicAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.7;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private lastStepPlayTime: number = 0;

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
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Joue un impact de pas scénique synchronisé avec la cinématique des jambes (pirate ou chat)
   */
  public triggerFootstep(pitchHz: number = 85, volume: number = 0.5) {
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

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

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
      noiseGain.connect(this.masterGain);

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
  public triggerCueBell(cueNumber: number) {
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

      osc.connect(gain);
      gain.connect(this.masterGain);

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
  public triggerWaterDroplet(freqHz: number = 850, volume: number = 0.4) {
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

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.26);
    } catch {}
  }

  /**
   * Synthèse de bol tibétain avec harmoniques non-linéaires
   */
  public triggerTibetanBowl(fundamental: number = 216, volume: number = 0.5) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const harmonics = [1, 2.76, 5.4, 8.9];
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
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      });
    } catch {}
  }

  /**
   * Synthèse de shimmer cristallin
   */
  public triggerShimmerReverb(volume: number = 0.35) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
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
        gain.connect(this.masterGain);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.72);
      });
    } catch {}
  }

  /**
   * Synthèse de résonance cristalline (FM non-harmonique de quartz)
   */
  public triggerCrystalResonance(fundamental: number = 1760, volume: number = 0.45) {
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

      carrier.connect(carrierGain);
      carrierGain.connect(this.masterGain);

      mod.start(t);
      carrier.start(t);
      mod.stop(t + 0.86);
      carrier.stop(t + 0.86);
    } catch {}
  }

  /**
   * Synthèse d'impact métallique résonant (Piston / Échiquier)
   */
  public triggerMetallicPulse(volume: number = 0.5) {
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

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.36);
    } catch {}
  }

  /**
   * Déclenche un son selon le preset de la timeline
   */
  public playPreset(preset: string, volume: number = 0.5) {
    switch (preset) {
      case 'water_droplet':
        this.triggerWaterDroplet(750 + Math.random() * 300, volume);
        break;
      case 'crystal_resonance':
        this.triggerCrystalResonance(1400 + Math.random() * 600, volume);
        break;
      case 'metallic_pulse':
        this.triggerMetallicPulse(volume);
        break;
      case 'deep_sub_drone':
      case 'sub_rumble':
        this.triggerFootstep(38, volume * 1.3);
        break;
      case 'shimmer_reverb':
      case 'sparkle_pentatonic':
        this.triggerShimmerReverb(volume);
        break;
      case 'tibetan_bowl':
        this.triggerTibetanBowl(220, volume);
        break;
      case 'footstep_wood':
        this.triggerFootstep(85 + Math.random() * 20, volume);
        break;
      case 'bell_cue':
        this.triggerCueBell(1);
        break;
      default:
        this.triggerFootstep(90, volume);
        break;
    }
  }
}

export const scenicAudio = new ScenicAudioEngine();
