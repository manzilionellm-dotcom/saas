import { repo } from "../../../lib/db/repo";
import { recomputeGenome } from "../../../lib/genome";
import { genomeBriefing } from "../../../lib/brain";
import { runLLM, usingRealLLM } from "../../../lib/llm";

export const dynamic = "force-dynamic";

// POST /api/studio/coach { businessId, message } -> réponse du coach + conversation.
// Le coach connaît tes business, générations ET résultats réels (via le Genome).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const businessId = String(body.businessId ?? "");
  const message = String(body.message ?? "").trim();
  if (!message) return Response.json({ error: "Message vide." }, { status: 400 });

  const business = await repo.getBusiness(businessId);
  if (!business) return Response.json({ error: "Business introuvable." }, { status: 404 });

  const genome = await recomputeGenome(businessId);
  const briefing = genomeBriefing(genome.snapshot);

  const system =
    `Tu es le coach stratégique de « ${business.name} » (${business.businessType}). ` +
    `Voix de marque : ${business.brandVoice ?? "neutre"}. ` +
    `Tu réponds avec les CHIFFRES RÉELS de ce business, jamais en généralités. ` +
    `Données actuelles : ${briefing}`;

  let reply: string;
  try {
    if (usingRealLLM()) {
      const res = await runLLM({ system, prompt: message, locale: business.locale, maxTokens: 600 });
      reply = res.text;
    } else {
      // Repli sans clé : réponse ancrée dans le Genome (cite les vraies données).
      const p = genome.snapshot.bestPlatforms[0];
      const k = genome.snapshot.bestKinds[0];
      reply =
        genome.snapshot.totalResults === 0
          ? `Pour « ${business.name} », je n'ai pas encore de résultats. Publie et saisis tes perfs : je te répondrai avec des chiffres, pas des généralités.`
          : `D'après tes données — ${briefing} ` +
            `Sur « ${message} » : capitalise sur ${p ? p.key : "ta meilleure plateforme"}` +
            `${k ? ` et le format « ${k.key} »` : ""}, c'est là que tes résultats réels sont les meilleurs.`;
    }
  } catch {
    return Response.json({ error: "Échec du coach (LLM)." }, { status: 502 });
  }

  const conversation = await repo.appendConversation(businessId, [
    { role: "user", content: message },
    { role: "assistant", content: reply },
  ]);

  return Response.json({ reply, conversation });
}
