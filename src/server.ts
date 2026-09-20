import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { config } from "./config.js";
import { QuizGenerationError } from "./errors.js";
import { generateQuiz } from "./generator.js";
import { logger } from "./logger.js";
import { RequestSchema } from "./schemas.js";

/**
 * Format d'erreur unique pour tous les codes : le client n'a qu'une seule
 * forme a savoir lire.
 */
interface ErrorBody {
  error: string;
  code: string;
  details?: string[];
  tentatives?: number;
  cause?: string;
}

export function createApp(): express.Express {
  const app = express();

  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.post("/quiz", async (req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const parsed = RequestSchema.safeParse(req.body);

    if (!parsed.success) {
      // Aucun appel LLM n'a ete declenche a ce stade.
      const details = parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`,
      );
      logger.info("requete rejetee", { requestId, cause: "VALIDATION_ENTREE", details });
      const body: ErrorBody = { error: "Requete invalide", code: "VALIDATION_ERROR", details };
      res.status(400).json(body);
      return;
    }

    try {
      const quiz = await generateQuiz(parsed.data, { requestId });
      res.status(200).json(quiz);
    } catch (error) {
      next(error);
    }
  });

  app.use(errorHandler);

  return app;
}

function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // Le fournisseur LLM est un service amont : l'information est utile au client.
  if (error instanceof QuizGenerationError) {
    const body: ErrorBody = {
      error: error.message,
      code: "LLM_GENERATION_FAILED",
      tentatives: error.tentatives,
      cause: error.lastCause,
      ...(error.validationErrors.length > 0 ? { details: error.validationErrors } : {}),
    };
    res.status(502).json(body);
    return;
  }

  if (error instanceof ZodError) {
    const body: ErrorBody = {
      error: "Requete invalide",
      code: "VALIDATION_ERROR",
      details: error.issues.map((issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`),
    };
    res.status(400).json(body);
    return;
  }

  // Corps JSON illisible : erreur de l'appelant, pas du service.
  if (isJsonSyntaxError(error)) {
    const body: ErrorBody = {
      error: "Corps de requete JSON invalide",
      code: "VALIDATION_ERROR",
    };
    res.status(400).json(body);
    return;
  }

  logger.error("erreur interne", {
    cause: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  });
  const body: ErrorBody = { error: "Erreur interne du service", code: "INTERNAL_ERROR" };
  res.status(500).json(body);
}

function isJsonSyntaxError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    "status" in error &&
    (error as { status?: unknown }).status === 400
  );
}

export function startServer(): void {
  createApp().listen(config.PORT, () => {
    logger.info("service demarre", { port: config.PORT, model: config.MODEL });
  });
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  startServer();
}
