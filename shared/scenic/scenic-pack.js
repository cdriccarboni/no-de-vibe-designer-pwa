// GÉNÉRÉ par scripts/import-ai-studio-library.mjs depuis labs/ai-studio-scenographe — ne pas éditer à la main.
export const SCENIC_PACK_VERSION = 1;
export const SCENIC_LIBRARY = [
 {
  "id": "elem-foley-vibrating-sea",
  "name": "La Mer qui Vibre (Bruitage Direct)",
  "category": "Bruitages Vivants & Objets Scéniques",
  "type": "light_creature",
  "characterTitle": "Houle Marine Réactive au Tambour d’Océan & Flûte",
  "description": "La mer réagit en direct au son réel du comédien (tambour d’océan, flûte, secousses). Plus le jeu est fort, plus la mer s’agite et vibre. Retour progressif au calme plat.",
  "iconType": "whale",
  "defaultTrackId": "track-1-shadows",
  "defaultDuration": 18,
  "color": "#0284c7",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.55,
   "scale": 1,
   "rotationDeg": 0,
   "opacity": 1,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "oceanic_swim",
  "motionSpeed": 1,
  "visualFx": "water_ripples",
  "fxIntensity": 1.2,
  "audioConfig": {
   "enabled": true,
   "volume": 0.8,
   "reactiveToSteps": false,
   "synthPreset": "water_droplet"
  },
  "createdAt": "Didascalies Pirates Paillettes"
 },
 {
  "id": "elem-pirate-shadow",
  "name": "L'Ombre du Pirate",
  "category": "Personnages & Ombres",
  "type": "performer_shadow",
  "characterTitle": "L'Ombre du Pirate (Comédien à Jardin)",
  "description": "Silhouette vivante isolée avec costume complet : chapeau tricorne à plumes, sabre d'abordage et redingote. Mode miroir ou danse autonome.",
  "iconType": "pirate",
  "defaultTrackId": "track-1-shadows",
  "defaultDuration": 14,
  "color": "#d7b86a",
  "defaultTransform": {
   "x": 0.32,
   "y": 0.72,
   "scale": 1.35,
   "rotationDeg": 0,
   "opacity": 1,
   "flipHorizontal": true
  },
  "animationMode": "mirror",
  "motionStyle": "pirate_dance",
  "motionSpeed": 1,
  "costume": {
   "hatType": "tricorn",
   "hasSashBelt": true,
   "hasCutlassSabre": true,
   "hasCoatFlaps": true,
   "featherAngle": -25
  },
  "visualFx": "none",
  "fxIntensity": 0.5,
  "audioConfig": {
   "enabled": true,
   "volume": 0.6,
   "reactiveToSteps": true,
   "synthPreset": "footstep_wood"
  },
  "createdAt": "Préréglage Scénographe"
 },
 {
  "id": "elem-light-cat",
  "name": "Le Chat de lumière",
  "category": "Lumière & Créatures",
  "type": "light_creature",
  "characterTitle": "Chat de lumière néon agrandi",
  "description": "Félin néon agrandi avec cinématique des 4 pattes, positionnement libre X/Y, auto-cadrage et traînées de lumière dorée/cyan.",
  "iconType": "cat",
  "defaultTrackId": "track-2-creatures",
  "defaultDuration": 12,
  "color": "#38bdf8",
  "defaultTransform": {
   "x": 0.65,
   "y": 0.68,
   "scale": 1.5,
   "rotationDeg": 0,
   "opacity": 0.95,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "quadruped_run",
  "motionSpeed": 1.15,
  "visualFx": "trails",
  "fxIntensity": 0.8,
  "audioConfig": {
   "enabled": true,
   "volume": 0.5,
   "reactiveToSteps": true,
   "synthPreset": "sparkle_pentatonic"
  },
  "createdAt": "Préréglage Vibe"
 },
 {
  "id": "elem-whale",
  "name": "La Baleine interactive",
  "category": "Lumière & Créatures",
  "type": "light_creature",
  "characterTitle": "Baleine bioluminescente",
  "description": "Cétacé poétique ondulant dans l’espace scénique avec sillage de particules bleues et ondes aquatiques douces.",
  "iconType": "whale",
  "defaultTrackId": "track-2-creatures",
  "defaultDuration": 16,
  "color": "#06b6d4",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.38,
   "scale": 1.2,
   "rotationDeg": -5,
   "opacity": 0.85,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "oceanic_swim",
  "motionSpeed": 0.7,
  "visualFx": "glow",
  "fxIntensity": 0.6,
  "audioConfig": {
   "enabled": true,
   "volume": 0.4,
   "reactiveToSteps": false,
   "synthPreset": "drone_dark"
  },
  "createdAt": "Préréglage Vibe"
 },
 {
  "id": "elem-fx-slitscan",
  "name": "Écho Slit-Scan Temporel",
  "category": "Effets Visuels & Shaders",
  "type": "visual_fx",
  "characterTitle": "Déformation Slit-Scan de Plateau",
  "description": "Effet temporel de traînée et d’écho volumétrique découpant les mouvements scéniques des interprètes.",
  "iconType": "slitscan",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 8,
  "color": "#a855f7",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.5,
   "scale": 1,
   "rotationDeg": 0,
   "opacity": 0.75,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "patrol_walk",
  "motionSpeed": 1,
  "visualFx": "slit_scan",
  "fxIntensity": 0.85,
  "audioConfig": {
   "enabled": false,
   "volume": 0,
   "reactiveToSteps": false,
   "synthPreset": "sub_rumble"
  },
  "createdAt": "Préréglage Optique"
 },
 {
  "id": "elem-fx-rgbsplit",
  "name": "Prisme RGB Split & Relief",
  "category": "Effets Visuels & Shaders",
  "type": "visual_fx",
  "characterTitle": "Décalage Chromatique 2.5D",
  "description": "Séparation optique rouge/bleu simulant la stéréoscopie et la vibration lumineuse lors des mouvements rapides.",
  "iconType": "prism",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 10,
  "color": "#ec4899",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.5,
   "scale": 1,
   "rotationDeg": 0,
   "opacity": 0.7,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "patrol_walk",
  "motionSpeed": 1,
  "visualFx": "rgb_split",
  "fxIntensity": 0.7,
  "audioConfig": {
   "enabled": false,
   "volume": 0,
   "reactiveToSteps": false,
   "synthPreset": "sub_rumble"
  },
  "createdAt": "Préréglage Optique"
 },
 {
  "id": "elem-dancer-ghost",
  "name": "Danseur Spectral (Pepper’s Ghost)",
  "category": "Personnages & Ombres",
  "type": "performer_shadow",
  "characterTitle": "Silhouette Éthérée de Danse Contemporaine",
  "description": "Silhouette blanche luminescente avec écho corporel, traînées vaporeuses et pulsation de bol tibétain.",
  "iconType": "puppet",
  "defaultTrackId": "track-1-shadows",
  "defaultDuration": 18,
  "color": "#e2e8f0",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.72,
   "scale": 1.25,
   "rotationDeg": 0,
   "opacity": 0.85,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "mystic_spin",
  "motionSpeed": 0.9,
  "visualFx": "peppers_ghost",
  "fxIntensity": 0.8,
  "audioConfig": {
   "enabled": true,
   "volume": 0.55,
   "reactiveToSteps": true,
   "synthPreset": "tibetan_bowl"
  },
  "createdAt": "Préréglage Scénique"
 },
 {
  "id": "elem-wire-puppet",
  "name": "Pantin de Fils Numérique",
  "category": "Personnages & Ombres",
  "type": "performer_shadow",
  "characterTitle": "Marionnette Virtuelle à Articulations",
  "description": "Pantin stylisé suspendu à des fils lumineux verticaux, oscillant au gré des mouvements de scène.",
  "iconType": "puppet",
  "defaultTrackId": "track-1-shadows",
  "defaultDuration": 14,
  "color": "#f59e0b",
  "defaultTransform": {
   "x": 0.4,
   "y": 0.65,
   "scale": 1.15,
   "rotationDeg": 0,
   "opacity": 0.9,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "wire_marionette",
  "motionSpeed": 1,
  "visualFx": "none",
  "fxIntensity": 0.5,
  "audioConfig": {
   "enabled": true,
   "volume": 0.5,
   "reactiveToSteps": true,
   "synthPreset": "footstep_wood"
  },
  "createdAt": "Préréglage Scénique"
 },
 {
  "id": "elem-hydra-feedback",
  "name": "Feedback Vidéo & Vortex Hydra",
  "category": "Effets Visuels & Shaders",
  "type": "visual_fx",
  "characterTitle": "Boucle de Rétroaction Récursive",
  "description": "Simulation de feedback analogique avec dérive de couleur, zoom spiralé et traînées cinétiques infinies.",
  "iconType": "feedback",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 15,
  "color": "#06b6d4",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.5,
   "scale": 1,
   "rotationDeg": 0,
   "opacity": 0.8,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "vortex_spiral",
  "motionSpeed": 1,
  "visualFx": "hydra_feedback",
  "fxIntensity": 0.85,
  "audioConfig": {
   "enabled": false,
   "volume": 0,
   "reactiveToSteps": false,
   "synthPreset": "sub_rumble"
  },
  "createdAt": "Préréglage Shaders"
 },
 {
  "id": "elem-vortex-tunnel",
  "name": "Tunnel Infini & Vortex Volumétrique",
  "category": "Effets Visuels & Shaders",
  "type": "visual_fx",
  "characterTitle": "Structure Hypnotique en Perspective",
  "description": "Anneaux concentriques plongeant vers le fond de scène, créant une illusion de profondeur tridimensionnelle.",
  "iconType": "tunnel",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 12,
  "color": "#8b5cf6",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.45,
   "scale": 1.2,
   "rotationDeg": 0,
   "opacity": 0.8,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "vortex_spiral",
  "motionSpeed": 1.2,
  "visualFx": "vortex_tunnel",
  "fxIntensity": 0.9,
  "audioConfig": {
   "enabled": true,
   "volume": 0.4,
   "reactiveToSteps": false,
   "synthPreset": "drone_dark"
  },
  "createdAt": "Préréglage Shaders"
 },
 {
  "id": "elem-fog-volumetric",
  "name": "Brume Volumétrique Scénique",
  "category": "Matières & Environnements",
  "type": "environment_matter",
  "characterTitle": "Nappe de Fumée Éthérée au Sol",
  "description": "Nappe vaporeuse de fumée numérique rasant le sol du plateau et réagissant aux traversées des comédiens.",
  "iconType": "fog",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 20,
  "color": "#94a3b8",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.78,
   "scale": 1.5,
   "rotationDeg": 0,
   "opacity": 0.7,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "slow_drift",
  "motionSpeed": 0.6,
  "visualFx": "fog_volumetric",
  "fxIntensity": 0.75,
  "audioConfig": {
   "enabled": true,
   "volume": 0.35,
   "reactiveToSteps": false,
   "synthPreset": "wind_texture"
  },
  "createdAt": "Préréglage Matières"
 },
 {
  "id": "elem-water-ripples",
  "name": "Miroir d’Eau & Ondes Réfractives",
  "category": "Matières & Environnements",
  "type": "environment_matter",
  "characterTitle": "Sol Scénique Aquatique Réactif",
  "description": "Ondes concentriques liquides générées à chaque point de contact, avec réfraction optique et son de goutte.",
  "iconType": "particles",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 16,
  "color": "#38bdf8",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.76,
   "scale": 1.4,
   "rotationDeg": 0,
   "opacity": 0.85,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "slow_drift",
  "motionSpeed": 0.9,
  "visualFx": "water_ripples",
  "fxIntensity": 0.8,
  "audioConfig": {
   "enabled": true,
   "volume": 0.5,
   "reactiveToSteps": true,
   "synthPreset": "water_droplet"
  },
  "createdAt": "Préréglage Matières"
 },
 {
  "id": "elem-particle-boids",
  "name": "Nuée d’Oiseaux Lumineux (Boids)",
  "category": "Lumière & Créatures",
  "type": "light_creature",
  "characterTitle": "Essaim Génératif Reynolds",
  "description": "Nuée de particules volantes suivant les lois d’attraction, d’évitement et d’alignement avec scintillements.",
  "iconType": "particles",
  "defaultTrackId": "track-2-creatures",
  "defaultDuration": 18,
  "color": "#fbbf24",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.35,
   "scale": 1.1,
   "rotationDeg": 0,
   "opacity": 0.9,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "flocking_flight",
  "motionSpeed": 1.25,
  "visualFx": "particle_boids",
  "fxIntensity": 0.85,
  "audioConfig": {
   "enabled": true,
   "volume": 0.45,
   "reactiveToSteps": false,
   "synthPreset": "shimmer_reverb"
  },
  "createdAt": "Préréglage Créatures"
 },
 {
  "id": "elem-jellyfish-swarm",
  "name": "Banc de Méduses Fluorescentes",
  "category": "Lumière & Créatures",
  "type": "light_creature",
  "characterTitle": "Créatures Abyssales Volumétriques",
  "description": "Méduses translucides ondulantes avec ombrelle contractile et longs filaments phosphorescents cyans.",
  "iconType": "jellyfish",
  "defaultTrackId": "track-2-creatures",
  "defaultDuration": 18,
  "color": "#2dd4bf",
  "defaultTransform": {
   "x": 0.6,
   "y": 0.4,
   "scale": 1.2,
   "rotationDeg": 0,
   "opacity": 0.85,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "oceanic_swim",
  "motionSpeed": 0.8,
  "visualFx": "glow",
  "fxIntensity": 0.75,
  "audioConfig": {
   "enabled": true,
   "volume": 0.4,
   "reactiveToSteps": false,
   "synthPreset": "sparkle_pentatonic"
  },
  "createdAt": "Préréglage Créatures"
 },
 {
  "id": "elem-fire-braziers",
  "name": "Brasier Numérique & Braises",
  "category": "Matières & Environnements",
  "type": "environment_matter",
  "characterTitle": "Particules Incandescentes de Plateau",
  "description": "Flammes scéniques stylisées montant vers le cintre avec gerbes d’étincelles crépitantes.",
  "iconType": "fire",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 16,
  "color": "#f97316",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.75,
   "scale": 1.3,
   "rotationDeg": 0,
   "opacity": 0.9,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "slow_drift",
  "motionSpeed": 1.1,
  "visualFx": "none",
  "fxIntensity": 0.8,
  "audioConfig": {
   "enabled": true,
   "volume": 0.5,
   "reactiveToSteps": false,
   "synthPreset": "sub_rumble"
  },
  "createdAt": "Préréglage Matières"
 },
 {
  "id": "elem-compound-pirate-echo",
  "name": "Bloc Composé : Pirate & Écho Spectral",
  "category": "Blocs Composés",
  "type": "compound_block",
  "characterTitle": "Ensemble : Silhouette + Slit-Scan + Audio",
  "description": "Regroupement pré-synchronisé : Ombre du Pirate en danse autonome, effet Slit-Scan et pulsation audio synchrone.",
  "iconType": "compound",
  "defaultTrackId": "track-1-shadows",
  "defaultDuration": 15,
  "color": "#eab308",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.7,
   "scale": 1.3,
   "rotationDeg": 0,
   "opacity": 1,
   "flipHorizontal": false
  },
  "animationMode": "hybrid",
  "motionStyle": "pirate_dance",
  "motionSpeed": 1.1,
  "costume": {
   "hatType": "tricorn",
   "hasSashBelt": true,
   "hasCutlassSabre": true,
   "hasCoatFlaps": true,
   "featherAngle": -25
  },
  "visualFx": "slit_scan",
  "fxIntensity": 0.75,
  "audioConfig": {
   "enabled": true,
   "volume": 0.75,
   "reactiveToSteps": true,
   "synthPreset": "footstep_wood"
  },
  "isCompound": true,
  "compoundSubElements": [
   {
    "elementId": "elem-pirate-shadow",
    "relativeStartTime": 0,
    "duration": 15,
    "opacity": 1
   },
   {
    "elementId": "elem-fx-slitscan",
    "relativeStartTime": 2,
    "duration": 13,
    "opacity": 0.7
   }
  ],
  "createdAt": "Regroupement scénographique"
 },
 {
  "id": "elem-compound-ritual-fog",
  "name": "Bloc Composé : Rituel de Brume & Ondes",
  "category": "Blocs Composés",
  "type": "compound_block",
  "characterTitle": "Ensemble : Danseur Spectral + Brume + Eau",
  "description": "Ambiance onirique : Danseur spectral, nappe de brume au sol, ondes réfractives et bol tibétain résonant.",
  "iconType": "compound",
  "defaultTrackId": "track-1-shadows",
  "defaultDuration": 20,
  "color": "#a855f7",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.72,
   "scale": 1.25,
   "rotationDeg": 0,
   "opacity": 0.9,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "mystic_spin",
  "motionSpeed": 0.85,
  "visualFx": "peppers_ghost",
  "fxIntensity": 0.8,
  "audioConfig": {
   "enabled": true,
   "volume": 0.6,
   "reactiveToSteps": true,
   "synthPreset": "tibetan_bowl"
  },
  "isCompound": true,
  "compoundSubElements": [
   {
    "elementId": "elem-dancer-ghost",
    "relativeStartTime": 0,
    "duration": 20,
    "opacity": 0.9
   },
   {
    "elementId": "elem-fog-volumetric",
    "relativeStartTime": 1,
    "duration": 19,
    "opacity": 0.75
   },
   {
    "elementId": "elem-water-ripples",
    "relativeStartTime": 3,
    "duration": 17,
    "opacity": 0.8
   }
  ],
  "createdAt": "Regroupement scénographique"
 },
 {
  "id": "elem-crystal-golem",
  "name": "Golem de Cristal (Voronoï)",
  "category": "Personnages & Ombres",
  "type": "performer_shadow",
  "characterTitle": "Colosse Minéral en Facettes de Quartz",
  "description": "Silhouette androïde polygonale cristalline qui pulse et se fracture sous les impacts de pas avec résonance FM.",
  "iconType": "golem",
  "defaultTrackId": "track-1-shadows",
  "defaultDuration": 18,
  "color": "#38bdf8",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.72,
   "scale": 1.4,
   "rotationDeg": 0,
   "opacity": 0.95,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "voronoi_shatter",
  "motionSpeed": 0.8,
  "visualFx": "voronoi_shatter",
  "fxIntensity": 0.85,
  "audioConfig": {
   "enabled": true,
   "volume": 0.6,
   "reactiveToSteps": true,
   "synthPreset": "crystal_resonance"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-aurora-veil",
  "name": "Voile d’Aurore Boréale",
  "category": "Matières & Environnements",
  "type": "environment_matter",
  "characterTitle": "Drapé d’Ondes Luminescentes en Cintre",
  "description": "Rubans ondulants émeraude et magenta flottant au-dessus du plateau comme un drapé de soie céleste réactif au vent.",
  "iconType": "aurora",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 22,
  "color": "#10b981",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.28,
   "scale": 1.6,
   "rotationDeg": 0,
   "opacity": 0.8,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "slow_drift",
  "motionSpeed": 0.7,
  "visualFx": "aurora_borealis",
  "fxIntensity": 0.85,
  "audioConfig": {
   "enabled": true,
   "volume": 0.45,
   "reactiveToSteps": false,
   "synthPreset": "wind_texture"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-lorenz-butterfly",
  "name": "Papillon du Chaos (Lorenz)",
  "category": "Lumière & Créatures",
  "type": "light_creature",
  "characterTitle": "Attracteur Étrange Non-Linéaire",
  "description": "Créature cinématique traçant en temps réel les orbites chaotiques déterministes d’Edward Lorenz avec étincelles d’or.",
  "iconType": "particles",
  "defaultTrackId": "track-2-creatures",
  "defaultDuration": 16,
  "color": "#f59e0b",
  "defaultTransform": {
   "x": 0.52,
   "y": 0.45,
   "scale": 1.3,
   "rotationDeg": 0,
   "opacity": 0.9,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "vortex_spiral",
  "motionSpeed": 1.15,
  "visualFx": "particle_boids",
  "fxIntensity": 0.9,
  "audioConfig": {
   "enabled": true,
   "volume": 0.5,
   "reactiveToSteps": false,
   "synthPreset": "sparkle_pentatonic"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-stargate-portal",
  "name": "Portail des Étoiles (Stargate)",
  "category": "Effets Visuels & Shaders",
  "type": "visual_fx",
  "characterTitle": "Anneau de Déformation Gravitationnelle",
  "description": "Anneau rotatif concentrique aspirant visuellement les lumières de scène avec courbure d’espace et horizon noir.",
  "iconType": "portal",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 18,
  "color": "#6366f1",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.45,
   "scale": 1.35,
   "rotationDeg": 0,
   "opacity": 0.88,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "vortex_spiral",
  "motionSpeed": 0.9,
  "visualFx": "stargate_lensing",
  "fxIntensity": 0.9,
  "audioConfig": {
   "enabled": true,
   "volume": 0.65,
   "reactiveToSteps": false,
   "synthPreset": "drone_dark"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-kinetic-chessboard",
  "name": "Échiquier Cinétique 3D",
  "category": "Matières & Environnements",
  "type": "environment_matter",
  "characterTitle": "Sol de Pistons Pyramidaux Scéniques",
  "description": "Matrice de dalles en perspective théâtrale s’élevant et s’enfonçant comme des pistons mécaniques au rythme des pas.",
  "iconType": "chessboard",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 18,
  "color": "#cbd5e1",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.78,
   "scale": 1.5,
   "rotationDeg": 0,
   "opacity": 0.85,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "piston_pulse",
  "motionSpeed": 1,
  "visualFx": "kinetic_mesh",
  "fxIntensity": 0.8,
  "audioConfig": {
   "enabled": true,
   "volume": 0.55,
   "reactiveToSteps": true,
   "synthPreset": "metallic_pulse"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-biolum-dragon",
  "name": "Dragon Stellaire d’Or",
  "category": "Lumière & Créatures",
  "type": "light_creature",
  "characterTitle": "Serpent Céleste en Chaîne Cinématique",
  "description": "Grand reptile lumineux articulé en 24 segments reliés ondulant d’un bord à l’autre du plateau avec sillage d’or.",
  "iconType": "dragon",
  "defaultTrackId": "track-2-creatures",
  "defaultDuration": 20,
  "color": "#fbbf24",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.38,
   "scale": 1.45,
   "rotationDeg": 0,
   "opacity": 0.95,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "dragon_flight",
  "motionSpeed": 1.1,
  "visualFx": "trails",
  "fxIntensity": 0.85,
  "audioConfig": {
   "enabled": true,
   "volume": 0.55,
   "reactiveToSteps": false,
   "synthPreset": "shimmer_reverb"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-thermal-phantom",
  "name": "Fantôme Thermique Infrarouge",
  "category": "Effets Visuels & Shaders",
  "type": "visual_fx",
  "characterTitle": "Thermographie Corporelle en Fausses Couleurs",
  "description": "Silhouette décomposée en gradient spectral (UV, bleu glacier, ambre, blanc brûlé) révélant l’énergie calorifique.",
  "iconType": "sun",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 15,
  "color": "#ec4899",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.5,
   "scale": 1.1,
   "rotationDeg": 0,
   "opacity": 0.85,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "slow_drift",
  "motionSpeed": 0.95,
  "visualFx": "thermal_lut",
  "fxIntensity": 0.85,
  "audioConfig": {
   "enabled": true,
   "volume": 0.5,
   "reactiveToSteps": true,
   "synthPreset": "tibetan_bowl"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-sand-mandala",
  "name": "Mandala de Sable & Souffle",
  "category": "Matières & Environnements",
  "type": "environment_matter",
  "characterTitle": "Rosace Sacrée au Sol avec Dispersion",
  "description": "Rosace géométrique 12 axes dessinée au sol, dont les grains de sable sont dispersés par un coup de vent scénique.",
  "iconType": "mandala",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 18,
  "color": "#f59e0b",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.76,
   "scale": 1.35,
   "rotationDeg": 0,
   "opacity": 0.9,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "mandala_spin",
  "motionSpeed": 0.6,
  "visualFx": "mandala_dispersion",
  "fxIntensity": 0.8,
  "audioConfig": {
   "enabled": true,
   "volume": 0.5,
   "reactiveToSteps": false,
   "synthPreset": "tibetan_bowl"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-solar-eclipse",
  "name": "Éclipse Coronaire Scénique",
  "category": "Effets Visuels & Shaders",
  "type": "visual_fx",
  "characterTitle": "Disque Solaire Oublié & Éjections FBM",
  "description": "Disque noir d’occultation totale entouré d’éruptions solaires incandescentes et de rayons perçant l’obscurité.",
  "iconType": "sun",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 16,
  "color": "#ea580c",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.35,
   "scale": 1.25,
   "rotationDeg": 0,
   "opacity": 0.9,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "vortex_spiral",
  "motionSpeed": 0.8,
  "visualFx": "solar_corona",
  "fxIntensity": 0.9,
  "audioConfig": {
   "enabled": true,
   "volume": 0.6,
   "reactiveToSteps": false,
   "synthPreset": "deep_sub_drone"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-liquid-mercury",
  "name": "Mercure Liquide Réflectif",
  "category": "Matières & Environnements",
  "type": "environment_matter",
  "characterTitle": "Metaballs Chromées à Tension de Surface",
  "description": "Nappe de métal liquide réfléchissant le plateau, se séparant en plusieurs billes mercurielles puis fusionnant à nouveau.",
  "iconType": "mercury",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 16,
  "color": "#94a3b8",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.78,
   "scale": 1.4,
   "rotationDeg": 0,
   "opacity": 0.9,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "mercury_flow",
  "motionSpeed": 1,
  "visualFx": "mercury_metaballs",
  "fxIntensity": 0.85,
  "audioConfig": {
   "enabled": true,
   "volume": 0.5,
   "reactiveToSteps": true,
   "synthPreset": "water_droplet"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-synaptic-neural",
  "name": "Arborescence Synaptique",
  "category": "Effets Visuels & Shaders",
  "type": "visual_fx",
  "characterTitle": "Réseau Neuronal & Axones de Lumière",
  "description": "Arbre synaptique dont les terminaisons parcourent le décor et s’illuminent par impulsions de potentiel d’action.",
  "iconType": "synapse",
  "defaultTrackId": "track-3-fx",
  "defaultDuration": 18,
  "color": "#06b6d4",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.45,
   "scale": 1.3,
   "rotationDeg": 0,
   "opacity": 0.85,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "synaptic_burst",
  "motionSpeed": 1.15,
  "visualFx": "synaptic_pulse",
  "fxIntensity": 0.85,
  "audioConfig": {
   "enabled": true,
   "volume": 0.45,
   "reactiveToSteps": false,
   "synthPreset": "sparkle_pentatonic"
  },
  "createdAt": "Création Scénique Vibe"
 },
 {
  "id": "elem-compound-stargate-golem",
  "name": "Bloc Composé : Portail & Golem Minéral",
  "category": "Blocs Composés",
  "type": "compound_block",
  "characterTitle": "Ensemble : Portail Cosmique + Golem Voronoï + Drone",
  "description": "Séquence scénique d’invocation : Ouverture du Portail Stargate (Layer 3), réveil du Golem de Cristal (Layer 1) et bourdon sourd.",
  "iconType": "compound",
  "defaultTrackId": "track-1-shadows",
  "defaultDuration": 22,
  "color": "#6366f1",
  "defaultTransform": {
   "x": 0.5,
   "y": 0.72,
   "scale": 1.4,
   "rotationDeg": 0,
   "opacity": 1,
   "flipHorizontal": false
  },
  "animationMode": "autonomous",
  "motionStyle": "voronoi_shatter",
  "motionSpeed": 0.85,
  "visualFx": "voronoi_shatter",
  "fxIntensity": 0.9,
  "audioConfig": {
   "enabled": true,
   "volume": 0.7,
   "reactiveToSteps": true,
   "synthPreset": "crystal_resonance"
  },
  "isCompound": true,
  "compoundSubElements": [
   {
    "elementId": "elem-stargate-portal",
    "relativeStartTime": 0,
    "duration": 22,
    "opacity": 0.85
   },
   {
    "elementId": "elem-crystal-golem",
    "relativeStartTime": 2,
    "duration": 20,
    "opacity": 1
   }
  ],
  "createdAt": "Regroupement scénographique"
 }
];
export const SCENIC_TRACKS = [
 {
  "id": "track-1-shadows",
  "name": "Layer 1 — Scénographie & Ombres",
  "layerNumber": 1,
  "color": "#d7b86a",
  "isMuted": false,
  "isSolo": false,
  "opacity": 1,
  "blendMode": "normal"
 },
 {
  "id": "track-2-creatures",
  "name": "Layer 2 — Créatures & Lumière",
  "layerNumber": 2,
  "color": "#38bdf8",
  "isMuted": false,
  "isSolo": false,
  "opacity": 0.95,
  "blendMode": "screen"
 },
 {
  "id": "track-3-fx",
  "name": "Layer 3 — Effets Visuels & Shaders",
  "layerNumber": 3,
  "color": "#a855f7",
  "isMuted": false,
  "isSolo": false,
  "opacity": 0.8,
  "blendMode": "screen"
 },
 {
  "id": "track-4-audio",
  "name": "Layer 4 — Audio & Synthèse Synchrone",
  "layerNumber": 4,
  "color": "#10b981",
  "isMuted": false,
  "isSolo": false,
  "opacity": 1,
  "blendMode": "normal"
 }
];
export const SCENIC_CUES = [
 {
  "id": "cue-1",
  "cueNumber": 1,
  "label": "TOP 1 — Entrée comédien à jardin",
  "timeSec": 0,
  "action": "jump_and_play",
  "oscAddress": "/cue/1",
  "description": "Le comédien entre en scène à jardin. Silhouette miroir prête."
 },
 {
  "id": "cue-2",
  "cueNumber": 2,
  "label": "TOP 2 — Détachement de l’ombre (Autonome)",
  "timeSec": 4.5,
  "action": "switch_mode",
  "oscAddress": "/cue/2",
  "description": "L’ombre se détache du comédien et avance seule vers le centre du plateau."
 },
 {
  "id": "cue-3",
  "cueNumber": 3,
  "label": "TOP 3 — Danse du pirate & Slit-Scan temporel",
  "timeSec": 10,
  "action": "jump_and_play",
  "oscAddress": "/cue/3",
  "description": "L’ombre entame sa danse avec sabre et redingote. Activation de l’écho slit-scan."
 },
 {
  "id": "cue-4",
  "cueNumber": 4,
  "label": "TOP 4 — Entrée du Chat de lumière (Duo)",
  "timeSec": 16,
  "action": "jump_and_play",
  "oscAddress": "/cue/4",
  "description": "Le Chat de lumière entre à cour et accompagne les pas du pirate."
 },
 {
  "id": "cue-5",
  "cueNumber": 5,
  "label": "TOP 5 — Fondu scénique final",
  "timeSec": 25,
  "action": "fade_black",
  "oscAddress": "/cue/5",
  "description": "Fondu au noir progressif et retour au silence."
 }
];
