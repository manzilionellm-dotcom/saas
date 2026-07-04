import { getSessionByToken } from "@/lib/sessions";
import { store, type Session, type User } from "@/lib/store";

/** Resolves the session from an `Authorization: Bearer <token>` header. */
export function getSessionFromRequest(request: Request): Session | null {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = header.slice("bearer ".length).trim();
  if (!token) {
    return null;
  }
  return getSessionByToken(token);
}

export function getUserById(userId: string): User | null {
  for (const user of store.usersByEmail.values()) {
    if (user.id === userId) {
      return user;
    }
  }
  return null;
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export async function readJsonBody(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
