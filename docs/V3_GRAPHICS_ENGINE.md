# No-de Vibe Designer V3 — Graphics Engine

## Cible

V3 transforme No-de en moteur visuel temps réel spécialisé spectacle : obtenir très vite un résultat exploitable en installation, scénographie interactive, concert ou régie vidéo, sans recopier l'interface de TouchDesigner.

La règle UX est : **moteurs puissants derrière des SuperNodes simples**. Un nouvel effet n'ajoute pas automatiquement un panneau ni une rubrique.

## Architecture

### Backends

- WebGPU / WGSL : voie moderne pour compute, particules et traitements GPU.
- WebGL2 / GLSL : compatibilité GPU.
- CPU : fallback déterministe ; aucune fonctionnalité ne doit annoncer un succès si le backend requis n'existe pas.

Le registre V3 est dans `shared/graphics/engine-v3.js`.

### Familles de moteurs

- Texture / compositing
- Feedback
- Particules / points
- Corps / tracking
- Shader
- Mapping / sorties

Les moteurs existants restent réutilisés. V3 unifie leur exposition plutôt que de les dupliquer.

## SuperNodes

Les premiers presets V3 sont accessibles depuis Magic FX :

- Digital Curtain
- Living Shadow
- Feedback Dream
- Particle Field
- Quick Map

Ils restent de vrais nodes du patch et peuvent être repris finement.

## Quick Map téléphone

Le node `Mapping vidéo / Quick Map` accepte quatre coins normalisés dans l'ordre :

1. haut-gauche ;
2. haut-droite ;
3. bas-droite ;
4. bas-gauche.

Le moteur calcule une homographie réelle et applique un warp projectif. Le téléphone expose un pad 16:9 avec quatre poignées, micro-ajustements et envoi vers le Bureau distant. La calibration est stockée dans le projet ; elle n'est pas une donnée temporaire de l'interface.

Le protocole distant possède une opération `quick-map-set`. Si l'identifiant du node du téléphone ne correspond pas à celui de l'hôte, l'hôte utilise le premier node Mapping disponible.

## DoD V3

Une brique V3 n'est considérée disponible que si :

- elle produit réellement une valeur ou une image ;
- elle se sauvegarde/restaure avec le projet ;
- elle échoue explicitement lorsque le backend requis manque ;
- elle passe les tests Node et les checks syntaxiques ;
- elle est présente dans le build PWA ;
- elle ne crée pas un nouveau panneau permanent sans nécessité.

## Suite moteur

Les familles prévues pour approfondissement sont compute particles, feedback multi-pass, tracking GPU, 3D/PBR, mesh mapping multi-surfaces, edge blend, sorties natives et import de shaders/presets. Elles doivent s'appuyer sur le même registre plutôt que créer des mini-apps isolées.


## Image → Vibe

V3 accepte une photo ou un dessin comme référence dans la barre Vibe sans créer de panneau permanent.

L'analyse locale déterministe extrait notamment :

- palette dominante ;
- luminosité et contraste ;
- saturation ;
- densité de contours ;
- format / orientation.

L'utilisateur choisit ensuite `Auto`, `p5 / Canvas`, `GLSL`, `Particules` ou `SDF / Metaballs`. Le résultat initial est un vrai node exécutable ; l'analyse ne prétend pas reconnaître sémantiquement le contenu de l'image si aucun moteur vision n'est disponible.

Le prompt textuel reste libre : une image peut donc servir de direction visuelle tandis que l'utilisateur précise le comportement (« lent et organique », « réagit à la souris », etc.).

## Manuel novice-first

`docs/manual/index.html` commence par une régie simple en 10 minutes, puis introduit seulement les concepts nécessaires. Les détails de développement sont relégués en fin de guide. La DoD produit inclut désormais la capacité pour une personne novice de lancer une petite régie, tester ses cues, utiliser Quick Map et sauvegarder sans devoir comprendre toute l'architecture nodale.
