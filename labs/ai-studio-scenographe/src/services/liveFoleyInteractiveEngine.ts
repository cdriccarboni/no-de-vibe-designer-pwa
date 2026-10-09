// Moteur d'Interaction Bruitages Vivants & Scénographie Interactive
// Spectacle : « PIRATES PAILLETTES ! V2.1.26 »
// Directive fondamentale :
// - Respect absolu des bruitages acoustiques réels joués par les comédiens sur scène
// - Séparation stricte :
//   A. Son réel du comédien (non altéré)
//   B. Signal d'analyse d'interaction (RMS, transient, enveloppe, seuil gate)
//   C. Effets audio optionnels
//   D. Effets visuels & géométrie (LA MER QUI VIBRE - p. 35-37)

export type FoleyTriggerMethod =
  | 'mic_envelope' // Suivi d'enveloppe micro bruiteur
  | 'transient_hit' // Détection d'attaque / choc percussif
  | 'frequency_band' // Bande spectrale ciblée (basse, sifflet, cloche)
  | 'manual_cue' // TOP manuel régie de secours
  | 'companion_motion'; // Capteur ou smartphone sur l'objet

export interface FoleyScenicObject {
  id: string;
  name: string;
  comedianRole: string;
  didascalieRef: string;
  physicalDescription: string;
  triggerMethod: FoleyTriggerMethod;

  // Réglages d'analyse du signal (B)
  noiseGateThresholdDb: number; // Seuil sous lequel le son est ignoré (ex: -36 dB)
  sensitivity: number; // 0.5 à 3.0
  attackTimeMs: number; // rapidité de réaction (ex: 15 ms)
  releaseTimeMs: number; // retour au calme (ex: 600 ms)

  // Effet visuel associé (D)
  targetVisualEffect: 'mer_qui_vibre' | 'tempete_eclairs' | 'porte_vortex' | 'limbes_brume' | 'onde_choc_piezo';
  visualParameters: {
    intensity: number;
    frequency: number;
    waveAmplitude: number;
    decayRate: number;
  };

  // État temps réel
  isActive: boolean;
  currentLevel: number; // 0.0 à 1.0 (enveloppe calculée)
  isEngaged: boolean; // true si au-dessus du seuil gate
}

export interface VibratingSeaParameters {
  vibrationIntensity: number; // 0.0 (calme plat) à 2.0 (vibration intense)
  vibrationFrequency: number; // 5 Hz à 60 Hz
  undulationSpeed: number; // 0.2 à 3.0
  waveAmplitude: number; // 0.0 à 1.5
  surfaceDeformation: number; // 0.0 à 1.0
  propagationDecay: number; // vitesse d'amortissement vers le calme plat
  foamDensity: number; // écume blanche sur les crêtes
  audioReactivityGain: number; // sensibilité au bruitage direct
  colorDeepWater: string;
  colorSurface: string;
}

