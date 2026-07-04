// Estimation du coût d'un appel LLM (exigence évolutive n°4 : pas de surprise de facture).
// Tarifs indicatifs par million de tokens (à ajuster selon le modèle réel).

type Pricing = { inPerM: number; outPerM: number };

const PRICING: Record<string, Pricing> = {
  // Claude Sonnet (ordre de grandeur, USD / million de tokens)
  "claude-sonnet-4-6": { inPerM: 3, outPerM: 15 },
  // Repli local : gratuit
  local: { inPerM: 0, outPerM: 0 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-4-6"];
  const cost = (inputTokens / 1_000_000) * p.inPerM + (outputTokens / 1_000_000) * p.outPerM;
  return Math.round(cost * 1e6) / 1e6; // arrondi au millionième de $
}

// Estimation grossière du nombre de tokens quand l'API ne le renvoie pas
// (~4 caractères par token en moyenne).
export function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
