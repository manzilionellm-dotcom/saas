import { restreamManager } from "@/lib/restream/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/restream/stream/<id>?t=<token>
// The relay a household device connects to. Every endpoint reads from the ONE
// shared upstream broadcaster — connecting more devices never opens more
// connections to the authorized provider.
export async function GET(
  request: Request,
  ctx: { params: Promise<{ endpointId: string }> },
) {
  const { endpointId } = await ctx.params;
  const token = new URL(request.url).searchParams.get("t") ?? "";

  const auth = restreamManager.authorizeEndpoint(endpointId, token);
  if (!auth.ok) {
    return new Response("Unknown or unauthorized restream endpoint.", {
      status: 404,
    });
  }

  const broadcaster = restreamManager.getBroadcaster();
  if (!broadcaster) {
    return new Response("Restream session is not active.", { status: 503 });
  }

  const stream = broadcaster.subscribe();
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "video/mp2t",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
      "X-Restream-Endpoint": endpointId,
    },
  });
}
