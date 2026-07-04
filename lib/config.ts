/**
 * Server-side auth configuration, read from environment variables.
 *
 * SIMULTANEOUS_LOGIN_DETECTION_ENABLED
 *   Controls single-session enforcement. When "true" (or "1", "yes", "on"),
 *   a successful login revokes every other active session of the same user.
 *   DEFAULT: disabled — multiple simultaneous sessions per user are allowed
 *   and a new login never blocks, warns about, or invalidates existing ones.
 */
const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);

export function isSimultaneousLoginDetectionEnabled(): boolean {
  const raw = process.env.SIMULTANEOUS_LOGIN_DETECTION_ENABLED;
  if (raw === undefined || raw.trim() === "") {
    return false;
  }
  return TRUE_VALUES.has(raw.trim().toLowerCase());
}

function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Access-token lifetime in milliseconds (default: 15 minutes). */
export function sessionTtlMs(): number {
  return positiveIntFromEnv("SESSION_TTL_SECONDS", 15 * 60) * 1000;
}

/** Refresh-token lifetime in milliseconds (default: 7 days). */
export function refreshTtlMs(): number {
  return positiveIntFromEnv("REFRESH_TTL_SECONDS", 7 * 24 * 60 * 60) * 1000;
}
