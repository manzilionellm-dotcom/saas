import { buildM3U, type M3UEntry } from "./m3u";
import type { Channel } from "./db/streams-store";

export const M3U_HEADERS = {
  "Content-Type": "audio/x-mpegurl; charset=utf-8",
  "Content-Disposition": "inline",
};

export function channelToEntry(c: Channel): M3UEntry {
  const attrs: Record<string, string> = { "tvg-id": c.tvgId || c.id, "tvg-name": c.name };
  if (c.logo) attrs["tvg-logo"] = c.logo;
  if (c.group) attrs["group-title"] = c.group;
  return { name: c.name, url: c.url, duration: "-1", attrs };
}

// Construit une réponse M3U, en déclarant l'URL de l'EPG (url-tvg) si un EPG est servi.
export function m3uResponse(channels: Channel[], opts: { epg?: boolean } = {}): Response {
  const entries = channels.map(channelToEntry);
  const header = opts.epg ? '#EXTM3U url-tvg="/epg.xml"' : "#EXTM3U";
  const body = buildM3U({ entries }).replace(/^#EXTM3U/, header);
  return new Response(body, { status: 200, headers: M3U_HEADERS });
}
