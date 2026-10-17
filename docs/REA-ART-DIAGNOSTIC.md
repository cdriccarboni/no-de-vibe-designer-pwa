# REA ↔ ART : diagnostic et procédure de déblocage (17/10/2026)

Statut : **inspection Web d'ART NON réalisée**. Aucun résultat d'audit REA d'ART n'existe à ce jour.

## Constat (commandes exécutées sur le Mac, `rea-agents@2.4.0`)
| Élément | Observation |
|---|---|
| `doctor` (audit-wide) | `healthy: false` : Ghidra et Hopper absents (inutiles pour un audit Web) ; dérive d'enregistrement pour Claude Code, Cursor, Gemini CLI |
| Installation | unique, cache npx ; pas de binaire `rea` sur le PATH (usage via `npx -y rea-agents@2.4.0`) |
| Skill | version 23, alignée sur le catalogue (58 commandes CLI, 98 outils MCP) |
| Claude Desktop, Codex | enregistrement `aligned` |
| `setup --client claude_code --client cursor --client gemini_cli --dry-run` | `status: needs_human`, `plannedActions: []` : REA n'applique pas ces enregistrements sans approbation explicite de l'utilisateur (`--yes`) |
| Outils Web REA (`inspect-web-page`, `list-browser-targets`, `analyze-web-bundle`, `capture-web-screenshot`) | exigent un endpoint CDP loopback, `--allowed-origins`, `--approved` ; sans Chrome en débogage, aucune cible n'existe |
| Lancement d'un Chrome dédié depuis l'environnement de l'agent | **refusé** par le garde-fou de l'environnement ; non contourné |

## Procédure de déblocage (actions humaines, une fois)
1. Chrome dédié à l'audit (profil jetable, écoute loopback uniquement, aucune session personnelle) :
   `open -na "Google Chrome" --args --remote-debugging-port=9333 --remote-debugging-address=127.0.0.1 --user-data-dir=/tmp/rea-audit-chrome https://art.acousmatic-theatre.fr/`
2. Enregistrements manquants (sauvegarder d'abord `~/.claude.json`, `~/.cursor/mcp.json`, `~/.gemini/settings.json`) :
   `npx -y rea-agents@2.4.0 setup --client claude_code --client cursor --client gemini_cli --yes`
   puis redémarrer les clients. Les autres serveurs MCP ne sont pas supprimés par cette commande ; vérifier le diff après coup.
3. Lancer l'audit, périmètre minimal et lecture passive :
   `npx -y rea-agents@2.4.0 list-browser-targets http://127.0.0.1:9333 --allowed-origins '["https://art.acousmatic-theatre.fr"]' --approved`
   puis `inspect-web-page http://127.0.0.1:9333 <targetId> --allowed-origins '["https://art.acousmatic-theatre.fr"]' --approved --include-console-text --console-text-approved`
   (pas d'`--include-storage-keys` ni de corps JSON tant que le périmètre public n'est pas validé).
4. Fermer ce Chrome après l'audit. Ne jamais exposer le port 9333 hors boucle locale.

## Garanties
Aucune donnée réelle d'ART n'est modifiée (observation passive). Playwright/Firecrawl ne sont **pas** des preuves REA ; ils ne peuvent servir que de compléments clairement étiquetés.
