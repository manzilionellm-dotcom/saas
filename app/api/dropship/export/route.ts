import { dropshipRepo } from "../../../lib/dropship/repo";
import { buildCandidateContext } from "../../../lib/dropship/context";
import { buildDeliverableMarkdown } from "../../../lib/dropship/deliverable";

export const dynamic = "force-dynamic";

// GET /api/dropship/export?projectId=...&format=md|json -> pack de lancement
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const format = url.searchParams.get("format") === "json" ? "json" : "md";

  const project = await dropshipRepo.getProject(projectId);
  if (!project) return Response.json({ error: "Projet introuvable." }, { status: 404 });

  const candidates = await dropshipRepo.candidatesByProject(projectId);
  const candidate = candidates[0];
  if (!candidate) return Response.json({ error: "Aucun candidat produit." }, { status: 404 });

  const ctx = await buildCandidateContext(candidate.id);
  if (!ctx) return Response.json({ error: "Candidat introuvable." }, { status: 404 });
  const metrics = await dropshipRepo.listWeeklyMetrics(candidate.id);

  if (format === "json") {
    return Response.json({
      project,
      candidate,
      supplier: ctx.supplier,
      compliance: ctx.compliance,
      finance: ctx.finance,
      reports: ctx.reports,
      metrics,
    });
  }

  const md = buildDeliverableMarkdown(project, ctx, metrics);
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="pack-lancement-${projectId}.md"`,
    },
  });
}
