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
  // Si vrai : chaîne restreamée en PERMANENCE (sourceOnDemand: no dans MediaMTX)
  // → pas de délai au démarrage, mais consomme de la bande passante en continu.
  // Par défaut (absent/false) : à la demande (tirée seulement si quelqu'un regarde).
  alwaysOn?: boolean;
  // URL de secours : si la source principale tombe, le lecteur bascule dessus
  // automatiquement (chemin MediaMTX « <chemin>-secours »). La chaîne ne devient
  // jamais noire tant qu'une des deux sources fonctionne.
  backupUrl?: string;
  addedAt: string;
};

export type Profile = {
  id: string;
  name: string;
  token: string; // secret du lien de lecture, révocable
  favorites: string[]; // ids de chaînes
  createdAt: string;
};

// Catégorie réutilisable : un ensemble de chaînes nommé (ex. « Papa », « Enfants »).
// On la définit une fois, puis on l'applique à autant de profils qu'on veut.
export type Bouquet = {
  id: string;
  name: string;
  channels: string[]; // ids de chaînes
  createdAt: string;
};

export type Settings = {
  epgUrl?: string;
  // URL de base du serveur de diffusion MediaMTX (ex. https://hls.mondomaine.com).
  // Renseignée : le lecteur web et les playlists servent l'URL restreamée de
  // chaque chaîne (source tirée une fois, redistribuée à toute la famille).
  // Vide : on sert l'URL source d'origine (utile en local, avant le VPS).
  hlsBaseUrl?: string;
};

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
  bouquets: Bouquet[];
  settings: Settings;
};

