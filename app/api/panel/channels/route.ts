import { streamsStore } from "../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// GET /api/panel/channels?search=&group=&page=&pageSize= -> chaînes paginées + facettes.
// GET /api/panel/channels?search=&group=&ids=1 -> uniquement les ids du filtre
// (pour « tout ajouter » un thème/pays à une catégorie ou un profil).
export async function GET(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  const { searchParams } = new URL(request.url);
  if (searchParams.get("ids") === "1") {
    const ids = await streamsStore.idsMatching({
      search: searchParams.get("search") ?? undefined,
      group: searchParams.get("group") ?? undefined,
    });
    return Response.json({ ids });
  }
  const page = await streamsStore.query({
    search: searchParams.get("search") ?? undefined,
    group: searchParams.get("group") ?? undefined,
    page: Number(searchParams.get("page") ?? 1) || 1,
    pageSize: Number(searchParams.get("pageSize") ?? 50) || 50,
  });
  return Response.json(page);
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
  const backupUrl = String(body.backupUrl ?? "").trim();
  if (backupUrl && !/^https?:\/\//i.test(backupUrl)) {
    return Response.json({ error: "URL de secours invalide (http/https attendu)." }, { status: 400 });
  }
  const [channel] = await streamsStore.addMany([
    {
      name,
      url,
      group: String(body.group ?? "").trim() || undefined,
      logo: String(body.logo ?? "").trim() || undefined,
      backupUrl: backupUrl || undefined,
      source: "direct",
    },
  ]);
  return Response.json({ channel }, { status: 201 });
}

// PATCH /api/panel/channels?id=<id>
//   { alwaysOn: bool }   -> « toujours active » (24/7) ou « à la demande »
//   { backupUrl: str }   -> définit/efface l'URL de secours (chaîne vide = efface)
export async function PATCH(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Paramètre id requis." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  if ("backupUrl" in body) {
    const backupUrl = String(body.backupUrl ?? "").trim();
    if (backupUrl && !/^https?:\/\//i.test(backupUrl)) {
      return Response.json({ error: "URL de secours invalide (http/https attendu)." }, { status: 400 });
    }
    const channel = await streamsStore.setChannelBackup(id, backupUrl);
    return channel
      ? Response.json({ channel })
      : Response.json({ error: "Chaîne introuvable." }, { status: 404 });
  }

  const channel = await streamsStore.setChannelAlwaysOn(id, Boolean(body.alwaysOn));
  return channel
    ? Response.json({ channel })
    : Response.json({ error: "Chaîne introuvable." }, { status: 404 });
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
