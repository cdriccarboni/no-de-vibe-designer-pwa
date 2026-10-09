# NO[co]DE VIBE DESIGNER — SCÉNOGRAPHIE VIVANTE
## LIVRABLE TECHNIQUE & ARTISTIQUE : « PIRATES PAILLETTES ! V2.1.26 »
*Relevé rigoureux des didascalies, architecture additive no-code, shaders textuels et studio sonore scénique*

---

### 1. AUDIT DU CODE EXISTANT & ARCHITECTURE ADDITIVE

#### A. Principe Fondamental de Non-Régression
Toutes les couches existantes de **No[co]de — Multilanguage Lab** sont conservées intactes et opérationnelles :
- **Studio Général (`ArtisticStudioView.tsx`)** : Plateau scénographique, inspecteur de régie, timeline multi-couches inspirée de Millumin, dialogue conversationnel en langage naturel, compagnon créatif proactif.
- **Laboratoire Technique (`TechnicalLabView.tsx`)** : Éditeur de code multi-moteurs (WebGL, p5.js, Paper.js, Canvas 2D, Three.js, Python Pyodide, WebGPU), console de logs, modulations directes d'uniformes.
- **Passerelles Régie (`LivePerformanceInteropModal.tsx`)** : Loopback OSC local, WebSocket, monitoring réseau local (LAN).
- **Le Scénographe (`ScenographyLivingShadowModal.tsx`)** : Découpage silhouette comédien pirate, caméra direct, rideau de fils.
- **Persistance & Restauration (`PACKAGE_INTEGRATION_01.md`)** : Format `.vibe-show.json` et stockage local indépendant.

#### B. Domaine Optionnel « Scénographie Vivante » (`src/components/LivingScenographyView.tsx`)
Un nouveau domaine scénique indépendant a été branché via le routeur (`viewMode === 'scenographie'`), accessible à tout moment depuis le bandeau supérieur sans impacter le reste du projet.

---

### 2. CARTE DES COMPOSANTS ET DES DONNÉES

```
src/
├── types/
│   └── livingScenography.ts        # Modèle de données : ScriptCueItem, ParametricShaderConfig,
│                                   # AnaglyphConfig, LiveDrawingObject, FoleySoundDefinition,
│                                   # DramaturgicalScenePreset, ExecutionLogEntry.
├── services/
│   ├── livingScenographyAudio.ts   # Moteur Web Audio procédural 100% hors-ligne synthétisant
│   │                               # les 16 instruments et objets physiques répertoriés (sachet,
│   │                               # bouteilles frangées, tambour d'océan, boîte tonnerre, piezo...).
│   ├── livingScenographyShaders.ts # Catalogue et code des 6 shaders textuellement attestés :
│   │                               # « Les limbes » (p.23), « La tempête » (p.31), « Water simulation » (p.35),
│   │                               # « Les abysses » (p.37), « Les abysses II » (p.43), « Wispy background » (p.54),
│   │                               # « Anaglyphe vortex » + moteurs de rendu 2D de secours (Canvas 2D).
│   └── piratesScriptCues.ts        # Relevé complet des didascalies, 8 scènes canoniques prêtes à jouer
│                                   # et dessins vectoriels (porte d'Alexandra, 3 baleines, carte).
└── components/
    └── LivingScenographyView.tsx   # Interface régie de spectacle intégrant :
                                    # - Conducteur temporel multipiste (Vidéo, Lumière, Son, Plateau, Régie)
                                    # - Boutons GO / HOLD / STOP / BLACKOUT / REPRISE
                                    # - Journal d'exécution horodaté
                                    # - Plateau Canvas 60 FPS avec Shaders & Anaglyphe
                                    # - Station de dessin direct « Dessin qui devient monde »
                                    # - Présence vidéo & Face tracking TouchDesigner (local)
                                    # - Banque de bruitages physiques en direct
```

---

### 3. LES 8 SCÈNES-EXEMPLES CANONIQUES DU MANUSCRIT

