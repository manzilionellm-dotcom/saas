import {
  buildEndpointUrl,
  generateEndpoints,
  getSource,
  listEndpoints,
  probeEndpoints,
  refreshEndpoints,
  type RestreamEndpoint,
} from "../../lib/restream";

function originFrom(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function serialize(request: Request, endpoints: RestreamEndpoint[]) {
  const origin = originFrom(request);
  const source = getSource();
  return {
    source: { name: source.name, configured: source.configured },
    endpoints: endpoints.map((ep) => ({
      id: ep.id,
      url: buildEndpointUrl(origin, ep.token),
      status: ep.status,
      lastError: ep.lastError,
      lastCheckedAt: ep.lastCheckedAt,
    })),
  };
}

// GET /api/restream — current relay endpoints and their status.
export async function GET(request: Request) {
  return Response.json(serialize(request, listEndpoints()));
}

// POST /api/restream — { action: "generate" | "refresh", count?: number }
// "generate" builds a fresh independent set (the Restream button).
// "refresh" health-checks and regenerates any failed endpoints.
export async function POST(request: Request) {
  let action = "generate";
  let count: number | undefined;
  try {
    const body = await request.json();
    if (typeof body?.action === "string") action = body.action;
    if (typeof body?.count === "number") count = body.count;
  } catch {
    // No/invalid body → default action.
  }

  let endpoints: RestreamEndpoint[];
  if (action === "refresh") {
    endpoints = await refreshEndpoints();
  } else {
    generateEndpoints(count);
    // Probe once so the returned statuses are accurate immediately.
    endpoints = await probeEndpoints();
  }
  return Response.json(serialize(request, endpoints));
}
