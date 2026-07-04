import Link from "next/link";
import { repo } from "../../lib/db/repo";
import { ensureSeed } from "../../lib/db/seed";
import { scoreResult } from "../../lib/genome";
import PromoteButton from "./PromoteButton";

export const dynamic = "force-dynamic";

// Seuil de confiance pour l'auto-promotion (un score sans volume est un mensonge).
const AUTO_PROMOTE_MIN = 30;

export default async function PromptStudioPage() {
  await ensureSeed();
  const versions = await repo.listPromptVersions();
  const gens = await repo.allGenerations();
  const results = await repo.allResults();

  const bestPerGen = new Map<string, number>();
  for (const r of results) {
    bestPerGen.set(r.generationId, Math.max(bestPerGen.get(r.generationId) ?? 0, scoreResult(r)));
  }

  // Perf par (kind, version) : moyenne des scores + volume.
  function perf(kind: string, version: string): { avg: number; n: number } {
    const scored = gens
      .filter((g) => g.kind === kind && g.promptVersion === version)
      .map((g) => bestPerGen.get(g.id))
      .filter((s): s is number => s != null);
    if (scored.length === 0) return { avg: 0, n: 0 };
    return { avg: Math.round(scored.reduce((a, b) => a + b, 0) / scored.length), n: scored.length };
  }

  const kinds = [...new Set(versions.map((v) => v.kind))];

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/studio" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Studio
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          🧪 Prompt Studio
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Versionne, compare et fais gagner les meilleurs prompts — sur preuve, jamais sur impression.
          Le volume de données est toujours affiché à côté du score (un score sans volume est un mensonge).
        </p>

        <div className="mt-8 space-y-8">
          {kinds.map((kind) => {
            const vs = versions.filter((v) => v.kind === kind);
            return (
              <section key={kind}>
                <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{kind}</h2>
                <ul className="space-y-2">
                  {vs.map((v) => {
                    const p = perf(kind, v.version);
                    const confident = p.n >= AUTO_PROMOTE_MIN;
                    return (
                      <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">
                            {v.version}{" "}
                            {v.status === "testing" && <span className="text-xs text-amber-600 dark:text-amber-400">(en test)</span>}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            score {p.avg}{" "}
                            <span className={confident ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                              sur {p.n} publication{p.n > 1 ? "s" : ""}{confident ? "" : " · données insuffisantes"}
                            </span>
                          </p>
                        </div>
                        <PromoteButton kind={kind} version={v.version} isDefault={v.isDefault} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-8 rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          🔒 Auto-promotion seulement si une version surperforme <strong>ET</strong> repose sur ≥ {AUTO_PROMOTE_MIN} résultats.
          En dessous : marquée « prometteur, données insuffisantes » — promotion manuelle uniquement. Aucune version n&apos;est jamais supprimée.
        </p>
      </main>
    </div>
  );
}
