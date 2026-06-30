import { getStream, isConfigured } from "../../lib/streams";
import { buildM3U } from "../../lib/m3u";

const M3U_HEADERS = {
  "Content-Type": "audio/x-mpegurl; charset=utf-8",
  "Content-Disposition": "inline",
};

// GET /playlist/<id>  →  sert un M3U mono-chaîne pour le flux demandé.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
