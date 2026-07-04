import { lookup } from "dns/promises";
import { isIP } from "net";

// ---------------------------------------------------------------------------
// Garde anti-SSRF : avant de laisser le serveur télécharger une URL fournie par
// l'utilisateur (import M3U, EPG, test de santé), on vérifie que l'hôte ne
// pointe pas vers une adresse interne/privée (localhost, réseau local,
// métadonnées cloud 169.254.169.254…). Sinon un lien piégé pourrait faire lire
// des ressources internes au serveur.
//
// Par défaut on bloque les adresses privées. En local/dev, mettez
// STREAMCAST_ALLOW_PRIVATE=1 pour autoriser localhost (utile pour les tests).
// ---------------------------------------------------------------------------

function allowPrivate(): boolean {
  return process.env.STREAMCAST_ALLOW_PRIVATE === "1";
}

// Vrai si l'IP appartient à une plage privée / réservée / dangereuse.
export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = p;
    if (a === 0 || a === 10 || a === 127) return true; // 0.x, 10.x, loopback
    if (a === 169 && b === 254) return true; // link-local + métadonnées cloud
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16–31
    if (a === 192 && b === 168) return true; // 192.168
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true; // multicast / réservé
    return false;
  }
  if (v === 6) {
    const ip6 = ip.toLowerCase();
    if (ip6 === "::1" || ip6 === "::") return true; // loopback / non spécifié
    if (ip6.startsWith("fe80") || ip6.startsWith("fc") || ip6.startsWith("fd")) return true; // link-local / ULA
    // IPv4 mappé (::ffff:a.b.c.d) : on teste la partie v4.
    const m = ip6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isPrivateIp(m[1]);
    return false;
  }
  return true; // format inconnu → on refuse par prudence
}

export class SsrfError extends Error {}

// Valide l'URL et vérifie que toutes ses IP résolues sont publiques.
export async function assertPublicUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError("URL invalide.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Seuls http et https sont autorisés.");
  }
  if (allowPrivate()) return;

  const host = url.hostname;
  // Hôte déjà littéral IP ?
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new SsrfError("Adresse interne interdite.");
    return;
  }
  // Nom d'hôte : on résout et on refuse si une IP est privée.
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new SsrfError("Hôte introuvable.");
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new SsrfError("Adresse interne interdite.");
  }
}

// fetch() protégé : valide l'URL (anti-SSRF) puis délègue à fetch.
export async function safeFetch(raw: string, init?: RequestInit): Promise<Response> {
  await assertPublicUrl(raw);
  return fetch(raw, init);
}
