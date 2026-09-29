# Architecture mobile — No-de Vibe Designer 0.10.1

Même moteur, mêmes projets, interfaces différentes.

```text
shared/                  moteur unique
  graph-engine.js        évaluation, types, cycles
  node-processors.js     nodes exécutables, y compris capteurs
  ir.js                  format cvd.graph
  history.js vibe.js subpatch.js exporters.js
  project-store.js       IndexedDB + miroir localStorage
  sensor-bus.js          lectures réelles, erreur si l’API manque
  remote-protocol.js     révisions et opérations
  remote-client.js       WebSocket navigateur
  pwa-update.js          bannière, pas de rechargement silencieux
desktop/                 UI Mac / Electron
electron/                fenêtre + démarrage du pont
bridge/remote-server.mjs pont WebSocket (défaut 127.0.0.1:4174)
mobile/                  sources PWA (Bureau / Plateau)
dist/pwa/                build servi et installable (généré, non versionné)
```

Le build réécrit les imports `../shared/` en `./shared/` pour que le service worker puisse mettre le moteur en cache. Les sources `mobile/` ne sont pas la PWA à installer.

Android / Capacitor, plus tard : `webDir` = `dist/pwa`. Ne pas recopier le moteur dans un projet natif.

Le GUID WebSocket par défaut est celui de la RFC 6455 (`…C5AB0DC85B11`). `NVD_WS_GUID` est une option de debug, non utilisée par les tests.
