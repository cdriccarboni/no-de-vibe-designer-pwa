// Service Moteur Audio & Broadcast Radio Sécurisé
// No[co]de Vibe Designer — Priorité Absolue P00 : Broadcast Radio
// Architecture conforme : AUDIO IN ➔ MIXAGE ➔ RADIO BUS ➔ RADIO OUT ➔ SERVEUR ➔ LECTEUR
// Intègre les correctifs audio safe (PR #28, version 3.3.8 / 3.3.9) :
// - Reprise sécurisée de l'AudioContext sur geste utilisateur
// - Zéro fuite mémoire : déconnexion totale des nœuds et arrêt des MediaStreamTrack
// - Encodage Opus continu via MediaRecorder et envoi par blocs binaires

export type AudioSourceType = 'mic' | 'test_tone' | 'scenography_bus' | 'audio_file';

export type RadioBroadcastState = 'idle' | 'testing' | 'on_air' | 'error';

export interface RadioLevels {
  leftPeak: number; // 0 to 1
  rightPeak: number; // 0 to 1
  rmsDb: number; // -60 to 0 dB
  peakDb: number; // -60 to +3 dB
  isClipping: boolean;
}

export interface RadioTelemetry {
  state: RadioBroadcastState;
  activeSource: AudioSourceType;
  destinationSlug: string;
  destinationName: string;
  bytesSent: number;
  packetsSent: number;
  transferRateKbps: number;
  listenersCount: number;
  serverConnected: boolean;
  errorMessage?: string;
}

export interface RadioMixSettings {
  inputGain: number; // 0 to 2 (default 1)
  eqLow: number; // -12 to +12 dB (default 0)
  eqMid: number; // -12 to +12 dB (default 0)
  eqHigh: number; // -12 to +12 dB (default 0)
  masterGain: number; // 0 to 1.5 (default 1)
  monitorGain: number; // 0 to 1 (default 0) - casque / écoute locale
}

export interface RadioAuthorizedProfile {
  id: string;
  name: string;
  slug: string;
  token?: string;
  lastUsed: number;
  autoReconnect?: boolean;
}

class RadioAudioEngine {
  private audioCtx: AudioContext | null = null;

  // Signal chain nodes
  private inputGainNode: GainNode | null = null;
  private eqLowNode: BiquadFilterNode | null = null;
  private eqMidNode: BiquadFilterNode | null = null;
  private eqHighNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;
  private monitorGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private streamDestNode: MediaStreamAudioDestinationNode | null = null;

  // Source nodes & media tracks
  private currentSourceType: AudioSourceType = 'test_tone';
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private oscNode: OscillatorNode | null = null;
  private oscSubNode: OscillatorNode | null = null;
  private oscGainNode: GainNode | null = null;
  private fileAudioElement: HTMLAudioElement | null = null;
  private fileSourceNode: MediaElementAudioSourceNode | null = null;

  // Recording & streaming
  private mediaRecorder: MediaRecorder | null = null;
  private broadcastInterval: number | null = null;
  private chunkSequence = 0;
  private bytesSentTotal = 0;
  private packetsSentTotal = 0;
  private lastRateCheckTime = 0;
  private lastRateBytes = 0;
  private currentKbps = 0;

  // State
  private state: RadioBroadcastState = 'idle';
  private destinationSlug = 'radio-paillettes';
  private destinationName = 'Radio Paillettes en grève';
  private listenersCount = 0;
  private serverConnected = false;
  private errorMessage = '';

  // Listeners callbacks
  private telemetryCallbacks: Set<(t: RadioTelemetry) => void> = new Set();
  private levelsCallbacks: Set<(l: RadioLevels) => void> = new Set();
  private animFrameId: number | null = null;

  // Settings
  private mixSettings: RadioMixSettings = {
    inputGain: 1.0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    masterGain: 1.0,
    monitorGain: 0.0,
  };

  constructor() {
    this.startMeteringLoop();
  }

