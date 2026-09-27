# No-de Vibe Designer 0.9.1

Environnement de patch nodal pour la création et l’exploitation scène (macOS).

## Lancer (développement)

```bash
./LANCER-No-de-Vibe-Designer.command
```

- Desktop : `http://127.0.0.1:4173/desktop/`
- Mobile : `http://127.0.0.1:4173/mobile/`

## Build application macOS

```bash
./packaging/mac/BUILD-No-de-Vibe-Designer-app.command
open "dist/No-de Vibe Designer.app"
```

L’`.app` démarre un serveur HTTP local et ouvre Chrome/Brave/Edge en mode application (étape transitoire avant runtime embarqué).

## Tests

```bash
node tests/run.mjs
```

## Chaîne P00 fonctionnelle

Caméra → Shader → Preview / OUTPUT, avec sauvegarde `.cvd.json` et restauration.

Console : `demo` charge le patch de démonstration.

## Édition Patch (P01)

- Undo / Redo : ⌘Z / ⌘⇧Z (Ctrl sur Windows/Linux)
- Dupliquer : ⌘D
- Supprimer : ⌫
- Zoom : molette ou boutons − / 1:1 / +
- Pan : clic milieu ou Alt+glisser

## Nodes exécutables vs indisponibles

**Exécutables :** camera, shader, midi, osc, tracking, stageio (+ caméras téléphone).

Les autres entrées Library sont visibles mais **indisponibles** (pas encore câblées au moteur).

## Vibe coding

Entrée envoie la commande. Endpoint IA optionnel dans Préférences → IA / Vibe (OpenAI-compatible). **Grok / xAI est exclu.** Sans endpoint : moteur local (règles), sans simulation de succès IA.

## Schéma projet

`cvd.graph` / fichiers `.cvd.json` (compatibilité historique du préfixe CVD).
