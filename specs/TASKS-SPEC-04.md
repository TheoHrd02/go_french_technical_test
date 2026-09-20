# Tâches — SPEC-04 Validation métier

**Budget :** 10 min · **Sacrifiable en priorité** si le timebox déborde

| ID | Tâche | Détail | Est. | Priorité |
|---|---|---|---|---|
| T-04.1 | Contrôle du cardinal | `questions.length === nombre_questions` | 2 min | **Haute** |
| T-04.2 | Normalisation serveur | Écraser `sujet` et `niveau` de la réponse avec les valeurs de la requête | 2 min | **Haute** |
| T-04.3 | Options distinctes | `new Set(options.map(normalize)).size === 4` | 2 min | Moyenne |
| T-04.4 | Anti-doublon | Aucune question répétée dans le lot (comparaison normalisée) | 3 min | Moyenne |
| T-04.5 | Explication valide | Non vide et différente du texte de la question | 1 min | Basse |
| T-04.6 | Branchement retry | Les violations produisent des messages injectés dans le feedback de T-03.3 | 2 min | **Haute** |

## Definition of Done
- [ ] Une violation métier déclenche un retry, pas une réponse `200` dégradée
- [ ] Le motif précis figure dans le prompt de relance

## Si abandon
Ne pas laisser de code mort. Supprimer et écrire dans le README : *« Zod valide les types, pas la cohérence sémantique — un lot de 4 questions identiques passerait le schéma. Validations métier identifiées mais non implémentées dans le timebox : dédup, options distinctes. »* Une limite explicite et analysée vaut plus qu'une implémentation à moitié testée.
