import type { Metadata } from "next";
import Link from "next/link";
import { products, categories } from "./lib/products";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Catalogue SaaS Suite",
  numberOfItems: products.length,
  itemListElement: products.slice(0, 12).map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: p.name,
    url: `https://saas-suite.example.com/products/${p.slug}`,
  })),
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Combien d'outils propose la suite SaaS ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `La suite propose ${products.length} outils SaaS couvrant les ventes, le marketing, le support, le développement, la finance et plus.`,
      },
    },
    {
      "@type": "Question",
      name: "Qu'est-ce que Versailles ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Versailles est l'agent IA qui pilote tous vos sites en SEO, GEO et AEO, exécute les tâches à votre place et préside vos réunions d'équipe IA.",
      },
    },
    {
      "@type": "Question",
      name: "Le GEO et l'AEO, qu'est-ce que c'est ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le GEO (Generative Engine Optimization) optimise votre présence dans les IA génératives comme ChatGPT, Perplexity et Gemini. L'AEO (Answer Engine Optimization) optimise pour les moteurs de réponse.",
      },
    },
  ],
};

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* En-tête / héro */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Suite logicielle
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            {products.length} outils SaaS pour faire grandir votre entreprise
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Ventes, marketing, support, développement et plus encore. Choisissez
            les outils dont vous avez besoin, payez à l&apos;usage.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/versailles"
              className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              👑 Poste de commandement Versailles
            </Link>
            <Link
              href="/meeting"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              🗣️ Réunion d&apos;équipe IA
            </Link>
            <Link
              href="/silkroute"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              🐉 SilkRoute : meilleur prix
            </Link>
            <Link
              href="/memory"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              🧠 Mémoire de Versailles
            </Link>
            <Link
              href="/tools/m3u"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              📺 Outil : cloneur de playlist M3U
            </Link>
          </div>
        </div>
      </header>

      {/* Catalogue */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Catalogue
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {products.length} produits · {categories.length} catégories
          </span>
        </div>

        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const cardBody = (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <span className="text-3xl" aria-hidden>
                    {product.icon}
                  </span>
                  <div className="flex items-center gap-2">
                    {product.comingSoon ? (
                      <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                        Bientôt
                      </span>
                    ) : (
                      product.featured && (
                        <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                          Nouveau
                        </span>
                      )
                    )}
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {product.category}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-50 dark:group-hover:text-indigo-400">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {product.tagline}
                </p>
                <p className="mt-3 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  {product.description}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {product.monthlyPrice} €
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    / mois
                  </span>
                </div>
              </>
            );

            return (
              <li key={product.slug}>
                {product.comingSoon ? (
                  <div
                    aria-disabled
                    className="flex h-full cursor-not-allowed flex-col rounded-2xl border border-dashed border-zinc-300 bg-zinc-100 p-6 opacity-60 grayscale dark:border-zinc-700 dark:bg-zinc-900/50"
                  >
                    {cardBody}
                  </div>
                ) : (
                  <Link
                    href={`/products/${product.slug}`}
                    className={`group flex h-full flex-col rounded-2xl border bg-white p-6 transition-all hover:shadow-lg dark:bg-zinc-900 ${
                      product.featured
                        ? "border-indigo-500 ring-1 ring-indigo-500/30"
                        : "border-zinc-200 hover:border-indigo-400 dark:border-zinc-800 dark:hover:border-indigo-500"
                    }`}
                  >
                    {cardBody}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Démo SaaS — {products.length} produits
      </footer>
    </div>
  );
}
