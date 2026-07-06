import { dropshipRepo } from "../../../lib/dropship/repo";
import { computeFinance } from "../../../lib/dropship/finance";

export const dynamic = "force-dynamic";

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// POST /api/dropship/finance { candidateId, productCost, shippingCost,
// transactionFeeRate, targetGrossMarginRate, adCushionRate }
// Le Finance Agent = CALCUL SERVEUR (jamais le LLM).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const candidateId = String(body.candidateId ?? "");
  const candidate = await dropshipRepo.getCandidate(candidateId);
  if (!candidate) return Response.json({ error: "Candidat introuvable." }, { status: 404 });

  const inputs = {
    productCost: num(body.productCost, 0),
    shippingCost: num(body.shippingCost, 0),
    transactionFeeRate: num(body.transactionFeeRate, 0.03),
    targetGrossMarginRate: num(body.targetGrossMarginRate, 0.65),
    adCushionRate: num(body.adCushionRate, 0.25),
  };

  if (inputs.productCost <= 0) {
    return Response.json({ error: "Le coût produit réel est requis pour le calcul financier." }, { status: 400 });
  }

  const computed = computeFinance(inputs);
  const saved = await dropshipRepo.saveFinancialModel({
    productCandidateId: candidateId,
    ...inputs,
    ...computed,
  });

  return Response.json({ finance: saved });
}
