# Changelog

## 1.4.0 — 2026-09-30

### Companion / Plug & Play
- La détection Companion ouvre maintenant **Éditer ce Companion** dans une modale intégrée au Designer, sans nouveau panneau permanent.
- Le Plug & Play détecte passivement les caméras et affiche un résumé compact des périphériques déjà disponibles ou autorisés, sans demander de permission automatiquement.

### Shader Lab
- Double-clic sur un node Shader Lab ouvre un véritable éditeur GLSL.
- Compilation/validation avant application, raccourci Ctrl/Cmd+Entrée, reset vers le shader par défaut et cache des programmes WebGL par source.

### Distribution
- Version source, Desktop et Android alignée en 1.4.0.
- PWA 1.4.0 publiée et QA publique verte.
- Release `v1.4.0` publiée avec APK Android, build macOS ARM64, AAB de contrôle et checksums.
- Google Play reste le seul jalon externe : signature et publication sautées tant que les secrets Play ne sont pas configurés.


## 1.3.6 — 2026-09-30

### Finition discrète / états
- Conserve les triangles de dépliage/repliage de toute la Library à gauche, avec état mémorisé et zone de clic sur tout l’en-tête.
- Remplace les anciens intitulés ambigus par des états techniques non envahissants dans les infobulles : Prêt, matériel requis, permission requise, logiciel/bridge requis ou relais natif requis.
- Aucun nouveau panneau permanent : l’ergonomie Designer reste inchangée.
- Version alignée pour Desktop, PWA multi-surface, Companion et Android (versionCode 136).

## 1.3.1 — 2026-09-30

### PWA / UX
- Corrige la PWA qui ouvrait seulement l’interface mobile/Companion.
- Embarque Designer complet, Mobile, Régie, Plateau et Remote Camera dans la même PWA.
- Ajoute une bascule universelle persistante sur chaque surface.
- Permet d’utiliser un second ordinateur comme Régie/Plateau.
- Ajoute le routeur Auto : ordinateur → Designer, mobile/tablette → Mobile, sans verrouiller le choix.
- Service worker multi-surface `nvd-1.3.1-multi`.
- Android passe à `versionCode 131` / `versionName 1.3.1`.


## 1.3.0 — 2026-09-30

### Moteur
- 105/105 nodes de Library exécutables.
- Planner déterministe Vibe enrichi.
- Safety Engine indépendant avant preview et Apply.
- IA locale Ollama/Qwen prioritaire avec repli déterministe.
- Sécurité des sorties externes renforcée.

### Théâtre
- Présence / Interprète nommable.
- Zones jardin / centre / cour.
- Sorties scéniques nommables.
- Ombre Vivante : silhouette, miroir, décrochage, rattachement et autonomie.
- Compréhension de phrases de mise en scène en langage naturel.

### Visuel interactif
- Thread Curtain.
- Flow Field / particules.
- Reaction Diffusion.
- Ribbon Trails.
- Metaballs / SDF.
- Interactive Sand.
- Swarm / Boids.
- Ripple Field.
- Fluid Warp.
- Refraction / Glass.
- Point Cloud Depth.
- Depth/Silhouette Mask et Optical Flow.

### Companion / régie
- Pages Conduite / Son / Lumière / Vidéo / Plateau.
- Swipe horizontal tablette.
- Faders, toggles, momentary.
- Profils consoles/logicielles.
- Presets fonctionnels sobres.
- Art-Net + sACN/E1.31.
- Feedback réseau et synchronisation layout.

### ART → No-de
- Cycle Remote Camera/retour vidéo adapté de notre code ART.
- PeerJS/WebRTC direct, reconnexion, RTT et FIRST_FRAME→LIVE.
- NDI conservé comme relais natif honnête : pas de faux NDI navigateur.

### Validation
- Runtime QA public : success.
- GitHub Pages : success.
- APK Android 1.3.0 / code 130 vérifié par aapt + apksigner.
- Signature APK v2 valide.
- AAB non signé généré.

### Distribution
- Version desktop/PWA/Android alignée 1.3.0.
- Android versionCode 130.
- Gate production 105/105.
- CI PWA corrigée pour la syntaxe GitHub Actions des secrets.
