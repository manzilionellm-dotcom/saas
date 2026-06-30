// "Réunion d'équipe IA" : un conseiller par catégorie commente la question posée.
//
// Génération locale (sans clé API) : chaque conseiller a des angles métier et on
// en choisit un de façon déterministe selon la question, pour que la réponse varie
// d'une question à l'autre. Pour brancher la vraie IA Claude plus tard, voir
// app/api/meeting/route.ts (il suffit d'y appeler l'API avec une clé).

export type AdvisorComment = {
  category: string;
  role: string;
  icon: string;
  comment: string;
};

type AdvisorDef = {
  category: string;
  role: string;
  icon: string;
  angles: string[];
};

const ADVISORS: AdvisorDef[] = [
  {
    category: "Intelligence",
    role: "Stratégie & IA",
    icon: "🧠",
    angles: [
      "avant d'agir, je lancerais une veille automatisée 48h pour décider sur des données, pas au feeling.",
      "il y a probablement une fenêtre à saisir avant les concurrents — cadrons vite et testons petit.",
      "je confierais la première analyse à un agent IA pour cartographier le terrain en une nuit.",
    ],
  },
  {
    category: "Ventes",
    role: "Directeur Commercial",
    icon: "📈",
    angles: [
      "ma question : qui paie, et combien ? Validons la demande avec 10 prospects avant d'investir.",
      "je structurerais un pipeline simple et je viserais 3 premiers clients payants ce mois-ci.",
      "attention au cycle de vente : si c'est long, il faut une offre d'entrée pour amorcer.",
    ],
  },
  {
    category: "Marketing",
    role: "Responsable Marketing",
    icon: "🎯",
    angles: [
      "je testerais 2-3 messages sur une petite audience avant de dépenser le moindre euro en pub.",
      "le positionnement doit tenir en une phrase — sinon l'acquisition coûtera trop cher.",
      "misons sur un canal unique au début (là où sont vos clients) plutôt que d'être partout.",
    ],
  },
  {
    category: "Finance",
    role: "Directeur Financier",
    icon: "💳",
    angles: [
      "je regarde la marge et le coût d'acquisition avant tout : est-ce rentable à l'échelle ?",
      "fixons un budget plafond et un seuil de rentabilité clair avant de lancer.",
      "prudence sur la trésorerie : étalons les coûts et encaissons d'avance si possible.",
    ],
  },
  {
    category: "Support",
    role: "Responsable Support",
    icon: "🎧",
    angles: [
      "pensons à la rétention dès le départ : un client gardé coûte moins cher qu'un nouveau.",
      "anticipons les questions fréquentes avec une FAQ et un chat, sinon le support explosera.",
      "la promesse doit être tenable au quotidien, sinon les remboursements suivront.",
    ],
  },
  {
    category: "Productivité",
    role: "Chef de Projet",
    icon: "🗂️",
    angles: [
      "découpons ça en un MVP livrable en 2 semaines, le reste viendra ensuite.",
      "définissons qui fait quoi et une seule priorité par semaine pour ne pas s'éparpiller.",
      "fixons une date de lancement ferme : la contrainte de temps clarifie le périmètre.",
    ],
  },
  {
    category: "Développement",
    role: "CTO",
    icon: "🚀",
    angles: [
      "techniquement c'est faisable ; partons sur une stack simple qu'on maîtrise pour aller vite.",
      "attention à la dette technique : un prototype jetable d'abord, le code propre ensuite.",
      "automatisons le déploiement dès le début pour itérer sans douleur.",
    ],
  },
  {
    category: "Sécurité",
    role: "RSSI",
    icon: "🔐",
    angles: [
      "quelles données sensibles ça touche ? Chiffrement et accès limités dès la conception.",
      "vérifions la conformité (RGPD, droits) avant le lancement, pas après.",
      "prévoyons des sauvegardes et un plan en cas d'incident — ça rassure aussi les clients.",
    ],
  },
  {
    category: "E-commerce",
    role: "Responsable E-commerce",
    icon: "📦",
    angles: [
      "soignons le tunnel d'achat : chaque étape en trop fait chuter la conversion.",
      "anticipons logistique et stocks pour ne pas promettre ce qu'on ne peut pas livrer.",
      "testons le prix : une page d'offre claire vaut mieux qu'un catalogue confus.",
    ],
  },
  {
    category: "RH",
    role: "DRH",
    icon: "🧑‍💼",
    angles: [
      "a-t-on les compétences en interne, ou faut-il recruter / sous-traiter ?",
      "clarifions les rôles avant de grossir, sinon la coordination deviendra le goulot.",
      "documentons les process tôt pour pouvoir déléguer sans tout réexpliquer.",
    ],
  },
  {
    category: "Analytique",
    role: "Data Analyst",
    icon: "📊",
    angles: [
      "quel est l'indicateur n°1 de succès ? Mesurons-le dès le jour 1.",
      "mettons un suivi simple en place : sans données, on pilotera à l'aveugle.",
      "définissons un objectif chiffré à 30 jours pour savoir si on continue ou on pivote.",
    ],
  },
  {
    category: "Design",
    role: "Directeur Artistique",
    icon: "🎨",
    angles: [
      "première impression = tout : une interface claire inspire confiance immédiatement.",
      "restons simples et cohérents visuellement ; le superflu peut attendre.",
      "soignons le parcours utilisateur, pas seulement le « joli » — c'est l'usage qui compte.",
    ],
  },
  {
    category: "Conformité",
    role: "Responsable Conformité",
    icon: "✅",
    angles: [
      "vérifions le cadre légal et les autorisations nécessaires avant de lancer quoi que ce soit.",
      "documentons tout : en cas de contrôle, c'est la traçabilité qui protège.",
      "identifions les risques réglementaires tôt — c'est moins cher que de corriger après.",
    ],
  },
  {
    category: "Vidéo",
    role: "Responsable Contenu Vidéo",
    icon: "🎬",
    angles: [
      "déclinons un seul contenu en plusieurs formats pour maximiser la portée sans surcoût.",
      "le format court attire, le format long fidélise : prévoyons les deux.",
      "sous-titres et versions multilingues élargissent l'audience à moindre effort.",
    ],
  },
];

// Hash déterministe simple (pas de Math.random, qui n'est pas dispo ici).
function pickIndex(seed: string, length: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return length > 0 ? h % length : 0;
}

// Produit un commentaire par conseiller pour la question donnée.
export function runMeeting(question: string): AdvisorComment[] {
  const q = question.trim();
  return ADVISORS.map((a) => {
    const angle = a.angles[pickIndex(q + a.category, a.angles.length)];
    return { category: a.category, role: a.role, icon: a.icon, comment: angle };
  });
}

// Petite synthèse de clôture (le facilitateur).
export function meetingSummary(question: string): string {
  const q = question.trim();
  const seed = pickIndex(q, 3);
  const closers = [
    "Consensus : on cadre un MVP, on valide la demande avec quelques clients, et on mesure un indicateur clé avant d'investir.",
    "À retenir : tester petit et vite, vérifier la rentabilité et le cadre légal, puis accélérer si les chiffres suivent.",
    "Décision proposée : lancer une version minimale sous 2 semaines, suivre les données, et itérer selon les retours.",
  ];
  return closers[seed];
}
