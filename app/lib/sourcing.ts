// Comparateur de prix SilkRoute (démo déterministe).
// Calcule un prix total livré en Suède sur plusieurs plateformes, dont le prix usine (1688).
// Demain : remplacer findOffers() par de vraies requêtes (API officielles des plateformes).

export type Offer = {
  platform: string;
  kind: "marketplace" | "factory" | "agent";
  itemPrice: number; // €
  shipping: number; // € (vers la Suède)
  vat: number; // € (TVA suédoise 25 %)
  total: number; // € (tout compris)
  best?: boolean;
};

const VAT_RATE = 0.25; // TVA Suède

// markup = multiplicateur du prix usine ; shipBase = base d'expédition vers la Suède.
const PLATFORMS: { platform: string; kind: Offer["kind"]; markup: number; shipBase: number }[] = [
  { platform: "1688 (usine)", kind: "factory", markup: 1.0, shipBase: 14 },
  { platform: "Taobao", kind: "marketplace", markup: 1.25, shipBase: 12 },
  { platform: "Pinduoduo", kind: "marketplace", markup: 1.15, shipBase: 13 },
  { platform: "AliExpress", kind: "marketplace", markup: 1.7, shipBase: 6 },
  { platform: "DHgate", kind: "marketplace", markup: 1.8, shipBase: 7 },
  { platform: "Temu", kind: "marketplace", markup: 1.5, shipBase: 5 },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function findOffers(product: string): Offer[] {
  const key = product.trim().toLowerCase() || "produit";
  // Prix usine de base déduit du nom (5–45 €).
  const factory = 5 + (hash(key) % 41);

  const offers: Offer[] = PLATFORMS.map((p) => {
    const jitter = ((hash(key + p.platform) % 21) - 10) / 100; // ±10 %
    const itemPrice = round2(factory * p.markup * (1 + jitter));
    const shipping = round2(p.shipBase + ((hash(key + p.platform + "s") % 600) / 100)); // +0..6 €
    const vat = round2((itemPrice + shipping) * VAT_RATE);
    const total = round2(itemPrice + shipping + vat);
    return { platform: p.platform, kind: p.kind, itemPrice, shipping, vat, total };
  });

  offers.sort((a, b) => a.total - b.total);
  if (offers.length > 0) offers[0].best = true;
  return offers;
}
