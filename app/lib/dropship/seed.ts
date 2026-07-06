import { dropshipRepo } from "./repo";

// Idempotent : crée un projet de démo au premier lancement (parité avec le seed
// du produit Viral AI OS). L'app n'est jamais vide.
export async function ensureDropshipSeed(): Promise<void> {
  if (await dropshipRepo.isSeeded()) return;

  const project = await dropshipRepo.createProject({
    userId: "local",
    name: "Projet démo — lampe de bureau ergonomique",
    status: "market_research",
  });

  await dropshipRepo.createCandidate({
    projectId: project.id,
    rawDescription:
      "Je veux vendre un accessoire de bureau utile et différenciant pour le télétravail en France/UE. " +
      "Budget pub modéré, cible 25-45 ans, sensibilité au design et à la qualité.",
    investmentCommitteeDecision: null,
    decisionRationale: "",
  });

  await dropshipRepo.markSeeded();
}
