import { repo } from "../../../lib/db/repo";
import { recomputeGenome } from "../../../lib/genome";
import { buildBrief } from "../../../lib/brain";

export const dynamic = "force-dynamic";

// POST /api/studio/brief { businessId } -> brief du jour ancré dans les résultats.
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
  const content = buildBrief(genome.snapshot);
  const brief = await repo.addBrief({ businessId, content: JSON.stringify(content) });

  return Response.json({ brief, content });
}
