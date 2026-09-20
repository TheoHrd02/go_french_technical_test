import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Le SDK LLM est mocke : les tests tournent sans cle reelle et sans reseau.
    env: {
      ANTHROPIC_API_KEY: "cle-de-test",
      MODEL: "modele-de-test",
      MAX_RETRIES: "3",
      REQUEST_TIMEOUT_MS: "5000",
      NODE_ENV: "test",
      LOG_LEVEL: "error",
    },
  },
});
