// Outils pour lire, écrire et cloner des playlists M3U.
// À utiliser uniquement avec du contenu que vous possédez ou dont vous détenez les droits.

export type M3UEntry = {
  name: string;
  url: string;
  duration: string; // "-1" pour un direct, sinon une durée en secondes
  attrs: Record<string, string>; // tvg-logo, group-title, etc.
};

export type M3UPlaylist = {
  entries: M3UEntry[];
};

const ATTR_REGEX = /([\w-]+)="([^"]*)"/g;

// Analyse un texte M3U en une liste d'entrées.
export function parseM3U(text: string): M3UPlaylist {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const entries: M3UEntry[] = [];
  let pending: Omit<M3UEntry, "url"> | null = null;

  for (const line of lines) {
    if (line.toUpperCase().startsWith("#EXTM3U")) {
      continue;
    }
    if (line.startsWith("#EXTINF:")) {
      const info = line.slice("#EXTINF:".length);
      const commaIndex = info.indexOf(",");
      const meta = commaIndex >= 0 ? info.slice(0, commaIndex) : info;
      const name = commaIndex >= 0 ? info.slice(commaIndex + 1).trim() : "";

      const duration = meta.trim().split(/\s+/)[0] ?? "-1";
      const attrs: Record<string, string> = {};
      let m: RegExpExecArray | null;
      ATTR_REGEX.lastIndex = 0;
      while ((m = ATTR_REGEX.exec(meta)) !== null) {
        attrs[m[1]] = m[2];
      }
      pending = { name, duration, attrs };
      continue;
    }
    if (line.startsWith("#")) {
      continue; // autres directives ignorées
    }
    // ligne d'URL
    entries.push({
      url: line,
      name: pending?.name ?? "",
      duration: pending?.duration ?? "-1",
      attrs: pending?.attrs ?? {},
    });
    pending = null;
  }

  return { entries };
}

// Reconstruit un texte M3U à partir d'une playlist.
export function buildM3U(playlist: M3UPlaylist): string {
  const lines = ["#EXTM3U"];
  for (const entry of playlist.entries) {
    const attrs = Object.entries(entry.attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
    const meta = attrs ? `${entry.duration} ${attrs}` : entry.duration;
    lines.push(`#EXTINF:${meta},${entry.name}`);
    lines.push(entry.url);
  }
  return lines.join("\n") + "\n";
}

export type CloneOptions = {
  // Ajoute un libellé de variante (nom + group-title) pour distinguer les copies.
  labelVariants?: boolean;
};

// Clone une playlist M3U en `count` copies (2 ou 3, etc.).
export function cloneM3U(
  text: string,
  count: number,
  options: CloneOptions = {},
): string[] {
  const playlist = parseM3U(text);
  const copies: string[] = [];

  for (let i = 1; i <= count; i++) {
    const entries: M3UEntry[] = playlist.entries.map((entry) => {
      if (!options.labelVariants) {
        return { ...entry, attrs: { ...entry.attrs } };
      }
      const group = entry.attrs["group-title"];
      return {
        ...entry,
        name: `${entry.name} (V${i})`,
        attrs: {
          ...entry.attrs,
          "group-title": group ? `${group} V${i}` : `Variante ${i}`,
        },
      };
    });
    copies.push(buildM3U({ entries }));
  }

  return copies;
}
