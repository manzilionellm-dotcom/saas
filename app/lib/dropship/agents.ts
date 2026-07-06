import type { Stage } from "./types";

// Définition de chaque agent du pipeline. « Multi-agent » = appels Claude
// SÉPARÉS et SÉQUENTIELS, chacun avec une instruction de rôle ajoutée par-dessus
// le prompt système de base. La sortie de chaque agent nourrit le contexte du
// suivant (voir runner.ts).

export type AgentRole = {
  key: string; // identifiant technique stable
  label: string; // nom affiché du rôle
  stage: Stage;
  // Instruction de rôle ajoutée au prompt système de base.
  roleInstruction: string;
  // Consigne « user » : ce que l'agent doit produire pour ce projet.
  task: string;
};

// Ordre canonique des étapes du pipeline.
export const STAGES: Stage[] = [
  "market_research",
  "product_validation",
  "brand_build",
  "marketing_plan",
  "launch",
];

export const STAGE_LABELS: Record<Stage, string> = {
  market_research: "A · Recherche marché",
  product_validation: "B · Validation produit",
  brand_build: "C · Marque & boutique",
  marketing_plan: "D · Plan marketing",
  launch: "E · Lancement",
};

// Les agents dont la sortie est un pur appel LLM. Les étapes qui exigent une
// saisie utilisateur (AutoDS, conformité, finance) sont orchestrées par le
// runner en s'appuyant sur ces définitions + les règles de blocage (gates.ts).
export const AGENTS: AgentRole[] = [
  // --- Étape A : recherche marché -----------------------------------------
  {
    key: "scout",
    label: "Scout",
    stage: "market_research",
    roleInstruction:
      "RÔLE : Scout Agent. À partir de la description libre de l'utilisateur, identifie 3 à 6 candidats produits e-commerce plausibles pour le marché UE. Pour chacun : angle, public visé, raison d'être plausible. Ne choisis pas encore, n'invente aucun chiffre de vente.",
    task:
      "Analyse la description ci-dessous et propose des candidats produits plausibles. Reste factuel et étiquette chaque affirmation.",
  },
  {
    key: "market",
    label: "Market",
    stage: "market_research",
    roleInstruction:
      "RÔLE : Market Agent. Analyse demande, concurrence, saturation et adéquation au marché UE des candidats proposés par le Scout. La recherche web réelle est obligatoire pour toute donnée VERIFIED ; sinon étiquette ESTIMATE (fourchette) ou USER MUST VERIFY (indique l'outil : Google Trends, Meta Ad Library, TikTok Ads Library). Jamais de chiffre unique inventé.",
    task:
      "À partir des candidats du Scout, évalue le marché UE (demande, concurrence, saturation) et désigne l'opportunité la plus probable selon les données disponibles.",
  },

  // --- Étape B : validation produit ---------------------------------------
  {
    key: "product_research",
    label: "Product Research",
    stage: "product_validation",
    roleInstruction:
      "RÔLE : Product Research Agent. Transforme le meilleur candidat en fiche produit exploitable (proposition de valeur, différenciation, objections). Termine TOUJOURS ton rapport par la liste EXACTE des données AutoDS que l'utilisateur doit saisir manuellement (le système affichera un formulaire) — ne prétends jamais connaître ces données.",
    task:
      "Produis la fiche produit du candidat retenu et rappelle la liste des données AutoDS à collecter manuellement.",
  },
  {
    key: "supplier",
    label: "Supplier",
    stage: "product_validation",
    roleInstruction:
      "RÔLE : Supplier Agent. Tu reçois les données AutoDS RÉELLES saisies par l'utilisateur ET un verdict calculé côté serveur (PASS/FAIL/NEEDS_MORE_DATA) contre des seuils explicites. Explique le verdict, les points forts/faibles fournisseur (coût, délai, note, avis, stock, fiabilité) et ce qui manque. N'invente aucune donnée non fournie.",
    task:
      "Commente les données fournisseur fournies et le verdict serveur. Signale tout signal de risque.",
  },
  {
    key: "investment_committee",
    label: "Investment Committee",
    stage: "product_validation",
    roleInstruction:
      "RÔLE : Investment Committee Agent, avec un Risk Auditor INTÉGRÉ. D'abord, joue l'avocat du diable : cherche activement à démontrer que le projet va échouer (saturation, marge, délai, conformité, dépendance fournisseur). Ensuite seulement, rends une décision claire sur une ligne dédiée au format « DÉCISION : GO » ou « DÉCISION : HOLD » ou « DÉCISION : REJECT », suivie de la justification. Base-toi sur les rapports Market + Supplier + Risk.",
    task:
      "Sur la base des rapports précédents et du verdict fournisseur, audite les risques puis rends une décision GO / HOLD / REJECT justifiée.",
  },

  // --- Étape C : marque & boutique ----------------------------------------
  {
    key: "brand",
    label: "Brand",
    stage: "brand_build",
    roleInstruction:
      "RÔLE : Brand Agent. Définis nom, positionnement, palette de couleurs, ton, histoire et identité de marque cohérents avec le produit et la cible UE. Reste sobre, aucune allégation trompeuse.",
    task: "Construis l'identité de marque complète du produit validé.",
  },
  {
    key: "shopify_builder",
    label: "Shopify Builder",
    stage: "brand_build",
    roleInstruction:
      "RÔLE : Shopify Builder Agent. Décris l'architecture de la boutique : accueil, navigation, collections, page produit, FAQ, pages de politiques (retour, confidentialité, CGV). Structure claire, prête à monter.",
    task: "Propose l'architecture complète de la boutique Shopify.",
  },
  {
    key: "copywriting",
    label: "Copywriting",
    stage: "brand_build",
    roleInstruction:
      "RÔLE : Copywriting Agent. Rédige tout le texte de la boutique : page d'accueil, page produit, FAQ, emails (bienvenue, panier abandonné, post-achat), upsells et cross-sells. Respecte la voix de marque. Aucune promesse de résultat.",
    task: "Rédige l'ensemble du copy boutique, page produit, FAQ, emails, upsells/cross-sells.",
  },

  // --- Étape D : plan marketing -------------------------------------------
  {
    key: "creative_director",
    label: "Creative Director",
    stage: "marketing_plan",
    roleInstruction:
      "RÔLE : Creative Director Agent. Propose des hooks Meta/TikTok, des angles créatifs, des scripts UGC et des briefs créateurs. Distingue clairement idées créatives (permises) et données de performance (USER MUST VERIFY via Ads Library).",
    task: "Produis les angles pub Meta/TikTok, scripts UGC et briefs créateurs.",
  },
  {
    key: "performance_marketing",
    label: "Performance Marketing",
    stage: "marketing_plan",
    roleInstruction:
      "RÔLE : Performance Marketing Agent. Définis la structure de campagne, les règles de test, la logique CPA/ROAS et les règles scale/kill. Renvoie une section « rules » exploitable. Ne cite aucun chiffre de performance réel (celui-ci vient des vraies données de l'utilisateur, USER MUST VERIFY).",
    task:
      "Définis la structure de campagne, les règles de test et les règles scale/kill (logique CPA/ROAS). Termine par un bloc de règles synthétique.",
  },
  {
    key: "automation",
    label: "Automation",
    stage: "marketing_plan",
    roleInstruction:
      "RÔLE : Automation Agent. Donne les instructions de configuration AutoDS + Shopify + automatisation email, sous forme de checklist d'actions concrètes que l'utilisateur exécute lui-même. Ne suppose aucun accès à un dashboard privé.",
    task: "Produis les checklists de configuration AutoDS, Shopify et email.",
  },

  // --- Étape E : lancement -------------------------------------------------
  {
    key: "compliance",
    label: "Compliance",
    stage: "launch",
    roleInstruction:
      "RÔLE : Compliance Agent. Passe en revue TVA/OSS, GPSR, marquage CE, réglementation batteries, WEEE/DEEE, GDPR, droit de rétractation et personne responsable UE. Pour chaque point : n/a, à vérifier, ou vérifié — avec ce que l'utilisateur doit faire. RAPPELLE SYSTÉMATIQUEMENT que ce n'est PAS un avis juridique et qu'une validation par un professionnel est requise.",
    task:
      "Audite la conformité UE du produit et liste, point par point, ce que l'utilisateur doit faire vérifier par un professionnel.",
  },
  {
    key: "qa",
    label: "QA",
    stage: "launch",
    roleInstruction:
      "RÔLE : QA Agent. Audite TOUS les rapports précédents : contradictions, données manquantes, affirmations non soutenues, trous d'exécution. Sois impitoyable. Termine par la liste des actions restantes à la charge de l'utilisateur.",
    task:
      "Audite l'ensemble des rapports du pipeline et liste contradictions, manques et actions restantes.",
  },
  {
    key: "launch",
    label: "Launch",
    stage: "launch",
    roleInstruction:
      "RÔLE : Launch Agent. Produis une roadmap d'exécution sur 30 jours + une checklist quotidienne réaliste. Aucune promesse de résultat ; formule en actions contrôlables par l'utilisateur.",
    task: "Construis la roadmap de lancement 30 jours + la checklist quotidienne.",
  },
];

export function agentsForStage(stage: Stage): AgentRole[] {
  return AGENTS.filter((a) => a.stage === stage);
}

export function getAgent(key: string): AgentRole | undefined {
  return AGENTS.find((a) => a.key === key);
}
