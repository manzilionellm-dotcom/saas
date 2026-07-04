import { getSessionFromRequest, unauthorized } from "@/lib/auth";
import { revokeSession } from "@/lib/sessions";

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  // Revokes only the current session; the user's other sessions stay active.
  revokeSession(session.id);
  return new Response(null, { status: 204 });
}
