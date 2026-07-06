import type { LLMRequest } from "../llm/provider";
import type { Claim } from "./types";

// Contenu déterministe pour le mode « sans clé » (repli local). Permet de faire
// tourner et tester TOUT le pipeline dropshipping sans ANTHROPIC_API_KEY, comme
// le reste du SaaS. Chaque rapport respecte la gouvernance des données : aucune
// donnée fournisseur/pub inventée, tout est ESTIMATE / USER_MUST_VERIFY / UNKNOWN.

function audit(confidence: "high" | "medium" | "low", claims: Claim[]): string {
  return `\n---AUDIT---\n${JSON.stringify({ confidence, claims })}`;
}

const NOTE = "_(Mode local sans clé API : contenu de démonstration. Branche ANTHROPIC_API_KEY pour des rapports réels avec recherche web.)_";

export function dropshipLocalContent(req: LLMRequest): string {
  const key = (req.meta?.kind ?? "").replace(/^dropship:/, "");
  const subject = req.meta?.businessName ?? "le produit décrit";

  switch (key) {
    case "scout":
      return (
        `## Candidats produits plausibles\n\n${NOTE}\n\n` +
        `À partir de « ${subject} », voici des directions plausibles (aucune n'est un « produit gagnant garanti ») :\n\n` +
        `1. **Angle problème-solution** — cible un irritant quotidien précis.\n` +
        `2. **Angle niche passion** — communauté engagée, faible dépendance au prix.\n` +
        `3. **Angle upgrade du quotidien** — version premium d'un objet banal.\n\n` +
        `Prochaine étape : le Market Agent évalue demande, concurrence et saturation UE.` +
        audit("medium", [
          { label: "ESTIMATE", statement: "3 angles produits plausibles identifiés à partir de la description." },
          { label: "USER_MUST_VERIFY", statement: "Demande réelle par angle", whereToVerify: "Google Trends + TikTok Creative Center (rechercher le mot-clé produit)." },
        ])
      );
    case "market":
      return (
        `## Analyse marché UE\n\n${NOTE}\n\n` +
        `- **Demande** : à confirmer sur données réelles (fourchette large sans recherche web).\n` +
        `- **Concurrence** : plusieurs acteurs probables ; niveau de saturation à vérifier.\n` +
        `- **Adéquation UE** : dépend de la conformité (voir étape Lancement).\n\n` +
        `**Opportunité la plus probable selon les données disponibles** : l'angle problème-solution, sous réserve de validation fournisseur.` +
        audit("low", [
          { label: "USER_MUST_VERIFY", statement: "Nombre d'annonceurs actifs", whereToVerify: "Meta Ad Library — filtrer par mot-clé et pays UE." },
          { label: "USER_MUST_VERIFY", statement: "Tendance de recherche 12 mois", whereToVerify: "Google Trends — région UE." },
          { label: "ESTIMATE", statement: "Saturation modérée à confirmer." },
        ])
      );
    case "product_research":
      return (
        `## Fiche produit\n\n${NOTE}\n\n` +
        `- **Proposition de valeur** : résout un irritant précis, bénéfice démontrable.\n` +
        `- **Différenciation** : bundle + expérience de marque.\n` +
        `- **Objections** : prix, délai de livraison, preuve sociale.\n\n` +
        `### Données AutoDS à saisir manuellement (obligatoire avant de continuer)\n` +
        `Nom, URL, fournisseur, coût produit, coût livraison, délai, entrepôt, note fournisseur, ` +
        `volume, nb d'avis, score avis, réclamations, stabilité stock, historique prix, variantes, ` +
        `documents de conformité, indicateurs de retour. **Le système ne peut pas inventer ces valeurs.**` +
        audit("medium", [
          { label: "UNKNOWN", statement: "Toutes les données fournisseur AutoDS — à fournir par l'utilisateur." },
        ])
      );
    case "supplier":
      return (
        `## Évaluation fournisseur\n\n${NOTE}\n\n` +
        `Le verdict PASS/FAIL/NEEDS_MORE_DATA est calculé côté serveur contre des seuils explicites ` +
        `(note ≥ 3,8 · score avis ≥ 4,0 · délai ≤ 25 j · stock stable). Voir les raisons du verdict ci-dessus.\n\n` +
        `Points de vigilance : réclamations récurrentes, stabilité du stock, cohérence des avis.` +
        audit("medium", [
          { label: "VERIFIED", statement: "Verdict calculé déterministiquement à partir des données saisies.", source: "supplier.ts (seuils serveur)." },
        ])
      );
    case "investment_committee":
      return (
        `## Comité d'investissement (Risk Auditor intégré)\n\n${NOTE}\n\n` +
        `**Avocat du diable** : risques principaux = saturation possible, dépendance fournisseur, ` +
        `délais de livraison, conformité UE non validée.\n\n` +
        `Sous réserve que le verdict fournisseur soit PASS et la conformité traitée à l'étape Lancement :\n\n` +
        `DÉCISION : GO\n\n` +
        `Justification : les données saisies passent les seuils fournisseur ; l'opportunité est la plus ` +
        `probable selon les données disponibles. Aucune promesse de rentabilité.` +
        audit("medium", [
          { label: "ESTIMATE", statement: "Décision GO conditionnée à la conformité et aux vraies données de test." },
          { label: "USER_MUST_VERIFY", statement: "Concurrence publicitaire réelle", whereToVerify: "Meta / TikTok Ads Library." },
        ])
      );
    case "brand":
      return (
        `## Identité de marque\n\n${NOTE}\n\n` +
        `- **Nom** : à choisir (3 pistes proposées).\n- **Positionnement** : clair, sobre, orienté bénéfice.\n` +
        `- **Palette** : neutre + 1 couleur d'accent.\n- **Ton** : direct, honnête, sans hype.\n` +
        `- **Histoire** : origine du produit et promesse de service (jamais de résultat garanti).` +
        audit("high", [{ label: "ESTIMATE", statement: "Identité de marque cohérente proposée (créatif, non factuel)." }])
      );
    case "shopify_builder":
      return (
        `## Architecture boutique Shopify\n\n${NOTE}\n\n` +
        `Accueil → Collections → Page produit → FAQ → Politiques (retour, confidentialité, CGV).\n` +
        `Navigation simple, page produit avec preuve sociale, garanties et FAQ intégrée.` +
        audit("high", [{ label: "ESTIMATE", statement: "Arborescence boutique standard proposée." }])
      );
    case "copywriting":
      return (
        `## Copy boutique\n\n${NOTE}\n\n` +
        `- **Accueil** : accroche bénéfice + réassurance.\n- **Page produit** : problème → solution → preuve → CTA.\n` +
        `- **FAQ** : livraison, retours, conformité.\n- **Emails** : bienvenue, panier abandonné, post-achat.\n` +
        `- **Upsell/Cross-sell** : bundle complémentaire. Aucune promesse de résultat.` +
        audit("high", [{ label: "ESTIMATE", statement: "Copy complet rédigé (créatif)." }])
      );
    case "creative_director":
      return (
        `## Direction créative\n\n${NOTE}\n\n` +
        `- **Hooks Meta/TikTok** : 5 angles (problème, avant/après, témoignage, démo, objection).\n` +
        `- **Scripts UGC** : structure hook → démonstration → CTA.\n- **Briefs créateurs** : consignes de tournage.` +
        audit("medium", [
          { label: "ESTIMATE", statement: "Angles créatifs proposés (idées, non données de performance)." },
          { label: "USER_MUST_VERIFY", statement: "Créatives concurrentes qui tournent", whereToVerify: "TikTok Ads Library / Meta Ad Library." },
        ])
      );
    case "performance_marketing":
      return (
        `## Plan performance\n\n${NOTE}\n\n` +
        `- **Structure** : campagne de test → ABO/CBO, 1 produit par ad set.\n` +
        `- **Règles de test** : budget fixe par créative, fenêtre d'apprentissage définie.\n` +
        `- **Scale/Kill** : scaler si CPA ≤ CPA max ET ROAS ≥ 1,2× break-even ; killer sous break-even.\n\n` +
        `### Bloc de règles\n\`\`\`\nkill: roas < breakEvenROAS\nscale: cpa <= maxCPA && roas >= 1.2*breakEvenROAS\n\`\`\`` +
        audit("medium", [
          { label: "ESTIMATE", statement: "Logique de règles CPA/ROAS (seuils issus du modèle financier serveur)." },
          { label: "USER_MUST_VERIFY", statement: "CPA/ROAS réels", whereToVerify: "Ads Manager après lancement." },
        ])
      );
    case "automation":
      return (
        `## Automatisation\n\n${NOTE}\n\n` +
        `- **AutoDS** : connecter le fournisseur, régler le markup, activer l'exécution automatique des commandes.\n` +
        `- **Shopify** : configurer paiements, livraison, taxes UE, pages de politiques.\n` +
        `- **Email** : flux bienvenue / panier abandonné / post-achat. Actions exécutées par l'utilisateur.` +
        audit("high", [{ label: "ESTIMATE", statement: "Checklists de configuration standard." }])
      );
    case "compliance":
      return (
        `## Conformité UE\n\n${NOTE}\n\n` +
        `⚠️ **Ceci n'est pas un avis juridique. Fais valider chaque point par un professionnel.**\n\n` +
        `- TVA/OSS · GPSR · marquage CE · réglementation batteries · WEEE/DEEE · GDPR · droit de rétractation · personne responsable UE.\n` +
        `Chaque point est à marquer n/a / à vérifier / vérifié dans la checklist, puis à faire confirmer par un pro.` +
        audit("low", [
          { label: "USER_MUST_VERIFY", statement: "Obligations exactes selon la catégorie produit", whereToVerify: "Professionnel / autorité compétente UE." },
          { label: "UNKNOWN", statement: "Statut de conformité réel du produit — à valider." },
        ])
      );
    case "qa":
      return (
        `## Audit QA\n\n${NOTE}\n\n` +
        `- Contradictions entre rapports : aucune bloquante détectée en mode démo.\n` +
        `- Données manquantes : chiffres de performance réels (normal avant lancement).\n` +
        `### Actions restantes à la charge de l'utilisateur\n` +
        `Saisir les vraies données AutoDS, faire valider la conformité, connecter les comptes, lancer les tests.` +
        audit("medium", [
          { label: "ESTIMATE", statement: "Aucune contradiction bloquante en l'état." },
          { label: "UNKNOWN", statement: "Performance réelle — inconnue avant lancement." },
        ])
      );
    case "launch":
      return (
        `## Roadmap de lancement 30 jours\n\n${NOTE}\n\n` +
        `- **J1-7** : boutique finalisée, conformité validée, comptes connectés.\n` +
        `- **J8-15** : premières créatives, campagnes de test.\n` +
        `- **J16-23** : lecture des vraies données, itérations (kill/scale selon règles).\n` +
        `- **J24-30** : décision de scaling ou d'arrêt sur données réelles.\n\n` +
        `### Checklist quotidienne\nVérifier CPA/ROAS réels, stock, service client, conformité. Aucune promesse de résultat.` +
        audit("medium", [{ label: "USER_MUST_VERIFY", statement: "Progression réelle", whereToVerify: "Ads Manager + Shopify Analytics au quotidien." }])
      );
    default:
      return `## Rapport\n\n${NOTE}\n\nContenu de démonstration.` + audit("low", [{ label: "UNKNOWN", statement: "Rôle non reconnu." }]);
  }
}
