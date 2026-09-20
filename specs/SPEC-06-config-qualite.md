# SPEC-06 — Configuration et qualité de code

**Statut :** obligatoire implicite
**Source :** critères d'évaluation (« rigueur »)

## Exigences

| ID | Exigence |
|---|---|
| EXI-06.1 | `.env.example` versionné, `.env` dans `.gitignore`. Aucune clé API dans l'historique Git — un secret commité puis supprimé reste dans l'historique. |
| EXI-06.2 | Variables : `ANTHROPIC_API_KEY` (ou `OPENAI_API_KEY`), `MODEL`, `MAX_RETRIES`, `REQUEST_TIMEOUT_MS`, `PORT`. |
| EXI-06.3 | Validation de la configuration au démarrage (schéma Zod sur `process.env`) : le service refuse de démarrer si une variable requise manque, plutôt que d'échouer à la première requête. |
| EXI-06.4 | TypeScript en `strict: true`. Aucun `any` aux frontières (entrée HTTP, sortie LLM) — c'est exactement le défaut du `Promise<any>` de la Partie 2. |
| EXI-06.5 | Logs structurés (JSON) : `requestId`, numéro de tentative, cause d'échec, latence, tokens consommés si disponibles. |
| EXI-06.6 | Aucun log de la clé API ni du contenu intégral des réponses LLM en production. |
| EXI-06.7 | Découpage en modules : `schemas.ts`, `prompt.ts`, `llm.ts`, `generator.ts`, `server.ts`, `config.ts`. La logique de génération est testable sans démarrer le serveur HTTP. |

## Critères d'acceptation
- `npx tsc --noEmit` → 0 erreur.
- Démarrage sans `ANTHROPIC_API_KEY` → message d'erreur explicite immédiat, pas de crash au premier appel.
- `git log -p | grep -i "sk-"` → aucun résultat.
