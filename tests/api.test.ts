import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = { create: mockCreate };
  },
}));

const { createApp } = await import("../src/server.js");
const { ReponseSchema } = await import("../src/schemas.js");
const { loadFixture, loadJsonFixture, mockLLMResponses, textMessage, toolUseMessage } =
  await import("./helpers/mockLlm.js");

const app = createApp();

beforeEach(() => {
  mockCreate.mockReset();
});

describe("POST /quiz", () => {
  it("cas nominal : 200 et corps conforme a ReponseSchema", async () => {
    mockLLMResponses(mockCreate, [toolUseMessage(loadJsonFixture("valid-response.json"))]);

    const response = await request(app)
      .post("/quiz")
      .send({ sujet: "géographie mondiale", niveau: "moyen", nombre_questions: 3 });

    expect(response.status).toBe(200);
    expect(ReponseSchema.safeParse(response.body).success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("nombre_questions: 42 -> 400 et aucun appel LLM", async () => {
    const response = await request(app)
      .post("/quiz")
      .send({ sujet: "géographie mondiale", niveau: "moyen", nombre_questions: 42 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(mockCreate).toHaveBeenCalledTimes(0);
  });

  it("niveau inconnu -> 400 et aucun appel LLM", async () => {
    const response = await request(app)
      .post("/quiz")
      .send({ sujet: "géographie mondiale", niveau: "expert", nombre_questions: 3 });

    expect(response.status).toBe(400);
    expect(mockCreate).toHaveBeenCalledTimes(0);
  });

  it("sujet vide apres trim -> 400 et aucun appel LLM", async () => {
    const response = await request(app)
      .post("/quiz")
      .send({ sujet: "   ", niveau: "moyen", nombre_questions: 3 });

    expect(response.status).toBe(400);
    expect(mockCreate).toHaveBeenCalledTimes(0);
  });

  it("trois sorties malformees -> 502 avec tentatives et cause", async () => {
    mockLLMResponses(mockCreate, [
      textMessage(loadFixture("malformed-json.txt")),
      textMessage(loadFixture("malformed-json.txt")),
      textMessage(loadFixture("malformed-json.txt")),
    ]);

    const response = await request(app)
      .post("/quiz")
      .send({ sujet: "géographie mondiale", niveau: "moyen", nombre_questions: 3 });

    expect(response.status).toBe(502);
    expect(response.body.code).toBe("LLM_GENERATION_FAILED");
    expect(response.body.tentatives).toBe(3);
    expect(response.body.cause).toBeTruthy();
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});

describe("GET /health", () => {
  it("repond 200 sans consommer de credits API", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(mockCreate).toHaveBeenCalledTimes(0);
  });
});
