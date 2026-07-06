import Link from "next/link";
import { notFound } from "next/navigation";
import { dropshipRepo } from "../../../lib/dropship/repo";
import { buildCandidateContext } from "../../../lib/dropship/context";
import { buildDeliverableMarkdown } from "../../../lib/dropship/deliverable";

export const dynamic = "force-dynamic";

export default async function DeliverablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await dropshipRepo.getProject(id);
  if (!project) notFound();

  const candidates = await dropshipRepo.candidatesByProject(id);
  const candidate = candidates[0] ?? null;
  const ctx = candidate ? await buildCandidateContext(candidate.id) : null;
  const metrics = candidate ? await dropshipRepo.listWeeklyMetrics(candidate.id) : [];

  const md = ctx ? buildDeliverableMarkdown(project, ctx, metrics) : null;

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between">
          <Link href={`/dropship/${id}`} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            ← Workspace
          </Link>
          <div className="flex gap-3 text-xs">
            <a href={`/api/dropship/export?projectId=${id}&format=md`} className="text-indigo-600 hover:underline dark:text-indigo-400">⬇ Markdown</a>
            <a href={`/api/dropship/export?projectId=${id}&format=json`} className="text-indigo-600 hover:underline dark:text-indigo-400">⬇ JSON</a>
          </div>
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">📄 Pack de lancement</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Consolidation de tous les rapports du pipeline. Aucune promesse de résultat.
        </p>

        {!md ? (
          <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
            Pas encore de contenu. Lance les étapes du pipeline depuis le workspace.
          </p>
        ) : (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">{md}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
