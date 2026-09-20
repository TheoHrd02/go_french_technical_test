import type { Niveau } from "./schemas.js";

/**
 * Mapping explicite niveau -> consigne concrete.
 * Sans cela, « facile » et « moyen » produisent des sorties quasi identiques :
 * le parametre de difficulte devient decoratif.
 */
export const CONSIGNES_DIFFICULTE: Record<Niveau, string> = {
  facile:
    "Niveau FACILE : connaissances generales, la bonne reponse doit etre evidente pour un adulte non specialiste du sujet. Les trois distracteurs sont clairement faux.",
  moyen:
    "Niveau MOYEN : la question demande une connaissance precise du domaine. Au moins un distracteur est plausible et demande un vrai choix.",
  difficile:
    "Niveau DIFFICILE : cas limites, exceptions et confusions classiques du domaine. Les trois distracteurs sont tous plausibles pour un non-expert.",
};

export function buildSystemPrompt(): string {
  return [
    "Tu es un concepteur de questions a choix multiples pour une plateforme pedagogique francophone.",
    "",
    "Regles de format, sans exception :",
    "- Tu reponds uniquement via l'outil fourni, jamais en texte libre.",
    "- Chaque question a exactement 4 options.",
    "- `bonne_reponse` est l'index entier (0 a 3) de la bonne option dans le tableau `options`.",
    "- `explication` justifie la bonne reponse en une a trois phrases, et ne repete pas l'enonce de la question.",
    "",
    "Regles de qualite :",
    "- Les 4 options d'une question sont distinctes entre elles.",
    "- Aucune question n'est repetee dans le lot.",
    "- Une seule option est defendable comme correcte.",
    "- Tout est redige en francais.",
  ].join("\n");
}

export interface UserPromptInput {
  sujet: string;
  niveau: Niveau;
  nombreQuestions: number;
  /** Erreurs de la tentative precedente, injectees pour transformer la relance en correction. */
  feedback?: string;
}

export function buildUserPrompt({
  sujet,
  niveau,
  nombreQuestions,
  feedback,
}: UserPromptInput): string {
  const sections = [
    `Genere exactement ${nombreQuestions} question(s) a choix multiples sur le sujet : « ${sujet} ».`,
    CONSIGNES_DIFFICULTE[niveau],
    `Le champ « sujet » de ta reponse vaut exactement « ${sujet} » et le champ « niveau » vaut exactement « ${niveau} ».`,
  ];

  if (feedback) {
    sections.push(
      [
        "ATTENTION — ta tentative precedente a ete rejetee par la validation.",
        "Corrige precisement les points suivants :",
        feedback,
        "Reprends la generation complete en respectant ces corrections.",
      ].join("\n"),
    );
  }

  return sections.join("\n\n");
}
