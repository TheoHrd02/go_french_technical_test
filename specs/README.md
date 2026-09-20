# GoFrench — Test technique : specs et tâches

## Index


| Spec                                                               | Tâches                           | Statut      | Budget |
| ------------------------------------------------------------------ | -------------------------------- | ----------- | ------ |
| [SPEC-P2 — Analyse critique](SPEC-P2-analyse-code.md)        | [tâches](TASKS-SPEC-P2.md) | Obligatoire | 20 min |
| [SPEC-06 — Config et qualité](SPEC-06-config-qualite.md)     | [tâches](TASKS-SPEC-06.md) | Obligatoire | 12 min |
| [SPEC-02 — Intégration LLM](SPEC-02-integration-llm.md)      | [tâches](TASKS-SPEC-02.md) | Obligatoire | 25 min |
| [SPEC-03 — Validation et retry](SPEC-03-validation-retry.md) | [tâches](TASKS-SPEC-03.md) | Obligatoire | 20 min |
| [SPEC-01 — Contrat d'API](SPEC-01-contrat-api.md)            | [tâches](TASKS-SPEC-01.md) | Obligatoire | 15 min |
| [SPEC-05 — Tests](SPEC-05-tests.md)                          | [tâches](TASKS-SPEC-05.md) | Obligatoire | 25 min |
| [SPEC-04 — Validation métier](SPEC-04-validation-metier.md)  | [tâches](TASKS-SPEC-04.md) | Recommandé  | 10 min |
| [SPEC-07 — Livrable et README](SPEC-07-livrable.md)          |                                  | Obligatoire | 15 min |




## Ordre d'exécution

```
SPEC-P2  →  SPEC-06  →  SPEC-02  →  SPEC-03  →  SPEC-01  →  SPEC-05  →  SPEC-04  →  SPEC-07
(analyse)   (init)      (LLM)       (retry)     (API)       (tests)     (métier)    (README)
```



## Budget : le total dépasse le timebox

Somme des estimations : **142 min** pour un timebox annoncé de **120 min**. C'est délibéré — les estimations sont réalistes, pas optimistes. Deux leviers d'ajustement, dans cet ordre :

1. **SPEC-04 en entier (−10 min)** → documenter comme limite assumée dans le README.
2. **SPEC-02 : mapping de difficulté simplifié, extraction défensive minimale (−10 min)**.

Reste : 122 min. Ne pas rogner sur SPEC-P2, SPEC-05 (T-05.4/T-05.5) ni SPEC-07 — ce sont les éléments explicitement notés.

## Chemin critique absolu

Si tout déraille : `SPEC-P2` → `T-02.1` (schémas) → `T-02.4/5` (appel LLM) → `T-03.1/3` (retry) → `T-01.3` (route) → `T-05.4/5` (les 2 tests exigés) → `SPEC-07` (README).