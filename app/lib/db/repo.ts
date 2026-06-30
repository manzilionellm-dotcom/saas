import { promises as fs } from "fs";
import path from "path";
import {
  type Business,
  type Generation,
  type Result,
  type DailyBrief,
  type Competitor,
  type LLMLog,
  type BusinessGenome,
  type GenomeSnapshot,
  type Decision,
  type Conversation,
  type ChatMessage,
  type PromptVersion,
  type DBShape,
  emptyDB,
} from "./types";

// ---------------------------------------------------------------------------
// Repository : seule porte d'accès aux données. La logique métier ne touche
// jamais le stockage directement. Implémentation actuelle = fichier JSON
// (local-first, zéro binaire). À remplacer par PrismaRepository en production
// sans changer un seul appel métier.
// ---------------------------------------------------------------------------

export interface Repository {
  listBusinesses(): Promise<Business[]>;
  getBusiness(id: string): Promise<Business | null>;
  createBusiness(data: Omit<Business, "id" | "createdAt">): Promise<Business>;
  updateBusiness(id: string, patch: Partial<Omit<Business, "id" | "createdAt">>): Promise<Business | null>;
  deleteBusiness(id: string): Promise<boolean>;

  addGeneration(data: Omit<Generation, "id" | "createdAt">): Promise<Generation>;
  listGenerations(businessId: string): Promise<Generation[]>;
  getGeneration(id: string): Promise<Generation | null>;

  addResult(data: Omit<Result, "id" | "recordedAt">): Promise<Result>;
  listResults(businessId: string): Promise<Result[]>;
  resultsByGeneration(generationId: string): Promise<Result[]>;

  addBrief(data: Omit<DailyBrief, "id" | "date">): Promise<DailyBrief>;
  latestBrief(businessId: string): Promise<DailyBrief | null>;
  addCompetitor(data: Omit<Competitor, "id" | "updatedAt">): Promise<Competitor>;

  saveGenome(businessId: string, snapshot: GenomeSnapshot, dataPoints: number): Promise<BusinessGenome>;
  getGenome(businessId: string): Promise<BusinessGenome | null>;

  addDecision(data: Omit<Decision, "id" | "date">): Promise<Decision>;
  latestDecision(businessId: string): Promise<Decision | null>;

  getConversation(businessId: string): Promise<Conversation | null>;
  appendConversation(businessId: string, msgs: ChatMessage[]): Promise<Conversation>;

  listPromptVersions(): Promise<PromptVersion[]>;
  seedPromptVersions(versions: Omit<PromptVersion, "id" | "createdAt">[]): Promise<void>;
  setDefaultPrompt(kind: string, version: string): Promise<void>;

  allGenerations(): Promise<Generation[]>;
  allResults(): Promise<Result[]>;

  addLLMLog(data: Omit<LLMLog, "id" | "createdAt">): Promise<LLMLog>;
  listLLMLogs(limit?: number): Promise<LLMLog[]>;

  isSeeded(): Promise<boolean>;
  markSeeded(): Promise<void>;
}

// --- Utilitaires ------------------------------------------------------------

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
function nowIso(): string {
  return new Date().toISOString();
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "viral-ai-os.json");

// --- Implémentation fichier JSON (avec repli mémoire si FS en lecture seule) -

class JsonRepository implements Repository {
  private cache: DBShape | null = null;
  private writable = true;

