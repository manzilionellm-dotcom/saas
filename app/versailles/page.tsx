"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Monitoring } from "../lib/monitor";

const INTERVAL_MS = 5 * 60 * 1000;

function Delta({ from, to, suffix = "" }: { from: number; to: number; suffix?: string }) {
  const diff = to - from;
  const up = diff >= 0;
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
        {to}
        {suffix}
      </span>
      <span
        className={
          up
            ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
            : "text-xs font-medium text-red-600 dark:text-red-400"
        }
      >
        {up ? "▲" : "▼"} {Math.abs(diff)}
      </span>
    </span>
  );
}

export default function VersaillesPage() {
  const [data, setData] = useState<Monitoring | null>(null);
  const [countdown, setCountdown] = useState(INTERVAL_MS / 1000);
  const [mission, setMission] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const lastFetch = useRef<number>(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/monitor", { cache: "no-store" });
      const json = (await res.json()) as Monitoring;
      setData(json);
      lastFetch.current = Date.now();
      setCountdown(INTERVAL_MS / 1000);
    } catch {
      // silencieux : on réessaiera au prochain cycle
    }
  }, []);

  // Première vérification + vérification automatique toutes les 5 minutes.
  useEffect(() => {
    // fetch au montage : effet de synchronisation externe, setState après await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const id = setInterval(refresh, INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Compte à rebours visuel (chaque seconde).
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function sendMission() {
    const m = mission.trim();
    if (!m) return;
    setReply(
      `Ok — aujourd'hui : ${m}. Je vérifie tous vos sites toutes les 5 minutes, j'applique les améliorations SEO/GEO/AEO et je vous fais le point. À vos ordres. 🪖`,
    );
  }

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/"
          className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Retour au catalogue
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            👑 Versailles — poste de commandement
          </h1>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Vérification auto dans {mm}:{ss}
          </div>
        </div>

        {/* Mission du jour */}
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/40">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            🪖 Mission du jour
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMission()}
              placeholder="Ex. : Aujourd'hui, on fait le SEO de tous les sites"
              className="flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2 text-zinc-900 focus:border-amber-500 focus:outline-none dark:border-amber-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={sendMission}
              className="rounded-xl bg-amber-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Donner l&apos;ordre
            </button>
          </div>
          {reply && (
            <p className="mt-3 text-amber-900 dark:text-amber-100">{reply}</p>
          )}
        </div>

        {/* Briefing du matin */}
        {data && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              📋 Briefing
            </p>
            <p className="mt-1 text-lg text-zinc-800 dark:text-zinc-100">
              Hier, le SEO moyen de vos sites était à{" "}
              <strong>{data.summary.seoYesterday}</strong>. Maintenant, il est à{" "}
              <strong>{data.summary.seoNow}</strong>{" "}
              <span
                className={
                  data.summary.seoNow >= data.summary.seoYesterday
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                ({data.summary.seoNow >= data.summary.seoYesterday ? "+" : ""}
                {data.summary.seoNow - data.summary.seoYesterday})
              </span>
              .
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Dernière vérification :{" "}
              {new Date(data.checkedAt).toLocaleTimeString("fr-FR")} · toutes les{" "}
              {data.intervalMinutes} min
            </p>
          </div>
        )}

        {/* Sites surveillés */}
        {data && (
          <div className="mt-6">
            <h2 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Sites surveillés ({data.sites.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.sites.map((s) => (
                <div
                  key={s.domain}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {s.domain}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <dt>SEO</dt>
                    <dd className="text-right">
                      <Delta from={s.yesterday.seo} to={s.now.seo} />
                    </dd>
                    <dt>AEO (réponses)</dt>
                    <dd className="text-right">
                      <Delta from={s.yesterday.aeo} to={s.now.aeo} />
                    </dd>
                    <dt>Citations IA (GEO)</dt>
                    <dd className="text-right">
                      <Delta from={s.yesterday.geo} to={s.now.geo} />
                    </dd>
                    <dt>Mots-clés suivis</dt>
                    <dd className="text-right">
                      <Delta from={s.yesterday.keywords} to={s.now.keywords} />
                    </dd>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Veille marché (autre IA) */}
        {data && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              📈 Veille marché 24/7
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Tendances et mots-clés repérés par l&apos;IA de veille.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.market.map((m) => (
                <li
                  key={m.keyword}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {m.keyword}{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {m.trend}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          Données de démonstration qui évoluent toutes les 5 min. Connectez vos
          sites (Vercel) pour des mesures réelles.
        </p>
      </main>
    </div>
  );
}
