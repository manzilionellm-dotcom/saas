export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  createdAt: number;
  expiresAt: number;
  refreshExpiresAt: number;
}

interface AuthStore {
  usersByEmail: Map<string, User>;
  sessionsById: Map<string, Session>;
  sessionIdByToken: Map<string, string>;
  sessionIdByRefreshToken: Map<string, string>;
}

// Kept on globalThis so the store survives HMR module reloads in development.
const globalScope = globalThis as typeof globalThis & { __authStore?: AuthStore };

export const store: AuthStore = (globalScope.__authStore ??= {
  usersByEmail: new Map(),
  sessionsById: new Map(),
  sessionIdByToken: new Map(),
  sessionIdByRefreshToken: new Map(),
});
