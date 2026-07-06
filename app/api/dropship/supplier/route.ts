import { dropshipRepo } from "../../../lib/dropship/repo";
import { AUTODS_FIELDS, evaluateSupplier } from "../../../lib/dropship/supplier";
import type { SupplierValidationInput } from "../../../lib/dropship/types";

export const dynamic = "force-dynamic";

function num(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// POST /api/dropship/supplier { candidateId, ...champs AutoDS }
// Sauvegarde les données AutoDS RÉELLES et calcule le verdict côté serveur.
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

  // Blocage dur : les champs obligatoires du formulaire AutoDS doivent être remplis.
  const missing: string[] = [];
  for (const f of AUTODS_FIELDS) {
    if (!f.required) continue;
    const raw = body[f.key as string];
    const empty = f.type === "number" ? num(raw) === null : str(raw) === "";
    if (empty) missing.push(f.label);
  }
  if (missing.length > 0) {
    return Response.json({ error: `Champs AutoDS obligatoires manquants : ${missing.join(", ")}.` }, { status: 400 });
  }

  const stockStability = str(body.stockStability) as SupplierValidationInput["stockStability"];
  const evaluation = evaluateSupplier({
    productCost: num(body.productCost),
    shippingCost: num(body.shippingCost),
    deliveryDays: num(body.deliveryDays),
    supplierRating: num(body.supplierRating),
    reviewCount: num(body.reviewCount),
    averageReviewScore: num(body.averageReviewScore),
    stockStability,
  });

  const saved = await dropshipRepo.saveSupplierInput({
    productCandidateId: candidateId,
    productNameInput: str(body.productNameInput),
    productUrl: str(body.productUrl),
    supplierName: str(body.supplierName),
    productCost: num(body.productCost),
    shippingCost: num(body.shippingCost),
    deliveryDays: num(body.deliveryDays),
    warehouseLocation: str(body.warehouseLocation),
    supplierRating: num(body.supplierRating),
    orderVolume: str(body.orderVolume),
    reviewCount: num(body.reviewCount),
    averageReviewScore: num(body.averageReviewScore),
    recurringComplaints: str(body.recurringComplaints),
    stockStability,
    priceChangeHistory: str(body.priceChangeHistory),
    availableVariants: str(body.availableVariants),
    complianceDocs: str(body.complianceDocs),
    returnRefundSignals: str(body.returnRefundSignals),
    verdict: evaluation.verdict,
    verdictReasons: evaluation.reasons,
  });

  // Enregistre aussi le nom produit sur le candidat s'il n'est pas encore défini.
  if (!candidate.productName) {
    await dropshipRepo.updateCandidate(candidateId, { productName: saved.productNameInput });
  }

  return Response.json({ supplier: saved });
}
