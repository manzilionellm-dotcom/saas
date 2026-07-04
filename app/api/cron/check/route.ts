import { getMonitoring } from "../../../lib/monitor";

// Tâche planifiée : appelée automatiquement toutes les 5 minutes (voir vercel.json).
// Aujourd'hui : calcule l'état de surveillance.
// Demain : ici Versailles persistera le snapshot et lancera ses actions
// (corrections SEO/GEO/AEO) sur les sites connectés.
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = getMonitoring(Date.now());
  // TODO: persister le snapshot + déclencher les actions de Versailles.
  return Response.json({ ok: true, checkedAt: snapshot.checkedAt });
}
