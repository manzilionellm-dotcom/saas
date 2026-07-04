"use client";

import { useState } from "react";
import Link from "next/link";
import { findOffers, type Offer, type SearchMode, type SearchResult } from "../lib/sourcing";
import { addMemory } from "../lib/memory";

function Badges({ o }: { o: Offer }) {
  return (
    <span className="ml-2 inline-flex gap-1 align-middle">
      {o.kind === "factory" && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">usine</span>
      )}
      {o.verified && (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">✓ vérifié</span>
      )}
      {o.euOk && (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">🇪🇺 UE</span>
      )}
    </span>
  );
}

export default function SilkRoutePage() {
  const [product, setProduct] = useState("");
  const [imageName, setImageName] = useState("");
  const [mode, setMode] = useState<SearchMode>("quality");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searched, setSearched] = useState("");

  function search(nextMode: SearchMode = mode) {
    const term = product.trim() || imageName.trim();
    if (!term) return;
    const r = findOffers(term, nextMode);
    setResult(r);
    setSearched(term);
    setMode(nextMode);
    addMemory("search", `SilkRoute (${nextMode === "quality" ? "qualité" : "moins cher"}) : ${term}`);
  }

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            ← Retour au catalogue
          </Link>
          <Link href="/guide/chine" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            🇨🇳 Guide du marché chinois
          </Link>
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          🐉 SilkRoute — la perfection au meilleur prix
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Décris un produit ou donne une image (ex. un sac à main femme). SilkRoute
          privilégie les mieux notés, les originaux vérifiés et acceptés en Europe,
          puis donne le meilleur total livré en Suède.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ex. : sac à main femme cuir"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => search()}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Chercher
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="cursor-pointer text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            📷 Donner une image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageName(e.target.files?.[0]?.name ?? "")}
            />
          </label>
          {imageName && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Image : {imageName}
            </span>
          )}

          <div className="ml-auto flex items-center gap-1 rounded-lg border border-zinc-300 p-1 dark:border-zinc-700">
            {(["quality", "cheap"] as SearchMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => search(m)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-600 hover:text-indigo-600 dark:text-zinc-300"
                }`}
              >
                {m === "quality" ? "Meilleure qualité" : "Moins cher"}
              </button>
            ))}
          </div>
        </div>

        {result && (
          <div className="mt-8">
            {/* Meilleur choix */}
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-700 dark:bg-emerald-950/40">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {mode === "quality" ? "🏆 Meilleure qualité" : "💸 Le moins cher"} pour « {searched} »
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-100">
                {result.best.total} € · {result.best.platform}
              </p>
              <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-300/90">
                ⭐ {result.best.rating}/5 · {result.best.reviews.toLocaleString("fr-FR")} avis ·{" "}
                {result.best.sellerYears} ans · qualité {result.best.qualityScore}/100
                <Badges o={result.best} />
              </p>
              <a
                href={result.best.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                🛒 Acheter sur {result.best.platform} →
              </a>
            </div>

            {/* Détails experts du meilleur choix */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  💰 Coût d&apos;atterrissage (tout compris)
                </p>
                <dl className="grid grid-cols-2 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <dt>Article</dt><dd className="text-right">{result.best.itemPrice} €</dd>
                  <dt>Port → Suède</dt><dd className="text-right">{result.best.shipping} €</dd>
                  <dt>Douane</dt><dd className="text-right">{result.best.customsDuty} €</dd>
                  <dt>TVA 25 %</dt><dd className="text-right">{result.best.vat} €</dd>
                  <dt>Frais d&apos;agent</dt><dd className="text-right">{result.best.agentFee} €</dd>
                  <dt>Change/paiement</dt><dd className="text-right">{result.best.paymentFee} €</dd>
                  <dt>Assurance</dt><dd className="text-right">{result.best.insurance} €</dd>
                  <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Total</dt>
                  <dd className="text-right font-bold text-zinc-900 dark:text-zinc-50">{result.best.total} €</dd>
                </dl>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  🔬 Fiabilité & impact
                </p>
                <dl className="grid grid-cols-2 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <dt>Livraison</dt><dd className="text-right">{result.best.deliveryDays} j</dd>
                  <dt>Taux de remboursement</dt><dd className="text-right">{result.best.refundRate} %</dd>
                  <dt>Taux de réponse</dt><dd className="text-right">{result.best.responseRate} %</dd>
                  <dt>Taux de réachat</dt><dd className="text-right">{result.best.reorderRate} %</dd>
                  <dt>Risque contrefaçon</dt><dd className="text-right">{result.best.counterfeitRisk}</dd>
                  <dt>Empreinte CO₂</dt><dd className="text-right">{result.best.co2Kg} kg</dd>
                </dl>
              </div>
            </div>

            {/* Insights que SilkRoute calcule pour vous */}
            <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
              <p className="mb-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                💡 Détails experts (ce qu&apos;un humain ne calcule pas)
              </p>
              <ul className="space-y-1.5 text-sm text-indigo-900 dark:text-indigo-100">
                {result.insights.map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ul>
            </div>

            {/* Alternative moins chère */}
            {result.cheaper && (
              <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  💸 Alternative moins chère (toujours acceptable)
                </p>
                <p className="mt-1 text-zinc-800 dark:text-zinc-100">
                  {result.cheaper.total} € · {result.cheaper.platform} · ⭐{" "}
                  {result.cheaper.rating}/5
                  <Badges o={result.cheaper} />
                </p>
                <a
                  href={result.cheaper.buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-200 dark:hover:text-indigo-400"
                >
                  🛒 Acheter sur {result.cheaper.platform} →
                </a>
              </div>
            )}

            {/* Tableau complet */}
            <table className="mt-6 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  <th className="py-2">Plateforme</th>
                  <th className="py-2 text-right">Note</th>
                  <th className="py-2 text-right">Avis</th>
                  <th className="py-2 text-right">Qualité</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Acheter</th>
                </tr>
              </thead>
              <tbody>
                {result.offers.map((o) => (
                  <tr
                    key={o.platform}
                    className={`border-b border-zinc-100 dark:border-zinc-800 ${
                      o.best ? "bg-emerald-50 font-semibold dark:bg-emerald-950/30" : ""
                    }`}
                  >
                    <td className="py-2 text-zinc-800 dark:text-zinc-200">
                      <a
                        href={o.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {o.platform}
                      </a>
                      <Badges o={o} />
                    </td>
                    <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">⭐ {o.rating}</td>
                    <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{o.reviews.toLocaleString("fr-FR")}</td>
                    <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{o.qualityScore}</td>
                    <td className="py-2 text-right text-zinc-900 dark:text-zinc-50">{o.total} €</td>
                    <td className="py-2 text-right">
                      <a
                        href={o.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                      >
                        🛒 Acheter
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 text-xs text-zinc-400">
              « Acceptable » = original vérifié + accepté en Europe. Les prix et
              scores sont estimés (démo) ; les liens « Acheter » ouvrent la vraie
              recherche du produit sur chaque plateforme, prêts à commander.
              Recherche enregistrée dans la mémoire de Versailles.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
