import { cookies } from "next/headers";
import {
  DEFAULT_PROFILE,
  PROFILE_COOKIE,
  getChannelsForProfile,
  isProfileId,
} from "../../lib/profiles";

// GET /api/channels          → chaînes du profil mémorisé en cookie
// GET /api/channels?profile=maman → chaînes d'un profil explicite
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("profile");

  let profileId = isProfileId(requested) ? requested : undefined;
  if (!profileId) {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(PROFILE_COOKIE)?.value;
    profileId = isProfileId(fromCookie) ? fromCookie : DEFAULT_PROFILE;
  }

  const { profile, favorites, sections } = getChannelsForProfile(profileId);

  return Response.json({
    profile: { id: profile.id, label: profile.label, tagline: profile.tagline },
    favorites,
    sections,
  });
}
