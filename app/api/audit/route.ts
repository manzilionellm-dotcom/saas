import { auditUrl } from "../../lib/seo-audit";

// POST /api/audit  { url }  ->  audit SEO/AEO réel de la page.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw = "";
  try {
    const body = await request.json();
    raw = typeof body?.url === "string" ? body.url.trim() : "";
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!raw) return Response.json({ error: "URL manquante." }, { status: 400 });
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return Response.json({ error: "URL invalide." }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Response.json({ error: "Seules les URL http(s) sont acceptées." }, { status: 400 });
  }

  try {
    const result = await auditUrl(parsed.toString());
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError"
      ? "La page a mis trop de temps à répondre (délai dépassé)."
      : "Impossible de récupérer cette page (site injoignable ou bloqué).";
    return Response.json({ error: msg }, { status: 502 });
  }
}
