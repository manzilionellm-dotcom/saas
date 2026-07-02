"use client";

import { useState } from "react";
import type { Profile } from "../lib/db/streams-store";

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

function playlistUrl(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/playlist/profile/${token}`;
}

export default function ProfilesPanel({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setProfiles((prev) => [...prev, data.profile]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  async function rotate(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/panel/profiles/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setProfiles((prev) => prev.map((p) => (p.id === id ? data.profile : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/panel/profiles?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(playlistUrl(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // presse-papiers indisponible : l'utilisateur peut copier le champ manuellement
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Profils famille</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Un lien de lecture par personne, révocable à tout moment (« Nouveau lien »). Sans favori, le
        profil voit tout le catalogue ; avec des favoris (⭐ dans la liste plus bas), il ne voit que
        les siens.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Nom du profil (ex. Papa, Salon, Enfants…)"
        />
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          + Profil
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {profiles.length > 0 && (
        <ul className="mt-4 space-y-2">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {p.name}{" "}
                  <span className="text-xs font-normal text-zinc-400">
                    ({p.favorites.length > 0 ? `${p.favorites.length} favori(s)` : "tout le catalogue"})
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/watch/${p.token}`}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                  >
                    ▶ Regarder
                  </a>
                  <button
                    type="button"
                    onClick={() => rotate(p.id)}
                    className="rounded-lg px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
                  >
                    ↻ Nouveau lien
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={playlistUrl(p.token)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full truncate rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => copy(p.token)}
                  className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {copied === p.token ? "Copié ✓" : "Copier"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
