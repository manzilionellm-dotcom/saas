import { repo } from "../../../../lib/db/repo";
import type { Business } from "../../../../lib/db/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const business = await repo.getBusiness(id);
  if (!business) return Response.json({ error: "Business introuvable." }, { status: 404 });
  const generations = await repo.listGenerations(id);
  return Response.json({ business, generations });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const patch: Partial<Omit<Business, "id" | "createdAt">> = {};
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  for (const f of ["name", "businessType", "country", "locale", "targetCustomer", "budget", "mainGoal", "brandVoice", "notes"] as const) {
    if (f in body) patch[f] = str(body[f]) || undefined;
  }
  if ("additionalLocales" in body) {
    const a = body.additionalLocales;
    patch.additionalLocales = Array.isArray(a)
      ? a.map((x) => String(x).trim()).filter(Boolean)
      : typeof a === "string"
        ? a.split(",").map((x) => x.trim()).filter(Boolean)
        : [];
  }

  const updated = await repo.updateBusiness(id, patch);
  if (!updated) return Response.json({ error: "Business introuvable." }, { status: 404 });
  return Response.json({ business: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await repo.deleteBusiness(id);
  if (!ok) return Response.json({ error: "Business introuvable." }, { status: 404 });
  return Response.json({ ok: true });
}
