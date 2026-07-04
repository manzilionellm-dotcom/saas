/**
 * Server-side request fingerprinting.
 *
 * Scores an incoming request for automation / reconnaissance signals so the
 * evasion layer can decide whether to answer normally or with a neutral decoy.
 * The goal is to frustrate attacker recon against *this* application — it is
 * deliberately conservative so real browsers score ~0.
 */

import type { NextRequest } from "next/server";

export interface RequestSignature {
  score: number;
  reasons: string[];
  ip: string;
  userAgent: string;
}

/** User-agent substrings that belong to offensive/recon tooling. */
const SCANNER_AGENTS = [
  "sqlmap",
  "nikto",
  "nmap",
  "masscan",
  "zgrab",
  "nessus",
  "acunetix",
  "netsparker",
  "wpscan",
  "dirbuster",
  "gobuster",
  "feroxbuster",
  "ffuf",
  "hydra",
  "nuclei",
  "arachni",
  "openvas",
  "w3af",
  "metasploit",
  "havij",
  "commix",
  "xsser",
];

/** Non-browser clients: not blocked, only nudged upward slightly. */
const NON_BROWSER_AGENTS = [
  "curl/",
  "wget/",
  "python-requests",
  "python-urllib",
  "go-http-client",
  "java/",
  "libwww-perl",
  "okhttp",
  "axios/",
  "node-fetch",
  "http_request",
  "scrapy",
];

/** Paths that only recon tooling probes for. */
const HONEYPOT_PATHS = [
  "/.env",
  "/.git",
  "/.svn",
  "/.hg",
  "/.aws",
  "/.ssh",
  "/wp-admin",
  "/wp-login.php",
  "/xmlrpc.php",
  "/phpmyadmin",
  "/pma",
  "/administrator",
  "/vendor/phpunit",
  "/actuator",
  "/server-status",
  "/.well-known/security.txt.bak",
  "/config.php",
  "/.docker",
  "/id_rsa",
  "/backup.sql",
  "/dump.sql",
];

/** Payload markers of injection / traversal probing in URL or query. */
const PAYLOAD_MARKERS = [
  "../",
  "..%2f",
  "%2e%2e",
  "union select",
  "union+select",
  "' or '1'='1",
  " or 1=1",
  "<script",
  "onerror=",
  "javascript:",
  "/etc/passwd",
  "cmd=",
  "${jndi:",
  "base64_decode",
];

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "0.0.0.0"
  );
}

export function fingerprintRequest(request: NextRequest): RequestSignature {
  const reasons: string[] = [];
  let score = 0;

  const userAgent = (request.headers.get("user-agent") ?? "").toLowerCase();
  const accept = request.headers.get("accept");
  const acceptLanguage = request.headers.get("accept-language");
  const pathAndQuery = (
    request.nextUrl.pathname + request.nextUrl.search
  ).toLowerCase();

  if (!userAgent) {
    score += 35;
    reasons.push("missing-user-agent");
  } else if (SCANNER_AGENTS.some((needle) => userAgent.includes(needle))) {
    score += 100;
    reasons.push("scanner-user-agent");
  } else if (NON_BROWSER_AGENTS.some((needle) => userAgent.includes(needle))) {
    score += 25;
    reasons.push("non-browser-user-agent");
  }

  // Real browsers always send an Accept header for navigations.
  if (accept === null) {
    score += 20;
    reasons.push("missing-accept");
  }
  if (acceptLanguage === null) {
    score += 10;
    reasons.push("missing-accept-language");
  }

  if (HONEYPOT_PATHS.some((path) => pathAndQuery.startsWith(path))) {
    score += 80;
    reasons.push("honeypot-path");
  }

  if (PAYLOAD_MARKERS.some((marker) => pathAndQuery.includes(marker))) {
    score += 90;
    reasons.push("payload-marker");
  }

  // Automation frameworks frequently leak these hints.
  if (
    userAgent.includes("headlesschrome") ||
    userAgent.includes("phantomjs") ||
    userAgent.includes("electron") ||
    request.headers.has("x-selenium")
  ) {
    score += 40;
    reasons.push("headless-hint");
  }

  return {
    score: Math.min(score, 100),
    reasons,
    ip: clientIp(request),
    userAgent,
  };
}
