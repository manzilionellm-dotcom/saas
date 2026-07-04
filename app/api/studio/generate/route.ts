import { repo } from "../../../lib/db/repo";
import { runLLM } from "../../../lib/llm";
import { buildGenerationRequest, isKind, PLATFORMS } from "../../../lib/prompts";

export const dynamic = "force-dynamic";

// POST /api/studio/generate { businessId, platform, kind, locale } -> Generation
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const businessId = String(body.businessId ?? "");
  const platform = String(body.platform ?? "");
  const kind = String(body.kind ?? "");
  const locale = String(body.locale ?? "");

  const business = await repo.getBusiness(businessId);
  if (!business) return Response.json({ error: "Business introuvable." }, { status: 404 });
  if (!PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) {
    return Response.json({ error: "Plateforme invalide." }, { status: 400 });
  }
  if (!isKind(kind)) return Response.json({ error: "Type de livrable invalide." }, { status: 400 });

  const allowedLocales = [business.locale, ...business.additionalLocales];
  const finalLocale = allowedLocales.includes(locale) ? locale : business.locale;

  const { request: llmReq, promptVersion } = buildGenerationRequest(business, platform, kind, finalLocale);

  try {
    const res = await runLLM(llmReq);
    const generation = await repo.addGeneration({
      businessId,
      platform,
      kind,
      locale: finalLocale,
      prompt: llmReq.prompt,
      output: res.text,
      promptVersion,
      tokensUsed: res.tokensUsed,
      costEstimate: res.costEstimate,
    });
    return Response.json({ generation, realLLM: res.provider !== "local" });
  } catch {
    return Response.json({ error: "Échec de la génération (LLM)." }, { status: 502 });
  }
}
