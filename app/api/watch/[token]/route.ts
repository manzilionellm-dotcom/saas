import { streamsStore } from "../../../lib/db/streams-store";
import { playbackUrl, backupPlaybackUrl } from "../../../lib/mediamtx";

export const dynamic = "force-dynamic";

// GET /api/watch/<token> -> chaînes visibles par ce profil (pour le lecteur web).
// Public mais protégé par le token du profil (révocable depuis le panel).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const profile = await streamsStore.getProfileByToken(token);
  if (!profile) {
    return Response.json({ error: "Lien invalide ou révoqué." }, { status: 404 });
  }

  const [source, settings] = await Promise.all([
    profile.favorites.length > 0
      ? streamsStore.getMany(profile.favorites)
      : streamsStore.list(),
    streamsStore.getSettings(),
  ]);

  // On ne sert QUE l'URL restreamée par MediaMTX (source tirée une fois pour
  // toute la famille). On ne renvoie jamais l'URL source du fournisseur au
  // client : une chaîne sans URL de diffusion est simplement écartée.
  const channels = source
    .map((c) => ({
      id: c.id,
      name: c.name,
      logo: c.logo ?? null,
      group: c.group ?? null,
      url: playbackUrl(settings.hlsBaseUrl, c),
      backupUrl: backupPlaybackUrl(settings.hlsBaseUrl, c),
    }))
    .filter((c): c is typeof c & { url: string } => c.url !== null);

  // Des chaînes existent mais aucune n'est diffusable = serveur de diffusion non
  // réglé. On le dit clairement au lieu d'afficher un lecteur vide.
  if (source.length > 0 && channels.length === 0) {
    return Response.json(
      { error: "Diffusion non configurée : réglez le serveur de diffusion dans le panel." },
      { status: 503 },
    );
  }

  return Response.json({ profile: profile.name, channels });
}
