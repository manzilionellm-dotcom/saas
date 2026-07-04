import Link from "next/link";
import { ensureSeed } from "../lib/db/seed";
import { repo } from "../lib/db/repo";
import { usingRealLLM } from "../lib/llm";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  await ensureSeed();
  const businesses = await repo.listBusinesses();

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            ← Catalogue
          </Link>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${usingRealLLM() ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
            IA : {usingRealLLM() ? "Claude (clé active)" : "mode local (sans clé)"}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              🧠 Viral AI OS — Studio
            </h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Le moteur réel derrière Versailles. Tes business, leur voix et leurs langues.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/studio/prompts" className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300">
              🧪 Prompt Studio
            </Link>
            <Link
              href="/studio/business/new"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              + Nouveau business
            </Link>
          </div>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {businesses.map((b) => (
            <li key={b.id}>
              <Link
                href={`/studio/business/${b.id}`}
                className="block h-full rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
              >
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">{b.name}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{b.businessType} · {b.country}</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{b.mainGoal}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {[b.locale, ...b.additionalLocales].map((l) => (
                    <span key={l} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {l}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
