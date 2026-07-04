import { notFound } from "next/navigation";
import { verifyToken } from "@/lib/tokens";
import Player from "./player";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const memberId = verifyToken(token);

  if (memberId === null) {
    notFound();
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Membre {memberId}
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Colle le lien du flux que tu veux regarder (m3u8, mp4, webm…) puis
          lance la lecture.
        </p>
        <Player memberId={memberId} />
      </main>
    </div>
  );
}
