import { randomBytes, randomUUID } from "node:crypto";
import { Broadcaster } from "./broadcaster";
import { probeSource, validateSource } from "./source";
import type {
  CreateSessionInput,
  LogEntry,
  LogLevel,
  RestreamEndpoint,
  RestreamSessionState,
} from "./types";

export const MIN_ENDPOINTS = 10;
export const MAX_ENDPOINTS = 20;
const DEFAULT_ENDPOINTS = 12;
const MAX_LOGS = 200;
const HEALTH_INTERVAL_MS = 10_000;
const FAILS_BEFORE_REGEN = 3;

interface Session {
  id: string;
  sourceUrl: string; // kept server-side only, never serialized to clients
  sourceHost: string;
  authorizedAt: number;
  createdAt: number;
  upstream: RestreamSessionState["upstream"];
  endpoints: Map<string, RestreamEndpoint>;
  logs: LogEntry[];
  broadcaster: Broadcaster | null;
  healthTimer: NodeJS.Timeout | null;
}

/**
 * Process-wide singleton. Because a real relay needs a persistent Node server
 * (one shared upstream connection, background health loop), we store the
 * manager on globalThis so it survives Next.js dev HMR. Deploy target must be a
 * long-running Node server (`next start`), not per-request serverless.
 */
class RestreamManager {
  private session: Session | null = null;

