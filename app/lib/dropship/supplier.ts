import type { SupplierValidationInput, SupplierVerdict } from "./types";

// Spécification EXACTE des champs AutoDS à collecter côté UI (brief : « Formulaire
// de saisie manuelle AutoDS »). Aucune de ces valeurs n'est jamais inventée par
// un agent : elles viennent toujours de l'utilisateur.
export type AutoDSFieldSpec = {
  key: keyof SupplierValidationInput;
  label: string;
  type: "text" | "number" | "select";
  required: boolean;
  options?: string[];
  placeholder?: string;
};

export const AUTODS_FIELDS: AutoDSFieldSpec[] = [
  { key: "productNameInput", label: "Nom du produit", type: "text", required: true },
  { key: "productUrl", label: "URL du produit", type: "text", required: true, placeholder: "https://…" },
  { key: "supplierName", label: "Nom du fournisseur", type: "text", required: true },
  { key: "productCost", label: "Coût produit (€)", type: "number", required: true },
  { key: "shippingCost", label: "Coût de livraison (€)", type: "number", required: true },
  { key: "deliveryDays", label: "Délai de livraison (jours)", type: "number", required: true },
  { key: "warehouseLocation", label: "Localisation de l'entrepôt", type: "text", required: true },
  { key: "supplierRating", label: "Note du fournisseur (sur 5)", type: "number", required: true },
  { key: "orderVolume", label: "Volume de commandes", type: "text", required: false },
  { key: "reviewCount", label: "Nombre d'avis", type: "number", required: true },
  { key: "averageReviewScore", label: "Score moyen des avis (sur 5)", type: "number", required: true },
  { key: "recurringComplaints", label: "Réclamations récurrentes", type: "text", required: false },
  {
    key: "stockStability",
    label: "Stabilité du stock",
    type: "select",
    required: true,
    options: ["stable", "variable", "unstable"],
  },
  { key: "priceChangeHistory", label: "Historique de changement de prix", type: "text", required: false },
  { key: "availableVariants", label: "Variantes disponibles", type: "text", required: false },
  { key: "complianceDocs", label: "Documents de conformité (ex. déclaration CE)", type: "text", required: false },
  { key: "returnRefundSignals", label: "Indicateurs de retour/remboursement", type: "text", required: false },
];

// Seuils explicites (le brief impose une évaluation contre des seuils, en code).
export const SUPPLIER_THRESHOLDS = {
  minSupplierRating: 3.8,
  minAverageReviewScore: 4.0,
  maxDeliveryDays: 25,
  minReviewCount: 20,
};

// Verdict PASS / FAIL / NEEDS_MORE_DATA — déterministe, jamais le LLM.
export function evaluateSupplier(
  input: Pick<
    SupplierValidationInput,
    | "productCost"
    | "shippingCost"
    | "deliveryDays"
    | "supplierRating"
    | "reviewCount"
    | "averageReviewScore"
    | "stockStability"
  >,
): { verdict: SupplierVerdict; reasons: string[] } {
  const reasons: string[] = [];
  const t = SUPPLIER_THRESHOLDS;

  // Données manquantes -> NEEDS_MORE_DATA (règle de blocage dur).
  const missing: string[] = [];
  if (input.productCost == null) missing.push("coût produit");
  if (input.shippingCost == null) missing.push("coût de livraison");
  if (input.deliveryDays == null) missing.push("délai de livraison");
  if (input.supplierRating == null) missing.push("note du fournisseur");
  if (input.reviewCount == null) missing.push("nombre d'avis");
  if (input.averageReviewScore == null) missing.push("score moyen des avis");
  if (!input.stockStability) missing.push("stabilité du stock");
  if (missing.length > 0) {
    return { verdict: "NEEDS_MORE_DATA", reasons: [`Données AutoDS manquantes : ${missing.join(", ")}.`] };
  }

  let fail = false;
  if ((input.supplierRating ?? 0) < t.minSupplierRating) {
    fail = true;
    reasons.push(`Note fournisseur ${input.supplierRating} < seuil ${t.minSupplierRating}.`);
  }
  if ((input.averageReviewScore ?? 0) < t.minAverageReviewScore) {
    fail = true;
    reasons.push(`Score moyen des avis ${input.averageReviewScore} < seuil ${t.minAverageReviewScore}.`);
  }
  if ((input.deliveryDays ?? 999) > t.maxDeliveryDays) {
    fail = true;
    reasons.push(`Délai de livraison ${input.deliveryDays} j > seuil ${t.maxDeliveryDays} j.`);
  }
  if (input.stockStability === "unstable") {
    fail = true;
    reasons.push("Stock instable : risque de rupture pendant les tests.");
  }
  if ((input.reviewCount ?? 0) < t.minReviewCount) {
    // Pas bloquant en soi, mais insuffisant pour statuer -> NEEDS_MORE_DATA.
    reasons.push(`Peu d'avis (${input.reviewCount} < ${t.minReviewCount}) : preuve sociale insuffisante pour statuer.`);
    if (!fail) return { verdict: "NEEDS_MORE_DATA", reasons };
  }

  if (fail) return { verdict: "FAIL", reasons };

  reasons.push("Tous les seuils fournisseur (note, avis, délai, stock) sont respectés.");
  return { verdict: "PASS", reasons };
}
