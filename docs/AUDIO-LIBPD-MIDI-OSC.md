# libpd audible, Web MIDI et OSC sur WebSocket (3.3.14)

## libpd → haut-parleurs
`shared/libpd-runtime.js` (`openLibpdStream`, `renderLibpdFrames`, `closeLibpdStream`) calcule de vrais blocs
stéréo avec le wasm libpd (Pd 0.56). `shared/libpd-audio.js` (`LibpdVoice`) les joue :

```
libpd wasm (thread principal) ──postMessage──▶ AudioWorklet « nvd-libpd-player » ─▶ Gain (niveau) ─▶ Gain (enveloppe) ─▶ sortie/route
```
```js
import { openLibpdStream, LIBPD_AUDIO_PATCH } from "../shared/libpd-runtime.js";
import { LibpdVoice } from "../shared/libpd-audio.js";
const ctx = new AudioContext({ sampleRate: 44100 });
await openLibpdStream(LIBPD_AUDIO_PATCH);
const voice = await new LibpdVoice(ctx, { level: 0.5 }).init();
await voice.pump();                      // remplit la file, puis le worklet redemande (« need »)
voice.trigger({ attack: 0.01, hold: 0.2, release: 0.3 });   // ou voice.gate(true)
voice.route(monBus); voice.setLevel(0.8);
```
Test réel : `qa/libpd-audio-offline-e2e.mjs` (OfflineAudioContext, Chromium) mesure un RMS non nul,
440 Hz pour `osc~ 440`, le gain (≈ 0,177 pour 0,5 × 0,5), les deux canaux, le silence hors enveloppe et à gain 0.

### Limites (réelles, non masquées)
- 44,1 kHz uniquement (`libpd_init_audio`) : `LibpdVoice` refuse un AudioContext à une autre fréquence.
- libpd tourne sur le thread principal : une page très chargée peut provoquer des sous-alimentations
  (silence compté par le worklet, jamais de son inventé). Latence ≈ 2 × 2048 trames (~93 ms).
- Un seul patch DSP ouvert à la fois ; pas d'entrée micro vers `adc~`.
- Le navigateur exige un geste utilisateur avant de démarrer l'AudioContext.
- 3.3.15 : bouton « ▶ Écouter » dans l'inspecteur du node libpd (AudioContext créé au clic, niveau mesuré par un AnalyserNode et affiché). Test : `qa/libpd-listen-oscws-e2e.mjs`.

## Web MIDI
`shared/adapters/midi.js` accepte `requestAccess` injectable (mocks) ; décode NOTE ON/OFF, CC, PC, pitch bend, clock.
Sans Web MIDI (Safari/iOS, Firefox sans permission) : erreur explicite « Web MIDI indisponible ».

## OSC sur WebSocket
`shared/adapters/osc-websocket.js` (`OscWebSocket`) envoie et reçoit des paquets OSC 1.0 binaires dans des trames
WebSocket binaires. Le navigateur ne fait pas d'UDP : il faut une passerelle OSC↔WS (osc.js, Open Stage Control…).
Pas de bundles OSC (`#bundle`) ; types `f`, `i`, `s`.

Tests : `node --test shared/midi-osc-adapters.test.mjs` (mocks, sans matériel ni réseau).

### Dans le Designer (3.3.15)
Inspecteur du node OSC : champ « Passerelle OSC WebSocket » (`ws://` ou `wss://`), bouton « Connecter la passerelle » et statut.
Sans passerelle joignable : « passerelle requise » (jamais de faux envoi). Une fois connectée, les envois OSC du runtime et la commande
terminal `osc <cible> <adresse> <valeurs…>` passent par la passerelle en OSC binaire ; `oscws connect <url>` / `oscws off` au terminal.
Test : `qa/libpd-listen-oscws-e2e.mjs` (serveur WebSocket simulé qui décode le paquet OSC reçu et répond).

### Limite constatée en production (3.3.15) : accès au réseau local
Depuis la PWA publique (HTTPS, github.io), Chromium bloque par défaut la connexion à une passerelle `ws://127.0.0.1`
ou `ws://192.168.…` (protection « Local Network Access » / Private Network Access) : le Designer affiche alors honnêtement
« passerelle requise … connexion refusée ». Vérifié le 16/10/2026 : même test réussi en local (`scripts/serve.mjs`) et sur
la PWA publique une fois cette protection désactivée dans le navigateur de test.
Solutions : utiliser le Designer servi en local (`node scripts/serve.mjs`) ou l'app de bureau, accepter l'invite
« accès au réseau local » quand le navigateur la propose, ou exposer la passerelle en `wss://` avec un certificat valide.
