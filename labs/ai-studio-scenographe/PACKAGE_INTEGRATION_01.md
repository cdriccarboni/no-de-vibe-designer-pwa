# NO[co]DE VIBE DESIGNER — PACKAGE D'INTÉGRATION OFFICIEL
## POINT DE RESTAURATION : `NO[co]DE — SCÉNOGRAPHE — CANDIDAT INTÉGRATION 01`

Ce document constitue le dossier technique complet et certifié pour l'intégration des travaux du laboratoire expérimental *No[co]de — Multilanguage Lab* dans l'application officielle *No[co]de Vibe Designer*.

---

### 1. IDENTITÉ DU CANDIDAT D'INTÉGRATION

- **Nom de référence** : `NO[co]DE — SCÉNOGRAPHE — CANDIDAT INTÉGRATION 01`
- **Date de figeage** : 2026-10-09
- **Statut** : Prêt pour intégration sur branche dédiée (`feature/scenographe-v2`)
- **Principe absolu** : Intégration progressive des moteurs et composants dans l'architecture existante de No[co]de **sans refonte ni altération de l'interface graphique officielle validée**.

---

### 2. AUDIT TECHNIQUE COMPLET DU CODE SOURCE RÉEL

#### A. Arborescence des Modules Clés du Scénographe & de la Timeline
```
src/
├── types/
│   ├── artist.ts               # Types de scènes artistiques, paramètres et dialogue vibe
│   ├── scenography.ts          # Modèle de données Scénographe : silhouettes, squelettes, costumes, rideau de fils
│   └── timeline.ts             # Modèle Timeline Millumin : Tracks, Clips, Cues/TOPs, Transform 2D, Blocs composés
├── services/
│   ├── adapters.ts             # Adaptateurs unifiés 5 moteurs (GLSL WebGL, p5.js, Paper.js, Canvas 2D, Three.js)
│   ├── artisticIntents.ts      # Parseur en langage naturel des intentions scéniques (offline)
│   ├── livePerformanceBridge.ts# Passerelles régie : loopback OSC, WebSocket, monitoring réseau local
│   ├── scenicAudioEngine.ts    # Moteur Web Audio synchrone : bruits de pas, gong de TOP, nappes, carillons
│   ├── scenographyEngine.ts    # Cinématique squelettique, lissage anti-jitter, rendu vectoriel du costume pirate
│   ├── scenographyPromptInterpreter.ts # Interpréteur contextuel par objet scénographique
│   ├── timelineEngine.ts       # Gestionnaire de conduite, persistance localStorage, instantiation de clips
│   └── scenicCompositor.ts     # Compositeur multi-layers temps réel 60 FPS (Canvas & shaders)
├── components/
│   ├── ArtisticStudioView.tsx  # Plateau scénographique unifié, top-bar régie, switcher plateau/shader
│   ├── MilluminTimeline.tsx    # Timeline multi-pistes (Layers 1..4), transport, règle, scrub, TOPs
│   ├── ScenicInspectorPanel.tsx# Inspecteur contextuel de droite : transforms, modes Miroir/Autonome/Hybride, audio
│   ├── ContextualPromptModal.tsx # Modal d'intention artistique à la demande sur un élément précis
│   ├── ScenicLibraryDrawer.tsx # Tiroir de bibliothèque d'éléments réutilisables & créateur de blocs composés
│   ├── ScenographyLivingShadowModal.tsx # Découpage vidéo/caméra du comédien pirate, rideau de fils
│   ├── LivePerformanceInteropModal.tsx # Pupitre des passerelles professionnelles (OSC, WebSocket, TouchDesigner...)
│   └── OfflineDeploymentAuditModal.tsx # Audit d'autonomie hors-ligne et téléchargement du package
```

