import type { NextRequest } from "next/server";
import { getSessionFromRequest, unauthorized } from "@/lib/auth";
import { deleteChannel } from "@/lib/channels";

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/channels/[id]">
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  const { id } = await ctx.params;
  if (!deleteChannel(session.userId, id)) {
    return Response.json({ error: "Channel not found." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
