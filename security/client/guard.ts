/**
 * Client guard bootstrap — the single entry point imported by
 * `instrumentation-client.ts`. It wires the passive detectors together and
 * drives them from a lightweight heartbeat.
 *
 * Hard rule: the guard is fully wrapped and self-contained; if anything here
 * fails it must degrade silently and leave the application working.
 */

import { isDevelopment, securityConfig } from "../config";
import { armAggressiveAntiDebug, runAntiDebug } from "./anti-debug";
import { initAntiTamper, runTamperCheck } from "./anti-tamper";
import { runSandboxCheck } from "./sandbox";

let started = false;

export function startClientGuard(): void {
  if (started) return;
  started = true;

  const { enabled, disableInDevelopment, heartbeatMs } = securityConfig.client;
  if (!enabled) return;
  if (isDevelopment && disableInDevelopment) return;
  if (typeof window === "undefined") return;

  try {
    initAntiTamper();

    // One immediate sweep at boot.
    runSandboxCheck();
    runAntiDebug();
    runTamperCheck();

    // Periodic sweep for detectors that only matter after interaction.
    window.setInterval(() => {
      runAntiDebug();
      runTamperCheck();
    }, Math.max(500, heartbeatMs));

    armAggressiveAntiDebug();
  } catch {
    /* silent by design */
  }
}
