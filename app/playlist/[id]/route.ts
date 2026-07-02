import { getStream, isConfigured, streams } from "../../lib/streams";
import { buildM3U } from "../../lib/m3u";
import { streamsStore } from "../../lib/db/streams-store";
import { channelToEntry, m3uResponse, M3U_HEADERS } from "../../lib/playlist";

export const dynamic = "force-dynamic";

// GET /playlist/all   →  M3U complet : chaînes du panel + flux configurés en dur.
// GET /playlist/<id>  →  M3U mono-chaîne (chaîne du panel ou flux hérité).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (id === "all") {
    const channels = await streamsStore.list();
    const settings = await streamsStore.getSettings();
    const entries = channels.map(channelToEntry);
    for (const s of streams) {
      if (!isConfigured(s)) continue;
      const attrs: Record<string, string> = { "tvg-id": s.id, "tvg-name": s.name };
      if (s.logo) attrs["tvg-logo"] = s.logo;
      if (s.group) attrs["group-title"] = s.group;
      entries.push({ name: s.name, url: s.sourceUrl, duration: "-1", attrs });
    }
    if (entries.length === 0) {
      return new Response(
        `#EXTM3U\n# Aucune chaîne configurée. Ajoutez vos sources dans /panel.\n`,
        { status: 200, headers: M3U_HEADERS },
      );
    }
    const header = settings.epgUrl ? '#EXTM3U url-tvg="/epg.xml"' : "#EXTM3U";
    const body = buildM3U({ entries }).replace(/^#EXTM3U/, header);
    return new Response(body, { status: 200, headers: M3U_HEADERS });
  }

  // Chaîne ajoutée depuis le panel (/panel).
  const channel = await streamsStore.get(id);
  if (channel) {
    return m3uResponse([channel]);
  }

  // Flux hérités (app/lib/streams.ts).
  const stream = getStream(id);
  if (!stream) {
    return new Response(`#EXTM3U\n# Flux introuvable : ${id}\n`, {
      status: 404,
      headers: M3U_HEADERS,
    });
  }

  if (!isConfigured(stream)) {
    // L'URL source autorisée n'a pas encore été renseignée (voir app/lib/streams.ts).
    return new Response(
      `#EXTM3U\n# Flux "${stream.name}" non configuré.\n# Renseignez l'URL source autorisée dans app/lib/streams.ts.\n`,
      { status: 503, headers: M3U_HEADERS },
    );
  }

  const attrs: Record<string, string> = {
    "tvg-id": stream.id,
    "tvg-name": stream.name,
  };
  if (stream.logo) attrs["tvg-logo"] = stream.logo;
  if (stream.group) attrs["group-title"] = stream.group;

  const m3u = buildM3U({
    entries: [
      {
        name: stream.name,
        url: stream.sourceUrl,
        duration: "-1",
        attrs,
      },
    ],
  });

  return new Response(m3u, { status: 200, headers: M3U_HEADERS });
}
