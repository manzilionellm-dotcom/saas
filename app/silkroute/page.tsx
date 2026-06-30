"use client";

import { useState } from "react";
import Link from "next/link";
import { findOffers, type Offer } from "../lib/sourcing";
import { addMemory } from "../lib/memory";

export default function SilkRoutePage() {
  const [product, setProduct] = useState("");
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [searched, setSearched] = useState("");

  function search() {
    const p = product.trim();
    if (!p) return;
    const result = findOffers(p);
    setOffers(result);
    setSearched(p);
    addMemory("search", `Recherche SilkRoute : ${p}`);
  }

  const best = offers?.find((o) => o.best);
  const factory = offers?.find((o) => o.kind === "factory");

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Retour au catalogue
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          🐉 SilkRoute — meilleur prix livré en Suède
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Décris un produit (ex. « montre automatique homme ») ou colle un lien.
          SilkRoute compare les plateformes, vérifie le prix usine et calcule le
          total tout compris (port + TVA 25 %).
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ex. : montre automatique homme"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={search}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Chercher le meilleur prix
          </button>
        </div>

        {offers && best && (
          <div className="mt-8">
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-700 dark:bg-emerald-950/40">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                ✅ Meilleur prix total pour « {searched} »
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-100">
                {best.total} € via {best.platform}
              </p>
              {factory && (
                <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-300/90">
                  Prix usine (1688) : {factory.total} € tout compris —{" "}
                  {best.kind === "factory"
                    ? "c'est l'usine qui gagne 🏭"
                    : `${(best.total <= factory.total ? "moins cher" : "plus cher")} qu'en passant par l'usine`}
                  .
                </p>
              )}
            </div>

            <table className="mt-6 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  <th className="py-2">Plateforme</th>
                  <th className="py-2 text-right">Article</th>
                  <th className="py-2 text-right">Port</th>
                  <th className="py-2 text-right">TVA</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr
                    key={o.platform}
                    className={`border-b border-zinc-100 dark:border-zinc-800 ${
                      o.best ? "bg-emerald-50 font-semibold dark:bg-emerald-950/30" : ""
                    }`}
                  >
                    <td className="py-2 text-zinc-800 dark:text-zinc-200">
                      {o.platform}
                      {o.kind === "factory" && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          usine
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{o.itemPrice} €</td>
                    <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{o.shipping} €</td>
                    <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{o.vat} €</td>
                    <td className="py-2 text-right text-zinc-900 dark:text-zinc-50">{o.total} €</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 text-xs text-zinc-400">
              Prix de démonstration (déterministes). Recherche enregistrée dans la
              mémoire de Versailles. En production : vraies données via les API des
              plateformes.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
