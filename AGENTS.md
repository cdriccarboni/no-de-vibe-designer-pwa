# No-de Vibe Designer — règles P0 de collaboration

Ces règles sont prioritaires pour tout agent ou assistant qui intervient sur ce dépôt.

## P0 — exécuter avant de déléguer

Quand une demande peut être réalisée directement avec les accès et outils disponibles, l'agent doit la réaliser :
- modifier le code ;
- tester ;
- committer ;
- pousser sur GitHub ;
- mettre à jour `main` lorsque cela fait partie de la mission ;
- publier la PWA ;
- produire les builds accessibles ;
- mettre à jour la documentation.

Ne pas renvoyer par défaut vers Cursor, Codex ou un terminal utilisateur si l'agent peut exécuter lui-même la tâche.

## P0 — annoncer clairement le niveau d'action

Pour toute solution proposée, indiquer explicitement une de ces catégories :

1. **Je peux le faire ici** — l'agent possède les accès/outils nécessaires et doit l'exécuter directement.
2. **Ton action est requise** — uniquement lorsqu'une authentification, un branchement physique, une validation humaine ou un accès local indisponible l'exige réellement.
3. **Option externe / payante** — expliquer le coût ou la dépendance avant de lancer une ressource susceptible d'être facturée.

## P0 — produit fini

L'objectif n'est pas de préparer des prompts pour d'autres outils mais d'amener No-de Vibe Designer jusqu'à un produit réellement exploitable en spectacle :
- moteurs réels ;
- UX sobre et terrain ;
- tests et diagnostics ;
- builds et distribution ;
- documentation synchronisée ;
- sécurité de scène ;
- aucune fonctionnalité annoncée comme disponible sans moteur réel.

## Philosophie produit

No-de Vibe Designer est un outil pour le spectacle vivant :
- discret ;
- rapide ;
- lisible ;
- beau sans surdesign ;
- orienté théâtre ;
- Companion utilisable par une petite équipe ou une régie solo ;
- vocabulaire de plateau privilégié quand il améliore la compréhension.

ART peut fournir du code éprouvé lorsque la brique est utile et stable, mais No-de ne doit pas absorber les fonctions administratives d'ART.

---

# Socle commun — méthode durable de développement

> Mémoire de travail commune aux agents (ChatGPT, Codex, Cursor et autres). Elle complète les règles spécifiques du dépôt ; la règle la plus spécifique au dépôt ou à la tâche explicite prime.

## Debug, TDD, vérification
- Pour tout bug/régression, utiliser `superpowers:systematic-debugging` si disponible, sinon appliquer la même discipline : reproduire, observer l'état réel, identifier la cause racine, formuler une hypothèse, corriger minimalement.
- Une fois la cause démontrée, utiliser `superpowers:test-driven-development` si disponible : test rouge → correctif minimal → test vert → non-régression.
- Avant d'annoncer DONE, utiliser `superpowers:verification-before-completion` si disponible, sinon vérifier réellement le résultat.
- Ne jamais changer un test uniquement pour masquer un comportement encore faux.

## État réel = source de vérité
Toujours inspecter avant mutation : code réellement présent, branche/HEAD, configuration active, données/projet/réseau réellement ouverts, version réellement servie/installée.
Un state, cache, spec, conversation ou artefact ancien ne doit jamais écraser silencieusement l'état live fiable.

## Créer ≠ modifier
- Création : une nouvelle scène/document/projet/export peut créer du neuf.
- Modification : une demande visant un existant doit modifier cet existant in-place quand c'est possible.
Ne jamais créer/ouvrir automatiquement une copie, reconstruire tout un projet pour un changement local, remplacer le fichier courant ou perdre les éléments non concernés.
Une prévisualisation autonome et une édition live peuvent coexister : ne pas casser l'une pour réparer l'autre.

## Changement minimal, préservation maximale
Rechercher d'abord les fonctions/composants existants, réutiliser les briques stables, éviter les systèmes concurrents et préserver données, IDs, packages, routes et comportements non concernés.
Une correction locale doit rester locale.

## Ne jamais inventer ce qui manque
Si une cible, node, donnée, fichier, API ou connexion indispensable manque : échouer clairement et expliquer ce qui manque.
Ne jamais substituer arbitrairement une autre ressource ni créer des defaults plausibles mais faux.

