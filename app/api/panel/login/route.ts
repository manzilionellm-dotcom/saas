import { cookies } from "next/headers";
import { checkPassword, panelPassword, panelToken, PANEL_COOKIE } from "../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// POST /api/panel/login { password } -> pose le cookie de session du panel.
export async function POST(request: Request) {
  if (!panelPassword()) {
    return Response.json({ ok: true, note: "Aucun mot de passe configuré." });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!checkPassword(String(body.password ?? ""))) {
    return Response.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  const store = await cookies();
  store.set(PANEL_COOKIE, panelToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });
  return Response.json({ ok: true });
}

// DELETE /api/panel/login -> déconnexion.
export async function DELETE() {
  const store = await cookies();
  store.delete(PANEL_COOKIE);
  return Response.json({ ok: true });
}
