import "dotenv/config";
import { z } from "zod";

/**
 * Schema de configuration : applique a `process.env` au demarrage du process.
 * Une variable requise manquante fait echouer le boot, pas la premiere requete.
 */
const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY est requise"),
  MODEL: z.string().min(1).default("claude-sonnet-4-5"),
  MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.7),
  LOG_LEVEL: z.enum(["debug", "info", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Config = z.infer<typeof EnvSchema>;

function loadConfig(): Config {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configuration invalide, le service ne peut pas demarrer :\n${details}\n` +
        `Copiez .env.example vers .env et renseignez les valeurs manquantes.`,
    );
  }

  return parsed.data;
}

export const config: Config = loadConfig();
