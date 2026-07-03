import type { Channel } from "./db/streams-store";

// ---------------------------------------------------------------------------
// Correspondance chaîne ↔ chemin MediaMTX.
//
// Le MÊME nom de chemin doit être utilisé à deux endroits :
//   1. l'export /api/panel/export/mediamtx (ce qui est déclaré dans mediamtx.yml)
//   2. les URLs de lecture servies à la famille (lecteur web + playlists)
// Sinon le lecteur demanderait à MediaMTX un chemin qu'il ne connaît pas.
// D'où cette fonction unique, importée par les deux côtés.
// ---------------------------------------------------------------------------

// Nom de chemin MediaMTX : minuscules, alphanumérique et tirets, unique par id.
export function mediamtxPath(c: Pick<Channel, "id" | "name">): string {
  const base = c.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base ? `${base}-${c.id}` : c.id;
}

// URL de lecture HLS d'une chaîne.
//   - avec `baseUrl` (ex. https://hls.mondomaine.com) : URL restreamée par
//     MediaMTX → la source n'est tirée qu'une fois, redistribuée à toute la
//     famille (papa et maman regardent en simultané sans saturer la source).
//   - sans `baseUrl` : on retombe sur l'URL source d'origine.
export function playbackUrl(baseUrl: string | undefined, c: Channel): string {
  const base = (baseUrl ?? "").replace(/\/+$/, "");
  return base ? `${base}/${mediamtxPath(c)}/index.m3u8` : c.url;
}
