import { streamsStore } from "../../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// POST /api/panel/bouquets/<id>
//   { action: "rename", name }                   -> renomme la catégorie
//   { action: "toggle", channelId, add: bool }   -> ajoute/retire une chaîne
//   { action: "apply", profileId }               -> applique la catégorie à un profil
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

  if (action === "rename") {
    const name = String(body.name ?? "").trim();
    if (!name) return Response.json({ error: "Nom requis." }, { status: 400 });
    const b = await streamsStore.renameBouquet(id, name);
    return b
      ? Response.json({ bouquet: b })
      : Response.json({ error: "Catégorie introuvable." }, { status: 404 });
  }

  if (action === "toggle") {
    const channelId = String(body.channelId ?? "");
    if (!channelId) return Response.json({ error: "channelId requis." }, { status: 400 });
    const b = await streamsStore.setBouquetChannel(id, channelId, Boolean(body.add));
    return b
      ? Response.json({ bouquet: b })
      : Response.json({ error: "Catégorie introuvable." }, { status: 404 });
  }

  if (action === "toggleMany") {
    const channelIds = Array.isArray(body.channelIds) ? body.channelIds.map(String) : [];
    const b = await streamsStore.setBouquetChannelMany(id, channelIds, Boolean(body.add));
    return b
      ? Response.json({ bouquet: b })
      : Response.json({ error: "Catégorie introuvable." }, { status: 404 });
  }

  if (action === "apply") {
    const profileId = String(body.profileId ?? "");
    if (!profileId) return Response.json({ error: "profileId requis." }, { status: 400 });
    const p = await streamsStore.applyBouquetToProfile(id, profileId);
    return p
      ? Response.json({ profile: p })
      : Response.json({ error: "Catégorie ou profil introuvable." }, { status: 404 });
  }

  return Response.json({ error: "Action inconnue." }, { status: 400 });
}

// DELETE /api/panel/bouquets/<id> -> supprime la catégorie (pas les chaînes).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isPanelAuthed())) return unauthorized();
  const { id } = await params;
  const ok = await streamsStore.deleteBouquet(id);
  return ok
    ? Response.json({ ok: true })
    : Response.json({ error: "Catégorie introuvable." }, { status: 404 });
}
