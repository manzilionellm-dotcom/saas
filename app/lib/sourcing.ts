// Comparateur de prix & qualité SilkRoute (démo déterministe).
// Vise la perfection : mieux notés, acceptés en Europe, vrais avis, vendeurs
// établis, originaux vérifiés (anti-contrefaçon). Par défaut : meilleure qualité ;
// mode "cheap" : alternative la moins chère (mais toujours acceptable).
// Demain : remplacer findOffers() par de vraies requêtes (API officielles).

export type SearchMode = "quality" | "cheap";

export type Offer = {
  platform: string;
  kind: "marketplace" | "factory";
  itemPrice: number; // €
  shipping: number; // € (vers la Suède)
  vat: number; // € (TVA suédoise 25 %)
  total: number; // € (tout compris)
  rating: number; // note /5
  reviews: number; // nb d'avis
  sellerYears: number; // ancienneté du vendeur
  verified: boolean; // original vérifié (anti-contrefaçon)
  euOk: boolean; // accepté / livrable en Europe
  qualityScore: number; // 0-100
  best?: boolean;
};

export type SearchResult = {
  mode: SearchMode;
  offers: Offer[];
  best: Offer;
  cheaper?: Offer; // alternative moins chère et acceptable
};

const VAT_RATE = 0.25; // TVA Suède

const PLATFORMS: {
  platform: string;
  kind: Offer["kind"];
  markup: number;
  shipBase: number;
  rating: number;
  reviews: number;
  years: number;
  verified: boolean;
  euOk: boolean;
}[] = [
  { platform: "1688 (usine)", kind: "factory", markup: 1.0, shipBase: 14, rating: 4.6, reviews: 300, years: 9, verified: true, euOk: false },
  { platform: "Taobao", kind: "marketplace", markup: 1.25, shipBase: 12, rating: 4.5, reviews: 1200, years: 8, verified: true, euOk: false },
  { platform: "AliExpress", kind: "marketplace", markup: 1.7, shipBase: 6, rating: 4.4, reviews: 5000, years: 7, verified: true, euOk: true },
  { platform: "DHgate", kind: "marketplace", markup: 1.8, shipBase: 7, rating: 4.1, reviews: 800, years: 6, verified: true, euOk: true },
  { platform: "Temu", kind: "marketplace", markup: 1.5, shipBase: 5, rating: 3.9, reviews: 2000, years: 2, verified: false, euOk: true },
  { platform: "Pinduoduo", kind: "marketplace", markup: 1.15, shipBase: 13, rating: 3.8, reviews: 600, years: 5, verified: false, euOk: false },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
  const factory = 5 + (hash(key) % 41); // prix usine de base

  const offers: Offer[] = PLATFORMS.map((p) => {
    const jitter = ((hash(key + p.platform) % 21) - 10) / 100; // ±10 %
    const itemPrice = round2(factory * p.markup * (1 + jitter));
    const shipping = round2(p.shipBase + ((hash(key + p.platform + "s") % 600) / 100));
    const vat = round2((itemPrice + shipping) * VAT_RATE);
    const total = round2(itemPrice + shipping + vat);

    const rating = round2(clamp(p.rating + ((hash(key + p.platform + "r") % 7) - 3) / 10, 3.2, 5));
    const reviews = p.reviews + (hash(key + p.platform + "v") % 900);
    const sellerYears = clamp(p.years + ((hash(key + p.platform + "y") % 5) - 2), 1, 15);

    return {
      platform: p.platform,
      kind: p.kind,
      itemPrice,
      shipping,
      vat,
      total,
      rating,
      reviews,
      sellerYears,
      verified: p.verified,
      euOk: p.euOk,
      qualityScore: qualityOf(rating, reviews, sellerYears, p.verified, p.euOk),
    };
  });

  // "Acceptable" = original vérifié ET accepté en Europe.
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

  // Tri d'affichage selon le mode.
  offers.sort((a, b) =>
    mode === "cheap" ? a.total - b.total : b.qualityScore - a.qualityScore,
  );

  return { mode, offers, best, cheaper };
}
