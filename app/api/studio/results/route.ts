import { repo } from "../../../lib/db/repo";
import { recomputeGenome } from "../../../lib/genome";

export const dynamic = "force-dynamic";

// POST /api/studio/results { generationId, views, likes, clicks, conversions, note }
// Saisie manuelle des perfs réelles. Recalcule le Genome (l'outil apprend).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const generationId = String(body.generationId ?? "");
  const generation = await repo.getGeneration(generationId);
  if (!generation) return Response.json({ error: "Génération introuvable." }, { status: 404 });

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };

  const result = await repo.addResult({
    generationId,
    views: num(body.views),
    likes: num(body.likes),
    clicks: num(body.clicks),
    conversions: num(body.conversions),
    note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined,
  });

  const genome = await recomputeGenome(generation.businessId);
  return Response.json({ result, genome });
}
