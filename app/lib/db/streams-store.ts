import { promises as fs } from "fs";
import path from "path";
import { newId } from "./repo";

// ---------------------------------------------------------------------------
// Store des chaînes ajoutées depuis le panel (/panel) : M3U, Xtream Codes ou
// URL directe. Même pattern que JsonRepository : fichier JSON local-first,
// repli mémoire si le FS est en lecture seule.
//
// ⚠️ N'ajoutez que des sources que vous possédez ou que vous êtes autorisé
// à utiliser/redistribuer.
// ---------------------------------------------------------------------------

export type ChannelSource = "direct" | "m3u" | "xtream";

export type Channel = {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  source: ChannelSource;
  // Étiquette de provenance (nom de la playlist, hôte Xtream…) pour gérer les imports.
  origin?: string;
  addedAt: string;
};

type StreamsDB = { channels: Channel[] };

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "streams.json");

class StreamsStore {
  private cache: StreamsDB | null = null;
  private writable = true;

  private async load(): Promise<StreamsDB> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<StreamsDB>;
      this.cache = { channels: parsed.channels ?? [] };
    } catch {
      this.cache = { channels: [] };
    }
    return this.cache;
  }

  private async persist(db: StreamsDB): Promise<void> {
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

  async list(): Promise<Channel[]> {
    const db = await this.load();
    return [...db.channels];
  }

  async get(id: string): Promise<Channel | null> {
    const db = await this.load();
    return db.channels.find((c) => c.id === id) ?? null;
  }

  async addMany(channels: Omit<Channel, "id" | "addedAt">[]): Promise<Channel[]> {
    const db = await this.load();
    const now = new Date().toISOString();
    const added = channels.map((c) => ({ ...c, id: newId(), addedAt: now }));
    db.channels.push(...added);
    await this.persist(db);
    return added;
  }

  async remove(id: string): Promise<boolean> {
    const db = await this.load();
    const before = db.channels.length;
    db.channels = db.channels.filter((c) => c.id !== id);
    await this.persist(db);
    return db.channels.length < before;
  }

  // Supprime toutes les chaînes issues d'une même provenance (playlist/compte).
  async removeByOrigin(origin: string): Promise<number> {
    const db = await this.load();
    const before = db.channels.length;
    db.channels = db.channels.filter((c) => c.origin !== origin);
    await this.persist(db);
    return before - db.channels.length;
  }
}

// Singleton (évite de recharger le fichier à chaque requête en dev).
const globalForStreams = globalThis as unknown as { __streamsStore?: StreamsStore };
export const streamsStore: StreamsStore = globalForStreams.__streamsStore ?? new StreamsStore();
if (!globalForStreams.__streamsStore) globalForStreams.__streamsStore = streamsStore;
