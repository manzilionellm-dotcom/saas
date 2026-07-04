import { getSessionFromRequest, unauthorized } from "@/lib/auth";
import { buildM3U } from "@/lib/channels";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  const origin = new URL(request.url).origin;
  const playlist = buildM3U(session.userId, origin);

  return new Response(playlist, {
    status: 200,
    headers: {
      "content-type": "application/x-mpegurl; charset=utf-8",
      "content-disposition": 'attachment; filename="playlist.m3u"',
      "cache-control": "no-store",
    },
  });
}
