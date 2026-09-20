# SPEC-03 — Validation de sortie et logique de retry

**Statut :** obligatoire — cœur de l'évaluation
**Source :** Partie 1, point 4

## Objectif
Garantir qu'aucune donnée non conforme ne sort de l'endpoint, et relancer intelligemment le LLM quand sa sortie est invalide.

## Pipeline imposé
```
appel LLM
  → extraction du contenu textuel (défensive)
  → JSON.parse protégé (try/catch, jamais nu)
  → schema.safeParse
  → validations métier (SPEC-04)
  → succès | échec qualifié → retry
```

## Exigences

| ID | Exigence |
|---|---|
| EXI-03.1 | Maximum 3 tentatives au total (1 initiale + 2 relances), valeur configurable. |
| EXI-03.2 | Le prompt de relance est **ajusté** : il inclut les erreurs Zod formatées depuis `error.issues` (chemin + message) et un extrait tronqué de la sortie fautive. Relancer le prompt identique n'est pas un retry, c'est une loterie. |
| EXI-03.3 | Classification des erreurs avant décision : <br>• schéma / JSON invalide → retry avec prompt corrigé <br>• `429`, `5xx`, timeout, erreur réseau → retry avec backoff exponentiel + jitter <br>• `401`, `403`, `400` de l'API → **aucun retry**, échec immédiat. |
| EXI-03.4 | Échec après la dernière tentative → erreur typée (`QuizGenerationError`) portant le nombre de tentatives, la dernière cause et les erreurs de validation. Pas de `throw` de string. |
| EXI-03.5 | La réponse n'est jamais renvoyée au client sans avoir traversé `safeParse` avec succès. |

## Critères d'acceptation
- Mock : 1ʳᵉ réponse malformée, 2ᵉ valide → `200`, exactement 2 appels.
- Mock : 3 réponses malformées → `502`, exactement 3 appels, message citant les erreurs de validation.
- Assertion : le prompt du 2ᵉ appel contient un fragment des erreurs Zod du 1ᵉʳ.
- Mock `401` → 1 seul appel, pas de retry.

## Justification du choix
Le retry aveugle (même prompt, 3 fois) est la version naïve. Le retry avec feedback exploite le fait qu'un LLM corrige efficacement une sortie quand on lui montre précisément ce qui n'allait pas. C'est le point que l'entretien va creuser.