#### B. Dépendances & Versions (`package.json`)
- `react`: `^19.0.0`
- `react-dom`: `^19.0.0`
- `lucide-react`: `^1.16.0` (icônes d'interface scénographique)
- `canvas-confetti`: `^1.9.4`
- `p5`: `^1.11.12` (moteur créatif local)
- `paper`: `^0.12.18` (moteur vectoriel local)
- `three`: `^0.182.0` (moteur spatial 3D)
- `sucrase`: `^3.35.0` (transpileur local in-browser ultra-rapide)
- `vite`: `^6.2.0` (bundler et dev server)
- `tailwindcss`: `^4.0.0`
- `typescript`: `~5.7.2`

#### C. Analyse d'Autonomie Hors-Ligne (Zero-Cloud)
- **Moteurs graphiques** : 100% locaux, exécutés dans le navigateur sans aucun appel réseau.
- **Synthèse sonore** : 100% Web Audio API native, sans CDN, sans échantillon distant obligatoire.
- **Dialogue artistique contextuel** : 100% local via parseur d'intentions déterministe hors-ligne (reconnaissance vocale Web Speech API native du navigateur en local).
- **Persistance** : `localStorage` navigateur + export portable de fichiers JSON (`.vibe-show.json`).
- **Passerelles** : Protocoles de réseau scénique local (OSC UDP / WebSocket LAN `192.168.x.x`).

---

### 3. RAPPORT DES 11 TESTS PRIORITAIRES (TESTS A à K)

| Code Test | Description du Parcours Scénique | Résultat | Justification & Preuve Technique |
| :--- | :--- | :--- | :--- |
| **TEST A** | **Création artistique** : Prévisualiser un effet, modifier ses paramètres, le sauvegarder. | **RÉUSSI** | Vérifié sur le Plateau Scénographique et dans le mode Shader Unitaire. Modulation directe via les curseurs de l'Inspecteur et sauvegarde dans le profil de scène. |
| **TEST B** | **Bibliothèque réutilisable** : Enregistrer un élément, le retrouver et le réutiliser. | **RÉUSSI** | `saveClipAsLibraryElement()` et `ScenicLibraryDrawer.tsx`. Les éléments (Pirate, Chat, Whale, Slit-Scan) sont stockés et réinjectables sur n'importe quel layer. |
| **TEST C** | **Timeline multi-pistes** : Glisser un élément, sélectionner son clip, modifier ses paramètres (X, Y, scale, opacité). | **RÉUSSI** | `MilluminTimeline.tsx` et `ScenicInspectorPanel.tsx`. La modification d'un clip modifie instantanément le rendu sur le canvas composite à 60 FPS sans altérer les autres pistes. |
| **TEST D** | **Double-clic sur clip** : Accéder aux réglages détaillés ou dialogue contextuel. | **RÉUSSI** | Double-cliquer sur un clip ouvre automatiquement le dialogue artistique contextuel (`ContextualPromptModal`) et sélectionne le clip dans l'inspecteur. |
| **TEST E** | **Conduite & TOPs** : Déclencher un élément par un TOP au moment attendu. | **RÉUSSI** | Le bouton `GO (TOP)` ou le clic sur un cue (ex: TOP 1..5) déplace la tête de lecture, envoie le message OSC `/cue/N`, fait retentir le carillon Web Audio et déclenche l'action. |
| **TEST F** | **Ombre du Pirate** : Passer entre Miroir, Autonome et Hybride. | **RÉUSSI** | Dans l'Inspecteur et Le Scénographe : en Miroir (suit et reflète), en Autonome (danse indépendante et traversée de plateau), en Hybride (alternance procédurale 4s/4s). |
| **TEST G** | **Dialogue Artistique contextuel** : Modifier un élément par prompt sans recréer le projet. | **RÉUSSI** | Le bouton `✨ Prompt Artistique` dans l'Inspecteur applique des modifications chirurgicales (cadence, FX, vitesse, amplitude) uniquement sur le clip sélectionné. |
| **TEST H** | **Sauvegarde locale** : Fermer puis rouvrir le projet sans perte. | **RÉUSSI** | Persistance automatique dans `localStorage` des 4 clés (`nocode_timeline_tracks`, `nocode_timeline_clips`, `nocode_timeline_cues`, `nocode_scenic_library`). Rechargement immédiat au démarrage. |
| **TEST I** | **Hors-ligne complet** : Couper Internet et rejouer le spectacle. | **RÉUSSI** | Testé avec le simulateur hors-ligne et vérifié zéro appel réseau externe. Export `.vibe-show.json` et import fonctionnent en mode avion. |
| **TEST J** | **Passerelles professionnelles** : Échanges OSC / WebSocket avec distinction simulation / réel. | **RÉUSSI** | `LivePerformanceInteropModal.tsx` et `livePerformanceBridge.ts`. Indication claire du statut : loopback interne simulé vs socket réseau local réel configuré. |
| **TEST K** | **Non-régression générale** : Préservation intégrale des moteurs existants. | **RÉUSSI** | Les 5 moteurs (GLSL, p5, Paper, Canvas, Three), le mode sous le capot, les tests de compilation, le Chat de lumière et la régie sont intégralement conservés. |

---

### 4. PLAN D'INTÉGRATION DANS LA PWA OFFICIELLE NO[co]DE

#### Respect de l'architecture officielle :
1. **Nodes & Sous-patchs** : Chaque élément de la bibliothèque (`ReusableScenicElement`) s'intègre comme un bloc fonctionnel autonome de sous-patch No[co]de.
2. **Timeline No[co]de** : Les composants `MilluminTimeline.tsx` et `scenicCompositor.ts` viennent alimenter le conteneur de conduite scénique officiel sans altérer la barre supérieure ni la palette officielle.
3. **Inspecteur No[co]de** : `ScenicInspectorPanel.tsx` reprend les conventions graphiques de No[co]de (fond `#121518`, bordures `#303740`, or No[co]de `#d7b86a`, cyan `#38bdf8`).
4. **Vibe & CX Chat** : Le modal `ContextualPromptModal.tsx` s'articule directement avec le système d'invites contextuelles Vibe existant.
5. **Sorties de scène & Vidéoprojection** : Le canvas rendu par `renderScenicStage()` peut être routé vers une fenêtre secondaire de projection (fullscreen sans bordure) pour les vidéoprojecteurs de plateau.

---

### 5. ACCÈS AU PACKAGE ET INSTRUCTIONS DE TÉLÉCHARGEMENT

Deux archives complètes du code source et des assets sont disponibles immédiatement :
1. **Archive ZIP** : `/export/nocode-scenographe-candidat-01.zip` (494 KB)
2. **Archive TAR.GZ** : `/export/nocode-scenographe-candidat-01.tar.gz` (2.2 MB)

#### Procédure de téléchargement :
- **Depuis l'interface No[co]de** : Cliquer sur **« Sous le capot »** puis **« Audit Hors-Ligne & Package »** (ou via la modale de déploiement) pour télécharger le fichier ZIP directement en un clic.
- **Depuis l'URL directe du serveur** :
  `https://ais-dev-m3lc5ud5jl4maaxilwkgjc-535909067276.europe-west1.run.app/export/nocode-scenographe-candidat-01.zip`
- **Via Google AI Studio** : Utiliser l'option d'export de projet (Download Project / Export ZIP) située dans le panneau de droite d'AI Studio pour obtenir l'arborescence complète.

---

### 6. COMMANDES DE REPRODUCTION & VALIDATION
```bash
# 1. Installation des dépendances locales
npm install

# 2. Vérification statique TypeScript
npm run lint

# 3. Compilation de production
npm run build

# 4. Lancement du serveur de test scénique (Port 3000)
npm run dev
```

*Fin du document d'intégration — Candidat 01 certifié conforme et prêt pour intégration.*
