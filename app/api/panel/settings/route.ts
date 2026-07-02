import { streamsStore } from "../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// GET /api/panel/settings -> réglages (URL EPG…).
export async function GET() {
  if (!(await isPanelAuthed())) return unauthorized();
  return Response.json({ settings: await streamsStore.getSettings() });
}

// PUT /api/panel/settings { epgUrl } -> met à jour les réglages.
export async function PUT(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const epgUrl = String(body.epgUrl ?? "").trim();
  if (epgUrl && !/^https?:\/\//i.test(epgUrl)) {
    return Response.json({ error: "URL EPG invalide (http/https attendu)." }, { status: 400 });
  }
  const settings = await streamsStore.setSettings({ epgUrl: epgUrl || undefined });
  return Response.json({ settings });
}
