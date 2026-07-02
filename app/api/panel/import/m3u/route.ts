import { parseM3U } from "../../../../lib/m3u";
import { streamsStore } from "../../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../../lib/panel-auth";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 20000;
const MAX_CHANNELS = 5000;

// POST /api/panel/import/m3u { url } ou { content, label? } -> importe une playlist.
export async function POST(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();
  let content = String(body.content ?? "");
  let origin = String(body.label ?? "").trim();

  if (url) {
    if (!/^https?:\/\//i.test(url)) {
      return Response.json({ error: "URL invalide (http/https attendu)." }, { status: 400 });
    }
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": "StreamCast/1.0" },
      });
      if (!res.ok) {
        return Response.json({ error: `Téléchargement échoué (HTTP ${res.status}).` }, { status: 502 });
      }
      content = await res.text();
      origin = origin || url;
    } catch {
      return Response.json({ error: "Téléchargement de la playlist impossible (délai ou réseau)." }, { status: 502 });
    }
  }

  if (!content.trim()) {
    return Response.json({ error: "Fournissez une URL ou le contenu M3U." }, { status: 400 });
  }
  origin = origin || "m3u-colle";

  const { entries } = parseM3U(content);
  const valid = entries.filter((e) => /^https?:\/\//i.test(e.url));
  if (valid.length === 0) {
    return Response.json({ error: "Aucune chaîne exploitable dans cette playlist." }, { status: 400 });
  }

  const truncated = valid.length > MAX_CHANNELS;
  const added = await streamsStore.addMany(
    valid.slice(0, MAX_CHANNELS).map((e) => ({
      name: e.name || e.url,
      url: e.url,
      logo: e.attrs["tvg-logo"] || undefined,
      group: e.attrs["group-title"] || undefined,
      source: "m3u" as const,
      origin,
    })),
  );

  return Response.json({ ok: true, imported: added.length, truncated, origin });
}
