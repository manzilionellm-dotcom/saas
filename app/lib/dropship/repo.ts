import { promises as fs } from "fs";
import path from "path";
import { newId } from "../db/repo";
import {
  type DropshippingProject,
  type ProductCandidate,
  type SupplierValidationInput,
  type ComplianceCheck,
  type FinancialModel,
  type AdRuleSet,
  type WeeklyMetricEntry,
  type AgentReport,
  type ApprovalGate,
  type ProjectStatus,
  type GateName,
  type DropshipDBShape,
  emptyDropshipDB,
} from "./types";

// ---------------------------------------------------------------------------
// Même contrat que app/lib/db/repo.ts : seule porte d'accès aux données du
// produit Dropshipping. Store fichier JSON (repli mémoire si FS en lecture
// seule). À remplacer par un PrismaDropshipRepository sans toucher aux routes.
// ---------------------------------------------------------------------------

export interface DropshipRepository {
  // Projets
  listProjects(): Promise<DropshippingProject[]>;
  getProject(id: string): Promise<DropshippingProject | null>;
  createProject(data: Omit<DropshippingProject, "id" | "createdAt" | "updatedAt">): Promise<DropshippingProject>;
  setProjectStatus(id: string, status: ProjectStatus): Promise<DropshippingProject | null>;
  deleteProject(id: string): Promise<boolean>;

  // Candidats produit
  createCandidate(data: Omit<ProductCandidate, "id" | "createdAt">): Promise<ProductCandidate>;
  getCandidate(id: string): Promise<ProductCandidate | null>;
  candidatesByProject(projectId: string): Promise<ProductCandidate[]>;
  updateCandidate(id: string, patch: Partial<Omit<ProductCandidate, "id" | "projectId" | "createdAt">>): Promise<ProductCandidate | null>;

  // Fournisseur (AutoDS)
  saveSupplierInput(data: Omit<SupplierValidationInput, "id" | "createdAt">): Promise<SupplierValidationInput>;
  getSupplierInput(candidateId: string): Promise<SupplierValidationInput | null>;

  // Conformité
  saveComplianceCheck(data: Omit<ComplianceCheck, "id" | "createdAt">): Promise<ComplianceCheck>;
  getComplianceCheck(candidateId: string): Promise<ComplianceCheck | null>;

  // Finance
  saveFinancialModel(data: Omit<FinancialModel, "id" | "createdAt">): Promise<FinancialModel>;
  getFinancialModel(candidateId: string): Promise<FinancialModel | null>;

  // Règles pub
  saveAdRuleSet(data: Omit<AdRuleSet, "id" | "createdAt">): Promise<AdRuleSet>;
  getAdRuleSet(candidateId: string): Promise<AdRuleSet | null>;

  // Métriques hebdo
  addWeeklyMetric(data: Omit<WeeklyMetricEntry, "id" | "createdAt">): Promise<WeeklyMetricEntry>;
  listWeeklyMetrics(candidateId: string): Promise<WeeklyMetricEntry[]>;

  // Rapports d'agents
  addReport(data: Omit<AgentReport, "id" | "createdAt">): Promise<AgentReport>;
  listReports(candidateId: string): Promise<AgentReport[]>;

  // Portes d'approbation
  approveGate(candidateId: string, gateName: GateName): Promise<ApprovalGate>;
  getGate(candidateId: string, gateName: GateName): Promise<ApprovalGate | null>;
  listGates(candidateId: string): Promise<ApprovalGate[]>;

  isSeeded(): Promise<boolean>;
  markSeeded(): Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "dropshipping.json");

class JsonDropshipRepository implements DropshipRepository {
  private cache: DropshipDBShape | null = null;
  private writable = true;

