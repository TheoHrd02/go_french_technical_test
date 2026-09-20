# SPEC-07 — Livrable et README

**Statut :** obligatoire — pondération forte
**Source :** « Livrable » Partie 1 + « Comment nous évaluons »

## Rappel du critère d'évaluation
> « La qualité du raisonnement compte plus que la complétude du code. »
> « Nous discuterons de vos choix en entretien — préparez-vous à expliquer en détail pourquoi. »

Le README n'est pas de la documentation d'accompagnement : c'est une pièce évaluée au même titre que le code.

## Exigences

| ID | Exigence |
|---|---|
| EXI-07.1 | Dépôt Git (public temporaire ou zip), historique de commits lisible — pas un unique commit « init ». |
| EXI-07.2 | README : installation et lancement en 3 commandes maximum. |
| EXI-07.3 | README : section **Choix techniques**, chaque choix accompagné de son alternative écartée et du motif (Express vs Workers, batch vs N appels, structured output vs prompt, retry avec feedback vs retry aveugle). |
| EXI-07.4 | README : section **Limites assumées** — ce qui n'est pas fait et pourquoi (pas d'auth, pas de rate limiting, pas de cache, validations métier partielles si c'est le cas). |
| EXI-07.5 | README : section **Partie 2** avec les 3 problèmes de conception et leur correction (voir SPEC-P2). |
| EXI-07.6 | README : mention de la répartition du travail — travail individuel à préciser explicitement, l'énoncé le demande. |
| EXI-07.7 | Respect du timebox : indiquer le temps réellement passé. Cela rend les limites assumées crédibles au lieu de les faire passer pour des oublis. |

## Critères d'acceptation
- Un lecteur qui ne connaît pas le projet le lance en moins de 5 minutes.
- Chaque choix non trivial du code a une justification écrite correspondante.
- Envoi à `lea@gofrench-academy.com` dans les 3 jours suivant la réception.
