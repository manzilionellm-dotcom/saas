import Link from "next/link";
import { products, categories } from "./lib/products";

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
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
          {products.map((product) => (
            <li key={product.slug}>
              <Link
                href={`/products/${product.slug}`}
                className={`group flex h-full flex-col rounded-2xl border bg-white p-6 transition-all hover:shadow-lg dark:bg-zinc-900 ${
                  product.featured
                    ? "border-indigo-500 ring-1 ring-indigo-500/30"
                    : "border-zinc-200 hover:border-indigo-400 dark:border-zinc-800 dark:hover:border-indigo-500"
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <span className="text-3xl" aria-hidden>
                    {product.icon}
                  </span>
                  <div className="flex items-center gap-2">
                    {product.featured && (
                      <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                        Nouveau
                      </span>
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
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Démo SaaS — 30 produits
      </footer>
    </div>
  );
}
