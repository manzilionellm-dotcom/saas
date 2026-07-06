import { dropshipRepo } from "../../../../lib/dropship/repo";
import { buildCandidateContext } from "../../../../lib/dropship/context";
import { buildPipelineView } from "../../../../lib/dropship/view";

export const dynamic = "force-dynamic";

// GET /api/dropship/project/[id] -> état complet du projet (candidat + pipeline)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await dropshipRepo.getProject(id);
  if (!project) return Response.json({ error: "Projet introuvable." }, { status: 404 });

  const candidates = await dropshipRepo.candidatesByProject(id);
  const candidate = candidates[0] ?? null;
  if (!candidate) return Response.json({ project, candidate: null, pipeline: null });

  const ctx = await buildCandidateContext(candidate.id);
  const pipeline = ctx ? buildPipelineView(ctx) : null;
  return Response.json({
    project,
    candidate,
    supplier: ctx?.supplier ?? null,
    compliance: ctx?.compliance ?? null,
    finance: ctx?.finance ?? null,
    pipeline,
  });
}

// DELETE /api/dropship/project/[id]
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await dropshipRepo.deleteProject(id);
  if (!ok) return Response.json({ error: "Projet introuvable." }, { status: 404 });
  return Response.json({ ok: true });
}
