import { dropshipRepo } from "../../../lib/dropship/repo";
import { recommendFromMetrics } from "../../../lib/dropship/finance";
import type { ProjectStatus, MetricRecommendation } from "../../../lib/dropship/types";

export const dynamic = "force-dynamic";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// La recommandation hebdo pilote le statut du projet (boucle test/scale/hold/kill).
const STATUS_FROM_RECO: Record<MetricRecommendation, ProjectStatus> = {
  SCALE: "scaling",
  HOLD: "holding",
  ITERATE: "testing",
  KILL: "killed",
};

// POST /api/dropship/metrics { candidateId, weekStartDate, spend, revenue, cpa, roas, ... }
// Recommandation SCALE/HOLD/ITERATE/KILL calculée côté serveur (jamais le LLM).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const candidateId = String(body.candidateId ?? "");
  const candidate = await dropshipRepo.getCandidate(candidateId);
  if (!candidate) return Response.json({ error: "Candidat introuvable." }, { status: 404 });

  const weekStartDate = typeof body.weekStartDate === "string" && body.weekStartDate ? body.weekStartDate : new Date().toISOString().slice(0, 10);
  const entry = {
    spend: num(body.spend),
    revenue: num(body.revenue),
    cpa: num(body.cpa),
    roas: num(body.roas),
    ctr: num(body.ctr),
    cpc: num(body.cpc),
    conversionRate: num(body.conversionRate),
    aov: num(body.aov),
    refundRate: num(body.refundRate),
  };

  const finance = await dropshipRepo.getFinancialModel(candidateId);
  const { recommendation, rationale } = recommendFromMetrics(entry, finance);

  const saved = await dropshipRepo.addWeeklyMetric({
    productCandidateId: candidateId,
    weekStartDate,
    ...entry,
    recommendation,
    recommendationRationale: rationale,
  });

  await dropshipRepo.setProjectStatus(candidate.projectId, STATUS_FROM_RECO[recommendation]);

  return Response.json({ metric: saved });
}
