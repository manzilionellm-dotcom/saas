import { streamsStore } from "../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// GET /api/panel/profiles -> profils famille (avec leur lien de lecture).
export async function GET() {
  if (!(await isPanelAuthed())) return unauthorized();
  return Response.json({ profiles: await streamsStore.listProfiles() });
}

// POST /api/panel/profiles { name } -> crée un profil + token de lecture.
export async function POST(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) return Response.json({ error: "Le nom du profil est requis." }, { status: 400 });
  const profile = await streamsStore.createProfile(name);
  return Response.json({ profile }, { status: 201 });
}

// DELETE /api/panel/profiles?id=<id> -> supprime un profil.
export async function DELETE(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Paramètre id requis." }, { status: 400 });
  const ok = await streamsStore.removeProfile(id);
  return ok
    ? Response.json({ ok: true })
    : Response.json({ error: "Profil introuvable." }, { status: 404 });
}
