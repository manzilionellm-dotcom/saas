import { getSessionFromRequest, unauthorized } from "@/lib/auth";
import { listUserConnections } from "@/lib/streams";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  const connections = listUserConnections(session.userId).map((connection) => ({
    id: connection.id,
    channelId: connection.channelId,
    startedAt: connection.startedAt,
    current: connection.sessionId === session.id,
  }));

  return Response.json({ connections }, { status: 200 });
}
