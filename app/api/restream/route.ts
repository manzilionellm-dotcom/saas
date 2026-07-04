import { NextResponse } from "next/server";
import { restreamManager } from "@/lib/restream/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/restream -> current session state (safe to poll for status).
export async function GET() {
  const state = restreamManager.getState();
  return NextResponse.json({ session: state });
}

// POST /api/restream -> create a session from an authorized M3U source.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { sourceUrl, authorized, count } = (body ?? {}) as {
    sourceUrl?: string;
    authorized?: boolean;
    count?: number;
  };

  if (typeof sourceUrl !== "string" || sourceUrl.trim().length === 0) {
    return NextResponse.json({ error: "sourceUrl is required." }, { status: 400 });
  }
  if (authorized !== true) {
    return NextResponse.json(
      { error: "You must confirm authorization to restream this source." },
      { status: 403 },
    );
  }

  const result = await restreamManager.createSession({
    sourceUrl,
    authorized,
    count,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ session: result.state }, { status: 201 });
}

// DELETE /api/restream -> tear down the active session.
export async function DELETE() {
  restreamManager.destroy();
  return NextResponse.json({ session: null });
}
