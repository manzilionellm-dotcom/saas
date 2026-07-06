// Modèles du domaine « Dropshipping Copilot ».
// Même philosophie que app/lib/db/types.ts : la logique métier ne connaît que
// ces types, jamais le stockage. Miroir runtime du schema Prisma (voir
// prisma/schema.prisma, section Dropshipping).

// --- Étiquetage de gouvernance des données (règle absolue du brief) ---------
export type ClaimLabel = "VERIFIED" | "ESTIMATE" | "USER_MUST_VERIFY" | "UNKNOWN";

export type Claim = {
  label: ClaimLabel;
  statement: string;
  source?: string; // pour VERIFIED : URL / référence citée
  whereToVerify?: string; // pour USER_MUST_VERIFY : où cliquer, quoi regarder
};

export type ConfidenceLevel = "high" | "medium" | "low";

// --- Machine à états d'un projet --------------------------------------------
export type ProjectStatus =
  | "market_research"
  | "product_validation"
  | "brand_build"
  | "marketing_plan"
  | "launch_ready"
  | "testing"
  | "scaling"
  | "holding"
  | "killed";

// Étapes du pipeline (regroupent les agents). « launch » couvre l'étape E.
export type Stage =
  | "market_research"
  | "product_validation"
  | "brand_build"
  | "marketing_plan"
  | "launch";

export type GateName =
  | "market_to_product"
  | "product_to_brand"
  | "brand_to_marketing"
  | "marketing_to_launch";

export type CommitteeDecision = "GO" | "HOLD" | "REJECT";
export type SupplierVerdict = "PASS" | "FAIL" | "NEEDS_MORE_DATA";
export type MetricRecommendation = "SCALE" | "HOLD" | "ITERATE" | "KILL";
export type ComplianceState = "n/a" | "to_verify" | "verified";

// --- Entités ----------------------------------------------------------------

export type DropshippingProject = {
  id: string;
  userId: string; // fourni par le SaaS parent ; « local » en mono-utilisateur
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductCandidate = {
  id: string;
  projectId: string;
  rawDescription: string; // texte libre initial de l'utilisateur
  productName?: string; // rempli par le Product Research Agent
  investmentCommitteeDecision: CommitteeDecision | null;
  decisionRationale: string;
  createdAt: string;
};

// Formulaire de saisie manuelle AutoDS (aucun de ces champs n'est jamais inventé)
export type SupplierValidationInput = {
  id: string;
  productCandidateId: string;
  productNameInput: string;
  productUrl: string;
  supplierName: string;
  productCost: number | null;
  shippingCost: number | null;
  deliveryDays: number | null;
  warehouseLocation: string;
  supplierRating: number | null; // note du fournisseur (ex. sur 5)
  orderVolume: string;
  reviewCount: number | null;
  averageReviewScore: number | null;
  recurringComplaints: string; // texte libre
  stockStability: "stable" | "variable" | "unstable" | "";
  priceChangeHistory: string;
  availableVariants: string;
  complianceDocs: string; // ex. « déclaration CE disponible »
  returnRefundSignals: string;
  verdict: SupplierVerdict;
  verdictReasons: string[]; // calculés côté serveur contre des seuils explicites
  createdAt: string;
};

export type ComplianceCheck = {
  id: string;
  productCandidateId: string;
  vatOss: ComplianceState;
  gpsr: ComplianceState;
  ceMarking: ComplianceState;
  batteryReg: ComplianceState;
  weee: ComplianceState;
  withdrawalRight: ComplianceState;
  euResponsiblePerson: ComplianceState;
  gdpr: ComplianceState;
  professionalReviewConfirmed: boolean; // bloque la progression tant que non coché
  createdAt: string;
};

export type FinancialModel = {
  id: string;
  productCandidateId: string;
  // Inputs utilisateur
  productCost: number;
  shippingCost: number;
  transactionFeeRate: number; // ex. 0.03
  targetGrossMarginRate: number; // ex. 0.65
  adCushionRate: number; // part du prix réservée à l'acquisition, ex. 0.25
  // Calculés EN CODE SERVEUR uniquement (jamais par le LLM)
  computedLandedCost: number;
  computedSellingPrice: number;
  computedBreakEvenCPA: number;
  computedMaxCPA: number;
  computedBreakEvenROAS: number;
  warnings: string[];
  createdAt: string;
};

export type AdRuleSet = {
  id: string;
  productCandidateId: string;
  rules: unknown; // JSON libre (structure de campagne, règles scale/kill)
  status: "draft" | "active" | "archived";
  createdAt: string;
};

export type WeeklyMetricEntry = {
  id: string;
  productCandidateId: string;
  weekStartDate: string;
  spend: number;
  revenue: number;
  cpa: number;
  roas: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  aov: number;
  refundRate: number;
  recommendation: MetricRecommendation; // calculé côté serveur
  recommendationRationale: string;
  createdAt: string;
};

export type AgentReport = {
  id: string;
  productCandidateId: string;
  agentRole: string; // ex. « Scout », « Market », « Investment Committee »
  stage: Stage;
  content: string; // markdown
  claimsAudit: Claim[]; // liste d'affirmations étiquetées
  confidenceLevel: ConfidenceLevel;
  createdAt: string;
};

export type ApprovalGate = {
  id: string;
  productCandidateId: string;
  gateName: GateName;
  approvedByUser: boolean;
  approvedAt: string | null;
};

// --- Forme du store ---------------------------------------------------------

export type DropshipDBShape = {
  projects: DropshippingProject[];
  candidates: ProductCandidate[];
  supplierInputs: SupplierValidationInput[];
  complianceChecks: ComplianceCheck[];
  financialModels: FinancialModel[];
  adRuleSets: AdRuleSet[];
  weeklyMetrics: WeeklyMetricEntry[];
  reports: AgentReport[];
  gates: ApprovalGate[];
  seeded: boolean;
};

export function emptyDropshipDB(): DropshipDBShape {
  return {
    projects: [],
    candidates: [],
    supplierInputs: [],
    complianceChecks: [],
    financialModels: [],
    adRuleSets: [],
    weeklyMetrics: [],
    reports: [],
    gates: [],
    seeded: false,
  };
}
