import Link from "next/link";
import { dropshipRepo } from "../lib/dropship/repo";
import { ensureDropshipSeed } from "../lib/dropship/seed";
import { usingRealLLM } from "../lib/llm";
import NewProjectForm from "./NewProjectForm";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  market_research: "Recherche marché",
  product_validation: "Validation produit",
  brand_build: "Marque & boutique",
  marketing_plan: "Plan marketing",
  launch_ready: "Prêt au lancement",
  testing: "Test en cours",
  scaling: "Scaling",
  holding: "En pause",
  killed: "Arrêté",
};

export default async function DropshipPage() {
  await ensureDropshipSeed();
  const projects = await dropshipRepo.listProjects();

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            ← Catalogue
          </Link>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${usingRealLLM() ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}
          >
            IA : {usingRealLLM() ? "Claude (clé active)" : "mode local (sans clé)"}
          </span>
        </div>

        <div className="mt-4">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            📦 Dropshipping Copilot
          </h1>
          <p className="mt-1 max-w-2xl text-zinc-600 dark:text-zinc-400">
            Un système multi-agents qui t&apos;accompagne du choix d&apos;un produit jusqu&apos;à un pack de
            lancement complet — recherche marché, validation fournisseur, marque, boutique, pub, conformité et
            finance. Sans jamais promettre de résultat garanti.
          </p>
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Nouveau projet</h2>
          <NewProjectForm />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Projets ({projects.length})</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucun projet. Crée-en un ci-dessus.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dropship/${p.id}`}
                    className="block h-full rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
                  >
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</p>
                    <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
