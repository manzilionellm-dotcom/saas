import { createToken, MEMBER_COUNT } from "@/lib/tokens";
import LinksPanel from "./links-panel";

export default function Home() {
  const members = Array.from({ length: MEMBER_COUNT }, (_, i) => {
    const id = i + 1;
    return {
      id,
      name: `Membre ${id}`,
      token: createToken(id),
    };
  });

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Restream Famille
        </h1>
        <p className="max-w-md text-center text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Générez 15 liens personnels, un par membre de la famille. Chacun ouvre
          son lien et regarde ce qu&apos;il veut.
        </p>
        <LinksPanel members={members} />
      </main>
    </div>
  );
}
