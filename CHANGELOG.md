# Changelog

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
