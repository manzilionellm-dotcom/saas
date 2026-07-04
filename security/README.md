# Security & Resilience Layer

Isolated, drop-in hardening for this Next.js app. All logic lives here; the rest
of the codebase only touches four thin integration points.

## Integration points (minimal by design)

| File | Lines added | Purpose |
| --- | --- | --- |
| `proxy.ts` (root) | delegates to `handleSecurity` | request-time pipeline |
| `instrumentation-client.ts` (root) | calls `startClientGuard` | boots client guard |
| `next.config.ts` | `poweredByHeader`, `removeConsole`, `headers()` | build/stealth config |
| `app/api/security/report/route.ts` | anomaly beacon sink | session invalidation |

## Pillars

1. **Stealth / anti-detection** (`server/stealth.ts`, `server/security-headers.ts`)
   - Removes `x-powered-by`, `server`, and `x-nextjs-*` signature headers.
   - Sets a generic `Server` banner and optional low-entropy decoy headers.
   - Emits HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
     `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP/CORP and a
     Content-Security-Policy on every route.
   - `poweredByHeader: false`, `generateEtags: false`, no production source maps.
   - **Residual signature note:** the framework appends cache-state headers
     (`x-nextjs-cache`, `x-nextjs-prerender`, `x-nextjs-stale-time`, RSC `Vary`)
     *after* the proxy on **statically-cached** responses, so they cannot be
     removed from app code. The proxy already strips them on every response it
     owns (dynamic pages, API, decoys, 429). To remove them on static hits too,
     either scrub them at your edge/CDN (the standard place) or set
     `SECURITY_CSP_MODE=nonce`, which makes pages render dynamically and lets the
     proxy strip them everywhere.

2. **Evasion** (`server/fingerprint.ts`, `server/evasion.ts`)
   - Scores each request for recon/automation signals (scanner UAs, honeypot
     paths, injection markers, headless hints, missing browser headers).
   - Requests at/above the threshold get a neutral, stack-agnostic 404 decoy
     (optionally tarpitted) instead of the real response — starving attacker
     recon of signal. Tuned so real browsers score ~0.

3. **Obfuscation** (`next.config.ts`)
   - Production builds are minified by the compiler; `console.*` (except
     `error`) is stripped and browser source maps are disabled so client source
     and logging do not leak. (A heavier JS obfuscator is intentionally not
     wired in: it would bypass the default Turbopack build and risk breakage.)

4. **Anti-analysis / anti-tamper** (`client/*`)
   - `sandbox.ts`: headless / automation detection (webdriver flag, driver
     globals, UA/plugin/core inconsistencies).
   - `anti-debug.ts`: passive devtools detection via viewport gap; opt-in active
     `debugger` timing trap.
   - `anti-tamper.ts`: freezes core built-ins and detects swaps of `fetch`,
     `JSON.*`, history and storage primitives.
   - `signals.ts`: routes anomalies to `report` (beacon) or `invalidate`
     (clear integrity cookie + reload).

Plus an in-process sliding-window **rate limiter** (`server/ratelimit.ts`).

## Configuration

Everything is env-driven with safe defaults (`config.ts`). Nothing needs to be
set for the system to work. Notable switches:

| Env var | Default | Effect |
| --- | --- | --- |
| `SECURITY_ENABLED` | `true` | Master switch (server). |
| `SECURITY_CSP_MODE` | `strict-static` | `strict-static` \| `nonce` \| `off`. |
| `SECURITY_EVASION_THRESHOLD` | `70` | Suspicion score to serve a decoy. |
| `SECURITY_RATELIMIT_MAX` | `240` | Requests per window per client. |
| `SECURITY_RATELIMIT_WINDOW_MS` | `60000` | Rate-limit window. |
| `NEXT_PUBLIC_SECURITY_CLIENT` | `true` | Enable the client guard. |
| `NEXT_PUBLIC_SECURITY_DEVTOOLS` | `report` | `off` \| `report` \| `invalidate`. |
| `NEXT_PUBLIC_SECURITY_SANDBOX` | `report` | `off` \| `report` \| `invalidate`. |
| `NEXT_PUBLIC_SECURITY_TAMPER` | `invalidate` | `off` \| `report` \| `invalidate`. |
| `NEXT_PUBLIC_SECURITY_AGGRESSIVE` | `false` | Arm the active `debugger` trap. |
| `NEXT_PUBLIC_SECURITY_DISABLE_IN_DEV` | `true` | Silence client guard in dev. |

### CSP notes

`strict-static` (default) is compatible with static rendering but allows inline
scripts/styles the framework injects. Set `SECURITY_CSP_MODE=nonce` for a strict
nonce CSP — this removes `'unsafe-inline'` but forces dynamic rendering (add
`await connection()` to pages that must render per-request).

## Safety

Every server step fails open (a fault yields a normal response) and every client
detector is fully wrapped (a fault degrades silently). The client guard is off
in development by default to avoid false positives.
