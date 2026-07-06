import { dropshipRepo } from "../../../lib/dropship/repo";
import { ensureDropshipSeed } from "../../../lib/dropship/seed";

export const dynamic = "force-dynamic";

// GET /api/dropship/project -> liste des projets
export async function GET() {
  await ensureDropshipSeed();
  const projects = await dropshipRepo.listProjects();
  return Response.json({ projects });
}

// POST /api/dropship/project { name, rawDescription } -> projet + candidat
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rawDescription = typeof body.rawDescription === "string" ? body.rawDescription.trim() : "";
  if (!name) return Response.json({ error: "Le nom du projet est requis." }, { status: 400 });
  if (rawDescription.length < 10) {
    return Response.json({ error: "Décris ton idée en quelques phrases (10 caractères minimum)." }, { status: 400 });
  }

  const project = await dropshipRepo.createProject({ userId: "local", name, status: "market_research" });
  const candidate = await dropshipRepo.createCandidate({
    projectId: project.id,
    rawDescription,
    investmentCommitteeDecision: null,
    decisionRationale: "",
  });

  return Response.json({ project, candidate }, { status: 201 });
}
