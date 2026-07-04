// Configuration des flux de diffusion (StreamCast Server).
//
// ⚠️ IMPORTANT : ne renseignez ici QUE des sources que vous possédez
// ou que vous êtes explicitement autorisé à redistribuer.
// Pour RTNB, `sourceUrl` doit être l'URL officielle fournie dans le cadre
// de votre autorisation de retransmission.

export type Stream = {
  id: string;
  name: string;
  logo?: string;
  group?: string;
  // Pays autorisés (géo-restriction). Vide = aucune restriction.
  allowedCountries?: string[];
  // URL source autorisée (HLS .m3u8, ou RTMP/SRT côté ingestion).
  // Laisser vide tant que l'URL autorisée n'est pas disponible.
  sourceUrl: string;
};

export const streams: Stream[] = [
  {
    id: "rtnb",
    name: "RTNB",
    group: "Burundi",
    logo: "",
    // Périmètre prévu : diaspora burundaise. À ajuster selon l'accord.
    allowedCountries: [], // TODO: ex. ["BE", "FR", "CA", "TZ", ...]
    // TODO ▼▼▼ Coller ici l'URL officielle autorisée par RTNB ▼▼▼
    sourceUrl: "",
    // TODO ▲▲▲ (laisser vide tant qu'elle n'est pas disponible) ▲▲▲
  },
];

export function getStream(id: string): Stream | undefined {
  return streams.find((s) => s.id === id);
}

export function isConfigured(stream: Stream): boolean {
  return stream.sourceUrl.trim().length > 0;
}
