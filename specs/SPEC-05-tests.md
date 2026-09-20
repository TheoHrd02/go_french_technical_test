# SPEC-05 — Tests automatisés

**Statut :** obligatoire — explicitement noté
**Source :** Partie 1, point 5

## Objectif
Prouver le comportement nominal **et** le comportement de retry, sans appel réseau réel.

## Exigences

| ID | Exigence |
|---|---|
| EXI-05.1 | Vitest. Aucun appel réseau : le SDK LLM est mocké (`vi.mock`), les tests passent sans clé API. |
| EXI-05.2 | **Test nominal** : mock valide → la réponse satisfait `ReponseSchema.safeParse().success === true`, et exactement 1 appel LLM. |
| EXI-05.3 | **Test retry** : 1ᵉʳ mock malformé, 2ᵉ valide → succès, exactement 2 appels, et le prompt du 2ᵉ appel contient le feedback d'erreur. |
| EXI-05.4 | **Test échec total** : 3 mocks malformés → erreur explicite, exactement 3 appels. |
| EXI-05.5 | **Test entrée invalide** : `nombre_questions: 42` → `400`, **0 appel LLM**. |
| EXI-05.6 | Les cas malformés couvrent plusieurs natures d'échec : JSON syntaxiquement invalide, champ manquant, mauvais type, `options` de longueur ≠ 4. |
| EXI-05.7 | `npm test` fonctionne sur un clone propre sans configuration préalable. |

## Fixtures à prévoir
- `valid-response.json` — 3 questions conformes.
- `malformed-json.txt` — JSON tronqué (simule `finish_reason: "length"`).
- `missing-field.json` — `explication` absente.
- `wrong-length.json` — 3 options au lieu de 4.

## Critère d'acceptation global
`git clone && npm i && npm test` → tous les tests verts, sans `.env`, sans réseau.

## Remarque
L'assertion sur le **nombre d'appels** est ce qui distingue un test de façade d'un test qui prouve réellement la logique de retry et le batching. C'est le point à mettre en avant dans le README.
