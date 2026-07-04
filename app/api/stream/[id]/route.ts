import type { NextRequest } from "next/server";
import { getSessionFromRequest, unauthorized } from "@/lib/auth";
import { getChannel } from "@/lib/channels";
import { closeStreamConnection, openStreamConnection } from "@/lib/streams";

/**
 * Registers an active playback connection for the authenticated user, then
 * redirects the player to the channel's own source URL. This does not proxy
 * or re-stream the source — the client connects to the source directly — so
 * it neither hides nor alters what any upstream source sees.
 *
 * Concurrent connections are non-blocking by default; see lib/streams.ts.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/stream/[id]">
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  const { id } = await ctx.params;
  const channel = getChannel(session.userId, id);
  if (!channel) {
    return Response.json({ error: "Channel not found." }, { status: 404 });
  }

  const connection = openStreamConnection(session.userId, session.id, channel.id);

  return Response.json(
    { connectionId: connection.id, url: channel.url },
    { status: 200 }
  );
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/stream/[id]">
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  // `id` here is the connection id returned when the stream was opened.
  const { id } = await ctx.params;
  closeStreamConnection(id);
  return new Response(null, { status: 204 });
}
