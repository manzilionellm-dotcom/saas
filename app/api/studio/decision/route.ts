import { repo } from "../../../lib/db/repo";
import { recomputeGenome } from "../../../lib/genome";
import { buildDecision } from "../../../lib/brain";

export const dynamic = "force-dynamic";

// POST /api/studio/decision { businessId } -> 3 actions max, justifiées par la donnée.
export async function POST(request: Request) {
  let businessId = "";
  try {
    const body = await request.json();
    businessId = String(body?.businessId ?? "");
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const business = await repo.getBusiness(businessId);
  if (!business) return Response.json({ error: "Business introuvable." }, { status: 404 });

  const genome = await recomputeGenome(businessId);
  const content = buildDecision(genome.snapshot, genome.dataPoints);
  const decision = await repo.addDecision({
    businessId,
    actions: content.actions,
    stopDoing: content.stopDoing,
    basedOnData: content.basedOnData,
  });

  return Response.json({ decision });
}
