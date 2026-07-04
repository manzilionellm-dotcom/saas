"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEFAULT_PROFILE, isProfileId, PROFILE_COOKIE } from "./profiles";

// Change le profil actif : le choix est mémorisé dans un cookie httpOnly,
// et c'est le serveur qui recalcule la grille de chaînes au prochain rendu.
export async function switchProfile(formData: FormData) {
  const requested = formData.get("profile");
  const profile = isProfileId(requested) ? requested : DEFAULT_PROFILE;

  const cookieStore = await cookies();
  cookieStore.set(PROFILE_COOKIE, profile, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/");
}
