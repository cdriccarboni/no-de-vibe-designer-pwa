// Moteur Natif de Surtitrage Professionnel & Karaoké No[co]de
// Inspiré de la philosophie de Glypheo (créé par l'équipe de Millumin)
// 100% Natif, Offline-First, Multi-langues, Multi-écrans, Cues TOP, MIDI/OSC,
// Mode Karaoké mot-à-mot progressif et fenêtre de projection dédiée.

export interface KaraokeWord {
  id: string;
  word: string;
  startOffset: number; // en secondes par rapport au début du surtitre
  duration: number;    // en secondes
}

export interface SurtitreItem {
  id: string;
  number: number;
  texts: Record<string, string>; // { fr: "Bonjour", en: "Hello", it: "Buongiorno" }
  character?: string;            // ex: "Figaro", "La Reine de la Nuit", "Pirate"
  notes?: string;                // Didascalie scénique
  timecodeIn?: number;           // en secondes
  timecodeOut?: number;          // en secondes
  karaokeWords?: KaraokeWord[];  // Découpage karaoké optionnel
}

export interface SurtitrageScreen {
  id: string;
  name: string;
  targetLanguage: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  highlightColor: string; // Pour le karaoké chanté
  bgColor: string;        // Fond (transparent, noir 50%, etc.)
  positionY: 'top' | 'center' | 'bottom';
  alignment: 'left' | 'center' | 'right';
  transition: 'cut' | 'fade' | 'slide';
  transitionDurationMs: number;
  isBlackout: boolean;
}

export const INITIAL_SURTITRES_PIRATES: SurtitreItem[] = [
  {
    id: 'cue-1',
    number: 1,
    character: 'Capitaine Paillette',
    texts: {
      fr: 'Bienvenue à bord du vaisseau ! La radio pirate prend le contrôle des ondes !',
      en: 'Welcome aboard the ship! Pirate radio takes control of the airwaves!',
      it: 'Benvenuti a bordo della nave! La radio pirata prende il controllo delle onde!',
    },
    notes: 'TOP Lumière 1 — Début de la transmission radio',
    karaokeWords: [
      { id: 'w1', word: 'Bienvenue', startOffset: 0.0, duration: 0.6 },
      { id: 'w2', word: 'à', startOffset: 0.6, duration: 0.2 },
      { id: 'w3', word: 'bord', startOffset: 0.8, duration: 0.4 },
      { id: 'w4', word: 'du', startOffset: 1.2, duration: 0.3 },
      { id: 'w5', word: 'vaisseau', startOffset: 1.5, duration: 0.8 },
      { id: 'w6', word: '!', startOffset: 2.3, duration: 0.2 },
    ],
  },
  {
    id: 'cue-2',
    number: 2,
    character: 'Moussaillon Scintillant',
    texts: {
      fr: 'Les vagues phosphorescentes s’élèvent au rythme de nos chants métalliques.',
      en: 'The phosphorescent waves rise to the rhythm of our metallic songs.',
      it: 'Le onde fosforescenti si alzano al ritmo dei nostri canti metallici.',
    },
    notes: 'Bruitage en direct des cordages et des sabres',
    karaokeWords: [
      { id: 'w1', word: 'Les', startOffset: 0.0, duration: 0.3 },
      { id: 'w2', word: 'vagues', startOffset: 0.3, duration: 0.7 },
      { id: 'w3', word: 'phosphorescentes', startOffset: 1.0, duration: 1.2 },
    ],
  },
  {
    id: 'cue-3',
    number: 3,
    character: 'Chœur de l’Équipage',
    texts: {
      fr: 'Ho, matelots ! Que la nuit scintille et que la tempête nous guide !',
      en: 'Ho, sailors! May the night sparkle and the storm guide us!',
      it: 'Oh, marinai! Che la notte scintilli e che la tempesta ci guidi!',
    },
    notes: 'TOP CUE 3 — Déclenchement de la houle GLSL',
    karaokeWords: [
      { id: 'w1', word: 'Ho,', startOffset: 0.0, duration: 0.5 },
      { id: 'w2', word: 'matelots', startOffset: 0.5, duration: 0.8 },
      { id: 'w3', word: '!', startOffset: 1.3, duration: 0.2 },
      { id: 'w4', word: 'Que', startOffset: 1.5, duration: 0.3 },
      { id: 'w5', word: 'la', startOffset: 1.8, duration: 0.2 },
      { id: 'w6', word: 'nuit', startOffset: 2.0, duration: 0.6 },
      { id: 'w7', word: 'scintille', startOffset: 2.6, duration: 0.8 },
    ],
  },
  {
    id: 'cue-4',
    number: 4,
    character: 'Capitaine Paillette',
    texts: {
      fr: 'Régie, commutez le voyant ON AIR ! Nous sommes en direct pour l’éternité.',
      en: 'Control room, switch ON AIR! We are live for eternity.',
      it: 'Regia, accendete il segnale ON AIR! Siamo in diretta per l’eternità.',
    },
    notes: 'Bascule voyant rouge ON AIR sur le bus de diffusion',
  },
];

