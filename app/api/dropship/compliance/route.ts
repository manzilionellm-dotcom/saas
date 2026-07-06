import { dropshipRepo } from "../../../lib/dropship/repo";
import type { ComplianceState } from "../../../lib/dropship/types";

export const dynamic = "force-dynamic";

const STATES: ComplianceState[] = ["n/a", "to_verify", "verified"];
const FIELDS = ["vatOss", "gpsr", "ceMarking", "batteryReg", "weee", "withdrawalRight", "euResponsiblePerson", "gdpr"] as const;

function state(v: unknown): ComplianceState {
  return (STATES as string[]).includes(String(v)) ? (v as ComplianceState) : "to_verify";
}

// POST /api/dropship/compliance { candidateId, <points>, professionalReviewConfirmed }
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

  const saved = await dropshipRepo.saveComplianceCheck({
    productCandidateId: candidateId,
    vatOss: state(body.vatOss),
    gpsr: state(body.gpsr),
    ceMarking: state(body.ceMarking),
    batteryReg: state(body.batteryReg),
    weee: state(body.weee),
    withdrawalRight: state(body.withdrawalRight),
    euResponsiblePerson: state(body.euResponsiblePerson),
    gdpr: state(body.gdpr),
    professionalReviewConfirmed: body.professionalReviewConfirmed === true,
  });

  // Rappel : la validation professionnelle est requise si un point est « à vérifier ».
  const toVerify = FIELDS.filter((f) => saved[f] === "to_verify").length;
  return Response.json({
    compliance: saved,
    note:
      toVerify > 0 && !saved.professionalReviewConfirmed
        ? "Des points sont « à vérifier » : coche « validé par un professionnel » pour débloquer le lancement."
        : null,
  });
}
