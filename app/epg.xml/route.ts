import { streamsStore } from "../lib/db/streams-store";
import { safeFetch } from "../lib/safe-fetch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMEOUT_MS = 20000;

// Cache mémoire simple : évite de retélécharger l'EPG à chaque zapping du lecteur.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
let cache: { url: string; at: number; body: string } | null = null;

// GET /epg.xml -> guide des programmes (XMLTV), reproxifié depuis l'URL EPG réglée.
// Le lecteur (VLC, TiviMate…) l'associe aux chaînes via tvg-id (déclaré dans /playlist/all).
export async function GET() {
  const { epgUrl } = await streamsStore.getSettings();
  if (!epgUrl) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<tv generator-info-name="StreamCast">\n  <!-- Aucune URL EPG configurée dans le panel. -->\n</tv>\n`,
      { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8" } },
    );
  }

  const now = Date.now();
  if (cache && cache.url === epgUrl && now - cache.at < CACHE_TTL_MS) {
    return new Response(cache.body, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8", "X-Cache": "HIT" },
    });
  }

  try {
    const res = await safeFetch(epgUrl, {
      headers: { "User-Agent": "StreamCast/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      return new Response(`<!-- EPG amont: HTTP ${res.status} -->`, {
        status: 502,
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      });
    }
    const body = await res.text();
    cache = { url: epgUrl, at: now, body };
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8", "X-Cache": "MISS" },
    });
  } catch {
    // En cas d'échec réseau, sert la dernière version en cache si disponible.
    if (cache && cache.url === epgUrl) {
      return new Response(cache.body, {
        status: 200,
        headers: { "Content-Type": "application/xml; charset=utf-8", "X-Cache": "STALE" },
      });
    }
    return new Response(`<!-- EPG indisponible (réseau) -->`, {
      status: 502,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
}
