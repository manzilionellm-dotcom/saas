/**
 * Static, framework-agnostic security headers.
 *
 * Kept dependency-free (imports only `config`) so it can be consumed by
 * `next.config.ts` `headers()` to cover every route — including static assets
 * and API routes that the proxy matcher deliberately skips.
 */

import { isDevelopment, securityConfig } from "../config";

export interface HeaderEntry {
  key: string;
  value: string;
}

/**
 * Build a strong, static-rendering-compatible Content-Security-Policy.
 *
 * `'unsafe-inline'` is required for the framework's inline bootstrap and for
 * injected critical CSS; the nonce variant (see `csp.ts`) removes it but forces
 * dynamic rendering, so it is opt-in.
 */
export function buildStaticCsp(): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

/**
 * The baseline hardening headers applied to all responses. These blur the
 * server signature and lock down transport, framing, referrer leakage and
 * browser feature access.
 */
export function securityHeaders(): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "Origin-Agent-Cluster", value: "?1" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=(), payment=(), usb=()",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
  ];

  if (securityConfig.csp.mode === "strict-static") {
    headers.push({ key: "Content-Security-Policy", value: buildStaticCsp() });
  }

  return headers;
}
