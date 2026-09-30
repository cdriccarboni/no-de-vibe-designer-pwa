# Google Play — No-de Vibe Designer 1.3.1

## Identité Android

- Package : `fr.acousmatic.nodevibedesigner`
- Version : `1.3.1`
- versionCode : `131`
- Target SDK : `36` (Android 16)
- Format Play : Android App Bundle (`.aab`)

## Secrets GitHub nécessaires

Ne jamais commiter la clé d'upload ni les mots de passe dans le dépôt.

- `PLAY_UPLOAD_KEYSTORE_B64` : keystore JKS d'upload Play encodé en base64.
- `PLAY_UPLOAD_STORE_PASSWORD` : mot de passe du keystore.
- `PLAY_UPLOAD_KEY_ALIAS` : alias de la clé.
- `PLAY_UPLOAD_KEY_PASSWORD` : mot de passe de la clé.
- `PLAY_SERVICE_ACCOUNT_JSON` : JSON du compte de service autorisé dans Play Console / Google Play Developer API.

Le workflow refuse une publication Play si l'un des éléments nécessaires est absent.

## Workflow

Fichier : `.github/workflows/android-build.yml`

En exécution normale sur `main`, le workflow construit et vérifie les paquets.

En lancement manuel :

1. choisir `publish_to_play = true` ;
2. choisir `internal`, `alpha` ou `beta` ;
3. l'AAB release est signé ;
4. la signature est vérifiée ;
5. l'AAB est envoyé à Google Play via l'API Android Publisher.

Le workflow n'offre volontairement pas de bouton `production` afin d'éviter une mise en production accidentelle. Le passage production reste une action explicite dans Play Console après validation du test interne.

## Éléments Play Console à compléter

Avant la première soumission publique :

- fiche Play Store : nom, courte description, description complète, icône, captures ;
- politique de confidentialité : https://cdriccarboni.github.io/no-de-vibe-designer-pwa/privacy/
- déclaration des annonces ;
- accès à l'application ;
- audience cible et contenu ;
- questionnaire de classification ;
- formulaire Sécurité des données ;
- pays/régions et tarification ;
- test interne puis examen de la version.

## Déclaration de données — base technique à vérifier dans Play Console

La version 1.3.1 est conçue local-first et n'intègre ni publicité ni analytics. Les fonctions caméra, micro, capteurs, WebRTC/WebSocket et IA optionnelle sont activées par l'utilisateur. Toute déclaration Play doit rester cohérente avec le comportement réel de la version soumise et être revue si des SDK ou services externes sont ajoutés.
