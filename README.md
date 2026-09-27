# Code Vibe Designer V0.5

Structure prête pour développement desktop + mobile sur la même branche.

## Lancer
```bash
./LANCER-Code-Vibe-Designer.command
```

Desktop :
`http://127.0.0.1:4173/desktop/`

Mobile :
`http://127.0.0.1:4173/mobile/`

Pour tester le mobile sur le Mac, ouvre la seconde URL et active l'émulation téléphone dans les DevTools.
Pour les capteurs réels, ouvrir l'interface mobile sur un téléphone via un serveur HTTPS/réseau de développement adapté.


## V0.6 — routage par piste
Chaque piste/layer peut maintenant rester sur OUTPUT principal, sortir uniquement vers une destination, ou être copiée vers plusieurs sorties. Voir `docs/ROUTING.md`.

## V0.7 — intégrations réelles
Le cœur partagé intègre maintenant Web MIDI, Web Serial, WebSocket bridge, paquets OSC/Art-Net via bridge, shader WebGL et filtrage OUTPUT par destination. Voir `docs/PATCHER_AUDIT.md`.
