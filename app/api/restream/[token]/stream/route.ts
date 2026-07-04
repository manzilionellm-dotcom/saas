import { getEndpoint, getSource, markEndpoint } from "../../../../lib/restream";

// A relay endpoint. Each generated token maps here and streams the ONE
// authorized upstream source through to the requesting device. Playlists are
// rewritten so segment URLs resolve; other content types are passed through.

const PLAYLIST_TYPES = [
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "audio/mpegurl",
];

function isPlaylist(url: string, contentType: string | null): boolean {
  if (contentType && PLAYLIST_TYPES.some((t) => contentType.includes(t))) return true;
  return /\.m3u8?(\?|$)/i.test(url);
}

// Resolve relative URIs in an M3U/M3U8 playlist to absolute ones against the
// authorized source, so the player fetches segments from the same origin.
function rewritePlaylist(body: string, sourceUrl: string): string {
  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      try {
        return new URL(trimmed, sourceUrl).toString();
      } catch {
        return line;
      }
    })
    .join("\n");
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  const endpoint = getEndpoint(token);
  if (!endpoint) {
    return new Response("Endpoint de restream inconnu", { status: 404 });
  }

  const { url: sourceUrl } = getSource();
  if (!sourceUrl) {
    markEndpoint(token, "offline", "Aucune source autorisée configurée");
    return new Response("Aucune source autorisée configurée (RESTREAM_SOURCE_URL)", {
      status: 503,
    });
  }

  try {
    const upstream = await fetch(sourceUrl, {
      headers: { "User-Agent": "saas-restream-relay" },
    });

    if (!upstream.ok) {
      markEndpoint(token, "error", `Source HTTP ${upstream.status}`);
      console.error(`[restream] ${token} upstream ${upstream.status}`);
      return new Response(`Source indisponible (${upstream.status})`, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type");

    if (isPlaylist(sourceUrl, contentType)) {
      const text = await upstream.text();
      markEndpoint(token, "online");
      return new Response(rewritePlaylist(text, sourceUrl), {
        status: 200,
        headers: {
          "content-type": "application/vnd.apple.mpegurl",
          "cache-control": "no-store",
        },
      });
    }

    // Stream the bytes straight through for direct streams (TS/MP4/MPEG-TS…).
    markEndpoint(token, "online");
    const headers = new Headers();
    if (contentType) headers.set("content-type", contentType);
    headers.set("cache-control", "no-store");
    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de relais";
    markEndpoint(token, "error", message);
    console.error(`[restream] ${token} error: ${message}`);
    return new Response(`Erreur de relais: ${message}`, { status: 502 });
  }
}
