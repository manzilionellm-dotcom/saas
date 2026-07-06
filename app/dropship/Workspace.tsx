"use client";

import { useState } from "react";
import Link from "next/link";
import { AUTODS_FIELDS } from "../lib/dropship/supplier";
import type { PipelineView, StageView } from "../lib/dropship/view";
import type {
  Claim,
  ComplianceCheck,
  DropshippingProject,
  FinancialModel,
  GateName,
  ProductCandidate,
  SupplierValidationInput,
} from "../lib/dropship/types";

export type ProjectState = {
  project: DropshippingProject;
  candidate: ProductCandidate | null;
  supplier: SupplierValidationInput | null;
  compliance: ComplianceCheck | null;
  finance: FinancialModel | null;
  pipeline: PipelineView | null;
};

const card = "rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";
const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const btnPrimary =
  "rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50";
const btnGhost =
  "rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-400 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300";

const CLAIM_STYLES: Record<Claim["label"], string> = {
  VERIFIED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  ESTIMATE: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  USER_MUST_VERIFY: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  UNKNOWN: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export default function Workspace({ initial }: { initial: ProjectState }) {
  const [data, setData] = useState<ProjectState>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidate = data.candidate;
  const pipeline = data.pipeline;

  async function refresh() {
    const res = await fetch(`/api/dropship/project/${data.project.id}`);
    if (res.ok) setData(await res.json());
  }

  async function act(tag: string, url: string, body: unknown) {
    setError(null);
    setBusy(tag);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setBusy(null);
    }
  }

  if (!candidate || !pipeline) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucun candidat produit sur ce projet.</p>;
  }

  const decisionColor =
    pipeline.decision === "GO"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : pipeline.decision === "REJECT"
        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          Statut : {data.project.status}
        </span>
        {pipeline.decision && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${decisionColor}`}>
            Comité : {pipeline.decision}
          </span>
        )}
        <div className="ml-auto flex gap-3 text-xs">
          <Link href={`/dropship/${data.project.id}/deliverable`} className="text-indigo-600 hover:underline dark:text-indigo-400">
            📄 Pack de lancement
          </Link>
          <a href={`/api/dropship/export?projectId=${data.project.id}&format=md`} className="text-indigo-600 hover:underline dark:text-indigo-400">
            ⬇ Markdown
          </a>
          <a href={`/api/dropship/export?projectId=${data.project.id}&format=json`} className="text-indigo-600 hover:underline dark:text-indigo-400">
            ⬇ JSON
          </a>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <div className="mt-6 space-y-5">
        {pipeline.stages.map((stage) => (
          <StageCard
            key={stage.stage}
            stage={stage}
            candidateId={candidate.id}
            supplier={data.supplier}
            compliance={data.compliance}
            finance={data.finance}
            busy={busy}
            onRun={() => act(`run:${stage.stage}`, "/api/dropship/run", { candidateId: candidate.id, stage: stage.stage })}
            onGate={(gate) => act(`gate:${gate}`, "/api/dropship/gate", { candidateId: candidate.id, gateName: gate })}
            onSupplier={(fields) => act("supplier", "/api/dropship/supplier", { candidateId: candidate.id, ...fields })}
            onCompliance={(fields) => act("compliance", "/api/dropship/compliance", { candidateId: candidate.id, ...fields })}
            onFinance={(fields) => act("finance", "/api/dropship/finance", { candidateId: candidate.id, ...fields })}
          />
        ))}
      </div>

      {/* Suivi hebdomadaire (boucle test/scale/kill) — disponible dès que le modèle financier existe. */}
      {data.finance && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">📈 Suivi hebdomadaire (données réelles)</h2>
          <MetricsForm busy={busy} onSubmit={(fields) => act("metrics", "/api/dropship/metrics", { candidateId: candidate.id, ...fields })} />
        </section>
      )}
    </div>
  );
}

function StageCard(props: {
  stage: StageView;
  candidateId: string;
  supplier: SupplierValidationInput | null;
  compliance: ComplianceCheck | null;
  finance: FinancialModel | null;
  busy: string | null;
  onRun: () => void;
  onGate: (gate: GateName) => void;
  onSupplier: (fields: Record<string, unknown>) => void;
  onCompliance: (fields: Record<string, unknown>) => void;
  onFinance: (fields: Record<string, unknown>) => void;
}) {
  const { stage, busy } = props;
  const runningThis = busy === `run:${stage.stage}`;
  const canRun = stage.unlocked && stage.runnableAgentKeys.length > 0;

  return (
    <div className={`${card} ${!stage.unlocked ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {stage.unlocked ? (stage.complete ? "✅ " : "") : "🔒 "}
          {stage.label}
        </h3>
        <button type="button" className={btnPrimary} disabled={!canRun || busy !== null} onClick={props.onRun}>
          {runningThis ? "Agents en cours…" : stage.runnableAgentKeys.length > 0 ? "Exécuter l'étape" : "Étape terminée"}
        </button>
      </div>

      {/* Agents de l'étape */}
      <div className="mt-3 flex flex-wrap gap-2">
        {stage.agents.map((a) => (
          <span
            key={a.key}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.done ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" : "bg-zinc-50 text-zinc-400 dark:bg-zinc-950 dark:text-zinc-600"}`}
          >
            {a.done ? "•" : "○"} {a.label}
            {a.confidence ? ` · ${a.confidence}` : ""}
          </span>
        ))}
      </div>

      {/* Blocages — visibles comme « action requise » */}
      {stage.blockers.map((b) => (
        <div key={b.code} className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-800 dark:text-amber-300">⛔ Bloqué — action requise</p>
          <p className="text-amber-800 dark:text-amber-200">{b.message}</p>
          <p className="mt-1 text-amber-700 dark:text-amber-300">→ {b.action}</p>
        </div>
      ))}

      {/* Formulaire AutoDS (étape B) */}
      {stage.stage === "product_validation" && stage.unlocked && (
        <SupplierBlock supplier={props.supplier} busy={busy} onSubmit={props.onSupplier} />
      )}

      {/* Conformité + Finance (étape E) */}
      {stage.stage === "launch" && stage.unlocked && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ComplianceBlock compliance={props.compliance} busy={busy} onSubmit={props.onCompliance} />
          <FinanceBlock finance={props.finance} busy={busy} onSubmit={props.onFinance} />
        </div>
      )}

      {/* Rapports de l'étape */}
      {stage.reports.length > 0 && (
        <div className="mt-4 space-y-3">
          {stage.reports.map((r) => (
            <ReportView key={r.id} role={r.agentRole} confidence={r.confidenceLevel} content={r.content} claims={r.claimsAudit} />
          ))}
        </div>
      )}

      {/* Porte d'approbation */}
      {stage.gate && (
        <div className="mt-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              🚪 {stage.gateLabel} {stage.gateApproved ? "· ✅ approuvée" : ""}
            </p>
            {!stage.gateApproved && (
              <button
                type="button"
                className={btnGhost}
                disabled={!stage.gateApprovable || busy !== null}
                onClick={() => stage.gate && props.onGate(stage.gate)}
              >
                Approuver la porte
              </button>
            )}
          </div>
          {!stage.gateApproved && !stage.gateApprovable && stage.gateApprovalReason && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{stage.gateApprovalReason}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ReportView({ role, confidence, content, claims }: { role: string; confidence: string; content: string; claims: Claim[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-2 text-left">
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{role}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">confiance {confidence} · {open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">{content}</pre>
          {claims.length > 0 && (
            <div className="mt-3 space-y-1">
              {claims.map((c, i) => (
                <div key={i} className="flex flex-wrap items-start gap-2 text-xs">
                  <span className={`rounded px-1.5 py-0.5 font-semibold ${CLAIM_STYLES[c.label]}`}>{c.label}</span>
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {c.statement}
                    {c.source ? ` — source : ${c.source}` : ""}
                    {c.whereToVerify ? ` — vérifier : ${c.whereToVerify}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SupplierBlock({ supplier, busy, onSubmit }: { supplier: SupplierValidationInput | null; busy: string | null; onSubmit: (f: Record<string, unknown>) => void }) {
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of AUTODS_FIELDS) {
      const v = supplier ? (supplier as unknown as Record<string, unknown>)[f.key as string] : "";
      init[f.key as string] = v === null || v === undefined ? "" : String(v);
    }
    return init;
  });

  const verdictColor =
    supplier?.verdict === "PASS"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : supplier?.verdict === "FAIL"
        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Formulaire AutoDS (saisie manuelle obligatoire)</p>
      {supplier && (
        <div className="mt-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verdictColor}`}>Verdict serveur : {supplier.verdict}</span>
          <ul className="mt-2 list-disc pl-5 text-xs text-zinc-600 dark:text-zinc-400">
            {supplier.verdictReasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {AUTODS_FIELDS.map((f) => (
          <label key={f.key as string} className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {f.label}
            {f.required ? " *" : ""}
            {f.type === "select" ? (
              <select className={input} value={fields[f.key as string]} onChange={(e) => setFields({ ...fields, [f.key as string]: e.target.value })}>
                <option value="">—</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                className={input}
                type={f.type === "number" ? "number" : "text"}
                value={fields[f.key as string]}
                placeholder={f.placeholder}
                onChange={(e) => setFields({ ...fields, [f.key as string]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <button type="button" className={`${btnPrimary} mt-4`} disabled={busy !== null} onClick={() => onSubmit(fields)}>
        {busy === "supplier" ? "Calcul du verdict…" : supplier ? "Mettre à jour & recalculer" : "Valider les données AutoDS"}
      </button>
    </div>
  );
}

const COMPLIANCE_POINTS: { key: keyof ComplianceCheck; label: string }[] = [
  { key: "vatOss", label: "TVA / OSS" },
  { key: "gpsr", label: "GPSR" },
  { key: "ceMarking", label: "Marquage CE" },
  { key: "batteryReg", label: "Réglementation batteries" },
  { key: "weee", label: "WEEE / DEEE" },
  { key: "withdrawalRight", label: "Droit de rétractation" },
  { key: "euResponsiblePerson", label: "Personne responsable UE" },
  { key: "gdpr", label: "GDPR" },
];

function ComplianceBlock({ compliance, busy, onSubmit }: { compliance: ComplianceCheck | null; busy: string | null; onSubmit: (f: Record<string, unknown>) => void }) {
  const [state, setState] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of COMPLIANCE_POINTS) init[p.key as string] = compliance ? String(compliance[p.key]) : "to_verify";
    return init;
  });
  const [pro, setPro] = useState<boolean>(compliance?.professionalReviewConfirmed ?? false);

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Checklist conformité UE</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">⚠️ Ceci n&apos;est pas un avis juridique.</p>
      <div className="mt-3 space-y-2">
        {COMPLIANCE_POINTS.map((p) => (
          <label key={p.key as string} className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            {p.label}
            <select className={`${input} w-36`} value={state[p.key as string]} onChange={(e) => setState({ ...state, [p.key as string]: e.target.value })}>
              <option value="n/a">n/a</option>
              <option value="to_verify">à vérifier</option>
              <option value="verified">vérifié</option>
            </select>
          </label>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
        Validé par un professionnel
      </label>
      <button type="button" className={`${btnGhost} mt-3`} disabled={busy !== null} onClick={() => onSubmit({ ...state, professionalReviewConfirmed: pro })}>
        {busy === "compliance" ? "Enregistrement…" : "Enregistrer la conformité"}
      </button>
    </div>
  );
}

function FinanceBlock({ finance, busy, onSubmit }: { finance: FinancialModel | null; busy: string | null; onSubmit: (f: Record<string, unknown>) => void }) {
  const [f, setF] = useState({
    productCost: finance ? String(finance.productCost) : "",
    shippingCost: finance ? String(finance.shippingCost) : "",
    transactionFeeRate: finance ? String(finance.transactionFeeRate) : "0.03",
    targetGrossMarginRate: finance ? String(finance.targetGrossMarginRate) : "0.65",
    adCushionRate: finance ? String(finance.adCushionRate) : "0.25",
  });

  const num = (k: keyof typeof f, label: string, hint?: string) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
      {label}
      {hint ? <span className="text-[10px] text-zinc-400">{hint}</span> : null}
      <input className={input} type="number" step="0.01" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Modèle financier (calcul serveur)</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {num("productCost", "Coût produit (€)")}
        {num("shippingCost", "Coût livraison (€)")}
        {num("transactionFeeRate", "Frais transaction", "ex. 0.03")}
        {num("targetGrossMarginRate", "Marge brute cible", "ex. 0.65")}
        {num("adCushionRate", "Coussin pub", "ex. 0.25")}
      </div>
      <button type="button" className={`${btnGhost} mt-3`} disabled={busy !== null} onClick={() => onSubmit(f)}>
        {busy === "finance" ? "Calcul…" : "Calculer le modèle"}
      </button>
      {finance && (
        <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          <p>Coût atterri : <strong>{finance.computedLandedCost} €</strong> · Prix : <strong>{finance.computedSellingPrice} €</strong></p>
          <p>CPA break-even : <strong>{finance.computedBreakEvenCPA} €</strong> · CPA max : <strong>{finance.computedMaxCPA} €</strong></p>
          <p>ROAS break-even : <strong>{finance.computedBreakEvenROAS}</strong></p>
          {finance.warnings.map((w, i) => <p key={i} className="mt-1 text-amber-600 dark:text-amber-400">⚠️ {w}</p>)}
        </div>
      )}
    </div>
  );
}

function MetricsForm({ busy, onSubmit }: { busy: string | null; onSubmit: (f: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ weekStartDate: "", spend: "", revenue: "", cpa: "", roas: "", ctr: "", cpc: "", conversionRate: "", aov: "", refundRate: "" });
  const num = (k: keyof typeof f, label: string) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
      {label}
      <input className={input} type={k === "weekStartDate" ? "date" : "number"} step="0.01" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className={card}>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Saisis les VRAIES données de la semaine (Ads Manager / Shopify). La recommandation est calculée côté serveur.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {num("weekStartDate", "Semaine")}
        {num("spend", "Dépense (€)")}
        {num("revenue", "CA (€)")}
        {num("cpa", "CPA (€)")}
        {num("roas", "ROAS")}
        {num("ctr", "CTR")}
        {num("cpc", "CPC (€)")}
        {num("conversionRate", "Taux conv.")}
        {num("aov", "AOV (€)")}
        {num("refundRate", "Taux rembours.")}
      </div>
      <button type="button" className={`${btnPrimary} mt-4`} disabled={busy !== null} onClick={() => onSubmit(f)}>
        {busy === "metrics" ? "Analyse…" : "Enregistrer & recommander"}
      </button>
    </div>
  );
}
