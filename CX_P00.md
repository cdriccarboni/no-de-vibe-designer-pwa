# P00 — NO-DE VIBE DESIGNER — PRODUCTION CONTINUE

## Mission

Faire de No-de Vibe Designer l'application complète définie avec l'utilisateur.

Ne pas repartir de zéro.

Le dépôt courant contient la dernière base Mac récupérée et validée.
Le tag `recovered-code-vibe-designer-mac` conserve l'état original avant renommage.
Le tag `no-de-vibe-designer-baseline` conserve la nouvelle base officielle.

Toujours travailler à partir de cette base.

## Règle de production

Ne jamais fonctionner selon :

petite étape → rapport → attente de validation.

Fonctionner en continu :

analyser → développer → câbler → tester → corriger → retester → enchaîner.

Ne demander une intervention humaine que pour :
- un véritable blocage nécessitant une décision ;
- un accès ou secret externe indisponible ;
- une action irréversible ou risquée.

Un bug, un test échoué, une refactorisation ou un choix technique interne ne justifie pas l'arrêt.

## Definition of Done

Aucune fonction n'est DONE simplement parce qu'une interface, un bouton ou un node existe.

Pour chaque fonction :

UI
→ logique
→ moteur
→ données
→ entrée réelle
→ traitement
→ sortie réelle
→ sauvegarde
→ restauration
→ gestion d'erreur
→ test
→ non-régression

Aucun node décoratif.
Aucun bouton factice.
Aucune simulation silencieuse.
Aucun faux statut connecté.
Aucun DONE sans câblage réel.

Maintenir une matrice `Vibe Designer System Test`.

## Interface

Conserver la maquette validée et sa sobriété.

Interface principale desktop :
- Library
- canvas nodal
- Inspector
- vidéo / Preview
- timeline
- Vibe
- terminal
- OUTPUT

Ne pas transformer l'interface en dashboard IA tape-à-l'œil.

Profondeur fonctionnelle maximale.
Interface principale minimale.

Les outils spécialisés doivent pouvoir apparaître à la demande en fenêtres/outils contextuels.

## Exécution

No-de Vibe Designer est un environnement autonome.

Tout projet doit pouvoir :
- être créé ;
- être modifié ;
- être exécuté ;
- être prévisualisé ;
- être joué en répétition ou spectacle ;
- être envoyé vers une véritable fenêtre OUTPUT indépendante.

OUTPUT :
- fenêtre indépendante ;
- plein écran ;
- choix écran / vidéoprojecteur ;
- résolution / ratio ;
- preview ;
- rendu temps réel ;
- routage destination ;
- sortie sans interface de travail.

## Patcher / ART

Auditer et réutiliser toutes les fonctions pertinentes de `patcher_pyrate`.

Ne pas prendre les exemples comme liste exhaustive.

Réutiliser également les briques pertinentes d'ART et des autres projets locaux lorsque cela améliore le résultat :
- vidéo ;
- WebRTC ;
- PeerJS ;
- intercom ;
- data channels ;
- caméra ;
- réseau ;
- offline/local-first ;
- outils scène ;
- protocoles ;
- retours temps réel.

Isoler les briques réutilisées dans une architecture propre (`shared/`, adapters, services, etc.).

Ne pas créer de dépendance fragile avec les interfaces originales.

## Capacités à intégrer

Toutes les capacités déjà définies, notamment :

- nodes
- Vibe coding
- édition du graphe en langage naturel
- timeline
- cues
- GO
- automation
- médias
- vidéo
- caméra
- tracking
- shaders GLSL/WebGL
- Processing / p5.js
- mapping
- MIDI
- OSC
- WebSocket
- Art-Net
- DMX
- Arduino
- ESP32 / Wemos
- Serial
- servos
- capteurs
- RFID / QR
- audio
- communications temps réel
- WebRTC
- intercom
- Millumin et logiciels externes
- sauvegarde / restauration
- reprise après incident
- gestion projet
- presets / scènes

