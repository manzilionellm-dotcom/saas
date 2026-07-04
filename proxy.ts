import { NextResponse } from "next/server";

/**
 * Enterprise Egress Gateway — gestion de trafic et résilience.
 *
 * Chaque valeur est pilotée par une variable d'environnement afin de pouvoir
 * ajuster le comportement par environnement (preview, production) sans
 * modifier le code :
 *
 * - `EGRESS_GATEWAY_ACTIVE`            : "false" pour couper tout le trafic sortant (circuit breaker global)
 * - `EGRESS_MAX_CONCURRENT_SESSIONS`   : limite de sessions concurrentes vers le fournisseur amont
 * - `EGRESS_ENFORCE_PROXY_ISOLATION`   : "false" pour désactiver le routage obligatoire via la passerelle
 * - `EGRESS_TARGET_REGION`             : code région de l'agent de transport sortant
 * - `EGRESS_PROXY_ENDPOINT`            : point de terminaison du proxy réseau (http:// ou socks5://)
 */
export const EGRESS_GATEWAY_CONFIG = {
  gatewayActive: process.env.EGRESS_GATEWAY_ACTIVE !== "false",
  maxConcurrentSessions: parsePositiveInt(
    process.env.EGRESS_MAX_CONCURRENT_SESSIONS,
    1,
  ),
  enforceProxyIsolation: process.env.EGRESS_ENFORCE_PROXY_ISOLATION !== "false",
  targetRegion: process.env.EGRESS_TARGET_REGION ?? "CH",
  proxyEndpoint: process.env.EGRESS_PROXY_ENDPOINT ?? "",
} as const;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Point d'entrée exigé par Next.js : `proxy.ts` doit exporter une fonction
 * (successeur de `middleware.ts`), exécutée avant le rendu des routes.
 */
export function proxy(): NextResponse {
  if (!EGRESS_GATEWAY_CONFIG.gatewayActive) {
    return NextResponse.json(
      { error: "Service temporairement indisponible : passerelle de sortie désactivée." },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

  const response = NextResponse.next();
  response.headers.set("x-egress-region", EGRESS_GATEWAY_CONFIG.targetRegion);
  return response;
}

export const config = {
  // Exclut les assets statiques et l'optimisation d'images du passage par la passerelle.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
