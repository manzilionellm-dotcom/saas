import { NextResponse } from "next/server";

// CONFIGURATION DE GESTION DE TRAFIC ET DE RÉSILIENCE
const EGRESS_GATEWAY_CONFIG = {
  // Activer ou désactiver complètement le trafic sortant (Circuit Breaker global)
  GATEWAY_ACTIVE: true,

  // Limite stricte de sessions concurrentes simultanées vers le fournisseur amont
  MAX_CONCURRENT_SESSIONS: 1,

  // Routage obligatoire via passerelle proxy pour l'isolation réseau
  ENFORCE_PROXY_ISOLATION: true,

  // Code région pour l'agent de transport sortant
  TARGET_REGION: "CH",

  // Point de terminaison du proxy réseau (HTTP/SOCKS5)
  PROXY_ENDPOINT: "socks5://votre-proxy-prive-ici:port",
} as const;

/**
 * Point d'entrée exigé par Next.js : `proxy.ts` doit exporter une fonction
 * (successeur de `middleware.ts`), exécutée avant le rendu des routes.
 *
 * NOTE : ce fichier est un middleware Next.js — il s'exécute sur le chemin des
 * requêtes ENTRANTES. Il applique donc le circuit breaker global et l'en-tête
 * de région, mais ne peut pas router le trafic SORTANT vers le fournisseur
 * amont. `MAX_CONCURRENT_SESSIONS`, `ENFORCE_PROXY_ISOLATION` et
 * `PROXY_ENDPOINT` sont conservés comme configuration de référence ; leur
 * application effective au flux sortant se ferait côté client HTTP amont.
 */
export function proxy(): NextResponse {
  if (!EGRESS_GATEWAY_CONFIG.GATEWAY_ACTIVE) {
    return NextResponse.json(
      { error: "Service temporairement indisponible : passerelle de sortie désactivée." },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

  const response = NextResponse.next();
  response.headers.set("x-egress-region", EGRESS_GATEWAY_CONFIG.TARGET_REGION);
  return response;
}

export const config = {
  // Exclut les assets statiques et l'optimisation d'images du passage par la passerelle.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
