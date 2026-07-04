import { fetchXtreamChannels, normalizeServer, XTREAM_MAX_CHANNELS } from "../../../../lib/xtream";
import { streamsStore } from "../../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// POST /api/panel/import/xtream { server, username, password } -> importe les chaînes live.
export async function POST(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const server = normalizeServer(String(body.server ?? ""));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "").trim();
  if (!server || server === "http://" || !username || !password) {
    return Response.json({ error: "Serveur, utilisateur et mot de passe requis." }, { status: 400 });
  }

  let channels;
  try {
    channels = await fetchXtreamChannels({ server, username, password });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connexion au serveur Xtream impossible.";
    return Response.json({ error: msg }, { status: 502 });
  }
  if (channels.length === 0) {
    return Response.json({ error: "Aucune chaîne live sur ce compte." }, { status: 400 });
  }

  const origin = `${server} (${username})`;
  const added = await streamsStore.addMany(
    channels.map((c) => ({ ...c, source: "xtream" as const, origin })),
  );

  return Response.json({
    ok: true,
    imported: added.length,
    truncated: channels.length >= XTREAM_MAX_CHANNELS,
    origin,
  });
}
