# GoFrench — Générateur de QCM par LLM

Service HTTP qui génère des questions à choix multiples sur un sujet donné, à un niveau de difficulté paramétrable, avec validation stricte de la sortie du modèle et relance corrective en cas de sortie non conforme.

Node.js / TypeScript · Express · Zod · SDK Anthropic · Vitest

---

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseigner ANTHROPIC_API_KEY
npm start
```

Le service écoute sur `http://localhost:3000`.

Les tests ne nécessitent **ni clé API ni réseau** :

```bash
npm test
```

## API

### `POST /quiz`

```bash
curl -X POST http://localhost:3000/quiz \
  -H "Content-Type: application/json" \
  -d '{"sujet":"géographie mondiale","niveau":"moyen","nombre_questions":3}'
```

| Champ              | Type                                 | Contrainte             |
| ------------------ | ------------------------------------ | ---------------------- |
| `sujet`            | string                               | non vide, ≤ 200 car.   |
| `niveau`           | `facile` \| `moyen` \| `difficile`   | —                      |
| `nombre_questions` | number                               | entier, 1 à 10         |

Réponse `200`, conforme au `ReponseSchema` de l'énoncé :

```json
{
  "sujet": "géographie mondiale",
  "niveau": "moyen",
  "questions": [
    {
      "question": "Quel fleuve traverse la ville de Budapest ?",
      "options": ["Le Danube", "Le Rhin", "L'Elbe", "La Vistule"],
      "bonne_reponse": 0,
      "explication": "Le Danube coupe Budapest en deux, séparant Buda de Pest."
    }
  ]
}
```

### `GET /health`

`200 { "status": "ok" }` — vérifie que le service tourne sans consommer de crédits API.

### Erreurs

Format unique pour tous les codes :

```json
{ "error": "…", "code": "…", "details": ["…"], "tentatives": 3, "cause": "…" }
```

| Code HTTP | `code`                 | Cas                                                        |
| --------- | ---------------------- | ---------------------------------------------------------- |
| `400`     | `VALIDATION_ERROR`     | corps invalide — **aucun appel LLM déclenché**             |
| `502`     | `LLM_GENERATION_FAILED`| échec après 3 tentatives, avec `tentatives` et `cause`     |
| `500`     | `INTERNAL_ERROR`       | erreur interne non qualifiée                                |

## Architecture

```
src/
  config.ts             schéma Zod sur process.env, validé au démarrage
  schemas.ts            RequestSchema (entrée) + QuestionSchema / ReponseSchema (sortie)
  prompt.ts             prompt système, prompt utilisateur, mapping de difficulté
  llm.ts                appel Anthropic en tool_use, extraction défensive du contenu
  validation-metier.ts  contrôles de cohérence que Zod ne peut pas faire
  generator.ts          pipeline de validation et boucle de retry
  errors.ts             QuizGenerationError, classification, backoff
  server.ts             Express, routes, mapping des erreurs HTTP
  logger.ts             logs JSON
```

Pipeline de génération :

```
appel LLM → extraction du contenu → JSON.parse protégé → ReponseSchema.safeParse
          → validations métier → succès  |  échec qualifié → relance avec feedback
```

Aucune réponse ne quitte le service sans avoir traversé `safeParse` avec succès.

## Choix techniques

**Express plutôt que Cloudflare Workers.** L'exercice n'a aucune contrainte d'edge ni de latence géographique, et la génération LLM domine largement le temps de réponse. Express se teste localement sans tooling supplémentaire. Un Worker aurait du sens pour une charge mondiale avec un runtime court — ce n'est pas le cas ici.

**Un seul appel LLM pour les N questions, plutôt que N appels.** C'est exactement le défaut de la Partie 2 : boucler 10 appels multiplie le coût et la latence par 10. Contrepartie assumée : sur certains modèles, la qualité de la dernière question d'un gros lot peut être légèrement inférieure à celle d'un appel isolé. Le facteur 10 sur le coût ne justifie pas ce gain marginal.

**Sortie structurée (`tool_use`) plutôt qu'une consigne de format dans le prompt.** Le schéma JSON envoyé au modèle est **dérivé de `ReponseSchema`** (`z.toJSONSchema`) : le format contraint et le format validé ne peuvent pas diverger. Demander « réponds en JSON » dans le prompt, c'est espérer un format, pas l'imposer. La validation Zod reste en place malgré la contrainte native : elle est la seule garantie, le reste est une réduction de probabilité d'échec.

