import { streamsStore } from "../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// GET /api/panel/backup -> télécharge tout le montage (chaînes, profils,
// catégories, réglages) dans un seul fichier JSON, à conserver hors serveur.
export async function GET() {
  if (!(await isPanelAuthed())) return unauthorized();
  const db = await streamsStore.dump();
  const backup = { _type: "streamcast-backup", version: 1, ...db };
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="streamcast-backup-${date}.json"`,
    },
  });
}

// POST /api/panel/backup -> restaure un montage depuis un fichier de sauvegarde.
// ⚠️ Remplace l'intégralité de l'état actuel.
export async function POST(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Fichier illisible (JSON attendu)." }, { status: 400 });
  }
  try {
    const counts = await streamsStore.restore(data);
    return Response.json({ ok: true, ...counts });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Restauration impossible." },
      { status: 400 },
    );
  }
}
