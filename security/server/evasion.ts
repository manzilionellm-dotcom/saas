/**
 * Evasion layer: when a request looks like reconnaissance or automated abuse,
 * respond with a neutral decoy that adapts to the request origin instead of
 * exposing the application's real behaviour. This starves attacker recon and
 * behavioural analysis of signal while leaving legitimate traffic untouched.
 */

import { NextResponse } from "next/server";
import { securityConfig } from "../config";
import type { RequestSignature } from "./fingerprint";
import { applyStealthHeaders } from "./stealth";

export interface EvasionDecision {
  block: boolean;
  reason: string;
}

export function decideEvasion(signature: RequestSignature): EvasionDecision {
  if (!securityConfig.evasion.enabled) {
    return { block: false, reason: "disabled" };
  }
  if (signature.score >= securityConfig.evasion.blockThreshold) {
    return { block: true, reason: signature.reasons.join(",") || "score" };
  }
  return { block: false, reason: "clear" };
}

/**
 * A bland, stack-agnostic response. It intentionally looks like a generic
 * static web server 404 — no framework markers, no stack traces, no timing
 * tells — so probes cannot distinguish a real miss from an active defense.
 */
export function decoyResponse(): NextResponse {
  const body = "<!doctype html><html><head><title>Not Found</title></head>" +
    "<body><h1>404 Not Found</h1></body></html>";

  const response = new NextResponse(body, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

  applyStealthHeaders(response);
  return response;
}

/** Optional cooperative delay to slow down high-volume probing (tarpit). */
export function tarpitDelay(): Promise<void> {
  const ms = securityConfig.evasion.tarpitMs;
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
