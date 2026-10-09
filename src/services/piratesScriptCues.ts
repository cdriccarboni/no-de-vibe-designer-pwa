// Catalogue des Cues, Didascalies Réelles & 8 Scènes Canoniques
// « PIRATES PAILLETTES ! V2.1.26 » — Source didascalies du manuscrit de 60 pages

import {
  ScriptCueItem,
  DramaturgicalScenePreset,
  LiveDrawingObject
} from '../types/livingScenography';

// 1. LES 8 SCÈNES-EXEMPLES CANONIQUES AVEC FICHES DRAMATURGIQUES
export const CANONICAL_PIRATES_SCENES: DramaturgicalScenePreset[] = [
  {
    id: 'scene-1-radio-greve',
    title: '1. Radio Paillettes en grève',
    subtitle: 'Studio triangulaire, vinyle lointain et karaoké sur rideau de fils',
    scriptPages: 'Pages 2 à 5',
    summary: 'Ouverture du spectacle : arrêt sur image des comédiennes, Maxime s’installe face à son micro, ON AIR s’allume, karaoké projeté sur le rideau de fils.',
    dramaturgyIntent: 'Poser l’univers de la radio pirate en contraste immédiat avec la grève générale. La voix intime s’oppose au karaoké festif des Destiny’s Child traversant le rideau de fils.',
    keyElements: [
      'Studio de radio triangulaire au centre du plateau',
      'Douche centrée sur Maxime apparaissant en 8 secondes',
      'Voyant ON AIR rouge commuté en régie',
      'Grésillement vinyle analogique au loin',
      'Karaoké "Independent Woman Part I" projeté sur rideau de fils à 19s',
      'Traversée physique du rideau de fils par le trio féminin et baisse de 10 dB'
    ],
    defaultShader: 'wispy_bg',
    anaglyphActive: false,
    defaultLightMode: 'shower_spot',
    onAirState: true,
    defaultSoundPreset: 'vinyle_lointain',
    safeFallbackExplanation: 'Si aucun projecteur n’est relié, la simulation d’éclairage en douche et le rideau de fils s’affichent directement sur le canvas 2D.',
    testingWithoutHardwareGuide: 'Cliquer sur GO pour lancer la douche en 8s, observer l’allumage ON AIR et la baisse de 10 dB au passage de la didascalie de p. 5.',
    initialCues: [
      {
        id: 'cue-p2-sirene',
        pageNumber: 2,
        label: 'CUE 1.1 — Sirène assourdissante & Arrêt sur image',
        track: 'sound',
        trackCode: '[S]',
        description: 'Une sirène assourdissante retentit. Toutes sont en arrêt sur image.',
        timeSec: 0,
        durationSec: 4,
        triggerMode: 'manual_go',
        safeState: 'Sirène stoppée, comédiennes figées',
        regieNotes: 'Déclenchement franc. Maxime continue seul à vaquer à ses occupations.',
        status: 'pending'
      },
      {
        id: 'cue-p3-douche',
        pageNumber: 3,
        label: 'CUE 1.2 — Douche Maxime (8s) & Noir plateau',
        track: 'light',
        trackCode: '[L]',
        description: 'Fondu lumière plateau en 8s. Apparition de la douche centrée sur Maxime en 8s. Noir plateau.',
        timeSec: 4,
        durationSec: 8,
        triggerMode: 'auto_follow',
        safeState: 'Douche zénithale allumée, pourtour noir',
        regieNotes: 'Lumière tamisée progressive jusqu’à l’isolement de la station radio.',
        status: 'pending',
        actionPayload: { lightState: 'shower_spot' }
      },
      {
        id: 'cue-p4-onair',
        pageNumber: 4,
        label: 'CUE 1.3 — Voyant ON AIR & Grésillement Vinyle',
        track: 'regie',
        trackCode: '[R]',
        description: 'ON AIR (allumé). Grésillement du disque vinyle au loin.',
        timeSec: 12,
        durationSec: 5,
        triggerMode: 'auto_follow',
        safeState: 'Témoin ON AIR actif',
        regieNotes: 'Voyant rouge visible au pupitre radio.',
        status: 'pending',
        actionPayload: { onAir: true, soundPresetId: 'vinyle_lointain' }
      },
      {
        id: 'cue-p4-karaoke',
        pageNumber: 4,
        label: 'CUE 1.4 — Karaoké sur rideau de fils (19s)',
        track: 'video',
        trackCode: '[V]',
        description: 'Apparition d’un karaoké projeté sur les rideaux de fils au bout de 19s (durée 1 min 17s).',
        timeSec: 17,
        durationSec: 19,
        triggerMode: 'timecode',
        safeState: 'Texte défilant projeté sur les fils verticaux',
        regieNotes: 'Independent Woman Part I - Destiny’s Child.',
        status: 'pending',
        actionPayload: { shaderId: 'wispy_bg' }
      },
      {
        id: 'cue-p5-traversee',
        pageNumber: 5,
        label: 'CUE 1.5 — Traversée des fils & Baisse de 10 dB',
        track: 'stage',
        trackCode: '[J]',
        description: 'Les filles entrent en traversant le rideau de fils. Arrêt karaoké. La musique baisse de 10 dB.',
        timeSec: 36,
        durationSec: 6,
        triggerMode: 'manual_go',
        safeState: 'Niveau sonore atténué de 10 dB',
        regieNotes: 'Maxime enlève son casque lorsque le trio s’avance vers lui.',
        status: 'pending',
        actionPayload: { volumeFadeDb: -10 }
      }
    ]
  },
  {
    id: 'scene-2-porte-anaglyphe',
    title: '2. Porte dessinée / passage anaglyphe',
    subtitle: 'Station dessin à cour, porte franchissable et vortex stéréoscopique',
    scriptPages: 'Page 22',
    summary: 'Alexandra commence à dessiner une porte sur la toile. La porte apparaît sur le rideau de fils à jardin. Maxime chausse son chapeau et passe à travers. Effet tourbillon hypnotique anaglyphe.',
    dramaturgyIntent: 'La bascule du réel radiophonique vers la fable pirate imaginaire. Le geste graphique direct d’Alexandra devient une issue scénique concrète.',
    keyElements: [
      'Station dessin direct en temps réel à cour',
      'Porte dessinée apparaissant sur le rideau de fils à jardin',
      'Chapeau de pirate chaussé par Maxime',
      'Traversée physique de la porte virtuelle par Maxime',
      'Tourbillon hypnotique anaglyphe rouge/cyan'
    ],
    defaultShader: 'anaglyph_vortex',
    anaglyphActive: true,
    defaultLightMode: 'full',
    onAirState: false,
    defaultSoundPreset: 'ballon_chamoisine',
    associatedDrawingId: 'draw-door-alexandra',
    safeFallbackExplanation: 'Le filtre anaglyphe possède une bascule immédiate vers une version 2D monochrome pure pour le confort des spectateurs sans lunettes.',
    testingWithoutHardwareGuide: 'Dessiner ou charger la porte dans la station graphique, activer la convergence anaglyphe puis tester la bascule de sécurité 2D.',
    initialCues: [
      {
        id: 'cue-p22-dessin-porte',
        pageNumber: 22,
        label: 'CUE 2.1 — Alexandra trace la porte',
        track: 'video',
        trackCode: '[V]',
        description: 'Alexandra se met à dessiner. Une porte apparaît sur le rideau de fils à jardin.',
        timeSec: 0,
        durationSec: 8,
        triggerMode: 'manual_go',
        safeState: 'Contour vectoriel de porte affiché sur le rideau',
        regieNotes: 'Tracé progressif synchronisé avec la comédienne.',
        status: 'pending',
        actionPayload: { drawingId: 'draw-door-alexandra' }
      },
      {
        id: 'cue-p22-passage-porte',
        pageNumber: 22,
        label: 'CUE 2.2 — Maxime chausse le tricorne & franchit la porte',
        track: 'stage',
        trackCode: '[J]',
        description: 'Maxime chausse son chapeau et passe à travers la porte dessinée.',
        timeSec: 8,
        durationSec: 6,
        triggerMode: 'manual_go',
        safeState: 'Masque d’ouverture transparent au centre des fils',
        regieNotes: 'Passage physique du comédien à travers les fils.',
        status: 'pending'
      },
      {
        id: 'cue-p22-tourbillon',
        pageNumber: 22,
        label: 'CUE 2.3 — Tourbillon hypnotique anaglyphe',
        track: 'video',
        trackCode: '[V]',
        description: 'Effet tourbillon hypnotique anaglyphe stéréoscopique.',
        timeSec: 14,
        durationSec: 10,
        triggerMode: 'auto_follow',
        safeState: 'Mode secours 2D disponible en un clic',
        regieNotes: 'Avertissement de confort visuel affiché.',
        status: 'pending',
        actionPayload: { shaderId: 'anaglyph_vortex', anaglyphEnabled: true }
      }
    ]
  },
  {
    id: 'scene-3-limbes',
    title: '3. Les Limbes',
    subtitle: 'Brume numérique, vents manufacturés et silhouettes des sorcières',
    scriptPages: 'Pages 23 à 24',
    summary: 'Entrée dans le monde d’outre-tombe : shader numérique des limbes, sifflets aztèques, appeaux de corbeaux, entrée des 3 sorcières, ombre du Capitaine Crunch flûte en main et choc de la jambe de bois.',
    dramaturgyIntent: 'Créer un espace acousmatique où tous les sons sont fabriqués à vue avec des objets détournés face à la silhouette mystique du pirate.',
    keyElements: [
      'Shader vidéo numérique « Les limbes » (fumées pourpres et profondeur)',
      'Sifflet tête de mort aztèque & flûte traversière avec claquage mécanique',
      'Appeaux corbeaux, guiro grenouilles, ocarina chouettes',
      'Entrée en bloc des trois sorcières',
      'Ombre du Capitaine Crunch, flûte en main',
      'Bruitage piezo du choc de la jambe de bois (résonance 85 Hz)'
    ],
    defaultShader: 'limbes',
    anaglyphActive: false,
    defaultLightMode: 'shower_spot',
    onAirState: false,
    defaultSoundPreset: 'piezo_jambe_bois',
    safeFallbackExplanation: 'Le compositeur 2D remplace le raymarching WebGL par une double nappe de brume vectorielle à gradient.',
    testingWithoutHardwareGuide: 'Déclencher les bruitages de piezo et de flûte dans le studio sonore et vérifier le rendu des sorcières sur le rideau.',
    initialCues: [
      {
        id: 'cue-p23-shader-limbes',
        pageNumber: 23,
        label: 'CUE 3.1 — Shaders vidéo numérique : Les limbes',
        track: 'video',
        trackCode: '[V]',
        description: 'Les limbes : shaders vidéo numérique.',
        timeSec: 0,
        durationSec: 12,
        triggerMode: 'manual_go',
        safeState: 'Volutes spectrales sur fond noir',
        regieNotes: 'Ambiance obscure et brumeuse.',
        status: 'pending',
        actionPayload: { shaderId: 'limbes' }
      },
      {
        id: 'cue-p23-bruitages-limbes',
        pageNumber: 23,
        label: 'CUE 3.2 — Bruitages physiques : Sifflet aztèque & Faune',
        track: 'sound',
        trackCode: '[S]',
        description: 'Vent étrange (flûte + claquage), sifflet aztèque, chouettes (ocarina), grenouilles (guiro), corbeaux (appeau + parapluies).',
        timeSec: 2,
        durationSec: 8,
        triggerMode: 'auto_follow',
        safeState: 'Bruitages physiques actifs au plateau',
        regieNotes: 'Réalisés en direct par les comédiens.',
        status: 'pending',
        actionPayload: { soundPresetId: 'sifflet_azteque' }
      },
      {
        id: 'cue-p24-crunch-ombre',
        pageNumber: 24,
        label: 'CUE 3.3 — Entre Capitaine Crunch & Choc jambe de bois',
        track: 'stage',
        trackCode: '[J]',
        description: 'Entre Capitaine Crunch, flûte en main. De lui on ne discerne que son ombre. Choc de la jambe de bois sur le sol (plaque piezo).',
        timeSec: 10,
        durationSec: 8,
        triggerMode: 'manual_go',
        safeState: 'Silhouette sombre de profil avec tricorne et flûte',
        regieNotes: 'Grincements de bois (bouteille froissée).',
        status: 'pending',
        actionPayload: { soundPresetId: 'piezo_jambe_bois' }
      }
    ]
  },
  {
    id: 'scene-4-tempete-naufrage',
    title: '4. Tempête et naufrage',
    subtitle: 'Éclairs, vagues déchaînées, répliques inversées et ombres de navires',
    scriptPages: 'Pages 30 à 32',
    summary: 'Le cataclysme maritime : cloches de bateau, shader « La tempête » + anaglyphe FX, flashs lumineux, psaume inversé des sorcières, submersion du bateau pirate et ombre du capitaine surplombant la scène.',
    dramaturgyIntent: 'L’apogée dramatique où le théâtre d’objets (boîte à tonnerre, plaque de plexiglas) fusionne avec la projection de silhouettes de navires engloutis.',
    keyElements: [
      'Cloches de bateau frappées plusieurs fois',
      'Hijo de la Luna — Cloches musicales (thème 2 fois)',
      'Éclairs stroboscopiques en douche et plein cadre',
      'Shader vidéo numérique « La tempête » avec turbulence fbm',
      'Ombres de bateaux pirates projetées sur le fond',
      'Paroles inversées en tourbillon sonore infernal des sorcières (« Malheur ! »)',
      'L’ombre du capitaine regarde ce désastre de loin'
    ],
    defaultShader: 'tempete',
    anaglyphActive: true,
    defaultLightMode: 'lightning_flash',
    onAirState: false,
    defaultSoundPreset: 'boite_tonnerre_etain',
    safeFallbackExplanation: 'Le bouton d’urgence BLACKOUT permet de couper instantanément les flashs d’éclairs et le filtre anaglyphe en cas de sensibilité visuelle.',
    testingWithoutHardwareGuide: 'Lancer CUE 4.2 pour tester la superposition tonnerre/vagues/éclair et observer l’inversion sonore des répliques.',
    initialCues: [
      {
        id: 'cue-p30-cloches',
        pageNumber: 30,
        label: 'CUE 4.1 — Cloches de bateau & Tonnerre',
        track: 'sound',
        trackCode: '[S]',
        description: 'Cloches de bateau frappées. Tonnerre : boîte à tonnerre + feuille d’étain + plaque plexiglas.',
        timeSec: 0,
        durationSec: 6,
        triggerMode: 'manual_go',
        safeState: 'Résonance métallique marine',
        regieNotes: 'Hijo de la luna aux cloches de table.',
        status: 'pending',
        actionPayload: { soundPresetId: 'cloches_bateau' }
      },
      {
        id: 'cue-p31-shader-tempete',
        pageNumber: 31,
        label: 'CUE 4.2 — Shader La Tempête & Éclairs flash',
        track: 'video',
        trackCode: '[V]',
        description: 'La tempête : shaders vidéo numérique + anaglyphe FX. Éclair : flash lumineux.',
        timeSec: 6,
        durationSec: 15,
        triggerMode: 'auto_follow',
        safeState: 'Vagues houleuses et pluie battante',
        regieNotes: 'Ambiance sonore grand orchestral + bouteilles frangées.',
        status: 'pending',
        actionPayload: { shaderId: 'tempete', anaglyphEnabled: true, lightState: 'lightning_flash' }
      },
      {
        id: 'cue-p31-naufrage-ombres',
        pageNumber: 31,
        label: 'CUE 4.3 — Naufrage : Ombres de navires engloutis',
        track: 'video',
        trackCode: '[V]',
        description: 'Plusieurs ombres de bateaux pirates projetées sur le fond. La mer semble déchaînée. L’ombre du capitaine surplombe la scène.',
        timeSec: 21,
        durationSec: 14,
        triggerMode: 'manual_go',
        safeState: 'Navires oscillants engloutis par les vagues',
        regieNotes: 'Tourbillon sonore des paroles inversées des sorcières.',
        status: 'pending',
        actionPayload: { soundPresetId: 'boite_tonnerre_etain' }
      }
    ]
  },
  {
    id: 'scene-5-water-sim',
    title: '5. Water Simulation musicale',
    subtitle: 'La mer réagit en temps réel à la flûte et aux cloches',
    scriptPages: 'Pages 35 à 36',
    summary: 'Après la tempête : apaisement sur l’océan. Shader « Water simulation » dont les mouvements liquides évoluent en direct au son de la flûte de JulieBe et des cloches de Maxime.',
    dramaturgyIntent: 'Démontrer l’interaction symbiotique entre la musique acoustique jouée sur le plateau et la matière numérique projetée.',
    keyElements: [
      'Shader vidéo numérique « Water simulation »',
      'Modulation en direct de la hauteur et vitesse des vagues selon l’audio',
      'Quatre silhouettes discernées au loin',
      'My Heart Will Go On joué à la flûte à bec et cloches musicales',
      'Pauses et reprises musicales synchronisées avec les mouvements marins'
    ],
    defaultShader: 'water_sim',
    anaglyphActive: false,
    defaultLightMode: 'full',
    onAirState: false,
    defaultSoundPreset: 'my_heart_will_go_on_flute',
    safeFallbackExplanation: 'Si aucun microphone n’est ouvert, la simulation utilise un oscillateur LFO harmonique interne simulant la respiration de la flûte.',
    testingWithoutHardwareGuide: 'Ajuster le slider de réactivité audio ou déclencher le preset de flûte pour voir la houle s’adapter instantanément.',
    initialCues: [
      {
        id: 'cue-p35-water-sim',
        pageNumber: 35,
        label: 'CUE 5.1 — Water simulation réactive',
        track: 'video',
        trackCode: '[V]',
        description: 'Water simulation : shaders vidéo numérique. Les mouvements de la mer évoluent en fonction de la musique.',
        timeSec: 0,
        durationSec: 18,
        triggerMode: 'manual_go',
        safeState: 'Mer calme bleu cyan ondulant en rythme',
        regieNotes: 'Quatre silhouettes au loin.',
        status: 'pending',
        actionPayload: { shaderId: 'water_sim' }
      },
      {
        id: 'cue-p35-duo-musical',
        pageNumber: 35,
        label: 'CUE 5.2 — Duo Flûte & Cloches (Titanic theme)',
        track: 'sound',
        trackCode: '[S]',
        description: 'My Heart Will Go On ; Flûte à bec (JulieBe) ; Cloches musicales (Maxime).',
        timeSec: 4,
        durationSec: 14,
        triggerMode: 'auto_follow',
        safeState: 'Mélodie douce résonante',
        regieNotes: 'Modulation visible sur le canvas des vagues.',
        status: 'pending',
        actionPayload: { soundPresetId: 'my_heart_will_go_on_flute' }
      }
    ]
  },
  {
    id: 'scene-6-abysses-baleines',
    title: '6. Abysses et baleines dessinées',
    subtitle: 'Trois baleines sortent du cadre, nagent et guident le pirate',
    scriptPages: 'Pages 37 à 38',
    summary: 'Plongée dans les profondeurs : pleine lune qui s’efface, shader « Les abysses », Alexandra dessine 3 baleines qui sortent du cadre, explosent le rideau de fils et guident l’ombre du pirate vers l’épave.',
    dramaturgyIntent: 'Le dessin en direct transcende son support physique : les créatures aquatiques s’animent, quittent la toile pour envahir tout le volume scénique.',
    keyElements: [
      'Pleine lune s’effaçant progressivement dans la nuit marine',
      'Shader vidéo numérique « Les abysses » + anaglyphe FX',
      'Dessin en direct de 3 baleines par Alexandra',
      'Les baleines sortent du cadre et nagent à travers les fils',
      'Chant des sirènes et des baleines repris en voix solo par Aurélie',
      'L’ombre du pirate guidée par les trois cétacés'
    ],
    defaultShader: 'abysses',
    anaglyphActive: true,
    defaultLightMode: 'shower_spot',
    onAirState: false,
    defaultSoundPreset: 'tambour_ocean_billes',
    associatedDrawingId: 'draw-whales-alexandra',
    safeFallbackExplanation: 'Les baleines vectorielles possèdent un chemin d’animation procédural garanti sur Canvas 2D avec ondulation douce des nageoires.',
    testingWithoutHardwareGuide: 'Cliquer sur le déclencheur de dessin pour voir les 3 baleines franchir le cadre et onduler sur le fond abyssal.',
    initialCues: [
      {
        id: 'cue-p37-abysses-shader',
        pageNumber: 37,
        label: 'CUE 6.1 — Les abysses : Nuit marine & Lune effacée',
        track: 'video',
        trackCode: '[V]',
        description: 'La nuit est à la pleine lune. Celle-ci s’efface au fur et à mesure que nous sombrons dans les abysses.',
        timeSec: 0,
        durationSec: 10,
        triggerMode: 'manual_go',
        safeState: 'Profondeur sombre bleutée avec étincelles de plancton',
        regieNotes: 'Shader Les abysses + anaglyphe FX.',
        status: 'pending',
        actionPayload: { shaderId: 'abysses', anaglyphEnabled: true }
      },
      {
        id: 'cue-p37-baleines-animees',
        pageNumber: 37,
        label: 'CUE 6.2 — Dessin des 3 baleines sortant du cadre',
        track: 'video',
        trackCode: '[V]',
        description: 'Alexandra dessine trois baleines. Elles sortent du cadre, explosent le rideau de fils et commencent à nager et danser.',
        timeSec: 10,
        durationSec: 16,
        triggerMode: 'auto_follow',
        safeState: 'Trois cétacés lumineux en nage coordonnée',
        regieNotes: 'Guident l’ombre du pirate vers l’épave.',
        status: 'pending',
        actionPayload: { drawingId: 'draw-whales-alexandra' }
      },
      {
        id: 'cue-p37-chant-baleines',
        pageNumber: 37,
        label: 'CUE 6.3 — Chant des baleines (Ambiance ➔ Aurélie)',
        track: 'sound',
        trackCode: '[S]',
        description: 'Le chant des sirènes / chant des baleines s’efface pour être repris en voix nue par Aurélie.',
        timeSec: 18,
        durationSec: 12,
        triggerMode: 'auto_follow',
        safeState: 'Voix mélodique pure a cappella',
        regieNotes: 'Transition en fondu enchaîné.',
        status: 'pending',
        actionPayload: { soundPresetId: 'tambour_ocean_billes' }
      }
    ]
  },
  {
    id: 'scene-7-miroir-ombres',
    title: '7. Miroir des ombres',
    subtitle: 'Capitaine Crunch face à son double, pouce contre pouce',
    scriptPages: 'Page 54',
    summary: 'Le moment de grâce : shader « Wispy background », Capitaine Crunch éclairé par une torche, apparition de son ombre en miroir (« l’ombre de l’ombre »), danse au son de Gluck, contact pouce contre pouce, et dissolution dans la mer.',
    dramaturgyIntent: 'Le cœur émotionnel du spectacle : la confrontation poétique entre l’acteur physique et son double spectral, avant l’effacement des souvenirs.',
    keyElements: [
      'Shader vidéo numérique « Wispy background » (voiles diaphanes)',
      'Éclairage torche rasant projetant une ombre nette',
      'Entre son ombre en miroir : Crunch face à lui-même',
      'La danse des ombres heureuses (Gluck)',
      'Geste chorégraphique : pouce contre pouce, arrêt suspendu',
      'La mer s’efface pour prendre place dans le corps du capitaine',
      'Effacement progressif des souvenirs et des visages'
    ],
    defaultShader: 'wispy_bg',
    anaglyphActive: false,
    defaultLightMode: 'shower_spot',
    onAirState: false,
    defaultSoundPreset: 'psalmodie_lune',
    safeFallbackExplanation: 'Le système de miroir utilise une matrice de transformation 2D horizontale réversible avec déphasage temporel de 0.2s.',
    testingWithoutHardwareGuide: 'Activer le mode miroir puis le geste pouce contre pouce pour vérifier l’arrêt sur image suspendu.',
    initialCues: [
      {
        id: 'cue-p54-wispy-bg',
        pageNumber: 54,
        label: 'CUE 7.1 — Wispy background & Lampe torche',
        track: 'video',
        trackCode: '[V]',
        description: 'Wispy background : shaders vidéo numérique. Crunch apparaît de profil comme une ombre éclairée par une torche.',
        timeSec: 0,
        durationSec: 12,
        triggerMode: 'manual_go',
        safeState: 'Volutes sépia et faisceau lumineux conique',
        regieNotes: 'Flûte bien tenue en main.',
        status: 'pending',
        actionPayload: { shaderId: 'wispy_bg' }
      },
      {
        id: 'cue-p54-ombre-miroir',
        pageNumber: 54,
        label: 'CUE 7.2 — L’ombre de l’ombre en miroir & Gluck',
        track: 'stage',
        trackCode: '[J]',
        description: 'Entre son ombre. Elle apparaît doucement en miroir. La danse des ombres heureuses (C.W. Gluck).',
        timeSec: 8,
        durationSec: 16,
        triggerMode: 'auto_follow',
        safeState: 'Duo chorégraphique symétrique',
        regieNotes: 'Crunch danse avec son ombre à la frontière des vivants et des morts.',
        status: 'pending'
      },
      {
        id: 'cue-p54-pouce-arret',
        pageNumber: 54,
        label: 'CUE 7.3 — Pouce contre pouce & Dissolution marine',
        track: 'stage',
        trackCode: '[J]',
        description: 'Le pouce gauche de Crunch apparaît. Pouce contre pouce. Arrêt. La mer s’efface doucement dans le corps du capitaine.',
        timeSec: 24,
        durationSec: 12,
        triggerMode: 'manual_go',
        safeState: 'Arrêt suspendu puis fondu progressif de la silhouette',
        regieNotes: 'Apparition des enfants de la lune. Les souvenirs s’estompent.',
        status: 'pending',
        actionPayload: { soundPresetId: 'psalmodie_lune' }
      }
    ]
  },
  {
    id: 'scene-8-derniere-emission',
    title: '8. Dernière émission',
    subtitle: 'Éclairage de secours, bélier sur la porte et sortie collective',
    scriptPages: 'Pages 56 à 59',
    summary: 'Le final saisissant : bruits de bélier sur la porte de la station radio (stompbox), coupure générale des lumières, éclairage de secours rouge, la porte dessinée s’ouvre, sortie de toute l’équipe et Maxime emporte les émetteurs.',
    dramaturgyIntent: 'Le retour brutal du réel policier brisant la radio pirate, résolu par l’échappatoire poétique : fuir à travers la porte peinte.',
    keyElements: [
      'Bruit de bélier violent sur la porte (stompbox)',
      'Coupure des lumières plateau & allumage de l’éclairage de secours',
      'La porte s’ouvre sous les traits du dessin d’Alexandra',
      'Grincement de porte (chamoisine humide sur ballon de baudruche)',
      'Pierre apparaît au seuil',
      'Toutes sortent par la porte dessinée à jardin',
      'Maxime subtilise les émetteurs FM et AM avant de disparaître'
    ],
    defaultShader: 'wispy_bg',
    anaglyphActive: false,
    defaultLightMode: 'emergency_red',
    onAirState: false,
    defaultSoundPreset: 'stompbox_belier',
    associatedDrawingId: 'draw-door-alexandra',
    safeFallbackExplanation: 'Le mode lumière de secours passe la palette globale en rouge sécuritaire atténué conforme aux normes de régie.',
    testingWithoutHardwareGuide: 'Déclencher CUE 8.2 pour vérifier la coupure de lumière instantanée et la bascule en éclairage de secours.',
    initialCues: [
      {
        id: 'cue-p56-belier',
        pageNumber: 56,
        label: 'CUE 8.1 — Coups de bélier sur la porte (Stompbox)',
        track: 'sound',
        trackCode: '[S]',
        description: 'Bélier sur porte : stompbox frappé à 3 reprises.',
        timeSec: 0,
        durationSec: 6,
        triggerMode: 'manual_go',
        safeState: 'Percussions lourdes résonantes',
        regieNotes: 'Menace imminente contre le studio de radio.',
        status: 'pending',
        actionPayload: { soundPresetId: 'stompbox_belier' }
      },
      {
        id: 'cue-p58-coupure-secours',
        pageNumber: 58,
        label: 'CUE 8.2 — Coupure lumière & Éclairage bloc de secours',
        track: 'light',
        trackCode: '[L]',
        description: 'Coupure des lumières. Apparition d’un éclairage type bloc de secours.',
        timeSec: 6,
        durationSec: 8,
        triggerMode: 'manual_go',
        safeState: 'Plateau plongé dans une lueur rouge de secours',
        regieNotes: 'Blackout principal immédiat.',
        status: 'pending',
        actionPayload: { lightState: 'emergency_red' }
      },
      {
        id: 'cue-p59-porte-sortie',
        pageNumber: 59,
        label: 'CUE 8.3 — La porte dessinée s’ouvre & Sortie collective',
        track: 'stage',
        trackCode: '[J]',
        description: 'La porte s’ouvre sous les traits du dessin d’Alexandra (grincement ballon). Toutes sortent par la porte dessinée. Maxime emporte les émetteurs.',
        timeSec: 14,
        durationSec: 12,
        triggerMode: 'manual_go',
        safeState: 'Plateau désert sous la lueur de secours',
        regieNotes: 'Fin du spectacle. Les émetteurs radio sont sauvés.',
        status: 'pending',
        actionPayload: { soundPresetId: 'ballon_chamoisine' }
      }
    ]
  }
];

