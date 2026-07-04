"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdvisorComment } from "../lib/advisors";

type Chair = { name: string; role: string; icon: string };

export default function MeetingPage() {
  const [question, setQuestion] = useState("");
  const [chair, setChair] = useState<Chair | null>(null);
  const [intro, setIntro] = useState<string>("");
  const [comments, setComments] = useState<AdvisorComment[]>([]);
  const [decision, setDecision] = useState<string>("");
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
    setChair(null);
    setIntro("");
    setComments([]);
    setDecision("");
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
      setChair(data.chair);
      setComments(list);

      // Versailles ouvre, puis chaque pôle parle à son tour, puis Versailles tranche.
      setTimeout(() => setIntro(data.intro), 300);
      list.forEach((_, i) => {
        setTimeout(() => setVisible(i + 1), 700 + 450 * i);
      });
      setTimeout(() => setDecision(data.decision), 700 + 450 * list.length);
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
            {intro && chair && (
              <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-700 dark:bg-amber-950/40">
                <span className="text-2xl" aria-hidden>
                  {chair.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {chair.name}{" "}
                    <span className="font-normal text-amber-600/80 dark:text-amber-400/80">
                      · {chair.role}
                    </span>
                  </p>
                  <p className="mt-0.5 text-amber-900 dark:text-amber-100">
                    {intro}
                  </p>
                </div>
              </div>
            )}

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

            {decision && chair && (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {chair.icon} Décision de {chair.name}
                </p>
                <p className="mt-1 text-amber-900 dark:text-amber-100">
                  {decision}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
