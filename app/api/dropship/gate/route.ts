import { dropshipRepo } from "../../../lib/dropship/repo";
import { buildCandidateContext } from "../../../lib/dropship/context";
import { canApproveGate } from "../../../lib/dropship/gates";
import type { GateName, ProjectStatus } from "../../../lib/dropship/types";

export const dynamic = "force-dynamic";

const GATES: GateName[] = ["market_to_product", "product_to_brand", "brand_to_marketing", "marketing_to_launch"];

// Statut de projet atteint quand une porte est approuvée (entrée de l'étape suivante).
const STATUS_AFTER_GATE: Record<GateName, ProjectStatus> = {
  market_to_product: "product_validation",
  product_to_brand: "brand_build",
  brand_to_marketing: "marketing_plan",
  marketing_to_launch: "launch_ready",
};

// POST /api/dropship/gate { candidateId, gateName }
// Approbation EXPLICITE d'une porte par l'utilisateur (bloque sinon la suite).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const candidateId = String(body.candidateId ?? "");
  const gateName = String(body.gateName ?? "") as GateName;
  if (!GATES.includes(gateName)) return Response.json({ error: "Porte invalide." }, { status: 400 });

  const candidate = await dropshipRepo.getCandidate(candidateId);
  if (!candidate) return Response.json({ error: "Candidat introuvable." }, { status: 404 });

  const ctx = await buildCandidateContext(candidateId);
  if (!ctx) return Response.json({ error: "Candidat introuvable." }, { status: 404 });

  // Règle de blocage dur : la porte ne peut être approuvée que si l'étape est
  // terminée (et, pour la porte 2, si la décision du comité est GO).
  const check = canApproveGate(ctx, gateName);
  if (!check.ok) return Response.json({ error: check.reason }, { status: 409 });

  const gate = await dropshipRepo.approveGate(candidateId, gateName);
  await dropshipRepo.setProjectStatus(candidate.projectId, STATUS_AFTER_GATE[gateName]);

  return Response.json({ gate });
}
