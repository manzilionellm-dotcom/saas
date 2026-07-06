import { runLLM } from "../llm";
import { dropshipRepo } from "./repo";
import { BASE_SYSTEM_PROMPT } from "./prompts/baseSystemPrompt";
import { getAgent, type AgentRole } from "./agents";
import { buildCandidateContext, type CandidateContext } from "./context";
import { stageRunPlan, type Blocker } from "./gates";
import type { Claim, ClaimLabel, CommitteeDecision, ConfidenceLevel, Stage } from "./types";

// Orchestration du pipeline multi-agent. « Multi-agent » = un appel LLM séparé
// par agent, séquentiel, chaque sortie nourrissant le contexte du suivant.

const VALID_LABELS: ClaimLabel[] = ["VERIFIED", "ESTIMATE", "USER_MUST_VERIFY", "UNKNOWN"];
const VALID_CONF: ConfidenceLevel[] = ["high", "medium", "low"];

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export type StageRunResult = {
  ran: { role: string; reportId: string; confidence: ConfidenceLevel }[];
  blockers: Blocker[];
  decision?: CommitteeDecision | null;
};

// Sépare le rapport markdown du bloc machine ---AUDIT--- et le parse proprement.
export function parseAudit(raw: string): { content: string; claims: Claim[]; confidence: ConfidenceLevel } {
  const marker = "---AUDIT---";
  const idx = raw.indexOf(marker);
  if (idx === -1) return { content: raw.trim(), claims: [], confidence: "low" };

  const content = raw.slice(0, idx).trim();
  const jsonPart = raw.slice(idx + marker.length).trim();
  try {
    const parsed = JSON.parse(jsonPart) as { confidence?: string; claims?: unknown[] };
    const confidence = (VALID_CONF as string[]).includes(parsed.confidence ?? "")
      ? (parsed.confidence as ConfidenceLevel)
      : "low";
    const claims: Claim[] = Array.isArray(parsed.claims)
      ? parsed.claims
          .map((c) => c as Record<string, unknown>)
          .filter((c) => typeof c.statement === "string" && (VALID_LABELS as string[]).includes(String(c.label)))
          .map((c) => ({
            label: c.label as ClaimLabel,
            statement: String(c.statement),
            source: typeof c.source === "string" ? c.source : undefined,
            whereToVerify: typeof c.whereToVerify === "string" ? c.whereToVerify : undefined,
          }))
      : [];
    return { content, claims, confidence };
  } catch {
    return { content, claims: [], confidence: "low" };
  }
}

// Construit le contexte texte fourni à un agent : description initiale + rapports
// précédents (condensés) + données fournisseur/finance quand elles existent.
function buildAgentContext(ctx: CandidateContext, agent: AgentRole): string {
  const parts: string[] = [];
  parts.push(`DESCRIPTION INITIALE DE L'UTILISATEUR :\n${ctx.candidate.rawDescription}`);

  if (ctx.reports.length > 0) {
    const prior = ctx.reports
      .map((r) => `### Rapport ${r.agentRole} (${r.stage}, confiance ${r.confidenceLevel})\n${truncate(r.content, 1200)}`)
      .join("\n\n");
    parts.push(`RAPPORTS PRÉCÉDENTS DU PIPELINE :\n${prior}`);
  }

  if (ctx.supplier && (agent.stage === "product_validation" || agent.key === "qa" || agent.key === "launch")) {
    const s = ctx.supplier;
    parts.push(
      `DONNÉES AUTODS RÉELLES (saisies par l'utilisateur) + VERDICT SERVEUR = ${s.verdict} :\n` +
        JSON.stringify(
          {
            productName: s.productNameInput,
            supplierName: s.supplierName,
            productCost: s.productCost,
            shippingCost: s.shippingCost,
            deliveryDays: s.deliveryDays,
            supplierRating: s.supplierRating,
            reviewCount: s.reviewCount,
            averageReviewScore: s.averageReviewScore,
            stockStability: s.stockStability,
            recurringComplaints: s.recurringComplaints,
            verdictReasons: s.verdictReasons,
          },
          null,
          2,
        ),
    );
  }

  if (ctx.finance && (agent.key === "qa" || agent.key === "launch" || agent.stage === "marketing_plan")) {
    parts.push(
      `MODÈLE FINANCIER (calculé côté serveur, ne pas recalculer) :\n` +
        JSON.stringify(
          {
            sellingPrice: ctx.finance.computedSellingPrice,
            landedCost: ctx.finance.computedLandedCost,
            breakEvenCPA: ctx.finance.computedBreakEvenCPA,
            maxCPA: ctx.finance.computedMaxCPA,
            breakEvenROAS: ctx.finance.computedBreakEvenROAS,
            warnings: ctx.finance.warnings,
          },
          null,
          2,
        ),
    );
  }

  parts.push(`TA TÂCHE :\n${agent.task}`);
  return parts.join("\n\n");
}

// Exécute un agent : construit la requête, appelle runLLM (Claude ou repli local),
// parse l'audit, stocke le rapport.
async function runAgent(agent: AgentRole, ctx: CandidateContext) {
  const system = `${BASE_SYSTEM_PROMPT}\n\n${agent.roleInstruction}`;
  const prompt = buildAgentContext(ctx, agent);

  const res = await runLLM({
    system,
    prompt,
    maxTokens: 1600,
    locale: "fr",
    meta: { kind: `dropship:${agent.key}`, businessName: ctx.candidate.productName ?? ctx.candidate.rawDescription },
  });

  const { content, claims, confidence } = parseAudit(res.text);

  const report = await dropshipRepo.addReport({
    productCandidateId: ctx.candidate.id,
    agentRole: agent.label,
    stage: agent.stage,
    content,
    claimsAudit: claims,
    confidenceLevel: confidence,
  });

  // Le rapport nourrit le contexte de l'agent suivant (séquentiel réel).
  ctx.reports.push(report);
  return report;
}

// Extrait la décision GO/HOLD/REJECT d'un rapport Investment Committee.
export function extractDecision(content: string): CommitteeDecision | null {
  const m = content.match(/D[EÉ]CISION\s*[:：]\s*(GO|HOLD|REJECT)/i);
  if (m) return m[1].toUpperCase() as CommitteeDecision;
  // Repli : premier mot-clé rencontré.
  const first = content.match(/\b(GO|HOLD|REJECT)\b/);
  return first ? (first[1].toUpperCase() as CommitteeDecision) : null;
}

// Exécute tous les agents exécutables d'une étape, en séquence.
export async function runStage(candidateId: string, stage: Stage): Promise<StageRunResult | null> {
  const ctx = await buildCandidateContext(candidateId);
  if (!ctx) return null;

  const plan = stageRunPlan(ctx, stage);
  const ran: StageRunResult["ran"] = [];
  let decision: CommitteeDecision | null = ctx.candidate.investmentCommitteeDecision;

  for (const key of plan.runnableAgentKeys) {
    const agent = getAgent(key);
    if (!agent) continue;
    const report = await runAgent(agent, ctx);
    ran.push({ role: agent.label, reportId: report.id, confidence: report.confidenceLevel });

    if (key === "investment_committee") {
      decision = extractDecision(report.content);
      await dropshipRepo.updateCandidate(candidateId, {
        investmentCommitteeDecision: decision,
        decisionRationale: report.content.slice(0, 800),
      });
    }
  }

  return { ran, blockers: plan.blockers, decision };
}
