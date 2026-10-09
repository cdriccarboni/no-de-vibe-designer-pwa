// Service CMS Pages Spectacle ART & Habillage "Vraie Fausse Radio"
// No[co]de Vibe Designer — Priorité Absolue P00 : Broadcast Radio Public Internet
// Gère l'administration des pages spectacle (/radio-pirate, /radio-paillettes, etc.),
// l'habillage théâtral, les jingles en direct, le statut ON AIR / HORS ANTENNE,
// et la compatibilité d'écoute publique 4G/5G mondiale.

import { radioAudioEngine } from './radioAudioEngine';

export interface TheatricalJingle {
  id: string;
  name: string;
  description: string;
  durationSec: number;
  type: 'static' | 'time_pips' | 'bell' | 'siren' | 'morse';
}

export interface ArtShowRadioPage {
  id: string;
  slug: string; // ex: "radio-pirate", "radio-paillettes"
  stationName: string; // ex: "Radio Pirate des Caraïbes — 104.7 FM"
  frequencyDial: string; // ex: "104.7 MHz FM / Onde Courte"
  tagline: string; // ex: "La voix clandestine des mutins de la scène"
  showTitle: string; // ex: "Spectacle : Pirates Paillettes"
  hostName: string; // ex: "Capitaine Barbe-Rose & L'Équipage"
  badgeIcon: 'skull' | 'waves' | 'mic' | 'anchor' | 'sparkles';
  themeAccent: string; // '#d7b86a' | '#ef4444' | '#38bdf8' | '#a855f7'
  synopsis: string;
  scheduleText: string; // ex: "Diffusé uniquement les soirs de spectacle à 20h30"
  isLive: boolean; // Statut ON AIR effectif
  onlyShowDays: boolean; // Diffusion uniquement les jours de spectacle
  streamRelayUrl?: string; // Relais distant personnalisé si hébergé hors serveur local
  lastAirTime?: number;
}

export const OFFICIAL_THEATRICAL_JINGLES: TheatricalJingle[] = [
  {
    id: 'jingle-static',
    name: 'Friture & Onde Courte Clandestine',
    description: 'Sifflement de syntonisation analogique et souffle radio AM des années 40',
    durationSec: 3.5,
    type: 'static',
  },
  {
    id: 'jingle-time-pips',
    name: 'Top Horaire Régie (3 Bips)',
    description: 'Signal horaire théâtral officiel avant la prise d’antenne',
    durationSec: 2.5,
    type: 'time_pips',
  },
  {
    id: 'jingle-bell',
    name: 'Cloche de Quart Pirate',
    description: 'Double coup de cloche de navire pirate pour annoncer le capitaine',
    durationSec: 3.0,
    type: 'bell',
  },
  {
    id: 'jingle-siren',
    name: 'Corne de Brume & Alerte Tempête',
    description: 'Avertissement sonore grave résonnant dans la brume du plateau',
    durationSec: 4.0,
    type: 'siren',
  },
  {
    id: 'jingle-morse',
    name: 'Signal Morse Mutinerie',
    description: 'Télégraphe secret codé diffusé avant l’abordage',
    durationSec: 3.0,
    type: 'morse',
  },
];

