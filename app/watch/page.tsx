import Link from "next/link";
import { streamsStore } from "../lib/db/streams-store";
import { isPanelAuthed } from "../lib/panel-auth";

export const dynamic = "force-dynamic";

// Page d'accueil du lecteur. Pour l'admin : liste des profils et leur lien.
// Pour la famille : chacun utilise son lien personnel /watch/<token>.
export default async function WatchHome() {
  const authed = await isPanelAuthed();
  const profiles = authed ? await streamsStore.listProfiles() : [];

  return (
    <div className="min-h-full bg-zinc-950 font-sans text-zinc-100">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-4xl">📡</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">StreamCast — Regarder</h1>
        <p className="mt-2 text-zinc-400">
          Ouvrez votre lien personnel <code className="text-zinc-300">/watch/&lt;votre-lien&gt;</code>{" "}
          pour regarder directement dans le navigateur, sans rien installer.
        </p>

        {!authed ? (
          <p className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
            Demandez votre lien personnel à l&apos;administrateur (créé dans le panel). Chaque membre
            de la famille a le sien, révocable à tout moment.
          </p>
        ) : profiles.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
            Aucun profil pour l&apos;instant.{" "}
            <Link href="/panel" className="text-indigo-400 hover:underline">
              Créez-en un dans le panel
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-8 space-y-2">
            {profiles.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/watch/${p.token}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition-colors hover:border-indigo-600"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-indigo-400">Regarder →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10">
          <Link href="/panel" className="text-sm text-zinc-500 hover:text-zinc-300">
            ⚙️ Panel d&apos;administration
          </Link>
        </div>
      </main>
    </div>
  );
}
