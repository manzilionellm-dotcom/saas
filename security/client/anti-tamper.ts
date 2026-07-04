/**
 * Runtime anti-tamper: detect and resist alteration of the critical globals the
 * application relies on. If an attacker swaps out `fetch`, `JSON.parse`, or the
 * history API to intercept or rewrite behaviour, we notice and react.
 */

import { handleAnomaly } from "./signals";

interface Guarded {
  name: string;
  ref: unknown;
}

let baseline: Guarded[] = [];

/** Capture trusted references to sensitive primitives at boot. */
function capture(): Guarded[] {
  const w = window as unknown as Record<string, unknown>;
  const guarded: Guarded[] = [
    { name: "fetch", ref: w.fetch },
    { name: "XMLHttpRequest", ref: w.XMLHttpRequest },
    { name: "JSON.parse", ref: JSON.parse },
    { name: "JSON.stringify", ref: JSON.stringify },
    { name: "Function.prototype.call", ref: Function.prototype.call },
    { name: "history.pushState", ref: history.pushState },
    { name: "history.replaceState", ref: history.replaceState },
    { name: "localStorage.setItem", ref: Storage.prototype.setItem },
  ];
  return guarded;
}

/** Freeze a handful of structures that should never legitimately change. */
function hardenGlobals(): void {
  try {
    Object.freeze(JSON);
    Object.freeze(Object.prototype);
    Object.freeze(Array.prototype);
  } catch {
    /* some environments disallow freezing built-ins */
  }
}

/** Verify guarded references still point at the originals. */
function verify(): void {
  const current = capture();
  for (let i = 0; i < baseline.length; i++) {
    const before = baseline[i]!;
    const after = current[i];
    if (after && after.ref !== before.ref) {
      handleAnomaly("tamper", before.name);
      return;
    }
  }
}

export function initAntiTamper(): void {
  try {
    baseline = capture();
    hardenGlobals();
  } catch {
    /* never break the app */
  }
}

export function runTamperCheck(): void {
  try {
    if (baseline.length > 0) verify();
  } catch {
    /* never break the app */
  }
}
