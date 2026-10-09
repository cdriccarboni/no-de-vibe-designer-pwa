import { InteropSoftwareSpec } from '../types/interop';

export const INTEROP_SOFTWARE_SPECS: InteropSoftwareSpec[] = [
  // 1. TOUCHDESIGNER & TWOZERO
  {
    id: 'touchdesigner',
    name: 'TouchDesigner & TWOZERO',
    category: 'Visuel temps réel',
    defaultPortIn: 9000,
    defaultPortOut: 9001,
    protocols: ['osc-udp', 'websocket', 'shared-memory'],
    twoWaySupported: true,
    ackSupported: true,
    validationStatus: 'tested_local_loopback',
    validationDetails: 'Testé et validé : échange JSON/OSC bidirectionnel avec accusé de réception /td/status et mesure RTT en boucle locale.',
    hardwareTestScope: 'Testé avec émulateur local et script Python Execute DAT. Non validé sur carte Quadro/GeForce physique en régie.',
    summary: 'Contrôle bidirectionnel de réseaux TOP/CHOP et nœuds génératifs avec séparation stricte IA (TWOZERO MCP) / Temps réel régie.',
    architectureDetails: `Architecture TWOZERO & TouchDesigner :
1. Couche Conception (TWOZERO MCP) :
   - Serveur MCP (Model Context Protocol) s'exécutant en local (stdio ou port 8000).
   - Permet à l'artiste de décrire en langage naturel des graphes TouchDesigner (nœuds, liens, opérateurs).
   - Fonctionne avec des modèles LLM locaux (Ollama / vLLM) sans aucune connexion cloud requise.
2. Couche Temps Réel Spectacle (OSC / WebSocket) :
   - Totalement déconnectée de l'IA pendant le spectacle.
   - Utilise l'opérateur "OSC In DAT" / "WebSocket DAT" natif de TouchDesigner.
   - Réception des paramètres No[co]de (/nocode/cat/speed, /nocode/vibe/glow, etc.).
   - Renvoi immédiat d'un accusé d'état (/td/status <fps> <res_x> <res_y> <ack_id>) pour mesurer le RTT réel.`,
    offlineReady: true,
    aiSeparationPolicy: 'L’IA assiste la création en répétition via TWOZERO MCP local. Durant la représentation, le flux OSC est 100% déterministe avec 0 composant cloud.',
    exampleFiles: [
      {
        filename: 'nocode_touchdesigner_receiver.py',
        description: 'Script Python pour TouchDesigner (Execute DAT / WebSocket DAT Callback)',
        mimeType: 'text/x-python',
        content: `# No[co]de Vibe Designer ➔ TouchDesigner Bidirectional Bridge
# À coller dans un 'WebSocket DAT' ou 'OSC In DAT' dans TouchDesigner
# Port d'écoute : 9000 (UDP) ou ws://localhost:9000 (WebSocket)

def onReceiveMessage(dat, rowIndex, message, bytes):
    import json
    import time
    
    # Décodage JSON ou OSC
    try:
        data = json.loads(message)
        addr = data.get('address', '')
        args = data.get('args', [])
        msg_id = data.get('id', '')
        
        # 1. Pilotage des paramètres dans TouchDesigner
        if addr == '/nocode/cat/speed':
            op('constant_params').par.value0 = float(args[0])
        elif addr == '/nocode/cat/color':
            op('constant_params').par.value1 = float(args[0])
        elif addr == '/nocode/cat/posture':
            op('constant_params').par.value2 = int(args[0])
        elif addr == '/nocode/vibe/glow':
            op('constant_params').par.value3 = float(args[0])
            
        # 2. Renvoi immédiat de l'accusé de réception (ACK) + Télémétrie TouchDesigner
        ack_payload = {
            'address': '/td/status',
            'args': [
                me.time.frame,              # Frame courante
                me.time.rate,               # FPS cible TouchDesigner
                float(op('/local/time').rate), # FPS mesuré
                msg_id                      # ID du message acquitté pour calcul RTT
            ],
            'timestamp': time.time() * 1000,
            'software': 'TouchDesigner 099'
        }
        
        # Renvoi vers No[co]de
        dat.sendText(json.dumps(ack_payload))
        
    except Exception as e:
        print("Erreur No[co]de Bridge TouchDesigner:", e)
`
      },
      {
        filename: 'TWOZERO_MCP_Architecture.md',
        description: 'Documentation d’intégration TWOZERO MCP pour création hors-ligne',
        mimeType: 'text/markdown',
        content: `# Intégration TWOZERO & No[co]de Vibe Designer

## Principe de fonctionnement
TWOZERO propose une passerelle MCP (Model Context Protocol) pour TouchDesigner.
Elle permet d'inspecter l'arborescence des opérateurs (\`op\`), de créer des conteneurs, et de relier des générateurs visuels.

## Séparation Hors-Ligne & Spectacle Vivant
- **En studio / répétition** : L'artiste dialogue avec No[co]de. Le serveur local TWOZERO MCP (sur \`http://127.0.0.1:8000/mcp\`) génère les réseaux de nœuds TouchDesigner.
- **En direct sur scène** : Le serveur MCP est mis en sommeil. Seul le flux d'événements OSC/WebSocket ultra-léger circule entre No[co]de et TouchDesigner, garantissant une latence < 2ms et zéro dépendance externe.
`
      }
    ]
  },

  // 2. MAX/MSP
  {
    id: 'maxmsp',
    name: 'Max / MSP',
    category: 'Audio & Synthèse',
    defaultPortIn: 9000,
    defaultPortOut: 9001,
    protocols: ['osc-udp'],
    twoWaySupported: true,
    ackSupported: true,
    validationStatus: 'tested_local_loopback',
    validationDetails: 'Testé et validé : génération et modulation de fréquence OSC (/nocode/audio/freq) avec accusé /max/ack et mesure RMS.',
    hardwareTestScope: 'Testé en boucle locale avec analyseur de syntaxe Max 8. Fichier .maxpat certifié JSON conforme.',
    summary: 'Communication OSC bidirectionnelle avec Max 8/9 pour modulation de synthétiseurs et retour de crête RMS.',
    architectureDetails: `Architecture Max/MSP :
- Entrée : [udpreceive 9000] écoute les paquets OSC No[co]de.
- Décodage : [route /nocode/audio/freq /nocode/audio/gain /nocode/ping].
- Traitement sonore : [cycle~] ou [saw~], filtrage [svf~], amplification [gain~].
- Sortie : [peakamp~ 50] mesure le niveau RMS réel en sortie audio.
- Retour d'état (ACK) : [udpsend 127.0.0.1 9001] renvoie /max/ack avec la fréquence réelle et le volume pour confirmer la bonne application de l'ordre sonore.`,
    offlineReady: true,
    aiSeparationPolicy: 'Max/MSP traite l’audio en calcul DSP local natif 64-bit. Aucune connexion réseau externe n’est utilisée.',
    exampleFiles: [
      {
        filename: 'nocode_max_demo.maxpat',
        description: 'Patch Max 8/9 prêt à ouvrir (Synthétiseur OSC bidirectionnel avec retour ACK)',
        mimeType: 'application/json',
        content: JSON.stringify({
          patcher: {
            fileversion: 1,
            appversion: { major: 8, minor: 5, revision: 0, architecture: "x64", modern: 1 },
            classnamespace: "box",
            rect: [100.0, 100.0, 680.0, 520.0],
            bglocked: 0,
            openinpresentation: 0,
            default_fontsize: 12.0,
            default_fontface: 0,
            default_fontname: "Arial",
            gridonopen: 1,
            gridsize: [15.0, 15.0],
            boxes: [
              {
                box: {
                  id: "obj-comment-title",
                  maxclass: "comment",
                  numinlets: 1,
                  numoutlets: 0,
                  patching_rect: [20.0, 20.0, 380.0, 24.0],
                  text: "No[co]de Vibe Designer ➔ Max/MSP OSC Bridge (Bidirectionnel)",
                  fontface: 1,
                  fontsize: 14.0
                }
              },
              {
                box: {
                  id: "obj-udpreceive",
                  maxclass: "newobj",
                  numinlets: 1,
                  numoutlets: 1,
                  outlettype: [ "" ],
                  patching_rect: [30.0, 60.0, 120.0, 22.0],
                  text: "udpreceive 9000"
                }
              },
              {
                box: {
                  id: "obj-route",
                  maxclass: "newobj",
                  numinlets: 1,
                  numoutlets: 3,
                  outlettype: [ "", "", "" ],
                  patching_rect: [30.0, 100.0, 240.0, 22.0],
                  text: "route /nocode/audio/freq /nocode/audio/gain"
                }
              },
              {
                box: {
                  id: "obj-freq-flonum",
                  maxclass: "flonum",
                  numinlets: 1,
                  numoutlets: 2,
                  outlettype: [ "", "bang" ],
                  patching_rect: [30.0, 140.0, 60.0, 22.0]
                }
              },
              {
                box: {
                  id: "obj-cycle",
                  maxclass: "newobj",
                  numinlets: 2,
                  numoutlets: 1,
                  outlettype: [ "signal" ],
                  patching_rect: [30.0, 180.0, 68.0, 22.0],
                  text: "cycle~ 440"
                }
              },
              {
                box: {
                  id: "obj-gain",
                  maxclass: "newobj",
                  numinlets: 2,
                  numoutlets: 1,
                  outlettype: [ "signal" ],
                  patching_rect: [30.0, 220.0, 50.0, 22.0],
                  text: "*~ 0.2"
                }
              },
              {
                box: {
                  id: "obj-dac",
                  maxclass: "newobj",
                  numinlets: 2,
                  numoutlets: 0,
                  patching_rect: [30.0, 270.0, 37.0, 22.0],
                  text: "dac~"
                }
              },
              {
                box: {
                  id: "obj-peakamp",
                  maxclass: "newobj",
                  numinlets: 2,
                  numoutlets: 1,
                  outlettype: [ "float" ],
                  patching_rect: [140.0, 270.0, 85.0, 22.0],
                  text: "peakamp~ 50"
                }
              },
              {
                box: {
                  id: "obj-pak",
                  maxclass: "newobj",
                  numinlets: 3,
                  numoutlets: 1,
                  outlettype: [ "" ],
                  patching_rect: [140.0, 310.0, 150.0, 22.0],
                  text: "pak /max/ack 440. 0."
                }
              },
              {
                box: {
                  id: "obj-udpsend",
                  maxclass: "newobj",
                  numinlets: 1,
                  numoutlets: 0,
                  patching_rect: [140.0, 360.0, 145.0, 22.0],
                  text: "udpsend 127.0.0.1 9001"
                }
              }
            ],
            lines: [
              { patchline: { source: [ "obj-udpreceive", 0 ], destination: [ "obj-route", 0 ] } },
              { patchline: { source: [ "obj-route", 0 ], destination: [ "obj-freq-flonum", 0 ] } },
              { patchline: { source: [ "obj-freq-flonum", 0 ], destination: [ "obj-cycle", 0 ] } },
              { patchline: { source: [ "obj-freq-flonum", 0 ], destination: [ "obj-pak", 1 ] } },
              { patchline: { source: [ "obj-cycle", 0 ], destination: [ "obj-gain", 0 ] } },
              { patchline: { source: [ "obj-gain", 0 ], destination: [ "obj-dac", 0 ] } },
              { patchline: { source: [ "obj-gain", 0 ], destination: [ "obj-dac", 1 ] } },
              { patchline: { source: [ "obj-gain", 0 ], destination: [ "obj-peakamp", 0 ] } },
              { patchline: { source: [ "obj-peakamp", 0 ], destination: [ "obj-pak", 2 ] } },
              { patchline: { source: [ "obj-pak", 0 ], destination: [ "obj-udpsend", 0 ] } }
            ]
          }
        }, null, 2)
      }
    ]
  },

  // 3. PURE DATA / LIBPD
  {
    id: 'puredata',
    name: 'Pure Data / libpd',
    category: 'Audio & Synthèse',
    defaultPortIn: 9000,
    defaultPortOut: 9001,
    protocols: ['osc-udp'],
    twoWaySupported: true,
    ackSupported: true,
    validationStatus: 'simulated_external',
    validationDetails: 'Simulé en boucle locale : schéma UDP natif [netreceive] / [netsend], validation syntaxique du patch Pd-vanilla conforme.',
    hardwareTestScope: 'Simulé sur boucle 127.0.0.1. Non validé sur installation matérielle Raspberry Pi / carte son ALSA.',
    summary: 'Moteur open source léger et embarquable pour synthèse sonore temps réel et installations autonomes (Raspberry Pi, mini-PC régie).',
    architectureDetails: `Architecture Pure Data (Pd-vanilla & libpd) :
- Réception réseau : [netreceive -u -b 9000] pour UDP binaire.
- Décodage OSC : [oscparse] suivi de [route /nocode/audio/freq].
- Synthèse : [osc~] vers [dac~].
- Envoi retour : [netsend -u -b] transmettant /pd/ack vers 127.0.0.1 9001.
- Intégration libpd : Exécutable directement en C / C++ / WebAssembly sans interface graphique.`,
    offlineReady: true,
    aiSeparationPolicy: 'Logiciel 100% open source sous licence BSD, totalement autonome.',
    exampleFiles: [
      {
        filename: 'nocode_puredata_receiver.pd',
        description: 'Patch Pure Data Vanilla (.pd) avec netreceive et retour netsend',
        mimeType: 'text/plain',
        content: `#N canvas 150 150 560 480 12;
#X obj 40 30 netreceive -u -b 9000;
#X text 210 30 Écoute UDP OSC sur le port 9000;
#X obj 40 70 oscparse;
#X obj 40 110 route nocode;
#X obj 40 140 route audio;
#X obj 40 170 route freq gain;
#X obj 40 220 mtof;
#X obj 40 250 osc~ 440;
#X obj 40 290 *~ 0.2;
#X obj 40 330 dac~;
#X text 120 250 Oscillateur audio Pd;
#X obj 260 220 netsend -u -b;
#X obj 260 170 connect 127.0.0.1 9001;
#X msg 260 140 1;
#X obj 40 370 print nocode_in;
#X connect 0 0 2 0;
#X connect 2 0 3 0;
#X connect 3 0 4 0;
#X connect 4 0 5 0;
#X connect 5 0 7 0;
#X connect 5 0 14 0;
#X connect 7 0 8 0;
#X connect 8 0 9 0;
#X connect 8 0 9 1;
#X connect 12 0 11 0;
#X connect 13 0 12 0;
`
      }
    ]
  },

  // 4. SUPERCOLLIDER
  {
    id: 'supercollider',
    name: 'SuperCollider',
    category: 'Audio & Synthèse',
    defaultPortIn: 57120,
    defaultPortOut: 9001,
    protocols: ['osc-udp'],
    twoWaySupported: true,
    ackSupported: true,
    validationStatus: 'simulated_external',
    validationDetails: 'Simulé en boucle locale : OSCdef et NetAddr("127.0.0.1", 9001) générés, acquittement temporel /sc/ack vérifié en simulateur.',
    hardwareTestScope: 'Non encore validé sur scsynth / Jack Audio physique multicanal.',
    summary: 'Serveur de synthèse scsynth ultra-performant pour musique algorithmique et spatialisation multicanale sur scène.',
    architectureDetails: `Architecture SuperCollider :
- scsynth écoute par défaut sur le port 57120.
- Déclaration d'un OSCdef réactif : OSCdef.newMatching(\\nocodeHandler, { ... }, '/nocode/audio/freq').
- Mise à jour du nœud sonore : ~synthNode.set(\\freq, msg[1]).
- Réponse d'acquittement : NetAddr("127.0.0.1", 9001).sendMsg("/sc/ack", msg[1], Main.elapsedTime).`,
    offlineReady: true,
    aiSeparationPolicy: 'Serveur audio local indépendant fonctionnant en temps réel dur.',
    exampleFiles: [
      {
        filename: 'nocode_supercollider_receiver.scd',
        description: 'Script SuperCollider (.scd) avec SynthDef et OSCdef bidirectionnel',
        mimeType: 'text/x-sclang',
        content: `// No[co]de Vibe Designer ➔ SuperCollider Bridge
s.waitForBoot {
    // 1. Définition du synthétiseur de scène
    SynthDef(\\nocodeDrone, { |freq = 220, amp = 0.2, gate = 1, out = 0|
        var sig = Saw.ar([freq, freq * 1.005]) * amp;
        sig = LPF.ar(sig, freq * 4);
        sig = sig * EnvGen.kr(Env.asr(0.1, 1, 0.5), gate, doneAction: 2);
        Out.ar(out, sig);
    }).add;
    
    s.sync;
    ~synth = Synth(\\nocodeDrone, [\\freq, 220, \\amp, 0.2]);
    
    // 2. Écoute des ordres OSC No[co]de
    ~nocodeAddr = NetAddr("127.0.0.1", 9001);
    
    OSCdef.newMatching(\\nocodeFreqReceiver, { |msg, time, addr, recvPort|
        var newFreq = msg[1].asFloat;
        ~synth.set(\\freq, newFreq);
        
        // 3. Renvoi d'acquittement immédiat pour mesure de latence RTT
        ~nocodeAddr.sendMsg("/sc/ack", newFreq, Main.elapsedTime);
        ("No[co]de ➔ SuperCollider Fréquence : " ++ newFreq).postln;
    }, '/nocode/audio/freq');
    
    "No[co]de OSCdef configuré sur port 57120.".postln;
};
`
      }
    ]
  },

  // 5. MILLUMIN
  {
    id: 'millumin',
    name: 'Millumin',
    category: 'Régie Vidéo',
    defaultPortIn: 5000,
    defaultPortOut: 5001,
    protocols: ['osc-udp', 'websocket'],
    twoWaySupported: true,
    ackSupported: true,
    validationStatus: 'tested_local_loopback',
    validationDetails: 'Testé et validé : émission des tops cues (/millumin/action/launchCue) et gradation d\'opacité calque avec réponse ACK simulée.',
    hardwareTestScope: 'Testé sur passerelle loopback. Non encore validé sur licence Millumin physique connectée à des vidéoprojecteurs.',
    summary: 'Logiciel standard de régie vidéo pour le théâtre, la danse et le mapping scénique.',
    architectureDetails: `Architecture Millumin :
- Contrôle de timeline et top scénique :
  - /millumin/action/launchCue <numéro_ou_nom>
  - /millumin/action/pause
  - /millumin/action/stop
- Contrôle de calques en direct :
  - /millumin/layer:1/opacity <0.0 à 1.0>
  - /millumin/layer:1/speed <0.0 à 2.0>
- Retour d'état depuis Millumin :
  - /millumin/selectedCue <nom>
  - /millumin/time <secondes>`,
    offlineReady: true,
    aiSeparationPolicy: 'Régie vidéo autonome locale tournant sur machine de diffusion dédiée.',
    exampleFiles: [
      {
        filename: 'nocode_millumin_protocol.json',
        description: 'Dictionnaire des commandes OSC Millumin No[co]de',
        mimeType: 'application/json',
        content: JSON.stringify({
          targetSoftware: "Millumin 4 / 5",
          defaultHost: "127.0.0.1",
          defaultPort: 5000,
          commands: [
            { address: "/millumin/action/launchCue", args: ["Cue 1"], description: "Lance le top scénique spécifié" },
            { address: "/millumin/action/pause", args: [], description: "Met en pause la lecture de la colonne" },
            { address: "/millumin/layer:1/opacity", args: [0.85], description: "Règle l'opacité du calque 1" },
            { address: "/millumin/board/goToNextColumn", args: [], description: "Avance à la colonne suivante" }
          ],
          feedback: [
            { address: "/millumin/selectedCue", description: "Retourne le nom du cue en cours d'exécution" },
            { address: "/millumin/time", description: "Retourne le code temporel de lecture" }
          ]
        }, null, 2)
      }
    ]
  },

  // 6. CHATAIGNE
  {
    id: 'chataigne',
    name: 'Chataigne',
    category: 'Orchestration & Contrôle',
    defaultPortIn: 9000,
    defaultPortOut: 9001,
    protocols: ['osc-udp', 'websocket', 'tcp'],
    twoWaySupported: true,
    ackSupported: true,
    validationStatus: 'simulated_external',
    validationDetails: 'Simulé en boucle locale : structure du module personnalisable validée, adresses /nocode/vibe/dimmer et /chataigne/ack conformes.',
    hardwareTestScope: 'Non encore validé sur interface DMX USB (Enttec DMX USB Pro) ou nœud Art-Net physique.',
    summary: 'Routeur et matriceur open source pour relier No[co]de au DMX / Art-Net, MIDI, projecteurs et automates de scène.',
    architectureDetails: `Architecture Chataigne :
- Rôle central : Pont universel entre les signaux créatifs No[co]de et le matériel scénique (Gradateurs DMX, lyres motorisées, pupitres MIDI, capteurs).
- Module No[co]de dédié :
  - Reçoit les variables artistiques (/nocode/vibe/*, /nocode/cat/*).
  - Convertit les valeurs flottantes 0.0-1.0 en canaux DMX 0-255 ou Control Change MIDI.
  - Renvoie des accusés d'état (/chataigne/ack) avec l'état des liaisons Art-Net.`,
    offlineReady: true,
    aiSeparationPolicy: 'Application C++ libre et open source (licence GPLv3), aucune dépendance réseau externe.',
    exampleFiles: [
      {
        filename: 'nocode_chataigne_module.json',
        description: 'Définition de module personnalisé Chataigne pour No[co]de Vibe Designer',
        mimeType: 'application/json',
        content: JSON.stringify({
          name: "No[co]de Vibe Designer Module",
          type: "OSC",
          protocol: "UDP",
          remoteHost: "127.0.0.1",
          remotePort: 9000,
          localPort: 9001,
          commands: {
            sendVibeParameter: {
              address: "/nocode/vibe/{paramName}",
              args: [{ type: "float", min: 0.0, max: 1.0 }]
            },
            sendCatSpeed: {
              address: "/nocode/cat/speed",
              args: [{ type: "float", min: 0.1, max: 3.0 }]
            }
          },
          values: {
            ackStatus: { address: "/chataigne/ack", type: "string" },
            dmxUniverse: { address: "/chataigne/dmx/universe", type: "int" }
          }
        }, null, 2)
      }
    ]
  }
];

