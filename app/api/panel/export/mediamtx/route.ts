import { streamsStore } from "../../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../../lib/panel-auth";
import { mediamtxPath } from "../../../../lib/mediamtx";

export const dynamic = "force-dynamic";

// GET /api/panel/export/mediamtx -> section `paths:` prête à coller dans
// streaming-server/mediamtx.yml (chaque chaîne en mode à la demande).
export async function GET() {
  if (!(await isPanelAuthed())) return unauthorized();
  const channels = await streamsStore.list();

  const lines = [
    "# Chemins générés depuis le panel /panel — à coller sous `paths:` de mediamtx.yml.",
    "# Chaque chaîne est en mode à la demande : elle n'est tirée que si quelqu'un la regarde.",
    `# ${channels.length} chaîne(s) — lecture : http://<votre-vps>:8888/<chemin>/index.m3u8`,
    "",
    "paths:",
  ];
  for (const c of channels) {
    lines.push(`  ${mediamtxPath(c)}:`);
    lines.push(`    source: ${JSON.stringify(c.url)}`);
    lines.push("    sourceOnDemand: yes");
  }
  if (channels.length === 0) {
    lines.push("  # (aucune chaîne dans le panel pour l'instant)");
  }

  return new Response(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mediamtx-paths.yml"',
    },
  });
}
