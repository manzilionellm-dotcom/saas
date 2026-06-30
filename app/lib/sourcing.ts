// Comparateur SilkRoute "mode expert" (démo déterministe).
// Va au-delà du prix : coût d'atterrissage complet (douane, frais d'agent, change,
// assurance), délais réels, fiabilité vendeur, risque de contrefaçon, CO2, et des
// insights qu'un humain n'irait pas calculer (meilleur moment d'achat, MOQ usine,
// conformité UE, seuils douane, marge de revente).
// Demain : remplacer findOffers() par de vraies requêtes (API officielles).

export type SearchMode = "quality" | "cheap";

export type Offer = {
  platform: string;
  kind: "marketplace" | "factory";
  // Décomposition du coût d'atterrissage (€)
  itemPrice: number;
  shipping: number;
  customsDuty: number;
  vat: number;
  agentFee: number;
  paymentFee: number;
  insurance: number;
  total: number;
  // Qualité & confiance
  rating: number;
  reviews: number;
  sellerYears: number;
  verified: boolean;
  euOk: boolean;
  qualityScore: number;
  // Détails experts
  deliveryDays: number;
  refundRate: number; // %
  responseRate: number; // %
  reorderRate: number; // %
  counterfeitRisk: "Faible" | "Moyen" | "Élevé";
  co2Kg: number;
  best?: boolean;
};

export type SearchResult = {
  mode: SearchMode;
  offers: Offer[];
  best: Offer;
  cheaper?: Offer;
  insights: string[];
};

const VAT_RATE = 0.25; // TVA Suède
const DUTY_FREE_THRESHOLD = 150; // € : sous ce seuil, pas de droits de douane UE

