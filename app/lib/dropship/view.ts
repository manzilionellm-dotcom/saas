import type { CandidateContext } from "./context";
import { STAGES, STAGE_LABELS, agentsForStage } from "./agents";
import {
  GATE_AFTER,
  GATE_LABELS,
  canApproveGate,
  committeeDecision,
  isStageUnlocked,
  stageRunPlan,
  type Blocker,
} from "./gates";
import type { AgentReport, GateName, Stage } from "./types";

// Vue « prête pour l'UI » de l'état du pipeline d'un candidat. Source unique
// consommée par la route [id] et la page de workspace.

export type StageView = {
  stage: Stage;
  label: string;
  unlocked: boolean;
  agents: { key: string; label: string; done: boolean; confidence?: string }[];
  runnableAgentKeys: string[];
  blockers: Blocker[];
  complete: boolean; // tous agents faits + aucun blocage
  gate: GateName | null;
  gateLabel: string | null;
  gateApproved: boolean;
  gateApprovable: boolean;
  gateApprovalReason: string;
  reports: AgentReport[];
};

export type PipelineView = {
  decision: ReturnType<typeof committeeDecision>;
  stages: StageView[];
};

export function buildPipelineView(ctx: CandidateContext): PipelineView {
  const stages: StageView[] = STAGES.map((stage) => {
    const plan = stageRunPlan(ctx, stage);
    const stageReports = ctx.reports.filter((r) => r.stage === stage);
    const doneKeys = new Set(stageReports.map((r) => r.agentRole));

    const agents = agentsForStage(stage).map((a) => {
      const rep = stageReports.find((r) => r.agentRole === a.label);
      return { key: a.key, label: a.label, done: doneKeys.has(a.label), confidence: rep?.confidenceLevel };
    });

    const unlocked = isStageUnlocked(ctx, stage);
    const complete = unlocked && plan.runnableAgentKeys.length === 0 && plan.blockers.length === 0;
    const gate = GATE_AFTER[stage];
    const gateApproved = gate ? ctx.gates.some((g) => g.gateName === gate && g.approvedByUser) : false;
    const approvable = gate ? canApproveGate(ctx, gate) : { ok: false, reason: "" };

    return {
      stage,
      label: STAGE_LABELS[stage],
      unlocked,
      agents,
      runnableAgentKeys: plan.runnableAgentKeys,
      blockers: plan.blockers,
      complete,
      gate,
      gateLabel: gate ? GATE_LABELS[gate] : null,
      gateApproved,
      gateApprovable: approvable.ok,
      gateApprovalReason: approvable.reason,
      reports: stageReports,
    };
  });

  return { decision: committeeDecision(ctx), stages };
}
