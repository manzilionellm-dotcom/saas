/**
 * Integration mediamtx pour le panel StreamCast.
 *
 * Regle d'or : on ne donne JAMAIS l'URL du fournisseur a mediamtx en `source`
 * (son User-Agent est bloque par beaucoup de panels IPTV -> erreur 456).
 * Chaque chaine est creee avec un `runOnDemand` ffmpeg deguise en VLC :
 * une seule connexion amont par chaine, demarree seulement quand quelqu'un regarde.
 *
 * Variables d'environnement :
 *   MTX_API       base de l'API mediamtx (defaut http://127.0.0.1:9997)
 *   MTX_RTSP_PORT port RTSP interne de mediamtx (defaut 8554)
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const MTX_API = process.env.MTX_API ?? "http://127.0.0.1:9997";
const MTX_RTSP_PORT = process.env.MTX_RTSP_PORT ?? "8554";
const STATUS_DIR = process.env.STREAMCAST_STATUS_DIR ?? "/var/lib/streamcast/status";

const USER_AGENT = "VLC/3.0.20 LibVLC/3.0.20";

/** Commande ffmpeg qui tire la source du fournisseur avec un UA de lecteur. */
export function buildPullCommand(sourceUrl: string): string {
  // Guillemets simples : l'URL contient souvent & et ? — jamais de double quote shell ici.
  if (sourceUrl.includes("'")) {
    throw new Error("URL source invalide (apostrophe interdite)");
  }
  return (
    "ffmpeg -hide_banner -loglevel warning " +
    `-user_agent '${USER_AGENT}' ` +
    "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 " +
    `-i '${sourceUrl}' ` +
    `-c copy -f rtsp rtsp://localhost:${MTX_RTSP_PORT}/$MTX_PATH`
  );
}

async function api(method: string, apiPath: string, body?: unknown): Promise<Response> {
  const res = await fetch(`${MTX_API}${apiPath}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res;
}

/**
 * Cree (ou met a jour) le path mediamtx d'une chaine.
 * Idempotent : si le path existe deja, sa config est remplacee.
 */
export async function ensureChannelPath(name: string, sourceUrl: string): Promise<void> {
  const conf = {
    runOnDemand: buildPullCommand(sourceUrl),
    runOnDemandRestart: true,
    runOnDemandCloseAfter: "30s",
  };
  const add = await api("POST", `/v3/config/paths/add/${encodeURIComponent(name)}`, conf);
  if (add.ok) return;
  const replace = await api("POST", `/v3/config/paths/replace/${encodeURIComponent(name)}`, conf);
  if (!replace.ok) {
    throw new Error(`mediamtx a refuse le path ${name}: HTTP ${replace.status} ${await replace.text()}`);
  }
}

/** Supprime le path d'une chaine (par ex. chaine retiree du bouquet). */
export async function removeChannelPath(name: string): Promise<void> {
  await api("DELETE", `/v3/config/paths/delete/${encodeURIComponent(name)}`);
}

export type ChannelStatus =
  | { state: "provider_error"; detail: string }
  | { state: "live"; readers: number }
  | { state: "idle" };

/**
 * Etat d'une chaine, a afficher dans le panel :
 *  - provider_error : mise en pause par le watchdog (456 en boucle chez le fournisseur)
 *  - live           : flux actif, avec le nombre de spectateurs
 *  - idle           : prete, demarrera a la demande
 */
export async function getChannelStatus(name: string): Promise<ChannelStatus> {
  try {
    const flag = (await readFile(path.join(STATUS_DIR, name), "utf-8")).trim();
    if (flag) {
      return {
        state: "provider_error",
        detail:
          "Source refusee par le fournisseur (erreur 456 : limite de connexions ou compte). " +
          "Nouvel essai automatique dans quelques minutes.",
      };
    }
  } catch {
    // pas de fichier d'etat -> pas d'erreur fournisseur connue
  }

  const res = await api("GET", `/v3/paths/get/${encodeURIComponent(name)}`);
  if (res.ok) {
    const info = (await res.json()) as { ready?: boolean; readers?: unknown[] };
    if (info.ready) return { state: "live", readers: info.readers?.length ?? 0 };
  }
  return { state: "idle" };
}

/** URL HLS publique que les spectateurs doivent lire (JAMAIS l'URL du fournisseur). */
export function publicHlsUrl(host: string, name: string): string {
  return `http://${host}:8888/${encodeURIComponent(name)}/index.m3u8`;
}
