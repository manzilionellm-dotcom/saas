/**
 * In-process sliding-window rate limiter.
 *
 * State lives in the module scope; the proxy runs on the Node.js runtime so
 * this persists per instance. For multi-instance deployments swap the store
 * for a shared backend (Redis, etc.) behind the same `check()` signature.
 */

import { securityConfig } from "../config";

interface Bucket {
  hits: number[];
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Drop the oldest tracked clients when the store grows past its cap. */
function evictIfNeeded(): void {
  const { maxTrackedClients } = securityConfig.rateLimit;
  if (store.size <= maxTrackedClients) return;
  const overflow = store.size - maxTrackedClients;
  let removed = 0;
  for (const key of store.keys()) {
    store.delete(key);
    if (++removed >= overflow) break;
  }
}

export function checkRateLimit(key: string, now: number): RateLimitResult {
  const { windowMs, maxRequests } = securityConfig.rateLimit;
  const windowStart = now - windowMs;

  const bucket = store.get(key) ?? { hits: [] };
  // Keep only hits inside the current window.
  const recent = bucket.hits.filter((ts) => ts > windowStart);
  recent.push(now);
  bucket.hits = recent;
  store.set(key, bucket);
  evictIfNeeded();

  const limited = recent.length > maxRequests;
  const remaining = Math.max(0, maxRequests - recent.length);
  const oldest = recent[0] ?? now;
  const retryAfterSeconds = limited
    ? Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    : 0;

  return { limited, remaining, retryAfterSeconds };
}
