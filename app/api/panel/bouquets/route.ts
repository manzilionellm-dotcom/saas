import { streamsStore } from "../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// GET /api/panel/bouquets -> liste des catégories.
export async function GET() {
  if (!(await isPanelAuthed())) return unauthorized();
  return Response.json({ bouquets: await streamsStore.listBouquets() });
}

// POST /api/panel/bouquets { name, channels? } -> crée une catégorie.
// `channels` optionnel : permet de créer une catégorie déjà remplie (ex. à
// partir des chaînes actuellement attribuées à un profil).
export async function POST(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) return Response.json({ error: "Nom de catégorie requis." }, { status: 400 });
  const channels = Array.isArray(body.channels) ? body.channels.map(String) : [];
  const bouquet = await streamsStore.createBouquet(name, channels);
  return Response.json({ bouquet });
}
