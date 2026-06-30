// Modèles du domaine Viral AI OS (miroir du schema.prisma).
// Tout passe par ces types : la logique métier ne connaît jamais le stockage.

export type Business = {
  id: string;
  name: string;
  businessType: string;
  country: string;
  locale: string; // langue principale, ex "fr"
  additionalLocales: string[]; // ["ar","sv"]
  targetCustomer: string;
  budget: string;
  mainGoal: string;
  brandVoice?: string;
  notes?: string;
  createdAt: string; // ISO
};

export type Generation = {
  id: string;
  businessId: string;
  platform: string;
  kind: string; // hooks | script | post | hashtags | seo_title | ad_copy
  locale: string;
  prompt: string;
  output: string;
  promptVersion: string;
  tokensUsed?: number;
  costEstimate?: number;
  createdAt: string;
};

export type Result = {
  id: string;
  generationId: string;
  views?: number;
  likes?: number;
  clicks?: number;
  conversions?: number;
  note?: string;
  recordedAt: string;
};

export type DailyBrief = {
  id: string;
  businessId: string;
  content: string; // JSON: { angles[], stop, opportunity }
  date: string;
};

export type Competitor = {
  id: string;
  businessId: string;
  name: string;
  source: string;
  lastData?: string;
  updatedAt: string;
};

export type LLMLog = {
  id: string;
  provider: string;
  input: string;
  output?: string;
  tokensUsed?: number;
  latencyMs?: number;
  error?: string;
  createdAt: string;
};

export type DBShape = {
  businesses: Business[];
  generations: Generation[];
  results: Result[];
  dailyBriefs: DailyBrief[];
  competitors: Competitor[];
  llmLogs: LLMLog[];
  seeded: boolean;
};

export function emptyDB(): DBShape {
  return {
    businesses: [],
    generations: [],
    results: [],
    dailyBriefs: [],
    competitors: [],
    llmLogs: [],
    seeded: false,
  };
}
