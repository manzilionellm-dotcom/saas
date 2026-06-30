import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "../../../lib/db/repo";
import BusinessForm from "../../BusinessForm";
import BusinessActions from "../../BusinessActions";
import GenerationPanel from "../../GenerationPanel";

export const dynamic = "force-dynamic";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await repo.getBusiness(id);
  if (!business) notFound();

  const generations = await repo.listGenerations(id);
  const logs = await repo.listLLMLogs(5);

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/studio" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Studio
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {business.name}
        </h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          {business.businessType} · {business.country}
        </p>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Profil</h2>
          <BusinessForm initial={business} />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Actions</h2>
          <BusinessActions businessId={business.id} />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Content Factory
          </h2>
          <GenerationPanel businessId={business.id} locales={[business.locale, ...business.additionalLocales]} />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Historique ({generations.length})
          </h2>
          {generations.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aucune génération pour l&apos;instant. La Content Factory arrive en Phase 2.
            </p>
          ) : (
            <ul className="space-y-2">
              {generations.map((g) => (
                <li key={g.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {g.platform} · {g.kind} · {g.locale} · {g.promptVersion} · {g.tokensUsed ?? 0} tokens
                  </p>
                  <p className="mt-1 text-zinc-800 dark:text-zinc-200">{g.output.slice(0, 200)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Logs LLM récents
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aucun appel encore. Clique « Tester l&apos;IA » ci-dessus.
            </p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {new Date(l.createdAt).toLocaleString("fr-FR")} · {l.provider} ·{" "}
                    {l.tokensUsed ?? 0} tokens · {l.latencyMs ?? 0} ms{l.error ? ` · ERREUR` : ""}
                  </p>
                  <p className="mt-1 text-zinc-700 dark:text-zinc-300">{l.error ?? l.output?.slice(0, 160)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
