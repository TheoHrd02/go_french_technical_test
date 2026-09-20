# Tâches — SPEC-02 Intégration LLM

**Budget :** 25 min · **Bloque :** SPEC-03

| ID | Tâche | Détail | Est. | Dépend de |
|---|---|---|---|---|
| T-02.1 | `schemas.ts` | `QuestionSchema` et `ReponseSchema` recopiés **à l'identique** depuis l'énoncé, puis `.strict()` et `.int()` ajoutés | 5 min | — |
| T-02.2 | Mapping difficulté | `prompt.ts` : `Record<Niveau, string>` avec les consignes concrètes par niveau | 5 min | — |
| T-02.3 | Construction des prompts | `buildSystemPrompt()` et `buildUserPrompt({ sujet, niveau, n })`, signature acceptant un paramètre optionnel `feedback` pour le retry | 5 min | T-02.2 |
| T-02.4 | Client LLM | `llm.ts` : instanciation depuis la config, `AbortSignal.timeout()`, `max_tokens` calculé depuis `n` | 5 min | T-06.2 |
| T-02.5 | Sortie structurée | `tool_use` (Anthropic) ou `json_schema` (OpenAI) dérivé de `ReponseSchema` | 5 min | T-02.1, T-02.4 |
| T-02.6 | Extraction défensive | Gestion `content` vide/`null`, `finish_reason: "length"`, strip des fences markdown en repli | 3 min | T-02.5 |

## Definition of Done
- [ ] Une requête de 10 questions = **1 seul** appel LLM (assertion de test)
- [ ] Le prompt contient la consigne de difficulté du niveau demandé
- [ ] Aucun modèle ni clé en dur dans le code
- [ ] Un `content: null` renvoyé par le mock ne fait pas crasher le process

## Attention
T-02.1 : recopier les schémas de l'énoncé **sans les reformuler**. Renommer un champ (`bonne_reponse` → `correctAnswer`) invalide le livrable.
