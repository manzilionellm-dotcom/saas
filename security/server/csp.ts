/**
 * Per-request nonce Content-Security-Policy (opt-in `csp.mode = "nonce"`).
 *
 * Next.js reads the CSP from the request headers during SSR and automatically
 * attaches the nonce to framework scripts, page bundles and injected styles.
 * This mode removes `'unsafe-inline'` entirely but requires dynamic rendering.
 */

import { isDevelopment } from "../config";

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildNonceCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDevelopment ? " 'unsafe-eval'" : ""
    }`,
    `style-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}
