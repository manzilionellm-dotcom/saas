import Link from "next/link";
import { notFound } from "next/navigation";
import { dropshipRepo } from "../../lib/dropship/repo";
import { buildCandidateContext } from "../../lib/dropship/context";
import { buildPipelineView } from "../../lib/dropship/view";
import { usingRealLLM } from "../../lib/llm";
import Workspace, { type ProjectState } from "../Workspace";

export const dynamic = "force-dynamic";

export default async function DropshipProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await dropshipRepo.getProject(id);
  if (!project) notFound();

  const candidates = await dropshipRepo.candidatesByProject(id);
  const candidate = candidates[0] ?? null;
  const ctx = candidate ? await buildCandidateContext(candidate.id) : null;

  const initial: ProjectState = {
    project,
    candidate,
    supplier: ctx?.supplier ?? null,
    compliance: ctx?.compliance ?? null,
    finance: ctx?.finance ?? null,
    pipeline: ctx ? buildPipelineView(ctx) : null,
  };

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between">
          <Link href="/dropship" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            ← Projets dropshipping
          </Link>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${usingRealLLM() ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}
          >
            IA : {usingRealLLM() ? "Claude (clé active)" : "mode local (sans clé)"}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{project.name}</h1>
        {candidate && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{candidate.rawDescription}</p>
        )}

        <div className="mt-8">
          <Workspace initial={initial} />
        </div>
      </main>
    </div>
  );
}
