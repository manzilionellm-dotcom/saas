"use client";

import Link from "next/link";

// Filet de sécurité (Keystone) : attrape toute erreur d'une page et propose
// de réessayer, au lieu de planter sur un écran blanc.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-zinc-950">
      <div className="max-w-md text-center">
        <p className="text-5xl" aria-hidden>🛟</p>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Un petit pépin, mais rien n&apos;est perdu
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Keystone a rattrapé l&apos;erreur avant qu&apos;elle ne casse l&apos;application.
          Tu peux réessayer tout de suite.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-xl border border-zinc-300 px-5 py-2.5 font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
