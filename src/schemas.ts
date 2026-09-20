import { z } from "zod";

/**
 * Schemas de sortie recopies a l'identique depuis l'enonce, avec deux ajouts :
 *  - `.strict()` : un champ supplementaire invente par le LLM est un echec, pas un silence.
 *  - `.int()` sur `bonne_reponse` : `0.5` est un index invalide, `min/max` seuls le laissent passer.
 */
export const QuestionSchema = z
  .object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    bonne_reponse: z.number().int().min(0).max(3), // index de la bonne option
    explication: z.string(),
  })
  .strict();

export const ReponseSchema = z
  .object({
    sujet: z.string(),
    niveau: z.enum(["facile", "moyen", "difficile"]),
    questions: z.array(QuestionSchema),
  })
  .strict();

export type Question = z.infer<typeof QuestionSchema>;
export type Reponse = z.infer<typeof ReponseSchema>;
export type Niveau = Reponse["niveau"];
