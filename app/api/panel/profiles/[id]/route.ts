import { streamsStore } from "../../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// POST /api/panel/profiles/<id>
//   { action: "rotate" }                         -> régénère le token (révoque l'ancien lien)
//   { action: "favorite", channelId, add: bool } -> ajoute/retire un favori
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isPanelAuthed())) return unauthorized();
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const action = String(body.action ?? "");

  if (action === "rotate") {
    const p = await streamsStore.rotateProfileToken(id);
    return p
      ? Response.json({ profile: p })
      : Response.json({ error: "Profil introuvable." }, { status: 404 });
  }

  if (action === "favorite") {
    const channelId = String(body.channelId ?? "");
    if (!channelId) return Response.json({ error: "channelId requis." }, { status: 400 });
    const p = await streamsStore.setFavorite(id, channelId, Boolean(body.add));
    return p
      ? Response.json({ profile: p })
      : Response.json({ error: "Profil introuvable." }, { status: 404 });
  }

  return Response.json({ error: "Action inconnue." }, { status: 400 });
}
