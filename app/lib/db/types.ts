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

// --- Couche intelligente (Phases 3, 5, 7, 8) ---

export type GenomeSnapshot = {
  bestPlatforms: { key: string; avgScore: number; n: number }[];
  bestKinds: { key: string; avgScore: number; n: number }[];
  bestLocales: { key: string; avgScore: number; n: number }[];
  patterns: { label: string; evidence: number }[];
  totalResults: number;
};

export type BusinessGenome = {
  businessId: string;
  snapshot: GenomeSnapshot;
  dataPoints: number; // nb de résultats (pour pondérer la confiance)
  updatedAt: string;
};

export type DecisionAction = {
  action: string;
  justification: string;
  expected: string;
  risk: string;
};

export type Decision = {
  id: string;
  businessId: string;
  date: string;
  actions: DecisionAction[];
  stopDoing: string;
  basedOnData: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Conversation = {
  businessId: string;
  messages: ChatMessage[];
  updatedAt: string;
};

export type PromptVersion = {
  id: string;
  kind: string;
  version: string;
  body: string;
  isDefault: boolean;
  status: "active" | "testing" | "archived";
  createdAt: string;
};

export type DBShape = {
  businesses: Business[];
  generations: Generation[];
  results: Result[];
  dailyBriefs: DailyBrief[];
  competitors: Competitor[];
  llmLogs: LLMLog[];
  genomes: BusinessGenome[];
  decisions: Decision[];
  conversations: Conversation[];
  promptVersions: PromptVersion[];
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
    genomes: [],
    decisions: [],
    conversations: [],
    promptVersions: [],
    seeded: false,
  };
}
