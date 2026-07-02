import { parseM3U } from "../../../../lib/m3u";
import { streamsStore, type Channel } from "../../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../../lib/panel-auth";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 20000;
// Plafonds larges : un catalogue de 15 000+ chaînes est visé.
const MAX_CHANNELS_PER_REQUEST = 30000;
const MAX_URLS_PER_REQUEST = 200;
const FETCH_CONCURRENCY = 5;

type SourceResult = { origin: string; imported: number; error?: string };

function toChannels(content: string, origin: string): Omit<Channel, "id" | "addedAt">[] {
  const { entries } = parseM3U(content);
  return entries
    .filter((e) => /^https?:\/\//i.test(e.url))
    .map((e) => ({
      name: e.name || e.url,
      url: e.url,
      logo: e.attrs["tvg-logo"] || undefined,
      group: e.attrs["group-title"] || undefined,
      tvgId: e.attrs["tvg-id"] || undefined,
      source: "m3u" as const,
      origin,
    }));
}

async function fetchPlaylist(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "StreamCast/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// POST /api/panel/import/m3u
//   { url } | { urls: [] } | { content, label? }
// Accepte une URL, plusieurs URLs (ou plusieurs lignes dans `url`), ou du contenu collé.
export async function POST(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Rassemble les URLs : champ `urls[]` + lignes multiples du champ `url`.
  const rawUrls: string[] = [];
  if (Array.isArray(body.urls)) rawUrls.push(...body.urls.map((u) => String(u)));
  rawUrls.push(...String(body.url ?? "").split(/\r?\n/));
  const urls = [...new Set(rawUrls.map((u) => u.trim()).filter(Boolean))];

  const content = String(body.content ?? "");
  const label = String(body.label ?? "").trim();

  // --- Mode contenu collé (une seule playlist) ---
  if (urls.length === 0) {
    if (!content.trim()) {
      return Response.json({ error: "Fournissez une ou plusieurs URLs, ou le contenu M3U." }, { status: 400 });
    }
    const origin = label || "m3u-colle";
    const channels = toChannels(content, origin).slice(0, MAX_CHANNELS_PER_REQUEST);
    if (channels.length === 0) {
      return Response.json({ error: "Aucune chaîne exploitable dans cette playlist." }, { status: 400 });
    }
    const added = await streamsStore.addMany(channels);
    return Response.json({ ok: true, imported: added.length, sources: [{ origin, imported: added.length }] });
  }

  // --- Mode URLs (une ou plusieurs playlists) ---
  const invalid = urls.find((u) => !/^https?:\/\//i.test(u));
  if (invalid) {
    return Response.json({ error: `URL invalide : ${invalid} (http/https attendu).` }, { status: 400 });
  }
  if (urls.length > MAX_URLS_PER_REQUEST) {
    return Response.json(
      { error: `Trop d'URLs en une fois (max ${MAX_URLS_PER_REQUEST}). Découpez l'import.` },
      { status: 400 },
    );
  }

  // Télécharge et parse les playlists en parallèle (concurrence limitée),
  // sans dépasser le plafond total de chaînes par requête.
  const results: SourceResult[] = new Array(urls.length);
  const pending: Omit<Channel, "id" | "addedAt">[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const i = cursor++;
      const u = urls[i];
      const origin = urls.length === 1 && label ? label : u;
      try {
        const text = await fetchPlaylist(u);
        const channels = toChannels(text, origin);
        if (channels.length === 0) {
          results[i] = { origin, imported: 0, error: "aucune chaîne exploitable" };
          continue;
        }
        const room = MAX_CHANNELS_PER_REQUEST - pending.length;
        const take = channels.slice(0, Math.max(0, room));
        pending.push(...take);
        results[i] = { origin, imported: take.length };
      } catch (err) {
        results[i] = { origin, imported: 0, error: err instanceof Error ? err.message : "échec" };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, urls.length) }, worker));

  if (pending.length === 0) {
    return Response.json(
      { error: "Aucune chaîne importée.", sources: results },
      { status: 502 },
    );
  }

  await streamsStore.addMany(pending);
  const imported = pending.length;
  const truncated = imported >= MAX_CHANNELS_PER_REQUEST;
  return Response.json({ ok: true, imported, truncated, sources: results });
}
