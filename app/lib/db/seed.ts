import { repo } from "./repo";
import { KINDS } from "../prompts";

// Exigence évolutive n°9 : l'app n'est jamais vide au premier lancement.
// Crée des business de démo + les versions de prompts une seule fois (idempotent).
export async function ensureSeed(): Promise<void> {
  // Toujours s'assurer que les versions de prompts existent (Phase 8).
  await repo.seedPromptVersions([
    ...KINDS.map((k) => ({ kind: k.key, version: "v1", body: `Template ${k.label} — v1 (par défaut).`, isDefault: true, status: "active" as const })),
    { kind: "hooks", version: "v2", body: "Template hooks — v2 (variante en test : accroches plus provocantes).", isDefault: false, status: "testing" as const },
  ]);

  if (await repo.isSeeded()) return;

  await repo.createBusiness({
    name: "7 MOTION",
    businessType: "Agence de contenu vidéo",
    country: "France",
    locale: "fr",
    additionalLocales: ["ar"],
    targetCustomer: "Créateurs et PME qui veulent percer sur les réseaux",
    budget: "500 €/mois",
    mainGoal: "Générer des leads via TikTok et Reels",
    brandVoice:
      "Ton énergique, direct, orienté résultats. Phrases courtes. Pas de jargon. On parle preuve et action.",
    notes: "Business de démo (seed).",
  });

  await repo.createBusiness({
    name: "Maison Noir",
    businessType: "Marque premium (accessoires)",
    country: "France",
    locale: "fr",
    additionalLocales: ["ar", "sv"],
    targetCustomer: "Clientèle haut de gamme, exigeante, qui valorise la rareté",
    budget: "1 000 €/mois",
    mainGoal: "Notoriété premium et désir de marque",
    brandVoice:
      "Luxe minimaliste. Matte black, or #CCB089. Tagline « Not For Everyone ». Vouvoiement, phrases sobres, jamais de promo agressive.",
    notes: "Business de démo (seed).",
  });

  await repo.markSeeded();
}
