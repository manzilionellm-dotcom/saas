"use client";

import { useCallback, useEffect, useState } from "react";
import type { Channel, Profile } from "../lib/db/streams-store";

type Props = {
  grandTotal: number;
  groups: { group: string; count: number }[];
  origins: { origin: string; count: number }[];
  profiles: Profile[];
};

type HealthState = Record<string, { ok: boolean; status?: number; error?: string }>;

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

const SOURCE_LABEL: Record<Channel["source"], string> = {
  direct: "directe",
  m3u: "M3U",
  xtream: "Xtream",
};

const PAGE_SIZE = 50;

export default function ChannelBrowser({ grandTotal, groups, origins, profiles }: Props) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Channel[]>([]);
  const [total, setTotal] = useState(grandTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthState>({});
  const [checking, setChecking] = useState(false);
  const [activeProfile, setActiveProfile] = useState<string>(profiles[0]?.id ?? "");
  const [favs, setFavs] = useState<Set<string>>(
    () => new Set(profiles[0]?.favorites ?? []),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search,
        group,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/panel/channels?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }, [search, group, page]);

  // Recharge (avec anti-rebond léger sur la recherche).
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  function onSearch(v: string) {
    setSearch(v);
    setPage(1);
  }
  function onGroup(v: string) {
    setGroup(v);
    setPage(1);
  }

  async function remove(query: string) {
    setError(null);
    try {
      const res = await fetch(`/api/panel/channels?${query}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  async function checkHealth() {
    if (items.length === 0) return;
    setChecking(true);
    try {
      const res = await fetch("/api/panel/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: items.map((c) => c.id) }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        setHealth((prev) => {
          const next = { ...prev };
          for (const r of data.results) next[r.id] = { ok: r.ok, status: r.status, error: r.error };
          return next;
        });
      }
    } finally {
      setChecking(false);
    }
  }

  function selectProfile(id: string) {
    setActiveProfile(id);
    const p = profiles.find((x) => x.id === id);
    setFavs(new Set(p?.favorites ?? []));
  }

  async function toggleFav(channelId: string) {
    if (!activeProfile) return;
    const add = !favs.has(channelId);
    // Optimiste
    setFavs((prev) => {
      const next = new Set(prev);
      if (add) next.add(channelId);
      else next.delete(channelId);
      return next;
    });
    try {
      await fetch(`/api/panel/profiles/${activeProfile}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite", channelId, add }),
      });
    } catch {
      // en cas d'échec, on recharge l'état au prochain rafraîchissement
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Mes chaînes ({grandTotal.toLocaleString("fr-FR")})
        </h2>
        {grandTotal > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={checkHealth}
              disabled={checking || items.length === 0}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300"
            >
              {checking ? "Test…" : "🩺 Tester cette page"}
            </button>
            {/* Cible = fichier M3U (route handler), pas une page. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/playlist/all"
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300"
            >
              ⬇ Playlist complète
            </a>
          </div>
        )}
      </div>

      {/* Recherche + filtre catégorie */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className={field}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="🔎 Rechercher une chaîne…"
        />
        <select
          className={`${field} sm:max-w-xs`}
          value={group}
          onChange={(e) => onGroup(e.target.value)}
        >
          <option value="">Toutes les catégories ({groups.length})</option>
          {groups.map((g) => (
            <option key={g.group} value={g.group}>
              {g.group} ({g.count})
            </option>
          ))}
        </select>
      </div>

      {/* Profil actif pour les favoris */}
      {profiles.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Favoris de :</span>
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectProfile(p.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeProfile === p.id
                  ? "bg-indigo-600 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:border-indigo-400 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Étiquettes de provenance (suppression en bloc) */}
      {origins.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {origins.map(({ origin, count }) => (
            <button
              key={origin}
              type="button"
              onClick={() => remove(`origin=${encodeURIComponent(origin)}`)}
              title={`Supprimer les ${count} chaîne(s) importées depuis ${origin}`}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            >
              ✕ {origin} ({count.toLocaleString("fr-FR")})
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      {grandTotal === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Aucune chaîne pour l&apos;instant. Importez une ou plusieurs playlists M3U, un compte
          Xtream Codes ou ajoutez une chaîne directe ci-dessus.
        </p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {items.map((c) => {
              const h = health[c.id];
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  {profiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleFav(c.id)}
                      title={favs.has(c.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                      className={`text-lg leading-none transition-transform hover:scale-110 ${
                        favs.has(c.id) ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"
                      }`}
                    >
                      {favs.has(c.id) ? "★" : "☆"}
                    </button>
                  )}
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">
                      📺
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {c.group ? `${c.group} · ` : ""}
                      {SOURCE_LABEL[c.source]}
                    </p>
                  </div>
                  {h && (
                    <span
                      title={h.ok ? `OK ${h.status ?? ""}` : h.error ?? `HTTP ${h.status ?? "?"}`}
                      className={`shrink-0 text-xs ${h.ok ? "text-emerald-500" : "text-red-500"}`}
                    >
                      {h.ok ? "● en ligne" : "● hors ligne"}
                    </span>
                  )}
                  <a
                    href={`/playlist/${c.id}`}
                    className="shrink-0 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    M3U
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(`id=${encodeURIComponent(c.id)}`)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    Suppr.
                  </button>
                </li>
              );
            })}
            {items.length === 0 && !loading && (
              <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Aucun résultat pour ce filtre.
              </li>
            )}
          </ul>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              {loading ? "Chargement…" : `${total.toLocaleString("fr-FR")} résultat(s)`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-zinc-600 transition-colors hover:border-indigo-400 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                ← Préc.
              </button>
              <span className="text-zinc-500 dark:text-zinc-400">
                {page} / {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-zinc-600 transition-colors hover:border-indigo-400 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                Suiv. →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
