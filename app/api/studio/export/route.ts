import { repo } from "../../../lib/db/repo";
import type { Generation } from "../../../lib/db/types";

export const dynamic = "force-dynamic";

// GET /api/studio/export?businessId=...&format=json|csv  (exigence évolutive n°6)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId") ?? "";
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();

  const business = await repo.getBusiness(businessId);
  if (!business) return Response.json({ error: "Business introuvable." }, { status: 404 });

  const generations = await repo.listGenerations(businessId);

  if (format === "csv") {
    const csv = toCsv(generations);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug(business.name)}-generations.csv"`,
      },
    });
  }

  return new Response(JSON.stringify({ business: business.name, generations }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(business.name)}-generations.json"`,
    },
  });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "business";
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows: Generation[]): string {
  const headers = ["createdAt", "platform", "kind", "locale", "promptVersion", "tokensUsed", "costEstimate", "output"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      csvCell(r.createdAt),
      csvCell(r.platform),
      csvCell(r.kind),
      csvCell(r.locale),
      csvCell(r.promptVersion),
      csvCell(r.tokensUsed),
      csvCell(r.costEstimate),
      csvCell(r.output),
    ].join(","));
  }
  return lines.join("\n");
}
