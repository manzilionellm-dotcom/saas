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

// URL de lecture de la source de SECOURS (chemin « <chemin>-secours »), ou null
// si la chaîne n'a pas de source de secours. Le lecteur bascule dessus si la
// source principale échoue.
export function backupPlaybackUrl(baseUrl: string | undefined, c: Channel): string | null {
  if (!c.backupUrl) return null;
  const base = (baseUrl ?? "").replace(/\/+$/, "");
  return base ? `${base}/${mediamtxPath(c)}-secours/index.m3u8` : c.backupUrl;
}

// Commande ffmpeg qui tire une source et la republie vers MediaMTX (RTSP interne).
// Intérêt vs `source:` HLS direct :
//   - se présente comme VLC (-user_agent) → contourne le filtrage User-Agent de
//     nombreux fournisseurs qui renvoient sinon une erreur 456 ;
//   - reconnexion automatique en cas de coupure de la source ;
//   - -c copy : AUCUN réencodage (qualité d'origine préservée, CPU négligeable),
//     ffmpeg ne fait que remultiplexer.
// $MTX_PATH est remplacé par MediaMTX au lancement (nom du chemin).
export function buildPullCommand(sourceUrl: string): string {
  const ua = "VLC/3.0.20 LibVLC/3.0.20";
  return (
    `ffmpeg -hide_banner -loglevel error -user_agent "${ua}" ` +
    `-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 ` +
    `-i "${sourceUrl}" -c copy -f rtsp rtsp://localhost:8554/$MTX_PATH`
  );
}

// Section `paths:` de mediamtx.yml : une entrée par chaîne. Chaque chaîne est
// tirée par ffmpeg (User-Agent VLC) à la demande — ou en permanence si alwaysOn.
// Utilisée par l'export téléchargeable ET par la synchro « Restreamer toutes les
// chaînes » du panel, pour un résultat identique.
export function mediamtxPathsBlock(channels: Channel[]): string {
  const lines = ["paths:"];
  const emit = (slug: string, url: string, alwaysOn?: boolean) => {
    lines.push(`  ${slug}:`);
    // JSON.stringify produit une chaîne YAML double-quote valide (échappe " et \).
    const cmd = JSON.stringify(buildPullCommand(url));
    if (alwaysOn) {
      // Toujours active : tirée dès le démarrage de MediaMTX, relancée si elle tombe.
      lines.push(`    runOnInit: ${cmd}`);
      lines.push("    runOnInitRestart: yes");
    } else {
      // À la demande : tirée seulement quand quelqu'un regarde, coupée après 30 s.
      lines.push(`    runOnDemand: ${cmd}`);
      lines.push("    runOnDemandRestart: yes");
      lines.push("    runOnDemandCloseAfter: 30s");
    }
  };
  for (const c of channels) {
    emit(mediamtxPath(c), c.url, c.alwaysOn);
    // Source de secours : 2ᵉ chemin, le lecteur y bascule si la principale tombe.
    if (c.backupUrl) emit(`${mediamtxPath(c)}-secours`, c.backupUrl, c.alwaysOn);
  }
  if (channels.length === 0) {
    lines.push("  # (aucune chaîne dans le panel pour l'instant)");
  }
  return lines.join("\n") + "\n";
}
