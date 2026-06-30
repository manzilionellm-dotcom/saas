"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdvisorComment } from "../lib/advisors";

export default function MeetingPage() {
  const [question, setQuestion] = useState("");
  const [comments, setComments] = useState<AdvisorComment[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [visible, setVisible] = useState(0); // nb de commentaires révélés
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    const q = question.trim();
    if (!q) {
      setError("Pose d'abord une question à l'équipe.");
      return;
    }
    setError(null);
    setLoading(true);
    setComments([]);
    setSummary("");
    setVisible(0);

    try {
      const res = await fetch("/api/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erreur");

      const list: AdvisorComment[] = data.comments;
      setComments(list);

      // Révélation progressive : un intervenant après l'autre.
      list.forEach((_, i) => {
        setTimeout(() => setVisible(i + 1), 450 * (i + 1));
      });
      setTimeout(() => setSummary(data.summary), 450 * (list.length + 1));
    } catch {
      setError("Impossible de lancer la réunion. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Retour au catalogue
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          🗣️ Réunion d&apos;équipe IA
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Pose une question. Chaque expert (par catégorie) te répond avec son
          point de vue, comme autour d&apos;une table.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ex. : Je veux lancer une appli de livraison, que faire ?"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={ask}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "…" : "Lancer la réunion"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {comments.length > 0 && (
          <div className="mt-8 space-y-3">
            {comments.slice(0, visible).map((c, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-2xl" aria-hidden>
                  {c.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {c.role}{" "}
                    <span className="font-normal text-zinc-400">
                      · {c.category}
                    </span>
                  </p>
                  <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                    {c.comment}
                  </p>
                </div>
              </div>
            ))}

            {visible < comments.length && (
              <p className="px-2 text-sm italic text-zinc-400">
                Les autres réfléchissent…
              </p>
            )}

            {summary && (
              <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  🧩 Synthèse du facilitateur
                </p>
                <p className="mt-1 text-indigo-900 dark:text-indigo-100">
                  {summary}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