  // Initialisation paresseuse sécurisée de l'AudioContext
  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.setupMasterChain();
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  // Construction de la chaîne audio : INPUT ➔ EQ ➔ COMPRESSOR ➔ MASTER ➔ ANALYSER ➔ DESTINATION
  private setupMasterChain() {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;

    // 1. Gain d'entrée
    this.inputGainNode = ctx.createGain();
    this.inputGainNode.gain.setValueAtTime(this.mixSettings.inputGain, ctx.currentTime);

    // 2. Égaliseur 3 bandes (BiquadFilter)
    this.eqLowNode = ctx.createBiquadFilter();
    this.eqLowNode.type = 'lowshelf';
    this.eqLowNode.frequency.setValueAtTime(120, ctx.currentTime);
    this.eqLowNode.gain.setValueAtTime(this.mixSettings.eqLow, ctx.currentTime);

    this.eqMidNode = ctx.createBiquadFilter();
    this.eqMidNode.type = 'peaking';
    this.eqMidNode.frequency.setValueAtTime(1200, ctx.currentTime);
    this.eqMidNode.Q.setValueAtTime(1.0, ctx.currentTime);
    this.eqMidNode.gain.setValueAtTime(this.mixSettings.eqMid, ctx.currentTime);

    this.eqHighNode = ctx.createBiquadFilter();
    this.eqHighNode.type = 'highshelf';
    this.eqHighNode.frequency.setValueAtTime(8000, ctx.currentTime);
    this.eqHighNode.gain.setValueAtTime(this.mixSettings.eqHigh, ctx.currentTime);

    // 3. Compresseur / Limiteur de diffusion (Sécurité anti-saturation)
    this.compressorNode = ctx.createDynamicsCompressor();
    this.compressorNode.threshold.setValueAtTime(-14, ctx.currentTime);
    this.compressorNode.knee.setValueAtTime(6, ctx.currentTime);
    this.compressorNode.ratio.setValueAtTime(4, ctx.currentTime);
    this.compressorNode.attack.setValueAtTime(0.003, ctx.currentTime);
    this.compressorNode.release.setValueAtTime(0.2, ctx.currentTime);

    // 4. Bus Master Radio
    this.masterGainNode = ctx.createGain();
    this.masterGainNode.gain.setValueAtTime(this.mixSettings.masterGain, ctx.currentTime);

    // 5. Analyseur VU-Mètre & FFT
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.75;

    // 6. Moniteur d'écoute locale (casque / contrôle régie)
    this.monitorGainNode = ctx.createGain();
    this.monitorGainNode.gain.setValueAtTime(this.mixSettings.monitorGain, ctx.currentTime);
    this.monitorGainNode.connect(ctx.destination);

    // 7. Destination d'encodage MediaStream
    this.streamDestNode = ctx.createMediaStreamDestination();

    // Câblage série
    this.inputGainNode.connect(this.eqLowNode);
    this.eqLowNode.connect(this.eqMidNode);
    this.eqMidNode.connect(this.eqHighNode);
    this.eqHighNode.connect(this.compressorNode);
    this.compressorNode.connect(this.masterGainNode);

    this.masterGainNode.connect(this.analyserNode);
    this.masterGainNode.connect(this.streamDestNode);
    this.masterGainNode.connect(this.monitorGainNode);
  }

  // -------------------------------------------------------------
  // GESTION DES SOURCES AUDIO
  // -------------------------------------------------------------

  public async setSource(sourceType: AudioSourceType, options?: { audioFile?: File | string; customFrequency?: number }) {
    await this.ensureAudioContext();
    this.cleanupCurrentSource();
    this.currentSourceType = sourceType;

    try {
      switch (sourceType) {
        case 'mic':
          await this.initMicSource();
          break;
        case 'test_tone':
          this.initTestToneSource(options?.customFrequency || 440);
          break;
        case 'scenography_bus':
          this.initScenographySource();
          break;
        case 'audio_file':
          if (options?.audioFile) {
            this.initFileSource(options.audioFile);
          } else {
            // fallback to test tone
            this.initTestToneSource(440);
          }
          break;
      }
      this.notifyTelemetry();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorMessage = `Erreur configuration source [${sourceType}]: ${msg}`;
      this.notifyTelemetry();
      throw err;
    }
  }

