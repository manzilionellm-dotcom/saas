import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Protection du panel (/panel et /api/panel/*) par APP_PASSWORD.
// Si APP_PASSWORD est vide : accès libre (usage local mono-utilisateur),
// un avertissement est affiché dans le panel.

export const PANEL_COOKIE = "panel_auth";

export function panelPassword(): string {
  return process.env.APP_PASSWORD ?? "";
}

// Jeton dérivé du mot de passe : invalide automatiquement les sessions
// si le mot de passe change.
export function panelToken(): string {
  return createHash("sha256").update(`streamcast:${panelPassword()}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, panelPassword());
}

export async function isPanelAuthed(): Promise<boolean> {
  if (!panelPassword()) return true; // pas de mot de passe configuré
  const store = await cookies();
  const value = store.get(PANEL_COOKIE)?.value ?? "";
  return value.length > 0 && safeEqual(value, panelToken());
}

export function unauthorized(): Response {
  return Response.json({ error: "Authentification requise." }, { status: 401 });
}
