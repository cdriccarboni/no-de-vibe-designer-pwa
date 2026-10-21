# No[co]de Vibe Designer — public PWA

Built artifacts only. Source: private `no-de-vibe-designer`.

- Public URL: https://cdriccarboni.github.io/no-de-vibe-designer-pwa/
- Version: 3.3.23
- Régie réseau local (téléphone → Designer, sans Internet) : `node bridge/nocode-host.mjs`, voir `docs/REGIE-LAN.md`
- Reprise du travail entre agents : `docs/HANDOFF.md`

## Chat IA et fournisseurs

Préférences → **IA / Vibe** permet d’activer séparément les fournisseurs et de choisir une route pour le Planner, la génération de patch et la relecture.

- **Ollama** est détecté sur localhost ou le LAN par `/api/tags` ; le bouton « Installer Ollama (gratuit) » ouvre uniquement son site officiel.
- **Endpoint compatible OpenAI** accepte LM Studio, llama.cpp server, Hermes et LiteLLM ; No-de peut lister ses modèles via `/v1/models`.
- Dans Electron, les CLI locaux Codex, Claude et Gemini sont détectés sans shell ; ils démarrent dans un dossier temporaire et ont une limite de 120 secondes.
- Dans Electron, les clés OpenAI, Anthropic, Gemini et xAI / Grok sont chiffrées par le stockage système. Le renderer ne reçoit qu’un état « clé configurée ».
- La PWA ne propose que Ollama et l’endpoint HTTP compatible. Aucun CLI ni trousseau système n’y est exposé.

Toute réponse qui contient des opérations de graphe passe par le Safety Engine avant l’aperçu et l’application. Sans fournisseur activé, si un fournisseur échoue ou si sa réponse JSON est invalide, le Planner déterministe local reste le repli.