function emptyDB(): StreamsDB {
  return { channels: [], profiles: [], bouquets: [], settings: {} };
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
        bouquets: parsed.bouquets ?? [],
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

  // Tous les ids de chaînes correspondant à un filtre (sans pagination) : sert
  // à « tout ajouter » un thème/pays à une catégorie ou un profil.
  async idsMatching(q: { search?: string; group?: string }): Promise<string[]> {
    const db = await this.load();
    const search = (q.search ?? "").trim().toLowerCase();
    const group = (q.group ?? "").trim();
    let filtered = db.channels;
    if (group) filtered = filtered.filter((c) => (c.group ?? "") === group);
    if (search) filtered = filtered.filter((c) => c.name.toLowerCase().includes(search));
    return filtered.map((c) => c.id);
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
    // Nettoie les favoris et les catégories pointant vers cette chaîne.
    for (const p of db.profiles) p.favorites = p.favorites.filter((f) => f !== id);
    for (const b of db.bouquets) b.channels = b.channels.filter((f) => f !== id);
    await this.persist(db);
    return db.channels.length < before;
  }

  // Bascule une chaîne entre « toujours active » (24/7) et « à la demande ».
  async setChannelAlwaysOn(id: string, alwaysOn: boolean): Promise<Channel | null> {
    const db = await this.load();
    const c = db.channels.find((x) => x.id === id);
    if (!c) return null;
    if (alwaysOn) c.alwaysOn = true;
    else delete c.alwaysOn;
    await this.persist(db);
    return c;
  }

  // Met à jour la catégorie (group) de plusieurs chaînes d'un coup (rangement IA).
  async setChannelGroups(updates: { id: string; group: string }[]): Promise<number> {
    const db = await this.load();
    const map = new Map(updates.map((u) => [u.id, u.group]));
    let n = 0;
    for (const c of db.channels) {
      const g = map.get(c.id);
      if (g !== undefined) {
        c.group = g.trim() || undefined;
        n++;
      }
    }
    await this.persist(db);
    return n;
  }

  // Définit (ou efface si vide) l'URL de secours d'une chaîne.
  async setChannelBackup(id: string, backupUrl: string): Promise<Channel | null> {
    const db = await this.load();
    const c = db.channels.find((x) => x.id === id);
    if (!c) return null;
    const url = backupUrl.trim();
    if (url) c.backupUrl = url;
    else delete c.backupUrl;
    await this.persist(db);
    return c;
  }

  // Supprime toutes les chaînes issues d'une même provenance (playlist/compte).
  async removeByOrigin(origin: string): Promise<number> {
    const db = await this.load();
    const before = db.channels.length;
    const removedIds = new Set(db.channels.filter((c) => c.origin === origin).map((c) => c.id));
    db.channels = db.channels.filter((c) => c.origin !== origin);
    for (const p of db.profiles) p.favorites = p.favorites.filter((f) => !removedIds.has(f));
    for (const b of db.bouquets) b.channels = b.channels.filter((f) => !removedIds.has(f));
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

  // Ajoute/retire plusieurs chaînes d'un coup aux favoris d'un profil.
  async setFavoriteMany(
    profileId: string,
    channelIds: string[],
    add: boolean,
  ): Promise<Profile | null> {
    const db = await this.load();
    const p = db.profiles.find((x) => x.id === profileId);
    if (!p) return null;
    const known = new Set(db.channels.map((c) => c.id));
    const set = new Set(p.favorites);
    for (const id of channelIds) {
      if (add) set.add(id);
      else set.delete(id);
    }
    p.favorites = [...set].filter((id) => known.has(id));
    await this.persist(db);
    return p;
  }

  // --- Catégories (bouquets réutilisables) ----------------------------------

  async listBouquets(): Promise<Bouquet[]> {
    const db = await this.load();
    return [...db.bouquets].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createBouquet(name: string, channels: string[] = []): Promise<Bouquet> {
    const db = await this.load();
    const known = new Set(db.channels.map((c) => c.id));
    const bouquet: Bouquet = {
      id: newId(),
      name,
      channels: [...new Set(channels)].filter((id) => known.has(id)),
      createdAt: new Date().toISOString(),
    };
    db.bouquets.push(bouquet);
    await this.persist(db);
    return bouquet;
  }

  async renameBouquet(id: string, name: string): Promise<Bouquet | null> {
    const db = await this.load();
    const b = db.bouquets.find((x) => x.id === id);
    if (!b) return null;
    b.name = name;
    await this.persist(db);
    return b;
  }

  async setBouquetChannel(id: string, channelId: string, add: boolean): Promise<Bouquet | null> {
    const db = await this.load();
    const b = db.bouquets.find((x) => x.id === id);
    if (!b) return null;
    const has = b.channels.includes(channelId);
    if (add && !has) b.channels.push(channelId);
    if (!add && has) b.channels = b.channels.filter((c) => c !== channelId);
    await this.persist(db);
    return b;
  }

  // Ajoute/retire plusieurs chaînes d'un coup à une catégorie (ex. tout un thème).
  async setBouquetChannelMany(
    id: string,
    channelIds: string[],
    add: boolean,
  ): Promise<Bouquet | null> {
    const db = await this.load();
    const b = db.bouquets.find((x) => x.id === id);
    if (!b) return null;
    const known = new Set(db.channels.map((c) => c.id));
    const set = new Set(b.channels);
    for (const cid of channelIds) {
      if (add) set.add(cid);
      else set.delete(cid);
    }
    b.channels = [...set].filter((cid) => known.has(cid));
    await this.persist(db);
    return b;
  }

  async deleteBouquet(id: string): Promise<boolean> {
    const db = await this.load();
    const before = db.bouquets.length;
    db.bouquets = db.bouquets.filter((b) => b.id !== id);
    await this.persist(db);
    return db.bouquets.length < before;
  }

  // Applique une catégorie à un profil : remplace ses chaînes par celles de la
  // catégorie. Le profil « hérite » ainsi de la sélection, sans re-cocher.
  async applyBouquetToProfile(bouquetId: string, profileId: string): Promise<Profile | null> {
    const db = await this.load();
    const b = db.bouquets.find((x) => x.id === bouquetId);
    const p = db.profiles.find((x) => x.id === profileId);
    if (!b || !p) return null;
    p.favorites = [...b.channels];
    await this.persist(db);
    return p;
  }

  // --- Réglages -------------------------------------------------------------

  async getSettings(): Promise<Settings> {
    const db = await this.load();
    const settings = { ...db.settings };
    // Repli sur HLS_BASE_URL (posé par install.sh) si le serveur de diffusion
    // n'a pas été réglé dans le panel. Garantit que les chaînes sont servies via
    // MediaMTX dès l'installation, sans divulguer l'URL source du fournisseur.
    // Un réglage saisi dans le panel reste prioritaire.
    if (!settings.hlsBaseUrl && process.env.HLS_BASE_URL) {
      settings.hlsBaseUrl = process.env.HLS_BASE_URL;
    }
    return settings;
  }

  async setSettings(patch: Partial<Settings>): Promise<Settings> {
    const db = await this.load();
    db.settings = { ...db.settings, ...patch };
    await this.persist(db);
    return { ...db.settings };
  }

  // --- Sauvegarde / restauration -------------------------------------------

  // Copie complète de l'état (chaînes, profils, catégories, réglages).
  async dump(): Promise<StreamsDB> {
    const db = await this.load();
    return JSON.parse(JSON.stringify(db)) as StreamsDB;
  }

  // Remplace tout l'état par le contenu d'une sauvegarde. Tolérant aux champs
  // manquants, mais rejette un objet qui n'a rien d'une sauvegarde StreamCast.
  async restore(
    data: unknown,
  ): Promise<{ channels: number; profiles: number; bouquets: number }> {
    if (!data || typeof data !== "object") {
      throw new Error("Fichier de sauvegarde invalide.");
    }
    const d = data as Partial<StreamsDB> & { _type?: string };
    const looksValid =
      d._type === "streamcast-backup" ||
      Array.isArray(d.channels) ||
      Array.isArray(d.profiles) ||
      Array.isArray(d.bouquets);
    if (!looksValid) {
      throw new Error("Ce fichier n'est pas une sauvegarde StreamCast.");
    }
    const db: StreamsDB = {
      channels: Array.isArray(d.channels) ? d.channels : [],
      profiles: Array.isArray(d.profiles) ? d.profiles : [],
      bouquets: Array.isArray(d.bouquets) ? d.bouquets : [],
      settings: d.settings && typeof d.settings === "object" ? d.settings : {},
    };
    await this.persist(db);
    return {
      channels: db.channels.length,
      profiles: db.profiles.length,
      bouquets: db.bouquets.length,
    };
  }
}

// Singleton (évite de recharger le fichier à chaque requête en dev).
const globalForStreams = globalThis as unknown as { __streamsStore?: StreamsStore };
export const streamsStore: StreamsStore = globalForStreams.__streamsStore ?? new StreamsStore();
if (!globalForStreams.__streamsStore) globalForStreams.__streamsStore = streamsStore;
