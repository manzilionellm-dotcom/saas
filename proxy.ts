import { NextResponse } from "next/server";

// CONFIGURATION DE GESTION DE TRAFIC ET DE RÉSILIENCE
export const EGRESS_GATEWAY_CONFIG = {
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
};

// Next.js exige que proxy.ts exporte une fonction (remplaçant de middleware.ts)
export default function proxy() {
  if (!EGRESS_GATEWAY_CONFIG.GATEWAY_ACTIVE) {
    return new NextResponse("Egress gateway disabled", { status: 503 });
  }
  return NextResponse.next();
}
