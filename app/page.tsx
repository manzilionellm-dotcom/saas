"use client";

import { useState } from "react";

type FamilyLink = {
  id: number;
  name: string;
  url: string;
};

export default function Home() {
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function generateLinks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/links", { method: "POST" });
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const data: { links: FamilyLink[] } = await res.json();
      setLinks(data.links);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(link: FamilyLink) {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("Impossible de copier le lien");
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Restream Famille
        </h1>
        <p className="max-w-md text-center text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Générez 15 liens personnels, un par membre de la famille. Chacun ouvre
          son lien et regarde ce qu&apos;il veut.
        </p>

        <button
          onClick={generateLinks}
          disabled={loading}
          className="flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {loading ? "Génération…" : "Générer les 15 liens"}
        </button>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {links.length > 0 && (
          <ul className="flex w-full flex-col gap-3">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex items-center gap-4 rounded-xl border border-black/[.08] bg-white px-4 py-3 dark:border-white/[.145] dark:bg-[#111]"
              >
                <span className="w-24 shrink-0 font-medium text-black dark:text-zinc-50">
                  {link.name}
                </span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
                >
                  {link.url}
                </a>
                <button
                  onClick={() => copyLink(link)}
                  className="shrink-0 rounded-full border border-black/[.08] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  {copiedId === link.id ? "Copié !" : "Copier"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