  private async load(): Promise<DBShape> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      this.cache = { ...emptyDB(), ...(JSON.parse(raw) as DBShape) };
    } catch {
      this.cache = emptyDB();
    }
    return this.cache;
  }

  private async persist(db: DBShape): Promise<void> {
    this.cache = db;
    if (!this.writable) return;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
    } catch {
      // FS en lecture seule (ex. serverless) : on garde en mémoire pour la session.
      this.writable = false;
    }
  }

  async listBusinesses(): Promise<Business[]> {
    const db = await this.load();
    return [...db.businesses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getBusiness(id: string): Promise<Business | null> {
    const db = await this.load();
    return db.businesses.find((b) => b.id === id) ?? null;
  }

  async createBusiness(data: Omit<Business, "id" | "createdAt">): Promise<Business> {
    const db = await this.load();
    const business: Business = { ...data, id: newId(), createdAt: nowIso() };
    db.businesses.push(business);
    await this.persist(db);
    return business;
  }

  async updateBusiness(id: string, patch: Partial<Omit<Business, "id" | "createdAt">>): Promise<Business | null> {
    const db = await this.load();
    const b = db.businesses.find((x) => x.id === id);
    if (!b) return null;
    Object.assign(b, patch);
    await this.persist(db);
    return b;
  }

  async deleteBusiness(id: string): Promise<boolean> {
    const db = await this.load();
    const before = db.businesses.length;
    db.businesses = db.businesses.filter((b) => b.id !== id);
    db.generations = db.generations.filter((g) => g.businessId !== id);
    await this.persist(db);
    return db.businesses.length < before;
  }

  async addGeneration(data: Omit<Generation, "id" | "createdAt">): Promise<Generation> {
    const db = await this.load();
    const gen: Generation = { ...data, id: newId(), createdAt: nowIso() };
    db.generations.push(gen);
    await this.persist(db);
    return gen;
  }

  async listGenerations(businessId: string): Promise<Generation[]> {
    const db = await this.load();
    return db.generations
      .filter((g) => g.businessId === businessId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addResult(data: Omit<Result, "id" | "recordedAt">): Promise<Result> {
    const db = await this.load();
    const r: Result = { ...data, id: newId(), recordedAt: nowIso() };
    db.results.push(r);
    await this.persist(db);
    return r;
  }

  async addBrief(data: Omit<DailyBrief, "id" | "date">): Promise<DailyBrief> {
    const db = await this.load();
    const brief: DailyBrief = { ...data, id: newId(), date: nowIso() };
    db.dailyBriefs.push(brief);
    await this.persist(db);
    return brief;
  }

  async addCompetitor(data: Omit<Competitor, "id" | "updatedAt">): Promise<Competitor> {
    const db = await this.load();
    const c: Competitor = { ...data, id: newId(), updatedAt: nowIso() };
    db.competitors.push(c);
    await this.persist(db);
    return c;
  }

  async addLLMLog(data: Omit<LLMLog, "id" | "createdAt">): Promise<LLMLog> {
    const db = await this.load();
    const log: LLMLog = { ...data, id: newId(), createdAt: nowIso() };
    db.llmLogs.push(log);
    await this.persist(db);
    return log;
  }

  async listLLMLogs(limit = 50): Promise<LLMLog[]> {
    const db = await this.load();
    return [...db.llmLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async getGeneration(id: string): Promise<Generation | null> {
    const db = await this.load();
    return db.generations.find((g) => g.id === id) ?? null;
  }

  async listResults(businessId: string): Promise<Result[]> {
    const db = await this.load();
    const genIds = new Set(db.generations.filter((g) => g.businessId === businessId).map((g) => g.id));
    return db.results.filter((r) => genIds.has(r.generationId));
  }

  async resultsByGeneration(generationId: string): Promise<Result[]> {
    const db = await this.load();
    return db.results.filter((r) => r.generationId === generationId);
  }

  async latestBrief(businessId: string): Promise<DailyBrief | null> {
    const db = await this.load();
    return (
      db.dailyBriefs
        .filter((b) => b.businessId === businessId)
        .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
    );
  }

  async saveGenome(businessId: string, snapshot: GenomeSnapshot, dataPoints: number): Promise<BusinessGenome> {
    const db = await this.load();
    const updatedAt = nowIso();
    const existing = db.genomes.find((g) => g.businessId === businessId);
    if (existing) {
      existing.snapshot = snapshot;
      existing.dataPoints = dataPoints;
      existing.updatedAt = updatedAt;
      await this.persist(db);
      return existing;
    }
    const genome: BusinessGenome = { businessId, snapshot, dataPoints, updatedAt };
    db.genomes.push(genome);
    await this.persist(db);
    return genome;
  }

  async getGenome(businessId: string): Promise<BusinessGenome | null> {
    const db = await this.load();
    return db.genomes.find((g) => g.businessId === businessId) ?? null;
  }

  async addDecision(data: Omit<Decision, "id" | "date">): Promise<Decision> {
    const db = await this.load();
    const decision: Decision = { ...data, id: newId(), date: nowIso() };
    db.decisions.push(decision);
    await this.persist(db);
    return decision;
  }

  async latestDecision(businessId: string): Promise<Decision | null> {
    const db = await this.load();
    return (
      db.decisions.filter((d) => d.businessId === businessId).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
    );
  }

  async getConversation(businessId: string): Promise<Conversation | null> {
    const db = await this.load();
    return db.conversations.find((c) => c.businessId === businessId) ?? null;
  }

  async appendConversation(businessId: string, msgs: ChatMessage[]): Promise<Conversation> {
    const db = await this.load();
    let convo = db.conversations.find((c) => c.businessId === businessId);
    if (!convo) {
      convo = { businessId, messages: [], updatedAt: nowIso() };
      db.conversations.push(convo);
    }
    convo.messages.push(...msgs);
    convo.updatedAt = nowIso();
    await this.persist(db);
    return convo;
  }

  async listPromptVersions(): Promise<PromptVersion[]> {
    const db = await this.load();
    return db.promptVersions;
  }

  async seedPromptVersions(versions: Omit<PromptVersion, "id" | "createdAt">[]): Promise<void> {
    const db = await this.load();
    for (const v of versions) {
      const exists = db.promptVersions.some((p) => p.kind === v.kind && p.version === v.version);
      if (!exists) db.promptVersions.push({ ...v, id: newId(), createdAt: nowIso() });
    }
    await this.persist(db);
  }

  async setDefaultPrompt(kind: string, version: string): Promise<void> {
    const db = await this.load();
    for (const p of db.promptVersions) {
      if (p.kind === kind) p.isDefault = p.version === version;
    }
    await this.persist(db);
  }

  async allGenerations(): Promise<Generation[]> {
    const db = await this.load();
    return db.generations;
  }

  async allResults(): Promise<Result[]> {
    const db = await this.load();
    return db.results;
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

// Singleton (évite de recharger le fichier à chaque requête en dev).
const globalForRepo = globalThis as unknown as { __repo?: Repository };
export const repo: Repository = globalForRepo.__repo ?? new JsonRepository();
if (!globalForRepo.__repo) globalForRepo.__repo = repo;
