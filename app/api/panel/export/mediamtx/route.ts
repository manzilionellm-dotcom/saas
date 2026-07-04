import { streamsStore } from "../../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../../lib/panel-auth";
import { mediamtxPathsBlock } from "../../../../lib/mediamtx";

export const dynamic = "force-dynamic";

// GET /api/panel/export/mediamtx -> section `paths:` prête à coller dans
// streaming-server/mediamtx.yml (chaque chaîne en mode à la demande).
export async function GET() {
  if (!(await isPanelAuthed())) return unauthorized();
  const channels = await streamsStore.list();

  const header = [
    "# Chemins générés depuis le panel /panel — à coller sous `paths:` de mediamtx.yml.",
    "# Chaque chaîne est en mode à la demande : elle n'est tirée que si quelqu'un la regarde.",
    `# ${channels.length} chaîne(s) — lecture : http://<votre-vps>:8888/<chemin>/index.m3u8`,
    "",
  ].join("\n");

  return new Response(header + mediamtxPathsBlock(channels), {
    status: 200,
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mediamtx-paths.yml"',
    },
  });
}
