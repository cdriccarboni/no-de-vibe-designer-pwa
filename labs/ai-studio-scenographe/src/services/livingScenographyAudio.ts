// Synthétiseur de Bruitages Physiques Authentiques & Studio Sonore Scénique
// « PIRATES PAILLETTES ! V2.1.26 » — 100% Hors-ligne / Web Audio API
// Synthèse procédurale des instruments physiques répertoriés dans les didascalies

import { FoleySoundDefinition, FoleySoundPresetId } from '../types/livingScenography';

export const FOLEY_CATALOG: FoleySoundDefinition[] = [
  {
    id: 'sachet_velours_vert',
    name: 'Vent dans les feuilles (Sachet Velours Vert)',
    objectDescription: 'Friction douce de velours texturé imitant la brise dans les feuillages',
    didascaliePage: 19,
    category: 'aerien',
    durationSec: 4.5,
    loopable: true,
    gainDb: -6
  },
  {
    id: 'bouteilles_frangees',
    name: 'Vent fort & Pluie battante (Bouteilles frangées)',
    objectDescription: 'Plastique frangé agité créant le crépitement dense de pluie et bourrasque',
    didascaliePage: 19,
    category: 'aerien',
    durationSec: 5.0,
    loopable: true,
    gainDb: -4
  },
  {
    id: 'tambour_ocean_billes',
    name: 'Mer, Vagues et Ressac (Tambour de l’océan & Bille)',
    objectDescription: 'Billes métalliques roulant sur peau naturelle, houle et déferlante',
    didascaliePage: 19,
    category: 'aquatique',
    durationSec: 6.0,
    loopable: true,
    gainDb: -3
  },
  {
    id: 'boite_tonnerre_etain',
    name: 'Tempête & Tonnerre (Boîte tonnerre & Étain)',
    objectDescription: 'Ressort sur membrane métallique et secousse de feuille d’étain',
    didascaliePage: 19,
    category: 'impact',
    durationSec: 4.0,
    loopable: false,
    gainDb: 0
  },
  {
    id: 'sifflet_azteque',
    name: 'Sifflements terrifiants (Sifflet tête de mort aztèque)',
    objectDescription: 'Cri du vent strident et vortex d’air chaotique non-linéaire',
    didascaliePage: 21,
    category: 'aerien',
    durationSec: 3.5,
    loopable: false,
    gainDb: -2
  },
  {
    id: 'flute_claquage',
    name: 'Vent étrange (Flûte traversière & Claquage mécanique)',
    objectDescription: 'Souffle harmonique traversier et percussion sèche de clapet',
    didascaliePage: 23,
    category: 'mecanique',
    durationSec: 3.0,
    loopable: false,
    gainDb: -5
  },
  {
    id: 'piezo_jambe_bois',
    name: 'Choc jambe de bois (Plaque Piezo sur parquet)',
    objectDescription: 'Impact résonant sourd à 85 Hz marquant la démarche du Capitaine Crunch',
    didascaliePage: 24,
    category: 'impact',
    durationSec: 1.2,
    loopable: false,
    gainDb: +2
  },
  {
    id: 'bouteille_froissee',
    name: 'Grincements du bois (Bouteille froissée)',
    objectDescription: 'Torsion de plastique mimant la coque d’un navire pirate sous tension',
    didascaliePage: 24,
    category: 'mecanique',
    durationSec: 2.2,
    loopable: false,
    gainDb: -4
  },
  {
    id: 'cloches_bateau',
    name: 'Cloches de bateau frappées (Alerte naufrage)',
    objectDescription: 'Cloche de bronze martelée résonnant dans la brume marine',
    didascaliePage: 30,
    category: 'signal',
    durationSec: 3.8,
    loopable: false,
    gainDb: 0
  },
  {
    id: 'stompbox_belier',
    name: 'Bélier sur porte (Stompbox)',
    objectDescription: 'Percussion lourde et sourde contre la porte de la station radio',
    didascaliePage: 56,
    category: 'impact',
    durationSec: 1.5,
    loopable: false,
    gainDb: +3
  },
  {
    id: 'ballon_chamoisine',
    name: 'Grincement de porte (Chamoisine sur ballon)',
    objectDescription: 'Friction humide oscillante sur latex simulant les gonds rouillés',
    didascaliePage: 59,
    category: 'mecanique',
    durationSec: 2.8,
    loopable: false,
    gainDb: -5
  },
  {
    id: 'talkie_walkie_bips',
    name: 'Talkie-walkie : Bip court / long (Codes régie)',
    objectDescription: 'Tonalité radio à modulation de fréquence 1750 Hz',
    didascaliePage: 7,
    category: 'signal',
    durationSec: 1.0,
    loopable: false,
    gainDb: -3
  },
  {
    id: 'vinyle_lointain',
    name: 'Grésillement de disque vinyle au loin',
    objectDescription: 'Craquements analogiques 33 tours dans le studio radio',
    didascaliePage: 3,
    category: 'signal',
    durationSec: 8.0,
    loopable: true,
    gainDb: -8
  },
  {
    id: 'psalmodie_lune',
    name: 'Psalmodie des enfants de la lune (Nappe sonore)',
    objectDescription: 'Voix spectrales superposées et écho récursif inversé',
    didascaliePage: 50,
    category: 'aerien',
    durationSec: 6.5,
    loopable: true,
    gainDb: -6
  },
  {
    id: 'hijo_de_la_luna_bells',
    name: 'Hijo de la Luna — Cloches musicales (Mecano)',
    objectDescription: 'Arpège cristallin aux cloches de table (thème 2 fois)',
    didascaliePage: 30,
    category: 'signal',
    durationSec: 4.5,
    loopable: false,
    gainDb: -2
  },
  {
    id: 'my_heart_will_go_on_flute',
    name: 'Flûte & Cloches (My Heart Will Go On)',
    objectDescription: 'Flûte à bec (JulieBe) et cloches musicales (Maxime)',
    didascaliePage: 35,
    category: 'signal',
    durationSec: 5.5,
    loopable: false,
    gainDb: -3
  }
];

class LivingScenographyAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tenDbDuckingGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isDucked10dB: boolean = false;
  private isBinauralHeadphoneMode: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.tenDbDuckingGain = this.ctx.createGain();

      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.tenDbDuckingGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.tenDbDuckingGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setDucking10dB(enabled: boolean) {
    this.initContext();
    this.isDucked10dB = enabled;
    if (this.ctx && this.tenDbDuckingGain) {
      // -10 dB = amplitude factor ~0.316
      const targetGain = enabled ? 0.316 : 1.0;
      this.tenDbDuckingGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
    }
  }

  public getIsDucked(): boolean {
    return this.isDucked10dB;
  }

  public setBinauralMode(enabled: boolean) {
    this.isBinauralHeadphoneMode = enabled;
  }

  public getBinauralMode(): boolean {
    return this.isBinauralHeadphoneMode;
  }

  public triggerFoley(presetId: FoleySoundPresetId, customGain = 1.0) {
    this.initContext();
    if (!this.ctx || !this.tenDbDuckingGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    switch (presetId) {
      case 'piezo_jambe_bois':
        this.synthWoodenPegLeg(now, customGain);
        break;
      case 'boite_tonnerre_etain':
        this.synthThunderBox(now, customGain);
        break;
      case 'tambour_ocean_billes':
        this.synthOceanDrum(now, customGain);
        break;
      case 'sifflet_azteque':
        this.synthAztecWhistle(now, customGain);
        break;
      case 'sachet_velours_vert':
        this.synthVelvetWind(now, customGain);
        break;
      case 'bouteilles_frangees':
        this.synthFringedBottlesRain(now, customGain);
        break;
      case 'flute_claquage':
        this.synthFluteClick(now, customGain);
        break;
      case 'bouteille_froissee':
        this.synthCreakingWood(now, customGain);
        break;
      case 'cloches_bateau':
        this.synthShipBells(now, customGain);
        break;
      case 'stompbox_belier':
        this.synthStompboxRam(now, customGain);
        break;
      case 'ballon_chamoisine':
        this.synthDoorFriction(now, customGain);
        break;
      case 'talkie_walkie_bips':
        this.synthRadioBeeps(now, customGain);
        break;
      case 'vinyle_lointain':
        this.synthVinylCrackle(now, customGain);
        break;
      case 'psalmodie_lune':
        this.synthLunarChant(now, customGain);
        break;
      case 'hijo_de_la_luna_bells':
        this.synthHijoBells(now, customGain);
        break;
      case 'my_heart_will_go_on_flute':
        this.synthTitanicFlute(now, customGain);
        break;
      default:
        this.synthGenericPerc(now, 220, customGain);
        break;
    }
  }

  // 1. Choc jambe de bois sur parquet (piezo)
  private synthWoodenPegLeg(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    filter.Q.setValueAtTime(4.0, t);

    g.gain.setValueAtTime(1.2 * gainMul, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.tenDbDuckingGain);

    osc.start(t);
    osc.stop(t + 0.48);
  }

  // 2. Boîte tonnerre + feuille d'étain (roulement grave et fracas métallique)
  private synthThunderBox(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const bufferSize = this.ctx.sampleRate * 3.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise integration
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, t);
    filter.frequency.linearRampToValueAtTime(380, t + 0.4);
    filter.frequency.exponentialRampToValueAtTime(80, t + 3.0);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(1.0 * gainMul, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, t + 3.4);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.tenDbDuckingGain);

    noise.start(t);
    noise.stop(t + 3.5);
  }

  // 3. Tambour de l'océan + bouteille billes (mer, vagues, ressac)
  private synthOceanDrum(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const dur = 5.0;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(250, t);
    filter.frequency.linearRampToValueAtTime(700, t + 2.0); // Montée de vague
    filter.frequency.linearRampToValueAtTime(300, t + 4.8); // Ressac
    filter.Q.setValueAtTime(1.5, t);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.linearRampToValueAtTime(0.85 * gainMul, t + 1.8);
    g.gain.linearRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.tenDbDuckingGain);

    noise.start(t);
    noise.stop(t + dur);
  }

  // 4. Sifflet aztèque (cri strident et souffle chaotique)
  private synthAztecWhistle(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(860, t);
    osc1.frequency.linearRampToValueAtTime(1420, t + 0.8);
    osc1.frequency.exponentialRampToValueAtTime(620, t + 2.2);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(885, t); // Battement disharmonique violent
    osc2.frequency.linearRampToValueAtTime(1450, t + 0.8);
    osc2.frequency.exponentialRampToValueAtTime(640, t + 2.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(6.0, t);

    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.6 * gainMul, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(this.tenDbDuckingGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 2.6);
    osc2.stop(t + 2.6);
  }

  // 5. Sachet velours vert (vent doux)
  private synthVelvetWind(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const dur = 4.0;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(750, t + 1.5);
    filter.frequency.linearRampToValueAtTime(400, t + dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.linearRampToValueAtTime(0.5 * gainMul, t + 1.0);
    g.gain.linearRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.tenDbDuckingGain);

    noise.start(t);
    noise.stop(t + dur);
  }

  // 6. Bouteilles frangées (pluie et vent fort)
  private synthFringedBottlesRain(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const dur = 4.5;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Impulsions de crépitement
      data[i] = Math.random() < 0.15 ? (Math.random() * 2 - 1) * 0.8 : 0;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1500, t);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.linearRampToValueAtTime(0.7 * gainMul, t + 0.8);
    g.gain.linearRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.tenDbDuckingGain);

    noise.start(t);
    noise.stop(t + dur);
  }

  // 7. Flûte traversière & claquage mécanique
  private synthFluteClick(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // Ré 5
    osc.frequency.exponentialRampToValueAtTime(880, t + 1.2);

    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.45 * gainMul, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

    // Claquage mécanique sec
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(220, t);
    clickGain.gain.setValueAtTime(0.6 * gainMul, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    clickOsc.connect(clickGain);
    clickGain.connect(this.tenDbDuckingGain);
    clickOsc.start(t);
    clickOsc.stop(t + 0.06);

    osc.connect(g);
    g.connect(this.tenDbDuckingGain);
    osc.start(t);
    osc.stop(t + 2.3);
  }

  // 8. Grincements de bois de navire
  private synthCreakingWood(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.linearRampToValueAtTime(190, t + 0.4);
    osc.frequency.linearRampToValueAtTime(120, t + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, t);
    filter.Q.setValueAtTime(7.0, t);

    g.gain.setValueAtTime(0.1, t);
    g.gain.linearRampToValueAtTime(0.55 * gainMul, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.tenDbDuckingGain);

    osc.start(t);
    osc.stop(t + 1.9);
  }

  // 9. Cloches de bateau frappées
  private synthShipBells(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const partials = [440, 885, 1340, 1795, 2380];
    const decays = [2.8, 2.2, 1.8, 1.3, 0.9];

    partials.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const amp = (0.4 / (idx + 1)) * gainMul;
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decays[idx]);

      osc.connect(g);
      g.connect(this.tenDbDuckingGain!);

      osc.start(t);
      osc.stop(t + decays[idx]);
    });
  }

  // 10. Bélier sur porte (stompbox)
  private synthStompboxRam(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.35);

    g.gain.setValueAtTime(1.5 * gainMul, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(g);
    g.connect(this.tenDbDuckingGain);

    osc.start(t);
    osc.stop(t + 0.75);
  }

  // 11. Grincement de porte (ballon de baudruche + chamoisine)
  private synthDoorFriction(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.linearRampToValueAtTime(980, t + 0.6);
    osc.frequency.linearRampToValueAtTime(540, t + 1.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(8.0, t);

    g.gain.setValueAtTime(0.1, t);
    g.gain.linearRampToValueAtTime(0.45 * gainMul, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.tenDbDuckingGain);

    osc.start(t);
    osc.stop(t + 2.1);
  }

  // 12. Bips talkie-walkie régie (bip court, bip long)
  private synthRadioBeeps(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    // Bip court 1
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1750, t);
    g1.gain.setValueAtTime(0.4 * gainMul, t);
    g1.gain.setValueAtTime(0, t + 0.12);
    osc1.connect(g1);
    g1.connect(this.tenDbDuckingGain);
    osc1.start(t);
    osc1.stop(t + 0.13);

    // Bip court 2
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1750, t + 0.22);
    g2.gain.setValueAtTime(0.4 * gainMul, t + 0.22);
    g2.gain.setValueAtTime(0, t + 0.34);
    osc2.connect(g2);
    g2.connect(this.tenDbDuckingGain);
    osc2.start(t + 0.22);
    osc2.stop(t + 0.35);
  }

  // 13. Vinyle lointain
  private synthVinylCrackle(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const dur = 6.0;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() < 0.02 ? (Math.random() * 2 - 1) * 0.3 : (Math.random() - 0.5) * 0.02;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3 * gainMul, t);
    g.gain.linearRampToValueAtTime(0.001, t + dur);

    noise.connect(g);
    g.connect(this.tenDbDuckingGain);
    noise.start(t);
    noise.stop(t + dur);
  }

  // 14. Psalmodie des enfants de la lune
  private synthLunarChant(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const chords = [220, 261.63, 329.63, 392.0]; // Am7
    chords.forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);

      g.gain.setValueAtTime(0.01, t);
      g.gain.linearRampToValueAtTime(0.25 * gainMul, t + 1.5);
      g.gain.exponentialRampToValueAtTime(0.001, t + 5.5);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.tenDbDuckingGain!);

      osc.start(t);
      osc.stop(t + 5.6);
    });
  }

  // 15. Hijo de la luna bells
  private synthHijoBells(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const notes = [587.33, 659.25, 783.99, 880.0];
    notes.forEach((f, i) => {
      const startTime = t + i * 0.35;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, startTime);

      g.gain.setValueAtTime(0.4 * gainMul, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

      osc.connect(g);
      g.connect(this.tenDbDuckingGain!);
      osc.start(startTime);
      osc.stop(startTime + 1.3);
    });
  }

  // 16. Titanic Flute
  private synthTitanicFlute(t: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const notes = [440, 493.88, 554.37, 659.25];
    notes.forEach((f, i) => {
      const startTime = t + i * 0.6;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      g.gain.setValueAtTime(0.01, startTime);
      g.gain.linearRampToValueAtTime(0.35 * gainMul, startTime + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      osc.connect(g);
      g.connect(this.tenDbDuckingGain!);
      osc.start(startTime);
      osc.stop(startTime + 0.85);
    });
  }

  private synthGenericPerc(t: number, freq: number, gainMul: number) {
    if (!this.ctx || !this.tenDbDuckingGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.5 * gainMul, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g);
    g.connect(this.tenDbDuckingGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }
}

export const livingAudio = new LivingScenographyAudioEngine();
