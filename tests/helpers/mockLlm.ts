import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Mock } from "vitest";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");

export function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf8");
}

export function loadJsonFixture(name: string): unknown {
  return JSON.parse(loadFixture(name)) as unknown;
}

/** Reponse structuree du modele : le contenu arrive dans un bloc `tool_use`. */
export function toolUseMessage(input: unknown): Record<string, unknown> {
  return {
    id: "msg_test",
    stop_reason: "tool_use",
    content: [{ type: "tool_use", id: "toolu_test", name: "livrer_quiz", input }],
    usage: { input_tokens: 120, output_tokens: 340 },
  };
}

/** Repli texte : utilise pour simuler une sortie non parsable. */
export function textMessage(text: string, stopReason = "end_turn"): Record<string, unknown> {
  return {
    id: "msg_test",
    stop_reason: stopReason,
    content: [{ type: "text", text }],
    usage: { input_tokens: 120, output_tokens: 340 },
  };
}

/**
 * Programme les reponses successives du SDK, dans l'ordre.
 * Une valeur `Error` est rejetee au lieu d'etre resolue.
 */
export function mockLLMResponses(mock: Mock, responses: Array<unknown | Error>): void {
  mock.mockReset();
  for (const response of responses) {
    if (response instanceof Error) mock.mockRejectedValueOnce(response);
    else mock.mockResolvedValueOnce(response);
  }
}

/** Texte du prompt utilisateur envoye lors de l'appel `index` (base 0). */
export function userPromptOfCall(mock: Mock, index: number): string {
  const body = mock.mock.calls[index]?.[0] as
    | { messages?: Array<{ content?: unknown }> }
    | undefined;
  const content = body?.messages?.[0]?.content;
  return typeof content === "string" ? content : "";
}
