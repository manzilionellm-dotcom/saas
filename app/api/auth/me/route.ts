import { getSessionFromRequest, getUserById, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  const user = getUserById(session.userId);
  if (!user) {
    return unauthorized();
  }

  return Response.json(
    {
      user: { id: user.id, email: user.email },
      session: { id: session.id, expiresAt: session.expiresAt },
    },
    { status: 200 }
  );
}
