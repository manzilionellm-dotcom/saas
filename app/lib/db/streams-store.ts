import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { newId } from "./repo";

// ---------------------------------------------------------------------------
// Store des chaînes ajoutées depuis le panel (/panel) : M3U, Xtream Codes ou
// URL directe, plus les profils famille (liens révocables + favoris) et les
// réglages (EPG). Même pattern que JsonRepository : fichier JSON local-first,
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
  tvgId?: string;
  source: ChannelSource;
  // Étiquette de provenance (nom de la playlist, hôte Xtream…) pour gérer les imports.
  origin?: string;
  addedAt: string;
};

export type Profile = {
  id: string;
  name: string;
  token: string; // secret du lien de lecture, révocable
  favorites: string[]; // ids de chaînes
  createdAt: string;
};

export type Settings = { epgUrl?: string };

export type ChannelQuery = {
  search?: string;
  group?: string;
  page?: number;
  pageSize?: number;
};

export type ChannelPage = {
  items: Channel[];
  total: number; // total filtré
  grandTotal: number; // total sans filtre
  page: number;
  pageSize: number;
};

type StreamsDB = {
  channels: Channel[];
  profiles: Profile[];
  settings: Settings;
};

function emptyDB(): StreamsDB {
  return { channels: [], profiles: [], settings: {} };
}

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
      this.cache = {
        channels: parsed.channels ?? [],
        profiles: parsed.profiles ?? [],
        settings: parsed.settings ?? {},
      };
    } catch {
      this.cache = emptyDB();
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

  // --- Chaînes --------------------------------------------------------------

  async list(): Promise<Channel[]> {
    const db = await this.load();
    return [...db.channels];
  }

  async count(): Promise<number> {
    const db = await this.load();
    return db.channels.length;
  }

  async get(id: string): Promise<Channel | null> {
    const db = await this.load();
    return db.channels.find((c) => c.id === id) ?? null;
  }

  async getMany(ids: string[]): Promise<Channel[]> {
    const db = await this.load();
    const set = new Set(ids);
    return db.channels.filter((c) => set.has(c.id));
  }

  // Recherche + filtre par groupe + pagination (linéaire, OK pour ~15 000 en mémoire).
  async query(q: ChannelQuery): Promise<ChannelPage> {
    const db = await this.load();
    const search = (q.search ?? "").trim().toLowerCase();
    const group = (q.group ?? "").trim();
    const pageSize = Math.min(Math.max(q.pageSize ?? 50, 1), 200);
    const page = Math.max(q.page ?? 1, 1);

    let filtered = db.channels;
    if (group) filtered = filtered.filter((c) => (c.group ?? "") === group);
    if (search) filtered = filtered.filter((c) => c.name.toLowerCase().includes(search));

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      total,
      grandTotal: db.channels.length,
      page,
      pageSize,
    };
  }

  // Groupes (catégories) avec leur nombre de chaînes, triés par volume.
  async groups(): Promise<{ group: string; count: number }[]> {
    const db = await this.load();
    const map = new Map<string, number>();
    for (const c of db.channels) {
      const g = c.group ?? "";
      if (g) map.set(g, (map.get(g) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Provenances (playlist/compte) avec leur nombre de chaînes, pour la gestion en bloc.
  async origins(): Promise<{ origin: string; count: number }[]> {
    const db = await this.load();
    const map = new Map<string, number>();
    for (const c of db.channels) {
      if (c.origin) map.set(c.origin, (map.get(c.origin) ?? 0) + 1);
    }
    return [...map.entries()].map(([origin, count]) => ({ origin, count }));
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
    // Nettoie les favoris pointant vers cette chaîne.
    for (const p of db.profiles) p.favorites = p.favorites.filter((f) => f !== id);
    await this.persist(db);
    return db.channels.length < before;
  }

  // Supprime toutes les chaînes issues d'une même provenance (playlist/compte).
  async removeByOrigin(origin: string): Promise<number> {
    const db = await this.load();
    const before = db.channels.length;
    const removedIds = new Set(db.channels.filter((c) => c.origin === origin).map((c) => c.id));
    db.channels = db.channels.filter((c) => c.origin !== origin);
    for (const p of db.profiles) p.favorites = p.favorites.filter((f) => !removedIds.has(f));
    await this.persist(db);
    return before - db.channels.length;
  }

  // --- Profils --------------------------------------------------------------

  async listProfiles(): Promise<Profile[]> {
    const db = await this.load();
    return [...db.profiles].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getProfileByToken(token: string): Promise<Profile | null> {
    const db = await this.load();
    return db.profiles.find((p) => p.token === token) ?? null;
  }

  async createProfile(name: string): Promise<Profile> {
    const db = await this.load();
    const profile: Profile = {
      id: newId(),
      name,
      token: randomUUID().replace(/-/g, ""),
      favorites: [],
      createdAt: new Date().toISOString(),
    };
    db.profiles.push(profile);
    await this.persist(db);
    return profile;
  }

  async removeProfile(id: string): Promise<boolean> {
    const db = await this.load();
    const before = db.profiles.length;
    db.profiles = db.profiles.filter((p) => p.id !== id);
    await this.persist(db);
    return db.profiles.length < before;
  }

  // Régénère le token : l'ancien lien cesse immédiatement de fonctionner.
  async rotateProfileToken(id: string): Promise<Profile | null> {
    const db = await this.load();
    const p = db.profiles.find((x) => x.id === id);
    if (!p) return null;
    p.token = randomUUID().replace(/-/g, "");
    await this.persist(db);
    return p;
  }

  async setFavorite(profileId: string, channelId: string, add: boolean): Promise<Profile | null> {
    const db = await this.load();
    const p = db.profiles.find((x) => x.id === profileId);
    if (!p) return null;
    const has = p.favorites.includes(channelId);
    if (add && !has) p.favorites.push(channelId);
    if (!add && has) p.favorites = p.favorites.filter((f) => f !== channelId);
    await this.persist(db);
    return p;
  }

  // --- Réglages -------------------------------------------------------------

  async getSettings(): Promise<Settings> {
    const db = await this.load();
    return { ...db.settings };
  }

  async setSettings(patch: Partial<Settings>): Promise<Settings> {
    const db = await this.load();
    db.settings = { ...db.settings, ...patch };
    await this.persist(db);
    return { ...db.settings };
  }
}

// Singleton (évite de recharger le fichier à chaque requête en dev).
const globalForStreams = globalThis as unknown as { __streamsStore?: StreamsStore };
export const streamsStore: StreamsStore = globalForStreams.__streamsStore ?? new StreamsStore();
if (!globalForStreams.__streamsStore) globalForStreams.__streamsStore = streamsStore;
