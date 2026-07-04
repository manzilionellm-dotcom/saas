import { randomBytes } from "node:crypto";

// -----------------------------------------------------------------------------
// Restream relay
//
// This module fans out ONE authorized upstream source (an M3U/M3U8 playlist or a
// direct stream URL, configured via env) into several local relay endpoints so
// that each device in the household can watch through its own URL.
//
// It is a RELAY, not a stream multiplier: every endpoint ultimately reads from
// the same authorized source. It cannot grant more concurrent capacity than the
// source itself authorizes, and it refuses to run without a configured source.
// The source URL must be one the user is authorized to restream — no third-party
// or copyrighted streams are ever fetched implicitly.
// -----------------------------------------------------------------------------

export type EndpointStatus = "starting" | "online" | "offline" | "error";

export type RestreamEndpoint = {
  id: string;
  token: string;
  createdAt: number;
  status: EndpointStatus;
  lastCheckedAt: number | null;
  lastError: string | null;
};

const MIN_ENDPOINTS = 10;
const MAX_ENDPOINTS = 20;
const DEFAULT_COUNT = 12;

type SourceConfig = {
  url: string | null;
  name: string;
  configured: boolean;
};

export function getSource(): SourceConfig {
  const url = process.env.RESTREAM_SOURCE_URL?.trim() || null;
  const name = process.env.RESTREAM_SOURCE_NAME?.trim() || "Source autorisée";
  return { url, name, configured: Boolean(url) };
}

// In-memory registry. Lives for the lifetime of the server process; it is reset
// on restart, which is fine — endpoints are cheap to regenerate on demand.
const endpoints = new Map<string, RestreamEndpoint>();

function log(message: string, extra?: Record<string, unknown>) {
  const suffix = extra ? " " + JSON.stringify(extra) : "";
  console.log(`[restream] ${message}${suffix}`);
}

function clampCount(requested?: number): number {
  if (!requested || Number.isNaN(requested)) return DEFAULT_COUNT;
  return Math.min(MAX_ENDPOINTS, Math.max(MIN_ENDPOINTS, Math.floor(requested)));
}

function newToken(): string {
  return randomBytes(12).toString("hex");
}

function createEndpoint(): RestreamEndpoint {
  const token = newToken();
  return {
    id: token.slice(0, 8),
    token,
    createdAt: Date.now(),
    status: "starting",
    lastCheckedAt: null,
    lastError: null,
  };
}

export function listEndpoints(): RestreamEndpoint[] {
  return [...endpoints.values()].sort((a, b) => a.createdAt - b.createdAt);
}

// (Re)generate a fresh independent set of relay endpoints, replacing any that
// already exist. This is what the "Restream" button triggers.
export function generateEndpoints(requested?: number): RestreamEndpoint[] {
  const count = clampCount(requested);
  endpoints.clear();
  for (let i = 0; i < count; i++) {
    const ep = createEndpoint();
    endpoints.set(ep.token, ep);
  }
  log("generated endpoints", { count, source: getSource().configured });
  return listEndpoints();
}

export function getEndpoint(token: string): RestreamEndpoint | undefined {
  return endpoints.get(token);
}

// Probe the authorized source to decide whether an endpoint can serve. All
// endpoints share the same upstream, so this reflects source reachability.
async function probeSource(signal: AbortSignal): Promise<{ ok: boolean; error?: string }> {
  const { url } = getSource();
  if (!url) return { ok: false, error: "Aucune source autorisée configurée" };
  try {
    // Range 0-0 keeps the probe cheap for both playlists and byte streams.
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal,
    });
    // Cancel the body immediately; we only needed the status line.
    await res.body?.cancel();
    if (res.ok || res.status === 206) return { ok: true };
    return { ok: false, error: `Source HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Source injoignable" };
  }
}

function applyProbe(ep: RestreamEndpoint, ok: boolean, error?: string): void {
  ep.status = ok ? "online" : error?.includes("configurée") ? "offline" : "error";
  ep.lastCheckedAt = Date.now();
  ep.lastError = ok ? null : error ?? "inconnu";
}

async function probeSourceOnce(): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    return await probeSource(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// Probe the source and set every endpoint's status accordingly, without
// regenerating. Used right after generation so badges reflect reality at once.
export async function probeEndpoints(): Promise<RestreamEndpoint[]> {
  if (endpoints.size === 0) return [];
  const probe = await probeSourceOnce();
  for (const ep of listEndpoints()) applyProbe(ep, probe.ok, probe.error);
  log("probed endpoints", { count: endpoints.size, online: probe.ok });
  return listEndpoints();
}

// Health-check every endpoint. Failed endpoints are dropped and replaced so the
// caller always keeps a full, usable set.
export async function refreshEndpoints(): Promise<RestreamEndpoint[]> {
  if (endpoints.size === 0) return generateEndpoints();

  const probe = await probeSourceOnce();

  let replaced = 0;
  for (const ep of listEndpoints()) {
    applyProbe(ep, probe.ok, probe.error);
    // Regenerate endpoints that errored so a stale token never lingers.
    if (ep.status === "error") {
      endpoints.delete(ep.token);
      const fresh = createEndpoint();
      applyProbe(fresh, probe.ok, probe.error);
      endpoints.set(fresh.token, fresh);
      replaced++;
    }
  }
  if (replaced > 0) log("replaced failed endpoints", { replaced });
  log("refreshed endpoints", { count: endpoints.size, online: probe.ok });
  return listEndpoints();
}

// Mark an endpoint's status from the proxy route (serving telemetry).
export function markEndpoint(token: string, status: EndpointStatus, error?: string): void {
  const ep = endpoints.get(token);
  if (!ep) return;
  ep.status = status;
  ep.lastCheckedAt = Date.now();
  ep.lastError = error ?? null;
}

export function buildEndpointUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/api/restream/${token}/stream`;
}
