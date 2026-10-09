// Moteur de Personnalisation Graphique & Thèmes No[co]de
// Directive permanente : Préservation du thème officiel par défaut,
// personnalisation totale sans altérer les rendus de projection.

export interface NoCodeTheme {
  id: string;
  name: string;
  description: string;
  isOfficial?: boolean;
  colors: {
    // Fond et structure
    bgRoot: string;
    bgPanel: string;
    bgHeader: string;
    border: string;

    // Accents & Identité
    accentPrimary: string;
    accentSecondary: string;
    accentHighlight: string;

    // Blocs de Patch & Catégories
    blockGenerative: string;
    blockAudio: string;
    blockVisualFx: string;
    blockControl: string;
    blockOutput: string;

    // Câbles & Connexions
    wireData: string;
    wireAudio: string;
    wireVideo: string;
    wirePulse: string;

    // Timeline & TOP
    timelineTrackBg: string;
    timelinePlayhead: string;
    timelineClipDefault: string;
  };
}

export const OFFICIAL_THEME: NoCodeTheme = {
  id: 'official-nocode-dark',
  name: 'No[co]de Vibe Designer — Officiel',
  description: 'Thème de référence sombre, contrasté et calibré pour la régie de spectacle.',
  isOfficial: true,
  colors: {
    bgRoot: '#09090b',
    bgPanel: '#14171a',
    bgHeader: '#0e1115',
    border: '#27272a',

    accentPrimary: '#38bdf8', // Cyan
    accentSecondary: '#d7b86a', // Or scénique
    accentHighlight: '#34d399', // Émeraude

    blockGenerative: '#0ea5e9',
    blockAudio: '#a855f7',
    blockVisualFx: '#f43f5e',
    blockControl: '#f59e0b',
    blockOutput: '#10b981',

    wireData: '#38bdf8',
    wireAudio: '#c084fc',
    wireVideo: '#fb7185',
    wirePulse: '#fbbf24',

    timelineTrackBg: '#111418',
    timelinePlayhead: '#ef4444',
    timelineClipDefault: '#1e293b',
  },
};

export const PRESET_THEMES: NoCodeTheme[] = [
  OFFICIAL_THEME,
  {
    id: 'pirate-amber',
    name: 'Ambre Pirate & Bois Sombre',
    description: 'Palette chaude inspirée du pont de navire, de l\'acajou et des lanternes de mer.',
    colors: {
      bgRoot: '#0a0806',
      bgPanel: '#17120c',
      bgHeader: '#120d09',
      border: '#382a1d',

      accentPrimary: '#f59e0b',
      accentSecondary: '#d97706',
      accentHighlight: '#fbbf24',

      blockGenerative: '#d97706',
      blockAudio: '#b45309',
      blockVisualFx: '#ea580c',
      blockControl: '#eab308',
      blockOutput: '#84cc16',

      wireData: '#f59e0b',
      wireAudio: '#d97706',
      wireVideo: '#ea580c',
      wirePulse: '#fde047',

      timelineTrackBg: '#130e09',
      timelinePlayhead: '#ea580c',
      timelineClipDefault: '#291e13',
    },
  },
  {
    id: 'paillettes-synthwave',
    name: 'Paillettes & Néon Synthwave',
    description: 'Fuchsia éclatant, violet profond et cyan pour les performances glamour et pop.',
    colors: {
      bgRoot: '#0d0714',
      bgPanel: '#180e24',
      bgHeader: '#120a1b',
      border: '#3b1c56',

      accentPrimary: '#ec4899',
      accentSecondary: '#06b6d4',
      accentHighlight: '#a855f7',

      blockGenerative: '#ec4899',
      blockAudio: '#8b5cf6',
      blockVisualFx: '#f43f5e',
      blockControl: '#06b6d4',
      blockOutput: '#10b981',

      wireData: '#f472b6',
      wireAudio: '#c084fc',
      wireVideo: '#22d3ee',
      wirePulse: '#fb7185',

      timelineTrackBg: '#140c1e',
      timelinePlayhead: '#ec4899',
      timelineClipDefault: '#2b163e',
    },
  },
  {
    id: 'cyber-hydra',
    name: 'Cyberpunk Hydra & Laser',
    description: 'Vert matrix vibrant et néons froids pour l\'art génératif GLSL et les raves.',
    colors: {
      bgRoot: '#050a07',
      bgPanel: '#0a1610',
      bgHeader: '#08110c',
      border: '#143825',

      accentPrimary: '#10b981',
      accentSecondary: '#06b6d4',
      accentHighlight: '#a3e635',

      blockGenerative: '#10b981',
      blockAudio: '#06b6d4',
      blockVisualFx: '#84cc16',
      blockControl: '#f59e0b',
      blockOutput: '#22c55e',

      wireData: '#34d399',
      wireAudio: '#38bdf8',
      wireVideo: '#a3e635',
      wirePulse: '#facc15',

      timelineTrackBg: '#09130d',
      timelinePlayhead: '#10b981',
      timelineClipDefault: '#12251a',
    },
  },
  {
    id: 'minimal-charcoal',
    name: 'Théâtre Carbone Neutre',
    description: 'Élégance discrète en noir mat et gris chaud pour ne pas éblouir le régisseur.',
    colors: {
      bgRoot: '#0d0e11',
      bgPanel: '#14161a',
      bgHeader: '#101215',
      border: '#252930',

      accentPrimary: '#94a3b8',
      accentSecondary: '#cbd5e1',
      accentHighlight: '#38bdf8',

      blockGenerative: '#64748b',
      blockAudio: '#78716c',
      blockVisualFx: '#71717a',
      blockControl: '#a1a1aa',
      blockOutput: '#52525b',

      wireData: '#94a3b8',
      wireAudio: '#a8a29e',
      wireVideo: '#a1a1aa',
      wirePulse: '#cbd5e1',

      timelineTrackBg: '#111317',
      timelinePlayhead: '#f87171',
      timelineClipDefault: '#1f2329',
    },
  },
];

