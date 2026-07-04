import { NextResponse } from "next/server";
import { restreamManager } from "@/lib/restream/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/restream/refresh -> generate a new set of independent endpoints
// from the same authorized source (no new upstream connection).
export async function POST() {
  const result = await restreamManager.refresh();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ session: result.state });
}