export const INITIAL_SCREENS: SurtitrageScreen[] = [
  {
    id: 'screen-stage',
    name: 'Écran Scène (Cintre / Fronton)',
    targetLanguage: 'fr',
    fontSize: 42,
    fontFamily: 'Plus Jakarta Sans',
    textColor: '#ffffff',
    highlightColor: '#d7b86a',
    bgColor: 'rgba(0, 0, 0, 0.4)',
    positionY: 'bottom',
    alignment: 'center',
    transition: 'fade',
    transitionDurationMs: 300,
    isBlackout: false,
  },
  {
    id: 'screen-regie',
    name: 'Moniteur Régie & Souffleur',
    targetLanguage: 'en',
    fontSize: 28,
    fontFamily: 'JetBrains Mono',
    textColor: '#8fa79d',
    highlightColor: '#38bdf8',
    bgColor: '#090b0d',
    positionY: 'center',
    alignment: 'left',
    transition: 'cut',
    transitionDurationMs: 0,
    isBlackout: false,
  },
];

class SurtitrageEngine {
  private cues: SurtitreItem[] = [...INITIAL_SURTITRES_PIRATES];
  private screens: SurtitrageScreen[] = [...INITIAL_SCREENS];
  private activeCueIndex = 0;
  private isBlackout = false;
  private isPaused = false;
  private currentPlayheadSec = 0; // Pour le karaoké en temps réel
  private isKaraokePlaying = false;
  private karaokeTimer: number | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedCues = localStorage.getItem('nocode_surtitres_cues');
      if (storedCues) {
        this.cues = JSON.parse(storedCues);
      }
      const storedScreens = localStorage.getItem('nocode_surtitres_screens');
      if (storedScreens) {
        this.screens = JSON.parse(storedScreens);
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('nocode_surtitres_cues', JSON.stringify(this.cues));
      localStorage.setItem('nocode_surtitres_screens', JSON.stringify(this.screens));
    } catch {
      // ignore
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((l) => l());
  }

  // -------------------------------------------------------------
  // CONDUITE DE SPECTACLE (GO, PREVIOUS, BLACKOUT, PANIC)
  // -------------------------------------------------------------

  public goNext() {
    if (this.activeCueIndex < this.cues.length - 1) {
      this.activeCueIndex++;
      this.currentPlayheadSec = 0;
      this.isBlackout = false;
      this.notify();
    }
  }

  public goPrevious() {
    if (this.activeCueIndex > 0) {
      this.activeCueIndex--;
      this.currentPlayheadSec = 0;
      this.isBlackout = false;
      this.notify();
    }
  }

  public goToCue(index: number) {
    if (index >= 0 && index < this.cues.length) {
      this.activeCueIndex = index;
      this.currentPlayheadSec = 0;
      this.isBlackout = false;
      this.notify();
    }
  }

  public toggleBlackout() {
    this.isBlackout = !this.isBlackout;
    this.notify();
  }

  public setBlackout(val: boolean) {
    this.isBlackout = val;
    this.notify();
  }

  public getActiveCue(): SurtitreItem | null {
    return this.cues[this.activeCueIndex] || null;
  }

  public getNextCue(): SurtitreItem | null {
    return this.cues[this.activeCueIndex + 1] || null;
  }

  public getActiveCueIndex(): number {
    return this.activeCueIndex;
  }

  public getCues(): SurtitreItem[] {
    return this.cues;
  }

  public getScreens(): SurtitrageScreen[] {
    return this.screens;
  }

  public isBlackoutActive(): boolean {
    return this.isBlackout;
  }

  // -------------------------------------------------------------
  // GESTION DU KARAOKÉ SYNCHRONE
  // -------------------------------------------------------------

