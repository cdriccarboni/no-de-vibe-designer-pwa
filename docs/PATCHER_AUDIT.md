# Audit Patcher — Phase 2

Inventaire courant : **104 fichiers/modules pertinents** dans `ART/app/pirates-paillettes-42c9/`.

## Briques structurantes confirmées

| Brique | Source | Adaptation CVD | État V0.7 |
|---|---|---|---|
| Caméra / retour local | `patcher-regie-video-return.tsx` | runtime caméra direct | actif |
| Retour WebRTC + RTT | `ART/app/video-return.tsx` | adaptateur Peer/WebRTC à extraire | analysé |
| Intercom PeerJS | `ART/app/intercom.tsx` | communication/data-channel à extraire | analysé |
| MIDI | `patcher-midi-hub.tsx` | `shared/adapters/midi.js` | actif Web MIDI |
| Arduino/ESP série | `patcher-stage-io.tsx`, `patcher-device-ide.tsx` | `shared/adapters/serial.js` | actif Web Serial |
| WebSocket bridge | `patcher-stage-io.tsx`, `patcher-connectors.tsx` | `shared/adapters/websocket-bridge.js` | actif |
| OSC / Art-Net | `ART/app/protocol-bridge.ts` | packets JSON vers bridge | actif via bridge |
| Shader GLSL | `patcher-shader-lab.tsx` | `shared/adapters/shader-surface.js` | actif WebGL |
| Processing-like | `patcher-processing-garden.tsx` | moteur Canvas à extraire | suivant |
| Ombre | `patcher-shadow-lab.tsx` | runtime silhouette/séparation | suivant |
| Connecteurs | `patcher-connectors.tsx` | registre de sorties/routage | modèle actif |
| NDI/Syphon/Spout | `ART/app/camera-ndi.tsx`, `video-return.tsx` | relais natif requis | non simulé |

## Principe
Réutiliser la logique éprouvée, l'isoler en modules propres, ne pas dépendre de l'UI ART/Patcher.
