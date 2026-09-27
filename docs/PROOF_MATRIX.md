# Matrice de preuves — No-de Vibe Designer 0.9.3

| Fonction | Statut | Preuve |
|---|---|---|
| Patch create / connect / types / cycles | **vérifié réellement** (logiciel) | `node tests/run.mjs` |
| Caméra → shader → Preview | **partiellement vérifié** | logiciel OK ; matériel caméra **à vérifier** |
| OUTPUT fenêtre | **partiellement vérifié** | postMessage + runtime ; écran externe **à vérifier** |
| MIDI bus → param shader | **partiellement vérifié** | logiciel ; hardware **à vérifier** |
| Serial | **partiellement vérifié** | adaptateur + console ; hardware **à vérifier** |
| OSC via bridge | **incomplet** sans bridge | erreur visible si non connecté |
| Audio tone / stop propre | **vérifié réellement** (logiciel Web Audio) | processeur + release |
| Audio micro | **partiellement vérifié** | code prêt ; permission **à vérifier** |
| Sous-patch sérialisation / nav | **vérifié réellement** (logiciel) | tests + UI fil d’Ariane |
| Vibe aperçu / appliquer / undo | **vérifié réellement** (logiciel local) | UI preview + history |
| IA distante | **bloqué par configuration** | endpoint utilisateur ; Grok/xAI refusé |
| Autosave / export `.cvd.json` | **vérifié réellement** (logiciel) | round-trip tests |
| `.app` Electron autonome | **à vérifier** sur build final | Chromium embarqué, non signé |
| NDI / Syphon / bridges TD-Max | **incomplet** | nodes Library marqués indisponibles |

Légende : un test automatisé ne remplace pas une preuve matérielle.
