import { LLMContentError } from "./llm.js";

/** Echec de generation apres epuisement des tentatives. Jamais un `throw` de string. */
export class QuizGenerationError extends Error {
  constructor(
    message: string,
    readonly tentatives: number,
    readonly lastCause: string,
    readonly validationErrors: string[] = [],
  ) {
    super(message);
    this.name = "QuizGenerationError";
  }
}

export type ErrorKind =
  /** Sortie inexploitable : relance avec un prompt corrige. */
  | "SCHEMA"
  /** Panne passagere cote fournisseur : relance avec backoff. */
  | "TRANSIENT"
  /** Cle invalide, droits insuffisants, requete refusee : relancer ne changera rien. */
  | "FATAL";

/**
 * Classification avant decision. Relancer un 401 trois fois ne fait que
 * tripler la latence d'un echec certain.
 */
export function classifyError(error: unknown): ErrorKind {
  if (error instanceof LLMContentError) return "SCHEMA";

  const status = readStatus(error);
  if (status !== undefined) {
    if (status === 429 || status >= 500) return "TRANSIENT";
    if (status === 401 || status === 403 || status === 400) return "FATAL";
    return "FATAL";
  }

  const name = error instanceof Error ? error.name : "";
  if (
    name === "AbortError" ||
    name === "TimeoutError" ||
    name === "APIConnectionError" ||
    name === "APIConnectionTimeoutError"
  ) {
    return "TRANSIENT";
  }

  return "SCHEMA";
}

function readStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

/** Backoff exponentiel avec jitter : 2^n * 500 ms, +/- 25 %. */
export function backoffDelayMs(attempt: number, base = 500): number {
  const exponential = 2 ** (attempt - 1) * base;
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exponential + jitter);
}

export function describeCause(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
