# Synchronisation No[co]de / Google AI Studio

État au 14 octobre 2026 : les versions ne sont pas encore automatiquement synchronisées. Le laboratoire Google AI Studio est sur `cdriccarboni/nocode-ai-expert`, tandis que l'application PWA est sur `cdriccarboni/no-de-vibe-designer-pwa`. Ce sont des dépôts distincts. La PWA embarque une copie du laboratoire dans `labs/ai-studio-scenographe`.

Pour synchroniser les deux directions sans perte : comparer les changements des deux dépôts et les branches en cours, isoler les fichiers concernés dans une branche dédiée, exécuter les contrôles, puis ouvrir une PR vers le dépôt cible. Ne pas considérer une présence de didascalies comme une synchronisation automatique. Ne pas modifier la branche locale Pyrates qui contient des travaux non enregistrés.

Le Vibe Out peut désormais utiliser un endpoint local OpenAI-compatible explicitement configuré dans les préférences (par exemple un serveur Hermes / MLX déjà en écoute). Les anciens réglages Ollama/Qwen par défaut ne suffisent plus à déclarer une IA disponible.

Un endpoint externe n'est utilisé que s'il a été autorisé dans les préférences. Les erreurs de génération restent visibles et le secours structurel est explicitement identifié.
