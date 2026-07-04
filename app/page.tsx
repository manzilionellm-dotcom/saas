import { cookies } from "next/headers";
import { switchProfile } from "./lib/actions";
import {
  DEFAULT_PROFILE,
  PROFILES,
  PROFILE_COOKIE,
  getChannelsForProfile,
  isProfileId,
  type ProfileId,
} from "./lib/profiles";
import type { Channel } from "./lib/channels";

function ChannelCard({ channel, starred }: { channel: Channel; starred?: boolean }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
        {channel.number}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
          {starred ? "★ " : ""}
          {channel.name}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{channel.category}</p>
      </div>
    </li>
  );
}

export default async function Home() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PROFILE_COOKIE)?.value;
  const activeId: ProfileId = isProfileId(raw) ? raw : DEFAULT_PROFILE;
  const { profile, favorites, sections } = getChannelsForProfile(activeId);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Mes chaînes
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Profil actif : {profile.emoji} {profile.label} — {profile.tagline}
            </p>
          </div>
          <form action={switchProfile} className="flex gap-2">
            {Object.values(PROFILES).map((p) => (
              <button
                key={p.id}
                type="submit"
                name="profile"
                value={p.id}
                aria-pressed={p.id === activeId}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  p.id === activeId
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </form>
        </header>

        {favorites.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Favoris de {profile.label}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((channel) => (
                <ChannelCard key={channel.id} channel={channel} starred />
              ))}
            </ul>
          </section>
        )}

        {sections.map(({ category, channels }) => (
          <section key={category} className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {category}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel) => (
                <ChannelCard key={channel.id} channel={channel} />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
