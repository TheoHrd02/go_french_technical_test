import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config } from "./config.js";
import { ReponseSchema } from "./schemas.js";

/** Sortie du LLM inexploitable (contenu vide, tronque, non extractible). */
export class LLMContentError extends Error {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "LLMContentError";
  }
}

const TOOL_NAME = "livrer_quiz";

/**
 * Le format de sortie est contraint nativement par l'API via `tool_use` :
 * le schema JSON est derive de `ReponseSchema`, donc il ne peut pas diverger
 * du contrat de validation. Le prompt seul ne fait pas foi.
 */
function buildToolSchema(): Record<string, unknown> {
  const { $schema, ...jsonSchema } = z.toJSONSchema(ReponseSchema, {
    target: "draft-7",
    io: "output",
  }) as Record<string, unknown> & { $schema?: string };
  return jsonSchema;
}

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Budget de sortie dimensionne sur le nombre de questions : une troncature
 * silencieuse est la premiere cause de JSON invalide.
 */
export function computeMaxTokens(nombreQuestions: number): number {
  return Math.min(8192, 600 + nombreQuestions * 450);
}

export interface LLMCallParams {
  systemPrompt: string;
  userPrompt: string;
  nombreQuestions: number;
}

export interface LLMCallResult {
  /** Contenu textuel brut, non parse : le parsing est fait par l'appelant, sous try/catch. */
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Un seul appel pour les N questions. Boucler N appels multiplierait
 * le cout et la latence par N pour un gain de qualite marginal.
 */
export async function callLLM({
  systemPrompt,
  userPrompt,
  nombreQuestions,
}: LLMCallParams): Promise<LLMCallResult> {
  const message = await getClient().messages.create(
    {
      model: config.MODEL,
      max_tokens: computeMaxTokens(nombreQuestions),
      temperature: config.LLM_TEMPERATURE,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [
        {
          name: TOOL_NAME,
          description: `Livre le lot complet de ${nombreQuestions} question(s) a choix multiples.`,
          input_schema: buildToolSchema() as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
    },
    { signal: AbortSignal.timeout(config.REQUEST_TIMEOUT_MS) },
  );

  return {
    rawContent: extractContent(message),
    usage: {
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
    },
  };
}

/**
 * Extraction defensive : le SDK peut renvoyer un `content` vide, une reponse
 * tronquee (`stop_reason: "max_tokens"`), ou du texte libre encadre de fences
 * markdown si le modele ignore l'outil.
 */
export function extractContent(message: {
  content?: unknown;
  stop_reason?: string | null;
}): string {
  const blocks = Array.isArray(message.content) ? message.content : [];

  if (blocks.length === 0) {
    throw new LLMContentError("Le LLM a renvoye un contenu vide");
  }

  const toolBlock = blocks.find(
    (block): block is { type: "tool_use"; input: unknown } =>
      isRecord(block) && block.type === "tool_use" && block.input !== undefined,
  );

  if (toolBlock) {
    if (message.stop_reason === "max_tokens") {
      throw new LLMContentError(
        "Reponse tronquee par max_tokens : l'appel d'outil est incomplet",
        truncate(JSON.stringify(toolBlock.input)),
      );
    }
    return JSON.stringify(toolBlock.input);
  }

  // Repli : le modele a repondu en texte au lieu d'utiliser l'outil.
  const text = blocks
    .filter(
      (block): block is { type: "text"; text: string } =>
        isRecord(block) && block.type === "text" && typeof block.text === "string",
    )
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) {
    throw new LLMContentError("Aucun contenu exploitable dans la reponse du LLM");
  }

  return stripMarkdownFences(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function stripMarkdownFences(text: string): string {
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/.exec(text.trim());
  return fenced?.[1]?.trim() ?? text.trim();
}

export function truncate(text: string, max = 500): string {
  return text.length <= max ? text : `${text.slice(0, max)}… [tronque]`;
}