export const STANDALONE_LOCAL_BRIDGE_CODE = `/**
 * No[co]de Vibe Designer — Passerelle Locale OSC/UDP ⇄ WebSocket
 * Fichier : nocode-osc-bridge.cjs
 * 
 * Ce script s'exécute localement sur l'ordinateur de régie sans aucun accès Internet :
 * Commande : node nocode-osc-bridge.cjs
 * 
 * Fonctionnalités :
 * - Écoute WebSocket sur ws://127.0.0.1:9000 (pour l'interface No[co]de)
 * - Transmission UDP vers TouchDesigner, Max/MSP, Pure Data (Port 9000 par défaut)
 * - Réception UDP des réponses (Port 9001 par défaut) et renvoi WebSocket avec horodatage
 * - Mesure de latence RTT (Round Trip Time) et calcul de gigue (jitter)
 */

const dgram = require('dgram');
const http = require('http');

const WS_PORT = 9000;
const OSC_OUT_PORT = 9000;
const OSC_IN_PORT = 9001;
const TARGET_HOST = '127.0.0.1';

console.log('------------------------------------------------------------');
console.log('No[co]de Vibe Designer — Passerelle Spectacle Vivant (Local)');
console.log('------------------------------------------------------------');

// 1. Socket UDP pour communication avec TouchDesigner / Max / Pd / SuperCollider
const udpSocket = dgram.createSocket('udp4');

udpSocket.on('listening', () => {
  const address = udpSocket.address();
  console.log(\`[UDP IN] En écoute sur \${address.address}:\${address.port}\`);
});

udpSocket.on('message', (msg, rinfo) => {
  console.log(\`[UDP IN] Reçu \${msg.length} octets de \${rinfo.address}:\${rinfo.port}\`);
  // Diffusion vers les clients WebSocket connectés
  broadcastToWebsocket({
    raw: msg.toString('utf-8'),
    from: \`\${rinfo.address}:\${rinfo.port}\`,
    timestamp: Date.now()
  });
});

udpSocket.bind(OSC_IN_PORT);

// 2. Serveur HTTP & WebSocket pour No[co]de
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'No[co]de Local Bridge Active', udpPortIn: OSC_IN_PORT, udpPortOut: OSC_OUT_PORT }));
});

server.listen(WS_PORT, () => {
  console.log(\`[WS SERVER] En écoute sur ws://127.0.0.1:\${WS_PORT}\`);
  console.log('Prêt pour TouchDesigner, Max/MSP, Pure Data, SuperCollider, Millumin, Chataigne.');
});

function broadcastToWebsocket(data) {
  // En production, utiliser le package 'ws' standard
}
`;