  private log(level: LogLevel, message: string) {
    if (!this.session) return;
    const entry: LogEntry = { ts: Date.now(), level, message };
    this.session.logs.push(entry);
    if (this.session.logs.length > MAX_LOGS) {
      this.session.logs.splice(0, this.session.logs.length - MAX_LOGS);
    }
    const line = `[restream] ${level.toUpperCase()} ${message}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
  }

  private clampCount(count?: number): number {
    if (!count || Number.isNaN(count)) return DEFAULT_ENDPOINTS;
    return Math.max(MIN_ENDPOINTS, Math.min(MAX_ENDPOINTS, Math.floor(count)));
  }

  private makeEndpoint(): RestreamEndpoint {
    const id = randomUUID();
    const token = randomBytes(16).toString("hex");
    const now = Date.now();
    return {
      id,
      token,
      path: `/api/restream/stream/${id}?t=${token}`,
      status: "starting",
      createdAt: now,
      updatedAt: now,
      failedChecks: 0,
    };
  }

  async createSession(input: CreateSessionInput): Promise<
    | { ok: true; state: RestreamSessionState }
    | { ok: false; error: string }
  > {
    if (!input.authorized) {
      return {
        ok: false,
        error:
          "You must confirm you are authorized to restream this source before continuing.",
      };
    }
    const validation = await validateSource(input.sourceUrl);
    if (!validation.ok) {
      return { ok: false, error: validation.error || "Source validation failed." };
    }

    // Tear down any prior session (and its upstream connection).
    this.destroy();

    const count = this.clampCount(input.count);
    const now = Date.now();
    const endpoints = new Map<string, RestreamEndpoint>();
    for (let i = 0; i < count; i++) {
      const ep = this.makeEndpoint();
      endpoints.set(ep.id, ep);
    }

    this.session = {
      id: randomUUID(),
      sourceUrl: input.sourceUrl.trim(),
      sourceHost: validation.host,
      authorizedAt: now,
      createdAt: now,
      upstream: { reachable: true, checkedAt: now, kind: validation.kind },
      endpoints,
      logs: [],
      broadcaster: null,
      healthTimer: null,
    };

    this.log(
      "info",
      `Created session for authorized source ${validation.host} with ${count} independent local endpoints (single shared upstream connection).`,
    );
    this.startHealthLoop();
    await this.runHealthCheck(); // first pass so endpoints go online quickly
    return { ok: true, state: this.getState()! };
  }

  /** Generate a brand-new set of endpoint URLs, keeping the same source. */
  async refresh(): Promise<
    | { ok: true; state: RestreamSessionState }
    | { ok: false; error: string }
  > {
    const s = this.session;
    if (!s) return { ok: false, error: "No active restream session." };
    const count = s.endpoints.size || DEFAULT_ENDPOINTS;
    s.endpoints.clear();
    for (let i = 0; i < count; i++) {
      const ep = this.makeEndpoint();
      s.endpoints.set(ep.id, ep);
    }
    this.log("info", `Refreshed: generated ${count} new independent endpoints.`);
    await this.runHealthCheck();
    return { ok: true, state: this.getState()! };
  }

  getState(): RestreamSessionState | null {
    const s = this.session;
    if (!s) return null;
    return {
      id: s.id,
      sourceHost: s.sourceHost,
      authorizedAt: s.authorizedAt,
      createdAt: s.createdAt,
      upstream: s.upstream,
      endpoints: Array.from(s.endpoints.values()).sort(
        (a, b) => a.createdAt - b.createdAt,
      ),
      logs: s.logs.slice(-50),
    };
  }

  /** Look up an endpoint for the relay route, validating its token. */
  authorizeEndpoint(
    id: string,
    token: string,
  ): { ok: true; sourceUrl: string; endpoint: RestreamEndpoint } | { ok: false } {
    const s = this.session;
    if (!s) return { ok: false };
    const ep = s.endpoints.get(id);
    if (!ep || ep.token !== token) return { ok: false };
    return { ok: true, sourceUrl: s.sourceUrl, endpoint: ep };
  }

  /** Shared broadcaster for the single upstream connection. */
  getBroadcaster(): Broadcaster | null {
    const s = this.session;
    if (!s) return null;
    if (!s.broadcaster) {
      s.broadcaster = new Broadcaster(s.sourceUrl, {
        onEmpty: () => this.log("info", "Upstream idle: no active viewers, connection released."),
        onError: (err) => {
          this.log("error", `Upstream stream error: ${err}`);
          if (this.session) {
            this.session.upstream = {
              reachable: false,
              checkedAt: Date.now(),
              kind: this.session.upstream.kind,
              error: err,
            };
          }
        },
      });
    }
    return s.broadcaster;
  }

  private startHealthLoop() {
    const s = this.session;
    if (!s || s.healthTimer) return;
    s.healthTimer = setInterval(() => {
      void this.runHealthCheck();
    }, HEALTH_INTERVAL_MS);
    // Do not keep the event loop alive solely for health checks.
    s.healthTimer.unref?.();
  }

  /**
   * One probe of the single upstream drives every endpoint's status. Endpoints
   * are "independent" in lifecycle (own timers, own regeneration) but share the
   * one authorized connection — so their reachability is derived from one probe
   * rather than N separate connections to the provider.
   */
  private async runHealthCheck() {
    const s = this.session;
    if (!s) return;
    const probe = await probeSource(s.sourceUrl);
    s.upstream = {
      reachable: probe.reachable,
      checkedAt: Date.now(),
      kind: s.upstream.kind,
      error: probe.error,
    };

    const regenerated: string[] = [];
    for (const ep of Array.from(s.endpoints.values())) {
      if (probe.reachable) {
        ep.failedChecks = 0;
        ep.lastError = undefined;
        if (ep.status !== "online") {
          ep.status = "online";
          ep.updatedAt = Date.now();
        }
      } else {
        ep.failedChecks += 1;
        ep.status = "error";
        ep.lastError = probe.error || "upstream unreachable";
        ep.updatedAt = Date.now();
        if (ep.failedChecks >= FAILS_BEFORE_REGEN) {
          // Auto-remove the failed endpoint and regenerate a replacement so the
          // household keeps a stable count of usable URLs.
          s.endpoints.delete(ep.id);
          const replacement = this.makeEndpoint();
          s.endpoints.set(replacement.id, replacement);
          regenerated.push(ep.id);
        }
      }
    }

    if (!probe.reachable) {
      this.log("warn", `Upstream unreachable (${probe.error || "unknown"}).`);
    }
    if (regenerated.length > 0) {
      this.log(
        "info",
        `Removed ${regenerated.length} failed endpoint(s) and regenerated replacements.`,
      );
    }
  }

  destroy() {
    const s = this.session;
    if (!s) return;
    if (s.healthTimer) clearInterval(s.healthTimer);
    s.broadcaster = null; // dropping refs aborts the upstream on last unsubscribe
    this.log("info", "Session destroyed; upstream connection released.");
    this.session = null;
  }
}

// Persist across HMR / route module reloads.
const globalForRestream = globalThis as unknown as {
  __restreamManager?: RestreamManager;
};
export const restreamManager: RestreamManager =
  globalForRestream.__restreamManager ?? new RestreamManager();
if (!globalForRestream.__restreamManager) {
  globalForRestream.__restreamManager = restreamManager;
}
