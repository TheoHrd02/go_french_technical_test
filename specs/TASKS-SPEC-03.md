# Tâches — SPEC-03 Validation et retry

**Budget :** 20 min · **Cœur de l'évaluation** · **Dépend de :** SPEC-02

| ID | Tâche | Détail | Est. | Dépend de |
|---|---|---|---|---|
| T-03.1 | `generateQuiz()` | Signature `(input: QuizRequest) => Promise<Reponse>`, boucle `for` bornée à `MAX_RETRIES` | 5 min | T-02.5 |
| T-03.2 | Parsing protégé | `safeJsonParse()` : try/catch, retourne un `Result` plutôt que de lever | 3 min | T-02.6 |
| T-03.3 | Feedback d'erreur | `formatZodIssues(error)` → texte lisible (chemin + message), injecté dans le prompt de relance avec un extrait tronqué (≤ 500 car.) de la sortie fautive | 5 min | T-02.3 |
| T-03.4 | Classification | `classifyError()` : `SCHEMA` → retry prompt ajusté ; `TRANSIENT` (429/5xx/timeout) → retry + backoff `2^n * 500ms` + jitter ; `FATAL` (401/403) → sortie immédiate | 5 min | — |
| T-03.5 | Erreur finale | `QuizGenerationError` avec `tentatives`, `lastCause`, `validationErrors` | 2 min | T-03.4 |

## Definition of Done
- [ ] Max 3 appels, jamais plus, en aucune circonstance
- [ ] Le prompt de relance **diffère** du prompt initial et contient les erreurs Zod
- [ ] Un `401` ne déclenche aucun retry
- [ ] Aucune sortie ne quitte la fonction sans `safeParse` réussi

## Attention
Le point que l'entretien va creuser : *pourquoi un retry avec feedback plutôt qu'un retry aveugle ?* Réponse à préparer — relancer un prompt identique ne fait qu'échantillonner à nouveau la même distribution ; injecter l'erreur change le conditionnement et transforme la relance en correction.
