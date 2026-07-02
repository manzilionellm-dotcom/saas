import Link from "next/link";
import { streamsStore } from "../lib/db/streams-store";
import { isPanelAuthed, panelPassword } from "../lib/panel-auth";
import LoginForm from "./LoginForm";
import AddSourceForm from "./AddSourceForm";
import ChannelList from "./ChannelList";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const authed = await isPanelAuthed();

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Catalogue
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          📡 Panel — Mes sources
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Ajoutez vos chaînes vous-même : playlist M3U, compte Xtream Codes ou URL directe.
        </p>

        {!authed ? (
          <div className="mt-8 max-w-sm">
            <LoginForm />
          </div>
        ) : (
          <>
            {!panelPassword() && (
              <p className="mt-6 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                ⚠️ Aucun mot de passe configuré : le panel est ouvert. Définissez{" "}
                <code>APP_PASSWORD</code> dans <code>.env.local</code> avant toute mise en ligne.
              </p>
            )}
            <p className="mt-4 rounded-lg bg-zinc-100 px-4 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              ⚠️ N&apos;ajoutez que des sources que vous possédez ou que vous êtes autorisé à
              utiliser/redistribuer.
            </p>

            <section className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Ajouter une source
              </h2>
              <div className="mt-3">
                <AddSourceForm />
              </div>
            </section>

            <section className="mt-10">
              <ChannelList
                total={await streamsStore.count()}
                channels={await streamsStore.preview(300)}
                origins={await streamsStore.origins()}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