class ThemeEngine {
  private currentTheme: NoCodeTheme = OFFICIAL_THEME;
  private customThemes: NoCodeTheme[] = [];
  private listeners: Set<(theme: NoCodeTheme) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.applyToDOM(this.currentTheme);
  }

  private loadFromStorage() {
    try {
      const storedThemeId = localStorage.getItem('nocode_active_theme_id');
      const storedCustom = localStorage.getItem('nocode_custom_themes');

      if (storedCustom) {
        this.customThemes = JSON.parse(storedCustom);
      }

      if (storedThemeId) {
        const found =
          PRESET_THEMES.find((t) => t.id === storedThemeId) ||
          this.customThemes.find((t) => t.id === storedThemeId);
        if (found) {
          this.currentTheme = found;
        }
      }
    } catch {
      this.currentTheme = OFFICIAL_THEME;
    }
  }

  public getTheme(): NoCodeTheme {
    return this.currentTheme;
  }

  public getAllThemes(): NoCodeTheme[] {
    return [...PRESET_THEMES, ...this.customThemes];
  }

  public setTheme(theme: NoCodeTheme) {
    this.currentTheme = theme;
    this.applyToDOM(theme);
    try {
      localStorage.setItem('nocode_active_theme_id', theme.id);
    } catch {
      // ignore
    }
    this.notify();
  }

  public resetToOfficial() {
    this.setTheme(OFFICIAL_THEME);
  }

  public saveCustomTheme(theme: NoCodeTheme) {
    const existingIndex = this.customThemes.findIndex((t) => t.id === theme.id);
    if (existingIndex >= 0) {
      this.customThemes[existingIndex] = theme;
    } else {
      this.customThemes.push(theme);
    }
    try {
      localStorage.setItem('nocode_custom_themes', JSON.stringify(this.customThemes));
    } catch {
      // ignore
    }
    this.setTheme(theme);
  }

  public exportCurrentThemeAsJson(): string {
    return JSON.stringify(this.currentTheme, null, 2);
  }

  public importThemeFromJson(jsonStr: string): NoCodeTheme {
    const parsed = JSON.parse(jsonStr) as NoCodeTheme;
    if (!parsed.id || !parsed.colors) {
      throw new Error('Fichier de thème JSON invalide.');
    }
    parsed.id = `custom-${Date.now()}`;
    this.saveCustomTheme(parsed);
    return parsed;
  }

  public subscribe(cb: (theme: NoCodeTheme) => void): () => void {
    this.listeners.add(cb);
    cb(this.currentTheme);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    for (const cb of this.listeners) {
      cb(this.currentTheme);
    }
  }

  // Applique les variables CSS sur le document root pour la réactivité totale
  private applyToDOM(theme: NoCodeTheme) {
    const root = document.documentElement;
    root.style.setProperty('--nc-bg-root', theme.colors.bgRoot);
    root.style.setProperty('--nc-bg-panel', theme.colors.bgPanel);
    root.style.setProperty('--nc-bg-header', theme.colors.bgHeader);
    root.style.setProperty('--nc-border', theme.colors.border);
    root.style.setProperty('--nc-accent-primary', theme.colors.accentPrimary);
    root.style.setProperty('--nc-accent-secondary', theme.colors.accentSecondary);
    root.style.setProperty('--nc-accent-highlight', theme.colors.accentHighlight);

    root.style.setProperty('--nc-block-gen', theme.colors.blockGenerative);
    root.style.setProperty('--nc-block-audio', theme.colors.blockAudio);
    root.style.setProperty('--nc-block-vfx', theme.colors.blockVisualFx);
    root.style.setProperty('--nc-block-ctrl', theme.colors.blockControl);
    root.style.setProperty('--nc-block-out', theme.colors.blockOutput);

    root.style.setProperty('--nc-wire-data', theme.colors.wireData);
    root.style.setProperty('--nc-wire-audio', theme.colors.wireAudio);
    root.style.setProperty('--nc-wire-video', theme.colors.wireVideo);
    root.style.setProperty('--nc-wire-pulse', theme.colors.wirePulse);

    root.style.setProperty('--nc-tl-track', theme.colors.timelineTrackBg);
    root.style.setProperty('--nc-tl-playhead', theme.colors.timelinePlayhead);
    root.style.setProperty('--nc-tl-clip', theme.colors.timelineClipDefault);
  }
}

export const themeEngine = new ThemeEngine();