## Déterministe d'abord, IA ensuite
Une opération exacte et déterminable depuis l'état courant doit être exécutée directement.
Ne pas consommer plusieurs appels modèle pour renommer, reconnecter, insérer entre deux éléments identifiés, convertir un format connu ou appliquer une migration définie.
Utiliser l'IA pour l'ambiguïté, la conception ou la génération ouverte.

## Idempotence / anti-doublons
Une même commande rejouée ne doit pas dupliquer nodes, composants, fichiers, sorties, listeners, timers, callbacks ou migrations.
Toujours se demander : « que se passe-t-il si cette action est exécutée deux fois ? »

## Normaliser sans détruire
Accepter les variantes équivalentes utiles : casse, alias documentés, formes objet/liste compatibles, noms utilisateur vs nom canonique.
Normaliser à l'entrée vers un format interne unique.
Ne jamais recréer/détruire une ressource réelle uniquement pour une différence de casse ou de représentation.

## Git = mémoire commune
GitHub est le point de reprise entre agents et machines.
- vérifier branche, HEAD et état avant modification ;
- petits commits cohérents ;
- push régulier après une étape exploitable ;
- ne jamais laisser l'unique copie utile dans un workspace temporaire ;
- ne pas merger `main` sans instruction explicite ;
- ne pas créer une autre branche si une branche de travail est imposée.
Si quota/temps risque de couper : tests possibles → commit → push → note de reprise (SHA, état, reste, prochain fichier/fonction).

## Quotas / CI / builds
Ne pas brûler du quota en relançant une CI indisponible, en refaisant une analyse prouvée ou en déclenchant des builds lourds à chaque micro-commit.
Ordre préféré : tests ciblés → tests rapides → suite complète → build/release.
Runner absent, service externe indisponible ou Mac inaccessible = limite d'infrastructure, pas réussite ni bug applicatif.

## Builds et artefacts : preuve réelle
Vérifier version effective, HEAD correspondant, package/bundle ID, build/versionCode monotone si requis et artefact réellement ouvrable/installable.
Ne jamais republier une vieille build avec un nouveau nom.
Pour un téléchargement/export : vérifier le fichier réellement récupéré, non vide, bon format, ouvrable, contenu valide.

## PWA / Web / Mobile
Préserver navigation tactile, Safe Areas, scroll, fermeture/retour accessibles, petits écrans, clavier/souris quand pertinent, thème/accent existants.
Une version mobile ne doit pas être un simple desktop écrasé si l'usage terrain exige une adaptation.
Pour PWA : vérifier service worker/cache/version et distinguer code déployé d'une ancienne version servie par cache ; documenter offline vs Internet requis.

## Android
Si Android est ciblé : conserver applicationId/package, versionCode monotone, distinguer APK test et AAB publication, vérifier l'installation réelle quand possible.
Ne jamais dire « release Android terminée » si seul le web/PWA a bougé.

## macOS
Si macOS est ciblé : ne pas supposer notarisation/App Store obligatoires si la distribution prévue est ad-hoc ; documenter les permissions système ; ne pas prétendre avoir testé une GUI macOS depuis un environnement Linux/cloud incapable de la lancer.

## UX et feedback
Travail en cours, succès et erreur doivent être visuellement distincts.
Succès seulement après validation réelle.
Éviter animations permanentes coûteuses, pop-ups impossibles à fermer, menus hors écran, scroll bloqué et contrôles sans issue.
Même interaction = même composant/logique autant que possible.

## Intégrations externes
Ne jamais inventer endpoint, commande, port, protocole ou compatibilité.
Vérifier la documentation officielle actuelle lorsque nécessaire.
Isoler les intégrations dans des adapters/services.

## Autonomie du produit livré
Cursor, Codex, Copilot et autres assistants peuvent aider au développement.
Le produit livré ne doit pas dépendre d'eux pour ses fonctions normales, sauf intégration explicitement décidée.
Préférer local, standards ouverts, dépendances remplaçables et dégradation propre.

## Documentation = partie du produit
Quand un comportement change : mettre à jour manuel/README pertinent dans la même passe, retirer les descriptions fausses, conserver les parcours alternatifs encore supportés et documenter les limites réelles.
Une documentation obsolète est une régression.

## Fin de tâche
Fournir au minimum : cause racine si bug, fichiers réellement modifiés, tests réellement exécutés et résultat, SHA/branche poussés, limites non testées, prochain test manuel exact si nécessaire.
Ne jamais écrire « terminé/corrigé/publié/testé » sans preuve fraîche correspondante.

