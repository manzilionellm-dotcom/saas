"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bouquet, Channel, Profile } from "../lib/db/streams-store";

type Props = {
  grandTotal: number;
  groups: { group: string; count: number }[];
  origins: { origin: string; count: number }[];
  profiles: Profile[];
  bouquets: Bouquet[];
};

type HealthState = Record<string, { ok: boolean; status?: number; error?: string }>;

// Cible d'attribution des étoiles : un profil OU une catégorie.
type Target = { kind: "profile" | "bouquet"; id: string };

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

const SOURCE_LABEL: Record<Channel["source"], string> = {
  direct: "directe",
  m3u: "M3U",
  xtream: "Xtream",
};

const PAGE_SIZE = 50;

// Fusionne des ids dans une liste (ajout ou retrait), sans doublon.
function mergeIds(current: string[], ids: string[], add: boolean): string[] {
  const set = new Set(current);
  for (const id of ids) {
    if (add) set.add(id);
    else set.delete(id);
  }
  return [...set];
}

export default function ChannelBrowser({
  grandTotal,
  groups,
  origins,
  profiles: initialProfiles,
  bouquets: initialBouquets,
}: Props) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Channel[]>([]);
  const [total, setTotal] = useState(grandTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthState>({});
  const [checking, setChecking] = useState(false);

  // Profils et catégories en état local : les modifications (étoiles, création,
  // application) se voient immédiatement, même en changeant de cible.
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [bouquets, setBouquets] = useState<Bouquet[]>(initialBouquets);
  const [target, setTarget] = useState<Target | null>(
    initialProfiles[0]
      ? { kind: "profile", id: initialProfiles[0].id }
      : initialBouquets[0]
        ? { kind: "bouquet", id: initialBouquets[0].id }
        : null,
  );
  const [newCat, setNewCat] = useState("");
  const [applyProfileId, setApplyProfileId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const aiStop = useRef(false);

  // Chaînes de la cible active (favoris d'un profil, ou chaînes d'une catégorie).
  const favs = useMemo(() => {
    if (!target) return new Set<string>();
    if (target.kind === "profile") {
      return new Set(profiles.find((p) => p.id === target.id)?.favorites ?? []);
    }
    return new Set(bouquets.find((b) => b.id === target.id)?.channels ?? []);
  }, [target, profiles, bouquets]);

  const activeBouquet =
    target?.kind === "bouquet" ? bouquets.find((b) => b.id === target.id) ?? null : null;

  const targetName = target
    ? (target.kind === "profile"
        ? profiles.find((p) => p.id === target.id)?.name
        : bouquets.find((b) => b.id === target.id)?.name) ?? ""
    : "";

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

  // Bascule « toujours active » (24/7) ↔ « à la demande » pour une chaîne.
  async function toggleAlwaysOn(c: Channel) {
    const next = !c.alwaysOn;
    setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, alwaysOn: next } : x)));
    try {
      const res = await fetch(`/api/panel/channels?id=${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alwaysOn: next }),
      });
      if (!res.ok) throw new Error();
      setNotice(
        next
          ? `« ${c.name} » : toujours active. Cliquez « Restreamer toutes les chaînes » pour appliquer.`
          : `« ${c.name} » : repassée à la demande. Re-synchronisez pour appliquer.`,
      );
    } catch {
      // Revient à l'état précédent en cas d'échec.
      setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, alwaysOn: c.alwaysOn } : x)));
    }
  }

  // Définit/efface l'URL de secours d'une chaîne (petite saisie inline).
  async function editBackup(c: Channel) {
    const input = window.prompt(
      `URL de secours pour « ${c.name} » (si la source principale tombe, le lecteur bascule dessus). Laissez vide pour l'effacer.`,
      c.backupUrl ?? "",
    );
    if (input === null) return; // annulé
    const backupUrl = input.trim();
    try {
      const res = await fetch(`/api/panel/channels?id=${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setItems((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, backupUrl: backupUrl || undefined } : x)),
      );
      setNotice(
        backupUrl
          ? `Source de secours définie pour « ${c.name} ». Cliquez « Restreamer toutes les chaînes » pour appliquer.`
          : `Source de secours retirée de « ${c.name} ».`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  // Range les chaînes par catégorie avec l'IA, lot par lot (progression visible,
  // arrêtable). Ne touche que les chaînes sans catégorie.
  async function categorizeAI() {
    setAiBusy(true);
    setError(null);
    setNotice(null);
    aiStop.current = false;
    let total = 0;
    try {
      while (!aiStop.current) {
        const res = await fetch("/api/panel/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onlyUngrouped: true, limit: 40 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
        total += data.processed ?? 0;
        setNotice(
          `IA : ${total} chaîne(s) rangée(s)` +
            (data.remaining ? `, ${data.remaining} restante(s)…` : "") +
            (data.model ? ` (${data.model})` : ""),
        );
        if (data.done || (data.processed ?? 0) === 0 || aiStop.current) break;
      }
      setNotice(
        total > 0
          ? `IA : rangement terminé — ${total} chaîne(s) classée(s). Rechargement…`
          : "Toutes les chaînes ont déjà une catégorie.",
      );
      if (total > 0) setTimeout(() => window.location.reload(), 1300);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setAiBusy(false);
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

  // Ajoute/retire une chaîne de la cible active (profil ou catégorie).
  async function toggleFav(channelId: string) {
    if (!target) return;
    const add = !favs.has(channelId);
    if (target.kind === "profile") {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? {
                ...p,
                favorites: add
                  ? [...p.favorites, channelId]
                  : p.favorites.filter((f) => f !== channelId),
              }
            : p,
        ),
      );
      fetch(`/api/panel/profiles/${target.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite", channelId, add }),
      }).catch(() => {});
    } else {
      setBouquets((prev) =>
        prev.map((b) =>
          b.id === target.id
            ? {
                ...b,
                channels: add
                  ? [...b.channels, channelId]
                  : b.channels.filter((c) => c !== channelId),
              }
            : b,
        ),
      );
      fetch(`/api/panel/bouquets/${target.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", channelId, add }),
      }).catch(() => {});
    }
  }

  // Ajoute/retire d'un coup TOUTES les chaînes du filtre courant (thème/pays)
  // à la cible active. Récupère les ids côté serveur pour couvrir toutes les pages.
  async function bulkAssign(add: boolean) {
    if (!target) return;
    setError(null);
    try {
      const params = new URLSearchParams({ search, group, ids: "1" });
      const res = await fetch(`/api/panel/channels?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      const ids: string[] = data.ids ?? [];
      if (target.kind === "profile") {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === target.id ? { ...p, favorites: mergeIds(p.favorites, ids, add) } : p,
          ),
        );
        await fetch(`/api/panel/profiles/${target.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "favoriteMany", channelIds: ids, add }),
        });
      } else {
        setBouquets((prev) =>
          prev.map((b) =>
            b.id === target.id ? { ...b, channels: mergeIds(b.channels, ids, add) } : b,
          ),
        );
        await fetch(`/api/panel/bouquets/${target.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "toggleMany", channelIds: ids, add }),
        });
      }
      setNotice(
        `${ids.length} chaîne(s) ${add ? "ajoutée(s) à" : "retirée(s) de"} « ${targetName} ».`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  async function createCategory() {
    const name = newCat.trim();
    if (!name) return;
    setError(null);
    try {
      const res = await fetch("/api/panel/bouquets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setBouquets((prev) => [...prev, data.bouquet]);
      setTarget({ kind: "bouquet", id: data.bouquet.id });
      setNewCat("");
      setNotice(`Catégorie « ${name} » créée. Cochez ses chaînes avec l'étoile ☆.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  async function deleteCategory(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/panel/bouquets/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setBouquets((prev) => prev.filter((b) => b.id !== id));
      if (target?.kind === "bouquet" && target.id === id) {
        setTarget(profiles[0] ? { kind: "profile", id: profiles[0].id } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  // Applique la catégorie active à un profil : ce profil hérite de ses chaînes.
  async function applyCategory() {
    if (!activeBouquet || !applyProfileId) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/bouquets/${activeBouquet.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", profileId: applyProfileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setProfiles((prev) => prev.map((p) => (p.id === applyProfileId ? data.profile : p)));
      const pname = profiles.find((p) => p.id === applyProfileId)?.name ?? "profil";
      setNotice(
        `Catégorie « ${activeBouquet.name} » appliquée à ${pname} : ${data.profile.favorites.length} chaîne(s).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  const hasTargets = profiles.length > 0 || bouquets.length > 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? "bg-indigo-600 text-white"
        : "border border-zinc-300 text-zinc-600 hover:border-indigo-400 dark:border-zinc-700 dark:text-zinc-300"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Mes chaînes ({grandTotal.toLocaleString("fr-FR")})
        </h2>
        {grandTotal > 0 && (
          <div className="flex flex-wrap gap-2">
            {aiBusy ? (
              <button
                type="button"
                onClick={() => {
                  aiStop.current = true;
                }}
                className="rounded-xl border border-amber-400 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
              >
                ⏹ Arrêter le rangement
              </button>
            ) : (
              <button
                type="button"
                onClick={categorizeAI}
                title="L'IA attribue une catégorie aux chaînes qui n'en ont pas"
                className="rounded-xl border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
              >
                🤖 Ranger avec l&apos;IA
              </button>
            )}
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

      {/* Attribution des chaînes : à un profil, ou à une catégorie réutilisable */}
      {hasTargets && (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cochez les chaînes (étoile ☆) pour la cible sélectionnée. Une{" "}
            <strong>catégorie</strong> se définit une fois et s&apos;applique ensuite à autant de
            profils que vous voulez.
          </p>

          {profiles.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">Profils :</span>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTarget({ kind: "profile", id: p.id })}
                  className={chip(target?.kind === "profile" && target.id === p.id)}
                >
                  {p.name}{" "}
                  <span className="opacity-70">
                    ({p.favorites.length > 0 ? p.favorites.length : "tout"})
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Catégories :</span>
            {bouquets.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setTarget({ kind: "bouquet", id: b.id })}
                className={chip(target?.kind === "bouquet" && target.id === b.id)}
              >
                🏷️ {b.name} <span className="opacity-70">({b.channels.length})</span>
              </button>
            ))}
            <span className="inline-flex items-center gap-1">
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createCategory()}
                placeholder="Nouvelle catégorie…"
                className="w-40 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={createCategory}
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                + Catégorie
              </button>
            </span>
          </div>

          {/* Sélection en masse : tout le thème/pays filtré vers la cible active */}
          {target && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {group || search ? (
                  <>
                    Filtre en cours — <strong>{total.toLocaleString("fr-FR")}</strong> chaîne(s) :
                  </>
                ) : (
                  <>
                    Tout le catalogue — <strong>{total.toLocaleString("fr-FR")}</strong> chaîne(s) :
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => bulkAssign(true)}
                className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
              >
                ★ Tout ajouter à « {targetName} »
              </button>
              <button
                type="button"
                onClick={() => bulkAssign(false)}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-red-400 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                ☆ Tout retirer
              </button>
            </div>
          )}

          {/* Outils d'une catégorie active : appliquer à un profil, supprimer */}
          {activeBouquet && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Donner « {activeBouquet.name} » à :
              </span>
              <select
                value={applyProfileId}
                onChange={(e) => setApplyProfileId(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">Choisir un profil…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyCategory}
                disabled={!applyProfileId}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                Appliquer
              </button>
              <button
                type="button"
                onClick={() => deleteCategory(activeBouquet.id)}
                className="ml-auto rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                Supprimer la catégorie
              </button>
            </div>
          )}

          {notice && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {notice}
            </p>
          )}
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
                  {hasTargets && target && (
                    <button
                      type="button"
                      onClick={() => toggleFav(c.id)}
                      title={favs.has(c.id) ? "Retirer de la cible" : "Ajouter à la cible"}
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
                  <button
                    type="button"
                    onClick={() => editBackup(c)}
                    title={
                      c.backupUrl
                        ? "Source de secours définie — cliquez pour la modifier/retirer"
                        : "Ajouter une source de secours (bascule auto si la principale tombe)"
                    }
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                      c.backupUrl
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    }`}
                  >
                    {c.backupUrl ? "🛟 secours" : "🛟"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAlwaysOn(c)}
                    title={
                      c.alwaysOn
                        ? "Toujours active (24/7) — cliquez pour repasser à la demande"
                        : "À la demande (économe) — cliquez pour la garder toujours active"
                    }
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                      c.alwaysOn
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400"
                    }`}
                  >
                    {c.alwaysOn ? "⚡ 24/7" : "⏻"}
                  </button>
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
