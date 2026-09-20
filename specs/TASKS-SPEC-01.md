# Tâches — SPEC-01 Contrat d'API

**Budget :** 15 min · **Dépend de :** SPEC-02 (schémas) pour T-01.2

| ID | Tâche | Détail | Est. | Dépend de |
|---|---|---|---|---|
| T-01.1 | Squelette Express | `server.ts`, middleware `express.json()` avec limite de taille, `GET /health` | 5 min | T-06.1 |
| T-01.2 | Schéma de requête | `RequestSchema` Zod : sujet trim + min 1 + max 200, niveau enum, nombre_questions int 1-10 | 3 min | T-02.1 |
| T-01.3 | Route `POST /quiz` | `safeParse` sur `req.body` → `400` si échec, sinon délégation à `generateQuiz()` | 4 min | T-03.1 |
| T-01.4 | Mapping des erreurs | `QuizGenerationError` → `502`, erreur Zod → `400`, reste → `500` ; format de corps unique | 3 min | T-03.4 |

## Definition of Done
- [ ] `curl` nominal → `200` conforme au schéma
- [ ] `nombre_questions: 42` → `400` et 0 appel LLM (vérifié en test)
- [ ] `niveau: "expert"` → `400`
- [ ] Aucun `any` sur `req.body`
