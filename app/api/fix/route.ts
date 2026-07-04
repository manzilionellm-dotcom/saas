import { hasClaude, writeFixes } from "../../lib/claude";
import type { AuditResult } from "../../lib/seo-audit";

// POST /api/fix  { audit }  ->  corrections rédigées par Claude (Versailles).
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasClaude()) {
    return Response.json(
      {
        error:
          "IA Claude non configurée. Ajoutez ANTHROPIC_API_KEY dans .env.local pour activer la rédaction automatique.",
      },
      { status: 503 },
    );
  }

  let audit: AuditResult | undefined;
  try {
    const body = await request.json();
    audit = body?.audit;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!audit || !Array.isArray(audit.checks)) {
    return Response.json({ error: "Audit manquant." }, { status: 400 });
  }

  try {
    const fixes = await writeFixes(audit);
    return Response.json({ fixes });
  } catch {
    return Response.json(
      { error: "Échec de la génération IA (clé invalide ou crédit épuisé ?)." },
      { status: 502 },
    );
  }
}
