# Changelog — No-de Vibe Designer

Chaque livraison fonctionnelle a un numéro incrémenté et un commit source.

## 0.9.3

- Sous-patches exécutables : édition imbriquée, sérialisation, restauration, propagation d’erreurs.
- Nodes audio opérationnels (Web Audio) : tone / micro, niveaux, arrêt sans résidu.
- Vibe coding : aperçu des opérations avant application, annulable (Undo).
- Manuel et matrice de preuves mis à jour.
- Build Electron Apple Silicon (Chromium embarqué).

## 0.9.2

- Passage au runtime Electron autonome (plus de dépendance obligatoire à Chrome/Brave/Edge).
- Serveur HTTP local intégré au process principal.
- Documentation de la divergence Git `origin/main` vs branche dédiée.

## 0.9.1 — commit `08b4644`

- Undo / Redo, duplication, zoom/pan Patch Canvas.
- Préférences élargies.
- Exclusion explicite Grok / xAI.

## 0.9.0 — commits `07f1a15` … `3edcaae`

- Moteur de graphe P00 : caméra → shader → Preview/OUTPUT.
- Vibe Entrée + moteurs local/IA.
- MIDI/OSC/Serial raccordés au bus patch.
- Build `.app` shell navigateur (transitoire).
- Manuel, démo, tests.
