import { runLLM, usingRealLLM } from "../../../lib/llm";
import { repo } from "../../../lib/db/repo";

export const dynamic = "force-dynamic";

// Preuve de la chaîne LLM (Phase 1) : un appel passe par l'abstraction et
// produit un log structuré vérifiable.
export async function POST(request: Request) {
  let businessId = "";
  try {
    const body = await request.json();
    businessId = typeof body?.businessId === "string" ? body.businessId : "";
  } catch {
    // corps optionnel
  }

  const business = businessId ? await repo.getBusiness(businessId) : null;
  const system = business
    ? `Tu écris pour « ${business.name} ». Ton/voix : ${business.brandVoice ?? "neutre"}.`
    : "Tu es un assistant marketing.";

  try {
    const res = await runLLM({
      system,
      prompt: business
        ? `Donne en une phrase un angle d'accroche pour ${business.name} (${business.businessType}).`
        : "Dis bonjour en une phrase.",
      locale: business?.locale ?? "fr",
      maxTokens: 200,
    });
    const logs = await repo.listLLMLogs(1);
    return Response.json({
      realLLM: usingRealLLM(),
      response: res,
      lastLog: logs[0] ?? null,
    });
  } catch {
    return Response.json({ error: "Échec de l'appel LLM." }, { status: 502 });
  }
}
