import { readJsonBody } from "@/lib/auth";
import { createSession } from "@/lib/sessions";
import { verifyUserCredentials } from "@/lib/users";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { email, password } = body;
  if (typeof email !== "string" || typeof password !== "string") {
    return Response.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const user = verifyUserCredentials(email, password);
  if (!user) {
    return Response.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const session = createSession(user.id);
  return Response.json(
    {
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      user: { id: user.id, email: user.email },
    },
    { status: 200 }
  );
}
