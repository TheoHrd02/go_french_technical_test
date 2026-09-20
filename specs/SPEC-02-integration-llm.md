# SPEC-02 — Intégration LLM

**Statut :** obligatoire
**Source :** Partie 1, point 2

## Objectif
Obtenir du LLM les N questions en **un seul appel**, avec un format de sortie contraint nativement par l'API plutôt qu'espéré via le texte du prompt.

## Exigences

| ID | Exigence |
|---|---|
| EXI-02.1 | Un appel LLM génère les `nombre_questions` questions. Interdiction de boucler N appels (c'est précisément le défaut P2 de la Partie 2). |
| EXI-02.2 | Sortie contrainte par le mécanisme natif du fournisseur : `tool_use` / JSON schema côté Anthropic, `response_format: { type: "json_schema", strict: true }` côté OpenAI. Le prompt seul ne fait pas foi. |
| EXI-02.3 | Prompt système (rôle, règles de format, contraintes qualité) séparé du prompt utilisateur (sujet, niveau, nombre). |
| EXI-02.4 | Mapping explicite `niveau` → consignes concrètes. Sans cela, « moyen » et « facile » produisent des sorties quasi identiques : le paramètre de difficulté devient décoratif. |
| EXI-02.5 | `max_tokens` dimensionné en fonction de `nombre_questions` ; une troncature silencieuse est la première cause de JSON invalide. |
| EXI-02.6 | Timeout par appel (~30 s) via `AbortSignal`. |
| EXI-02.7 | Modèle, température et fournisseur lus depuis l'environnement, jamais codés en dur. |
| EXI-02.8 | Extraction du contenu défensive : gérer `content` vide/`null`, `finish_reason: "length"`, et les fences ```` ```json ```` si le mode non structuré est utilisé en repli. |

## Mapping de difficulté (proposition)

| Niveau | Consigne injectée |
|---|---|
| `facile` | Connaissances générales, réponse évidente pour un adulte non spécialiste, distracteurs clairement faux. |
| `moyen` | Demande une connaissance précise du domaine ; au moins un distracteur plausible. |
| `difficile` | Cas limites, confusions classiques du domaine ; tous les distracteurs plausibles pour un non-expert. |

## Critères d'acceptation
- Un test avec SDK mocké prouve qu'une requête à 10 questions déclenche **exactement 1** appel.
- Le prompt envoyé contient la consigne de difficulté correspondant au `niveau` demandé (assertion sur le mock).
- Aucune clé API ni nom de modèle en dur dans le code source.

## Incertitude assumée
Le batch unique peut, sur certains modèles, dégrader légèrement la qualité de la dernière question par rapport à N appels isolés. Arbitrage retenu : 10× le coût et la latence n'est pas justifiable pour ce gain marginal. À documenter dans le README plutôt qu'à masquer.