  private async load(): Promise<DropshipDBShape> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      this.cache = { ...emptyDropshipDB(), ...(JSON.parse(raw) as DropshipDBShape) };
    } catch {
      this.cache = emptyDropshipDB();
    }
    return this.cache;
  }

  private async persist(db: DropshipDBShape): Promise<void> {
    this.cache = db;
    if (!this.writable) return;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
    } catch {
      this.writable = false; // FS en lecture seule (serverless) : cache mémoire.
    }
  }

  async listProjects(): Promise<DropshippingProject[]> {
    const db = await this.load();
    return [...db.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string): Promise<DropshippingProject | null> {
    const db = await this.load();
    return db.projects.find((p) => p.id === id) ?? null;
  }

  async createProject(data: Omit<DropshippingProject, "id" | "createdAt" | "updatedAt">): Promise<DropshippingProject> {
    const db = await this.load();
    const ts = nowIso();
    const project: DropshippingProject = { ...data, id: newId(), createdAt: ts, updatedAt: ts };
    db.projects.push(project);
    await this.persist(db);
    return project;
  }

  async setProjectStatus(id: string, status: ProjectStatus): Promise<DropshippingProject | null> {
    const db = await this.load();
    const p = db.projects.find((x) => x.id === id);
    if (!p) return null;
    p.status = status;
    p.updatedAt = nowIso();
    await this.persist(db);
    return p;
  }

  async deleteProject(id: string): Promise<boolean> {
    const db = await this.load();
    const before = db.projects.length;
    const candIds = new Set(db.candidates.filter((c) => c.projectId === id).map((c) => c.id));
    db.projects = db.projects.filter((p) => p.id !== id);
    db.candidates = db.candidates.filter((c) => c.projectId !== id);
    db.supplierInputs = db.supplierInputs.filter((s) => !candIds.has(s.productCandidateId));
    db.complianceChecks = db.complianceChecks.filter((s) => !candIds.has(s.productCandidateId));
    db.financialModels = db.financialModels.filter((s) => !candIds.has(s.productCandidateId));
    db.adRuleSets = db.adRuleSets.filter((s) => !candIds.has(s.productCandidateId));
    db.weeklyMetrics = db.weeklyMetrics.filter((s) => !candIds.has(s.productCandidateId));
    db.reports = db.reports.filter((s) => !candIds.has(s.productCandidateId));
    db.gates = db.gates.filter((s) => !candIds.has(s.productCandidateId));
    await this.persist(db);
    return db.projects.length < before;
  }

  async createCandidate(data: Omit<ProductCandidate, "id" | "createdAt">): Promise<ProductCandidate> {
    const db = await this.load();
    const candidate: ProductCandidate = { ...data, id: newId(), createdAt: nowIso() };
    db.candidates.push(candidate);
    await this.persist(db);
    return candidate;
  }

  async getCandidate(id: string): Promise<ProductCandidate | null> {
    const db = await this.load();
    return db.candidates.find((c) => c.id === id) ?? null;
  }

  async candidatesByProject(projectId: string): Promise<ProductCandidate[]> {
    const db = await this.load();
    return db.candidates.filter((c) => c.projectId === projectId);
  }

  async updateCandidate(
    id: string,
    patch: Partial<Omit<ProductCandidate, "id" | "projectId" | "createdAt">>,
  ): Promise<ProductCandidate | null> {
    const db = await this.load();
    const c = db.candidates.find((x) => x.id === id);
    if (!c) return null;
    Object.assign(c, patch);
    await this.persist(db);
    return c;
  }

  async saveSupplierInput(data: Omit<SupplierValidationInput, "id" | "createdAt">): Promise<SupplierValidationInput> {
    const db = await this.load();
    db.supplierInputs = db.supplierInputs.filter((s) => s.productCandidateId !== data.productCandidateId);
    const input: SupplierValidationInput = { ...data, id: newId(), createdAt: nowIso() };
    db.supplierInputs.push(input);
    await this.persist(db);
    return input;
  }

  async getSupplierInput(candidateId: string): Promise<SupplierValidationInput | null> {
    const db = await this.load();
    return db.supplierInputs.find((s) => s.productCandidateId === candidateId) ?? null;
  }

  async saveComplianceCheck(data: Omit<ComplianceCheck, "id" | "createdAt">): Promise<ComplianceCheck> {
    const db = await this.load();
    db.complianceChecks = db.complianceChecks.filter((s) => s.productCandidateId !== data.productCandidateId);
    const check: ComplianceCheck = { ...data, id: newId(), createdAt: nowIso() };
    db.complianceChecks.push(check);
    await this.persist(db);
    return check;
  }

  async getComplianceCheck(candidateId: string): Promise<ComplianceCheck | null> {
    const db = await this.load();
    return db.complianceChecks.find((s) => s.productCandidateId === candidateId) ?? null;
  }

  async saveFinancialModel(data: Omit<FinancialModel, "id" | "createdAt">): Promise<FinancialModel> {
    const db = await this.load();
    db.financialModels = db.financialModels.filter((s) => s.productCandidateId !== data.productCandidateId);
    const model: FinancialModel = { ...data, id: newId(), createdAt: nowIso() };
    db.financialModels.push(model);
    await this.persist(db);
    return model;
  }

  async getFinancialModel(candidateId: string): Promise<FinancialModel | null> {
    const db = await this.load();
    return db.financialModels.find((s) => s.productCandidateId === candidateId) ?? null;
  }

  async saveAdRuleSet(data: Omit<AdRuleSet, "id" | "createdAt">): Promise<AdRuleSet> {
    const db = await this.load();
    db.adRuleSets = db.adRuleSets.filter((s) => s.productCandidateId !== data.productCandidateId);
    const rs: AdRuleSet = { ...data, id: newId(), createdAt: nowIso() };
    db.adRuleSets.push(rs);
    await this.persist(db);
    return rs;
  }

  async getAdRuleSet(candidateId: string): Promise<AdRuleSet | null> {
    const db = await this.load();
    return db.adRuleSets.find((s) => s.productCandidateId === candidateId) ?? null;
  }

  async addWeeklyMetric(data: Omit<WeeklyMetricEntry, "id" | "createdAt">): Promise<WeeklyMetricEntry> {
    const db = await this.load();
    const entry: WeeklyMetricEntry = { ...data, id: newId(), createdAt: nowIso() };
    db.weeklyMetrics.push(entry);
    await this.persist(db);
    return entry;
  }

  async listWeeklyMetrics(candidateId: string): Promise<WeeklyMetricEntry[]> {
    const db = await this.load();
    return db.weeklyMetrics
      .filter((m) => m.productCandidateId === candidateId)
      .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  }

  async addReport(data: Omit<AgentReport, "id" | "createdAt">): Promise<AgentReport> {
    const db = await this.load();
    const report: AgentReport = { ...data, id: newId(), createdAt: nowIso() };
    db.reports.push(report);
    await this.persist(db);
    return report;
  }

  async listReports(candidateId: string): Promise<AgentReport[]> {
    const db = await this.load();
    return db.reports
      .filter((r) => r.productCandidateId === candidateId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async approveGate(candidateId: string, gateName: GateName): Promise<ApprovalGate> {
    const db = await this.load();
    let gate = db.gates.find((g) => g.productCandidateId === candidateId && g.gateName === gateName);
    if (!gate) {
      gate = { id: newId(), productCandidateId: candidateId, gateName, approvedByUser: false, approvedAt: null };
      db.gates.push(gate);
    }
    gate.approvedByUser = true;
    gate.approvedAt = nowIso();
    await this.persist(db);
    return gate;
  }

  async getGate(candidateId: string, gateName: GateName): Promise<ApprovalGate | null> {
    const db = await this.load();
    return db.gates.find((g) => g.productCandidateId === candidateId && g.gateName === gateName) ?? null;
  }

  async listGates(candidateId: string): Promise<ApprovalGate[]> {
    const db = await this.load();
    return db.gates.filter((g) => g.productCandidateId === candidateId);
  }

  async isSeeded(): Promise<boolean> {
    const db = await this.load();
    return db.seeded;
  }

  async markSeeded(): Promise<void> {
    const db = await this.load();
    db.seeded = true;
    await this.persist(db);
  }
}

// Singleton via globalThis (même approche que le repo principal).
const globalForRepo = globalThis as unknown as { __dropshipRepo?: DropshipRepository };
export const dropshipRepo: DropshipRepository = globalForRepo.__dropshipRepo ?? new JsonDropshipRepository();
if (!globalForRepo.__dropshipRepo) globalForRepo.__dropshipRepo = dropshipRepo;