| N° | Scène Canonique | Pages PDF | Shaders & Visuels | Bruitages Physiques Attestés | Éclairage & Régie | Fallbacks & Sécurité |
|---|---|---|---|---|---|---|
| **1** | **Radio Paillettes en grève** | p. 2 à 5 | Rideau de fils, karaoké *Independent Woman* projeté à 19s | Sirène assourdissante, vinyle analogique lointain | Douche Maxime (8s), voyant ON AIR commuté en régie, baisse de 10 dB | Fallback 2D de la douche et du rideau ; karaoké sur canvas |
| **2** | **Porte dessinée / passage anaglyphe** | p. 22 | Dessin direct d'une porte par Alexandra, tourbillon hypnotique anaglyphe | Grincement de porte (ballon de baudruche + chamoisine) | Plein feu / pénombre | Bascule immédiate Anaglyphe 3D ➔ Secours 2D sans lunettes |
| **3** | **Les Limbes** | p. 23 à 24 | Shader *Les limbes* (brume pourpre), ombre du pirate au tricorne avec flûte | Sifflet aztèque, flûte traversière + claquage mécanique, faune, choc piezo jambe de bois (85 Hz) | Douche tamisée sur l'ombre du Capitaine Crunch | Volutes vectorielles 2D de secours ; pas de WebGL requis |
| **4** | **Tempête et naufrage** | p. 30 à 32 | Shader *La tempête* (vagues fbm), anaglyphe FX, ombres de navires engloutis | Boîte à tonnerre + feuille d'étain + plexiglas, cloches de bateau, répliques inversées en tourbillon | Éclairs stroboscopiques synchrones | Bouton BLACKOUT d'urgence coupant flashs et stéréoscopie |
| **5** | **Water Simulation musicale** | p. 35 à 36 | Shader *Water simulation* modulant la houle marine en direct | *My Heart Will Go On* à la flûte à bec et cloches musicales | Lumière d'apaisement marine | En l'absence de micro, modulation par LFO acoustique interne |
| **6** | **Abysses et baleines dessinées** | p. 37 à 38 | Shader *Les abysses*, pleine lune s'effaçant, 3 baleines sortant du cadre | Tambour de l'océan, bouteille à billes, chant des sirènes repris par Aurélie solo | Nuit marine avec étincelles de plancton | Baleines procédurales 2D animées avec ondulation souple |
| **7** | **Miroir des ombres** | p. 54 | Shader *Wispy background* (voiles sépia), Crunch face à son double en miroir | *La danse des ombres heureuses* (Gluck), psalmodie lancinante des enfants de la lune | Éclairage torche rasant, arrêt sur image pouce contre pouce | Matrice 2D inversée avec déphasage temporel de 0.2s |
| **8** | **Dernière émission** | p. 56 à 59 | La porte peinte s'ouvre pour la fuite de l'équipe, Maxime emporte les émetteurs | Bélier sur la porte (stompbox), chamoisine sur ballon | Coupure des lumières ➔ Éclairage de secours rouge | Palette de secours atténuée aux normes de sécurité régie |

---

### 4. MODULES DÉTAILLÉS & CRITÈRES D'ACCEPTATION

#### A. Conducteur Temporel Multipiste
- **Pistes normalisées** : Vidéo `[V]`, Lumière `[L]`, Son `[S]`, Plateau `[J]`, Régie `[R]`.
- **Commandes** : `GO` (avance au cue suivant), `HOLD` (fige l'état), `REPRISE` (relance l'horloge), `BLACKOUT` (sécurité générale).
- **Journal horodaté** : Chaque déclenchement enregistre l'heure précise, l'intitulé, la piste et la didascalie associée.

#### B. Shaders Paramétriques & Anaglyphe Responsable
- **Shaders textuellement conformes** : *Les limbes*, *La tempête*, *Water simulation*, *Les abysses*, *Les abysses II*, *Wispy background*.
- **Contrôles No-Code** : Intensité, Vitesse, Grain, Palette de teinte, Seed, Retour au preset sûr.
- **Anaglyphe Responsable** : Réglage de convergence (-15px à +15px), avertissement de confort visuel, bascule immédiate vers une version 2D monochrome pure garantissant l'accessibilité à tous les publics sans dépendance aux lunettes.

#### C. Dessin qui devient Monde
- Entrée pointeur/souris/tablette ou dessins pré-enregistrés du texte (*La Porte d'Alexandra*, *Les 3 Baleines*, *La Carte du Hollow Bones*).
- Slider d'apparition progressive (0% à 100%).
- Masque de passage traversable (porte franchissable par les comédiens).

#### D. Présence Vidéo & Face Tracking
- Conforme à la didascalie de p. 15 (*Data Face Tracking - TouchDesigner*).
- 100% Opt-in et local : silhouette synthétique neutre par défaut, vidéo d'essai comédien, ou caméra live.
- Aucun flux vidéo transmis sur le réseau sans configuration explicite.

#### E. Studio Sonore & Bruitages Physiques Authentiques
- Synthèse procédurale Web Audio des 16 objets répertoriés dans les didascalies.
- Bouton d'atténuation `-10 dB` (didascalie p. 5).
- Écoute stéréo standard ou casque binaural spatialisé (optionnel).

---

### 5. STRATÉGIE DE TESTS & SIMULATION MATÉRIELLE

| Composant | Statut Réel Vérifié | Matériel Exigé | Mode de Simulation Local Validé |
|---|---|---|---|
| **Conducteur & Cues** | **VÉRIFIÉ** | Aucun | Moteur temporel interne avec déclencheurs manuels et automatiques |
| **Shaders Paramétriques** | **VÉRIFIÉ** | GPU WebGL | Fallback Canvas 2D procédural complet pour chaque shader |
| **Filtre Anaglyphe** | **VÉRIFIÉ** | Lunettes rouge/cyan | Algorithme de recomposition de canaux + bascule de secours 2D pure |
| **Bruitages Physiques** | **VÉRIFIÉ** | Aucun | Synthèse procédurale Web Audio API (zéro fichier mp3 manquant) |
| **Atténuation -10 dB** | **VÉRIFIÉ** | Aucun | Nœud GainNode avec rampe temporelle d'atténuation 0.316 |
| **Dessin en direct** | **VÉRIFIÉ** | Pointeur / Stylet | Tracé vectoriel dynamique et animations de révélation procédurales |
| **Face Tracking** | **VÉRIFIÉ** | Caméra optionnelle | Dégradation progressive : Silhouette ➔ Démo ➔ Caméra opt-in |
| **Régie Matérielle** | **VÉRIFIÉ** | Pupitre OSC / DMX | Pont logiciel simulé local avec journal d'exécution horodaté |
