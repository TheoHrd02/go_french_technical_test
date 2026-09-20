import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = { create: mockCreate };
  },
}));

const { generateQuiz } = await import("../src/generator.js");
const { mockLLMResponses, toolUseMessage, userPromptOfCall, validResponseOf } = await import(
  "./helpers/mockLlm.js"
);

const REQUETE = { sujet: "géographie mondiale", niveau: "moyen", nombre_questions: 5 } as const;

beforeEach(() => {
  mockCreate.mockReset();
});

describe("validation metier", () => {
  it("cardinal : 2 questions livrees pour 5 demandees -> relance", async () => {
    mockLLMResponses(mockCreate, [
      toolUseMessage(validResponseOf(2)),
      toolUseMessage(validResponseOf(5)),
    ]);

    const quiz = await generateQuiz({ ...REQUETE });

    expect(quiz.questions).toHaveLength(5);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(userPromptOfCall(mockCreate, 1)).toContain("nombre de questions");
  });

  it("options dupliquees dans une question -> relance", async () => {
    const lot = validResponseOf(5) as { questions: Array<{ options: string[] }> };
    lot.questions[0]!.options = ["Le Danube", "Le Rhin", "Le Danube", "La Vistule"];

    mockLLMResponses(mockCreate, [toolUseMessage(lot), toolUseMessage(validResponseOf(5))]);

    await generateQuiz({ ...REQUETE });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(userPromptOfCall(mockCreate, 1)).toContain("options doivent etre distinctes");
  });

  it("question repetee dans le lot -> relance", async () => {
    const lot = validResponseOf(5) as { questions: Array<{ question: string }> };
    lot.questions[3]!.question = lot.questions[0]!.question;

    mockLLMResponses(mockCreate, [toolUseMessage(lot), toolUseMessage(validResponseOf(5))]);

    await generateQuiz({ ...REQUETE });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(userPromptOfCall(mockCreate, 1)).toContain("chaque question doit etre unique");
  });

  it("explication vide -> relance", async () => {
    const lot = validResponseOf(5) as { questions: Array<{ explication: string }> };
    lot.questions[2]!.explication = "   ";

    mockLLMResponses(mockCreate, [toolUseMessage(lot), toolUseMessage(validResponseOf(5))]);

    await generateQuiz({ ...REQUETE });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(userPromptOfCall(mockCreate, 1)).toContain("explication ne doit pas etre vide");
  });

  it("sujet et niveau de la reponse sont imposes par le serveur", async () => {
    const lot = validResponseOf(5) as Record<string, unknown>;
    lot.sujet = "un sujet que le modele a invente";
    lot.niveau = "facile";

    mockLLMResponses(mockCreate, [toolUseMessage(lot)]);

    const quiz = await generateQuiz({ ...REQUETE });

    expect(quiz.sujet).toBe("géographie mondiale");
    expect(quiz.niveau).toBe("moyen");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
