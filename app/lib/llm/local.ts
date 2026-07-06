import type { LLMProvider, LLMRequest, LLMResponse } from "./provider";
import { approxTokens } from "../cost";
import { dropshipLocalContent } from "../dropship/localReports";

// Provider de repli : fonctionne SANS clé API (déterministe). Permet de faire
// tourner toute l'app et de tester la chaîne avant de brancher Claude.
export class LocalProvider implements LLMProvider {
  readonly name = "local";
  readonly model = "local";

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const locale = req.locale ?? "fr";
    const text = localContent(req, locale);

    const inputTokens = approxTokens((req.system ?? "") + req.prompt);
    const outputTokens = approxTokens(text);

    return {
      text,
      model: this.model,
      provider: this.name,
      inputTokens,
      outputTokens,
      tokensUsed: inputTokens + outputTokens,
      costEstimate: 0,
      latencyMs: Date.now() - start,
    };
  }
}

// Génère un contenu déterministe et plausible selon le type de livrable,
// pour que toute la Content Factory soit testable sans clé API.
function localContent(req: LLMRequest, locale: string): string {
  const kind = req.meta?.kind ?? "post";

  // Produit Dropshipping : rapports d'agents déterministes (démo sans clé).
  if (kind.startsWith("dropship:")) return dropshipLocalContent(req);
  const name = req.meta?.businessName ?? "votre marque";
  const platform = req.meta?.platform ?? "réseaux";
  const tag = `[${locale}·local]`;

  switch (kind) {
    case "hooks":
      return Array.from({ length: 10 }, (_, i) => {
        const angles = [
          `Ce que personne ne te dit sur ${name}`,
          `J'ai testé ${name} pendant 30 jours, voici le résultat`,
          `Arrête de scroller si tu veux ${platform} qui convertit`,
          `3 erreurs qui tuent ta croissance sur ${platform}`,
          `La vérité sur ${name} (à voir avant d'acheter)`,
          `Personne ne fait ça avec ${name}… et c'est dommage`,
          `Le secret de ${name} que les pros gardent pour eux`,
          `Tu fais ça ? Alors ${name} est fait pour toi`,
          `Avant / après avec ${name} : tu vas halluciner`,
          `POV : tu découvres enfin ${name}`,
        ];
        return `${i + 1}. ${angles[i]} ${tag}`;
      }).join("\n");
    case "script":
      return `${tag} Script ${platform} (30-45s) — ${name}\n\n[HOOK 0-3s] ${name}, ce détail change tout.\n[CORPS 3-30s] Montre le problème, puis la solution en 3 points concrets, preuve à l'appui.\n[CTA 30-45s] Lien en bio. Agis maintenant.`;
    case "hashtags":
      return `${tag} #${platform.toLowerCase()} #${name.replace(/\s+/g, "")} #croissance #contenu #viral #astuce #business #marketing #fyp #pourtoi`;
    case "seo_title":
      return [
        `${name} : le guide complet (${new Date().getFullYear()})`,
        `Comment ${name} change la donne`,
        `${name}, est-ce que ça vaut le coup ?`,
        `Le meilleur de ${name} en 5 minutes`,
        `${name} : avis, prix et alternatives`,
      ].map((t, i) => `${i + 1}. ${t} ${tag}`).join("\n");
    case "ad_copy":
      return `${tag} ${name} — la solution que tu cherchais. Simple, rapide, efficace. Rejoins ceux qui ont déjà franchi le pas. 👉 Découvrir maintenant.`;
    default: // post
      return `${tag} ${name}\n\nVoici une vérité simple : la régularité bat le talent. Sur ${platform}, ce qui gagne, c'est de publier, mesurer, ajuster.\n\nEt toi, tu en es où ? Dis-le en commentaire. 👇`;
  }
}
