// Exigence évolutive n°3 : abstraction du provider LLM.
// Aucune logique métier n'appelle l'API directement — tout passe par cette interface.

export type LLMRequest = {
  system?: string;
  prompt: string;
  maxTokens?: number;
  locale?: string;
  // Métadonnées optionnelles : Claude les ignore (il utilise system+prompt),
  // le provider local s'en sert pour produire un contenu réaliste sans clé.
  meta?: {
    kind?: string;
    platform?: string;
    businessName?: string;
    brandVoice?: string;
  };
};

export type LLMResponse = {
  text: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  tokensUsed: number;
  costEstimate: number;
  latencyMs: number;
};

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  complete(req: LLMRequest): Promise<LLMResponse>;
}
