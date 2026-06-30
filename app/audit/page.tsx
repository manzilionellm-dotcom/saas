"use client";

import { useState } from "react";
import Link from "next/link";
import type { AuditResult, Check, CheckStatus } from "../lib/seo-audit";

const STATUS_STYLE: Record<CheckStatus, { icon: string; cls: string }> = {
  pass: { icon: "✅", cls: "text-emerald-600 dark:text-emerald-400" },
  warn: { icon: "⚠️", cls: "text-amber-600 dark:text-amber-400" },
  fail: { icon: "❌", cls: "text-red-600 dark:text-red-400" },
};

const AREAS: Check["area"][] = ["SEO", "AEO/GEO", "Technique"];

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    const u = url.trim();
    if (!u) {
      setError("Entre une URL à analyser.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erreur");
      setResult(data as AuditResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/versailles" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Poste de commandement
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          🔎 Analyseur SEO / AEO de Versailles
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Donne une URL : Versailles télécharge réellement la page et l&apos;audite
          pour le référencement classique (SEO) et les moteurs de réponse (AEO/GEO).
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder="exemple.com ou https://exemple.com/page"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={analyze}
            disabled={loading}
            className="rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? "Analyse…" : "Analyser"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-8">
            <div className="flex items-center gap-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className={`text-5xl font-bold ${scoreColor(result.score)}`}>
                {result.score}
                <span className="text-2xl text-zinc-400">/100</span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                  {result.finalUrl}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  HTTP {result.httpStatus} · analysé à{" "}
                  {new Date(result.fetchedAt).toLocaleTimeString("fr-FR")}
                </p>
              </div>
            </div>

            {AREAS.map((area) => {
              const items = result.checks.filter((c) => c.area === area);
              if (items.length === 0) return null;
              return (
                <div key={area} className="mt-6">
                  <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {area}
                  </h2>
                  <ul className="space-y-2">
                    {items.map((c) => (
                      <li
                        key={c.id}
                        className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <span aria-hidden>{STATUS_STYLE[c.status].icon}</span>
                        <div>
                          <p className={`text-sm font-semibold ${STATUS_STYLE[c.status].cls}`}>
                            {c.label}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            {c.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
