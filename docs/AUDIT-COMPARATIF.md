# Audit comparatif No[co]de Vibe Designer · 16/10/2026 (3.3.18)

Objectif : décider quoi construire, pas recopier. Aucun code propriétaire lu ni copié, aucune protection contournée,
aucune décompilation : seulement des **déclarations publiques des bundles** (Info.plist, bibliothèques liées),
des **documentations/spécifications publiques** et des **projets open source**.

## Légende des sources
| Code | Signification |
|---|---|
| **REA** | Observé avec REA v2.4.0 (MCP) sur le Mac de l'utilisateur ; identifiant d'evidence fourni |
| **Bundle** | Contenu du dossier de l'application listé au shell (pas REA) |
| **Doc** | Documentation ou spécification publique (lien) |
| **NV** | Non vérifié dans cette passe |

## 1. Ce que REA a réellement observé
| Logiciel (version) | Observation | Evidence |
|---|---|---|
| TouchDesigner 2025.33230 | Formats déclarés : .toe/.tox, USD/USDZ, FBX, Alembic, OBJ, MKV, WebM, AVI, MPEG-TS ; micro « Audio Device In CHOP », caméra « Video Device In TOP » | `ev_5837b725f1e3b960d40d33c203ae2eeef804364255359d655af81e7e75413f1a` (plist) |
| TouchDesigner | Une bibliothèque par famille d'opérateurs (`libCHOP`, `libTOP`, `libSOP`, `libDAT`, `libPOP`…) **et** une bibliothèque `C_*` par famille (`libC_CHOP`, `libC_TOP`, `libC_SOP`, `libC_DAT`, `libC_POP`) = kit « Custom Operator » public ; modules dédiés `libDMX`, `libMIDI`, `libRTC` (WebRTC), `libOCV` (OpenCV), `libJUCE` (audio), `libPY` (Python), `libTouchEngine`, `libAJA`, `libBM` (Blackmagic), `libLaserCHOP`, `libkiss_fft` | `ev_9c7c804996abab1ff3b3c37a251ed15253737f132e3276b39f7346d47fbe35c4` (Mach-O) |
| Millumin 5.14.k | Projet `.millumin`, accès réseau local déclaré (`NSLocalNetworkUsageDescription`), caméra, micro, Bluetooth, Sparkle | `ev_e0bb12dbc65186abdbe5f3675c031966ea0caa1cdea72ad397250ebbeea3084c` (plist) |
| Millumin 5.14.k | Lie `VVOSCQueryProtocol`, `BBOSC`, `VVMIDI`, `ScreenCaptureKit`, `SceneKit`, `Network` | `ev_4390c6f154b1e67535fe904052f7dee4b16663ea130fcbfc0f20262e08bf80dc` (Mach-O) |
| Chataigne | Lie `Syphon`, `CoreMIDI`, `SDL2` (manettes), `IOBluetooth`, `Metal` ; importe l'API Bonjour `DNSService*` (découverte réseau) | `ev_6a34cb795515d4e6c873f4842bbaa4f6d3d804024c51f95156a24e781cceccbd` (Mach-O) |
| Max (installé) | Lie `CoreMIDI`, `AudioUnit`, `Metal`, `WebKit`, `SystemConfiguration` | `ev_6aaa9ed7082819248ef155eccb9550b67316aac1616f7d6798b1767ea79d1076` (Mach-O) |

Les evidence REA sont des enregistrements de session (rejouables en relançant les mêmes appels sur le même binaire, identifié par son SHA-256).

**Limite REA constatée** : la recherche de chaînes et l'analyse profonde exigent Ghidra ou Hopper, absents du Mac
(`provider_unavailable`). Seuls les outils sans désassembleur (plist, signature, Mach-O) ont été utilisés.

Bundle (shell) : Millumin embarque `liblo` (OSC), `libndi`, `Syphon`, `HapInAVFoundation` (codec Hap), `VVOSCQueryProtocol` ;
Max embarque les paquets `Node for Max`, `RNBO`, `Gen`, `Jitter`, `mira` (télécommande tablette), `hap`, `Vizzie`, `BEAP`.

