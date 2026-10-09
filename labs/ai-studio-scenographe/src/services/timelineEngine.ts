// Moteur de Timeline Multi-pistes, Gestion des Cues & Bibliothèque Réutilisable
// No[co]de Vibe Designer — Le Scénographe & Workflow Inspiré de Millumin

import {
  ReusableScenicElement,
  TimelineTrack,
  TimelineClip,
  CueItem,
  ShowProjectState,
  ScenicTransform
} from '../types/timeline';

// Bibliothèque d'éléments scénographiques réutilisables initiaux
export const INITIAL_REUSABLE_LIBRARY: ReusableScenicElement[] = [
  // 0. La Mer qui Vibre (Bruitage Vivant & Scénographie Interactive - Didascalies Pirates Paillettes p. 35)
  {
    id: 'elem-foley-vibrating-sea',
    name: 'La Mer qui Vibre (Bruitage Direct)',
    category: 'Bruitages Vivants & Objets Scéniques',
    type: 'light_creature',
    characterTitle: 'Houle Marine Réactive au Tambour d’Océan & Flûte',
    description: 'La mer réagit en direct au son réel du comédien (tambour d’océan, flûte, secousses). Plus le jeu est fort, plus la mer s’agite et vibre. Retour progressif au calme plat.',
    iconType: 'whale',
    defaultTrackId: 'track-1-shadows',
    defaultDuration: 18,
    color: '#0284c7',
    defaultTransform: {
      x: 0.5,
      y: 0.55,
      scale: 1.0,
      rotationDeg: 0,
      opacity: 1.0,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'oceanic_swim',
    motionSpeed: 1.0,
    visualFx: 'water_ripples',
    fxIntensity: 1.2,
    audioConfig: {
      enabled: true,
      volume: 0.8,
      reactiveToSteps: false,
      synthPreset: 'water_droplet'
    },
    createdAt: 'Didascalies Pirates Paillettes'
  },

  // 1. L'Ombre du Pirate (Personnage Scénographique)
  {
    id: 'elem-pirate-shadow',
    name: "L'Ombre du Pirate",
    category: 'Personnages & Ombres',
    type: 'performer_shadow',
    characterTitle: "L'Ombre du Pirate (Comédien à Jardin)",
    description: "Silhouette vivante isolée avec costume complet : chapeau tricorne à plumes, sabre d'abordage et redingote. Mode miroir ou danse autonome.",
    iconType: 'pirate',
    defaultTrackId: 'track-1-shadows',
    defaultDuration: 14,
    color: '#d7b86a', // Accent No[co]de officiel
    defaultTransform: {
      x: 0.32,
      y: 0.72,
      scale: 1.35,
      rotationDeg: 0,
      opacity: 1.0,
      flipHorizontal: true
    },
    animationMode: 'mirror',
    motionStyle: 'pirate_dance',
    motionSpeed: 1.0,
    costume: {
      hatType: 'tricorn',
      hasSashBelt: true,
      hasCutlassSabre: true,
      hasCoatFlaps: true,
      featherAngle: -25
    },
    visualFx: 'none',
    fxIntensity: 0.5,
    audioConfig: {
      enabled: true,
      volume: 0.6,
      reactiveToSteps: true,
      synthPreset: 'footstep_wood'
    },
    createdAt: 'Préréglage Scénographe'
  },

  // 2. Le Chat de lumière (Créature Féline Néon)
  {
    id: 'elem-light-cat',
    name: 'Le Chat de lumière',
    category: 'Lumière & Créatures',
    type: 'light_creature',
    characterTitle: 'Chat de lumière néon agrandi',
    description: 'Félin néon agrandi avec cinématique des 4 pattes, positionnement libre X/Y, auto-cadrage et traînées de lumière dorée/cyan.',
    iconType: 'cat',
    defaultTrackId: 'track-2-creatures',
    defaultDuration: 12,
    color: '#38bdf8', // Cyan No[co]de
    defaultTransform: {
      x: 0.65,
      y: 0.68,
      scale: 1.5,
      rotationDeg: 0,
      opacity: 0.95,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'quadruped_run',
    motionSpeed: 1.15,
    visualFx: 'trails',
    fxIntensity: 0.8,
    audioConfig: {
      enabled: true,
      volume: 0.5,
      reactiveToSteps: true,
      synthPreset: 'sparkle_pentatonic'
    },
    createdAt: 'Préréglage Vibe'
  },

  // 3. La Baleine Interactive (Cétacé Onirique)
  {
    id: 'elem-whale',
    name: 'La Baleine interactive',
    category: 'Lumière & Créatures',
    type: 'light_creature',
    characterTitle: 'Baleine bioluminescente',
    description: 'Cétacé poétique ondulant dans l’espace scénique avec sillage de particules bleues et ondes aquatiques douces.',
    iconType: 'whale',
    defaultTrackId: 'track-2-creatures',
    defaultDuration: 16,
    color: '#06b6d4',
    defaultTransform: {
      x: 0.5,
      y: 0.38,
      scale: 1.2,
      rotationDeg: -5,
      opacity: 0.85,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'oceanic_swim',
    motionSpeed: 0.7,
    visualFx: 'glow',
    fxIntensity: 0.6,
    audioConfig: {
      enabled: true,
      volume: 0.4,
      reactiveToSteps: false,
      synthPreset: 'drone_dark'
    },
    createdAt: 'Préréglage Vibe'
  },

  // 4. Écho Slit-Scan Temporel (Effet Visuel)
  {
    id: 'elem-fx-slitscan',
    name: 'Écho Slit-Scan Temporel',
    category: 'Effets Visuels & Shaders',
    type: 'visual_fx',
    characterTitle: 'Déformation Slit-Scan de Plateau',
    description: 'Effet temporel de traînée et d’écho volumétrique découpant les mouvements scéniques des interprètes.',
    iconType: 'slitscan',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 8,
    color: '#a855f7', // Violet
    defaultTransform: {
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      rotationDeg: 0,
      opacity: 0.75,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'patrol_walk',
    motionSpeed: 1.0,
    visualFx: 'slit_scan',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: false,
      volume: 0,
      reactiveToSteps: false,
      synthPreset: 'sub_rumble'
    },
    createdAt: 'Préréglage Optique'
  },

  // 5. Prisme & Dispersion RGB Split 2.5D
  {
    id: 'elem-fx-rgbsplit',
    name: 'Prisme RGB Split & Relief',
    category: 'Effets Visuels & Shaders',
    type: 'visual_fx',
    characterTitle: 'Décalage Chromatique 2.5D',
    description: 'Séparation optique rouge/bleu simulant la stéréoscopie et la vibration lumineuse lors des mouvements rapides.',
    iconType: 'prism',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 10,
    color: '#ec4899', // Rose/Magenta
    defaultTransform: {
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      rotationDeg: 0,
      opacity: 0.7,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'patrol_walk',
    motionSpeed: 1.0,
    visualFx: 'rgb_split',
    fxIntensity: 0.7,
    audioConfig: {
      enabled: false,
      volume: 0,
      reactiveToSteps: false,
      synthPreset: 'sub_rumble'
    },
    createdAt: 'Préréglage Optique'
  },

  // 6. Danseur Spectral & Traînées Pepper's Ghost
  {
    id: 'elem-dancer-ghost',
    name: 'Danseur Spectral (Pepper’s Ghost)',
    category: 'Personnages & Ombres',
    type: 'performer_shadow',
    characterTitle: 'Silhouette Éthérée de Danse Contemporaine',
    description: 'Silhouette blanche luminescente avec écho corporel, traînées vaporeuses et pulsation de bol tibétain.',
    iconType: 'puppet',
    defaultTrackId: 'track-1-shadows',
    defaultDuration: 18,
    color: '#e2e8f0', // Blanc argenté
    defaultTransform: {
      x: 0.5,
      y: 0.72,
      scale: 1.25,
      rotationDeg: 0,
      opacity: 0.85,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'mystic_spin',
    motionSpeed: 0.9,
    visualFx: 'peppers_ghost',
    fxIntensity: 0.8,
    audioConfig: {
      enabled: true,
      volume: 0.55,
      reactiveToSteps: true,
      synthPreset: 'tibetan_bowl'
    },
    createdAt: 'Préréglage Scénique'
  },

  // 7. Pantin de Fils Numérique (Marionnette Interactive)
  {
    id: 'elem-wire-puppet',
    name: 'Pantin de Fils Numérique',
    category: 'Personnages & Ombres',
    type: 'performer_shadow',
    characterTitle: 'Marionnette Virtuelle à Articulations',
    description: 'Pantin stylisé suspendu à des fils lumineux verticaux, oscillant au gré des mouvements de scène.',
    iconType: 'puppet',
    defaultTrackId: 'track-1-shadows',
    defaultDuration: 14,
    color: '#f59e0b', // Ambre chaud
    defaultTransform: {
      x: 0.4,
      y: 0.65,
      scale: 1.15,
      rotationDeg: 0,
      opacity: 0.9,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'wire_marionette',
    motionSpeed: 1.0,
    visualFx: 'none',
    fxIntensity: 0.5,
    audioConfig: {
      enabled: true,
      volume: 0.5,
      reactiveToSteps: true,
      synthPreset: 'footstep_wood'
    },
    createdAt: 'Préréglage Scénique'
  },

  // 8. Feedback Vidéo & Rémanence Organique (Style Hydra / Jitter)
  {
    id: 'elem-hydra-feedback',
    name: 'Feedback Vidéo & Vortex Hydra',
    category: 'Effets Visuels & Shaders',
    type: 'visual_fx',
    characterTitle: 'Boucle de Rétroaction Récursive',
    description: 'Simulation de feedback analogique avec dérive de couleur, zoom spiralé et traînées cinétiques infinies.',
    iconType: 'feedback',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 15,
    color: '#06b6d4', // Cyan
    defaultTransform: {
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      rotationDeg: 0,
      opacity: 0.8,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'vortex_spiral',
    motionSpeed: 1.0,
    visualFx: 'hydra_feedback',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: false,
      volume: 0,
      reactiveToSteps: false,
      synthPreset: 'sub_rumble'
    },
    createdAt: 'Préréglage Shaders'
  },

  // 9. Tunnel Infini & Perspective Fuyante (Style TouchDesigner / ISF)
  {
    id: 'elem-vortex-tunnel',
    name: 'Tunnel Infini & Vortex Volumétrique',
    category: 'Effets Visuels & Shaders',
    type: 'visual_fx',
    characterTitle: 'Structure Hypnotique en Perspective',
    description: 'Anneaux concentriques plongeant vers le fond de scène, créant une illusion de profondeur tridimensionnelle.',
    iconType: 'tunnel',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 12,
    color: '#8b5cf6', // Violet
    defaultTransform: {
      x: 0.5,
      y: 0.45,
      scale: 1.2,
      rotationDeg: 0,
      opacity: 0.8,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'vortex_spiral',
    motionSpeed: 1.2,
    visualFx: 'vortex_tunnel',
    fxIntensity: 0.9,
    audioConfig: {
      enabled: true,
      volume: 0.4,
      reactiveToSteps: false,
      synthPreset: 'drone_dark'
    },
    createdAt: 'Préréglage Shaders'
  },

  // 10. Brume Volumétrique de Plateau
  {
    id: 'elem-fog-volumetric',
    name: 'Brume Volumétrique Scénique',
    category: 'Matières & Environnements',
    type: 'environment_matter',
    characterTitle: 'Nappe de Fumée Éthérée au Sol',
    description: 'Nappe vaporeuse de fumée numérique rasant le sol du plateau et réagissant aux traversées des comédiens.',
    iconType: 'fog',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 20,
    color: '#94a3b8', // Gris perle
    defaultTransform: {
      x: 0.5,
      y: 0.78,
      scale: 1.5,
      rotationDeg: 0,
      opacity: 0.7,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'slow_drift',
    motionSpeed: 0.6,
    visualFx: 'fog_volumetric',
    fxIntensity: 0.75,
    audioConfig: {
      enabled: true,
      volume: 0.35,
      reactiveToSteps: false,
      synthPreset: 'wind_texture'
    },
    createdAt: 'Préréglage Matières'
  },

  // 11. Miroir d'Eau & Ondes Réfractives
  {
    id: 'elem-water-ripples',
    name: 'Miroir d’Eau & Ondes Réfractives',
    category: 'Matières & Environnements',
    type: 'environment_matter',
    characterTitle: 'Sol Scénique Aquatique Réactif',
    description: 'Ondes concentriques liquides générées à chaque point de contact, avec réfraction optique et son de goutte.',
    iconType: 'particles',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 16,
    color: '#38bdf8', // Cyan
    defaultTransform: {
      x: 0.5,
      y: 0.76,
      scale: 1.4,
      rotationDeg: 0,
      opacity: 0.85,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'slow_drift',
    motionSpeed: 0.9,
    visualFx: 'water_ripples',
    fxIntensity: 0.8,
    audioConfig: {
      enabled: true,
      volume: 0.5,
      reactiveToSteps: true,
      synthPreset: 'water_droplet'
    },
    createdAt: 'Préréglage Matières'
  },

  // 12. Nuée d'Oiseaux Boids & Particules d'Étincelles
  {
    id: 'elem-particle-boids',
    name: 'Nuée d’Oiseaux Lumineux (Boids)',
    category: 'Lumière & Créatures',
    type: 'light_creature',
    characterTitle: 'Essaim Génératif Reynolds',
    description: 'Nuée de particules volantes suivant les lois d’attraction, d’évitement et d’alignement avec scintillements.',
    iconType: 'particles',
    defaultTrackId: 'track-2-creatures',
    defaultDuration: 18,
    color: '#fbbf24', // Or chaud
    defaultTransform: {
      x: 0.5,
      y: 0.35,
      scale: 1.1,
      rotationDeg: 0,
      opacity: 0.9,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'flocking_flight',
    motionSpeed: 1.25,
    visualFx: 'particle_boids',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: true,
      volume: 0.45,
      reactiveToSteps: false,
      synthPreset: 'shimmer_reverb'
    },
    createdAt: 'Préréglage Créatures'
  },

  // 13. Banc de Méduses Flottantes
  {
    id: 'elem-jellyfish-swarm',
    name: 'Banc de Méduses Fluorescentes',
    category: 'Lumière & Créatures',
    type: 'light_creature',
    characterTitle: 'Créatures Abyssales Volumétriques',
    description: 'Méduses translucides ondulantes avec ombrelle contractile et longs filaments phosphorescents cyans.',
    iconType: 'jellyfish',
    defaultTrackId: 'track-2-creatures',
    defaultDuration: 18,
    color: '#2dd4bf', // Teal
    defaultTransform: {
      x: 0.6,
      y: 0.4,
      scale: 1.2,
      rotationDeg: 0,
      opacity: 0.85,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'oceanic_swim',
    motionSpeed: 0.8,
    visualFx: 'glow',
    fxIntensity: 0.75,
    audioConfig: {
      enabled: true,
      volume: 0.4,
      reactiveToSteps: false,
      synthPreset: 'sparkle_pentatonic'
    },
    createdAt: 'Préréglage Créatures'
  },

  // 14. Brasier Numérique & Braises Scéniques
  {
    id: 'elem-fire-braziers',
    name: 'Brasier Numérique & Braises',
    category: 'Matières & Environnements',
    type: 'environment_matter',
    characterTitle: 'Particules Incandescentes de Plateau',
    description: 'Flammes scéniques stylisées montant vers le cintre avec gerbes d’étincelles crépitantes.',
    iconType: 'fire',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 16,
    color: '#f97316', // Orange feu
    defaultTransform: {
      x: 0.5,
      y: 0.75,
      scale: 1.3,
      rotationDeg: 0,
      opacity: 0.9,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'slow_drift',
    motionSpeed: 1.1,
    visualFx: 'none',
    fxIntensity: 0.8,
    audioConfig: {
      enabled: true,
      volume: 0.5,
      reactiveToSteps: false,
      synthPreset: 'sub_rumble'
    },
    createdAt: 'Préréglage Matières'
  },

  // 15. Bloc Composé : Duo Pirate & Écho Spectral
  {
    id: 'elem-compound-pirate-echo',
    name: 'Bloc Composé : Pirate & Écho Spectral',
    category: 'Blocs Composés',
    type: 'compound_block',
    characterTitle: 'Ensemble : Silhouette + Slit-Scan + Audio',
    description: 'Regroupement pré-synchronisé : Ombre du Pirate en danse autonome, effet Slit-Scan et pulsation audio synchrone.',
    iconType: 'compound',
    defaultTrackId: 'track-1-shadows',
    defaultDuration: 15,
    color: '#eab308',
    defaultTransform: {
      x: 0.5,
      y: 0.7,
      scale: 1.3,
      rotationDeg: 0,
      opacity: 1.0,
      flipHorizontal: false
    },
    animationMode: 'hybrid',
    motionStyle: 'pirate_dance',
    motionSpeed: 1.1,
    costume: {
      hatType: 'tricorn',
      hasSashBelt: true,
      hasCutlassSabre: true,
      hasCoatFlaps: true,
      featherAngle: -25
    },
    visualFx: 'slit_scan',
    fxIntensity: 0.75,
    audioConfig: {
      enabled: true,
      volume: 0.75,
      reactiveToSteps: true,
      synthPreset: 'footstep_wood'
    },
    isCompound: true,
    compoundSubElements: [
      { elementId: 'elem-pirate-shadow', relativeStartTime: 0, duration: 15, opacity: 1.0 },
      { elementId: 'elem-fx-slitscan', relativeStartTime: 2, duration: 13, opacity: 0.7 }
    ],
    createdAt: 'Regroupement scénographique'
  },

  // 16. Bloc Composé : Rituel de Brume & Bol Tibétain
  {
    id: 'elem-compound-ritual-fog',
    name: 'Bloc Composé : Rituel de Brume & Ondes',
    category: 'Blocs Composés',
    type: 'compound_block',
    characterTitle: 'Ensemble : Danseur Spectral + Brume + Eau',
    description: 'Ambiance onirique : Danseur spectral, nappe de brume au sol, ondes réfractives et bol tibétain résonant.',
    iconType: 'compound',
    defaultTrackId: 'track-1-shadows',
    defaultDuration: 20,
    color: '#a855f7',
    defaultTransform: {
      x: 0.5,
      y: 0.72,
      scale: 1.25,
      rotationDeg: 0,
      opacity: 0.9,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'mystic_spin',
    motionSpeed: 0.85,
    visualFx: 'peppers_ghost',
    fxIntensity: 0.8,
    audioConfig: {
      enabled: true,
      volume: 0.6,
      reactiveToSteps: true,
      synthPreset: 'tibetan_bowl'
    },
    isCompound: true,
    compoundSubElements: [
      { elementId: 'elem-dancer-ghost', relativeStartTime: 0, duration: 20, opacity: 0.9 },
      { elementId: 'elem-fog-volumetric', relativeStartTime: 1, duration: 19, opacity: 0.75 },
      { elementId: 'elem-water-ripples', relativeStartTime: 3, duration: 17, opacity: 0.8 }
    ],
    createdAt: 'Regroupement scénographique'
  },

  // 17. Le Golem de Cristal & Facettes Voronoï
  {
    id: 'elem-crystal-golem',
    name: 'Golem de Cristal (Voronoï)',
    category: 'Personnages & Ombres',
    type: 'performer_shadow',
    characterTitle: 'Colosse Minéral en Facettes de Quartz',
    description: 'Silhouette androïde polygonale cristalline qui pulse et se fracture sous les impacts de pas avec résonance FM.',
    iconType: 'golem',
    defaultTrackId: 'track-1-shadows',
    defaultDuration: 18,
    color: '#38bdf8', // Cyan quartz
    defaultTransform: {
      x: 0.5,
      y: 0.72,
      scale: 1.4,
      rotationDeg: 0,
      opacity: 0.95,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'voronoi_shatter',
    motionSpeed: 0.8,
    visualFx: 'voronoi_shatter',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: true,
      volume: 0.6,
      reactiveToSteps: true,
      synthPreset: 'crystal_resonance'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 18. Le Voile d'Aurore Boréale & Soie d'Ondes
  {
    id: 'elem-aurora-veil',
    name: 'Voile d’Aurore Boréale',
    category: 'Matières & Environnements',
    type: 'environment_matter',
    characterTitle: 'Drapé d’Ondes Luminescentes en Cintre',
    description: 'Rubans ondulants émeraude et magenta flottant au-dessus du plateau comme un drapé de soie céleste réactif au vent.',
    iconType: 'aurora',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 22,
    color: '#10b981', // Émeraude aurore
    defaultTransform: {
      x: 0.5,
      y: 0.28,
      scale: 1.6,
      rotationDeg: 0,
      opacity: 0.8,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'slow_drift',
    motionSpeed: 0.7,
    visualFx: 'aurora_borealis',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: true,
      volume: 0.45,
      reactiveToSteps: false,
      synthPreset: 'wind_texture'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 19. Le Papillon du Chaos (Attracteur de Lorenz)
  {
    id: 'elem-lorenz-butterfly',
    name: 'Papillon du Chaos (Lorenz)',
    category: 'Lumière & Créatures',
    type: 'light_creature',
    characterTitle: 'Attracteur Étrange Non-Linéaire',
    description: 'Créature cinématique traçant en temps réel les orbites chaotiques déterministes d’Edward Lorenz avec étincelles d’or.',
    iconType: 'particles',
    defaultTrackId: 'track-2-creatures',
    defaultDuration: 16,
    color: '#f59e0b', // Or ambré
    defaultTransform: {
      x: 0.52,
      y: 0.45,
      scale: 1.3,
      rotationDeg: 0,
      opacity: 0.9,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'vortex_spiral',
    motionSpeed: 1.15,
    visualFx: 'particle_boids',
    fxIntensity: 0.9,
    audioConfig: {
      enabled: true,
      volume: 0.5,
      reactiveToSteps: false,
      synthPreset: 'sparkle_pentatonic'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 20. Le Portail des Étoiles & Lensing Gravitationnel
  {
    id: 'elem-stargate-portal',
    name: 'Portail des Étoiles (Stargate)',
    category: 'Effets Visuels & Shaders',
    type: 'visual_fx',
    characterTitle: 'Anneau de Déformation Gravitationnelle',
    description: 'Anneau rotatif concentrique aspirant visuellement les lumières de scène avec courbure d’espace et horizon noir.',
    iconType: 'portal',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 18,
    color: '#6366f1', // Indigo cosmique
    defaultTransform: {
      x: 0.5,
      y: 0.45,
      scale: 1.35,
      rotationDeg: 0,
      opacity: 0.88,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'vortex_spiral',
    motionSpeed: 0.9,
    visualFx: 'stargate_lensing',
    fxIntensity: 0.9,
    audioConfig: {
      enabled: true,
      volume: 0.65,
      reactiveToSteps: false,
      synthPreset: 'drone_dark'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 21. L'Échiquier Cinétique & Pistons 3D
  {
    id: 'elem-kinetic-chessboard',
    name: 'Échiquier Cinétique 3D',
    category: 'Matières & Environnements',
    type: 'environment_matter',
    characterTitle: 'Sol de Pistons Pyramidaux Scéniques',
    description: 'Matrice de dalles en perspective théâtrale s’élevant et s’enfonçant comme des pistons mécaniques au rythme des pas.',
    iconType: 'chessboard',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 18,
    color: '#cbd5e1', // Platine
    defaultTransform: {
      x: 0.5,
      y: 0.78,
      scale: 1.5,
      rotationDeg: 0,
      opacity: 0.85,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'piston_pulse',
    motionSpeed: 1.0,
    visualFx: 'kinetic_mesh',
    fxIntensity: 0.8,
    audioConfig: {
      enabled: true,
      volume: 0.55,
      reactiveToSteps: true,
      synthPreset: 'metallic_pulse'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 22. Le Dragon Stellaire de Poussière d'Or
  {
    id: 'elem-biolum-dragon',
    name: 'Dragon Stellaire d’Or',
    category: 'Lumière & Créatures',
    type: 'light_creature',
    characterTitle: 'Serpent Céleste en Chaîne Cinématique',
    description: 'Grand reptile lumineux articulé en 24 segments reliés ondulant d’un bord à l’autre du plateau avec sillage d’or.',
    iconType: 'dragon',
    defaultTrackId: 'track-2-creatures',
    defaultDuration: 20,
    color: '#fbbf24', // Or chaud
    defaultTransform: {
      x: 0.5,
      y: 0.38,
      scale: 1.45,
      rotationDeg: 0,
      opacity: 0.95,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'dragon_flight',
    motionSpeed: 1.1,
    visualFx: 'trails',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: true,
      volume: 0.55,
      reactiveToSteps: false,
      synthPreset: 'shimmer_reverb'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 23. Le Fantôme Thermique Infrarouge
  {
    id: 'elem-thermal-phantom',
    name: 'Fantôme Thermique Infrarouge',
    category: 'Effets Visuels & Shaders',
    type: 'visual_fx',
    characterTitle: 'Thermographie Corporelle en Fausses Couleurs',
    description: 'Silhouette décomposée en gradient spectral (UV, bleu glacier, ambre, blanc brûlé) révélant l’énergie calorifique.',
    iconType: 'sun',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 15,
    color: '#ec4899', // Rose/Magenta
    defaultTransform: {
      x: 0.5,
      y: 0.5,
      scale: 1.1,
      rotationDeg: 0,
      opacity: 0.85,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'slow_drift',
    motionSpeed: 0.95,
    visualFx: 'thermal_lut',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: true,
      volume: 0.5,
      reactiveToSteps: true,
      synthPreset: 'tibetan_bowl'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 24. Le Mandala de Sable & Balayage Éolien
  {
    id: 'elem-sand-mandala',
    name: 'Mandala de Sable & Souffle',
    category: 'Matières & Environnements',
    type: 'environment_matter',
    characterTitle: 'Rosace Sacrée au Sol avec Dispersion',
    description: 'Rosace géométrique 12 axes dessinée au sol, dont les grains de sable sont dispersés par un coup de vent scénique.',
    iconType: 'mandala',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 18,
    color: '#f59e0b', // Safran
    defaultTransform: {
      x: 0.5,
      y: 0.76,
      scale: 1.35,
      rotationDeg: 0,
      opacity: 0.9,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'mandala_spin',
    motionSpeed: 0.6,
    visualFx: 'mandala_dispersion',
    fxIntensity: 0.8,
    audioConfig: {
      enabled: true,
      volume: 0.5,
      reactiveToSteps: false,
      synthPreset: 'tibetan_bowl'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 25. L'Éclipse Coronaire & Protubérances Solaires
  {
    id: 'elem-solar-eclipse',
    name: 'Éclipse Coronaire Scénique',
    category: 'Effets Visuels & Shaders',
    type: 'visual_fx',
    characterTitle: 'Disque Solaire Oublié & Éjections FBM',
    description: 'Disque noir d’occultation totale entouré d’éruptions solaires incandescentes et de rayons perçant l’obscurité.',
    iconType: 'sun',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 16,
    color: '#ea580c', // Orange braise
    defaultTransform: {
      x: 0.5,
      y: 0.35,
      scale: 1.25,
      rotationDeg: 0,
      opacity: 0.9,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'vortex_spiral',
    motionSpeed: 0.8,
    visualFx: 'solar_corona',
    fxIntensity: 0.9,
    audioConfig: {
      enabled: true,
      volume: 0.6,
      reactiveToSteps: false,
      synthPreset: 'deep_sub_drone'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 26. La Flaque de Mercure Métallique Vivante
  {
    id: 'elem-liquid-mercury',
    name: 'Mercure Liquide Réflectif',
    category: 'Matières & Environnements',
    type: 'environment_matter',
    characterTitle: 'Metaballs Chromées à Tension de Surface',
    description: 'Nappe de métal liquide réfléchissant le plateau, se séparant en plusieurs billes mercurielles puis fusionnant à nouveau.',
    iconType: 'mercury',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 16,
    color: '#94a3b8', // Argent métallique
    defaultTransform: {
      x: 0.5,
      y: 0.78,
      scale: 1.4,
      rotationDeg: 0,
      opacity: 0.9,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'mercury_flow',
    motionSpeed: 1.0,
    visualFx: 'mercury_metaballs',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: true,
      volume: 0.5,
      reactiveToSteps: true,
      synthPreset: 'water_droplet'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 27. L'Arborescence Synaptique & Pulsations
  {
    id: 'elem-synaptic-neural',
    name: 'Arborescence Synaptique',
    category: 'Effets Visuels & Shaders',
    type: 'visual_fx',
    characterTitle: 'Réseau Neuronal & Axones de Lumière',
    description: 'Arbre synaptique dont les terminaisons parcourent le décor et s’illuminent par impulsions de potentiel d’action.',
    iconType: 'synapse',
    defaultTrackId: 'track-3-fx',
    defaultDuration: 18,
    color: '#06b6d4', // Cyan électrique
    defaultTransform: {
      x: 0.5,
      y: 0.45,
      scale: 1.3,
      rotationDeg: 0,
      opacity: 0.85,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'synaptic_burst',
    motionSpeed: 1.15,
    visualFx: 'synaptic_pulse',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: true,
      volume: 0.45,
      reactiveToSteps: false,
      synthPreset: 'sparkle_pentatonic'
    },
    createdAt: 'Création Scénique Vibe'
  },

  // 28. Bloc Composé : Rituel du Portail & Golem Minéral
  {
    id: 'elem-compound-stargate-golem',
    name: 'Bloc Composé : Portail & Golem Minéral',
    category: 'Blocs Composés',
    type: 'compound_block',
    characterTitle: 'Ensemble : Portail Cosmique + Golem Voronoï + Drone',
    description: 'Séquence scénique d’invocation : Ouverture du Portail Stargate (Layer 3), réveil du Golem de Cristal (Layer 1) et bourdon sourd.',
    iconType: 'compound',
    defaultTrackId: 'track-1-shadows',
    defaultDuration: 22,
    color: '#6366f1',
    defaultTransform: {
      x: 0.5,
      y: 0.72,
      scale: 1.4,
      rotationDeg: 0,
      opacity: 1.0,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionStyle: 'voronoi_shatter',
    motionSpeed: 0.85,
    visualFx: 'voronoi_shatter',
    fxIntensity: 0.9,
    audioConfig: {
      enabled: true,
      volume: 0.7,
      reactiveToSteps: true,
      synthPreset: 'crystal_resonance'
    },
    isCompound: true,
    compoundSubElements: [
      { elementId: 'elem-stargate-portal', relativeStartTime: 0, duration: 22, opacity: 0.85 },
      { elementId: 'elem-crystal-golem', relativeStartTime: 2, duration: 20, opacity: 1.0 }
    ],
    createdAt: 'Regroupement scénographique'
  }
];

// Pistes de la Timeline (Layers de projection type Millumin)
export const INITIAL_TIMELINE_TRACKS: TimelineTrack[] = [
  {
    id: 'track-1-shadows',
    name: 'Layer 1 — Scénographie & Ombres',
    layerNumber: 1,
    color: '#d7b86a', // Ambre / Or
    isMuted: false,
    isSolo: false,
    opacity: 1.0,
    blendMode: 'normal'
  },
  {
    id: 'track-2-creatures',
    name: 'Layer 2 — Créatures & Lumière',
    layerNumber: 2,
    color: '#38bdf8', // Cyan
    isMuted: false,
    isSolo: false,
    opacity: 0.95,
    blendMode: 'screen'
  },
  {
    id: 'track-3-fx',
    name: 'Layer 3 — Effets Visuels & Shaders',
    layerNumber: 3,
    color: '#a855f7', // Violet
    isMuted: false,
    isSolo: false,
    opacity: 0.8,
    blendMode: 'screen'
  },
  {
    id: 'track-4-audio',
    name: 'Layer 4 — Audio & Synthèse Synchrone',
    layerNumber: 4,
    color: '#10b981', // Émeraude
    isMuted: false,
    isSolo: false,
    opacity: 1.0,
    blendMode: 'normal'
  }
];

// Cues de Régie Scénique (Conduite de Spectacle avec TOPs)
export const INITIAL_CUE_LIST: CueItem[] = [
  {
    id: 'cue-1',
    cueNumber: 1,
    label: 'TOP 1 — Entrée comédien à jardin',
    timeSec: 0.0,
    action: 'jump_and_play',
    oscAddress: '/cue/1',
    description: 'Le comédien entre en scène à jardin. Silhouette miroir prête.'
  },
  {
    id: 'cue-2',
    cueNumber: 2,
    label: 'TOP 2 — Détachement de l’ombre (Autonome)',
    timeSec: 4.5,
    action: 'switch_mode',
    oscAddress: '/cue/2',
    description: 'L’ombre se détache du comédien et avance seule vers le centre du plateau.'
  },
  {
    id: 'cue-3',
    cueNumber: 3,
    label: 'TOP 3 — Danse du pirate & Slit-Scan temporel',
    timeSec: 10.0,
    action: 'jump_and_play',
    oscAddress: '/cue/3',
    description: 'L’ombre entame sa danse avec sabre et redingote. Activation de l’écho slit-scan.'
  },
  {
    id: 'cue-4',
    cueNumber: 4,
    label: 'TOP 4 — Entrée du Chat de lumière (Duo)',
    timeSec: 16.0,
    action: 'jump_and_play',
    oscAddress: '/cue/4',
    description: 'Le Chat de lumière entre à cour et accompagne les pas du pirate.'
  },
  {
    id: 'cue-5',
    cueNumber: 5,
    label: 'TOP 5 — Fondu scénique final',
    timeSec: 25.0,
    action: 'fade_black',
    oscAddress: '/cue/5',
    description: 'Fondu au noir progressif et retour au silence.'
  }
];

// Clips initiaux placés sur la Timeline pour constituer la séquence de démonstration
export const INITIAL_TIMELINE_CLIPS: TimelineClip[] = [
  // Clip 1 sur Layer 1 : L'Ombre du Pirate (0s -> 24s)
  {
    id: 'clip-1',
    elementId: 'elem-pirate-shadow',
    trackId: 'track-1-shadows',
    name: "Ombre du Pirate (Jardin ➔ Danse)",
    color: '#d7b86a',
    startTime: 0.0,
    duration: 25.0,
    active: true,
    transform: {
      x: 0.35,
      y: 0.72,
      scale: 1.35,
      rotationDeg: 0,
      opacity: 1.0,
      flipHorizontal: true
    },
    animationMode: 'mirror',
    motionSpeed: 1.0,
    motionStyle: 'pirate_dance',
    visualFx: 'none',
    fxIntensity: 0.5,
    audioConfig: {
      enabled: true,
      volume: 0.7,
      reactiveToSteps: true,
      synthPreset: 'footstep_wood'
    },
    triggerCueId: 'cue-1'
  },

  // Clip 2 sur Layer 3 : Effet Slit-Scan (10s -> 22s)
  {
    id: 'clip-2',
    elementId: 'elem-fx-slitscan',
    trackId: 'track-3-fx',
    name: 'Écho Slit-Scan sur Danse',
    color: '#a855f7',
    startTime: 10.0,
    duration: 12.0,
    active: true,
    transform: {
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      rotationDeg: 0,
      opacity: 0.75,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionSpeed: 1.0,
    motionStyle: 'patrol_walk',
    visualFx: 'slit_scan',
    fxIntensity: 0.85,
    audioConfig: {
      enabled: false,
      volume: 0,
      reactiveToSteps: false,
      synthPreset: 'sub_rumble'
    },
    triggerCueId: 'cue-3'
  },

  // Clip 3 sur Layer 2 : Chat de lumière (16s -> 26s)
  {
    id: 'clip-3',
    elementId: 'elem-light-cat',
    trackId: 'track-2-creatures',
    name: 'Chat de lumière néon',
    color: '#38bdf8',
    startTime: 16.0,
    duration: 10.0,
    active: true,
    transform: {
      x: 0.72,
      y: 0.68,
      scale: 1.45,
      rotationDeg: 0,
      opacity: 0.95,
      flipHorizontal: false
    },
    animationMode: 'autonomous',
    motionSpeed: 1.15,
    motionStyle: 'quadruped_run',
    visualFx: 'trails',
    fxIntensity: 0.8,
    audioConfig: {
      enabled: true,
      volume: 0.55,
      reactiveToSteps: true,
      synthPreset: 'sparkle_pentatonic'
    },
    triggerCueId: 'cue-4'
  }
];

// Helper pour instancier un clip depuis un élément de la bibliothèque
export function createClipFromLibraryElement(
  element: ReusableScenicElement,
  trackId: string,
  startTime: number
): TimelineClip {
  return {
    id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    elementId: element.id,
    trackId: trackId || element.defaultTrackId,
    name: element.name,
    color: element.color,
    startTime: Math.max(0, startTime),
    duration: element.defaultDuration,
    active: true,
    transform: { ...element.defaultTransform },
    animationMode: element.animationMode,
    motionSpeed: element.motionSpeed,
    motionStyle: element.motionStyle,
    visualFx: element.visualFx,
    fxIntensity: element.fxIntensity,
    audioConfig: { ...element.audioConfig }
  };
}

// Helper pour sauvegarder un clip configuré comme nouvel élément de bibliothèque
export function saveClipAsLibraryElement(
  clip: TimelineClip,
  customName?: string
): ReusableScenicElement {
  const name = customName || `${clip.name} (Variante)`;
  return {
    id: `elem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name,
    category: 'Personnages & Ombres',
    type: 'performer_shadow',
    characterTitle: name,
    description: `Élément scénographique personnalisé depuis la timeline. FX : ${clip.visualFx.toUpperCase()}.`,
    iconType: 'pirate',
    defaultTrackId: clip.trackId,
    defaultDuration: clip.duration,
    color: clip.color,
    defaultTransform: { ...clip.transform },
    animationMode: clip.animationMode,
    motionStyle: clip.motionStyle as any,
    motionSpeed: clip.motionSpeed,
    visualFx: clip.visualFx,
    fxIntensity: clip.fxIntensity,
    audioConfig: { ...clip.audioConfig },
    createdAt: new Date().toLocaleDateString()
  };
}
