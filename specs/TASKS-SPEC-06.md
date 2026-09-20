# Tâches — SPEC-06 Config et qualité

**Budget :** 12 min · **À faire en premier** (T-06.1 bloque presque tout)

| ID | Tâche | Détail | Est. | Dépend de |
|---|---|---|---|---|
| T-06.1 | Init projet | `npm init`, TS `strict`, Vitest, Zod, SDK LLM, Express, `tsx` | 6 min | — |
| T-06.2 | `config.ts` | Schéma Zod sur `process.env`, parsé au démarrage, échec explicite si variable manquante | 4 min | T-06.1 |
| T-06.3 | `.env.example` + `.gitignore` | `.env` ignoré **avant** le premier commit | 1 min | T-06.1 |
| T-06.4 | Logs | Logger minimal JSON : `requestId`, tentative, cause, latence. Pas de clé, pas de payload complet | 3 min | T-06.2 |
| T-06.5 | Vérif finale | `npx tsc --noEmit` → 0 erreur ; `git log -p \| grep -i "sk-"` → vide | 2 min | tout |

## Definition of Done
- [ ] Démarrage sans clé API → message clair immédiat, pas de crash différé
- [ ] `tsc --noEmit` propre
- [ ] Aucun secret dans l'historique Git

## Attention
T-06.3 avant le premier commit. Un `.env` commité puis supprimé reste dans l'historique et se voit lors de la revue.
