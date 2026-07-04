import { CHANNELS, type Category, type Channel } from "./channels";

export type ProfileId = "papa" | "maman";

export type Profile = {
  id: ProfileId;
  label: string;
  emoji: string;
  tagline: string;
  // Chaînes épinglées en tête de liste, dans cet ordre.
  favorites: string[];
  // Chaînes que ce profil ne veut pas voir du tout.
  hidden: string[];
  // Ordre d'affichage des catégories propre au profil.
  categoryOrder: Category[];
};

export const PROFILES: Record<ProfileId, Profile> = {
  papa: {
    id: "papa",
    label: "Papa",
    emoji: "👨",
    tagline: "Sport et info d'abord",
    favorites: ["lequipe", "beinsports", "rmcsport", "bfmtv", "tf1"],
    hidden: ["cherie25", "nrj12", "gulli", "france4"],
    categoryOrder: [
      "Sport",
      "Info",
      "Généraliste",
      "Documentaire",
      "Divertissement",
      "Cinéma & Séries",
      "Musique",
      "Jeunesse",
    ],
  },
  maman: {
    id: "maman",
    label: "Maman",
    emoji: "👩",
    tagline: "Séries, cinéma et découvertes",
    favorites: ["canalplus", "tf1sf", "cherie25", "m6", "arte"],
    hidden: ["beinsports", "rmcsport", "eurosport", "cstar"],
    categoryOrder: [
      "Cinéma & Séries",
      "Généraliste",
      "Divertissement",
      "Documentaire",
      "Info",
      "Musique",
      "Jeunesse",
      "Sport",
    ],
  },
};

export const DEFAULT_PROFILE: ProfileId = "papa";

export const PROFILE_COOKIE = "profile";

export function isProfileId(value: unknown): value is ProfileId {
  return value === "papa" || value === "maman";
}

export type ProfileView = {
  profile: Profile;
  favorites: Channel[];
  // Reste des chaînes visibles, groupées par catégorie dans l'ordre du profil.
  sections: { category: Category; channels: Channel[] }[];
};

// Calcule, côté serveur, la grille de chaînes telle que ce profil la voit :
// favoris en tête, chaînes masquées retirées, catégories dans son ordre à lui.
export function getChannelsForProfile(profileId: ProfileId): ProfileView {
  const profile = PROFILES[profileId];
  const hidden = new Set(profile.hidden);
  const visible = CHANNELS.filter((c) => !hidden.has(c.id));

  const byId = new Map(visible.map((c) => [c.id, c]));
  const favorites = profile.favorites
    .map((id) => byId.get(id))
    .filter((c): c is Channel => c !== undefined);

  const favoriteIds = new Set(favorites.map((c) => c.id));
  const rest = visible.filter((c) => !favoriteIds.has(c.id));

  const sections = profile.categoryOrder
    .map((category) => ({
      category,
      channels: rest
        .filter((c) => c.category === category)
        .sort((a, b) => a.number - b.number),
    }))
    .filter((section) => section.channels.length > 0);

  return { profile, favorites, sections };
}