const PLATFORMS = [
  { platform: "1688 (usine)", kind: "factory" as const, markup: 1.0, shipBase: 14, rating: 4.6, reviews: 300, years: 9, verified: true, euOk: false },
  { platform: "Taobao", kind: "marketplace" as const, markup: 1.25, shipBase: 12, rating: 4.5, reviews: 1200, years: 8, verified: true, euOk: false },
  { platform: "AliExpress", kind: "marketplace" as const, markup: 1.7, shipBase: 6, rating: 4.4, reviews: 5000, years: 7, verified: true, euOk: true },
  { platform: "DHgate", kind: "marketplace" as const, markup: 1.8, shipBase: 7, rating: 4.1, reviews: 800, years: 6, verified: true, euOk: true },
  { platform: "Temu", kind: "marketplace" as const, markup: 1.5, shipBase: 5, rating: 3.9, reviews: 2000, years: 2, verified: false, euOk: true },
  { platform: "Pinduoduo", kind: "marketplace" as const, markup: 1.15, shipBase: 13, rating: 3.8, reviews: 600, years: 5, verified: false, euOk: false },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function qualityOf(rating: number, reviews: number, years: number, verified: boolean, euOk: boolean): number {
  const score =
    (rating / 5) * 40 +
    Math.min(reviews / 5000, 1) * 25 +
    Math.min(years / 10, 1) * 15 +
    (verified ? 12 : 0) +
    (euOk ? 8 : 0);
  return Math.round(clamp(score, 0, 100));
}

export function findOffers(product: string, mode: SearchMode = "quality"): SearchResult {
  const key = product.trim().toLowerCase() || "produit";
  const factory = 5 + (hash(key) % 41);

  const offers: Offer[] = PLATFORMS.map((p) => {
    const jitter = ((hash(key + p.platform) % 21) - 10) / 100;
    const itemPrice = round2(factory * p.markup * (1 + jitter));
    const shipping = round2(p.shipBase + ((hash(key + p.platform + "s") % 600) / 100));

    const customsDuty = itemPrice + shipping > DUTY_FREE_THRESHOLD ? round2(itemPrice * 0.04) : 0;
    const vat = round2((itemPrice + shipping + customsDuty) * VAT_RATE);
    const agentFee = p.euOk ? 0 : round2(itemPrice * 0.1 + 2); // 1688/Taobao/PDD : agent requis
    const paymentFee = round2(itemPrice * 0.02); // frais de change/carte
    const insurance = round2(itemPrice * 0.01 + 0.5);
    const total = round2(itemPrice + shipping + customsDuty + vat + agentFee + paymentFee + insurance);

    const rating = round2(clamp(p.rating + ((hash(key + p.platform + "r") % 7) - 3) / 10, 3.2, 5));
    const reviews = p.reviews + (hash(key + p.platform + "v") % 900);
    const sellerYears = clamp(p.years + ((hash(key + p.platform + "y") % 5) - 2), 1, 15);

    const deliveryDays = p.euOk ? 8 + (hash(key + p.platform + "d") % 8) : 18 + (hash(key + p.platform + "d") % 14);
    const refundRate = round1(clamp(8 - rating + (hash(key + p.platform + "f") % 10) / 10, 0.4, 7));
    const responseRate = Math.round(clamp(78 + (rating - 3.5) * 20, 70, 99));
    const reorderRate = Math.round(clamp((rating - 3) * 15 + sellerYears, 8, 72));
    const counterfeitRisk: Offer["counterfeitRisk"] = p.verified ? "Faible" : rating >= 4 ? "Moyen" : "Élevé";
    const co2Kg = round1((p.euOk ? 1.0 : 2.2) + (hash(key + p.platform + "c") % 15) / 10);

    return {
      platform: p.platform,
      kind: p.kind,
      itemPrice,
      shipping,
      customsDuty,
      vat,
      agentFee,
      paymentFee,
      insurance,
      total,
      rating,
      reviews,
      sellerYears,
      verified: p.verified,
      euOk: p.euOk,
      qualityScore: qualityOf(rating, reviews, sellerYears, p.verified, p.euOk),
      deliveryDays,
      refundRate,
      responseRate,
      reorderRate,
      counterfeitRisk,
      co2Kg,
    };
  });

  const acceptable = offers.filter((o) => o.verified && o.euOk);
  const pool = acceptable.length > 0 ? acceptable : offers;

  let best: Offer;
  let cheaper: Offer | undefined;
  if (mode === "cheap") {
    best = [...pool].sort((a, b) => a.total - b.total)[0];
  } else {
    best = [...pool].sort((a, b) => b.qualityScore - a.qualityScore)[0];
    const cheapest = [...pool].sort((a, b) => a.total - b.total)[0];
    if (cheapest.platform !== best.platform) cheaper = cheapest;
  }
  best.best = true;

  offers.sort((a, b) => (mode === "cheap" ? a.total - b.total : b.qualityScore - a.qualityScore));

  return { mode, offers, best, cheaper, insights: buildInsights(key, best) };
}

function buildInsights(key: string, best: Offer): string[] {
  const moq = 50 + (hash(key + "moq") % 150);
  const moqDiscount = 15 + (hash(key + "disc") % 20);
  const resalePrice = Math.round(best.total * 1.8);
  const resaleMargin = Math.round(((resalePrice - best.total) / resalePrice) * 100);
  const sales = ["11.11 (Singles' Day)", "6.18", "le Nouvel An chinois", "le Black Friday"];
  const sale = sales[hash(key + "sale") % sales.length];

  return [
    `🗓️ Meilleur moment pour acheter : vise ${sale} → souvent -15 à -30 % sur ce type de produit.`,
    `🏭 Négociation usine : sur 1688, commander en lot (MOQ ≈ ${moq} pièces) peut baisser le prix unitaire d'environ ${moqDiscount} %.`,
    `📜 Conformité UE : exige le marquage CE + une fiche REACH ; pour la Suède, prévois la déclaration douane et la TVA 25 % à l'import.`,
    `💶 Seuil de douane : sous ${DUTY_FREE_THRESHOLD} € de valeur, pas de droits de douane (seulement la TVA). Le meilleur choix ${best.total <= DUTY_FREE_THRESHOLD ? "est sous le seuil ✅" : "dépasse le seuil ⚠️"}.`,
    `💱 Paiement : régler en CNY via un agent évite ~3 % de frais de change cachés.`,
    `📦 Vérifie le poids volumétrique : au-delà, l'aérien coûte plus cher — la voie maritime/consolidée est souvent rentable dès 2-3 articles.`,
    `🛡️ Anti-contrefaçon : privilégie « vérifié » + ancienneté élevée + taux de remboursement bas (ici ${best.refundRate} %).`,
    `📈 Revente éventuelle : à ~${resalePrice} € prix conseillé, marge estimée ≈ ${resaleMargin} %.`,
  ];
}