export const OFFICIAL_FOLEY_OBJECTS: FoleyScenicObject[] = [
  {
    id: 'foley-ocean-drum',
    name: "Tambour d'Océan & Bouteilles à billes",
    comedianRole: 'Aurélie & Maxime',
    didascalieRef: 'p. 37 — Les Abysses & Baleines',
    physicalDescription: "Cadre circulaire rempli de billes de verre roulant sur la membrane pour reproduire le ressac marin.",
    triggerMethod: 'mic_envelope',
    noiseGateThresholdDb: -38,
    sensitivity: 1.4,
    attackTimeMs: 40,
    releaseTimeMs: 800,
    targetVisualEffect: 'mer_qui_vibre',
    visualParameters: {
      intensity: 1.2,
      frequency: 24,
      waveAmplitude: 0.9,
      decayRate: 0.85,
    },
    isActive: true,
    currentLevel: 0,
    isEngaged: false,
  },
  {
    id: 'foley-flute-crunch',
    name: 'Flûte à bec & Cloches de Brume',
    comedianRole: 'Capitaine Crunch',
    didascalieRef: 'p. 35 — Water Simulation musicale',
    physicalDescription: 'Flûte acoustique jouant la mélodie marine ("My Heart Will Go On") et clochettes métalliques.',
    triggerMethod: 'frequency_band',
    noiseGateThresholdDb: -32,
    sensitivity: 1.6,
    attackTimeMs: 25,
    releaseTimeMs: 650,
    targetVisualEffect: 'mer_qui_vibre',
    visualParameters: {
      intensity: 1.5,
      frequency: 38,
      waveAmplitude: 1.2,
      decayRate: 0.9,
    },
    isActive: true,
    currentLevel: 0,
    isEngaged: false,
  },
  {
    id: 'foley-tole-tonnerre',
    name: 'Tôle à Tonnerre & Feuille d’Étain',
    comedianRole: 'Régie Plateau & Comédien',
    didascalieRef: 'p. 30 — Tempête et naufrage',
    physicalDescription: 'Grande plaque d’acier suspendue secouée manuellement pour faire gronder l’orage.',
    triggerMethod: 'transient_hit',
    noiseGateThresholdDb: -28,
    sensitivity: 2.0,
    attackTimeMs: 10,
    releaseTimeMs: 1200,
    targetVisualEffect: 'tempete_eclairs',
    visualParameters: {
      intensity: 1.8,
      frequency: 18,
      waveAmplitude: 1.5,
      decayRate: 0.75,
    },
    isActive: true,
    currentLevel: 0,
    isEngaged: false,
  },
  {
    id: 'foley-ballon-porte',
    name: 'Ballon de Baudruche + Chamoisine',
    comedianRole: 'Alexandra',
    didascalieRef: 'p. 22 & 56 — Porte dessinée & Évasion',
    physicalDescription: 'Frottement d’un cuir de chamois humide sur latex pour créer un grincement de porte saisissant.',
    triggerMethod: 'mic_envelope',
    noiseGateThresholdDb: -34,
    sensitivity: 1.5,
    attackTimeMs: 15,
    releaseTimeMs: 500,
    targetVisualEffect: 'porte_vortex',
    visualParameters: {
      intensity: 1.3,
      frequency: 45,
      waveAmplitude: 0.8,
      decayRate: 0.8,
    },
    isActive: true,
    currentLevel: 0,
    isEngaged: false,
  },
  {
    id: 'foley-piezo-jambe',
    name: 'Capteur Piézo Jambe de Bois (85 Hz)',
    comedianRole: 'Capitaine Crunch',
    didascalieRef: 'p. 23 — Les Limbes',
    physicalDescription: 'Impact sec de la jambe de bois sur le plateau théâtral produisant une percussion tellurique.',
    triggerMethod: 'transient_hit',
    noiseGateThresholdDb: -26,
    sensitivity: 1.8,
    attackTimeMs: 5,
    releaseTimeMs: 400,
    targetVisualEffect: 'onde_choc_piezo',
    visualParameters: {
      intensity: 1.6,
      frequency: 12,
      waveAmplitude: 1.0,
      decayRate: 0.7,
    },
    isActive: true,
    currentLevel: 0,
    isEngaged: false,
  },
];

class LiveFoleyInteractiveEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Objets scéniques répertoriés
  private foleyObjects: FoleyScenicObject[] = [...OFFICIAL_FOLEY_OBJECTS];
  private selectedObjectId: string = OFFICIAL_FOLEY_OBJECTS[0].id;

  // Paramètres d'état de « La Mer qui Vibre » (p. 35)
  private seaParams: VibratingSeaParameters = {
    vibrationIntensity: 0.0, // calme plat au repos
    vibrationFrequency: 22,
    undulationSpeed: 0.6,
    waveAmplitude: 0.2,
    surfaceDeformation: 0.15,
    propagationDecay: 0.94, // retour progressif au calme
    foamDensity: 0.0,
    audioReactivityGain: 1.5,
    colorDeepWater: '#041624',
    colorSurface: '#38bdf8',
  };

  // Niveaux d'analyse
  private rawMicRmsDb = -60;
  private envelopeLevel = 0.0;
  private isListeningToMic = false;
  private animFrameId: number | null = null;

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.startAnalysisLoop();
  }

  // -------------------------------------------------------------
  // MICROPHONE DU BRUITEUR & ANALYSE D'INTERACTION SÉPARÉE
  // -------------------------------------------------------------

  public async startMicrophoneListener(): Promise<void> {
    if (this.micStream) return;

    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioCtxClass();

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.micSourceNode = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.6;

      // ATTENTION : On branche UNIQUEMENT le micro sur l'analyser, JAMAIS sur audioCtx.destination
      // pour respecter la règle A (le son du comédien reste naturel dans la salle, pas de larsen !)
      this.micSourceNode.connect(this.analyserNode);

      this.isListeningToMic = true;
      this.notify();
    } catch (err) {
      console.warn('Micro bruiteur non disponible, passage en mode simulateur acoustique:', err);
      this.isListeningToMic = false;
    }
  }

  public stopMicrophoneListener(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSourceNode) {
      this.micSourceNode.disconnect();
      this.micSourceNode = null;
    }
    this.isListeningToMic = false;
    this.notify();
  }

  public isMicActive(): boolean {
    return this.isListeningToMic;
  }

  // -------------------------------------------------------------
  // ANALYSE DU SIGNAL & INTERACTION TEMPS RÉEL (B ➔ D)
  // -------------------------------------------------------------

  private startAnalysisLoop() {
    const timeDomainData = new Uint8Array(512);

    const tick = () => {
      let currentRmsDb = -60;

      if (this.analyserNode && this.isListeningToMic) {
        this.analyserNode.getByteTimeDomainData(timeDomainData);

        let sum = 0;
        for (let i = 0; i < timeDomainData.length; i++) {
          const val = (timeDomainData[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / timeDomainData.length);
        currentRmsDb = rms > 0.0001 ? Math.max(-60, 20 * Math.log10(rms)) : -60;
      }

      this.rawMicRmsDb = currentRmsDb;

      // Mise à jour de l'objet de bruitage actif
      const activeObj = this.getActiveObject();
      if (activeObj) {
        const threshold = activeObj.noiseGateThresholdDb;
        const sensitivity = activeObj.sensitivity;

        if (currentRmsDb > threshold) {
          // Son au-dessus du gate : calcul de l'intensité d'attaque
          const normalizedInput = Math.min(1.0, ((currentRmsDb - threshold) / (0 - threshold)) * sensitivity);
          this.envelopeLevel = Math.max(this.envelopeLevel, normalizedInput);
          activeObj.isEngaged = true;
        } else {
          // Descente progressive vers le repos (release temporel)
          this.envelopeLevel *= 0.92;
          if (this.envelopeLevel < 0.02) {
            this.envelopeLevel = 0.0;
            activeObj.isEngaged = false;
          }
        }

        activeObj.currentLevel = this.envelopeLevel;

        // PILOTAGE DE « LA MER QUI VIBRE » PAR LE BRUITAGE EN DIRECT
        if (activeObj.targetVisualEffect === 'mer_qui_vibre') {
          if (this.envelopeLevel > 0.05) {
            // Plus le comédien joue fort, plus la mer vibre et s'agite
            this.seaParams.vibrationIntensity = Math.min(
              2.0,
              this.seaParams.vibrationIntensity + this.envelopeLevel * 0.18 * this.seaParams.audioReactivityGain
            );
            this.seaParams.waveAmplitude = 0.2 + this.envelopeLevel * 1.1;
            this.seaParams.undulationSpeed = 0.6 + this.envelopeLevel * 1.8;
            this.seaParams.foamDensity = Math.max(0, (this.envelopeLevel - 0.4) * 1.5);
          } else {
            // Quand le comédien s'arrête, la mer revient progressivement au calme plat initial
            this.seaParams.vibrationIntensity *= this.seaParams.propagationDecay;
            this.seaParams.waveAmplitude = 0.2 + (this.seaParams.waveAmplitude - 0.2) * 0.95;
            this.seaParams.undulationSpeed = 0.6 + (this.seaParams.undulationSpeed - 0.6) * 0.95;
            this.seaParams.foamDensity *= 0.9;
          }
        }
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  // -------------------------------------------------------------
  // SIMULATION DU BRUITAGE PHYSIQUE (Essai régie sans micro)
  // -------------------------------------------------------------

  public triggerSimulatedFoleyImpact(intensity = 0.8) {
    this.envelopeLevel = Math.min(1.0, this.envelopeLevel + intensity);
    const activeObj = this.getActiveObject();
    if (activeObj) {
      activeObj.isEngaged = true;
      activeObj.currentLevel = this.envelopeLevel;
    }
    this.seaParams.vibrationIntensity = Math.min(2.0, this.seaParams.vibrationIntensity + intensity * 1.2);
    this.notify();
  }

  // Déclencheur TOP Manuel de secours
  public triggerManualTopCue(cueName: string) {
    if (cueName.includes('Mer') || cueName.includes('Water')) {
      this.triggerSimulatedFoleyImpact(0.9);
    } else if (cueName.includes('Tempête')) {
      this.triggerSimulatedFoleyImpact(1.5);
    }
  }

  // -------------------------------------------------------------
  // GESTION DES OBJETS & PARAMÈTRES
  // -------------------------------------------------------------

  public getObjects(): FoleyScenicObject[] {
    return [...this.foleyObjects];
  }

  public getActiveObject(): FoleyScenicObject | undefined {
    return this.foleyObjects.find((o) => o.id === this.selectedObjectId) || this.foleyObjects[0];
  }

  public selectObject(id: string) {
    this.selectedObjectId = id;
    this.notify();
  }

  public updateObject(id: string, partial: Partial<FoleyScenicObject>) {
    this.foleyObjects = this.foleyObjects.map((o) => (o.id === id ? { ...o, ...partial } : o));
    this.notify();
  }

  public getSeaParameters(): VibratingSeaParameters {
    return { ...this.seaParams };
  }

  public updateSeaParameters(partial: Partial<VibratingSeaParameters>) {
    this.seaParams = { ...this.seaParams, ...partial };
    this.notify();
  }

  public getTelemetry(): {
    rawMicDb: number;
    envelope: number;
    vibration: number;
    isEngaged: boolean;
  } {
    return {
      rawMicDb: this.rawMicRmsDb,
      envelope: this.envelopeLevel,
      vibration: this.seaParams.vibrationIntensity,
      isEngaged: this.getActiveObject()?.isEngaged || false,
    };
  }

  // -------------------------------------------------------------
  // RENDU DU SHADER / CANVAS « LA MER QUI VIBRE » (D)
  // -------------------------------------------------------------

  public renderVibratingSeaToCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timestamp: number
  ) {
    const t = timestamp * 0.001;
    const {
      vibrationIntensity,
      vibrationFrequency,
      undulationSpeed,
      waveAmplitude,
      surfaceDeformation,
      foamDensity,
      colorDeepWater,
      colorSurface,
    } = this.seaParams;

    // 1. Fond abyssal profond
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#020b12');
    grad.addColorStop(0.5, colorDeepWater);
    grad.addColorStop(1, '#08253a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Ondulations et houle multicouche (4 couches de vagues)
    const layerCount = 4;
    for (let layer = 0; layer < layerCount; layer++) {
      const layerProgress = (layer + 1) / layerCount;
      const layerBaseY = height * (0.35 + layerProgress * 0.45);
      const layerSpeed = undulationSpeed * (0.8 + layer * 0.3);

      ctx.beginPath();
      ctx.moveTo(0, height);

      // Calcul de la ligne de houle avec vibration haute-fréquence
      const step = 8;
      for (let x = 0; x <= width; x += step) {
        // Ondulation basse fréquence (houle marine de fond)
        const swell =
          Math.sin(x * 0.008 + t * layerSpeed + layer) * 25 * waveAmplitude +
          Math.sin(x * 0.018 - t * layerSpeed * 0.7 + layer * 2) * 12 * waveAmplitude;

        // VIBRATION HAUTE FRÉQUENCE déclenchée par le bruitage direct
        const microVibration =
          vibrationIntensity > 0.02
            ? Math.sin(x * 0.15 + t * vibrationFrequency) * 8 * vibrationIntensity +
              Math.cos(x * 0.35 - t * vibrationFrequency * 1.5) * 4 * vibrationIntensity
            : 0;

        const y = layerBaseY + swell + microVibration;
        if (x === 0) {
          ctx.lineTo(0, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineTo(width, height);
      ctx.closePath();

      // Teinte dégradée par couche avec reflets cyan / paillettes
      ctx.fillStyle = `rgba(14, 116, 144, ${0.35 + layer * 0.15})`;
      ctx.fill();

      // Crête lumineuse de la vague
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + layer * 0.2 + vibrationIntensity * 0.3})`;
      ctx.lineWidth = 1.5 + vibrationIntensity * 2;
      ctx.stroke();

      // Écume et étincelles de plancton sur forte vibration
      if (foamDensity > 0.1 || vibrationIntensity > 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        for (let fx = 20; fx < width; fx += 40 + layer * 20) {
          const foamY = layerBaseY + Math.sin(fx * 0.01 + t * layerSpeed) * 20;
          ctx.beginPath();
          ctx.arc(fx + Math.sin(t * 3 + fx) * 10, foamY, 1.5 + vibrationIntensity * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Onde de choc concentrique si vibration percussive
    if (vibrationIntensity > 0.8) {
      const cx = width * 0.5;
      const cy = height * 0.65;
      const rippleR = ((t * 80) % (width * 0.4)) + 20;

      ctx.beginPath();
      ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.6 * (1 - rippleR / (width * 0.4))})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
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

export const liveFoleyInteractiveEngine = new LiveFoleyInteractiveEngine();
