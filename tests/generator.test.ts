import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

// Le SDK est mocke : aucun appel reseau, aucune cle reelle necessaire.
vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = { create: mockCreate };
  },
}));

const { QuizGenerationError } = await import("../src/errors.js");
const { generateQuiz } = await import("../src/generator.js");
const { ReponseSchema } = await import("../src/schemas.js");
const {
  loadFixture,
  loadJsonFixture,
  mockLLMResponses,
  textMessage,
  toolUseMessage,
  userPromptOfCall,
  validResponseOf,
} = await import("./helpers/mockLlm.js");

const REQUETE = { sujet: "géographie mondiale", niveau: "moyen", nombre_questions: 3 } as const;

describe("generateQuiz", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("cas nominal : reponse conforme au schema en un seul appel", async () => {
    mockLLMResponses(mockCreate, [toolUseMessage(loadJsonFixture("valid-response.json"))]);

    const quiz = await generateQuiz({ ...REQUETE });

    expect(ReponseSchema.safeParse(quiz).success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("genere 10 questions en un seul appel, pas dix", async () => {
    mockLLMResponses(mockCreate, [toolUseMessage(validResponseOf(10))]);

    await generateQuiz({ ...REQUETE, nombre_questions: 10 });

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("injecte la consigne de difficulte du niveau demande dans le prompt", async () => {
    mockLLMResponses(mockCreate, [toolUseMessage(loadJsonFixture("valid-response.json"))]);

    await generateQuiz({ ...REQUETE, niveau: "difficile" });

    expect(userPromptOfCall(mockCreate, 0)).toContain("Niveau DIFFICILE");
  });

  it("retry : sortie malformee puis valide -> succes en deux appels, le second prompt porte le feedback", async () => {
    mockLLMResponses(mockCreate, [
      textMessage(loadFixture("malformed-json.txt")),
      toolUseMessage(loadJsonFixture("valid-response.json")),
    ]);

    const quiz = await generateQuiz({ ...REQUETE });

    expect(ReponseSchema.safeParse(quiz).success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    const premierPrompt = userPromptOfCall(mockCreate, 0);
    const secondPrompt = userPromptOfCall(mockCreate, 1);
    expect(secondPrompt).not.toBe(premierPrompt);
    expect(secondPrompt).toContain("JSON invalide");
    expect(secondPrompt).toContain("Extrait de ta sortie rejetee");
  });

  it("retry : champ manquant -> le prompt de relance cite l'erreur Zod", async () => {
    mockLLMResponses(mockCreate, [
      toolUseMessage(loadJsonFixture("missing-field.json")),
      toolUseMessage(loadJsonFixture("valid-response.json")),
    ]);

    await generateQuiz({ ...REQUETE });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(userPromptOfCall(mockCreate, 1)).toContain("explication");
  });

  it("retry : options de longueur 3 -> relance", async () => {
    mockLLMResponses(mockCreate, [
      toolUseMessage(loadJsonFixture("wrong-length.json")),
      toolUseMessage(loadJsonFixture("valid-response.json")),
    ]);

    await generateQuiz({ ...REQUETE });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(userPromptOfCall(mockCreate, 1)).toContain("options");
  });

  it("retry : mauvais type sur bonne_reponse -> relance", async () => {
    mockLLMResponses(mockCreate, [
      toolUseMessage(loadJsonFixture("wrong-type.json")),
      toolUseMessage(loadJsonFixture("valid-response.json")),
    ]);

    await generateQuiz({ ...REQUETE });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(userPromptOfCall(mockCreate, 1)).toContain("bonne_reponse");
  });

  it("echec total : trois sorties malformees -> erreur explicite en exactement trois appels", async () => {
    mockLLMResponses(mockCreate, [
      textMessage(loadFixture("malformed-json.txt")),
      toolUseMessage(loadJsonFixture("missing-field.json")),
      toolUseMessage(loadJsonFixture("wrong-length.json")),
    ]);

    await expect(generateQuiz({ ...REQUETE })).rejects.toThrow(QuizGenerationError);
    expect(mockCreate).toHaveBeenCalledTimes(3);

    mockLLMResponses(mockCreate, [
      textMessage(loadFixture("malformed-json.txt")),
      toolUseMessage(loadJsonFixture("missing-field.json")),
      toolUseMessage(loadJsonFixture("wrong-length.json")),
    ]);

    const erreur = await generateQuiz({ ...REQUETE }).catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(QuizGenerationError);
    const quizErreur = erreur as InstanceType<typeof QuizGenerationError>;
    expect(quizErreur.tentatives).toBe(3);
    expect(quizErreur.validationErrors.length).toBeGreaterThan(0);
  });

  it("erreur fatale 401 : aucun retry", async () => {
    const unauthorized = Object.assign(new Error("Unauthorized"), { status: 401 });
    mockLLMResponses(mockCreate, [unauthorized, unauthorized, unauthorized]);

    await expect(generateQuiz({ ...REQUETE })).rejects.toThrow(QuizGenerationError);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("erreur passagere 429 : relance puis succes", async () => {
    mockLLMResponses(mockCreate, [
      Object.assign(new Error("Rate limited"), { status: 429 }),
      toolUseMessage(loadJsonFixture("valid-response.json")),
    ]);

    const quiz = await generateQuiz({ ...REQUETE });

    expect(ReponseSchema.safeParse(quiz).success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("content null renvoye par le modele : ne fait pas crasher, declenche une relance", async () => {
    mockLLMResponses(mockCreate, [
      { id: "msg_test", stop_reason: "end_turn", content: null },
      toolUseMessage(loadJsonFixture("valid-response.json")),
    ]);

    const quiz = await generateQuiz({ ...REQUETE });

    expect(ReponseSchema.safeParse(quiz).success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
