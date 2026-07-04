import { getSessionFromRequest, unauthorized } from "@/lib/auth";
import { listUserSessions } from "@/lib/sessions";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  const sessions = listUserSessions(session.userId).map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    current: s.id === session.id,
  }));

  return Response.json({ sessions }, { status: 200 });
}
