import { streamsStore } from "../../../lib/db/streams-store";
import { m3uResponse, M3U_HEADERS } from "../../../lib/playlist";
import { playbackUrl } from "../../../lib/mediamtx";

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

  // Sert les chaînes via MediaMTX. On n'inclut jamais l'URL source du
  // fournisseur dans la playlist : une chaîne sans URL de diffusion est écartée.
  const source =
    profile.favorites.length > 0
      ? await streamsStore.getMany(profile.favorites) // ses favoris…
      : await streamsStore.list(); // …sinon tout le catalogue.
  const channels = source
    .map((c) => ({ ...c, url: playbackUrl(settings.hlsBaseUrl, c) }))
    .filter((c): c is typeof c & { url: string } => c.url !== null);
  return m3uResponse(channels, { epg });
}