  // Source 1 : Microphone réel de la régie
  private async initMicSource() {
    if (!this.audioCtx || !this.inputGainNode) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia non supporté par ce navigateur.');
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 2,
      },
    });

    this.micSourceNode = this.audioCtx.createMediaStreamSource(this.micStream);
    this.micSourceNode.connect(this.inputGainNode);
  }

  // Source 2 : Générateur d'étalonnage régie (Test Tone harmonique / Paillettes / Pirate)
  private initTestToneSource(freq = 440) {
    if (!this.audioCtx || !this.inputGainNode) return;
    const ctx = this.audioCtx;

    this.oscGainNode = ctx.createGain();
    this.oscGainNode.gain.setValueAtTime(0.35, ctx.currentTime);

    this.oscNode = ctx.createOscillator();
    this.oscNode.type = 'sine';
    this.oscNode.frequency.setValueAtTime(freq, ctx.currentTime);

    this.oscSubNode = ctx.createOscillator();
    this.oscSubNode.type = 'triangle';
    this.oscSubNode.frequency.setValueAtTime(freq * 1.5, ctx.currentTime); // Quinte supérieure douce

    this.oscNode.connect(this.oscGainNode);
    this.oscSubNode.connect(this.oscGainNode);
    this.oscGainNode.connect(this.inputGainNode);

    this.oscNode.start();
    this.oscSubNode.start();
  }

  // Source 3 : Bus de la Scénographie Vivante (Sons génératifs de la scène)
  private initScenographySource() {
    if (!this.audioCtx || !this.inputGainNode) return;
    const ctx = this.audioCtx;

    // Générateur d'ambiance scénographique live (onde marine modulée + arpège paillettes)
    this.oscGainNode = ctx.createGain();
    this.oscGainNode.gain.setValueAtTime(0.3, ctx.currentTime);

    // Onde porteuse
    this.oscNode = ctx.createOscillator();
    this.oscNode.type = 'sawtooth';
    this.oscNode.frequency.setValueAtTime(110, ctx.currentTime); // Basse A2

    // Modulation lente (Vague de la mer pirate)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.25, ctx.currentTime);
    lfoGain.gain.setValueAtTime(30, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.oscNode.frequency);
    lfo.start();

    // Filtre passe-bas chaud
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);

    this.oscNode.connect(filter);
    filter.connect(this.oscGainNode);
    this.oscGainNode.connect(this.inputGainNode);

    this.oscNode.start();
  }

  // Source 4 : Fichier audio local
  private initFileSource(file: File | string) {
    if (!this.audioCtx || !this.inputGainNode) return;
    const ctx = this.audioCtx;

    const audioEl = new Audio();
    audioEl.crossOrigin = 'anonymous';
    audioEl.loop = true;

    if (typeof file === 'string') {
      audioEl.src = file;
    } else {
      audioEl.src = URL.createObjectURL(file);
    }

    this.fileAudioElement = audioEl;
    this.fileSourceNode = ctx.createMediaElementSource(audioEl);
    this.fileSourceNode.connect(this.inputGainNode);

    audioEl.play().catch((err) => {
      console.warn('Autoplay prevented on audio file:', err);
    });
  }

  // Nettoyage complet sans fuite
  private cleanupCurrentSource() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.micSourceNode) {
      this.micSourceNode.disconnect();
      this.micSourceNode = null;
    }
    if (this.oscNode) {
      try {
        this.oscNode.stop();
        this.oscNode.disconnect();
      } catch {
        // ignore
      }
      this.oscNode = null;
    }
    if (this.oscSubNode) {
      try {
        this.oscSubNode.stop();
        this.oscSubNode.disconnect();
      } catch {
        // ignore
      }
      this.oscSubNode = null;
    }
    if (this.oscGainNode) {
      this.oscGainNode.disconnect();
      this.oscGainNode = null;
    }
    if (this.fileAudioElement) {
      this.fileAudioElement.pause();
      if (this.fileAudioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.fileAudioElement.src);
      }
      this.fileAudioElement = null;
    }
    if (this.fileSourceNode) {
      this.fileSourceNode.disconnect();
      this.fileSourceNode = null;
    }
  }

  // -------------------------------------------------------------
  // RÉGLAGES MIXAGE & ÉGALISATION
  // -------------------------------------------------------------

  public updateMixSettings(partial: Partial<RadioMixSettings>) {
    this.mixSettings = { ...this.mixSettings, ...partial };
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    if (this.inputGainNode && partial.inputGain !== undefined) {
      this.inputGainNode.gain.setTargetAtTime(this.mixSettings.inputGain, now, 0.05);
    }
    if (this.eqLowNode && partial.eqLow !== undefined) {
      this.eqLowNode.gain.setTargetAtTime(this.mixSettings.eqLow, now, 0.05);
    }
    if (this.eqMidNode && partial.eqMid !== undefined) {
      this.eqMidNode.gain.setTargetAtTime(this.mixSettings.eqMid, now, 0.05);
    }
    if (this.eqHighNode && partial.eqHigh !== undefined) {
      this.eqHighNode.gain.setTargetAtTime(this.mixSettings.eqHigh, now, 0.05);
    }
    if (this.masterGainNode && partial.masterGain !== undefined) {
      this.masterGainNode.gain.setTargetAtTime(this.mixSettings.masterGain, now, 0.05);
    }
    if (this.monitorGainNode && partial.monitorGain !== undefined) {
      this.monitorGainNode.gain.setTargetAtTime(this.mixSettings.monitorGain, now, 0.05);
    }
  }

  public getMixSettings(): RadioMixSettings {
    return { ...this.mixSettings };
  }

  // -------------------------------------------------------------
  // DESTINATION ET CANAL DE DIFFUSION
  // -------------------------------------------------------------

  public setDestination(slug: string, name?: string) {
    const clean = slug.toLowerCase().replace(/^\/+/, '').trim() || 'radio-direct';
    this.destinationSlug = clean;
    if (name) {
      this.destinationName = name;
    } else if (clean.includes('paillette')) {
      this.destinationName = 'Radio Paillettes en grève';
    } else if (clean.includes('pirate')) {
      this.destinationName = 'Radio Pirate des Caraïbes';
    } else {
      this.destinationName = `Radio /${clean}`;
    }
    this.notifyTelemetry();
  }

  public getDestination(): { slug: string; name: string } {
    return { slug: this.destinationSlug, name: this.destinationName };
  }

  // Vérification de la disponibilité du canal sur le serveur
  public async checkDestinationAvailability(slug?: string): Promise<{ exists: boolean; isLive: boolean; listenersCount: number; name: string; error?: string }> {
    const target = slug ? slug.toLowerCase().replace(/^\/+/, '') : this.destinationSlug;
    try {
      const res = await fetch(`/api/radio/status/${target}`);
      if (res.ok) {
        const data = await res.json();
        return {
          exists: true,
          isLive: data.isLive,
          listenersCount: data.listenersCount || 0,
          name: data.name || target,
        };
      }
      return {
        exists: false,
        isLive: false,
        listenersCount: 0,
        name: target,
        error: `Page non disponible sur le relais (${res.status})`,
      };
    } catch {
      return {
        exists: false,
        isLive: false,
        listenersCount: 0,
        name: target,
        error: 'Relais Radio inaccessible (Hors ligne ou serveur non démarré)',
      };
    }
  }

  // -------------------------------------------------------------
  // MODES DE DIFFUSION : TEST, ON AIR, STOP
  // -------------------------------------------------------------

  // 1. Mode TEST (Privé : boucle locale de contrôle, aucun flux public)
  public async startTest(): Promise<void> {
    await this.ensureAudioContext();

    // Activer l'écoute locale sur le moniteur de contrôle régie (volume sécurisé 0.5)
    this.updateMixSettings({ monitorGain: 0.5 });

    // Initialiser la source si aucune n'est active
    if (!this.micSourceNode && !this.oscNode && !this.fileSourceNode) {
      await this.setSource(this.currentSourceType);
    }

    // Informer le serveur du mode test (sans diffusion publique)
    try {
      await fetch(`/api/radio/broadcast/${this.destinationSlug}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.destinationName,
          isTesting: true,
          mimeType: 'audio/webm;codecs=opus',
        }),
      });
      this.serverConnected = true;
    } catch {
      this.serverConnected = false;
    }

    this.state = 'testing';
    this.errorMessage = '';
    this.notifyTelemetry();
  }

  // 2. Mode ON AIR (Public : encodage continu et diffusion vers le serveur)
  public async startOnAir(): Promise<void> {
    await this.ensureAudioContext();

    if (!this.streamDestNode) {
      throw new Error('Nœud destination stream non initialisé.');
    }

    // Assurer qu'une source audio est active
    if (!this.micSourceNode && !this.oscNode && !this.fileSourceNode) {
      await this.setSource(this.currentSourceType);
    }

    // Notifier le serveur du passage ON AIR
    try {
      const res = await fetch(`/api/radio/broadcast/${this.destinationSlug}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.destinationName,
          isTesting: false,
          mimeType: 'audio/webm;codecs=opus',
        }),
      });
      if (!res.ok) {
        throw new Error(`Erreur serveur relais : code ${res.status}`);
      }
      this.serverConnected = true;
    } catch (err: unknown) {
      this.serverConnected = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.errorMessage = `Impossible de contacter le relais de streaming: ${msg}`;
      this.state = 'error';
      this.notifyTelemetry();
      throw err;
    }

    // Configurer le MediaRecorder pour streamer des blocs Opus
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
    ];
    let selectedMime = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) {
        selectedMime = mt;
        break;
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.streamDestNode.stream, {
        mimeType: selectedMime || undefined,
        audioBitsPerSecond: 128000,
      });
    } catch (err) {
      console.warn('Fallback standard MediaRecorder without options', err);
      this.mediaRecorder = new MediaRecorder(this.streamDestNode.stream);
    }

    this.chunkSequence = 0;
    this.bytesSentTotal = 0;
    this.packetsSentTotal = 0;
    this.lastRateCheckTime = performance.now();
    this.lastRateBytes = 0;

    this.mediaRecorder.ondataavailable = async (e) => {
      if (e.data && e.data.size > 0 && this.state === 'on_air') {
        const buffer = await e.data.arrayBuffer();
        this.sendAudioChunkToServer(buffer);
      }
    };

    // Émettre un bloc toutes les 500 millisecondes
    this.mediaRecorder.start(500);

    // Démarrer la surveillance périodique de l'état
    this.startTelemetryPolling();

    this.state = 'on_air';
    this.errorMessage = '';
    this.notifyTelemetry();
  }

  // 3. Mode STOP (Arrêt propre et réinitialisation de l'état)
  public async stop(): Promise<void> {
    this.state = 'idle';

    // 1. Couper le MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.mediaRecorder = null;

    // 2. Couper le moniteur de contrôle
    this.updateMixSettings({ monitorGain: 0.0 });

    // 3. Notifier le serveur de l'arrêt du flux
    try {
      await fetch(`/api/radio/broadcast/${this.destinationSlug}/stop`, {
        method: 'POST',
      });
    } catch {
      // ignore
    }

    // 4. Nettoyer les intervalles
    if (this.broadcastInterval !== null) {
      window.clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.bytesSentTotal = 0;
    this.packetsSentTotal = 0;
    this.currentKbps = 0;
    this.listenersCount = 0;
    this.errorMessage = '';

    this.notifyTelemetry();
  }

  // Envoi binaire du bloc audio vers le serveur Express
  private async sendAudioChunkToServer(chunk: ArrayBuffer) {
    try {
      const res = await fetch(`/api/radio/broadcast/${this.destinationSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Chunk-Seq': String(++this.chunkSequence),
        },
        body: chunk,
      });

      if (res.ok) {
        const data = await res.json();
        this.bytesSentTotal += chunk.byteLength;
        this.packetsSentTotal++;
        if (data.listeners !== undefined) {
          this.listenersCount = data.listeners;
        }
        this.serverConnected = true;

        // Calcul du débit instantané
        const now = performance.now();
        const elapsed = (now - this.lastRateCheckTime) / 1000;
        if (elapsed >= 1.0) {
          const deltaBytes = this.bytesSentTotal - this.lastRateBytes;
          this.currentKbps = Math.round((deltaBytes * 8) / (elapsed * 1000));
          this.lastRateBytes = this.bytesSentTotal;
          this.lastRateCheckTime = now;
        }

        this.notifyTelemetry();
      } else {
        this.serverConnected = false;
      }
    } catch {
      this.serverConnected = false;
      this.notifyTelemetry();
    }
  }

  // Surveillance périodique des auditeurs
  private startTelemetryPolling() {
    if (this.broadcastInterval !== null) {
      window.clearInterval(this.broadcastInterval);
    }

    this.broadcastInterval = window.setInterval(async () => {
      if (this.state !== 'on_air') return;
      try {
        const res = await fetch(`/api/radio/status/${this.destinationSlug}`);
        if (res.ok) {
          const info = await res.json();
          this.listenersCount = info.listenersCount || 0;
          this.notifyTelemetry();
        }
      } catch {
        // ignore
      }
    }, 3000);
  }

  // -------------------------------------------------------------
  // MESURES TEMPS RÉEL (VU-MÈTRE & NIVEAUX EN dB)
  // -------------------------------------------------------------

  private startMeteringLoop() {
    const timeDomainData = new Uint8Array(256);

    const updateMeter = () => {
      if (this.analyserNode && (this.state === 'testing' || this.state === 'on_air' || this.currentSourceType === 'test_tone')) {
        this.analyserNode.getByteTimeDomainData(timeDomainData);

        let sumSquares = 0;
        let peakValue = 0;

        for (let i = 0; i < timeDomainData.length; i++) {
          const normalized = (timeDomainData[i] - 128) / 128;
          sumSquares += normalized * normalized;
          const abs = Math.abs(normalized);
          if (abs > peakValue) {
            peakValue = abs;
          }
        }

        const rms = Math.sqrt(sumSquares / timeDomainData.length);
        const rmsDb = rms > 0.0001 ? Math.max(-60, Math.round(20 * Math.log10(rms))) : -60;
        const peakDb = peakValue > 0.0001 ? Math.max(-60, Math.round(20 * Math.log10(peakValue))) : -60;
        const isClipping = peakValue >= 0.99;

        const levels: RadioLevels = {
          leftPeak: Math.min(1, peakValue),
          rightPeak: Math.min(1, peakValue * 0.95), // Stéréo simulée
          rmsDb,
          peakDb,
          isClipping,
        };

        this.notifyLevels(levels);
      } else {
        this.notifyLevels({
          leftPeak: 0,
          rightPeak: 0,
          rmsDb: -60,
          peakDb: -60,
          isClipping: false,
        });
      }

      this.animFrameId = requestAnimationFrame(updateMeter);
    };

    this.animFrameId = requestAnimationFrame(updateMeter);
  }

  // Abonnements télémétrie & niveaux
  public onTelemetry(cb: (t: RadioTelemetry) => void): () => void {
    this.telemetryCallbacks.add(cb);
    cb(this.getTelemetrySnapshot());
    return () => this.telemetryCallbacks.delete(cb);
  }

  public onLevels(cb: (l: RadioLevels) => void): () => void {
    this.levelsCallbacks.add(cb);
    return () => this.levelsCallbacks.delete(cb);
  }

  private notifyTelemetry() {
    const snap = this.getTelemetrySnapshot();
    for (const cb of this.telemetryCallbacks) {
      cb(snap);
    }
  }

  private notifyLevels(levels: RadioLevels) {
    for (const cb of this.levelsCallbacks) {
      cb(levels);
    }
  }

  public getTelemetrySnapshot(): RadioTelemetry {
    return {
      state: this.state,
      activeSource: this.currentSourceType,
      destinationSlug: this.destinationSlug,
      destinationName: this.destinationName,
      bytesSent: this.bytesSentTotal,
      packetsSent: this.packetsSentTotal,
      transferRateKbps: this.currentKbps,
      listenersCount: this.listenersCount,
      serverConnected: this.serverConnected,
      errorMessage: this.errorMessage,
    };
  }

  public getState(): RadioBroadcastState {
    return this.state;
  }
}

export const radioAudioEngine = new RadioAudioEngine();
