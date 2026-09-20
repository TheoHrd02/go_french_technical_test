# SPEC-04 — Validation métier au-delà du schéma

**Statut :** recommandé — différenciant, sacrifiable en cas de dépassement de timebox
**Source :** déduction, non explicitement demandé par l'énoncé

## Objectif
Zod valide des **types**, pas du **sens**. Un lot de 4 questions identiques avec 4 options identiques passe `ReponseSchema` sans broncher. Cette spec ferme l'écart.

## Exigences

| ID | Exigence |
|---|---|
| EXI-04.1 | `questions.length === nombre_questions` demandé. Un LLM livre régulièrement 8 questions quand on en demande 10. |
| EXI-04.2 | Les 4 options d'une question sont distinctes (comparaison normalisée : trim + casse). |
| EXI-04.3 | Aucun doublon de question dans le lot (comparaison normalisée). |
| EXI-04.4 | `bonne_reponse` est un entier dans `[0, 3]` — déjà couvert par Zod, mais vérifier l'absence de `0.5` via `.int()`. |
| EXI-04.5 | `explication` non vide et distincte du texte de la question. |
| EXI-04.6 | `sujet` et `niveau` de la réponse sont **écrasés côté serveur** avec les valeurs de la requête. Ne pas faire confiance au LLM pour recopier fidèlement ses propres entrées. |
| EXI-04.7 | Toute violation ci-dessus est traitée comme un échec de validation → déclenche le retry de SPEC-03, avec le motif précis injecté dans le prompt. |

## Critères d'acceptation
- Mock retournant 2 questions alors que 5 étaient demandées → déclenche un retry.
- Mock retournant une question avec 4 options dont 2 identiques → déclenche un retry.
- Le `sujet` de la réponse est identique à celui de la requête même si le mock renvoie un sujet différent.

## Si le temps manque
Implémenter EXI-04.1 et EXI-04.6 (coût : ~4 lignes, valeur élevée), documenter les autres comme limites connues dans le README. Une limite identifiée et assumée vaut mieux qu'une implémentation partielle non testée.