export const INITIAL_ART_PAGES: ArtShowRadioPage[] = [
  {
    id: 'page-radio-pirate',
    slug: 'radio-pirate',
    stationName: 'Radio Pirate des Caraïbes — 104.7 FM',
    frequencyDial: '104.7 MHz FM / Onde Courte Clandestine',
    tagline: 'La fréquence clandestine émise depuis la cale du navire mutin',
    showTitle: 'Spectacle : Pirates Paillettes',
    hostName: 'Capitaine Barbe-Rose & Les Corsaires',
    badgeIcon: 'skull',
    themeAccent: '#d7b86a',
    synopsis: 'Diffusion clandestine pirate en direct du plateau. Les comédiens piratent les ondes pour raconter la mutinerie, défier l’Amirauté et faire résonner la houle bioluminescente.',
    scheduleText: 'Émission clandestine en direct uniquement les soirs de représentation.',
    isLive: false,
    onlyShowDays: true,
  },
  {
    id: 'page-radio-paillettes',
    slug: 'radio-paillettes',
    stationName: 'Radio Paillettes en grève — 98.4 FM',
    frequencyDial: '98.4 MHz FM / Fréquence Scénique',
    tagline: 'La voix libre des artistes et artisans du spectacle',
    showTitle: 'Spectacle : Pirates Paillettes (Acte II)',
    hostName: 'Maxime & La Troupe Insoumise',
    badgeIcon: 'waves',
    themeAccent: '#ef4444',
    synopsis: 'Les artistes en lutte prennent le micro en direct entre deux scènes. Analyses de transitoires acoustiques, bruits de sabre et chants marins pailletés.',
    scheduleText: 'ON AIR pendant les scènes de tempête et le bal des épaves.',
    isLive: false,
    onlyShowDays: true,
  },
  {
    id: 'page-radio-live',
    slug: 'radio',
    stationName: 'Radio Régie No[co]de Studio',
    frequencyDial: 'Flux Numérique HD Opus 192kbps',
    tagline: 'Canal direct de la régie sonore et scénographique',
    showTitle: 'Régie Générale du Spectacle',
    hostName: 'Régie Sonore No[co]de',
    badgeIcon: 'mic',
    themeAccent: '#38bdf8',
    synopsis: 'Canal audio public pour le public du théâtre, les répétitions ouvertes et l’écoute au casque dans la salle.',
    scheduleText: 'Disponible pendant les répétitions et représentations.',
    isLive: false,
    onlyShowDays: false,
  },
];

