import { dropshipRepo } from "./repo";
import type {
  AgentReport,
  ApprovalGate,
  ComplianceCheck,
  FinancialModel,
  ProductCandidate,
  SupplierValidationInput,
} from "./types";

// Vue agrégée d'un candidat produit : tout l'état nécessaire pour décider ce qui
// est exécutable, bloqué, ou approuvable. Réutilisée par le runner, les routes
// API et l'UI (source unique de vérité sur l'état du pipeline).
export type CandidateContext = {
  candidate: ProductCandidate;
  reports: AgentReport[];
  supplier: SupplierValidationInput | null;
  compliance: ComplianceCheck | null;
  finance: FinancialModel | null;
  gates: ApprovalGate[];
};

export async function buildCandidateContext(candidateId: string): Promise<CandidateContext | null> {
  const candidate = await dropshipRepo.getCandidate(candidateId);
  if (!candidate) return null;
  const [reports, supplier, compliance, finance, gates] = await Promise.all([
    dropshipRepo.listReports(candidateId),
    dropshipRepo.getSupplierInput(candidateId),
    dropshipRepo.getComplianceCheck(candidateId),
    dropshipRepo.getFinancialModel(candidateId),
    dropshipRepo.listGates(candidateId),
  ]);
  return { candidate, reports, supplier, compliance, finance, gates };
}

export function reportsForStage(ctx: CandidateContext, stage: string): AgentReport[] {
  return ctx.reports.filter((r) => r.stage === stage);
}

export function hasReport(ctx: CandidateContext, agentKeyLabel: string): boolean {
  return ctx.reports.some((r) => r.agentRole === agentKeyLabel);
}
