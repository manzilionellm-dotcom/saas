import { getMonitoring } from "../../lib/monitor";

// GET /api/monitor → état de surveillance actuel (recalculé à chaque appel).
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getMonitoring(Date.now()));
}
