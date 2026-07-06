import type { CandidateContext } from "./context";
import { AGENTS, agentsForStage } from "./agents";
import type { GateName, Stage } from "./types";

// Règles de blocage dur + machine à portes d'approbation. Toutes ces règles
// doivent être VISIBLES dans l'UI (état « bloqué — action requise »), pas gérées
// silencieusement côté serveur.

export type Blocker = {
  code: string;
  message: string; // ce qui bloque
  action: string; // ce que l'utilisateur doit faire
};

// Gate à approuver pour ENTRER dans une étape (null = première étape).
const GATE_TO_ENTER: Record<Stage, GateName | null> = {
  market_research: null,
  product_validation: "market_to_product",
  brand_build: "product_to_brand",
  marketing_plan: "brand_to_marketing",
  launch: "marketing_to_launch",
};

// Gate qui SUIT une étape (déverrouille la suivante).
export const GATE_AFTER: Record<Stage, GateName | null> = {
  market_research: "market_to_product",
  product_validation: "product_to_brand",
  brand_build: "brand_to_marketing",
  marketing_plan: "marketing_to_launch",
  launch: null,
};

export const GATE_LABELS: Record<GateName, string> = {
  market_to_product: "Porte 1 · Recherche marché → Validation produit",
  product_to_brand: "Porte 2 · Validation produit → Marque & boutique",
  brand_to_marketing: "Porte 3 · Marque/boutique → Plan marketing",
  marketing_to_launch: "Porte 4 · Plan marketing → Lancement",
};

function gateApproved(ctx: CandidateContext, gate: GateName): boolean {
  return ctx.gates.some((g) => g.gateName === gate && g.approvedByUser);
}

// Une étape est-elle déverrouillée (la porte d'entrée a-t-elle été approuvée) ?
export function isStageUnlocked(ctx: CandidateContext, stage: Stage): boolean {
  const gate = GATE_TO_ENTER[stage];
  if (!gate) return true;
  return gateApproved(ctx, gate);
}

// Décision du comité d'investissement (extraite du rapport, stockée sur le candidat).
export function committeeDecision(ctx: CandidateContext): "GO" | "HOLD" | "REJECT" | null {
  return ctx.candidate.investmentCommitteeDecision;
}

// Points de conformité non résolus (marqués 'to_verify') sans validation pro.
export function complianceBlockers(ctx: CandidateContext): Blocker[] {
  const c = ctx.compliance;
  if (!c) {
    return [
      {
        code: "compliance_missing",
        message: "Aucune revue de conformité enregistrée.",
        action: "Remplis la checklist de conformité (TVA/OSS, GPSR, CE, batteries, WEEE, GDPR, rétractation).",
      },
    ];
  }
  const fields = [c.vatOss, c.gpsr, c.ceMarking, c.batteryReg, c.weee, c.withdrawalRight, c.euResponsiblePerson, c.gdpr];
  const toVerify = fields.filter((f) => f === "to_verify").length;
  if (toVerify > 0 && !c.professionalReviewConfirmed) {
    return [
      {
        code: "compliance_unconfirmed",
        message: `${toVerify} point(s) de conformité marqué(s) « à vérifier » sans validation professionnelle.`,
        action: "Fais valider ces points par un professionnel puis coche « validé par un professionnel ».",
      },
    ];
  }
  return [];
}

