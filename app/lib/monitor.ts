// Moteur de surveillance de Versailles.
//
// Aujourd'hui : données simulées qui évoluent toutes les 5 minutes (démo).
// Demain : remplacer getMonitoring() par de vraies mesures (Search Console,
// suivi de citations IA, etc.) une fois Versailles connecté à vos sites/Vercel.

export type Metrics = {
  seo: number; // score SEO 0-100
  geo: number; // nb de citations par les moteurs génératifs (ChatGPT, Perplexity…)
  aeo: number; // score moteurs de réponse 0-100
  keywords: number; // mots-clés suivis
};

export type SiteStatus = {
  domain: string;
  yesterday: Metrics;
  now: Metrics;
};

export type MarketSignal = { keyword: string; trend: string };

export type Monitoring = {
  checkedAt: string; // ISO
  intervalMinutes: number;
  sites: SiteStatus[];
  summary: { seoYesterday: number; seoNow: number };
  market: MarketSignal[];
};

// Sites surveillés — remplacez par vos domaines (ou connectez Versailles à Vercel).
export const watchedSites = [
  "mon-site-1.com",
  "ma-boutique.com",
  "mon-blog.com",
];

const MARKET_POOL: MarketSignal[] = [
  { keyword: "agent IA autonome", trend: "+38%" },
  { keyword: "optimisation GEO", trend: "+61%" },
  { keyword: "AEO answer engine", trend: "+44%" },
  { keyword: "SEO local Bujumbura", trend: "+12%" },
  { keyword: "IPTV légale diaspora", trend: "+19%" },
  { keyword: "automatisation no-code", trend: "+27%" },
  { keyword: "citation ChatGPT marque", trend: "+52%" },
  { keyword: "micro-SaaS rentable", trend: "+33%" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Variation déterministe qui change à chaque tranche de 5 minutes.
function drift(seed: string, bucket: number, spread: number): number {
  return (hash(`${seed}:${bucket}`) % (spread * 2 + 1)) - spread;
}

function metricsFor(domain: string, bucket: number): SiteStatus {
  const base = hash(domain);
  const ySeo = 50 + (base % 25);
  const yAeo = 45 + ((base >> 3) % 25);
  const yGeo = 2 + ((base >> 6) % 8);
  const yKw = 80 + ((base >> 2) % 120);

  // "maintenant" : tendance globalement positive (Versailles travaille) + bruit.
  const now: Metrics = {
    seo: clamp(ySeo + 3 + drift(domain + "seo", bucket, 3), 0, 100),
    aeo: clamp(yAeo + 4 + drift(domain + "aeo", bucket, 3), 0, 100),
    geo: clamp(yGeo + 1 + drift(domain + "geo", bucket, 2), 0, 999),
    keywords: clamp(yKw + 5 + drift(domain + "kw", bucket, 4), 0, 9999),
  };

  return {
    domain,
    yesterday: { seo: ySeo, aeo: yAeo, geo: yGeo, keywords: yKw },
    now,
  };
}

export function getMonitoring(nowMs: number): Monitoring {
  const bucket = Math.floor(nowMs / (5 * 60 * 1000)); // tranche de 5 min
  const sites = watchedSites.map((d) => metricsFor(d, bucket));

  const seoYesterday = Math.round(
    sites.reduce((s, x) => s + x.yesterday.seo, 0) / sites.length,
  );
  const seoNow = Math.round(
    sites.reduce((s, x) => s + x.now.seo, 0) / sites.length,
  );

  // L'IA "Veille marché" met en avant quelques signaux, qui tournent toutes les 5 min.
  const start = bucket % MARKET_POOL.length;
  const market = [0, 1, 2, 3].map((i) => MARKET_POOL[(start + i) % MARKET_POOL.length]);

  return {
    checkedAt: new Date(nowMs).toISOString(),
    intervalMinutes: 5,
    sites,
    summary: { seoYesterday, seoNow },
    market,
  };
}
