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

export interface Channel {
  id: string;
  userId: string;
  name: string;
  url: string;
  group: string | null;
  logo: string | null;
  createdAt: number;
}

export interface StreamConnection {
  id: string;
  userId: string;
  sessionId: string;
  channelId: string;
  startedAt: number;
}

interface AuthStore {
  usersByEmail: Map<string, User>;
  sessionsById: Map<string, Session>;
  sessionIdByToken: Map<string, string>;
  sessionIdByRefreshToken: Map<string, string>;
  channelsById: Map<string, Channel>;
  streamConnectionsById: Map<string, StreamConnection>;
}

// Kept on globalThis so the store survives HMR module reloads in development.
const globalScope = globalThis as typeof globalThis & { __authStore?: AuthStore };

export const store: AuthStore = (globalScope.__authStore ??= {
  usersByEmail: new Map(),
  sessionsById: new Map(),
  sessionIdByToken: new Map(),
  sessionIdByRefreshToken: new Map(),
  channelsById: new Map(),
  streamConnectionsById: new Map(),
});
