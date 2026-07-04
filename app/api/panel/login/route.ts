import { cookies } from "next/headers";
import {
  checkPassword,
  panelPassword,
  panelToken,
  PANEL_COOKIE,
  loginCooldownRemaining,
  recordLoginFailure,
  recordLoginSuccess,
} from "../../../lib/panel-auth";

export const dynamic = "force-dynamic";

// POST /api/panel/login { password } -> pose le cookie de session du panel.
export async function POST(request: Request) {
  if (!panelPassword()) {
    return Response.json({ ok: true, note: "Aucun mot de passe configuré." });
  }
  const wait = loginCooldownRemaining();
  if (wait > 0) {
    return Response.json(
      { error: `Trop de tentatives. Réessayez dans ${wait} s.` },
      { status: 429 },
    );
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!checkPassword(String(body.password ?? ""))) {
    recordLoginFailure();
    return Response.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  recordLoginSuccess();
  // Cookie `secure` uniquement si la requête est réellement en HTTPS (derrière
  // Caddy). En accès direct par IP en HTTP (mode démarrage), un cookie secure
  // ne serait jamais renvoyé par le navigateur → connexion impossible.
  const proto =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  const store = await cookies();
  store.set(PANEL_COOKIE, panelToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
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
