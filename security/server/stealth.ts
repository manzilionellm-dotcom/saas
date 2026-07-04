/**
 * Stealth layer: strip framework/stack signatures from outgoing responses and
 * replace them with low-entropy, generic values so automated fingerprinting of
 * the technology stack yields nothing useful.
 */

import { NextResponse } from "next/server";
import { SECURITY_COOKIE, securityConfig } from "../config";
import { securityHeaders } from "./security-headers";

/** Deterministic-but-generic decoy values that reveal nothing real. */
const DECOY_HEADERS: Array<[string, string]> = [
  ["X-Request-Handler", "edge"],
  ["X-Content-Delivery", "direct"],
  ["Via", "1.1 gateway"],
];

/** Remove revealing headers and set a generic server banner. */
export function applyStealthHeaders(response: NextResponse): void {
  const { strippedHeaders, serverBanner, decoyHeaders } = securityConfig.stealth;

  for (const header of strippedHeaders) {
    response.headers.delete(header);
  }

  response.headers.set("Server", serverBanner);

  if (decoyHeaders) {
    for (const [key, value] of DECOY_HEADERS) {
      response.headers.set(key, value);
    }
  }
}

/** Apply the baseline hardening headers (skipped when already set upstream). */
export function applyBaselineHeaders(response: NextResponse): void {
  for (const { key, value } of securityHeaders()) {
    response.headers.set(key, value);
  }
}

/**
 * Issue / refresh a short-lived, opaque integrity cookie. Its presence lets the
 * client guard and the report endpoint coordinate session invalidation without
 * exposing any meaningful value.
 */
export function issueIntegrityCookie(response: NextResponse): void {
  response.cookies.set(SECURITY_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 6,
  });
}
