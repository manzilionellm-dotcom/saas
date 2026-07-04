/**
 * Runtime debugging / developer-tools detection.
 *
 * Default (passive) heuristic is non-disruptive: it infers an open, docked
 * devtools panel from the gap between the outer and inner viewport. It never
 * freezes the page.
 *
 * The active `debugger`-timing trap is opt-in (see config) because it pauses
 * execution when tools are attached and is hostile to legitimate power users.
 */

import { securityConfig } from "../config";
import { handleAnomaly } from "./signals";

let tripped = false;
const VIEWPORT_GAP_THRESHOLD = 170;

function trip(detail: string): void {
  if (tripped) return;
  tripped = true;
  handleAnomaly("devtools", detail);
}

/** Passive: a docked devtools panel shrinks the inner viewport noticeably. */
function viewportProbe(): void {
  const widthGap = window.outerWidth - window.innerWidth;
  const heightGap = window.outerHeight - window.innerHeight;
  if (
    window.outerWidth > 0 &&
    (widthGap > VIEWPORT_GAP_THRESHOLD || heightGap > VIEWPORT_GAP_THRESHOLD)
  ) {
    trip("viewport-gap");
  }
}

/** Active: a `debugger` statement stalls only when a debugger is attached. */
function timingProbe(): void {
  const start = performance.now();
  debugger;
  const elapsed = performance.now() - start;
  if (elapsed > 120) {
    trip(`timing:${Math.round(elapsed)}ms`);
  }
}

export function runAntiDebug(): void {
  try {
    viewportProbe();
  } catch {
    /* never break the app */
  }
}

/** Optional, opt-in continuous trap. Returns a disposer when armed. */
export function armAggressiveAntiDebug(): (() => void) | void {
  if (!securityConfig.client.aggressiveAntiDebug) return;
  const interval = window.setInterval(() => {
    try {
      timingProbe();
    } catch {
      /* ignore */
    }
  }, Math.max(500, securityConfig.client.heartbeatMs));
  return () => window.clearInterval(interval);
}
