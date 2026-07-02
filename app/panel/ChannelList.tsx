"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Channel } from "../lib/db/streams-store";

const SOURCE_LABEL: Record<Channel["source"], string> = {
  direct: "directe",
  m3u: "M3U",
  xtream: "Xtream",
};

export default function ChannelList({ initialChannels }: { initialChannels: Channel[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channels = initialChannels;

  // Regroupe par provenance (playlist/compte) pour permettre la suppression en bloc.
  const origins = new Map<string, number>();
  for (const c of channels) {
    if (c.origin) origins.set(c.origin, (origins.get(c.origin) ?? 0) + 1);
  }

  async function remove(query: string, busyKey: string) {
    setError(null);
    setBusyId(busyKey);
    try {
      const res = await fetch(`/api/panel/channels?${query}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Mes chaînes ({channels.length})
        </h2>
        {channels.length > 0 && (
          // Cible = fichier M3U (route handler), pas une page : <Link> ne convient pas.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/playlist/all"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300"
          >
            ⬇ Playlist complète (M3U)
          </a>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Ajoutez <code>/playlist/all</code>{" "}dans votre lecteur (VLC, TiviMate…) — chaque profil de
        l&apos;app peut lire en même temps, la vidéo ne transite pas par ce serveur.
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {origins.size > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {[...origins.entries()].map(([origin, count]) => (
            <button
              key={origin}
              type="button"
              disabled={busyId === `origin:${origin}`}
              onClick={() => remove(`origin=${encodeURIComponent(origin)}`, `origin:${origin}`)}
              title={`Supprimer les ${count} chaîne(s) importées depuis ${origin}`}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-red-100 hover:text-red-700 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            >
              ✕ {origin} ({count})
            </button>
          ))}
        </div>
      )}

      {channels.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Aucune chaîne pour l&apos;instant. Importez une playlist M3U, un compte Xtream Codes ou
          ajoutez une chaîne directe ci-dessus.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {channels.slice(0, 200).map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {c.name}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {c.group ? `${c.group} · ` : ""}
                  {SOURCE_LABEL[c.source]}
                </p>
              </div>
              <a
                href={`/playlist/${c.id}`}
                className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
              >
                M3U
              </a>
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={() => remove(`id=${encodeURIComponent(c.id)}`, c.id)}
                className="rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                Supprimer
              </button>
            </li>
          ))}
          {channels.length > 200 && (
            <li className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              … et {channels.length - 200} autres (toutes présentes dans /playlist/all).
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
