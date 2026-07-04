import Link from "next/link";
import {
  buildEndpointUrl,
  getSource,
  listEndpoints,
} from "../lib/restream";
import RestreamPanel from "./RestreamPanel";

// Rendu dynamique : l'état des relais dépend de la requête (et de la source).
export const dynamic = "force-dynamic";

export default function RestreamPage() {
  const source = getSource();
  // Le rendu serveur initial n'expose pas d'origine fiable ; le panneau
  // client rechargera les URLs absolues via l'API dès le montage.
  const initial = {
    source: { name: source.name, configured: source.configured },
    endpoints: listEndpoints().map((ep) => ({
      id: ep.id,
      url: buildEndpointUrl("", ep.token),
      status: ep.status,
      lastError: ep.lastError,
      lastCheckedAt: ep.lastCheckedAt,
    })),
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Mes chaînes
        </Link>
        <header className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Restream vers la maison
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Génère plusieurs liens indépendants à partir de votre source
            autorisée, un par appareil, pour que chacun regarde de son côté sans
            gêner les autres. C&apos;est un relais : tous les liens lisent la
            même source autorisée.
          </p>
        </header>
        <section className="mt-8">
          <RestreamPanel initial={initial} />
        </section>
      </main>
    </div>
  );
}