class ArtRadioCmsEngine {
  private pages: ArtShowRadioPage[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nocode_art_radio_pages_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.pages = parsed;
            return;
          }
        }
      }
    } catch {
      // ignore
    }
    this.pages = JSON.parse(JSON.stringify(INITIAL_ART_PAGES));
  }

  private saveState() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nocode_art_radio_pages_v1', JSON.stringify(this.pages));
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
  // GESTION DES PAGES DU SITE ART
  // -------------------------------------------------------------

  public getPages(): ArtShowRadioPage[] {
    return this.pages;
  }

  public getPageBySlug(slug: string): ArtShowRadioPage | null {
    const clean = slug.toLowerCase().replace(/^\/+/, '');
    return this.pages.find((p) => p.slug === clean) || null;
  }

  public createPage(data: Partial<ArtShowRadioPage>): ArtShowRadioPage {
    const rawSlug = data.slug || `radio-${Date.now().toString(36)}`;
    const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    const newPage: ArtShowRadioPage = {
      id: `page-${Date.now().toString(36)}`,
      slug: cleanSlug,
      stationName: data.stationName || `Radio /${cleanSlug}`,
      frequencyDial: data.frequencyDial || '102.5 FM Stéréo',
      tagline: data.tagline || 'Fréquence de spectacle en direct',
      showTitle: data.showTitle || 'Spectacle No[co]de',
      hostName: data.hostName || 'Régie & Comédiens',
      badgeIcon: data.badgeIcon || 'waves',
      themeAccent: data.themeAccent || '#d7b86a',
      synopsis: data.synopsis || 'Diffusion en direct du spectacle.',
      scheduleText: data.scheduleText || 'Diffusé uniquement les soirs de représentation.',
      isLive: false,
      onlyShowDays: data.onlyShowDays ?? true,
    };

    this.pages.push(newPage);
    this.notify();
    return newPage;
  }

  public updatePage(slug: string, updates: Partial<ArtShowRadioPage>) {
    const page = this.getPageBySlug(slug);
    if (page) {
      Object.assign(page, updates);
      this.notify();
    }
  }

  public deletePage(slug: string) {
    const clean = slug.toLowerCase().replace(/^\/+/, '');
    this.pages = this.pages.filter((p) => p.slug !== clean);
    this.notify();
  }

  public setPageLiveStatus(slug: string, isLive: boolean) {
    const page = this.getPageBySlug(slug);
    if (page) {
      page.isLive = isLive;
      if (isLive) page.lastAirTime = Date.now();
      this.notify();
    }
  }

  // -------------------------------------------------------------
  // JINGLES THÉÂTRAUX EN DIRECT (SYNTHÈSE WEB AUDIO SUR LE BUS)
  // -------------------------------------------------------------

  public playTheatricalJingle(jingleId: string) {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (jingleId === 'jingle-static') {
        // Synthèse bruit de friture AM + sifflement
        const bufferSize = ctx.sampleRate * 2.5;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 2.0);
        filter.Q.value = 6;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.3);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

        // Whistle
        const whistle = ctx.createOscillator();
        whistle.type = 'sine';
        whistle.frequency.setValueAtTime(2400, now);
        whistle.frequency.exponentialRampToValueAtTime(950, now + 1.8);
        const whistleGain = ctx.createGain();
        whistleGain.gain.setValueAtTime(0.12, now);
        whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        whistle.connect(whistleGain);
        whistleGain.connect(masterGain);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);

        whiteNoise.start(now);
        whistle.start(now);
        whistle.stop(now + 2.5);
      } else if (jingleId === 'jingle-time-pips') {
        // 3 bips à 1000 Hz puis 1 bip à 2000 Hz
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 1000;
          const t = now + i * 0.5;
          g.gain.setValueAtTime(0.3, t);
          g.gain.setValueAtTime(0, t + 0.1);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.12);
        }
        // Bip final
        const finalOsc = ctx.createOscillator();
        const finalG = ctx.createGain();
        finalOsc.type = 'sine';
        finalOsc.frequency.value = 2000;
        const finalT = now + 1.5;
        finalG.gain.setValueAtTime(0.4, finalT);
        finalG.gain.setValueAtTime(0, finalT + 0.4);
        finalOsc.connect(finalG);
        finalG.connect(masterGain);
        finalOsc.start(finalT);
        finalOsc.stop(finalT + 0.45);
      } else if (jingleId === 'jingle-bell') {
        // Cloche marine FM double coup
        [0, 0.4].forEach((delay) => {
          const carrier = ctx.createOscillator();
          const mod = ctx.createOscillator();
          const modGain = ctx.createGain();
          const bellGain = ctx.createGain();

          carrier.type = 'sine';
          carrier.frequency.setValueAtTime(880, now + delay);

          mod.type = 'sine';
          mod.frequency.setValueAtTime(276, now + delay);
          modGain.gain.setValueAtTime(800, now + delay);
          modGain.gain.exponentialRampToValueAtTime(1, now + delay + 1.5);

          mod.connect(modGain);
          modGain.connect(carrier.frequency);

          bellGain.gain.setValueAtTime(0.4, now + delay);
          bellGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.8);

          carrier.connect(bellGain);
          bellGain.connect(masterGain);

          mod.start(now + delay);
          carrier.start(now + delay);
          mod.stop(now + delay + 1.9);
          carrier.stop(now + delay + 1.9);
        });
      } else if (jingleId === 'jingle-siren') {
        // Corne de brume
        const horn = ctx.createOscillator();
        const hornGain = ctx.createGain();
        horn.type = 'sawtooth';
        horn.frequency.setValueAtTime(110, now);
        horn.frequency.linearRampToValueAtTime(105, now + 3.0);

        const hornFilter = ctx.createBiquadFilter();
        hornFilter.type = 'lowpass';
        hornFilter.frequency.setValueAtTime(320, now);

        hornGain.gain.setValueAtTime(0.01, now);
        hornGain.gain.linearRampToValueAtTime(0.4, now + 0.5);
        hornGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

        horn.connect(hornFilter);
        hornFilter.connect(hornGain);
        hornGain.connect(masterGain);

        horn.start(now);
        horn.stop(now + 3.6);
      } else if (jingleId === 'jingle-morse') {
        // Code morse rapide
        const morsePattern = [1, 0, 1, 0, 1, 0, 3, 0, 1, 0, 1];
        let tOffset = 0;
        morsePattern.forEach((duration) => {
          if (duration > 0) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 750;
            const startT = now + tOffset;
            const dur = duration * 0.08;
            g.gain.setValueAtTime(0.3, startT);
            g.gain.setValueAtTime(0, startT + dur);
            osc.connect(g);
            g.connect(masterGain);
            osc.start(startT);
            osc.stop(startT + dur + 0.02);
            tOffset += dur + 0.06;
          } else {
            tOffset += 0.08;
          }
        });
      }

      // Émettre un signal pour la régie
      window.dispatchEvent(
        new CustomEvent('nocode_jingle_played', {
          detail: { jingleId, timestamp: Date.now() },
        })
      );
    } catch {
      // ignore
    }
  }
}

export const artRadioCmsEngine = new ArtRadioCmsEngine();
