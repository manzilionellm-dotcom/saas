import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "../../../lib/db/repo";
import BusinessForm from "../../BusinessForm";
import BusinessActions from "../../BusinessActions";
import GenerationPanel from "../../GenerationPanel";
import ResultForm from "../../ResultForm";
import BrainPanel from "../../BrainPanel";
import CoachPanel from "../../CoachPanel";
import type { BriefContent } from "../../../lib/brain";

export const dynamic = "force-dynamic";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await repo.getBusiness(id);
  if (!business) notFound();

  const generations = await repo.listGenerations(id);
  const results = await repo.listResults(id);
  const logs = await repo.listLLMLogs(5);
  const genome = await repo.getGenome(id);
  const brief = await repo.latestBrief(id);
  const decision = await repo.latestDecision(id);
  const conversation = await repo.getConversation(id);

  const resultsByGen = new Map<string, number>();
  for (const r of results) resultsByGen.set(r.generationId, (resultsByGen.get(r.generationId) ?? 0) + 1);

  let briefContent: BriefContent | null = null;
  if (brief) { try { briefContent = JSON.parse(brief.content); } catch { briefContent = null; } }

  const card = "rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";
  const h2 = "mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50";

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/studio" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">← Studio</Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{business.name}</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">{business.businessType} · {business.country}</p>

        <section className="mt-8">
          <h2 className={h2}>Profil</h2>
          <BusinessForm initial={business} />
          <div className="mt-4"><BusinessActions businessId={business.id} /></div>
        </section>

        <section className="mt-10">
          <h2 className={h2}>Content Factory</h2>
          <GenerationPanel businessId={business.id} locales={[business.locale, ...business.additionalLocales]} />
        </section>

        {/* Cerveau : Genome + Brief + Décisions */}
        <section className="mt-10">
          <h2 className={h2}>🧠 Cerveau (Business Genome)</h2>
          <div className="mb-4"><BrainPanel businessId={business.id} /></div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={card}>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Genome</p>
              {genome && genome.snapshot.totalResults > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                  <li>Résultats : <strong>{genome.snapshot.totalResults}</strong></li>
                  {genome.snapshot.bestPlatforms[0] && <li>Top plateforme : {genome.snapshot.bestPlatforms[0].key} (n={genome.snapshot.bestPlatforms[0].n})</li>}
                  {genome.snapshot.bestKinds[0] && <li>Top format : {genome.snapshot.bestKinds[0].key} (n={genome.snapshot.bestKinds[0].n})</li>}
                  {genome.snapshot.bestLocales[0] && <li>Top langue : {genome.snapshot.bestLocales[0].key} (n={genome.snapshot.bestLocales[0].n})</li>}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Pas encore de résultats. Saisis les perfs ci-dessous pour nourrir le Genome.</p>
              )}
            </div>

            <div className={card}>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Brief du jour</p>
              {briefContent ? (
                <div className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                  <ul className="list-disc pl-4">{briefContent.angles.map((a, i) => <li key={i}>{a}</li>)}</ul>
                  <p>🛑 {briefContent.stop}</p>
                  <p>✨ {briefContent.opportunity}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Clique « Générer le brief du jour ».</p>
              )}
            </div>
          </div>

          {decision && (
            <div className={`mt-4 ${card}`}>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">🎯 Décisions ({decision.basedOnData})</p>
              <ol className="mt-2 space-y-2 text-sm">
                {decision.actions.map((a, i) => (
                  <li key={i} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{i + 1}. {a.action}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">Pourquoi : {a.justification}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">Attendu : {a.expected} · Risque : {a.risk}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">À arrêter : {decision.stopDoing}</p>
            </div>
          )}
        </section>

        {/* Coach */}
        <section className="mt-10">
          <h2 className={h2}>💬 Coach (connaît tes chiffres)</h2>
          <CoachPanel businessId={business.id} initial={conversation?.messages ?? []} />
        </section>

        {/* Historique + saisie des résultats */}
        <section className="mt-10">
          <h2 className={h2}>Historique ({generations.length})</h2>
          {generations.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucune génération. Utilise la Content Factory ci-dessus.</p>
          ) : (
            <ul className="space-y-2">
              {generations.map((g) => (
                <li key={g.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {g.platform} · {g.kind} · {g.locale} · {g.promptVersion} · {g.tokensUsed ?? 0} tk · {(resultsByGen.get(g.id) ?? 0)} résultat(s)
                  </p>
                  <p className="mt-1 line-clamp-2 text-zinc-800 dark:text-zinc-200">{g.output.slice(0, 160)}</p>
                  <div className="mt-2"><ResultForm generationId={g.id} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className={h2}>Logs LLM récents</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucun appel encore.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {new Date(l.createdAt).toLocaleString("fr-FR")} · {l.provider} · {l.tokensUsed ?? 0} tk · {l.latencyMs ?? 0} ms{l.error ? " · ERREUR" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
