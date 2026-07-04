// Shared types for the restream feature.
//
// Design note: a "restream endpoint" here is an independent *local distribution
// endpoint*. Every endpoint is served from a SINGLE authorized upstream
// connection to the M3U source (see manager.ts / broadcaster.ts). Generating
// endpoints therefore never opens additional connections to the provider — it
// only creates more local URLs that household devices can each connect to.
// This respects the source's connection limits and keeps resource usage low.

export type EndpointStatus = "starting" | "online" | "offline" | "error";

export interface RestreamEndpoint {
  /** Stable public id used in the relay URL. */
  id: string;
  /** Opaque access token embedded in the relay URL. */
  token: string;
  /** Relative relay path a device connects to, e.g. /api/restream/stream/<id>?t=<token>. */
  path: string;
  status: EndpointStatus;
  createdAt: number;
  updatedAt: number;
  /** Number of consecutive failed health checks. Drives auto-regeneration. */
  failedChecks: number;
  lastError?: string;
}

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  ts: number;
  level: LogLevel;
  message: string;
}

export interface UpstreamHealth {
  reachable: boolean;
  checkedAt: number;
  /** Detected content kind, best-effort. */
  kind: "m3u" | "unknown" | null;
  error?: string;
}

export interface RestreamSessionState {
  id: string;
  /** Host of the authorized source, for display/logging. Never the raw URL with creds. */
  sourceHost: string;
  authorizedAt: number;
  createdAt: number;
  upstream: UpstreamHealth;
  endpoints: RestreamEndpoint[];
  logs: LogEntry[];
}

export interface CreateSessionInput {
  sourceUrl: string;
  authorized: boolean;
  /** Requested number of local distribution endpoints. Clamped to [MIN, MAX]. */
  count?: number;
}
