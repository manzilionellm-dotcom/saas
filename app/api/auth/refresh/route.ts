import { readJsonBody } from "@/lib/auth";
import { refreshSession } from "@/lib/sessions";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body || typeof body.refreshToken !== "string" || !body.refreshToken) {
    return Response.json(
      { error: "A refresh token is required." },
      { status: 400 }
    );
  }

  const session = refreshSession(body.refreshToken);
  if (!session) {
    return Response.json(
      { error: "Invalid or expired refresh token." },
      { status: 401 }
    );
  }

  return Response.json(
    {
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    },
    { status: 200 }
  );
}
