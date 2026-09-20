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

/**
 * Schema d'entree HTTP. Valide avant tout appel LLM : un corps invalide
 * ne doit consommer ni credit API ni latence.
 */
export const RequestSchema = z
  .object({
    sujet: z.string().trim().min(1, "sujet ne doit pas etre vide").max(200, "sujet limite a 200 caracteres"),
    niveau: z.enum(["facile", "moyen", "difficile"]),
    nombre_questions: z
      .number()
      .int("nombre_questions doit etre un entier")
      .min(1, "nombre_questions doit valoir au moins 1")
      .max(10, "nombre_questions ne peut pas depasser 10"),
  })
  .strict();

export type QuizRequestInput = z.infer<typeof RequestSchema>;
