import type { ZodError } from "zod";
import { config } from "./config.js";
import { backoffDelayMs, classifyError, describeCause, QuizGenerationError } from "./errors.js";
import { callLLM, truncate } from "./llm.js";
import { logger } from "./logger.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { ReponseSchema, type Niveau, type Reponse } from "./schemas.js";

export interface QuizRequest {
  sujet: string;
  niveau: Niveau;
  nombre_questions: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** `JSON.parse` n'est jamais appele nu : une sortie tronquee ne doit pas faire tomber le process. */
export function safeJsonParse(raw: string): Result<unknown> {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch (error) {
    return { ok: false, error: `JSON invalide : ${describeCause(error)}` };
  }
}

/** Erreurs Zod rendues lisibles pour un LLM : chemin + message, une par ligne. */
export function formatZodIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(racine)";
    return `${path} : ${issue.message}`;
  });
}

function buildFeedback(problemes: string[], rawContent: string | undefined): string {
  const lignes = problemes.map((probleme) => `- ${probleme}`).join("\n");
  const extrait = rawContent ? `\nExtrait de ta sortie rejetee :\n${truncate(rawContent)}` : "";
  return `${lignes}${extrait}`;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Boucle bornee a MAX_RETRIES. Le prompt de relance est ajuste avec les erreurs
 * de la tentative precedente : relancer un prompt identique ne fait que
 * rechantillonner la meme distribution, injecter l'erreur change le conditionnement.
 */
export async function generateQuiz(
  input: QuizRequest,
  options: { requestId?: string } = {},
): Promise<Reponse> {
  const { sujet, niveau, nombre_questions: nombreQuestions } = input;
  const systemPrompt = buildSystemPrompt();
  const requestId = options.requestId ?? "-";

  let feedback: string | undefined;
  let derniereCause = "aucune tentative effectuee";
  let dernieresErreurs: string[] = [];

  for (let tentative = 1; tentative <= config.MAX_RETRIES; tentative += 1) {
    const debut = Date.now();

    try {
      const { rawContent, usage } = await callLLM({
        systemPrompt,
        userPrompt: buildUserPrompt({
          sujet,
          niveau,
          nombreQuestions,
          ...(feedback === undefined ? {} : { feedback }),
        }),
        nombreQuestions,
      });

      const parsed = safeJsonParse(rawContent);
      if (!parsed.ok) {
        dernieresErreurs = [parsed.error];
        derniereCause = parsed.error;
        feedback = buildFeedback(dernieresErreurs, rawContent);
        logger.info("tentative rejetee", {
          requestId,
          tentative,
          cause: "JSON_INVALIDE",
          latenceMs: Date.now() - debut,
        });
        continue;
      }

      const valide = ReponseSchema.safeParse(parsed.value);
      if (!valide.success) {
        dernieresErreurs = formatZodIssues(valide.error);
        derniereCause = `schema invalide (${dernieresErreurs.length} erreur(s))`;
        feedback = buildFeedback(dernieresErreurs, rawContent);
        logger.info("tentative rejetee", {
          requestId,
          tentative,
          cause: "SCHEMA_INVALIDE",
          erreurs: dernieresErreurs,
          latenceMs: Date.now() - debut,
        });
        continue;
      }

      logger.info("quiz genere", {
        requestId,
        tentative,
        latenceMs: Date.now() - debut,
        tokensEntree: usage.inputTokens,
        tokensSortie: usage.outputTokens,
      });

      return valide.data;
    } catch (error) {
      const kind = classifyError(error);
      derniereCause = describeCause(error);

      logger.error("appel LLM en echec", {
        requestId,
        tentative,
        kind,
        cause: derniereCause,
        latenceMs: Date.now() - debut,
      });

      if (kind === "FATAL") {
        throw new QuizGenerationError(
          `Generation impossible : erreur non recuperable du fournisseur LLM`,
          tentative,
          derniereCause,
          dernieresErreurs,
        );
      }

      if (kind === "SCHEMA") {
        dernieresErreurs = [derniereCause];
        feedback = buildFeedback(dernieresErreurs, undefined);
        continue;
      }

      if (tentative < config.MAX_RETRIES) {
        await sleep(backoffDelayMs(tentative));
      }
    }
  }

  throw new QuizGenerationError(
    `Generation impossible apres ${config.MAX_RETRIES} tentatives`,
    config.MAX_RETRIES,
    derniereCause,
    dernieresErreurs,
  );
}
