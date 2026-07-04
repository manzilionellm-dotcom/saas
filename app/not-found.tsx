import Link from "next/link";

// Page 404 bienveillante (Keystone) au lieu d'un message d'erreur brut.
export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-zinc-950">
      <div className="max-w-md text-center">
        <p className="text-5xl" aria-hidden>🧭</p>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Cette page n&apos;existe pas
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Le lien est peut-être ancien ou mal saisi. Revenons en terrain connu.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Retour au catalogue
        </Link>
      </div>
    </div>
  );
}
