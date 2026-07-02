import { streamsStore } from "../../../lib/db/streams-store";
import { m3uResponse, M3U_HEADERS } from "../../../lib/playlist";

export const dynamic = "force-dynamic";

// GET /playlist/profile/<token>  →  playlist personnelle d'un profil.
// Sert ses favoris s'il en a, sinon toutes les chaînes. Le token est révocable
// depuis le panel (bouton « Nouveau lien ») : l'ancien lien cesse alors de marcher.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const profile = await streamsStore.getProfileByToken(token);
  if (!profile) {
    return new Response(`#EXTM3U\n# Lien invalide ou révoqué.\n`, {
      status: 404,
      headers: M3U_HEADERS,
    });
  }

  const settings = await streamsStore.getSettings();
  const epg = !!settings.epgUrl;

  if (profile.favorites.length > 0) {
    const favs = await streamsStore.getMany(profile.favorites);
    return m3uResponse(favs, { epg });
  }
  // Aucun favori : le profil voit tout le catalogue.
  const all = await streamsStore.list();
  return m3uResponse(all, { epg });
}
