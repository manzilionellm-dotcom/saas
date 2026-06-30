import { repo } from "../../../lib/db/repo";
import { ensureSeed } from "../../../lib/db/seed";
import type { Business } from "../../../lib/db/types";

export const dynamic = "force-dynamic";

// Construit/valide les champs d'un business depuis le corps de requête.
function parseBusiness(body: unknown): Omit<Business, "id" | "createdAt"> | { error: string } {
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const required = ["name", "businessType", "country", "locale", "targetCustomer", "budget", "mainGoal"];
  for (const f of required) {
    if (!str(b[f])) return { error: `Champ requis manquant : ${f}` };
  }
  const additional = Array.isArray(b.additionalLocales)
    ? (b.additionalLocales as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : typeof b.additionalLocales === "string"
      ? b.additionalLocales.split(",").map((x) => x.trim()).filter(Boolean)
      : [];

  return {
    name: str(b.name),
    businessType: str(b.businessType),
    country: str(b.country),
    locale: str(b.locale),
    additionalLocales: additional,
    targetCustomer: str(b.targetCustomer),
    budget: str(b.budget),
    mainGoal: str(b.mainGoal),
    brandVoice: str(b.brandVoice) || undefined,
    notes: str(b.notes) || undefined,
  };
}

export async function GET() {
  await ensureSeed();
  const businesses = await repo.listBusinesses();
  return Response.json({ businesses });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const parsed = parseBusiness(body);
  if ("error" in parsed) return Response.json(parsed, { status: 400 });

  const business = await repo.createBusiness(parsed);
  return Response.json({ business }, { status: 201 });
}
