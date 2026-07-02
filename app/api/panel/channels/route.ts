import { streamsStore } from "../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// GET /api/panel/channels -> liste des chaînes du panel.
export async function GET() {
  if (!(await isPanelAuthed())) return unauthorized();
  return Response.json({ channels: await streamsStore.list() });
}

// POST /api/panel/channels { name, url, group?, logo? } -> ajout d'une chaîne directe.
export async function POST(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  const url = String(body.url ?? "").trim();
  if (!name) return Response.json({ error: "Le nom est requis." }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) {
    return Response.json({ error: "URL invalide (http/https attendu)." }, { status: 400 });
  }
  const [channel] = await streamsStore.addMany([
    {
      name,
      url,
      group: String(body.group ?? "").trim() || undefined,
      logo: String(body.logo ?? "").trim() || undefined,
      source: "direct",
    },
  ]);
  return Response.json({ channel }, { status: 201 });
}

// DELETE /api/panel/channels?id=<id> | ?origin=<origin> -> suppression.
export async function DELETE(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const origin = searchParams.get("origin");
  if (id) {
    const ok = await streamsStore.remove(id);
    return ok
      ? Response.json({ ok: true })
      : Response.json({ error: "Chaîne introuvable." }, { status: 404 });
  }
  if (origin) {
    const removed = await streamsStore.removeByOrigin(origin);
    return Response.json({ ok: true, removed });
  }
  return Response.json({ error: "Paramètre id ou origin requis." }, { status: 400 });
}
