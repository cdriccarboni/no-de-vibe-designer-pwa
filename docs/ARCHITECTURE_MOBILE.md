# Architecture V0.5 — Desktop + Mobile

```text
No-de Vibe Designer
├── shared/
│   ├── ir.js
│   ├── node-specs.js
│   ├── runtime.js
│   └── mobile-sensors.js
├── desktop/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── output.html
├── mobile/
│   ├── index.html
│   ├── mobile.js
│   ├── mobile.css
│   └── README_ANDROID.md
└── LANCER-No-de-Vibe-Designer.command
```

Invariant :
**même moteur / mêmes projets / même logique Vibe → interfaces différentes selon la plateforme.**

Desktop reste la priorité immédiate.
Mobile réutilise le coeur commun mais possède son propre UX tactile.
