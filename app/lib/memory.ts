// Mémoire de Versailles : garde tout ce que vous faites (recherches, réunions,
// demandes) pour mieux vous connaître avec le temps.
//
// Démo : persistance locale (navigateur). Pour une vraie mémoire long terme
// multi-appareils, brancher une base de données + alimenter les prompts Claude.

export type MemoryEvent = {
  id: string;
  type: "meeting" | "search" | "note";
  text: string;
  at: string; // ISO
};

const KEY = "versailles_memory_v1";
const STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "à", "au",
  "aux", "en", "pour", "que", "qui", "je", "tu", "il", "on", "mon", "ma",
  "mes", "ce", "cette", "dans", "sur", "avec", "veux", "fait", "faire",
]);

export function getMemory(): MemoryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as MemoryEvent[];
  } catch {
    return [];
  }
}

export function addMemory(type: MemoryEvent["type"], text: string): MemoryEvent[] {
  if (typeof window === "undefined") return [];
  const list = getMemory();
  const ev: MemoryEvent = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    type,
    text: text.trim(),
    at: new Date().toISOString(),
  };
  const next = [ev, ...list].slice(0, 1000);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearMemory(): void {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export type Profile = {
  total: number;
  meetings: number;
  searches: number;
  firstSeen: string | null;
  topInterests: { term: string; count: number }[];
  country: string;
};

export function buildProfile(events: MemoryEvent[]): Profile {
  const counts = new Map<string, number>();
  for (const e of events) {
    for (const raw of e.text.toLowerCase().split(/[^a-zàâäéèêëîïôöùûüç0-9]+/)) {
      if (raw.length < 3 || STOPWORDS.has(raw)) continue;
      counts.set(raw, (counts.get(raw) || 0) + 1);
    }
  }
  const topInterests = [...counts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    total: events.length,
    meetings: events.filter((e) => e.type === "meeting").length,
    searches: events.filter((e) => e.type === "search").length,
    firstSeen: events.length ? events[events.length - 1].at : null,
    topInterests,
    country: "Suède",
  };
}
