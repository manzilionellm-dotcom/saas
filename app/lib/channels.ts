export type Category =
  | "Généraliste"
  | "Info"
  | "Sport"
  | "Cinéma & Séries"
  | "Divertissement"
  | "Documentaire"
  | "Jeunesse"
  | "Musique";

export type Channel = {
  id: string;
  number: number;
  name: string;
  category: Category;
};

// Catalogue commun des chaînes, stocké côté serveur.
// Chaque profil (papa, maman, …) en dérive sa propre vue.
export const CHANNELS: Channel[] = [
  { id: "tf1", number: 1, name: "TF1", category: "Généraliste" },
  { id: "france2", number: 2, name: "France 2", category: "Généraliste" },
  { id: "france3", number: 3, name: "France 3", category: "Généraliste" },
  { id: "canalplus", number: 4, name: "Canal+", category: "Cinéma & Séries" },
  { id: "france5", number: 5, name: "France 5", category: "Documentaire" },
  { id: "m6", number: 6, name: "M6", category: "Généraliste" },
  { id: "arte", number: 7, name: "Arte", category: "Documentaire" },
  { id: "c8", number: 8, name: "C8", category: "Divertissement" },
  { id: "w9", number: 9, name: "W9", category: "Divertissement" },
  { id: "tmc", number: 10, name: "TMC", category: "Divertissement" },
  { id: "tfx", number: 11, name: "TFX", category: "Divertissement" },
  { id: "nrj12", number: 12, name: "NRJ 12", category: "Musique" },
  { id: "lcp", number: 13, name: "LCP", category: "Info" },
  { id: "france4", number: 14, name: "France 4", category: "Jeunesse" },
  { id: "bfmtv", number: 15, name: "BFM TV", category: "Info" },
  { id: "cnews", number: 16, name: "CNews", category: "Info" },
  { id: "cstar", number: 17, name: "CStar", category: "Musique" },
  { id: "gulli", number: 18, name: "Gulli", category: "Jeunesse" },
  { id: "tf1sf", number: 20, name: "TF1 Séries Films", category: "Cinéma & Séries" },
  { id: "lequipe", number: 21, name: "L'Équipe", category: "Sport" },
  { id: "sixter", number: 22, name: "6ter", category: "Divertissement" },
  { id: "rmcstory", number: 23, name: "RMC Story", category: "Documentaire" },
  { id: "rmcdecouverte", number: 24, name: "RMC Découverte", category: "Documentaire" },
  { id: "cherie25", number: 25, name: "Chérie 25", category: "Cinéma & Séries" },
  { id: "lci", number: 26, name: "LCI", category: "Info" },
  { id: "franceinfo", number: 27, name: "Franceinfo", category: "Info" },
  { id: "beinsports", number: 31, name: "beIN Sports 1", category: "Sport" },
  { id: "rmcsport", number: 32, name: "RMC Sport 1", category: "Sport" },
  { id: "eurosport", number: 33, name: "Eurosport 1", category: "Sport" },
];
