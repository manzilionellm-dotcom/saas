"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/dropship/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rawDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erreur");
      router.push(`/dropship/${data.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Nom du projet
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Accessoire de bureau premium" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Décris ton idée (texte libre)
          <textarea
            className={input}
            rows={4}
            value={rawDescription}
            onChange={(e) => setRawDescription(e.target.value)}
            placeholder="Quel type de produit, quelle cible, quel marché, quel budget pub approximatif…"
          />
        </label>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? "Création…" : "Lancer le copilot"}
      </button>
    </form>
  );
}
