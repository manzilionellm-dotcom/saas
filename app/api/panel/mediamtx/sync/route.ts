import { promises as fs } from "fs";
import path from "path";
import { streamsStore } from "../../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../../lib/panel-auth";
import { mediamtxPathsBlock } from "../../../../lib/mediamtx";

export const dynamic = "force-dynamic";

// POST /api/panel/mediamtx/sync
// « Restreamer toutes les chaînes » : écrit la section `paths:` de la config
// MediaMTX (une entrée par chaîne du panel, en mode à la demande) directement
// dans le fichier pointé par MEDIAMTX_CONFIG. MediaMTX recharge sa config
// automatiquement quand le fichier change — donc aucune commande SSH, aucun
// redémarrage, aucun accès root nécessaires.
//
// L'en-tête du fichier (logLevel, api, hls, pathDefaults…) est préservé : on ne
// remplace que tout ce qui suit `paths:`.
export async function POST() {
  if (!(await isPanelAuthed())) return unauthorized();

  const configPath = process.env.MEDIAMTX_CONFIG;
  if (!configPath) {
    return Response.json(
      {
        error:
          "Synchronisation indisponible : MEDIAMTX_CONFIG n'est pas configuré. " +
          "Cette fonction s'utilise sur le serveur de diffusion (voir DEPLOIEMENT.md).",
      },
      { status: 400 },
    );
  }

  let current: string;
  try {
    current = await fs.readFile(configPath, "utf8");
  } catch {
    return Response.json(
      { error: `Config MediaMTX introuvable ou illisible : ${configPath}` },
      { status: 500 },
    );
  }

  const channels = await streamsStore.list();

  // Conserve tout ce qui précède la section `paths:` (l'en-tête), puis ré-écrit
  // la section à partir des chaînes du panel.
  const header = current.replace(/^paths:[\s\S]*$/m, "").replace(/\s+$/, "");
  const next = `${header}\n\n${mediamtxPathsBlock(channels)}`;

  // Écriture atomique (fichier temporaire dans le même dossier + renommage) :
  // MediaMTX ne peut jamais lire une config à moitié écrite.
  const tmp = path.join(path.dirname(configPath), `.mediamtx.${process.pid}.tmp`);
  try {
    await fs.writeFile(tmp, next, "utf8");
    await fs.rename(tmp, configPath);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    return Response.json(
      {
        error: `Écriture impossible dans ${configPath} : ${
          err instanceof Error ? err.message : "erreur inconnue"
        }`,
      },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, channels: channels.length });
}
