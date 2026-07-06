import type { FinancialModel, MetricRecommendation, WeeklyMetricEntry } from "./types";

// Finance Agent = CALCUL SERVEUR uniquement (jamais le LLM). Le brief l'exige :
// pricing, coût atterri, marge, CPA break-even, CPA max, ROAS break-even.

export type FinanceInputs = {
  productCost: number;
  shippingCost: number;
  transactionFeeRate: number; // ex. 0.03 (3 %)
  targetGrossMarginRate: number; // ex. 0.65 (65 %)
  adCushionRate: number; // part du prix réservée à l'acquisition, ex. 0.25
};

export type FinanceComputed = Pick<
  FinancialModel,
  | "computedLandedCost"
  | "computedSellingPrice"
  | "computedBreakEvenCPA"
  | "computedMaxCPA"
  | "computedBreakEvenROAS"
  | "warnings"
>;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Modèle explicite et défendable :
//   landedCost         = productCost + shippingCost
//   sellingPrice P tel que (P - landedCost - P*txRate) / P = targetGrossMargin
//                      => P = landedCost / (1 - txRate - targetGrossMargin)
//   breakEvenCPA       = P - landedCost - P*txRate   (marge de contribution avant pub)
//   maxCPA             = P * adCushionRate           (budget acquisition alloué / unité)
//   breakEvenROAS      = P / breakEvenCPA
export function computeFinance(inputs: FinanceInputs): FinanceComputed {
  const warnings: string[] = [];
  const productCost = Math.max(0, inputs.productCost);
  const shippingCost = Math.max(0, inputs.shippingCost);
  const txRate = clamp(inputs.transactionFeeRate, 0, 0.9);
  const marginRate = clamp(inputs.targetGrossMarginRate, 0, 0.95);
  const cushionRate = clamp(inputs.adCushionRate, 0, 0.95);

  const landedCost = productCost + shippingCost;

  const denom = 1 - txRate - marginRate;
  let sellingPrice = 0;
  let breakEvenCPA = 0;
  let maxCPA = 0;
  let breakEvenROAS = 0;

  if (denom <= 0) {
    warnings.push(
      "Marge cible + frais de transaction ≥ 100 % : impossible de fixer un prix rentable. Réduis la marge cible ou les frais.",
    );
  } else if (landedCost <= 0) {
    warnings.push("Coût atterri nul : renseigne le coût produit et le coût de livraison réels (données AutoDS).");
  } else {
    sellingPrice = landedCost / denom;
    breakEvenCPA = sellingPrice - landedCost - sellingPrice * txRate;
    maxCPA = sellingPrice * cushionRate;
    breakEvenROAS = breakEvenCPA > 0 ? sellingPrice / breakEvenCPA : 0;

    if (maxCPA > breakEvenCPA) {
      warnings.push(
        "CPA max (coussin pub) supérieur au CPA break-even : à ce budget d'acquisition, le produit est vendu à perte. Baisse le coussin pub ou augmente la marge.",
      );
    }
  }

  return {
    computedLandedCost: round2(landedCost),
    computedSellingPrice: round2(sellingPrice),
    computedBreakEvenCPA: round2(breakEvenCPA),
    computedMaxCPA: round2(maxCPA),
    computedBreakEvenROAS: round2(breakEvenROAS),
    warnings,
  };
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// Recommandation hebdo déterministe (jamais le LLM) à partir des vraies métriques
// saisies par l'utilisateur, comparées aux seuils du modèle financier.
export function recommendFromMetrics(
  entry: Pick<WeeklyMetricEntry, "cpa" | "roas" | "refundRate">,
  model: FinancialModel | null,
): { recommendation: MetricRecommendation; rationale: string } {
  const maxCPA = model?.computedMaxCPA ?? null;
  const breakEvenROAS = model?.computedBreakEvenROAS ?? null;

  if (entry.refundRate >= 0.15) {
    return {
      recommendation: "KILL",
      rationale: `Taux de remboursement élevé (${pct(entry.refundRate)}) : signal produit/fournisseur à traiter avant tout scaling.`,
    };
  }
  if (maxCPA != null && breakEvenROAS != null && maxCPA > 0) {
    if (entry.cpa <= maxCPA && entry.roas >= breakEvenROAS * 1.2) {
      return {
        recommendation: "SCALE",
        rationale: `CPA ${entry.cpa} ≤ CPA max ${maxCPA} et ROAS ${entry.roas} ≥ 1,2× break-even (${round2(breakEvenROAS)}).`,
      };
    }
    if (entry.roas < breakEvenROAS) {
      return {
        recommendation: entry.roas < breakEvenROAS * 0.7 ? "KILL" : "ITERATE",
        rationale: `ROAS ${entry.roas} < break-even ${round2(breakEvenROAS)} : sous le seuil de rentabilité.`,
      };
    }
    return {
      recommendation: "HOLD",
      rationale: `Rentabilité juste au seuil : garde le budget stable et itère les créatives avant de scaler.`,
    };
  }
  return {
    recommendation: "HOLD",
    rationale: "Modèle financier incomplet : renseigne d'abord les coûts réels pour obtenir des seuils CPA/ROAS.",
  };
}

function pct(n: number): string {
  return `${Math.round(n * 100)} %`;
}
