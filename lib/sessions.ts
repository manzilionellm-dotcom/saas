import { randomBytes, randomUUID } from "node:crypto";
import {
  isSimultaneousLoginDetectionEnabled,
  refreshTtlMs,
  sessionTtlMs,
} from "@/lib/config";
import { store, type Session } from "@/lib/store";

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

function isExpired(session: Session, now: number): boolean {
  return session.refreshExpiresAt <= now;
}

function removeSession(session: Session): void {
  store.sessionsById.delete(session.id);
  store.sessionIdByToken.delete(session.token);
  store.sessionIdByRefreshToken.delete(session.refreshToken);
}

function pruneExpiredSessions(now: number): void {
  for (const session of store.sessionsById.values()) {
    if (isExpired(session, now)) {
      removeSession(session);
    }
  }
}

/**
 * Creates a session for a successful login.
 *
 * Simultaneous-login detection is DISABLED by default: any number of
 * sessions for the same user coexist, and a new login never invalidates,
 * warns about, or disconnects existing sessions. Only when
 * SIMULTANEOUS_LOGIN_DETECTION_ENABLED=true does a new login revoke the
 * user's other active sessions (single-session enforcement).
 */
export function createSession(userId: string): Session {
  const now = Date.now();
  pruneExpiredSessions(now);

  if (isSimultaneousLoginDetectionEnabled()) {
    revokeUserSessions(userId);
  }

  const session: Session = {
    id: randomUUID(),
    userId,
    token: newToken(),
    refreshToken: newToken(),
    createdAt: now,
    expiresAt: now + sessionTtlMs(),
    refreshExpiresAt: now + refreshTtlMs(),
  };
  store.sessionsById.set(session.id, session);
  store.sessionIdByToken.set(session.token, session.id);
  store.sessionIdByRefreshToken.set(session.refreshToken, session.id);
  return session;
}

/** Returns the session for a valid, unexpired access token. */
export function getSessionByToken(token: string): Session | null {
  const sessionId = store.sessionIdByToken.get(token);
  if (!sessionId) {
    return null;
  }
  const session = store.sessionsById.get(sessionId);
  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }
  return session;
}

/** Rotates access and refresh tokens for a valid refresh token. */
export function refreshSession(refreshToken: string): Session | null {
  const sessionId = store.sessionIdByRefreshToken.get(refreshToken);
  if (!sessionId) {
    return null;
  }
  const session = store.sessionsById.get(sessionId);
  const now = Date.now();
  if (!session || isExpired(session, now)) {
    return null;
  }

  store.sessionIdByToken.delete(session.token);
  store.sessionIdByRefreshToken.delete(session.refreshToken);
  session.token = newToken();
  session.refreshToken = newToken();
  session.expiresAt = now + sessionTtlMs();
  session.refreshExpiresAt = now + refreshTtlMs();
  store.sessionIdByToken.set(session.token, session.id);
  store.sessionIdByRefreshToken.set(session.refreshToken, session.id);
  return session;
}

export function revokeSession(sessionId: string): void {
  const session = store.sessionsById.get(sessionId);
  if (session) {
    removeSession(session);
  }
}

export function revokeUserSessions(userId: string): void {
  for (const session of store.sessionsById.values()) {
    if (session.userId === userId) {
      removeSession(session);
    }
  }
}

/** Lists the user's active (non-expired) sessions. */
export function listUserSessions(userId: string): Session[] {
  const now = Date.now();
  pruneExpiredSessions(now);
  return [...store.sessionsById.values()].filter(
    (session) => session.userId === userId
  );
}
