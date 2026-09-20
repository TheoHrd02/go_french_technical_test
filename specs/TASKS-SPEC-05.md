# Tâches — SPEC-05 Tests

**Budget :** 25 min · **Dépend de :** SPEC-03

| ID | Tâche | Détail | Est. | Dépend de |
|---|---|---|---|---|
| T-05.1 | Setup Vitest | `vitest.config.ts`, script `npm test` | 3 min | T-06.1 |
| T-05.2 | Mock du SDK | `vi.mock()` du client LLM + helper `mockLLMResponses([...])` renvoyant les réponses dans l'ordre | 5 min | T-02.4 |
| T-05.3 | Fixtures | `valid-response.json`, `malformed-json.txt`, `missing-field.json`, `wrong-length.json` | 4 min | T-02.1 |
| T-05.4 | Test nominal | Mock valide → `safeParse().success === true` **et** `expect(mock).toHaveBeenCalledTimes(1)` | 4 min | T-05.2 |
| T-05.5 | Test retry | Malformé puis valide → succès, 2 appels, et le 2ᵉ prompt contient le feedback | 5 min | T-05.4 |
| T-05.6 | Test échec total | 3 malformés → `QuizGenerationError`, 3 appels | 3 min | T-05.5 |
| T-05.7 | Test entrée invalide | `nombre_questions: 42` → `400`, `toHaveBeenCalledTimes(0)` | 2 min | T-01.3 |

## Definition of Done
- [ ] `git clone && npm i && npm test` → vert, **sans `.env`, sans réseau**
- [ ] Chaque test assert le **nombre d'appels**, pas seulement le résultat
- [ ] Les cas malformés couvrent ≥ 3 natures d'échec distinctes

## Attention
T-05.4 et T-05.5 sont les deux tests explicitement exigés par l'énoncé. Ils ne sont pas sacrifiables. L'assertion sur le nombre d'appels est ce qui prouve le batching (SPEC-02) et le retry (SPEC-03) en même temps.
