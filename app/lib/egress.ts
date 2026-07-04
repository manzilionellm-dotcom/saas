import Anthropic from "@anthropic-ai/sdk";
import { EGRESS_GATEWAY_CONFIG } from "../../proxy";

/**
 * Enterprise Egress Gateway & Traffic Shaper — application côté serveur.
 *
 * `proxy.ts` (racine) est la source unique de vérité pour la POLITIQUE (les
 * valeurs, pilotées par variables d'environnement). Ce module en est le point
 * d'APPLICATION : c'est ici que le trafic sortant réel vers le fournisseur
 * amont (API Claude) est effectivement
 *   - coupé quand la passerelle est désactivée (circuit breaker global) ;
 *   - limité à N sessions concurrentes (traffic shaping) ;
 *   - forcé à transiter par la passerelle proxy (isolation réseau).
 *
 * La fonction `proxy` de Next s'exécute en périphérie (edge runtime) et ne
 * peut pas router les appels du SDK. L'application doit donc se faire ici, au
 * moment de la construction du client et de chaque appel sortant.
 */

/** Levée lorsque la passerelle refuse un flux sortant (fail-closed). */
export class EgressBlockedError extends Error {
  readonly status = 503;
  constructor(message: string) {
    super(message);
    this.name = "EgressBlockedError";
  }
}

// --- Circuit breaker global ------------------------------------------------

/** Refuse tout flux sortant si la passerelle est globalement désactivée. */
export function assertGatewayActive(): void {
  if (!EGRESS_GATEWAY_CONFIG.gatewayActive) {
    throw new EgressBlockedError(
      "Passerelle de sortie désactivée (EGRESS_GATEWAY_ACTIVE=false) : trafic amont coupé.",
    );
  }
}

// --- Limiteur de sessions concurrentes (traffic shaping) -------------------

/** Sémaphore FIFO : au plus `max` exécutions simultanées. */
class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly max: number) {}

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      // Transfert direct du jeton au prochain en attente (aucun décrément).
      next();
    } else {
      this.active--;
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

const sessionLimiter = new Semaphore(EGRESS_GATEWAY_CONFIG.maxConcurrentSessions);

/**
 * Encadre un appel sortant : vérifie le circuit breaker puis applique la
 * limite de sessions concurrentes vers le fournisseur amont.
 */
export function withEgressSession<T>(fn: () => Promise<T>): Promise<T> {
  assertGatewayActive();
  return sessionLimiter.run(fn);
}

// --- Isolation réseau : dispatcher proxy -----------------------------------

// Le dispatcher est coûteux à construire et l'endpoint est fixé au démarrage :
// on le mémorise (y compris un éventuel échec, pour rester fail-closed stable).
let dispatcherPromise: Promise<unknown> | null = null;

async function buildDispatcher(endpoint: string): Promise<unknown> {
  const separator = endpoint.indexOf("://");
  const scheme = separator > 0 ? endpoint.slice(0, separator).toLowerCase() : "";

  if (scheme === "http" || scheme === "https") {
    const { ProxyAgent } = await import("undici");
    return new ProxyAgent(endpoint);
  }

  if (
    scheme === "socks" ||
    scheme === "socks4" ||
    scheme === "socks4a" ||
    scheme === "socks5" ||
    scheme === "socks5h"
  ) {
    const { socksDispatcher } = await import("fetch-socks");
    const url = new URL(endpoint);
    return socksDispatcher({
      type: scheme.startsWith("socks4") ? 4 : 5,
      host: url.hostname,
      port: Number(url.port) || 1080,
      ...(url.username ? { userId: decodeURIComponent(url.username) } : {}),
      ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    });
  }

  throw new EgressBlockedError(
    `Schéma de proxy non supporté pour l'isolation réseau : "${scheme || endpoint}".`,
  );
}

function getDispatcher(endpoint: string): Promise<unknown> {
  return (dispatcherPromise ??= buildDispatcher(endpoint));
}

/**
 * Fournit un `fetch` qui route chaque requête au travers de la passerelle
 * proxy. Si l'isolation est exigée et que la passerelle est indisponible, la
 * requête échoue (fail-closed) plutôt que de sortir en direct.
 */
function proxiedFetch(endpoint: string): typeof fetch {
  return async (input, init) => {
    let dispatcher: unknown;
    try {
      dispatcher = await getDispatcher(endpoint);
    } catch (err) {
      if (EGRESS_GATEWAY_CONFIG.enforceProxyIsolation) {
        throw new EgressBlockedError(
          `Isolation réseau exigée mais la passerelle proxy est indisponible : ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      return fetch(input, init);
    }
    // `dispatcher` est une extension undici de RequestInit (voir MergedRequestInit).
    return fetch(input, { ...init, dispatcher } as RequestInit);
  };
}

// --- Fabrique de client amont ----------------------------------------------

/**
 * Construit le client Anthropic conforme à la politique de la passerelle :
 * circuit breaker, isolation réseau obligatoire, et fail-closed si l'isolation
 * est exigée sans point de terminaison proxy configuré.
 */
export function createUpstreamClient(): Anthropic {
  assertGatewayActive();
  const { proxyEndpoint, enforceProxyIsolation } = EGRESS_GATEWAY_CONFIG;

  if (!proxyEndpoint) {
    if (enforceProxyIsolation) {
      throw new EgressBlockedError(
        "Isolation réseau exigée (EGRESS_ENFORCE_PROXY_ISOLATION) mais aucun " +
          "EGRESS_PROXY_ENDPOINT n'est configuré : sortie directe refusée.",
      );
    }
    return new Anthropic(); // lit ANTHROPIC_API_KEY
  }

  return new Anthropic({ fetch: proxiedFetch(proxyEndpoint) });
}