// Renvoie les blocages qui empêchent d'exécuter les agents RESTANTS d'une étape,
// ainsi que la sous-liste d'agents exécutables maintenant.
export function stageRunPlan(
  ctx: CandidateContext,
  stage: Stage,
): { runnableAgentKeys: string[]; blockers: Blocker[] } {
  const blockers: Blocker[] = [];

  if (!isStageUnlocked(ctx, stage)) {
    const gate = GATE_TO_ENTER[stage]!;
    return {
      runnableAgentKeys: [],
      blockers: [
        {
          code: "stage_locked",
          message: `Étape verrouillée : ${GATE_LABELS[gate]} non approuvée.`,
          action: "Approuve la porte précédente pour débloquer cette étape.",
        },
      ],
    };
  }

  const all = agentsForStage(stage).map((a) => a.key);
  const done = new Set(ctx.reports.filter((r) => r.stage === stage).map((r) => keyFromLabel(r.agentRole)));
  const remaining = all.filter((k) => !done.has(k));

  // Étape B : le Supplier + Investment Committee exigent les données AutoDS réelles.
  if (stage === "product_validation") {
    const runnable: string[] = [];
    for (const key of remaining) {
      if ((key === "supplier" || key === "investment_committee") && !ctx.supplier) {
        continue; // bloqué tant que le formulaire AutoDS n'est pas soumis
      }
      runnable.push(key);
    }
    if ((remaining.includes("supplier") || remaining.includes("investment_committee")) && !ctx.supplier) {
      blockers.push({
        code: "autods_required",
        message: "Données AutoDS non saisies : Supplier Agent et Investment Committee bloqués.",
        action: "Remplis le formulaire AutoDS ci-dessous (le verdict fournisseur est calculé côté serveur).",
      });
    }
    return { runnableAgentKeys: runnable, blockers };
  }

  // Étape E : QA + Launch exigent conformité résolue ET modèle financier saisi.
  if (stage === "launch") {
    const runnable: string[] = [];
    const cBlockers = complianceBlockers(ctx);
    const financeMissing = !ctx.finance;
    for (const key of remaining) {
      if (key === "compliance") {
        runnable.push(key); // le Compliance Agent peut toujours tourner (il guide la checklist)
        continue;
      }
      // QA + Launch attendent : conformité résolue + finance calculée.
      if (cBlockers.length === 0 && !financeMissing) runnable.push(key);
    }
    if (cBlockers.length > 0 && remaining.some((k) => k === "qa" || k === "launch")) blockers.push(...cBlockers);
    if (financeMissing && remaining.some((k) => k === "qa" || k === "launch")) {
      blockers.push({
        code: "finance_required",
        message: "Modèle financier absent : le Finance Agent (calcul serveur) n'a pas reçu les coûts réels.",
        action: "Renseigne les coûts réels dans le modèle financier (calcul de pricing, CPA/ROAS break-even).",
      });
    }
    return { runnableAgentKeys: runnable, blockers };
  }

  return { runnableAgentKeys: remaining, blockers };
}

// Peut-on approuver une porte d'approbation ? (les agents de l'étape doivent avoir
// produit leurs rapports ; la porte 2 exige en plus une décision GO.)
export function canApproveGate(ctx: CandidateContext, gate: GateName): { ok: boolean; reason: string } {
  const stage = stageBeforeGate(gate);
  const plan = stageRunPlan(ctx, stage);
  const stageComplete = plan.runnableAgentKeys.length === 0 && plan.blockers.length === 0;

  if (!stageComplete) {
    return { ok: false, reason: `Termine l'étape « ${stage} » (agents restants ou blocages à lever) avant d'approuver.` };
  }
  if (gate === "product_to_brand") {
    if (committeeDecision(ctx) !== "GO") {
      return {
        ok: false,
        reason: "La porte 2 est bloquée tant que la décision de l'Investment Committee n'est pas GO.",
      };
    }
  }
  return { ok: true, reason: "" };
}

function stageBeforeGate(gate: GateName): Stage {
  const entry = (Object.entries(GATE_AFTER) as [Stage, GateName | null][]).find(([, g]) => g === gate);
  return entry ? entry[0] : "market_research";
}

// Un rapport stocke agentRole = label (ex. « Investment Committee »). On retrouve
// la clé technique pour raisonner sur l'exécution.
function keyFromLabel(label: string): string {
  return AGENTS.find((a) => a.label === label)?.key ?? label;
}
