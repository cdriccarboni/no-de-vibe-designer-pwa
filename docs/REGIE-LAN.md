# Régie réseau local : téléphone ↔ No[co]de Vibe Designer

Un téléphone (Android ou iPhone) pilote le Designer d'un poste de régie sur le **même réseau local**,
**sans Internet** : tops (GO), lecture/pause, paramètres, OSC/Art-Net/sACN/MIDI via le poste, retour d'état.

## Lancer le poste de régie
| Cas | Commande | État |
|---|---|---|
| Application desktop (macOS/Windows/Linux) | ouvrir l'application | code prêt (`electron/main.cjs`) ; **actif dans les builds après application de** `docs/ci/electron-regie-bridge.patch` |
| Sans application desktop (Node ≥ 18) | `node bridge/nocode-host.mjs` depuis le dossier de l'application | TESTÉ |
| Ce poste seulement (aucun appareil distant) | `node bridge/nocode-host.mjs --local` | TESTÉ |

Le terminal affiche l'adresse du Designer (`http://127.0.0.1:4174/desktop/?surface=designer`) : l'ouvrir sur le poste.
Servi par le pont, le Designer **devient l'hôte tout seul** (aucun paramètre à ajouter).

> La PWA publique (github.io) ne peut pas être l'hôte : le navigateur interdit à une page Internet de parler
> au réseau local (Local Network Access). C'est le pont qui sert alors l'application en local.

## Piloter No[co]de depuis QLab, Chataigne, TouchDesigner, Millumin… (OSC, 3.3.18)
Le pont écoute l'**OSC UDP sur le port 9010** et sert l'**OSCQuery** (découverte des adresses) sur le **même numéro en TCP**.
| Adresse OSC | Effet |
|---|---|
| `/nocode/transport/play` · `pause` · `stop` · `toggle` | lecture du Designer (un argument `0` = relâchement, ignoré) |
| `/nocode/cue/go` | top suivant de la conduite (comme GO du Companion) |
| `/nocode/widget/<id> [valeur]` | bouton du layout Companion du poste |
| `/nocode/node/<id>/<param> <valeur>` | paramètre existant d'un node (jamais créé s'il n'existe pas) |

- OSCQuery : dans Chataigne / vvvv / ossia score / TouchDesigner (composant OSCQuery), saisir `http://<ip-du-poste>:9010/` ;
  `?HOST_INFO` donne le port OSC. L'arbre suit le projet ouvert dans le Designer.
- Sans Designer ouvert, les commandes sont **refusées** (journal du pont), jamais exécutées à moitié.
- Options : `--osc-port 9020`, `--no-osc`, `--osc-allow 192.168.1.20,192.168.1.21` (OSC n'a pas de mot de passe : limiter au réseau de régie).
- Non encore fait : annonce mDNS `_oscjson._tcp` (saisir l'adresse à la main), abonnement WebSocket `LISTEN`.

## Appairer un téléphone
1. Designer → Préférences → **Carte hôte / QR** : QR code + code d'appairage (6 caractères) + appareils connectés.
2. Scanner le QR avec le téléphone (même Wi-Fi / réseau de régie). Le Companion s'ouvre et **se connecte seul**.
3. Passer en mode **Test** ou **Plateau** pour que les boutons envoient des commandes.

Sans QR : ouvrir `http://<ip-du-poste>:4174/studio/`, saisir le code. Le téléphone mémorise le poste et le code.

## Sécurité (réseau de spectacle)
- Tout appareil autre que le poste doit présenter le **code d'appairage** (fichiers et WebSocket) ; 8 essais/min max par adresse.
- Seul le poste lui-même peut être l'**hôte** ; une page d'un autre site ne peut pas ouvrir le canal (contrôle d'Origin).
- Le code change à chaque lancement (sauf `--pair CODE`) ; **Nouveau code** déconnecte tous les appareils distants.
- Le code est retiré de la barre d'adresse du téléphone après connexion.
- Les liaisons des boutons sont celles **du poste** : le téléphone n'envoie qu'un identifiant de bouton.

## Fiabilité
- Wi-Fi coupé, régie redémarrée, téléphone en veille : **reconnexion automatique** (0,5 s → 8 s max), aucune action.
- Designer fermé puis rouvert : le téléphone est prévenu puis reprend seul.
- Sans hôte, une commande échoue **explicitement** (« Régie absente ») : jamais de faux succès.
- Code refusé : arrêt des tentatives et message « rescanne le QR ».

## Preuves
- `node qa/regie-bridge-qa.mjs` — 32 vérifications (appairage, refus, hôte réservé, Origin, relais, battement, reprise).
- `qa/companion-roundtrip-e2e.mjs` — Chrome réel, téléphone arrivant par l'IP LAN : QR → connexion auto, PING aller-retour,
  LECTURE démarre réellement le moteur du Designer, GO sans conduite = échec explicite, perte/retour du Designer,
  redémarrage du pont, mauvais code = 401 (20/20).
- `node qa/electron-main-qa.mjs` — logique du main desktop avec Electron simulé (7/7) : pont sur 0.0.0.0, port suivant si 4174 pris.

- `qa/osc-control-qa.mjs` (30/30) et `qa/osc-designer-e2e.mjs` (13/13) : OSC UDP réel → Designer réel (lecture, pause, paramètre
  appliqué, conservé après rechargement), OSCQuery conforme, téléphone incapable de forger une liaison, `--osc-allow`.

## Limites (non testé)
- Téléphones physiques Android / iPhone : non testés (Chrome mobile émulé seulement).
- QLab, Chataigne, TouchDesigner réels envoyant de l'OSC au pont : non testés (paquets OSC conformes envoyés par le test).
- Application desktop Electron réelle avec le pont : non lancée (binaire Electron indisponible dans l'environnement de test).
- Découverte automatique sans QR (mDNS/UDP) : pas dans le navigateur du téléphone ; le QR reste la voie principale.
- Pare-feu macOS / Windows : au premier lancement, autoriser les connexions entrantes, sinon les téléphones ne voient pas le poste.
- Caméra du téléphone via Companion : HTTPS requis par les navigateurs mobiles ; reste sur la Remote Camera (PeerJS, Internet).
