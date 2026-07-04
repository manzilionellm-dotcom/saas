"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMemory, buildProfile, clearMemory, type MemoryEvent, type Profile } from "../lib/memory";

const TYPE_LABEL: Record<MemoryEvent["type"], string> = {
  meeting: "🗣️ Réunion",
  search: "🐉 Recherche",
  note: "📝 Note",
};

export default function MemoryPage() {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  function reload() {
    const ev = getMemory();
    setEvents(ev);
    setProfile(buildProfile(ev));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, []);

  function handleClear() {
    clearMemory();
    reload();
  }

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Retour au catalogue
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          🧠 Ce que Versailles sait de toi
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Versailles retient tes réunions et tes recherches pour te connaître de
          mieux en mieux. Plus tu l&apos;utilises, plus il s&apos;adapte.
        </p>

        {profile && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Souvenirs", value: profile.total },
              { label: "Réunions", value: profile.meetings },
              { label: "Recherches", value: profile.searches },
              { label: "Pays", value: profile.country },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{s.value}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {profile && profile.topInterests.length > 0 && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Tes centres d&apos;intérêt (appris automatiquement)
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.topInterests.map((t) => (
                <li key={t.term} className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  {t.term} <span className="text-indigo-400">×{t.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Journal ({events.length})
          </h2>
          {events.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-red-600 hover:underline dark:text-red-400"
            >
              Tout effacer
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Rien encore. Lance une{" "}
            <Link href="/meeting" className="text-indigo-600 hover:underline dark:text-indigo-400">réunion</Link>{" "}
            ou une{" "}
            <Link href="/silkroute" className="text-indigo-600 hover:underline dark:text-indigo-400">recherche SilkRoute</Link>{" "}
            : tout sera mémorisé ici.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-400">
                  {TYPE_LABEL[e.type]} · {new Date(e.at).toLocaleString("fr-FR")}
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">{e.text}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
