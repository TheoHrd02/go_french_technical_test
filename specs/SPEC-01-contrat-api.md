# SPEC-01 — Contrat d'API

**Statut :** obligatoire
**Source :** Partie 1, points 1 et 3 de l'énoncé

## Objectif
Exposer un endpoint HTTP unique qui reçoit une demande de génération de quiz et retourne une réponse strictement conforme au `ReponseSchema` imposé.

## Périmètre
Route, validation d'entrée, codes de statut, forme de la réponse et des erreurs. La génération elle-même est traitée dans SPEC-02 et SPEC-03.

## Exigences

| ID | Exigence |
|---|---|
| EXI-01.1 | `POST /quiz`, `Content-Type: application/json`. |
| EXI-01.2 | Entrée : `sujet` (string, non vide après trim, ≤ 200 caractères), `niveau` (`facile` \| `moyen` \| `difficile`), `nombre_questions` (entier, 1 à 10 inclus). |
| EXI-01.3 | Validation d'entrée par Zod. Un corps invalide renvoie `400` **sans aucun appel LLM**. |
| EXI-01.4 | Réponse `200` conforme à `ReponseSchema` : `{ sujet, niveau, questions[] }`, chaque question `{ question, options[4], bonne_reponse (0-3), explication }`. |
| EXI-01.5 | Les schémas sont déclarés en `.strict()` : un champ supplémentaire produit par le LLM est un échec, pas un silence. |
| EXI-01.6 | Échec de génération après 3 tentatives → `502` avec un corps `{ error, code, tentatives, cause }` explicite. |
| EXI-01.7 | Format d'erreur unique et documenté pour tous les codes (`400`, `502`, `500`). |
| EXI-01.8 | Route `GET /health` → `200 { status: "ok" }`, pour prouver que le service tourne sans consommer de crédits API. |

## Critères d'acceptation
- `POST /quiz` avec `{ "sujet": "géographie mondiale", "niveau": "moyen", "nombre_questions": 3 }` retourne `200` et `ReponseSchema.parse(body)` ne lève pas.
- `nombre_questions: 42` → `400`, corps listant l'erreur de validation, aucun appel au SDK LLM (vérifiable par mock).
- `niveau: "expert"` → `400`.
- `sujet: "   "` → `400`.

## Décisions à justifier en entretien
- **Express plutôt que Cloudflare Workers** : l'énoncé laisse le choix ; Express est le plus rapide à tester localement et l'exercice n'a aucune contrainte d'edge/latence géographique. Un Worker aurait du sens si la charge était mondiale et le runtime court — ce n'est pas le cas ici.
- **`502` plutôt que `500`** pour l'échec LLM : la panne vient d'un service amont, l'information est utile au client.

## Hors périmètre
Authentification, rate limiting, pagination, persistance. À mentionner comme limites assumées dans le README (SPEC-07).
