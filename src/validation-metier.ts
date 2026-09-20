import type { Niveau, Reponse } from "./schemas.js";

/** Comparaison insensible a la casse et aux espaces de bord. */
function normaliser(texte: string): string {
  return texte.trim().toLowerCase();
}

/**
 * Le LLM n'est pas une source fiable pour recopier ses propres entrees :
 * `sujet` et `niveau` sont reecrits cote serveur avec les valeurs de la requete.
 */
export function normaliserReponse(
  reponse: Reponse,
  requete: { sujet: string; niveau: Niveau },
): Reponse {
  return { ...reponse, sujet: requete.sujet, niveau: requete.niveau };
}

/**
 * Zod valide des types, pas du sens : un lot de 4 questions identiques
 * traverse `ReponseSchema` sans broncher. Ces regles ferment l'ecart.
 * Retourne la liste des violations, vide si tout est conforme.
 */
export function validerCoherence(reponse: Reponse, nombreQuestionsAttendu: number): string[] {
  const violations: string[] = [];

  if (reponse.questions.length !== nombreQuestionsAttendu) {
    violations.push(
      `nombre de questions : ${reponse.questions.length} livree(s) alors que ${nombreQuestionsAttendu} etaient demandees`,
    );
  }

  const questionsVues = new Map<string, number>();

  reponse.questions.forEach((question, index) => {
    const repere = `question ${index + 1}`;

    const optionsDistinctes = new Set(question.options.map(normaliser));
    if (optionsDistinctes.size !== question.options.length) {
      violations.push(`${repere} : les 4 options doivent etre distinctes les unes des autres`);
    }

    const cle = normaliser(question.question);
    const premiereOccurrence = questionsVues.get(cle);
    if (premiereOccurrence !== undefined) {
      violations.push(
        `${repere} : enonce deja utilise a la question ${premiereOccurrence + 1}, chaque question doit etre unique`,
      );
    } else {
      questionsVues.set(cle, index);
    }

    if (normaliser(question.explication).length === 0) {
      violations.push(`${repere} : l'explication ne doit pas etre vide`);
    } else if (normaliser(question.explication) === cle) {
      violations.push(`${repere} : l'explication ne doit pas recopier l'enonce de la question`);
    }
  });

  return violations;
}