## 2. Décision tirée de l'audit (implémentée en 3.3.18)
Millumin (REA), VDMX, vvvv, ossia score ([doc](https://ossia.io/score-docs/devices/oscquery-device.html),
[vvvv](https://vvvv.org/blog/2023/introducing-support-for-the-oscquery-protocol), [VDMX](https://docs.vidvox.net/vdmx/vdmx_oscquery))
et TouchDesigner via un composant communautaire ([td-osc-query-server](https://github.com/jonglissimo/td-osc-query-server))
parlent **OSCQuery** ([spécification](https://github.com/OSSIA/OSCQueryProposal)). No[co]de n'avait **aucune entrée OSC**
(seulement l'envoi) : un logiciel de régie ne pouvait pas déclencher ses tops.

→ `bridge/osc-control.mjs` : entrée OSC UDP (messages + bundles) et serveur OSCQuery (`?HOST_INFO`, arbre, `?VALUE`, codes 204/400/404)
sur le pont de régie. Espace `/nocode/transport/*`, `/nocode/cue/go`, `/nocode/widget/<id>`, `/nocode/node/<id>/<param>`
(paramètres réels du projet ouvert, jamais inventés). Tests : `qa/osc-control-qa.mjs` 30/30, `qa/osc-designer-e2e.mjs` 13/13 (Designer réel).
Au passage : **une modification reçue à distance n'était pas enregistrée** (perdue au rechargement) — corrigé et testé.

## 2 bis. Passe REA du 17/10/2026 (3.3.20)
**Reproductibilité** : les mêmes appels REA sur les mêmes binaires ont redonné **exactement** les mêmes identifiants d'evidence
(Millumin `ev_e0bb…`/`ev_4390…`, TouchDesigner `ev_5837…`/`ev_9c7c…`, Chataigne Mach-O `ev_6a34…`, Max Mach-O `ev_6aaa…`) : les constats de la passe 1 sont confirmés.

| Logiciel (version) | Nouvelle observation | Evidence |
|---|---|---|
| Max 9.1.3 | Ouvre les patchs **Pure Data** (`.pd`, rôle Viewer) ; patchers `.maxpat` = **JSON** ; presets `.maxpresets`, snippets `.maxsnip`, RNBO `.rnbopat`, schéma d'URL `c74max:` | `ev_6d6ae7ab42a51ef815694cb32da0accc51b9dea8215beff83d0e756ea5ee1cb7` (plist) |
| Chataigne 1.9.24 | Projet `.noisette` (XML) ; usage micro déclaré | `ev_8172ff8228bfccda86734df5b125c8a7544aea678dda789de7cf0b18f9066b1b` (plist) |
| Ableton Live 10.1.43 | Sets `.als`, clips `.alc`, devices Max for Live `.amxd`, schéma d'URL `ableton:` ; embarque `MaxAPI`/`JitterAPI` | `ev_590d6253bd40fc9a22eb25e156311bf4d77cfe5832f2bd6abf7d420cb28f911a` (plist) |
| NDI Router 6.3.0 | Outil NDI autonome (frameworks `NDICommon`, `NTFramework`) | `ev_1e9dba375aa44336ff6c436d2631db8da6ad8125e4c0dce52f40da30bffe02c0` (plist) |

Bundle (shell, pas REA) : **Syphon** est embarqué par Millumin, Chataigne **et** TouchDesigner ; `libndi` par Millumin.
Non installés sur le Mac (donc non observables par REA) : QLab, Resolume, Isadora, vvvv, ossia score, Reaper, MadMapper, Pure Data, Bitfocus Companion.

### Décisions implémentées (3.3.20)
1. **Découverte automatique** (constat REA : Millumin lie `VVOSCQueryProtocol` ; spécification OSCQuery : annonce `_oscjson._tcp`) →
   `bridge/mdns-announce.mjs`, répondeur DNS-SD sans dépendance (`_oscjson._tcp` + `_osc._udp`, au-revoir TTL 0, jamais en mode local).
   **Preuve réelle** : `dns-sd -B _oscjson._tcp` / `dns-sd -B _osc._udp` / `dns-sd -L` sur le Mac (Bonjour natif d'Apple) ont découvert et résolu
   l'instance annoncée (`… can be reached at <hôte>.local.:9876`, `txtvers=1`). Tests : `qa/mdns-announce-qa.mjs` 18/18.
2. **Conduite : un seul contrôleur GO** (doc QLab : délai minimal entre deux GO, en secondes, appliqué au GO de l'espace de travail
   y compris MIDI mais pas aux déclencheurs de cue — [forum officiel](https://groups.google.com/g/qlab/c/Lo008AEZ8pY)).
   L'audit interne a montré 3 logiques GO incohérentes (bouton : rejouait la cue courante ; OSC/Companion : clé `activeCueId` et
   **retour à la première cue après la dernière** ; mobile : 3ᵉ variante). → `shared/stage/go-controller.js` : standby unique,
   protection double-GO **commune à toutes les sources**, requêtes rejouées ignorées, pré-attente, auto-continue/auto-follow annulables,
   fin de conduite sans bouclage, journal. OSC : `/nocode/cue/next|prev|panic` ajoutés et exposés en OSCQuery.
   Tests : `qa/go-controller-qa.mjs` 23/23, `qa/go-designer-e2e.mjs` 16/16 (bouton + OSC UDP réels dans le Designer).

## 3. Matrice fonctionnelle
États No[co]de : **OK** testé automatiquement · **PARTIEL** · **SIMULÉ** (sans matériel) · **ABSENT**. Source : voir légende.

| Référence (source) | Fonction de référence | No[co]de | État | Manque / proposition | Priorité |
|---|---|---|---|---|---|
| TouchDesigner (REA) | Familles d'opérateurs + SDK d'opérateurs par famille | Library ~130 nodes, `node-specs.js` / `node-processors.js` | OK (129 nodes balayés) | Registre de plugins par famille sans toucher au cœur | P1 |
| TouchDesigner (REA) | WebRTC, OpenCV, DMX, MIDI natifs | WebRTC (PeerJS), MediaPipe/ml, Art-Net/sACN (octets), Web MIDI | PARTIEL | DMX/Art-Net en UDP seulement via pont/desktop ; MIDI réel non testé | P1 |
| TouchDesigner (REA) | Import USD/FBX/Alembic/OBJ | — | ABSENT | Import OBJ/glTF via three.js (MIT) | P2 |
| Millumin (REA) | OSCQuery + OSC entrant | Pont 3.3.18 | **OK** | Annonce mDNS `_oscjson._tcp` ; WebSocket LISTEN | P1 |
| Millumin (REA, Bundle) | Syphon / NDI / Hap | NDI : nodes de test | SIMULÉ | Hors navigateur uniquement (desktop natif) | P2 |
| Millumin (Doc) | Timeline + layers + mapping | Timeline, layers, Quick Map | PARTIEL | Alignement/édition de clips à reprendre (historique) | P0 |
| QLab (Doc) | Liste de cues, GO, pre/post-wait | Stage cues + GO Companion/OSC | PARTIEL | Pre-wait / auto-continue / auto-follow | P1 |
| Chataigne (REA) | Routage protocoles, découverte Bonjour, manettes, Syphon | Pont OSC/WS, Companion | PARTIEL | Gamepad API (navigateur), mDNS | P2 |
| Max (REA, Bundle) | Patching, Node for Max, RNBO (export), mira (télécommande) | Patching, export Max (`.maxpat`), Companion | PARTIEL | Export Max validé structurellement, pas dans Max | P1 |
| Pure Data (Doc) | Patching audio, libpd | libpd WASM, export `.pd` vanilla | OK (calcul + audible) | 44,1 kHz, un patch, pas d'`adc~` | P1 |
| Processing / p5.js (Doc) | Dessin génératif | Générateurs, export p5 | PARTIEL | NV : export ouvert dans p5 editor | P2 |
| vvvv (Doc) | OSCQuery, patching typé | Ports typés (`ports.js`), OSCQuery 3.3.18 | PARTIEL | — | — |
| Node-RED (Doc) | Flux événementiels, nodes réseau | Graphe + intents | PARTIEL | Nodes HTTP/MQTT : non | P2 |
| Unreal Blueprint / Godot Visual Shader (Doc) | Graphes de shaders typés | Shader agent, ISF | PARTIEL | Graphe → GLSL compilé et vérifié | P2 |
| Isadora (Doc) | Acteurs, scènes, déclenchements | Nodes + scènes Stage | PARTIEL | — | — |
| OBS Studio (Doc) | Scènes, sources, obs-websocket | Radio / diffusion | PARTIEL | Client obs-websocket v5 (spéc. publique) | P2 |
| Resolume (Doc) | Couches, effets, OSC | Couches, effets vidéo (20 testés) | PARTIEL | Mapping OSC des couches | P2 |
| openFrameworks (Doc) | Addons C++ | — | ABSENT | Non pertinent (web) ; export possible | P2 |
| Hydra (Doc) | Live coding vidéo navigateur | Shaders/feedback | PARTIEL | Mode live-code ; hydra-synth (AGPL : licence à vérifier) | P2 |
| GLSL / ISF (Doc) | Shaders portables | `isf-agent.js` | PARTIEL | Validation ISF par compilation WebGL en QA | P1 |
| ComfyUI (Doc) | Graphe IA, API HTTP | IA locale / Vibe Out | PARTIEL | Client API ComfyUI local | P2 |
| Open Stage Control (Doc) | Surfaces de contrôle, OSC | Companion Studio | OK (Companion ↔ Designer) | OSC sortant vers OSC : déjà ; import de layouts : non | P2 |

## 4. Audit interne (preuves existantes, pas de nouvelle affirmation)
| Surface / brique | État | Preuve |
|---|---|---|
| Designer, Library, câblage, export | OK | `designer-workflow-e2e`, `library-runtime-sweep` (117 sans erreur, 12 signalent média/capteur absent) |
| Companion ↔ Designer (LAN) | OK (mobile émulé) | `companion-roundtrip-e2e` 20/20 ; téléphones physiques NV |
| OSC entrant / OSCQuery | OK | `osc-control-qa` 30/30, `osc-designer-e2e` 13/13 ; logiciels tiers réels NV |
| OSC/Art-Net/sACN sortants | PARTIEL | octets conformes ; émission UDP seulement depuis desktop/pont |
| Micro, caméra | SIMULÉ | faux périphériques Chromium |
| NDI, Serial, ESP32, GPIO | SIMULÉ | nodes « test » ; aucun matériel |
| Desktop macOS + pont | En vérification | build de branche `claude/ci-electron-bridge-20261016` |

## 5. Bibliothèques open source réutilisables (licence à respecter)
| Bibliothèque | Usage | Licence (Doc) |
|---|---|---|
| Spécification OSCQuery (OSSIA) | Découverte d'adresses | spécification publique |
| liblo / osc.js | OSC | LGPL-2.1 / MIT ou GPL |
| three.js | Import OBJ/glTF, 3D | MIT |
| MediaPipe Tasks | Segmentation, silhouettes | Apache-2.0 |
| Hap (codec) | Vidéo GPU | BSD-2 |
| obs-websocket (protocole v5) | Pilotage OBS | GPL (serveur) — client à écrire nous-mêmes |
| hydra-synth | Live coding | AGPL : incompatible si code fermé |

## 6. Priorités suivantes
1. **P0** Timeline : alignement et édition de clips ; édition pre/post-wait et mode d'enchaînement dans le panneau Conduite ; mobile sur le contrôleur GO.
2. **P1** OSCQuery `LISTEN` (WebSocket) pour retour d'état temps réel vers Chataigne / ossia ; import de patchs Max `.maxpat` (JSON, constat REA).
2 bis. **P1** Vidéo inter-applications : Syphon (macOS) / Spout (Windows) / NDI depuis la version desktop (constat : Syphon embarqué par Millumin, Chataigne, TouchDesigner) — module natif à évaluer (licences, signature).
3. **P1** Registre de nodes en plugins par famille (modèle TouchDesigner observé par REA).
4. **P2** Import OBJ/glTF (three.js), client obs-websocket, client ComfyUI local.
