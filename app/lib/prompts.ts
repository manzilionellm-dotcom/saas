import type { Business } from "./db/types";
import type { LLMRequest } from "./llm/provider";

// Templates de prompts versionnés par type de livrable (exigence évolutive n°1).
// Chaque génération enregistre la version utilisée, pour comparer les perfs (Phase 8).

export const PLATFORMS = ["TikTok", "Reels", "Shorts", "YouTube", "LinkedIn", "X", "Facebook"] as const;

export const KINDS = [
  { key: "hooks", label: "10 accroches (hooks)" },
  { key: "script", label: "Script vidéo" },
  { key: "post", label: "Post" },
  { key: "hashtags", label: "Hashtags" },
  { key: "seo_title", label: "Titres SEO" },
  { key: "ad_copy", label: "Texte publicitaire" },
] as const;

export type Kind = (typeof KINDS)[number]["key"];

// Version courante de chaque template.
export const PROMPT_VERSIONS: Record<Kind, string> = {
  hooks: "v1",
  script: "v1",
  post: "v1",
  hashtags: "v1",
  seo_title: "v1",
  ad_copy: "v1",
};

const USER_PROMPT: Record<Kind, (platform: string) => string> = {
  hooks: (p) => `Donne 10 accroches (hooks) percutantes et variées pour ${p}, une par ligne, numérotées 1 à 10. Pas d'explication.`,
  script: (p) => `Écris un script vidéo court (30-45s) pour ${p}, structuré : [HOOK], [CORPS], [CTA]. Concis et rythmé.`,
  post: (p) => `Écris un post complet et engageant pour ${p}, prêt à publier, avec un CTA à la fin.`,
  hashtags: (p) => `Donne 20 hashtags pertinents pour ${p}, séparés par des espaces, sans numéro.`,
  seo_title: () => `Donne 5 titres optimisés SEO, percutants, numérotés 1 à 5.`,
  ad_copy: (p) => `Écris un texte publicitaire court et persuasif pour ${p}, avec accroche, bénéfice clé et CTA.`,
};

export function isKind(v: string): v is Kind {
  return v in PROMPT_VERSIONS;
}

// Construit la requête LLM complète à partir du profil business + brand voice + locale.
export function buildGenerationRequest(
  business: Business,
  platform: string,
  kind: Kind,
  locale: string,
): { request: LLMRequest; promptVersion: string } {
  const system =
    `Tu es un expert du contenu qui convertit sur ${platform}. ` +
    `Tu écris pour « ${business.name} » (${business.businessType}, ${business.country}). ` +
    `Cible : ${business.targetCustomer}. Objectif : ${business.mainGoal}. ` +
    (business.brandVoice ? `Voix de marque à respecter STRICTEMENT : ${business.brandVoice}. ` : "") +
    `Écris UNIQUEMENT en langue « ${locale} ». N'ajoute aucun préambule.`;

  const prompt = USER_PROMPT[kind](platform);

  return {
    request: {
      system,
      prompt,
      locale,
      maxTokens: 1200,
      meta: { kind, platform, businessName: business.name, brandVoice: business.brandVoice },
    },
    promptVersion: PROMPT_VERSIONS[kind],
  };
}
