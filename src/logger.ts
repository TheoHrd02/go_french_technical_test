import { config } from "./config.js";

type Level = "debug" | "info" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, error: 30 };

/**
 * Logger JSON minimal. N'ecrit jamais la cle API ni le contenu integral
 * d'une reponse LLM : les appelants passent des extraits tronques.
 */
function emit(level: Level, message: string, fields: Record<string, unknown> = {}): void {
  if (ORDER[level] < ORDER[config.LOG_LEVEL]) return;

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...fields,
  });

  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => emit("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => emit("info", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => emit("error", message, fields),
};
