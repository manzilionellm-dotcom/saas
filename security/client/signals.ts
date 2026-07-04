/**
 * Shared client-side anomaly reporting and session invalidation.
 *
 * All reactions funnel through here so behaviour is consistent and, crucially,
 * defensive: every path is wrapped so a detector can never throw into the app.
 */

import type { ReactionMode } from "../config";
import { securityConfig } from "../config";

export type AnomalyKind = "devtools" | "sandbox" | "tamper";

interface Anomaly {
  kind: AnomalyKind;
  detail: string;
}

const reported = new Set<string>();

/** Fire-and-forget beacon to the server report endpoint. */
function beacon(anomaly: Anomaly): void {
  const dedupeKey = `${anomaly.kind}:${anomaly.detail}`;
  if (reported.has(dedupeKey)) return;
  reported.add(dedupeKey);

  const payload = JSON.stringify({
    kind: anomaly.kind,
    detail: anomaly.detail,
    href: location.href,
    ts: Date.now(),
  });

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(securityConfig.client.reportEndpoint, blob);
      return;
    }
  } catch {
    /* fall through to fetch */
  }

  try {
    void fetch(securityConfig.client.reportEndpoint, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      credentials: "same-origin",
    });
  } catch {
    /* reporting is best-effort */
  }
}

/**
 * Invalidate the current session: notify the server (which clears the integrity
 * cookie) then reload so the app re-bootstraps from a clean, unauthenticated
 * state. Kept deliberately non-destructive to the DOM to avoid data loss on a
 * false positive — the reload is the hard reset.
 */
function invalidateSession(anomaly: Anomaly): void {
  beacon(anomaly);
  try {
    void fetch(securityConfig.client.reportEndpoint, {
      method: "POST",
      body: JSON.stringify({ kind: anomaly.kind, action: "invalidate" }),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      credentials: "same-origin",
    }).finally(() => {
      try {
        location.reload();
      } catch {
        /* ignore */
      }
    });
  } catch {
    try {
      location.reload();
    } catch {
      /* ignore */
    }
  }
}

/** Route an anomaly to the configured reaction for its kind. */
export function handleAnomaly(kind: AnomalyKind, detail: string): void {
  const mode: ReactionMode = securityConfig.client[kind];
  if (mode === "off") return;
  const anomaly: Anomaly = { kind, detail };
  if (mode === "report") {
    beacon(anomaly);
    return;
  }
  invalidateSession(anomaly);
}
