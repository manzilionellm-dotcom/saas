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

// --- Anti-force-brute (en mémoire, suffisant pour une app mono-poste) --------
// Après plusieurs échecs, on impose un temps d'attente croissant.
const FAIL_THRESHOLD = 5;
const g = globalThis as unknown as { __panelFails?: { count: number; until: number } };
g.__panelFails ??= { count: 0, until: 0 };

// Renvoie le nombre de secondes à attendre (0 si autorisé à tenter).
export function loginCooldownRemaining(): number {
  const now = Date.now();
  return g.__panelFails!.until > now ? Math.ceil((g.__panelFails!.until - now) / 1000) : 0;
}

export function recordLoginFailure(): void {
  const s = g.__panelFails!;
  s.count += 1;
  if (s.count >= FAIL_THRESHOLD) {
    // Palier exponentiel plafonné : 5s, 10s, 20s… jusqu'à 5 min.
    const steps = s.count - FAIL_THRESHOLD;
    const wait = Math.min(5000 * 2 ** steps, 5 * 60 * 1000);
    s.until = Date.now() + wait;
  }
}

export function recordLoginSuccess(): void {
  g.__panelFails = { count: 0, until: 0 };
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
