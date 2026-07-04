/**
 * Central, environment-driven configuration for the security layer.
 *
 * Every behaviour is a toggle so the whole system can be tuned (or disabled)
 * per environment without touching application code. Server-only switches read
 * plain env vars; client switches read `NEXT_PUBLIC_*` so they are inlined into
 * the browser bundle at build time.
 *
 * This module is isomorphic and dependency-free on purpose: it is imported by
 * `next.config.ts`, the server proxy, and the client guard alike.
 */

export type ReactionMode = "off" | "report" | "invalidate";
export type CspMode = "off" | "strict-static" | "nonce";

const env = process.env;

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return /^(1|true|on|yes)$/i.test(value.trim());
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const candidate = (value ?? "").trim() as T;
  return allowed.includes(candidate) ? candidate : fallback;
}

export const isDevelopment = env.NODE_ENV === "development";

const reactionModes = ["off", "report", "invalidate"] as const;

export const securityConfig = {
  /** Master switch. When false the layer becomes a transparent pass-through. */
  enabled: bool(env.SECURITY_ENABLED, true),

  stealth: {
    /** Value advertised in the `Server` header instead of the real stack. */
    serverBanner: env.SECURITY_SERVER_BANNER ?? "webserver",
    /** Response headers scrubbed before the response leaves the edge. */
    strippedHeaders: [
      "x-powered-by",
      "server",
      "x-nextjs-cache",
      "x-nextjs-prerender",
      "x-nextjs-stale-time",
      "x-nextjs-matched-path",
      "x-nextjs-redirect",
      "x-opennext",
      "x-vercel-id",
      "x-vercel-cache",
    ],
    /** Emit low-entropy decoy headers to blur automated stack fingerprinting. */
    decoyHeaders: bool(env.SECURITY_DECOY_HEADERS, true),
  },

  csp: {
    /**
     * - `strict-static`: strong CSP compatible with static rendering (default).
     * - `nonce`: per-request nonce CSP (requires dynamic rendering).
     * - `off`: do not emit a CSP.
     */
    mode: oneOf<CspMode>(
      env.SECURITY_CSP_MODE,
      ["off", "strict-static", "nonce"],
      "strict-static",
    ),
  },

  evasion: {
    enabled: bool(env.SECURITY_EVASION, true),
    /** Suspicion score (0-100) at or above which a request gets a decoy. */
    blockThreshold: int(env.SECURITY_EVASION_THRESHOLD, 70),
    /** Optional artificial latency (ms) added to decoy responses (tarpit). */
    tarpitMs: int(env.SECURITY_EVASION_TARPIT_MS, 0),
  },

  rateLimit: {
    enabled: bool(env.SECURITY_RATELIMIT, true),
    windowMs: int(env.SECURITY_RATELIMIT_WINDOW_MS, 60_000),
    maxRequests: int(env.SECURITY_RATELIMIT_MAX, 240),
    /** Hard cap on tracked clients to bound memory of the in-process store. */
    maxTrackedClients: int(env.SECURITY_RATELIMIT_MAX_CLIENTS, 20_000),
  },

  client: {
    enabled: bool(env.NEXT_PUBLIC_SECURITY_CLIENT, true),
    /** Endpoint that receives anomaly beacons and invalidates the session. */
    reportEndpoint:
      env.NEXT_PUBLIC_SECURITY_REPORT_ENDPOINT ?? "/api/security/report",
    /** Skip all client guards while developing to avoid noisy false positives. */
    disableInDevelopment: bool(env.NEXT_PUBLIC_SECURITY_DISABLE_IN_DEV, true),
    /** Reaction when developer tools / debugging is detected. */
    devtools: oneOf<ReactionMode>(
      env.NEXT_PUBLIC_SECURITY_DEVTOOLS,
      reactionModes,
      "report",
    ),
    /** Reaction when a headless / automated / sandboxed browser is detected. */
    sandbox: oneOf<ReactionMode>(
      env.NEXT_PUBLIC_SECURITY_SANDBOX,
      reactionModes,
      "report",
    ),
    /** Reaction when a critical global is tampered with at runtime. */
    tamper: oneOf<ReactionMode>(
      env.NEXT_PUBLIC_SECURITY_TAMPER,
      reactionModes,
      "invalidate",
    ),
    /**
     * When true, an active `debugger`-based trap is armed. Off by default: it
     * is intentionally disruptive and can hurt legitimate power users, so it is
     * opt-in only.
     */
    aggressiveAntiDebug: bool(env.NEXT_PUBLIC_SECURITY_AGGRESSIVE, false),
    /** Poll interval (ms) for the client heartbeat checks. */
    heartbeatMs: int(env.NEXT_PUBLIC_SECURITY_HEARTBEAT_MS, 1500),
  },
} as const;

/** Name of the short-lived integrity cookie issued by the proxy. */
export const SECURITY_COOKIE = "__sec_ctx";
/** Request header carrying the per-request CSP nonce to the renderer. */
export const NONCE_HEADER = "x-nonce";
