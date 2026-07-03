import { streamsStore } from "../../../lib/db/streams-store";
import { playbackUrl } from "../../../lib/mediamtx";

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

  // Si un serveur de diffusion est configuré, on sert l'URL restreamée par
  // MediaMTX (source tirée une fois pour toute la famille) ; sinon la source.
  const channels = source.map((c) => ({
    id: c.id,
    name: c.name,
    logo: c.logo ?? null,
    group: c.group ?? null,
    url: playbackUrl(settings.hlsBaseUrl, c),
  }));

  return Response.json({ profile: profile.name, channels });
}