**Retry avec feedback plutôt que retry aveugle.** Relancer un prompt identique ne fait que rééchantillonner la même distribution — c'est une loterie, pas une correction. Le prompt de relance contient les erreurs Zod formatées (chemin + message) et un extrait tronqué à 500 caractères de la sortie rejetée. Injecter l'erreur change le conditionnement du modèle et transforme la relance en correction.

**Classification des erreurs avant relance.** Toutes les erreurs ne se valent pas : une sortie non conforme se relance avec un prompt corrigé, un `429` ou un `5xx` se relance avec un backoff exponentiel et du jitter, un `401` ou un `403` échoue immédiatement. Relancer trois fois une clé invalide ne fait que tripler la latence d'un échec certain.

**Validation métier en plus du schéma.** Zod valide des types, pas du sens : un lot de quatre questions identiques avec quatre options identiques traverse `ReponseSchema` sans broncher. Le cardinal du lot, l'unicité des options et des questions, et la validité de l'explication sont vérifiés séparément — et déclenchent une relance, pas une réponse `200` dégradée. `sujet` et `niveau` sont réécrits côté serveur : le modèle n'est pas une source fiable pour recopier ses propres entrées.

**`502` plutôt que `500` sur échec de génération.** La panne vient d'un service amont ; l'information est utile au client, qui peut décider de réessayer plus tard.

**Configuration validée au démarrage.** Un schéma Zod sur `process.env` fait échouer le boot si une variable requise manque, avec le nom du champ fautif, plutôt que d'échouer à la première requête en production.

**Assertions sur le nombre d'appels dans les tests.** `toHaveBeenCalledTimes(1)` sur le cas nominal prouve le batching ; `toHaveBeenCalledTimes(2)` sur le cas de relance prouve le retry ; `toHaveBeenCalledTimes(0)` sur une entrée invalide prouve qu'aucun crédit n'est consommé. Un test qui vérifie seulement la forme de la réponse ne prouve ni l'un ni l'autre.

## Partie 2 — Analyse du code fourni

### Problème 1 — La conformité de la sortie n'est jamais garantie

