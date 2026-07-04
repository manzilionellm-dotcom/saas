import { NextResponse } from "next/server";
import { SECURITY_COOKIE } from "@/security/config";

// Receives client anomaly beacons. On an explicit invalidation request it
// clears the integrity cookie so the reloaded page re-bootstraps clean.
// Always answers fast and neutral — it must reveal nothing about the stack.

export const dynamic = "force-dynamic";

interface ReportBody {
  kind?: string;
  detail?: string;
  action?: string;
}

async function readBody(request: Request): Promise<ReportBody> {
  try {
    return (await request.json()) as ReportBody;
  } catch {
    return {};
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await readBody(request);

  const response = new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });

  if (body.action === "invalidate") {
    response.cookies.delete(SECURITY_COOKIE);
  }

  return response;
}
