import type { CandidateContext } from "./context";
import type { DropshippingProject, WeeklyMetricEntry } from "./types";
import { STAGES, STAGE_LABELS } from "./agents";

// Assemble le pack de lancement final en markdown (page livrable + export).

export function buildDeliverableMarkdown(
  project: DropshippingProject,
  ctx: CandidateContext,
  metrics: WeeklyMetricEntry[],
): string {
  const c = ctx.candidate;
  const lines: string[] = [];

  lines.push(`# Pack de lancement — ${project.name}`);
  lines.push(`\n> Aucune promesse de résultat. « Opportunité la plus probable selon les données disponibles. »\n`);
  lines.push(`- **Produit** : ${c.productName ?? "(non défini)"}`);
  lines.push(`- **Décision Investment Committee** : ${c.investmentCommitteeDecision ?? "(en attente)"}`);
  if (c.decisionRationale) lines.push(`- **Justification** : ${c.decisionRationale.slice(0, 300)}`);

  if (ctx.supplier) {
    const s = ctx.supplier;
    lines.push(`\n## Validation fournisseur — ${s.verdict}`);
    lines.push(`- Fournisseur : ${s.supplierName} · note ${s.supplierRating ?? "?"} · délai ${s.deliveryDays ?? "?"} j`);
    lines.push(`- Coût produit ${s.productCost ?? "?"} € · livraison ${s.shippingCost ?? "?"} € · stock ${s.stockStability}`);
    for (const r of s.verdictReasons) lines.push(`  - ${r}`);
  }

  if (ctx.finance) {
    const f = ctx.finance;
    lines.push(`\n## Modèle de pricing (calcul serveur)`);
    lines.push(`- Coût atterri : **${f.computedLandedCost} €** · Prix de vente : **${f.computedSellingPrice} €**`);
    lines.push(`- CPA break-even : **${f.computedBreakEvenCPA} €** · CPA max : **${f.computedMaxCPA} €**`);
    lines.push(`- ROAS break-even : **${f.computedBreakEvenROAS}**`);
    for (const w of f.warnings) lines.push(`  - ⚠️ ${w}`);
  }

  if (ctx.compliance) {
    const cc = ctx.compliance;
    lines.push(`\n## Checklist conformité`);
    lines.push(`- TVA/OSS : ${cc.vatOss} · GPSR : ${cc.gpsr} · CE : ${cc.ceMarking} · Batteries : ${cc.batteryReg}`);
    lines.push(`- WEEE : ${cc.weee} · Rétractation : ${cc.withdrawalRight} · Responsable UE : ${cc.euResponsiblePerson} · GDPR : ${cc.gdpr}`);
    lines.push(`- Validé par un professionnel : ${cc.professionalReviewConfirmed ? "oui" : "non"}`);
    lines.push(`- _Rappel : ceci n'est pas un avis juridique._`);
  }

  // Rapports d'agents, par étape.
  for (const stage of STAGES) {
    const reports = ctx.reports.filter((r) => r.stage === stage);
    if (reports.length === 0) continue;
    lines.push(`\n## ${STAGE_LABELS[stage]}`);
    for (const r of reports) {
      lines.push(`\n### ${r.agentRole} · confiance ${r.confidenceLevel}`);
      lines.push(r.content);
      if (r.claimsAudit.length > 0) {
        lines.push(`\n**Audit des affirmations :**`);
        for (const cl of r.claimsAudit) {
          const extra = cl.source ? ` (source : ${cl.source})` : cl.whereToVerify ? ` (vérifier : ${cl.whereToVerify})` : "";
          lines.push(`- \`${cl.label}\` ${cl.statement}${extra}`);
        }
      }
    }
  }

  if (metrics.length > 0) {
    lines.push(`\n## Suivi hebdomadaire (données réelles utilisateur)`);
    for (const m of metrics) {
      lines.push(`- ${m.weekStartDate} : CPA ${m.cpa} · ROAS ${m.roas} · remboursements ${Math.round(m.refundRate * 100)} % → **${m.recommendation}** (${m.recommendationRationale})`);
    }
  }

  lines.push(`\n---\n_Généré le ${new Date().toISOString().slice(0, 10)} · statut projet : ${project.status}._`);
  return lines.join("\n");
}
