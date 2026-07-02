import Player from "./Player";

export const dynamic = "force-dynamic";

// Lecteur web d'un profil : /watch/<token>. Aucune installation côté famille.
export default async function WatchProfilePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <Player token={token} />;
}
