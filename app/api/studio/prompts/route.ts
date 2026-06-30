import { repo } from "../../../lib/db/repo";

export const dynamic = "force-dynamic";

// POST /api/studio/prompts { kind, version } -> promeut une version par défaut.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const kind = String(body.kind ?? "");
  const version = String(body.version ?? "");
  if (!kind || !version) return Response.json({ error: "kind et version requis." }, { status: 400 });

  await repo.setDefaultPrompt(kind, version);
  return Response.json({ ok: true });
}
