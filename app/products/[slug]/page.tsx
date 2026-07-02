import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { products, getProduct } from "../../lib/products";

export const dynamic = "force-static";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Produit introuvable" };
  return {
    title: `${product.name} — ${product.tagline}`,
    description: product.description,
    openGraph: { title: product.name, description: product.tagline, type: "website" },
  };
}

// Liens d'action spécifiques à certains produits (produits réellement branchés).
const PRODUCT_LINKS: Record<string, { href: string; label: string }[]> = {
  streamcast: [
    { href: "/panel", label: "📡 Ouvrir le panel" },
    { href: "/watch", label: "▶️ Regarder maintenant" },
  ],
  versailles: [{ href: "/versailles", label: "👑 Poste de commandement" }],
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const links = PRODUCT_LINKS[slug] ?? [];

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Catalogue
        </Link>

        <div className="mt-6 flex items-start gap-4">
          <span className="text-5xl" aria-hidden>
            {product.icon}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {product.category}
              </span>
              {product.featured && (
                <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Nouveau
                </span>
              )}
              {product.comingSoon && (
                <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                  Bientôt
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {product.name}
            </h1>
            <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">{product.tagline}</p>
          </div>
        </div>

        <p className="mt-6 leading-7 text-zinc-700 dark:text-zinc-300">{product.description}</p>

        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {product.monthlyPrice} €
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">/ mois</span>
        </div>

        {links.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Fonctionnalités
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {product.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <span className="mt-0.5 text-emerald-500">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