`Promise<any>`, `JSON.parse(...)` sans `try/catch`, et un format simplement demandé dans le prompt (« Réponds en JSON »). Trois conséquences : un modèle qui encadre sa réponse de ``` ```json ``` fait lever `JSON.parse` et tomber la requête ; une réponse tronquée produit la même chose ; et une réponse syntaxiquement valide mais sémantiquement fausse (3 options au lieu de 4, `bonne_reponse` hors bornes) remonte telle quelle jusqu'à l'appelant. `any` supprime le seul garde-fou qui restait, à la frontière la moins fiable du système.

**Correction appliquée :** format contraint nativement par l'API via `tool_use`, schéma dérivé de `ReponseSchema` ; extraction du contenu défensive ; `JSON.parse` encapsulé dans `safeJsonParse()` qui retourne un `Result` au lieu de lever ; `ReponseSchema.safeParse()` obligatoire avant tout retour ; type de retour `Promise<Reponse>`, jamais `any`.

### Problème 2 — Dix appels séquentiels là où un seul suffit

`genererDixQuestions` boucle avec `await` à l'intérieur : coût × 10, latence × 10 (dix allers-retours en série, soit plusieurs dizaines de secondes), dix fois plus d'occasions de tomber sur une erreur réseau. Le modèle ne voit jamais les questions déjà générées : rien n'empêche les doublons, qui sont le mode d'échec le plus courant de cette approche. Le nombre `10` est codé en dur, comme le modèle `"gpt-4"`.

**Correction appliquée :** un seul appel produit le lot complet, le modèle a donc l'ensemble en contexte et peut éviter les répétitions ; `nombre_questions` est un paramètre validé entre 1 et 10 ; `max_tokens` est dimensionné sur ce nombre pour éviter la troncature ; le modèle est lu depuis la configuration. Un contrôle anti-doublon reste en place côté serveur : le contexte partagé réduit le risque, il ne l'élimine pas.

### Problème 3 — Aucune robustesse face aux erreurs

Aucun `try/catch`, aucun retry, aucun timeout, aucune classification. `response.choices[0].message.content` déréférence trois niveaux dont chacun peut être `undefined` ou `null` — le SDK OpenAI type d'ailleurs `content` comme nullable. Un `429` pendant une campagne de génération fait échouer l'ensemble ; un appel qui ne répond jamais bloque la requête indéfiniment. La fonction ne distingue pas une panne passagère d'une clé invalide.

**Correction appliquée :** extraction défensive (`content` vide ou `null`, `stop_reason: "max_tokens"`, fences markdown en repli) ; `AbortSignal.timeout()` sur chaque appel ; boucle bornée à `MAX_RETRIES` ; `classifyError()` sépare `SCHEMA` (relance corrigée), `TRANSIENT` (relance avec backoff exponentiel et jitter) et `FATAL` (échec immédiat) ; échec final typé en `QuizGenerationError` portant le nombre de tentatives, la dernière cause et les erreurs de validation, mappé en `502`.

## Tests

22 tests, SDK mocké via `vi.mock`, aucun appel réseau, aucune clé requise.

| Couverture                                                   | Assertion clé                          |
| ------------------------------------------------------------ | -------------------------------------- |
| Cas nominal                                                   | `safeParse().success === true`, 1 appel |
| 10 questions demandées                                        | **1 appel**, pas 10                    |
| Relance sur JSON tronqué, champ manquant, mauvais type, `options` de longueur 3 | 2 appels, feedback dans le 2ᵉ prompt |
| Échec total                                                   | `QuizGenerationError`, **3 appels**    |
| `nombre_questions: 42`                                        | `400`, **0 appel**                     |
| `401` du fournisseur                                          | **1 appel**, aucune relance            |
| `429` du fournisseur                                          | relance, puis succès                   |
| `content: null`                                               | pas de crash, relance                  |
| Règles métier (cardinal, doublons, options, explication)      | relance avec motif précis              |

## Limites assumées

- **Pas d'authentification ni de rate limiting.** Hors périmètre de l'exercice, mais indispensable avant toute exposition publique : l'endpoint déclenche des appels payants.
- **Pas de cache.** Deux requêtes identiques paient deux fois. Un cache par `(sujet, niveau, nombre_questions)` serait le premier gain de coût à implémenter — au prix d'une perte de variété entre deux appels identiques.
- **Pas de persistance.** Les quiz générés ne sont pas stockés.
- **Pas de vérification factuelle des contenus.** Rien ne garantit que la bonne réponse désignée par le modèle est exacte. Les contrôles implémentés portent sur la structure et la cohérence, pas sur la véracité. C'est la limite principale du service en usage pédagogique réel.
- **Un seul fournisseur.** L'implémentation est liée à l'API Anthropic. Le passage à OpenAI demanderait une couche d'abstraction sur `llm.ts` — non faite, car une abstraction écrite pour un seul usage est généralement la mauvaise abstraction.
- **Backoff non testé.** La classification des erreurs est couverte, la temporisation exacte du backoff ne l'est pas : la tester demanderait des faux timers pour un gain faible dans le timebox.
- **Pas de streaming.** Une génération de 10 questions prend plusieurs secondes sans retour intermédiaire.

## Organisation et temps passé

**Travail individuel** — Theo Hrd, sur l'intégralité des parties 1 et 2.

Environ **2 h**, réparties ainsi :

| Phase                                                     | Temps    |
| --------------------------------------------------------- | -------- |
| Cadrage : lecture de l'énoncé, specs et découpage en tâches | ~25 min |
| Init projet, configuration, qualité (SPEC-06)              | ~10 min  |
| Intégration LLM (SPEC-02)                                  | ~25 min  |
| Validation et retry (SPEC-03)                              | ~20 min  |
| Contrat d'API (SPEC-01)                                    | ~15 min  |
| Tests (SPEC-05)                                            | ~20 min  |
| Validation métier (SPEC-04)                                | ~10 min  |
| README et analyse de la Partie 2 (SPEC-07)                 | ~15 min  |

Le découpage en spécifications et tâches est versionné dans [`specs/`](specs/README.md), et l'historique Git suit cet ordre : une branche et une pull request par spécification.

## Configuration

| Variable             | Défaut              | Rôle                                  |
| -------------------- | ------------------- | ------------------------------------- |
| `ANTHROPIC_API_KEY`  | — (**requise**)     | clé d'API                             |
| `MODEL`              | `claude-sonnet-4-5` | modèle utilisé                        |
| `MAX_RETRIES`        | `3`                 | tentatives au total (1 + 2 relances)  |
| `REQUEST_TIMEOUT_MS` | `30000`             | timeout par appel LLM                 |
| `PORT`               | `3000`              | port d'écoute                         |
| `LLM_TEMPERATURE`    | `0.7`               | température de génération             |
| `LOG_LEVEL`          | `info`              | `debug` \| `info` \| `error`          |

Le service refuse de démarrer si une variable requise manque, avec le détail des champs fautifs.
