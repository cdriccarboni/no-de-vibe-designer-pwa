# No[co]de — IA vérifiable et synchronisation (14 octobre 2026)

## Ce que fait réellement le générateur

- Mode AUTO : tente une requête sur /api/ai/generate ; si le serveur ou le modèle ne répond pas, affiche clairement « PRESET PROCÉDURAL » et le motif du repli.
- Mode IA : exige une réponse utilisable. Il affiche une erreur au lieu d'inventer un résultat.
- Mode SANS IA : utilise les quatre scénarios procéduraux embarqués.
- Les résultats IA retournent un GLSL WebGL1 validé structurellement, un nom de modèle, et un graphe Shader → Vibe Out. Une prévisualisation et un test sur le matériel restent nécessaires.
- Ollama n'est plus utilisé par défaut. L'ancienne route est disponible uniquement avec NOCODE_ENABLE_LEGACY_OLLAMA=1.

## Connexion OmniRoute / Hermes

Dans **le serveur qui exécute No[co]de**, configurer :
- NOCODE_AI_BASE_URL = adresse d'une API HTTP OpenAI-compatible, généralement `http://127.0.0.1:<port>/v1` pour Hermes/OmniRoute local.
- NOCODE_AI_MODEL = identifiant réel retourné par le fournisseur, pas un ancien nom Qwen/Ollama.
- NOCODE_AI_API_KEY = jeton du serveur si nécessaire (variable locale secrète, jamais GitHub).

Les alias OMNIROUTE_BASE_URL, OMNIROUTE_MODEL et OMNIROUTE_API_KEY sont également reconnus.
Exemple uniquement pour un serveur local **déjà opérationnel** :
`NOCODE_AI_BASE_URL=http://127.0.0.1:18437/v1 NOCODE_AI_MODEL=mlx-community/Hermes-3-Llama-3.1-8B-4bit npm run dev`

La présence de variables d'environnement n'est **pas** une preuve de fonctionnement : seul un appel de génération valide le modèle.
L'application statique hébergée chez Google AI Studio ne peut pas appeler directement le `127.0.0.1` du Mac : elle doit utiliser un serveur de confiance disposant du modèle ou une API de génération distante protégée.
Ne jamais publier un service local sans authentification / contrôle d'accès.

## Vérifications

- `npm run lint`
- `npm run build`
- `node --import tsx --test src/services/aiGatewayValidation.test.mts`
- `node scripts/ai-gateway-smoke.mjs` (test avec faux modèle local, aucun secret et sans dépendre d'une disponibilité extérieure).

## GitHub est la référence

Les deux dépôts ne partagent pas automatiquement leurs modifications :
- `cdriccarboni/nocode-ai-expert` : Google AI Studio / laboratoire.
- `cdriccarboni/no-de-vibe-designer-pwa` : application No[co]de / scène.

Ce changement se trouve dans une branche dédiée de `nocode-ai-expert` et doit être intégré par PR. Le dépôt public PWA dispose déjà d'une copie du laboratoire sous `labs/ai-studio-scenographe` : sa mise à jour doit être contrôlée par comparaison des changements et PR dédiée.
Un `git remote` ou un bouton « Sync » ne signifie pas qu'un push-pull bidirectionnel automatique est opérationnel. Dans Google AI Studio, vérifier le dépôt et la branche active avant chaque pull et push.
La branche de travail `feat/pirates-stage-engine-live-stream-20261014` comporte des modifications locales : ne jamais la réinitialiser, fusionner ou supprimer sans sauvegarde et contrôle.