// 2. DESSINS CANONIQUES PRÉ-CHARGÉS POUR LE MODULE « DESSIN QUI DEVIENT MONDE »
export const CANONICAL_DRAWINGS: LiveDrawingObject[] = [
  {
    id: 'draw-door-alexandra',
    name: 'La Porte d’Alexandra (Passage vers les limbes)',
    pageRef: 22,
    description: 'Une haute porte en ogive dessinée à la craie blanche avec poignée et serrure devenant une arche traversable.',
    revealProgress: 1.0,
    isWalkableDoorMask: true,
    projectionSurface: 'gauze_curtain',
    animated: true,
    strokes: [
      {
        width: 3.5,
        color: '#f8fafc',
        points: [
          { x: 180, y: 520 },
          { x: 180, y: 220 },
          { x: 230, y: 160 },
          { x: 290, y: 140 },
          { x: 350, y: 160 },
          { x: 400, y: 220 },
          { x: 400, y: 520 }
        ]
      },
      {
        width: 2.5,
        color: '#cbd5e1',
        points: [
          { x: 290, y: 140 },
          { x: 290, y: 520 }
        ]
      },
      {
        width: 4.0,
        color: '#d7b86a',
        points: [
          { x: 275, y: 340 },
          { x: 275, y: 355 }
        ]
      }
    ]
  },
  {
    id: 'draw-whales-alexandra',
    name: 'Les Trois Baleines Abyssales',
    pageRef: 37,
    description: 'Trois cétacés gracieux aux corps fuselés et nageoires pectorales ondulant dans les abysses.',
    revealProgress: 1.0,
    isWalkableDoorMask: false,
    projectionSurface: 'backdrop_canvas',
    animated: true,
    strokes: [
      // Baleine 1 (Centrale grande)
      {
        width: 3.0,
        color: '#38bdf8',
        points: [
          { x: 140, y: 260 },
          { x: 220, y: 220 },
          { x: 340, y: 230 },
          { x: 440, y: 260 },
          { x: 490, y: 250 },
          { x: 480, y: 275 },
          { x: 440, y: 270 },
          { x: 320, y: 290 },
          { x: 200, y: 285 },
          { x: 140, y: 260 }
        ]
      },
      // Nageoire ventrale
      {
        width: 2.5,
        color: '#0284c7',
        points: [
          { x: 240, y: 280 },
          { x: 220, y: 340 },
          { x: 260, y: 320 },
          { x: 280, y: 285 }
        ]
      },
      // Baleine 2 (Haute lointaine)
      {
        width: 2.0,
        color: '#7dd3fc',
        points: [
          { x: 380, y: 140 },
          { x: 440, y: 120 },
          { x: 520, y: 130 },
          { x: 570, y: 150 },
          { x: 550, y: 160 },
          { x: 460, y: 160 },
          { x: 380, y: 140 }
        ]
      }
    ]
  },
  {
    id: 'draw-map-hollowbones',
    name: 'La Carte du Hollow Bones',
    pageRef: 43,
    description: 'La carte maritime se dessinant sous nos yeux : côtes rocheuses, rose des vents et épave du navire.',
    revealProgress: 0.85,
    isWalkableDoorMask: false,
    projectionSurface: 'backdrop_canvas',
    animated: false,
    strokes: [
      {
        width: 2.5,
        color: '#d7b86a',
        points: [
          { x: 120, y: 160 },
          { x: 190, y: 190 },
          { x: 240, y: 150 },
          { x: 310, y: 220 },
          { x: 380, y: 190 },
          { x: 420, y: 260 }
        ]
      },
      // Croix de l'épave
      {
        width: 3.5,
        color: '#f43f5e',
        points: [
          { x: 350, y: 310 },
          { x: 375, y: 335 }
        ]
      },
      {
        width: 3.5,
        color: '#f43f5e',
        points: [
          { x: 375, y: 310 },
          { x: 350, y: 335 }
        ]
      }
    ]
  }
];
