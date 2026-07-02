import { streamsStore } from "../../../lib/db/streams-store";

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

  const source =
    profile.favorites.length > 0
      ? await streamsStore.getMany(profile.favorites)
      : await streamsStore.list();

  const channels = source.map((c) => ({
    id: c.id,
    name: c.name,
    logo: c.logo ?? null,
    group: c.group ?? null,
    url: c.url,
  }));

  return Response.json({ profile: profile.name, channels });
}
