import { dropshipRepo } from "../../../lib/dropship/repo";
import { runStage } from "../../../lib/dropship/runner";
import { STAGES } from "../../../lib/dropship/agents";
import type { Stage } from "../../../lib/dropship/types";

export const dynamic = "force-dynamic";

// POST /api/dropship/run { candidateId, stage } -> exécute les agents runnables
// de l'étape (séquentiel, chaque sortie nourrit le suivant). Respecte les
// règles de blocage dur : renvoie les blockers non levés.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const candidateId = String(body.candidateId ?? "");
  const stage = String(body.stage ?? "") as Stage;

  if (!STAGES.includes(stage)) return Response.json({ error: "Étape invalide." }, { status: 400 });
  const candidate = await dropshipRepo.getCandidate(candidateId);
  if (!candidate) return Response.json({ error: "Candidat introuvable." }, { status: 404 });

  try {
    const result = await runStage(candidateId, stage);
    if (!result) return Response.json({ error: "Candidat introuvable." }, { status: 404 });
    return Response.json({ result, realLLM: !!process.env.ANTHROPIC_API_KEY });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Échec de l'exécution du pipeline.";
    return Response.json({ error: `Échec de l'exécution (LLM) : ${msg}` }, { status: 502 });
  }
}