Cette liste n'est pas exhaustive.

## Vibe noding et export

Le graphe interne doit devenir une représentation intermédiaire universelle.

Même projet :

création
→ exécution No-de Vibe Designer
→ OUTPUT
→ export éventuel.

Prévoir des exporteurs réels vers :
- Max/MSP
- Pure Data
- TouchDesigner
- Processing / p5.js
- Arduino / ESP32
- autres cibles pertinentes.

Quand la cible le permet, le fichier généré doit fonctionner sans No-de Vibe Designer.

Ne jamais générer silencieusement un faux fichier cible.

Valider structure, syntaxe et compatibilité.

## IA

Un petit moteur d'agents spécialisés peut être utilisé en interne :
- graphe ;
- Max ;
- Pure Data ;
- TouchDesigner ;
- Arduino ;
- shaders ;
- vidéo ;
- protocoles ;
- tests ;
- diagnostic.

Ces agents restent invisibles dans l'interface utilisateur.

L'utilisateur parle à Vibe ; l'orchestration interne choisit les bons moteurs.

## Mobile / Android

La version mobile fait partie du même projet et partage le moteur commun.

Elle ne doit PAS être une simple version responsive du desktop.

Elle possède une interface réellement pensée pour téléphone/tablette.

Modes principaux :

BUREAU / PLATEAU

Bureau :
- création complète ;
- nodes ;
- connexions ;
- paramètres ;
- timeline ;
- Vibe ;
- édition et programmation.

Plateau :
- GO ;
- cues ;
- retours ;
- états ;
- exploitation tactile.

Mais depuis Plateau, l'utilisateur doit pouvoir revenir immédiatement éditer le projet et corriger quelque chose en live.

Le mobile doit permettre :
- mêmes possibilités créatives ;
- remote du desktop ;
- live editing ;
- pilotage Mac/PC ;
- modification réelle du projet distant ;
- capteurs téléphone ;
- caméra ;
- micro ;
- gyroscope ;
- accéléromètre ;
- orientation ;
- multitouch ;
- haptique ;
- réseau.

## Apparence

Préférences :
- couleur dominante ;
- couleurs secondaires si nécessaire ;
- dégradés ;
- intensité.

Ne pas permettre de casser la lisibilité générale.

## Mac

Priorité immédiate : vraie application Mac autonome.

Cible :
- `.app`
- puis `.dmg`
- icône ;
- installation `/Applications` ;
- aucune barre de navigateur ;
- à terme aucune dépendance à Chrome/Brave/Edge ;
- permissions caméra/micro correctes ;
- build reproductible.

Le build Chromium récupéré est une étape transitoire, pas la cible finale.

## Tests

Créer et maintenir un projet `No-de Vibe Designer System Test`.

Tester réellement notamment :

MIDI → graphe → traitement → OUTPUT

OSC → graphe → paramètre réel

caméra → traitement → OUTPUT

timeline → automation → OUTPUT

shader → runtime → OUTPUT

Arduino/ESP → Serial → graphe → action

mobile → remote → desktop → modification → OUTPUT

Vibe → modification réelle du graphe → résultat observable

sauvegarde → fermeture → réouverture → restauration identique

perte réseau → erreur visible → reconnexion

## Continuité

Quand une tâche est terminée :
1. tester ;
2. corriger ;
3. retester ;
4. mettre à jour la matrice System Test ;
5. identifier automatiquement le prochain manque ;
6. continuer.

Ne pas publier artificiellement une nouvelle version à chaque micro-étape.

Créer un build lorsqu'une avancée mérite réellement d'être testée.

## Priorité

P00.

Objectif final :

No-de Vibe Designer complet,
toutes les fonctions définies,
réellement câblées,
testées,
stables,
Mac + Android,
création + exploitation spectacle + remote + exports multi-cibles.

Continuer jusqu'à satisfaction de la Definition of Done globale.
