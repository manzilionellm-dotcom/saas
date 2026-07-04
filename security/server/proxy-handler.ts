/**
 * Server entry point for the security layer, invoked from the root `proxy.ts`.
 *
 * Pipeline per request:
 *   1. Rate limit (in-process sliding window).
 *   2. Fingerprint + evasion (decoy response for recon/abuse).
 *   3. Pass through with stealth headers, baseline hardening, CSP and the
 *      integrity cookie applied.
 *
 * Everything is wrapped so any internal fault fails open to a normal response —
 * the security layer must never take the application down.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NONCE_HEADER, securityConfig } from "../config";
import { buildNonceCsp, generateNonce } from "./csp";
import { decideEvasion, decoyResponse, tarpitDelay } from "./evasion";
import { fingerprintRequest } from "./fingerprint";
import { checkRateLimit } from "./ratelimit";
import {
  applyBaselineHeaders,
  applyStealthHeaders,
  issueIntegrityCookie,
} from "./stealth";

function nowMs(): number {
  return Date.now();
}

function tooManyRequests(retryAfterSeconds: number): NextResponse {
  const response = new NextResponse("Too Many Requests", {
    status: 429,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(retryAfterSeconds),
      "Cache-Control": "no-store",
    },
  });
  applyStealthHeaders(response);
  return response;
}

export async function handleSecurity(
  request: NextRequest,
): Promise<NextResponse> {
  if (!securityConfig.enabled) {
    return NextResponse.next();
  }

  const signature = fingerprintRequest(request);

  // 1. Rate limiting.
  if (securityConfig.rateLimit.enabled) {
    const verdict = checkRateLimit(signature.ip, nowMs());
    if (verdict.limited) {
      return tooManyRequests(verdict.retryAfterSeconds);
    }
  }

  // 2. Evasion — neutral decoy for reconnaissance / abuse.
  const evasion = decideEvasion(signature);
  if (evasion.block) {
    await tarpitDelay();
    return decoyResponse();
  }

  // 3. Normal path with a per-request nonce when the strict CSP mode is on.
  let response: NextResponse;
  if (securityConfig.csp.mode === "nonce") {
    const nonce = generateNonce();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(NONCE_HEADER, nonce);
    const csp = buildNonceCsp(nonce);
    requestHeaders.set("Content-Security-Policy", csp);

    response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
  } else {
    response = NextResponse.next();
  }

  applyBaselineHeaders(response);
  applyStealthHeaders(response);
  issueIntegrityCookie(response);

  return response;
}
