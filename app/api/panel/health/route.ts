import { streamsStore } from "../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../lib/panel-auth";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 8000;
const CONCURRENCY = 8;
const MAX_IDS = 200;

type Health = { id: string; ok: boolean; status?: number; error?: string };

// Teste qu'un flux répond (sans le télécharger : requête légère avec coupure rapide).
async function probe(url: string): Promise<Omit<Health, "id">> {
  try {
    // GET + Range 0-0 : de nombreux serveurs HLS refusent HEAD mais acceptent un GET partiel.
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "StreamCast/1.0", Range: "bytes=0-0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // 2xx et 3xx = joignable ; on ne consomme pas le corps.
    try {
      await res.body?.cancel();
    } catch {
      // corps déjà consommé/absent : sans importance
    }
    return { ok: res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "injoignable" };
  }
}

// POST /api/panel/health { ids: [] } -> teste la santé des chaînes indiquées (max 200).
export async function POST(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const ids = Array.isArray(body.ids) ? body.ids.map((x) => String(x)).slice(0, MAX_IDS) : [];
  if (ids.length === 0) return Response.json({ error: "Aucune chaîne à tester." }, { status: 400 });

  const channels = await streamsStore.getMany(ids);
  const results: Health[] = new Array(channels.length);
  let cursor = 0;

  async function worker() {
    while (cursor < channels.length) {
      const i = cursor++;
      const c = channels[i];
      results[i] = { id: c.id, ...(await probe(c.url)) };
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, channels.length) }, worker));

  return Response.json({ results });
}