  public startKaraokePlayback() {
    this.isKaraokePlaying = true;
    if (this.karaokeTimer !== null) {
      window.clearInterval(this.karaokeTimer);
    }
    this.karaokeTimer = window.setInterval(() => {
      this.currentPlayheadSec += 0.05;
      this.notify();
    }, 50);
  }

  public stopKaraokePlayback() {
    this.isKaraokePlaying = false;
    if (this.karaokeTimer !== null) {
      window.clearInterval(this.karaokeTimer);
      this.karaokeTimer = null;
    }
    this.currentPlayheadSec = 0;
    this.notify();
  }

  public getKaraokePlayhead(): number {
    return this.currentPlayheadSec;
  }

  public isKaraokeActive(): boolean {
    return this.isKaraokePlaying;
  }

  // -------------------------------------------------------------
  // ÉDITION DES SURTITRES & TEXTES
  // -------------------------------------------------------------

  public updateCueText(index: number, language: string, text: string) {
    if (this.cues[index]) {
      this.cues[index].texts[language] = text;
      this.notify();
    }
  }

  public updateCueCharacter(index: number, character: string) {
    if (this.cues[index]) {
      this.cues[index].character = character;
      this.notify();
    }
  }

  public updateCueNotes(index: number, notes: string) {
    if (this.cues[index]) {
      this.cues[index].notes = notes;
      this.notify();
    }
  }

  public addCue(afterIndex?: number): SurtitreItem {
    const idx = afterIndex !== undefined ? afterIndex + 1 : this.cues.length;
    const newCue: SurtitreItem = {
      id: `cue-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      number: idx + 1,
      texts: {
        fr: 'Nouveau surtitre...',
        en: 'New subtitle...',
      },
    };
    this.cues.splice(idx, 0, newCue);
    this.renumberCues();
    this.notify();
    return newCue;
  }

  public removeCue(index: number) {
    if (this.cues.length > 1) {
      this.cues.splice(index, 1);
      if (this.activeCueIndex >= this.cues.length) {
        this.activeCueIndex = this.cues.length - 1;
      }
      this.renumberCues();
      this.notify();
    }
  }

  private renumberCues() {
    this.cues.forEach((c, i) => {
      c.number = i + 1;
    });
  }

  // -------------------------------------------------------------
  // IMPORTS (SRT, VTT, TXT, WORD/EXCEL COPIER-COLLER)
  // -------------------------------------------------------------

  public importSRT(content: string, language = 'fr'): number {
    const blocks = content.replace(/\r\n/g, '\n').split('\n\n');
    const newCues: SurtitreItem[] = [];

    blocks.forEach((blk, idx) => {
      const lines = blk.trim().split('\n');
      if (lines.length >= 2) {
        // Line 0: number, Line 1: 00:00:01,000 --> 00:00:04,000, Line 2+: text
        const textLines = lines.slice(2).join(' ').trim();
        if (textLines) {
          newCues.push({
            id: `cue-srt-${idx + 1}-${Date.now()}`,
            number: idx + 1,
            texts: { [language]: textLines },
          });
        }
      }
    });

    if (newCues.length > 0) {
      this.cues = newCues;
      this.activeCueIndex = 0;
      this.notify();
      return newCues.length;
    }
    return 0;
  }

  public importPlainLines(linesText: string, language = 'fr'): number {
    const lines = linesText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length > 0) {
      this.cues = lines.map((line, idx) => ({
        id: `cue-line-${idx + 1}-${Date.now()}`,
        number: idx + 1,
        texts: { [language]: line },
      }));
      this.activeCueIndex = 0;
      this.notify();
      return this.cues.length;
    }
    return 0;
  }

  // -------------------------------------------------------------
  // CONFIGURATION DES ÉCRANS
  // -------------------------------------------------------------

  public updateScreen(screenId: string, partial: Partial<SurtitrageScreen>) {
    const s = this.screens.find((sc) => sc.id === screenId);
    if (s) {
      Object.assign(s, partial);
      this.notify();
    }
  }

  public resetToDefaultShow() {
    this.cues = [...INITIAL_SURTITRES_PIRATES];
    this.screens = [...INITIAL_SCREENS];
    this.activeCueIndex = 0;
    this.isBlackout = false;
    this.notify();
  }
}

export const surtitrageEngine = new SurtitrageEngine();
